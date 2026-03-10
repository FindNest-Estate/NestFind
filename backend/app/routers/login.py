import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional, Literal, List
from datetime import datetime

from ..services.login_service import LoginService
from ..services.session_service import SessionService
from ..services.refresh_token_service import RefreshTokenService
from ..core.jwt import create_access_token, get_refresh_token_duration
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Login"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: Optional[Literal["user", "admin"]] = "user"  # Which portal is being used


class UserInfo(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: str
    role: str
    roles: List[str]


class LoginResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UserInfo] = None
    locked_until: Optional[datetime] = None


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    response: Response,
    db_pool=Depends(get_db_pool),
):
    """
    Authenticate user with password and issue JWT + refresh token.

    Enforces:
    - Bcrypt password verification
    - 5-attempt lockout
    - Session creation
    - JWT issuance with session binding
    - Refresh token issuance
    - Sets HTTP-only cookies for tokens
    - Portal-based role restrictions (admin portal only for ADMIN)
    """
    ip_address = http_request.client.host if http_request.client else "unknown"
    user_agent = http_request.headers.get("user-agent", "unknown")

    login_service = LoginService(db_pool)
    session_service = SessionService(db_pool)
    refresh_service = RefreshTokenService(db_pool)

    try:
        auth_result = await login_service.authenticate(
            email=request.email,
            password=request.password,
            ip_address=ip_address,
        )

        if not auth_result["success"]:
            return LoginResponse(
                success=False,
                message=auth_result["error"],
                locked_until=auth_result.get("locked_until"),
            )

        async with db_pool.acquire() as conn:
            user_data = await conn.fetchrow(
                """
                SELECT
                    u.id,
                    u.email,
                    u.full_name,
                    u.status::text,
                    array_agg(r.name::text) as roles
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.id = $1
                GROUP BY u.id
                """,
                auth_result["user_id"],
            )

        if not user_data:
            raise HTTPException(status_code=500, detail="User data not found after authentication")

        roles_list = user_data["roles"]
        primary_role = "BUYER"
        if "ADMIN" in roles_list:
            primary_role = "ADMIN"
        elif "AGENT" in roles_list:
            primary_role = "AGENT"
        elif "SELLER" in roles_list:
            primary_role = "SELLER"
        elif "BUYER" in roles_list:
            primary_role = "BUYER"
        elif roles_list:
            primary_role = roles_list[0]

        user_role = primary_role

        if request.portal == "admin":
            if user_role != "ADMIN":
                return LoginResponse(
                    success=False,
                    message="Access denied. Admin portal is for administrators only.",
                )
        else:
            if user_role == "ADMIN":
                return LoginResponse(
                    success=False,
                    message="Please use the admin portal to login.",
                )

        refresh_duration = get_refresh_token_duration(user_role)

        session = await session_service.create_session(
            user_id=auth_result["user_id"],
            ip_address=ip_address,
            user_agent=user_agent,
            expires_in_minutes=refresh_duration,
        )

        access_token = create_access_token(
            user_id=auth_result["user_id"],
            session_id=session["session_id"],
            role=user_role,
        )

        refresh_token = await refresh_service.issue_refresh_token(
            session_id=session["session_id"],
            ip_address=ip_address,
            expiry_minutes=refresh_duration,
        )

        if user_role == "ADMIN":
            access_max_age = 15 * 60
            refresh_max_age = 60 * 60
        else:
            access_max_age = 30 * 24 * 60 * 60
            refresh_max_age = 30 * 24 * 60 * 60

        secure_cookie = os.getenv("COOKIE_SECURE", "false").lower() == "true"

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=access_max_age,
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=refresh_max_age,
            path="/",
        )

        return LoginResponse(
            success=True,
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserInfo(
                id=user_data["id"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                status=user_data["status"],
                role=user_role,
                roles=roles_list,
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
