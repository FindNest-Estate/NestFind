"""
Settlement Router — Phase 5A Commission lifecycle and enhanced payment recording.

Endpoints:
- GET  /deals/{id}/commission - Get commission lifecycle status
- POST /deals/{id}/commission/authorize - Admin authorizes settlement
- POST /deals/{id}/ledger/confirm - Counterparty confirms payment entry
- POST /deals/{id}/ledger/payment - Record payment with proof
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from decimal import Decimal

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.commission_service import CommissionService
from ..services.ledger_service import LedgerService
from ..services.deal_service import DealService


router = APIRouter(prefix="/deals", tags=["Settlement"])


# ============================================================================
# HELPERS
# ============================================================================

def _determine_actor_role(current_user: AuthenticatedUser) -> str:
    if 'ADMIN' in current_user.roles or 'CEO' in current_user.roles:
        return 'ADMIN'
    if 'AGENT' in current_user.roles:
        return 'AGENT'
    return 'BUYER'


# ============================================================================
# REQUEST MODELS
# ============================================================================

class PaymentRecordRequest(BaseModel):
    entry_type: str = Field(..., description="BOOKING_RECEIVED or BALANCE_PAYMENT_DECLARED")
    amount: float = Field(..., gt=0)
    description: str = Field(..., max_length=500)
    proof_url: str = Field(..., min_length=1, description="URL to payment proof (receipt/screenshot)")
    payment_method: str = Field(..., description="UPI, NEFT, RTGS, CHEQUE, DD, CASH, OTHER")
    bank_reference: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=500)


class ConfirmEntryRequest(BaseModel):
    entry_id: str = Field(..., description="UUID of the ledger entry to confirm")


class AuthorizeSettlementRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/{deal_id}/commission")
async def get_commission_status(
    deal_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get commission lifecycle status and release conditions.
    
    Accessible by deal participants and admins.
    """
    pool = get_db_pool()
    
    # Verify access
    deal_service = DealService(pool)
    deal_check = await deal_service.get_deal(deal_id, current_user.user_id)
    if not deal_check["success"]:
        if "not found" in deal_check["error"].lower():
            raise HTTPException(status_code=404, detail=deal_check["error"])
        elif "denied" in deal_check["error"].lower():
            raise HTTPException(status_code=403, detail=deal_check["error"])
        raise HTTPException(status_code=400, detail=deal_check["error"])
    
    commission_service = CommissionService(pool)
    result = await commission_service.get_commission_status(deal_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.post("/{deal_id}/commission/authorize")
async def authorize_commission(
    deal_id: UUID,
    data: AuthorizeSettlementRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Admin authorizes commission for settlement.
    
    No money moves. This records admin approval only.
    All release conditions must be met.
    
    Requires ADMIN or CEO role.
    """
    if not any(role in (current_user.roles or []) for role in ['ADMIN', 'CEO']):
        raise HTTPException(status_code=403, detail="Admin access required to authorize settlement")
    
    pool = get_db_pool()
    commission_service = CommissionService(pool)
    
    result = await commission_service.authorize_settlement(
        deal_id=deal_id,
        admin_id=current_user.user_id,
        notes=data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{deal_id}/ledger/payment")
async def record_payment(
    deal_id: UUID,
    data: PaymentRecordRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Record a payment with mandatory proof and payment method.
    
    Enhanced version of booking proof upload.
    Accessible by buyer, agent, or admin.
    
    Disclaimer: By recording this payment, you are declaring that this transaction
    has occurred. NestFind does not verify or hold funds.
    """
    pool = get_db_pool()
    
    # Verify access
    deal_service = DealService(pool)
    deal_check = await deal_service.get_deal(deal_id, current_user.user_id)
    if not deal_check["success"]:
        if "not found" in deal_check["error"].lower():
            raise HTTPException(status_code=404, detail=deal_check["error"])
        elif "denied" in deal_check["error"].lower():
            raise HTTPException(status_code=403, detail=deal_check["error"])
        raise HTTPException(status_code=400, detail=deal_check["error"])
    
    ledger_service = LedgerService(pool)
    result = await ledger_service.record_payment_with_proof(
        deal_id=deal_id,
        entry_type=data.entry_type,
        amount=Decimal(str(data.amount)),
        description=data.description,
        user_id=current_user.user_id,
        proof_url=data.proof_url,
        payment_method=data.payment_method,
        bank_reference=data.bank_reference,
        notes=data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{deal_id}/ledger/confirm")
async def confirm_payment_entry(
    deal_id: UUID,
    data: ConfirmEntryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Counterparty confirms a payment entry is accurate.
    
    e.g., Seller confirms they received the booking amount from buyer.
    The confirmer must NOT be the person who created the entry.
    """
    pool = get_db_pool()
    
    # Verify access
    deal_service = DealService(pool)
    deal_check = await deal_service.get_deal(deal_id, current_user.user_id)
    if not deal_check["success"]:
        if "not found" in deal_check["error"].lower():
            raise HTTPException(status_code=404, detail=deal_check["error"])
        elif "denied" in deal_check["error"].lower():
            raise HTTPException(status_code=403, detail=deal_check["error"])
        raise HTTPException(status_code=400, detail=deal_check["error"])
    
    ledger_service = LedgerService(pool)
    result = await ledger_service.confirm_counterparty(
        entry_id=UUID(data.entry_id),
        confirmer_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
