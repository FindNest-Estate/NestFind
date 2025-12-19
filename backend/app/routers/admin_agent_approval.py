from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

from ..services.admin_agent_approval_service import AdminAgentApprovalService
from ..middleware.auth_middleware import AuthenticatedUser, require_role
from ..core.database import get_db_pool


router = APIRouter(prefix="/admin", tags=["Admin - Agent Approval"])


class AgentDecisionRequest(BaseModel):
    decision_reason: Optional[str] = None


class AgentDecisionResponse(BaseModel):
    status: str


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
