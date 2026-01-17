"""
Offer Router implementing BUYER_OFFER_FLOW and SELLER_OFFER_HANDLING workflows.

Endpoints:
- POST /offers - Buyer creates offer
- GET /offers - List offers
- GET /offers/{id} - Get offer details
- POST /offers/{id}/accept - Accept offer
- POST /offers/{id}/reject - Reject offer
- POST /offers/{id}/counter - Counter offer
- POST /offers/{id}/withdraw - Withdraw offer
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.offer_service import OfferService


router = APIRouter(prefix="/offers", tags=["Offers"])


# Request Models
class OfferCreate(BaseModel):
    property_id: UUID
    offered_price: float = Field(..., gt=0)
    buyer_message: Optional[str] = Field(None, max_length=500)
    expiry_hours: int = Field(48, ge=1, le=168)  # 1 hour to 1 week


class OfferReject(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class OfferCounter(BaseModel):
    counter_price: float = Field(..., gt=0)
    seller_message: Optional[str] = Field(None, max_length=500)
    expiry_hours: int = Field(48, ge=1, le=168)


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("")
async def create_offer(
    data: OfferCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Buyer creates an offer for a property.
    
    Requirements:
    - Property must be ACTIVE
    - User cannot be the property seller
    - No existing pending offer from same buyer
    """
    pool = get_db_pool()
    service = OfferService(pool)
    
    result = await service.create_offer(
        property_id=data.property_id,
        buyer_id=current_user.user_id,
        offered_price=data.offered_price,
        buyer_message=data.buyer_message,
        expiry_hours=data.expiry_hours,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("")
async def list_offers(
    request: Request,
    property_id: Optional[UUID] = None,
    status: Optional[str] = None,
    role: Optional[str] = None,  # 'buyer' or 'seller'
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    List offers for current user.
    
    - Default: shows offers as buyer
    - role=seller: shows offers on user's properties
    """
    pool = get_db_pool()
    service = OfferService(pool)
    
    # Default to buyer role
    query_role = role if role in ['buyer', 'seller'] else 'buyer'
    
    result = await service.get_offers(
        user_id=current_user.user_id,
        role=query_role,
        property_id=property_id,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{offer_id}")
async def get_offer(
    offer_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get offer details. Must be buyer or seller."""
    pool = get_db_pool()
    service = OfferService(pool)
    
    result = await service.get_offer_by_id(
        offer_id=offer_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{offer_id}/accept")
async def accept_offer(
    offer_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Accept an offer.
    - Seller accepts PENDING offer
    - Buyer accepts COUNTERED offer
    """
    pool = get_db_pool()
    service = OfferService(pool)
    
    result = await service.accept_offer(
        offer_id=offer_id,
        user_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{offer_id}/reject")
async def reject_offer(
    offer_id: UUID,
    data: OfferReject,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Reject an offer."""
    pool = get_db_pool()
    service = OfferService(pool)
    
    result = await service.reject_offer(
        offer_id=offer_id,
        user_id=current_user.user_id,
        reason=data.reason,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{offer_id}/counter")
async def counter_offer(
    offer_id: UUID,
    data: OfferCounter,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Make a counter offer."""
    pool = get_db_pool()
    service = OfferService(pool)
    
    result = await service.counter_offer(
        offer_id=offer_id,
        user_id=current_user.user_id,
        counter_price=data.counter_price,
        seller_message=data.seller_message,
        expiry_hours=data.expiry_hours,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{offer_id}/withdraw")
async def withdraw_offer(
    offer_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Buyer withdraws their offer."""
    pool = get_db_pool()
    service = OfferService(pool)
    
    result = await service.withdraw_offer(
        offer_id=offer_id,
        user_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
