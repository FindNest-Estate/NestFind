from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.dispute_service import DisputeService
from ..services.deal_service import DealService

router = APIRouter(tags=["Disputes"])


class RaiseDisputeRequest(BaseModel):
    type: str  # ENUM checked in service
    description: str
    evidence_urls: List[str] = []


class ResolveDisputeRequest(BaseModel):
    status: str  # RESOLVED, REJECTED
    admin_notes: str
    resolution_entry_id: Optional[UUID] = None


class FreezeRequest(BaseModel):
    freeze: bool
    reason: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: str
    admin_notes: Optional[str] = None


def _require_admin(current_user: AuthenticatedUser) -> None:
    if not any(role in (current_user.roles or []) for role in ["ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Admin access required")


async def _ensure_deal_access(pool, deal_id: UUID, current_user: AuthenticatedUser) -> None:
    """Ensure current user can access a deal (participant or admin)."""
    deal_service = DealService(pool)
    access_check = await deal_service.get_deal(deal_id=deal_id, user_id=current_user.user_id)

    if not access_check.get("success"):
        error_msg = (access_check.get("error") or "Access denied").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=access_check.get("error", "Deal not found"))
        if "denied" in error_msg:
            raise HTTPException(status_code=403, detail=access_check.get("error", "Access denied"))
        raise HTTPException(status_code=400, detail=access_check.get("error", "Invalid deal access"))


@router.post("/deals/{deal_id}/disputes")
async def raise_dispute(
    deal_id: UUID,
    data: RaiseDisputeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Raise a dispute for a deal.

    Allowed for deal participants and admins. Deal is auto-frozen by service.
    """
    pool = get_db_pool()
    await _ensure_deal_access(pool, deal_id, current_user)

    service = DisputeService(pool)
    result = await service.raise_dispute(
        deal_id=deal_id,
        raised_by_id=current_user.user_id,
        dispute_type=data.type,
        description=data.description,
        evidence_urls=data.evidence_urls,
    )

    if not result.get("success"):
        error_msg = (result.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result.get("error", "Deal not found"))
        if "participant" in error_msg:
            raise HTTPException(status_code=403, detail=result.get("error", "Not authorized"))
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to raise dispute"))

    return result


@router.get("/deals/{deal_id}/disputes")
async def get_deal_disputes(
    deal_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get all disputes for a deal (participants/admin only)."""
    pool = get_db_pool()
    await _ensure_deal_access(pool, deal_id, current_user)

    service = DisputeService(pool)
    return await service.get_disputes_for_deal(deal_id)


@router.get("/disputes")
async def get_all_disputes(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Admin only: Get all disputes."""
    _require_admin(current_user)

    pool = get_db_pool()
    service = DisputeService(pool)
    return await service.get_all_disputes()


@router.get("/disputes/{dispute_id}")
async def get_dispute_detail(
    dispute_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get dispute details (participants/admin only)."""
    pool = get_db_pool()
    service = DisputeService(pool)

    result = await service.get_dispute_by_id(dispute_id)
    if not result.get("success"):
        error_msg = (result.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result.get("error", "Dispute not found"))
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to fetch dispute"))

    if not any(role in (current_user.roles or []) for role in ["ADMIN", "CEO"]):
        deal_id = UUID(result["dispute"]["deal_id"])
        await _ensure_deal_access(pool, deal_id, current_user)

    return result


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: UUID,
    data: ResolveDisputeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Admin only: Resolve a dispute."""
    _require_admin(current_user)

    pool = get_db_pool()
    service = DisputeService(pool)

    result = await service.resolve_dispute(
        dispute_id=dispute_id,
        resolution_status=data.status,
        admin_notes=data.admin_notes,
        resolution_entry_id=data.resolution_entry_id,
    )

    if not result.get("success"):
        error_msg = (result.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result.get("error", "Dispute not found"))
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to resolve dispute"))

    return result


@router.post("/disputes/{dispute_id}/status")
async def update_dispute_status(
    dispute_id: UUID,
    data: StatusUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Admin only: Update status (e.g. UNDER_REVIEW) without resolving."""
    _require_admin(current_user)

    pool = get_db_pool()
    service = DisputeService(pool)

    result = await service.update_status(
        dispute_id=dispute_id,
        status=data.status,
        admin_notes=data.admin_notes,
    )

    if not result.get("success"):
        error_msg = (result.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result.get("error", "Dispute not found"))
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to update dispute status"))

    return result


@router.post("/deals/{deal_id}/freeze")
async def freeze_action(
    deal_id: UUID,
    data: FreezeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Admin only: Manually freeze/unfreeze a deal."""
    _require_admin(current_user)

    pool = get_db_pool()
    service = DisputeService(pool)

    result = await service.toggle_freeze(
        deal_id=deal_id,
        freeze=data.freeze,
        reason=data.reason,
    )

    if not result.get("success"):
        error_msg = (result.get("error") or "").lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result.get("error", "Deal not found"))
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to update freeze state"))

    return result
