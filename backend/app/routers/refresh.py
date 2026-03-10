import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from ..services.refresh_token_service import RefreshTokenService
from ..core.jwt import create_access_token, get_refresh_token_duration
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Refresh"])


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = None
    error: Optional[str] = None


def _get_primary_role(roles_list: list) -> str:
    if "ADMIN" in roles_list:
        return "ADMIN"
    if "AGENT" in roles_list:
        return "AGENT"
    if "SELLER" in roles_list:
        return "SELLER"
    if "BUYER" in roles_list:
        return "BUYER"
    return roles_list[0] if roles_list else "USER"


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    request: Request,
    body: Optional[RefreshRequest] = None,
    db_pool=Depends(get_db_pool),
):
    """
    Refresh access token using refresh token.
    Reads from 'refresh_token' cookie or request body.

    Enforces:
    - Refresh token rotation
    - Reuse detection
    - Family-wide revocation on theft
    - Single-use refresh tokens
    """
    ip_address = request.client.host if request.client else "unknown"
    refresh_service = RefreshTokenService(db_pool)

    # 1. Try getting token from cookie (Secure/HttpOnly)
    token = request.cookies.get("refresh_token")

    # 2. Fallback to body (for mobile/native clients)
    if not token and body:
        token = body.refresh_token

    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        result = await refresh_service.rotate_refresh_token(
            refresh_token=token,
            ip_address=ip_address,
        )

        if not result["success"]:
            raise HTTPException(status_code=401, detail=result.get("error", "Invalid refresh token"))

        # Resolve user role and preserve role-based access token durations.
        async with db_pool.acquire() as conn:
            roles = await conn.fetch(
                """
                SELECT r.name::text AS name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
                """,
                result["user_id"],
            )
        role_names = [r["name"] for r in roles]
        primary_role = _get_primary_role(role_names)

        access_token = create_access_token(
            user_id=result["user_id"],
            session_id=result["session_id"],
            role=primary_role,
        )

        secure_cookie = os.getenv("COOKIE_SECURE", "false").lower() == "true"

        refresh_minutes = get_refresh_token_duration(primary_role)
        if primary_role == "ADMIN":
            access_max_age = 15 * 60
        else:
            access_max_age = 30 * 24 * 60 * 60

        response = JSONResponse(
            content={
                "success": True,
                "access_token": access_token,
                "refresh_token": result["new_refresh_token"],
                "token_type": "bearer",
            }
        )

        response.set_cookie(
            key="refresh_token",
            value=result["new_refresh_token"],
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=refresh_minutes * 60,
            path="/",
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=access_max_age,
            path="/",
        )

        return response

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error during refresh")
