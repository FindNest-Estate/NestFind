from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from uuid import UUID
import re

from ..services.register_agent_service import RegisterAgentService
from ..services.otp_service import OTPService
from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user_any_status


router = APIRouter(prefix="/auth", tags=["Authentication - Registration"])


class RegisterAgentRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    mobile_number: str      # Mandatory, +91 format
    latitude: float         # Mandatory
    longitude: float        # Mandatory
    address: Optional[str] = None
    pan_number: str         # Mandatory
    aadhaar_number: str     # Mandatory
    service_radius_km: int  # Mandatory, <= 100
    
    @field_validator('mobile_number')
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        pattern = r'^\+91[6-9]\d{9}$'
        if not re.match(pattern, v):
            raise ValueError('Mobile number must be in +91XXXXXXXXXX format')
        return v
    
    @field_validator('pan_number')
    @classmethod
    def validate_pan(cls, v: str) -> str:
        pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]$'
        if not re.match(pattern, v):
            raise ValueError('PAN must be in format ABCDE1234F')
        return v
    
    @field_validator('aadhaar_number')
    @classmethod
    def validate_aadhaar(cls, v: str) -> str:
        pattern = r'^\d{12}$'
        if not re.match(pattern, v):
            raise ValueError('Aadhaar must be 12 digits')
        return v
    
    @field_validator('service_radius_km')
    @classmethod
    def validate_radius(cls, v: int) -> int:
        if v <= 0 or v > 100:
            raise ValueError('Service radius must be between 1 and 100 km')
        return v
    
    @model_validator(mode='after')
    def validate_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')
        return self


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
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            pan_number=request.pan_number,
            aadhaar_number=request.aadhaar_number,
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


@router.get("/agent/rejection-reason")
async def get_rejection_reason(
    http_request: Request,
    current_user: dict = Depends(get_current_user_any_status),
    db_pool = Depends(get_db_pool)
):
    """
    Get the latest rejection reason for the authenticated user.
    Allows DECLINED users to access this.
    """
    service = RegisterAgentService(db_pool)
    reason = await service.get_latest_rejection_reason(current_user["user_id"])
    
    if not reason:
        return {"reason": None}
    
    return {"reason": reason}


@router.post("/agent/resubmit")
async def resubmit_agent_application(
    http_request: Request,
    current_user: dict = Depends(get_current_user_any_status),
    db_pool = Depends(get_db_pool)
):
    """
    Resubmit agent application (DECLINED -> IN_REVIEW).
    Allows DECLINED users to access this.
    """
    ip_address = http_request.client.host
    service = RegisterAgentService(db_pool)
    
    result = await service.resubmit_agent(current_user["user_id"], ip_address)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {"message": "Application resubmitted successfully"}


# ============================================================================
# AGENT APPLICATION MANAGEMENT (For Declined Agents)
# ============================================================================

class AgentApplicationResponse(BaseModel):
    full_name: str
    email: str
    mobile_number: str
    pan_number: str
    aadhaar_number: str
    service_radius_km: int
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]


class UpdateAgentApplicationRequest(BaseModel):
    full_name: str
    mobile_number: str
    pan_number: str
    aadhaar_number: str
    service_radius_km: int
    address: Optional[str]
    latitude: float
    longitude: float

    @field_validator('mobile_number')
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        pattern = r'^\+91[6-9]\d{9}$'
        if not re.match(pattern, v):
            raise ValueError('Mobile number must be in +91XXXXXXXXXX format')
        return v
    
    @field_validator('pan_number')
    @classmethod
    def validate_pan(cls, v: str) -> str:
        pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]$'
        if not re.match(pattern, v):
            raise ValueError('PAN must be in format ABCDE1234F')
        return v
    
    @field_validator('aadhaar_number')
    @classmethod
    def validate_aadhaar(cls, v: str) -> str:
        pattern = r'^\d{12}$'
        if not re.match(pattern, v):
            raise ValueError('Aadhaar must be 12 digits')
        return v
        
    @field_validator('service_radius_km')
    @classmethod
    def validate_radius(cls, v: int) -> int:
        if v <= 0 or v > 100:
            raise ValueError('Service radius must be between 1 and 100 km')
        return v

@router.get("/agent/application", response_model=AgentApplicationResponse)
async def get_agent_application(
    current_user: dict = Depends(get_current_user_any_status),
    db_pool = Depends(get_db_pool)
):
    """Get current agent application details."""
    service = RegisterAgentService(db_pool)
    return await service.get_application_details(current_user["user_id"])


@router.put("/agent/application")
async def update_agent_application(
    request: UpdateAgentApplicationRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user_any_status),
    db_pool = Depends(get_db_pool)
):
    """
    Update agent application details. 
    Only allowed if status is DECLINED (or IN_REVIEW).
    """
    ip_address = http_request.client.host
    service = RegisterAgentService(db_pool)
    
    result = await service.update_application(
        user_id=current_user["user_id"],
        data=request.model_dump(),
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
            
    return {"message": "Application updated successfully"}
