"""
Deals Router — Unified deal lifecycle management.

Endpoints:
- POST /deals - Create a new deal (buyer initiates)
- GET /deals - List deals for current user (role-aware)
- GET /deals/{id} - Get deal detail with timeline
- POST /deals/{id}/transition - Advance deal state
- POST /deals/{id}/cancel - Cancel deal
- GET /deals/{id}/timeline - Get deal event timeline
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.deal_service import DealService, ACTIVE_DEAL_STATUSES
from ..services.deal_events_service import DealEventsService


router = APIRouter(prefix="/deals", tags=["Deals"])


# ============================================================================
# REQUEST MODELS
# ============================================================================

class DealCreate(BaseModel):
    property_id: UUID
    notes: Optional[str] = Field(None, max_length=500)


class DealTransition(BaseModel):
    new_status: str = Field(..., description="Target deal status")
    notes: Optional[str] = Field(None, max_length=500)
    metadata: Optional[dict] = None


class DealCancel(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


# ============================================================================
# HELPERS
# ============================================================================

def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _determine_actor_role(current_user: AuthenticatedUser) -> str:
    """Determine the primary role of the current user for deal operations."""
    if 'ADMIN' in current_user.roles or 'CEO' in current_user.roles:
        return 'ADMIN'
    if 'AGENT' in current_user.roles:
        return 'AGENT'
    # Default to buyer — seller actions are determined by deal participant check
    return 'BUYER'


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("")
async def create_deal(
    data: DealCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Create a new deal for a property.
    
    The buyer initiates a deal. The property must be ACTIVE and have
    an assigned agent. The property will transition to UNDER_DEAL.
    
    Only one active deal per property is allowed.
    """
    pool = get_db_pool()
    service = DealService(pool)
    
    result = await service.create_deal(
        property_id=data.property_id,
        buyer_id=current_user.user_id,
        ip_address=get_client_ip(request),
        notes=data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("")
async def list_deals(
    request: Request,
    status: Optional[str] = None,
    active_only: bool = False,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    List deals for the current user.
    
    Returns deals where user is buyer, seller, or agent.
    Supports filtering by status and active-only flag.
    """
    pool = get_db_pool()
    service = DealService(pool)
    
    result = await service.get_deals_for_user(
        user_id=current_user.user_id,
        status_filter=status,
        active_only=active_only,
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{deal_id}")
async def get_deal(
    deal_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get deal details with timeline.
    
    Only accessible by deal participants (buyer, seller, agent) and admins.
    """
    pool = get_db_pool()
    service = DealService(pool)
    
    result = await service.get_deal(
        deal_id=deal_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{deal_id}/transition")
async def transition_deal(
    deal_id: UUID,
    data: DealTransition,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Advance a deal to the next state.
    
    State transitions are validated against:
    1. State machine (valid from → to transitions)
    2. Actor permission matrix (role authorization)
    3. Deal participant check (must be involved in the deal)
    """
    pool = get_db_pool()
    service = DealService(pool)
    
    # Determine actor role — check if user is seller for this specific deal
    actor_role = _determine_actor_role(current_user)
    
    # If user might be a seller, check against the deal
    if actor_role == 'BUYER':
        async with pool.acquire() as conn:
            deal = await conn.fetchrow(
                "SELECT seller_id FROM deals WHERE id = $1", deal_id
            )
            if deal and deal['seller_id'] == current_user.user_id:
                actor_role = 'SELLER'
    
    result = await service.transition_deal(
        deal_id=deal_id,
        new_status=data.new_status.upper(),
        actor_id=current_user.user_id,
        actor_role=actor_role,
        notes=data.notes,
        metadata=data.metadata,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        elif "not authorized" in error_msg or "not a participant" in error_msg:
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{deal_id}/cancel")
async def cancel_deal(
    deal_id: UUID,
    data: DealCancel,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Cancel a deal.
    
    Only buyer, seller, or admin can cancel.
    Agent cannot cancel — must escalate to admin.
    Property reverts to ACTIVE status.
    """
    pool = get_db_pool()
    service = DealService(pool)
    
    # Determine actor role
    actor_role = _determine_actor_role(current_user)
    
    if actor_role == 'BUYER':
        async with pool.acquire() as conn:
            deal = await conn.fetchrow(
                "SELECT seller_id FROM deals WHERE id = $1", deal_id
            )
            if deal and deal['seller_id'] == current_user.user_id:
                actor_role = 'SELLER'
    
    result = await service.cancel_deal(
        deal_id=deal_id,
        actor_id=current_user.user_id,
        actor_role=actor_role,
        reason=data.reason,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        elif "not authorized" in error_msg:
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


class DealUnfreeze(BaseModel):
    resolution: str = Field(..., description="'RESUME' to restore pre-dispute state, 'CANCEL' to cancel deal")
    notes: Optional[str] = Field(None, max_length=1000)


@router.post("/{deal_id}/unfreeze")
async def unfreeze_deal(
    deal_id: UUID,
    data: DealUnfreeze,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Admin unfreezes a disputed deal.
    
    resolution='RESUME' → restore pre-dispute status
    resolution='CANCEL' → cancel the deal
    
    Requires ADMIN or CEO role.
    """
    if not any(role in (current_user.roles or []) for role in ['ADMIN', 'CEO']):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pool = get_db_pool()
    service = DealService(pool)
    
    result = await service.unfreeze_deal(
        deal_id=deal_id,
        admin_id=current_user.user_id,
        resolution=data.resolution.upper(),
        notes=data.notes,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{deal_id}/timeline")
async def get_deal_timeline(
    deal_id: UUID,
    request: Request,
    limit: int = 100,
    offset: int = 0,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get the immutable event timeline for a deal.
    
    Returns events in chronological order (oldest first).
    Only accessible by deal participants and admins.
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
    
    events_service = DealEventsService(pool)
    result = await events_service.get_timeline(deal_id, limit=limit, offset=offset)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
