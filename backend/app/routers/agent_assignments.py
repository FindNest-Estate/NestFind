"""
Agent Assignments Router - Endpoints for agent property management.

Endpoints:
- GET /agent/assignments - List agent's assignments
- GET /agent/assignments/{id} - Get assignment detail
- POST /agent/assignments/{id}/accept - Accept assignment
- POST /agent/assignments/{id}/decline - Decline assignment
- POST /agent/assignments/{id}/start-verification - Start verification
- POST /agent/assignments/{id}/complete-verification - Complete verification
- POST /properties/{id}/hire-agent - Seller requests agent
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID

from ..services.agent_assignment_service import AgentAssignmentService
from ..middleware.auth_middleware import get_current_user, require_role, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(tags=["Agent Assignments"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class DeclineRequest(BaseModel):
    reason: Optional[str] = None


class VerificationRequest(BaseModel):
    approved: bool
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    checklist: Optional[dict] = None  # NEW: Document checklist


class VerificationOTPRequest(BaseModel):
    pass  # No body needed, assignment_id in path


class VerificationOTPVerify(BaseModel):
    otp_code: str


class PropertySummary(BaseModel):
    id: str
    title: Optional[str]
    type: Optional[str]
    price: Optional[float]
    city: Optional[str]
    status: str
    thumbnail_url: Optional[str]


class SellerSummary(BaseModel):
    name: str
    email: str


class AssignmentListItem(BaseModel):
    id: str
    status: str
    requested_at: str
    responded_at: Optional[str]
    property: PropertySummary
    seller: SellerSummary


class PaginationResponse(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_more: bool


class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentListItem]
    pagination: PaginationResponse


class ActionResponse(BaseModel):
    success: bool
    new_status: Optional[str] = None
    property_status: Optional[str] = None


class HireAgentResponse(BaseModel):
    success: bool
    assignment_id: str
    agent_name: str
    new_status: str


class AnalyticsResponse(BaseModel):
    success: bool
    overview: Dict[str, Any]
    chart_data: List[Dict[str, Any]]
    portfolio_data: Optional[List[Dict[str, Any]]] = None


class CRMLeadsResponse(BaseModel):
    success: bool
    leads: List[dict]


class InsightsResponse(BaseModel):
    success: bool
    insights: List[dict]


class ScheduleResponse(BaseModel):
    success: bool
    events: List[dict]


class MarketingAssetResponse(BaseModel):
    success: bool
    asset_url: str
    type: str


class MarketingTemplatesResponse(BaseModel):
    success: bool
    templates: List[dict]


class GenerateMarketingRequest(BaseModel):
    property_id: UUID
    template_id: str
    custom_options: Optional[dict] = None


class MarketingHistoryResponse(BaseModel):
    success: bool
    history: List[dict]


class ManageEventRequest(BaseModel):
    title: str
    start: str
    type: str # 'visit', 'verification', 'task'


class ManageEventResponse(BaseModel):
    success: bool
    event: Optional[dict] = None


# ============================================================================
# AGENT ENDPOINTS
# ============================================================================

@router.get("/agent/assignments", response_model=AssignmentListResponse)
async def get_agent_assignments(
    status: Optional[str] = Query(None, description="Filter: pending, active, completed"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get list of assignments for current agent.
    
    Requires AGENT role.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_assignments(
        agent_id=current_user.user_id,
        status_filter=status,
        page=page,
        per_page=per_page
    )
    
    return AssignmentListResponse(
        assignments=[AssignmentListItem(**a) for a in result["assignments"]],
        pagination=PaginationResponse(**result["pagination"])
    )


@router.get("/agent/assignments/{assignment_id}")
async def get_assignment_detail(
    assignment_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get detailed assignment info.
    
    Requires AGENT role.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_assignment_detail(
        assignment_id=assignment_id,
        agent_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return result["assignment"]


@router.post("/agent/assignments/{assignment_id}/accept", response_model=ActionResponse)
async def accept_assignment(
    assignment_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Accept an assignment request.
    
    Transitions:
    - Assignment: REQUESTED → ACCEPTED
    - Property: PENDING_ASSIGNMENT → ASSIGNED
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.accept_assignment(
        assignment_id=assignment_id,
        agent_id=current_user.user_id,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return ActionResponse(
        success=True,
        new_status=result.get("new_status"),
        property_status=result.get("property_status")
    )


@router.post("/agent/assignments/{assignment_id}/decline", response_model=ActionResponse)
async def decline_assignment(
    assignment_id: UUID,
    body: DeclineRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Decline an assignment request.
    
    Transitions:
    - Assignment: REQUESTED → DECLINED
    - Property: PENDING_ASSIGNMENT → DRAFT
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.decline_assignment(
        assignment_id=assignment_id,
        agent_id=current_user.user_id,
        reason=body.reason,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return ActionResponse(success=True, new_status=result.get("new_status"))


@router.post("/agent/assignments/{assignment_id}/start-verification", response_model=ActionResponse)
async def start_verification(
    assignment_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Start property verification.
    
    Transitions property: ASSIGNED → VERIFICATION_IN_PROGRESS
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.start_verification(
        assignment_id=assignment_id,
        agent_id=current_user.user_id,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return ActionResponse(
        success=True,
        property_status=result.get("property_status")
    )


@router.post("/agent/assignments/{assignment_id}/complete-verification", response_model=ActionResponse)
async def complete_verification(
    assignment_id: UUID,
    body: VerificationRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Complete verification with result.
    
    If approved: Property → ACTIVE, Assignment → COMPLETED
    If rejected: Property → ASSIGNED (can retry)
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.complete_verification(
        assignment_id=assignment_id,
        agent_id=current_user.user_id,
        approved=body.approved,
        gps_lat=body.gps_lat,
        gps_lng=body.gps_lng,
        notes=body.notes,
        rejection_reason=body.rejection_reason,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return ActionResponse(
        success=True,
        new_status=result.get("assignment_status"),
        property_status=result.get("property_status")
    )


@router.post("/agent/assignments/{assignment_id}/verification/generate-otp", response_model=ActionResponse)
async def generate_otp(
    assignment_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Generate and send OTP to seller (Email + In-App).
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.generate_verification_otp(
        assignment_id=assignment_id,
        agent_id=current_user.user_id,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return ActionResponse(success=True)


@router.post("/agent/assignments/{assignment_id}/verification/verify-otp", response_model=ActionResponse)
async def verify_otp(
    assignment_id: UUID,
    body: VerificationOTPVerify,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Verify the OTP provided by seller.
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.verify_seller_otp(
        assignment_id=assignment_id,
        agent_id=current_user.user_id,
        otp_code=body.otp_code,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return ActionResponse(success=True)


@router.get("/agent/stats/analytics", response_model=AnalyticsResponse)
async def get_agent_analytics(
    period: str = "month",
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get analytics for agent performance.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_analytics(
        agent_id=current_user.user_id,
        period=period
    )
    return AnalyticsResponse(**result)


@router.get("/agent/crm/leads", response_model=CRMLeadsResponse)
async def get_crm_leads(
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get CRM leads (Sellers and potential Buyers).
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_crm_leads(
        agent_id=current_user.user_id
    )
    return CRMLeadsResponse(**result)


@router.get("/agent/insights", response_model=InsightsResponse)
async def get_agent_insights(
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get AI-driven insights.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_insights(
        agent_id=current_user.user_id
    )
    return InsightsResponse(**result)


@router.get("/agent/schedule/events", response_model=ScheduleResponse)
async def get_agent_schedule(
    start: str = Query(..., description="ISO 8601 start date"),
    end: str = Query(..., description="ISO 8601 end date"),
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get calendar events.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_schedule(
        agent_id=current_user.user_id,
        start_date=start,
        end_date=end
    )
    return ScheduleResponse(**result)


@router.get("/agent/marketing/templates", response_model=MarketingTemplatesResponse)
async def get_marketing_templates(
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get marketing templates.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_marketing_templates()
    return MarketingTemplatesResponse(**result)


@router.get("/agent/marketing/history", response_model=MarketingHistoryResponse)
async def get_marketing_history(
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get marketing asset history.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_marketing_history(agent_id=current_user.user_id)
    return MarketingHistoryResponse(**result)


@router.post("/agent/marketing/generate", response_model=MarketingAssetResponse)
async def generate_marketing_asset(
    body: GenerateMarketingRequest,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Generate marketing asset.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.generate_marketing_asset(
        agent_id=current_user.user_id,
        property_id=body.property_id,
        template_id=body.template_id,
        custom_options=body.custom_options
    )
    return MarketingAssetResponse(**result)


@router.post("/agent/schedule/events", response_model=ManageEventResponse)
async def create_schedule_event(
    body: ManageEventRequest,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Create a new calendar event.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.create_schedule_event(
        agent_id=current_user.user_id,
        title=body.title,
        start=body.start,
        type=body.type
    )
    return ManageEventResponse(**result)


@router.delete("/agent/schedule/events/{event_id}", response_model=ActionResponse)
async def delete_schedule_event(
    event_id: str,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Delete a calendar event.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.delete_schedule_event(
        agent_id=current_user.user_id,
        event_id=event_id
    )
    return ActionResponse(success=True)


class VisitActionRequest(BaseModel):
    action: str # approve, reject, check_in, complete
    notes: Optional[str] = None


class OfferActionRequest(BaseModel):
    action: str # accept, reject, counter
    amount: Optional[float] = None


class AgentOffersResponse(BaseModel):
    success: bool
    offers: List[dict]


@router.post("/agent/visits/{visit_id}/action", response_model=ActionResponse)
async def manage_visit_action(
    visit_id: str,
    body: VisitActionRequest,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Handle visit actions (approve, reject, check-in, complete).
    """
    service = AgentAssignmentService(db_pool)
    result = await service.manage_visit_action(
        agent_id=current_user.user_id,
        visit_id=visit_id,
        action=body.action,
        notes=body.notes
    )
    return ActionResponse(
        success=True,
        new_status=result.get("new_status")
    )


