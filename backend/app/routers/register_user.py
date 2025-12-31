from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from uuid import UUID
import re

from ..services.register_user_service import RegisterUserService
from ..services.otp_service import OTPService
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Registration"])


class RegisterUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    mobile_number: str  # Mandatory, +91 format
    # Location NOT required for users (only for agents)
    
    @field_validator('mobile_number')
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        pattern = r'^\+91[6-9]\d{9}$'
        if not re.match(pattern, v):
            raise ValueError('Mobile number must be in +91XXXXXXXXXX format (10 digits starting with 6-9)')
        return v
    
    @model_validator(mode='after')
    def validate_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')
        return self


class RegisterUserResponse(BaseModel):
    message: str
    user_id: UUID


@router.post("/register/user", response_model=RegisterUserResponse, status_code=status.HTTP_202_ACCEPTED)
async def register_user(
    request: RegisterUserRequest,
    http_request: Request,
    db_pool = Depends(get_db_pool)
):
    """
    Register new user.
    
    Creates user in PENDING_VERIFICATION state and sends OTP.
    
    Enforces:
    - Email uniqueness
    - Password policy (min 8 chars, 1 letter, 1 number)
    - Role assignment (USER)
    - Audit logging
    """
    ip_address = http_request.client.host
    
    register_service = RegisterUserService(db_pool)
    otp_service = OTPService(db_pool)
    
    try:
        # Register user
        result = await register_service.register(
            full_name=request.full_name,
            email=request.email,
            password=request.password,
            mobile_number=request.mobile_number,
            ip_address=ip_address
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Generate and send OTP
        await otp_service.generate_and_store(
            user_id=result["user_id"],
            ip_address=ip_address
        )
        
        return RegisterUserResponse(
            message="Verification OTP sent to email",
            user_id=result["user_id"]
        )
    
    except ValueError as e:
        print(f"[REGISTER] ValueError: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"[REGISTER] Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
