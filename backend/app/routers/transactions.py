"""
Transaction Router implementing AGENT_REGISTRATION_DAY workflow.

Endpoints:
- POST /registrations - Schedule registration
- GET /registrations/{id} - Get transaction details
- POST /registrations/{id}/send-buyer-otp - Send OTP to buyer
- POST /registrations/{id}/verify-buyer - Verify buyer OTP
- POST /registrations/{id}/send-seller-otp - Send OTP to seller
- POST /registrations/{id}/verify-seller - Verify seller OTP
- POST /registrations/{id}/complete - Complete transaction
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.transaction_service import TransactionService
from ..services.payment_gateway import get_payment_provider


router = APIRouter(prefix="/registrations", tags=["Transactions"])


# Request Models
class RegistrationSchedule(BaseModel):
    reservation_id: UUID
    registration_date: datetime
    registration_location: Optional[str] = Field(None, max_length=500)


class OTPVerify(BaseModel):
    otp_code: str = Field(..., min_length=6, max_length=6)


class TransactionComplete(BaseModel):
    gps_lat: Optional[float] = Field(None, ge=-90, le=90)
    gps_lng: Optional[float] = Field(None, ge=-180, le=180)
    payment_reference: str = Field(..., min_length=1)


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("")
async def list_transactions(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    List transactions for the current user.
    
    - Agents see transactions assigned to them
    - Buyers see transactions where they are the buyer
    - Sellers see transactions where they are the seller
    """
    pool = get_db_pool()
    service = TransactionService(pool)
    
    # Determine role based on user's roles
    if "AGENT" in (current_user.roles or []):
        role = "agent"
    elif "SELLER" in (current_user.roles or []):
        role = "seller"
    else:
        role = "buyer"
    
    result = await service.get_transactions(
        user_id=current_user.user_id,
        role=role,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    return result


@router.post("")
async def schedule_registration(
    data: RegistrationSchedule,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Agent schedules registration for a reserved property.
    
    Requirements:
    - User must be an agent
    - Reservation must be ACTIVE
    - Agent must be assigned to the property
    """
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can schedule registrations")
    
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.schedule_registration(
        reservation_id=data.reservation_id,
        agent_id=current_user.user_id,
        registration_date=data.registration_date,
        registration_location=data.registration_location,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get transaction details. Must be buyer, seller, or agent."""
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.get_transaction_by_id(
        transaction_id=transaction_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/send-buyer-otp")
async def send_buyer_otp(
    transaction_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent triggers sending OTP to buyer."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can send OTPs")
    
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.send_buyer_otp(
        transaction_id=transaction_id,
        agent_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/verify-buyer")
async def verify_buyer_otp(
    transaction_id: UUID,
    data: OTPVerify,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Buyer verifies their OTP."""
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.verify_buyer_otp(
        transaction_id=transaction_id,
        otp_code=data.otp_code,
        buyer_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/send-seller-otp")
async def send_seller_otp(
    transaction_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent triggers sending OTP to seller."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can send OTPs")
    
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.send_seller_otp(
        transaction_id=transaction_id,
        agent_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/verify-seller")
async def verify_seller_otp(
    transaction_id: UUID,
    data: OTPVerify,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Seller verifies their OTP."""
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.verify_seller_otp(
        transaction_id=transaction_id,
        otp_code=data.otp_code,
        seller_id=current_user.user_id,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/complete")
async def complete_transaction(
    transaction_id: UUID,
    data: TransactionComplete,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Agent completes the transaction.
    
    Requirements:
    - Both buyer and seller must have verified their OTP
    - Marks property as SOLD
    """
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can complete transactions")
    
    pool = get_db_pool()
    payment_provider = get_payment_provider()

    # 1. Verify Payment (Final 99.9%)
    is_valid_payment = await payment_provider.verify_payment(data.payment_reference)
    if not is_valid_payment:
        raise HTTPException(status_code=400, detail="Invalid payment reference or payment failed")

    service = TransactionService(pool)
    
    result = await service.complete_transaction(
        transaction_id=transaction_id,
        agent_id=current_user.user_id,
        gps_lat=data.gps_lat,
        gps_lng=data.gps_lng,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# Additional Request Models
class SellerPayment(BaseModel):
    payment_reference: str = Field(..., min_length=1)
    payment_method: str = Field(default="BANK_TRANSFER")


class DocumentUpload(BaseModel):
    document_type: str = Field(...)
    file_url: str = Field(...)
    file_name: Optional[str] = None
    uploader_role: str = Field(...)


class AdminApproval(BaseModel):
    notes: Optional[str] = None


@router.post("/{transaction_id}/seller-payment")
async def process_seller_payment(
    transaction_id: UUID,
    data: SellerPayment,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Seller pays the 0.9% commission."""
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.process_seller_payment(
        transaction_id=transaction_id,
        seller_id=current_user.user_id,
        payment_reference=data.payment_reference,
        payment_method=data.payment_method,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{transaction_id}/documents")
async def get_transaction_documents(
    transaction_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get all documents for a transaction."""
    from ..services.transaction_document_service import TransactionDocumentService
    
    pool = get_db_pool()
    service = TransactionDocumentService(pool)
    
    result = await service.get_documents(
        transaction_id=transaction_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=403, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/documents")
async def upload_transaction_document(
    transaction_id: UUID,
    data: DocumentUpload,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Upload a document for the transaction."""
    from ..services.transaction_document_service import TransactionDocumentService
    
    pool = get_db_pool()
    service = TransactionDocumentService(pool)
    
    result = await service.upload_document(
        transaction_id=transaction_id,
        uploader_id=current_user.user_id,
        uploader_role=data.uploader_role,
        document_type=data.document_type,
        file_url=data.file_url,
        file_name=data.file_name,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{transaction_id}/sign-agreement")
async def sign_agreement(
    transaction_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Sign the NestFind agreement."""
    from ..services.transaction_document_service import TransactionDocumentService
    
    pool = get_db_pool()
    service = TransactionDocumentService(pool)
    
    # Determine role
    if "AGENT" in (current_user.roles or []):
        role = "AGENT"
    else:
        # Check if buyer or seller from transaction
        async with pool.acquire() as conn:
            txn = await conn.fetchrow("""
                SELECT buyer_id, seller_id FROM transactions WHERE id = $1
            """, transaction_id)
            if txn and txn["buyer_id"] == current_user.user_id:
                role = "BUYER"
            elif txn and txn["seller_id"] == current_user.user_id:
                role = "SELLER"
            else:
                raise HTTPException(status_code=403, detail="Access denied")
    
    result = await service.sign_agreement(
        transaction_id=transaction_id,
        user_id=current_user.user_id,
        role=role,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