@router.get("/agent/offers", response_model=AgentOffersResponse)
async def get_agent_offers(
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get active offers for agent's properties.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_offers(agent_id=current_user.user_id)
    return AgentOffersResponse(**result)


@router.post("/agent/offers/{offer_id}/action", response_model=ActionResponse)
async def manage_offer_action(
    offer_id: str,
    body: OfferActionRequest,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Handle offer actions (accept, reject, counter).
    """
    service = AgentAssignmentService(db_pool)
    result = await service.manage_offer_action(
        agent_id=current_user.user_id,
        offer_id=offer_id,
        action=body.action,
        amount=body.amount
    )
    return ActionResponse(
        success=True,
        new_status=result.get("new_status")
    )


# ============================================================================
# SELLER ENDPOINT
# ============================================================================

@router.post("/properties/{property_id}/hire-agent", response_model=HireAgentResponse)
async def hire_agent(
    property_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Seller requests an agent for their property.
    
    Transitions property: DRAFT → PENDING_ASSIGNMENT
    """
    ip_address = request.client.host if request.client else None
    service = AgentAssignmentService(db_pool)
    
    result = await service.request_agent_for_property(
        property_id=property_id,
        seller_id=current_user.user_id,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error")
        )
    
    return HireAgentResponse(
        success=True,
        assignment_id=result["assignment_id"],
        agent_name=result["agent_name"],
        new_status=result["new_status"]
    )


# ============================================================================
# MESSAGES ENDPOINTS
# ============================================================================

class MessagesResponse(BaseModel):
    success: bool
    conversations: List[dict]


class MessageSendRequest(BaseModel):
    conversation_id: str
    content: str
    message_type: str = "text"


class MessageSendResponse(BaseModel):
    success: bool
    message: dict


@router.get("/agent/messages", response_model=MessagesResponse)
async def get_agent_messages(
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get all conversations for agent.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_messages(agent_id=current_user.user_id)
    return MessagesResponse(**result)


@router.post("/agent/messages/send", response_model=MessageSendResponse)
async def send_agent_message(
    body: MessageSendRequest,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Send a message in a conversation.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.send_agent_message(
        agent_id=current_user.user_id,
        conversation_id=body.conversation_id,
        content=body.content,
        message_type=body.message_type
    )
    return MessageSendResponse(**result)


# ============================================================================
# DOCUMENTS ENDPOINTS
# ============================================================================

class DocumentsResponse(BaseModel):
    success: bool
    documents: List[dict]
    stats: dict


class DocumentUploadRequest(BaseModel):
    name: str
    category: str
    property_id: Optional[UUID] = None
    file_url: str


class DocumentUploadResponse(BaseModel):
    success: bool
    document: dict


@router.get("/agent/documents", response_model=DocumentsResponse)
async def get_agent_documents(
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Get all documents for agent.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.get_agent_documents(
        agent_id=current_user.user_id,
        category=category
    )
    return DocumentsResponse(**result)


@router.post("/agent/documents", response_model=DocumentUploadResponse)
async def upload_agent_document(
    body: DocumentUploadRequest,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Upload a new document.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.upload_agent_document(
        agent_id=current_user.user_id,
        name=body.name,
        category=body.category,
        property_id=body.property_id,
        file_url=body.file_url
    )
    return DocumentUploadResponse(**result)


@router.delete("/agent/documents/{document_id}", response_model=ActionResponse)
async def delete_agent_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(require_role("AGENT")),
    db_pool = Depends(get_db_pool)
):
    """
    Delete a document.
    """
    service = AgentAssignmentService(db_pool)
    result = await service.delete_agent_document(
        agent_id=current_user.user_id,
        document_id=document_id
    )
    return ActionResponse(success=True)
