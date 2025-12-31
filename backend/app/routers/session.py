from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from uuid import UUID

from ..middleware.auth_middleware import get_current_user_any_status, AuthenticatedUser, require_role
from ..services.session_service import SessionService
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Session"])


class LogoutResponse(BaseModel):
    success: bool
    message: str


class RevokeAllSessionsRequest(BaseModel):
    user_id: UUID


class RevokeAllSessionsResponse(BaseModel):
    success: bool
    sessions_revoked: int


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    response: Response,
    current_user = Depends(get_current_user_any_status),
    db_pool = Depends(get_db_pool)
):
    """
    Logout current session.
    
    Revokes session by setting revoked_at.
    Clears auth cookies.
    
    NOTE: Works for any user status (IN_REVIEW, DECLINED, etc.)
    """
    ip_address = request.client.host
    session_service = SessionService(db_pool)
    
    try:
        revoked = await session_service.revoke_session(
            session_id=current_user["session_id"],
            ip_address=ip_address
        )
        
        # Clear cookies regardless of revoke result
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
        
        if revoked:
            return LogoutResponse(
                success=True,
                message="Logged out successfully"
            )
        else:
            return LogoutResponse(
                success=False,
                message="Session not found"
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/revoke-all-sessions", response_model=RevokeAllSessionsResponse)
async def revoke_all_sessions(
    request_body: RevokeAllSessionsRequest,
    http_request: Request,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Admin: Revoke all sessions for a user.
    
    Requires ADMIN role.
    """
    ip_address = http_request.client.host
    session_service = SessionService(db_pool)
    
    try:
        count = await session_service.revoke_all_user_sessions(
            user_id=request_body.user_id,
            ip_address=ip_address,
            revoked_by_admin_id=current_user.user_id
        )
        
        return RevokeAllSessionsResponse(
            success=True,
            sessions_revoked=count
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
