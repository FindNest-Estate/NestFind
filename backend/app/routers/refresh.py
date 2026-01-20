from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

from ..services.refresh_token_service import RefreshTokenService
from ..core.jwt import create_access_token
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


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    request: Request,
    body: Optional[RefreshRequest] = None,
    db_pool = Depends(get_db_pool)
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
    ip_address = request.client.host
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
            ip_address=ip_address
        )
        
        if not result["success"]:
            # If invalid/reuse detected, return 401 to force re-login
            raise HTTPException(status_code=401, detail=result.get("error", "Invalid refresh token"))
        
        # Generate new access token
        access_token = create_access_token(
            user_id=result["user_id"],
            session_id=result["session_id"]
        )
        
        # We should set the new refresh token in cookie in the response
        # But for now, we return it in JSON as per existing contract.
        # The frontend/apiClient likely handles setting it if it receives it.
        # Ideally, we should also Set-Cookie header here.
        
        response = JSONResponse(content={
            "success": True,
            "access_token": access_token,
            "refresh_token": result["new_refresh_token"],
            "token_type": "bearer"
        })
        
        # Set new refresh token in HttpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=result["new_refresh_token"],
            httponly=True,
            secure=True, # Should be True in prod
            samesite="lax",
            max_age=7 * 24 * 60 * 60 # 7 days
        )
        
        # Set access token cookie as well
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True, 
            samesite="lax",
            max_age=15 * 60 # 15 mins
        )
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Refresh error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during refresh")
