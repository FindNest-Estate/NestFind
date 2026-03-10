"""
Agreements Router — Legal artifact management endpoints.

Endpoints:
- POST /deals/{deal_id}/agreements - Create DRAFT agreement
- GET /deals/{deal_id}/agreements - List agreements for a deal
- POST /agreements/{agreement_id}/sign - Sign agreement
- POST /admin/agreements/{agreement_id}/void - Admin void agreement
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.agreement_service import AgreementService


router = APIRouter(tags=["Agreements"])


# ============================================================================
# REQUEST MODELS
# ============================================================================

class AgreementCreate(BaseModel):
    agreement_type: str = Field(..., description="TOKEN, SALE, or COMMISSION")
    document_url: Optional[str] = None
    file_hash: Optional[str] = None


class AgreementSign(BaseModel):
    role: str = Field(..., description="BUYER, SELLER, or AGENT")


class AgreementVoid(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)


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
    """Determine the primary role of the current user."""
    if 'ADMIN' in current_user.roles or 'CEO' in current_user.roles:
        return 'ADMIN'
    if 'AGENT' in current_user.roles:
        return 'AGENT'
    return 'BUYER'


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/deals/{deal_id}/agreements")
async def create_agreement(
    deal_id: UUID,
    data: AgreementCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Create a DRAFT agreement for a deal.
    
    Types: TOKEN (before AGREEMENT_SIGNED), SALE (before REGISTRATION),
    COMMISSION (agent/platform split).
    """
    pool = get_db_pool()
    service = AgreementService(pool)
    
    result = await service.create_agreement(
        deal_id=deal_id,
        agreement_type=data.agreement_type.upper(),
        actor_id=current_user.user_id,
        actor_role=_determine_actor_role(current_user),
        document_url=data.document_url,
        file_hash=data.file_hash,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        elif "not a participant" in error_msg:
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/deals/{deal_id}/agreements")
async def list_agreements(
    deal_id: UUID,
    request: Request,
    agreement_type: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """List agreements for a deal, optionally filtered by type."""
    pool = get_db_pool()
    service = AgreementService(pool)
    
    result = await service.get_agreements(
        deal_id=deal_id,
        user_id=current_user.user_id,
        agreement_type=agreement_type.upper() if agreement_type else None
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in error_msg:
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/agreements/{agreement_id}/sign")
async def sign_agreement(
    agreement_id: UUID,
    data: AgreementSign,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Sign an agreement as BUYER, SELLER, or AGENT.
    
    Records timestamp and IP address (legally significant).
    Auto-transitions to SIGNED when all required parties have signed.
    """
    pool = get_db_pool()
    service = AgreementService(pool)
    
    result = await service.sign_agreement(
        agreement_id=agreement_id,
        user_id=current_user.user_id,
        role=data.role.upper(),
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.post("/admin/agreements/{agreement_id}/void")
async def admin_void_agreement(
    agreement_id: UUID,
    data: AgreementVoid,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Admin voids an agreement with mandatory reason.
    
    Voiding is the only way to "undo" a SIGNED agreement.
    A new agreement version can then be created.
    """
    if not any(role in (current_user.roles or []) for role in ['ADMIN', 'CEO']):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pool = get_db_pool()
    service = AgreementService(pool)
    
    result = await service.void_agreement(
        agreement_id=agreement_id,
        admin_id=current_user.user_id,
        reason=data.reason,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
