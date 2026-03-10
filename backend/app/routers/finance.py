from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from decimal import Decimal

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.ledger_service import LedgerService, VerificationStatus
from ..services.deal_service import DealService

router = APIRouter(prefix="/deals/{deal_id}/ledger", tags=["Finance"])


class VerificationRequest(BaseModel):
    entry_id: UUID
    status: VerificationStatus
    notes: Optional[str] = None


class AdminAdjustmentRequest(BaseModel):
    amount: Decimal
    direction: str = Field(..., pattern="^(CREDIT|DEBIT|INFO)$")
    description: str
    metadata: Optional[Dict[str, Any]] = {}


def _require_admin(current_user: AuthenticatedUser) -> None:
    if not any(role in (current_user.roles or []) for role in ["ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Admin access required")


async def _ensure_deal_access(pool, deal_id: UUID, current_user: AuthenticatedUser) -> None:
    deal_service = DealService(pool)
    access_check = await deal_service.get_deal(deal_id=deal_id, user_id=current_user.user_id)

    if not access_check.get("success"):
        error_msg = (access_check.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=access_check.get("error", "Deal not found"))
        if "denied" in error_msg:
            raise HTTPException(status_code=403, detail=access_check.get("error", "Access denied"))
        raise HTTPException(status_code=400, detail=access_check.get("error", "Invalid deal access"))


@router.get("")
async def get_deal_ledger(
    deal_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get financial ledger for a deal.
    Accessible only by deal participants and admins.
    """
    pool = get_db_pool()
    await _ensure_deal_access(pool, deal_id, current_user)

    service = LedgerService(pool)
    result = await service.get_ledger(deal_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Ledger not found"))

    return result


@router.post("/verify-booking")
async def verify_booking_declaration(
    deal_id: UUID,
    data: VerificationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Agent/Admin verifies payment-related ledger entries.
    """
    if not any(role in (current_user.roles or []) for role in ["AGENT", "ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Agent/Admin access required")

    pool = get_db_pool()
    await _ensure_deal_access(pool, deal_id, current_user)

    service = LedgerService(pool)
    result = await service.verify_entry(
        entry_id=data.entry_id,
        verifier_id=current_user.user_id,
        status=data.status,
        notes=data.notes,
        deal_id=deal_id,
    )

    if not result.get("success"):
        error_msg = (result.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result.get("error", "Entry not found"))
        if "not authorized" in error_msg:
            raise HTTPException(status_code=403, detail=result.get("error", "Not authorized"))
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to verify entry"))

    return result


@router.post("/override")
async def admin_override_ledger(
    deal_id: UUID,
    data: AdminAdjustmentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Admin-only: Force add an adjustment entry.
    """
    _require_admin(current_user)

    pool = get_db_pool()
    await _ensure_deal_access(pool, deal_id, current_user)

    service = LedgerService(pool)
    result = await service.record_entry(
        deal_id=deal_id,
        entry_type="ADJUSTMENT",
        amount=data.amount,
        direction=data.direction,
        description=data.description,
        user_id=current_user.user_id,
        metadata=data.metadata,
        verification_status="VERIFIED",  # Admin entries are auto-verified
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to record entry"))

    return result
