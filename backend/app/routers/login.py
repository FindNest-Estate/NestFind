from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from datetime import datetime

from ..services.login_service import LoginService
from ..services.session_service import SessionService
from ..services.refresh_token_service import RefreshTokenService
from ..core.jwt import create_access_token
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Login"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = None
    user_id: Optional[UUID] = None
    locked_until: Optional[datetime] = None


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db_pool = Depends(get_db_pool)
):
    """
    Authenticate user with password and issue JWT + refresh token.
    
    Enforces:
    - Bcrypt password verification
    - 5-attempt lockout
    - Session creation
    - JWT issuance with session binding
    - Refresh token issuance
    """
    ip_address = http_request.client.host
    user_agent = http_request.headers.get("user-agent", "unknown")
    
    login_service = LoginService(db_pool)
    session_service = SessionService(db_pool)
    refresh_service = RefreshTokenService(db_pool)
    
    try:
        # Authenticate user
        auth_result = await login_service.authenticate(
            email=request.email,
            password=request.password,
            ip_address=ip_address
        )
        
        if not auth_result["success"]:
            return LoginResponse(
                success=False,
                message=auth_result["error"],
                locked_until=auth_result.get("locked_until")
            )
        
        # Create session
        session = await session_service.create_session(
            user_id=auth_result["user_id"],
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Generate JWT
        access_token = create_access_token(
            user_id=auth_result["user_id"],
            session_id=session["session_id"]
        )
        
        # Issue refresh token
        refresh_token = await refresh_service.issue_refresh_token(
            session_id=session["session_id"],
            ip_address=ip_address
        )
        
        return LoginResponse(
            success=True,
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=auth_result["user_id"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
