from fastapi import APIRouter, Depends, HTTPException, Request
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
    request: RefreshRequest,
    http_request: Request,
    db_pool = Depends(get_db_pool)
):
    """
    Refresh access token using refresh token.
    
    Enforces:
    - Refresh token rotation
    - Reuse detection
    - Family-wide revocation on theft
    - Single-use refresh tokens
    """
    ip_address = http_request.client.host
    refresh_service = RefreshTokenService(db_pool)
    
    try:
        result = await refresh_service.rotate_refresh_token(
            refresh_token=request.refresh_token,
            ip_address=ip_address
        )
        
        if not result["success"]:
            return RefreshResponse(
                success=False,
                error=result["error"]
            )
        
        # Generate new access token
        access_token = create_access_token(
            user_id=result["user_id"],
            session_id=result["session_id"]
        )
        
        return RefreshResponse(
            success=True,
            access_token=access_token,
            refresh_token=result["new_refresh_token"],
            token_type="bearer"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
