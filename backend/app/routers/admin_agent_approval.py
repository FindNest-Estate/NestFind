from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List

from ..services.admin_agent_approval_service import AdminAgentApprovalService
from ..middleware.auth_middleware import AuthenticatedUser, require_role
from ..core.database import get_db_pool


router = APIRouter(prefix="/admin", tags=["Admin - Agent Approval"])


class AgentDecisionRequest(BaseModel):
    decision_reason: Optional[str] = None


class AgentDecisionResponse(BaseModel):
    status: str


class PendingAgentResponse(BaseModel):
    """Pending agent item for admin list."""
    id: str
    full_name: str
    email: str
    phone_number: Optional[str]
    status: str
    status: str
    pan_number: Optional[str]
    aadhaar_number: Optional[str]
    service_radius: Optional[int]
    submitted_at: str


class PaginationResponse(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_more: bool


class PendingAgentsListResponse(BaseModel):
    """Response for pending agents list."""
    agents: List[PendingAgentResponse]
    pagination: PaginationResponse


class AgentProfileDetail(BaseModel):
    pan_number: Optional[str]
    aadhaar_number: Optional[str]
    service_radius: Optional[int]


class AgentDetail(BaseModel):
    id: str
    full_name: str
    email: str
    phone_number: Optional[str]
    status: str
    submitted_at: str
    address: Optional[str]
    coordinates: Optional[dict]
    profile: AgentProfileDetail


class AgentHistoryItem(BaseModel):
    action: str
    timestamp: str
    admin_name: str
    reason: Optional[str]


class AgentDetailResponse(BaseModel):
    success: bool
    agent: AgentDetail
    history: List[AgentHistoryItem]


@router.post("/agents/{agent_id}/approve", response_model=AgentDecisionResponse)
async def approve_agent(
    agent_id: UUID,
    request: AgentDecisionRequest,
    http_request: Request,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Approve agent: IN_REVIEW → ACTIVE.
    
    Requires ADMIN role.
    
    Enforces:
    - ADMIN role verification from database
    - State transition validation
    - Audit logging
    """
    ip_address = http_request.client.host
    approval_service = AdminAgentApprovalService(db_pool)
    
    try:
        result = await approval_service.approve_agent(
            agent_id=agent_id,
            admin_id=current_user.user_id,
            decision_reason=request.decision_reason,
            ip_address=ip_address
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return AgentDecisionResponse(status=result["status"])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/{agent_id}/decline", response_model=AgentDecisionResponse)
async def decline_agent(
    agent_id: UUID,
    request: AgentDecisionRequest,
    http_request: Request,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Decline agent: IN_REVIEW → DECLINED.
    
    Requires ADMIN role.
    
    Enforces:
    - ADMIN role verification from database
    - State transition validation
    - Audit logging
    - Agent record preservation
    """
    ip_address = http_request.client.host
    approval_service = AdminAgentApprovalService(db_pool)
    
    try:
        result = await approval_service.decline_agent(
            agent_id=agent_id,
            admin_id=current_user.user_id,
            decision_reason=request.decision_reason,
            ip_address=ip_address
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return AgentDecisionResponse(status=result["status"])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/pending", response_model=PendingAgentsListResponse)
async def get_pending_agents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Get list of agents pending approval.
    
    Requires ADMIN role.
    Returns agents with status=IN_REVIEW.
    """
    approval_service = AdminAgentApprovalService(db_pool)
    
    result = await approval_service.get_pending_agents(
        page=page,
        per_page=per_page
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pending agents"
        )
    
    return PendingAgentsListResponse(
        agents=[PendingAgentResponse(**agent) for agent in result["agents"]],
        pagination=PaginationResponse(**result["pagination"])
    )


@router.get("/agents/{agent_id}", response_model=AgentDetailResponse)
async def get_agent_details(
    agent_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Get full details of an agent including profile and history.
    Requires ADMIN role.
    """
    from ..services.admin_agent_detail_service import AdminAgentDetailService
    
    detail_service = AdminAgentDetailService(db_pool)
    result = await detail_service.get_agent_details(agent_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"]
        )
        
    return result


@router.get("/agents/coverage/check")
async def check_coverage_areas(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(..., description="Radius in KM"),
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Proxy to fetch covered areas from Overpass API.
    """
    from ..services.admin_agent_detail_service import AdminAgentDetailService
    
    detail_service = AdminAgentDetailService(db_pool)
    result = await detail_service.get_coverage_areas(lat, lng, radius)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to fetch coverage data")
        )
        
    return result["data"]


# ============================================================================
# ADMIN PROPERTY OVERRIDE
# ============================================================================

class PropertyOverrideRequest(BaseModel):
    """Request to override property status."""
    new_status: str
    reason: str  # Required for audit


@router.post("/properties/{property_id}/override")
async def override_property_status(
    property_id: UUID,
    request: PropertyOverrideRequest,
    http_request: Request,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """
    Override property status (ADMIN ONLY).
    
    Allows admin to manually change property status bypassing normal state machine.
    Requires mandatory reason for audit trail.
    
    Use cases:
    - Force INACTIVE status to remove problematic listings
    - Force ACTIVE if verification stuck
    - Emergency status changes
    """
    from ..services.property_service import PropertyService
    
    ip_address = http_request.client.host
    property_service = PropertyService(db_pool)
    
    # Validate status is valid
    valid_statuses = [
        "DRAFT", "PENDING_ASSIGNMENT", "ASSIGNED", 
        "VERIFICATION_IN_PROGRESS", "ACTIVE", "INACTIVE", 
        "RESERVED", "SOLD"
    ]
    
    if request.new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    if not request.reason or len(request.reason.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason must be at least 10 characters"
        )
    
    # Call service method (to be implemented)
    result = await property_service.admin_override_status(
        property_id=property_id,
        new_status=request.new_status,
        admin_id=current_user.user_id,
        reason=request.reason,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error", "Failed to override property status")
        )
    
    return {
        "message": "Property status overridden successfully",
        "property_id": str(property_id),
        "new_status": request.new_status
    }

