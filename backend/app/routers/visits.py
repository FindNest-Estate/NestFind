"""
Visit Router implementing BUYER_VISIT_BOOKING and AGENT_VISIT_EXECUTION workflows.

Endpoints:
- POST /visits - Buyer requests visit
- GET /visits - List visits (buyer or agent)
- GET /visits/{id} - Get visit details
- POST /visits/{id}/approve - Agent approves
- POST /visits/{id}/reject - Agent rejects
- POST /visits/{id}/check-in - Agent GPS check-in
- POST /visits/{id}/complete - Agent completes
- POST /visits/{id}/cancel - Cancel visit
- POST /visits/{id}/no-show - Mark as no-show
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.visit_service import VisitService


router = APIRouter(prefix="/visits", tags=["Visits"])


# Request Models
class VisitRequestCreate(BaseModel):
    property_id: UUID
    preferred_date: datetime
    buyer_message: Optional[str] = Field(None, max_length=500)


class VisitApprove(BaseModel):
    confirmed_date: Optional[datetime] = None


class VisitReject(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class VisitCheckIn(BaseModel):
    gps_lat: float = Field(..., ge=-90, le=90)
    gps_lng: float = Field(..., ge=-180, le=180)


class VisitComplete(BaseModel):
    agent_notes: Optional[str] = Field(None, max_length=1000)


class VisitCancel(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class VisitCounter(BaseModel):
    new_date: datetime
    message: Optional[str] = Field(None, max_length=500)


class VisitRespond(BaseModel):
    accept: bool


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("")
async def request_visit(
    data: VisitRequestCreate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Buyer requests a visit for a property.
    
    Requirements:
    - Property must be ACTIVE with assigned agent
    - User cannot be the property seller
    - Preferred date must be in future
    """
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.request_visit(
        property_id=data.property_id,
        buyer_id=current_user.user_id,
        preferred_date=data.preferred_date,
        buyer_message=data.buyer_message,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("")
async def list_visits(
    request: Request,
    status: Optional[str] = None,
    role: Optional[str] = None,  # 'buyer', 'seller', or 'agent' - auto-detected if not provided
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    List visits for current user.
    
    - Users see their visit requests (as buyer)
    - Agents see visits assigned to them
    - Sellers see visits to their properties
    
    Use 'role' query param to specify view (buyer/seller/agent).
    If not provided, defaults based on user's primary role.
    """
    pool = get_db_pool()
    service = VisitService(pool)
    
    # Determine role - use provided role or auto-detect
    if role and role in ['buyer', 'seller', 'agent']:
        effective_role = role
    elif "AGENT" in (current_user.roles or []):
        effective_role = 'agent'
    elif "SELLER" in (current_user.roles or []):
        effective_role = 'seller'
    else:
        effective_role = 'buyer'
    
    result = await service.get_visits(
        user_id=current_user.user_id,
        role=effective_role,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{visit_id}")
async def get_visit(
    visit_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get visit details. Must be buyer or assigned agent."""
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.get_visit_by_id(
        visit_id=visit_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/approve")
async def approve_visit(
    visit_id: UUID,
    data: VisitApprove,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent approves a visit request."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can approve visits")
    
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.approve_visit(
        visit_id=visit_id,
        agent_id=current_user.user_id,
        confirmed_date=data.confirmed_date,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/reject")
async def reject_visit(
    visit_id: UUID,
    data: VisitReject,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent rejects a visit request."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can reject visits")
    
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.reject_visit(
        visit_id=visit_id,
        agent_id=current_user.user_id,
        reason=data.reason,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/check-in")
async def check_in_visit(
    visit_id: UUID,
    data: VisitCheckIn,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent checks in at property location with GPS verification."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can check in")
    
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.check_in(
        visit_id=visit_id,
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


@router.post("/{visit_id}/complete")
async def complete_visit(
    visit_id: UUID,
    data: VisitComplete,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent marks visit as completed."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can complete visits")
    
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.complete_visit(
        visit_id=visit_id,
        agent_id=current_user.user_id,
        agent_notes=data.agent_notes,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/cancel")
async def cancel_visit(
    visit_id: UUID,
    data: VisitCancel,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Cancel a visit (buyer or agent)."""
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.cancel_visit(
        visit_id=visit_id,
        user_id=current_user.user_id,
        reason=data.reason,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/no-show")
async def mark_no_show(
    visit_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent marks buyer as no-show."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can mark no-show")
    
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.mark_no_show(
        visit_id=visit_id,
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


@router.post("/{visit_id}/counter")
async def counter_visit(
    visit_id: UUID,
    data: VisitCounter,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent or Buyer makes a counter-offer with a new date."""
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.counter_visit(
        visit_id=visit_id,
        user_id=current_user.user_id,
        new_date=data.new_date,
        message=data.message
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/respond")
async def respond_to_counter(
    visit_id: UUID,
    data: VisitRespond,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Accept or Reject a counter-offer.
    To make another counter-offer, use the /counter endpoint.
    """
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.respond_to_counter(
        visit_id=visit_id,
        user_id=current_user.user_id,
        accept=data.accept
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============================================================================
# ENHANCED VISIT VERIFICATION ENDPOINTS
# ============================================================================


class VisitStartSession(BaseModel):
    """GPS coordinates for starting visit session."""
    gps_lat: float = Field(..., ge=-90, le=90)
    gps_lng: float = Field(..., ge=-180, le=180)


class AgentFeedback(BaseModel):
    """Agent feedback form after visit."""
    buyer_interest_level: Optional[int] = Field(None, ge=1, le=5)
    buyer_perceived_budget: Optional[str] = None
    property_condition_notes: Optional[str] = Field(None, max_length=2000)
    buyer_questions: Optional[str] = Field(None, max_length=2000)
    follow_up_required: bool = False
    recommended_action: Optional[str] = None
    additional_notes: Optional[str] = Field(None, max_length=2000)


class BuyerFeedback(BaseModel):
    """Buyer feedback form after visit."""
    overall_rating: Optional[int] = Field(None, ge=1, le=5)
    agent_professionalism: Optional[int] = Field(None, ge=1, le=5)
    property_condition_rating: Optional[int] = Field(None, ge=1, le=5)
    property_as_described: Optional[bool] = None
    interest_level: Optional[str] = None
    liked_aspects: Optional[str] = Field(None, max_length=2000)
    concerns: Optional[str] = Field(None, max_length=2000)
    would_recommend: Optional[bool] = None


@router.post("/{visit_id}/start-session")
async def start_visit_session(
    visit_id: UUID,
    data: VisitStartSession,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Agent starts visit session with GPS verification.
    
    - Verifies agent is within 100m of property
    - Generates 6-digit OTP
    - Emails OTP to buyer
    - Stores OTP for buyer page display
    """
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can start visit sessions")
    
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.start_visit_session(
        visit_id=visit_id,
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


@router.get("/{visit_id}/otp")
async def get_buyer_otp(
    visit_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Buyer retrieves their OTP to show to the agent.
    
    - Only accessible by the buyer of the visit
    - Only works when visit is in CHECKED_IN status
    - OTP expires after 10 minutes
    """
    pool = get_db_pool()
    service = VisitService(pool)
    
    result = await service.get_buyer_otp(
        visit_id=visit_id,
        buyer_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/feedback/agent")
async def submit_agent_feedback(
    visit_id: UUID,
    data: AgentFeedback,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Agent submits feedback after visit."""
    if "AGENT" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Only agents can submit agent feedback")
    
    pool = get_db_pool()
    from ..services.visit_feedback_service import VisitFeedbackService
    service = VisitFeedbackService(pool)
    
    result = await service.submit_agent_feedback(
        visit_id=visit_id,
        agent_id=current_user.user_id,
        buyer_interest_level=data.buyer_interest_level,
        buyer_perceived_budget=data.buyer_perceived_budget,
        property_condition_notes=data.property_condition_notes,
        buyer_questions=data.buyer_questions,
        follow_up_required=data.follow_up_required,
        recommended_action=data.recommended_action,
        additional_notes=data.additional_notes
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/feedback/buyer")
async def submit_buyer_feedback(
    visit_id: UUID,
    data: BuyerFeedback,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Buyer submits feedback after visit."""
    pool = get_db_pool()
    from ..services.visit_feedback_service import VisitFeedbackService
    service = VisitFeedbackService(pool)
    
    result = await service.submit_buyer_feedback(
        visit_id=visit_id,
        buyer_id=current_user.user_id,
        overall_rating=data.overall_rating,
        agent_professionalism=data.agent_professionalism,
        property_condition_rating=data.property_condition_rating,
        property_as_described=data.property_as_described,
        interest_level=data.interest_level,
        liked_aspects=data.liked_aspects,
        concerns=data.concerns,
        would_recommend=data.would_recommend
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{visit_id}/feedback")
async def get_visit_feedback(
    visit_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get feedback for a visit (both agent and buyer feedback)."""
    pool = get_db_pool()
    from ..services.visit_feedback_service import VisitFeedbackService
    service = VisitFeedbackService(pool)
    
    result = await service.get_visit_feedback(
        visit_id=visit_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/{visit_id}/images")
async def upload_visit_image(
    visit_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Upload a visit documentation image.
    
    Both agent and buyer can upload images.
    Accepts multipart/form-data with:
    - file: The image file
    - image_type: Optional (PROPERTY/MEETING/DOCUMENT/OTHER)
    - caption: Optional description
    """
    from fastapi import UploadFile, File, Form
    
    # Parse multipart form data
    form = await request.form()
    file = form.get("file")
    image_type = form.get("image_type")
    caption = form.get("caption")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    pool = get_db_pool()
    from ..services.visit_media_service import VisitMediaService
    service = VisitMediaService(pool)
    
    result = await service.upload_image(
        visit_id=visit_id,
        user_id=current_user.user_id,
        file=file,
        image_type=image_type,
        caption=caption
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/{visit_id}/images")
async def list_visit_images(
    visit_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """List all images for a visit."""
    pool = get_db_pool()
    from ..services.visit_media_service import VisitMediaService
    service = VisitMediaService(pool)
    
    result = await service.get_visit_images(
        visit_id=visit_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.delete("/{visit_id}/images/{image_id}")
async def delete_visit_image(
    visit_id: UUID,
    image_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Delete an image (only uploader can delete)."""
    pool = get_db_pool()
    from ..services.visit_media_service import VisitMediaService
    service = VisitMediaService(pool)
    
    result = await service.delete_image(
        image_id=image_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "denied" in result["error"].lower():
            raise HTTPException(status_code=403, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
