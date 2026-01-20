"""
Admin Users Router for user management.

Endpoints:
- GET /admin/users - List all users with filters
- GET /admin/users/{id} - Get user details
- POST /admin/users/{id}/suspend - Suspend user
- POST /admin/users/{id}/activate - Activate user
"""
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.admin_users_service import AdminUsersService


router = APIRouter(prefix="/admin/users", tags=["Admin Users"])


class SuspendRequest(BaseModel):
    reason: Optional[str] = None


async def require_admin(current_user: AuthenticatedUser):
    """Verify user is admin."""
    if "ADMIN" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("")
async def list_users(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """List all users with optional filters."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminUsersService(pool)
    
    result = await service.get_users(
        search=search,
        role_filter=role,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    return result


@router.get("/{user_id}")
async def get_user_detail(
    user_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get detailed user information."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminUsersService(pool)
    
    result = await service.get_user_detail(
        user_id=user_id,
        admin_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: UUID,
    data: SuspendRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Suspend a user account."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminUsersService(pool)
    
    result = await service.suspend_user(
        user_id=user_id,
        admin_id=current_user.user_id,
        reason=data.reason
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Activate a suspended user."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = AdminUsersService(pool)
    
    result = await service.activate_user(
        user_id=user_id,
        admin_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
