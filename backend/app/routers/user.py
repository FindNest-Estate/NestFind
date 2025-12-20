from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID

from ..middleware.auth_middleware import get_current_user
from ..core.database import get_db_pool


router = APIRouter(prefix="/user", tags=["User"])


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: str
    role: str


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get current authenticated user's information.
    
    Returns user's id, email, full_name, status, and role.
    This is the source of truth for frontend auth state.
    """
    try:
        async with db_pool.acquire() as conn:
            user_data = await conn.fetchrow(
                """
                SELECT u.id, u.email, u.full_name, u.status, r.name as role
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.id = $1
                """,
                current_user["user_id"]
            )
            
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            return UserResponse(
                id=user_data["id"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                status=user_data["status"],
                role=user_data["role"]
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
