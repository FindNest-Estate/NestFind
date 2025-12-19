from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..services.register_user_service import RegisterUserService
from ..services.otp_service import OTPService
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Registration"])


class RegisterUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    mobile_number: Optional[str] = None


class RegisterUserResponse(BaseModel):
    message: str


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
            message="Verification OTP sent to email"
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
