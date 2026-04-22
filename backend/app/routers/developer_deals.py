"""Developer Deals Router — pipeline management."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, AuthenticatedUser
from ..schemas.developer_schemas import DealStageUpdate
from ..services.developer_deal_service import DeveloperDealService

router = APIRouter(prefix="/developer/deals", tags=["Developer Deals"])


@router.get("")
async def list_deals(
    stage: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List all deals with optional stage filter. Used to populate Kanban board."""
    pool = get_db_pool()
    service = DeveloperDealService(pool)
    result = await service.list_deals(
        developer_id=current_user.user_id,
        stage=stage,
        page=page,
        per_page=per_page
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/pipeline")
async def get_pipeline_counts(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get deal count per stage for Kanban column headers."""
    pool = get_db_pool()
    service = DeveloperDealService(pool)
    result = await service.get_pipeline_counts(current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{deal_id}")
async def get_deal(
    deal_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get deal detail with full stage history."""
    pool = get_db_pool()
    service = DeveloperDealService(pool)
    result = await service.get_deal(deal_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(
            status_code=404 if "not found" in result["error"].lower() else 403,
            detail=result["error"]
        )
    return result


@router.put("/{deal_id}/stage")
async def update_deal_stage(
    deal_id: UUID,
    data: DealStageUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """
    Advance deal to next stage.
    Validates the transition against the pipeline state machine.
    Automation: TOKEN_PAID → unit BOOKED, COMPLETED → unit SOLD.
    """
    pool = get_db_pool()
    service = DeveloperDealService(pool)
    result = await service.update_stage(
        deal_id=deal_id,
        developer_id=current_user.user_id,
        new_stage=data.deal_stage.value,
        actor_id=current_user.user_id,
        notes=data.notes,
        token_amount=data.token_amount,
        agreement_date=data.agreement_date,
        registration_date=data.registration_date,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


class AgentAssignRequest:
    pass


from pydantic import BaseModel
from typing import Optional as Opt
from decimal import Decimal

class AssignAgentBody(BaseModel):
    agent_id: UUID
    commission_amount: Opt[float] = None


@router.post("/{deal_id}/assign-agent")
async def assign_agent_to_deal(
    deal_id: UUID,
    data: AssignAgentBody,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Assign an agent to a deal and optionally record commission amount."""
    pool = get_db_pool()
    service = DeveloperDealService(pool)
    result = await service.assign_agent(
        deal_id=deal_id,
        developer_id=current_user.user_id,
        agent_id=data.agent_id,
        commission_amount=data.commission_amount,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
