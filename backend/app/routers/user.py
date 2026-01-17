from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import bcrypt

from ..middleware.auth_middleware import get_current_user_any_status, get_current_user
from ..core.database import get_db_pool


router = APIRouter(prefix="/user", tags=["User"])


# ============================================================================
# SCHEMAS
# ============================================================================

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    mobile_number: Optional[str]
    status: str
    role: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    mobile_number: Optional[str] = None


class UpdateProfileResponse(BaseModel):
    success: bool
    full_name: str
    mobile_number: Optional[str]


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangePasswordResponse(BaseModel):
    success: bool
    message: str


# ============================================================================
# GET ME
# ============================================================================

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user = Depends(get_current_user_any_status),
    db_pool = Depends(get_db_pool)
):
    """
    Get current authenticated user's information.
    
    Returns user's id, email, full_name, status, and role.
    This is the source of truth for frontend auth state.
    
    NOTE: This endpoint works for ANY authenticated user status,
    not just ACTIVE users. This allows users to check their own
    status (IN_REVIEW, DECLINED, SUSPENDED, etc.)
    """
    try:
        async with db_pool.acquire() as conn:
            user_data = await conn.fetchrow(
                """
                SELECT u.id, u.email, u.full_name, u.mobile_number, u.status::text, r.name::text as role
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
                mobile_number=user_data["mobile_number"],
                status=user_data["status"],
                role=user_data["role"]
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# UPDATE PROFILE
# ============================================================================

@router.put("/profile", response_model=UpdateProfileResponse)
async def update_profile(
    body: UpdateProfileRequest,
    request: Request,
    current_user = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Update user's profile information.
    
    Allows updating full_name and phone_number.
    """
    user_id = current_user.user_id
    
    # Build update query dynamically
    updates = []
    values = []
    param_idx = 1
    
    if body.full_name is not None:
        updates.append(f"full_name = ${param_idx}")
        values.append(body.full_name.strip())
        param_idx += 1
    
    if body.mobile_number is not None:
        updates.append(f"mobile_number = ${param_idx}")
        values.append(body.mobile_number.strip() if body.mobile_number else None)
        param_idx += 1
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    values.append(user_id)
    
    async with db_pool.acquire() as conn:
        # Update user
        await conn.execute(
            f"""
            UPDATE users 
            SET {', '.join(updates)}
            WHERE id = ${param_idx}
            """,
            *values
        )
        
        # Fetch updated data
        result = await conn.fetchrow(
            "SELECT full_name, mobile_number FROM users WHERE id = $1",
            user_id
        )
        
        # Audit log
        await conn.execute(
            """
            INSERT INTO audit_logs 
            (user_id, action, entity_type, entity_id, ip_address, details)
            VALUES ($1, 'PROFILE_UPDATED', 'user', $1, $2, $3)
            """,
            user_id,
            request.client.host if request.client else None,
            f'{{"fields": "{", ".join(updates)}"}}'
        )
        
        return UpdateProfileResponse(
            success=True,
            full_name=result["full_name"],
            mobile_number=result["mobile_number"]
        )


# ============================================================================
# CHANGE PASSWORD
# ============================================================================

@router.put("/password", response_model=ChangePasswordResponse)
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Change user's password.
    
    Requires current password for verification.
    """
    user_id = current_user.user_id
    
    # Validate new password length
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    async with db_pool.acquire() as conn:
        # Get current password hash
        row = await conn.fetchrow(
            "SELECT password_hash FROM users WHERE id = $1",
            user_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not bcrypt.checkpw(body.current_password.encode(), row["password_hash"].encode()):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        new_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
        
        # Update password
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            new_hash,
            user_id
        )
        
        # Audit log
        await conn.execute(
            """
            INSERT INTO audit_logs 
            (user_id, action, entity_type, entity_id, ip_address)
            VALUES ($1, 'PASSWORD_CHANGED', 'user', $1, $2)
            """,
            user_id,
            request.client.host if request.client else None
        )
        
        return ChangePasswordResponse(
            success=True,
            message="Password updated successfully"
        )

