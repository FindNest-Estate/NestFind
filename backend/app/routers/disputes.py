"""
Dispute Router implementing ADMIN_DISPUTE_RESOLUTION workflow.

Endpoints:
- POST /disputes - Raise a dispute
- GET /disputes - List disputes
- GET /disputes/{id} - Get dispute details
- POST /disputes/{id}/close - Close dispute
- POST /admin/disputes/{id}/assign - Admin assigns dispute
- POST /admin/disputes/{id}/resolve - Admin resolves dispute
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.dispute_service import DisputeService


router = APIRouter(tags=["Disputes"])


# Request Models
class DisputeCreate(BaseModel):
    against_id: UUID
    category: str = Field(..., description="Category: PROPERTY_MISREPRESENTATION, PAYMENT_ISSUE, AGENT_MISCONDUCT, VISIT_ISSUE, VERIFICATION_ISSUE, OTHER")
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=2000)
    property_id: Optional[UUID] = None
    transaction_id: Optional[UUID] = None
    visit_id: Optional[UUID] = None
    offer_id: Optional[UUID] = None
    evidence_urls: Optional[List[str]] = None


class DisputeResolve(BaseModel):
    decision: str = Field(..., description="Decision: FAVOR_BUYER, FAVOR_SELLER, FAVOR_AGENT, NO_ACTION, PARTIAL_REFUND")
    resolution_notes: str = Field(..., min_length=10, max_length=1000)


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/disputes")
async def raise_dispute(
    data: DisputeCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Raise a dispute against another user.
    
    Requirements:
    - At least one related entity must be provided
    - Cannot raise dispute against yourself
    """
    pool = get_db_pool()
    service = DisputeService(pool)
    
    result = await service.raise_dispute(
        raised_by_id=current_user.user_id,
        against_id=data.against_id,
        category=data.category,
        title=data.title,
        description=data.description,
        property_id=data.property_id,
        transaction_id=data.transaction_id,
        visit_id=data.visit_id,
        offer_id=data.offer_id,
        evidence_urls=data.evidence_urls,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/disputes")
async def list_disputes(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    List disputes.
    
    - Regular users see disputes they raised or are against
    - Admin sees all disputes
    """
    pool = get_db_pool()
    service = DisputeService(pool)
    
    is_admin = "ADMIN" in (current_user.roles or []) or "CEO" in (current_user.roles or [])
    
    result = await service.get_disputes(
        user_id=current_user.user_id,
        is_admin=is_admin,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/disputes/{dispute_id}")
async def get_dispute(
    dispute_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get dispute details."""
    pool = get_db_pool()
    service = DisputeService(pool)
    
    is_admin = "ADMIN" in (current_user.roles or []) or "CEO" in (current_user.roles or [])
    
    result = await service.get_dispute_by_id(
        dispute_id=dispute_id,
        user_id=current_user.user_id,
        is_admin=is_admin
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/disputes/{dispute_id}/close")
async def close_dispute(
    dispute_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Close a dispute.
    
    - Raiser can close their OPEN disputes (withdraw)
    - Admin can close any dispute
    """
    pool = get_db_pool()
    service = DisputeService(pool)
    
    is_admin = "ADMIN" in (current_user.roles or []) or "CEO" in (current_user.roles or [])
    
    result = await service.close_dispute(
        dispute_id=dispute_id,
        user_id=current_user.user_id,
        is_admin=is_admin,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# Admin endpoints
@router.post("/admin/disputes/{dispute_id}/assign")
async def admin_assign_dispute(
    dispute_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Admin assigns a dispute to themselves for review."""
    if not any(role in (current_user.roles or []) for role in ["ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pool = get_db_pool()
    service = DisputeService(pool)
    
    result = await service.assign_dispute(
        dispute_id=dispute_id,
        admin_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/admin/disputes/{dispute_id}/resolve")
async def admin_resolve_dispute(
    dispute_id: UUID,
    data: DisputeResolve,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Admin resolves a dispute with a decision."""
    if not any(role in (current_user.roles or []) for role in ["ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pool = get_db_pool()
    service = DisputeService(pool)
    
    result = await service.resolve_dispute(
        dispute_id=dispute_id,
        admin_id=current_user.user_id,
        decision=data.decision,
        resolution_notes=data.resolution_notes,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
