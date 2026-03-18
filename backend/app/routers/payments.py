
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

from ..core.database import get_db_pool
from ..middleware.auth_middleware import AuthenticatedUser, get_current_user
from ..services.payment_engine.payment_service import PaymentService
from ..services.payment_engine.reconciliation_service import ReconciliationService


router = APIRouter(tags=["Payments"])


class CreatePaymentIntentRequest(BaseModel):
    intent_type: str = Field(..., pattern="^(RESERVATION|COMMISSION|ESCROW|REFUND)$")
    reference_id: UUID
    reference_type: str = Field(..., min_length=1, max_length=64)
    amount: Decimal
    currency: str = Field(default="INR", min_length=3, max_length=10)


class VerifyPaymentRequest(BaseModel):
    provider_payment_id: str = Field(..., min_length=3)


class RefundRequest(BaseModel):
    amount: Decimal
    reason: str = Field(..., min_length=3, max_length=1000)


class ReconciliationRunRequest(BaseModel):
    report_date: Optional[date] = None
    provider: Optional[str] = Field(default=None, pattern="^(MOCK|RAZORPAY|STRIPE)$")


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _require_admin_or_ceo(user: AuthenticatedUser) -> None:
    if not any(role in (user.roles or []) for role in ["ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/payments/create-intent")
async def create_payment_intent(
    payload: CreatePaymentIntentRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    pool = get_db_pool()
    service = PaymentService(pool)

    result = await service.create_payment_intent(
        intent_type=payload.intent_type.upper(),
        reference_id=payload.reference_id,
        reference_type=payload.reference_type,
        amount=payload.amount,
        currency=payload.currency,
        payer_id=current_user.user_id,
        ip_address=_get_client_ip(request),
        metadata={"requested_by": str(current_user.user_id)},
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to create payment intent"))
    return result


@router.get("/payments/{intent_id}")
async def get_payment_intent(
    intent_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    pool = get_db_pool()
    service = PaymentService(pool)
    result = await service.get_payment_status(intent_id=intent_id, user_id=current_user.user_id)
    if not result.get("success"):
        detail = result.get("error", "Failed to fetch payment")
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail)
        if "denied" in detail.lower():
            raise HTTPException(status_code=403, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
    return result


@router.post("/payments/{intent_id}/checkout")
async def initiate_checkout(
    intent_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    pool = get_db_pool()
    service = PaymentService(pool)

    state = await service.get_payment_status(intent_id=intent_id, user_id=current_user.user_id)
    if not state.get("success"):
        raise HTTPException(status_code=403, detail=state.get("error", "Access denied"))

    result = await service.initiate_checkout(intent_id=intent_id, ip_address=_get_client_ip(request))
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unable to initiate checkout"))
    return result


@router.post("/payments/{intent_id}/verify")
async def verify_payment(
    intent_id: UUID,
    payload: VerifyPaymentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    pool = get_db_pool()
    service = PaymentService(pool)

    current = await service.get_payment_status(intent_id=intent_id, user_id=current_user.user_id)
    if not current.get("success"):
        raise HTTPException(status_code=403, detail=current.get("error", "Access denied"))

    result = await service.handle_provider_callback(
        intent_id=intent_id,
        provider_payment_id=payload.provider_payment_id,
        provider_response={"source": "manual_verify_endpoint"},
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Payment verification failed"))
    return result

@router.get("/payments/mock-checkout/{intent_id}", response_class=HTMLResponse)
async def mock_checkout_page(intent_id: UUID, result: Optional[str] = Query(default=None)):
    pool = get_db_pool()
    service = PaymentService(pool)
    html = await service.render_mock_checkout_html(intent_id=intent_id, result=result)
    return HTMLResponse(content=html)


@router.post("/payments/mock-checkout/{intent_id}/process")
async def process_mock_checkout(
    intent_id: UUID,
    card_number: str = Form(...),
    expiry: str = Form(...),
    cvv: str = Form(...),
    otp: Optional[str] = Form(default=None),
):
    pool = get_db_pool()
    service = PaymentService(pool)

    result = await service.process_mock_checkout_form(
        intent_id=intent_id,
        card_number=card_number,
        expiry=expiry,
        cvv=cvv,
        otp=otp,
    )
    if not result.get("success"):
        return RedirectResponse(url=f"/payments/mock-checkout/{intent_id}?result=failed", status_code=303)

    return RedirectResponse(url=result["redirect_url"], status_code=303)


@router.post("/payments/{intent_id}/refund")
async def request_refund(
    intent_id: UUID,
    payload: RefundRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _require_admin_or_ceo(current_user)
    pool = get_db_pool()
    service = PaymentService(pool)

    result = await service.request_refund(
        intent_id=intent_id,
        amount=payload.amount,
        reason=payload.reason,
        requested_by=current_user.user_id,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Refund request failed"))
    return result


@router.get("/payments/{intent_id}/refunds")
async def list_refunds(
    intent_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    pool = get_db_pool()
    service = PaymentService(pool)
    result = await service.list_refunds(intent_id=intent_id, user_id=current_user.user_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unable to fetch refunds"))
    return result

@router.get("/admin/payments")
async def admin_list_payments(
    status: Optional[str] = None,
    provider: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    limit: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _require_admin_or_ceo(current_user)
    pool = get_db_pool()
    service = PaymentService(pool)
    return await service.list_payments(
        status=status,
        provider=provider,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )


@router.get("/admin/payments/reconciliation")
async def get_reconciliation_report(
    report_date: date,
    provider: str = Query(..., pattern="^(MOCK|RAZORPAY|STRIPE)$"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _require_admin_or_ceo(current_user)
    pool = get_db_pool()
    service = ReconciliationService(pool)
    result = await service.get_report(report_date=report_date, provider=provider)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Reconciliation report not found"))
    return result


@router.post("/admin/payments/reconciliation/run")
async def run_reconciliation(
    payload: ReconciliationRunRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _require_admin_or_ceo(current_user)
    pool = get_db_pool()
    service = ReconciliationService(pool)

    if payload.provider:
        result = await service.generate_report(
            report_date=payload.report_date or date.today(),
            provider=payload.provider,
        )
    else:
        result = await service.run_daily_reconciliation(target_date=payload.report_date)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to run reconciliation"))
    return result


@router.get("/admin/payments/stats")
async def admin_payment_stats(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _require_admin_or_ceo(current_user)
    pool = get_db_pool()
    service = PaymentService(pool)
    return await service.get_admin_stats(date_from=date_from, date_to=date_to)


@router.post("/admin/payments/{intent_id}/refund")
async def admin_refund_alias(
    intent_id: UUID,
    payload: RefundRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    return await request_refund(intent_id=intent_id, payload=payload, current_user=current_user)
