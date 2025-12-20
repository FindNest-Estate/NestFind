from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

from ..services.register_agent_service import RegisterAgentService
from ..services.otp_service import OTPService
from ..core.database import get_db_pool


router = APIRouter(prefix="/auth", tags=["Authentication - Registration"])


class RegisterAgentRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    mobile_number: Optional[str] = None
    license_id: str
    service_radius_km: int


class RegisterAgentResponse(BaseModel):
    message: str
    user_id: UUID


@router.post("/register/agent", response_model=RegisterAgentResponse, status_code=status.HTTP_202_ACCEPTED)
async def register_agent(
    request: RegisterAgentRequest,
    http_request: Request,
    db_pool = Depends(get_db_pool)
):
    """
    Register new agent.
    
    Creates agent user in PENDING_VERIFICATION state and sends OTP.
    Agent will transition to IN_REVIEW after OTP verification.
    
    Enforces:
    - Email uniqueness
    - Password policy (min 8 chars, 1 letter, 1 number)
    - Service radius limit (max 100km)
    - Role assignment (AGENT)
    - Audit logging
    """
    ip_address = http_request.client.host
    
    register_service = RegisterAgentService(db_pool)
    otp_service = OTPService(db_pool)
    
    try:
        # Register agent
        result = await register_service.register(
            full_name=request.full_name,
            email=request.email,
            password=request.password,
            mobile_number=request.mobile_number,
            license_id=request.license_id,
            service_radius_km=request.service_radius_km,
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
        
        return RegisterAgentResponse(
            message="Verification OTP sent to email",
            user_id=result["user_id"]
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
