"""
Reservation Router implementing BUYER_RESERVATION workflow.

Endpoints:
- POST /reservations - Create reservation
- GET /reservations - List reservations
- GET /reservations/{id} - Get reservation details
- POST /reservations/{id}/cancel - Cancel reservation
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser, require_role
from ..services.reservation_service import ReservationService


router = APIRouter(prefix="/reservations", tags=["Reservations"])


# Request Models
class ReservationCreate(BaseModel):
    offer_id: UUID


class ReservationCancel(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("")
async def create_reservation(
    data: ReservationCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("BUYER"))
):
    """
    Create a reservation for an accepted offer.
    
    Requirements:
    - Offer must be ACCEPTED
    - User must be the offer buyer
    - 0.1% deposit is calculated automatically
    - Reservation valid for 30 days
    """
    pool = get_db_pool()
    service = ReservationService(pool)

    result = await service.create_reservation_with_payment_intent(
        offer_id=data.offer_id,
        buyer_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("")
async def list_reservations(
    request: Request,
    role: Optional[str] = None,  # 'buyer' or 'seller'
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    List reservations for current user.
    
    - Default: shows reservations as buyer
    - role=seller: shows reservations on user's properties
    """
    pool = get_db_pool()
    service = ReservationService(pool)
    
    # Default to buyer role
    query_role = role if role in ['buyer', 'seller'] else 'buyer'
    
    result = await service.get_reservations(
        user_id=current_user.user_id,
        role=query_role,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{reservation_id}")
async def get_reservation(
    reservation_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get reservation details. Must be buyer or seller."""
    pool = get_db_pool()
    service = ReservationService(pool)
    
    result = await service.get_reservation_by_id(
        reservation_id=reservation_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


class ReservationProof(BaseModel):
    proof_url: str = Field(..., description="URL to the uploaded payment proof")


@router.post("/{reservation_id}/proof")
async def submit_payment_proof(
    reservation_id: UUID,
    data: ReservationProof,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("BUYER"))
):
    """
    Submit payment proof for a reservation.
    """
    pool = get_db_pool()
    service = ReservationService(pool)
    
    result = await service.submit_payment_proof(
        reservation_id=reservation_id,
        proof_url=data.proof_url,
        user_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "only" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: UUID,
    data: ReservationCancel,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("BUYER"))
):
    """
    Cancel a reservation.
    
    Note: Deposit is forfeited (no refund) per business rules.
    """
    pool = get_db_pool()
    service = ReservationService(pool)
    
    result = await service.cancel_reservation(
        reservation_id=reservation_id,
        buyer_id=current_user.user_id,
        reason=data.reason,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower() or "only" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result




