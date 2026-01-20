"""
Admin Properties Router for property management.

Endpoints:
- GET /admin/properties - List all properties with filters
- GET /admin/properties/{id} - Get property details
- POST /admin/properties/{id}/status - Override property status
"""
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.admin_properties_service import AdminPropertiesService


router = APIRouter(prefix="/admin/properties", tags=["Admin Properties"])


class StatusOverride(BaseModel):
    status: str
    reason: Optional[str] = None


async def require_admin(current_user: AuthenticatedUser):
    """Verify user is admin."""
    if "ADMIN" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("")
async def list_properties(
    request: Request,
    search: Optional[str] = Query(None, description="Search by title or address"),
    status: Optional[str] = Query(None, description="Filter by status"),
    city: Optional[str] = Query(None, description="Filter by city"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """List all properties with optional filters."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminPropertiesService(pool)
    
    result = await service.get_properties(
        search=search,
        status_filter=status,
        city_filter=city,
        page=page,
        per_page=per_page
    )
    
    return result


@router.get("/{property_id}")
async def get_property_detail(
    property_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get detailed property information."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminPropertiesService(pool)
    
    result = await service.get_property_detail(
        property_id=property_id,
        admin_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.post("/{property_id}/status")
async def override_property_status(
    property_id: UUID,
    data: StatusOverride,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Override property status."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminPropertiesService(pool)
    
    result = await service.override_property_status(
        property_id=property_id,
        admin_id=current_user.user_id,
        new_status=data.status,
        reason=data.reason
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
