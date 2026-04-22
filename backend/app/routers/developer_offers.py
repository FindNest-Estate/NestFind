"""Developer Offers Router — multi-buyer negotiation management."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, get_current_user, AuthenticatedUser
from ..schemas.developer_schemas import DevOfferCounter, DevOfferReject
from ..services.developer_offer_service import DeveloperOfferService

router = APIRouter(prefix="/developer/offers", tags=["Developer Offers"])


@router.get("")
async def list_offers(
    unit_id: Optional[UUID] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List all offers on developer's units."""
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.list_offers(
        developer_id=current_user.user_id,
        unit_id=unit_id,
        status=status,
        page=page,
        per_page=per_page,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{offer_id}")
async def get_offer(
    offer_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get offer detail with full negotiation history."""
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.get_offer_with_history(offer_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(
            status_code=404 if "not found" in result["error"].lower() else 403,
            detail=result["error"]
        )
    return result


@router.post("/{offer_id}/accept")
async def accept_offer(
    offer_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """
    Accept a buyer's offer.
    Auto-rejects all other offers on the same unit.
    Creates a deal record automatically.
    """
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.accept_offer(offer_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{offer_id}/reject")
async def reject_offer(
    offer_id: UUID,
    data: DevOfferReject,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Reject a buyer's offer with optional reason."""
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.reject_offer(offer_id, current_user.user_id, data.rejection_reason)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{offer_id}/counter")
async def counter_offer(
    offer_id: UUID,
    data: DevOfferCounter,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Send a counter offer to the buyer."""
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.counter_offer(
        offer_id=offer_id,
        developer_id=current_user.user_id,
        counter_price=data.counter_price,
        seller_message=data.seller_message,
        expiry_hours=data.expiry_hours,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ---------------------------------------------------------------------------
# BUYER actions on offers (called from Buyer Portal)
# ---------------------------------------------------------------------------

@router.post("/{offer_id}/accept-counter")
async def buyer_accept_counter(
    offer_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Buyer accepts the developer's counter offer."""
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.buyer_accept_counter(offer_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{offer_id}/reject-counter")
async def buyer_reject_counter(
    offer_id: UUID,
    data: DevOfferReject,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Buyer rejects the developer's counter offer."""
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.buyer_reject_counter(offer_id, current_user.user_id, data.rejection_reason)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
