from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from datetime import datetime

from ..services.otp_service import OTPService
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - OTP"])


class OTPGenerateRequest(BaseModel):
    user_id: UUID


class OTPGenerateResponse(BaseModel):
    otp_id: UUID
    expires_at: datetime
    message: str


class OTPVerifyRequest(BaseModel):
    user_id: UUID
    otp: str


class OTPVerifyResponse(BaseModel):
    success: bool
    message: str
    locked_until: Optional[datetime] = None


@router.post("/otp/generate", response_model=OTPGenerateResponse)
async def generate_otp(
    request: OTPGenerateRequest,
    http_request: Request,
    db_pool = Depends(get_db_pool)
):
    """
    Generate and send OTP for email verification.
    
    Enforces:
    - 10-minute expiry
    - Hashed storage (SHA-256)
    - Audit logging
    """
    ip_address = http_request.client.host
    otp_service = OTPService(db_pool)
    
    try:
        otp, otp_id = await otp_service.generate_and_store(
            user_id=request.user_id,
            ip_address=ip_address
        )
        
        return OTPGenerateResponse(
            otp_id=otp_id,
            expires_at=datetime.utcnow().replace(microsecond=0),
            message="OTP sent to email"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/otp/verify", response_model=OTPVerifyResponse)
async def verify_otp(
    request: OTPVerifyRequest,
    http_request: Request,
    db_pool = Depends(get_db_pool)
):
    """
    Verify OTP with single-use enforcement and lockout.
    
    Enforces:
    - Single-use (consumed_at check)
    - Expiry validation
    - 3-attempt lockout
    - 30-minute lock duration
    - Audit logging
    """
    ip_address = http_request.client.host
    otp_service = OTPService(db_pool)
    
    try:
        result = await otp_service.verify(
            user_id=request.user_id,
            otp=request.otp,
            ip_address=ip_address
        )
        
        if result["success"]:
            return OTPVerifyResponse(
                success=True,
                message="OTP verified successfully"
            )
        else:
            return OTPVerifyResponse(
                success=False,
                message=result["error"],
                locked_until=result.get("locked_until")
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
