"""
Title Search Router — /deals/{deal_id}/title-search and /title-searches/*
"""
from typing import Any, Dict, List, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.database import get_db_pool
from app.middleware.auth_middleware import get_current_user
from app.services.title_escrow_engine import TitleSearchService

router = APIRouter(tags=["title_searches"])


def get_title_search_service(db: asyncpg.Pool = Depends(get_db_pool)) -> TitleSearchService:
    return TitleSearchService(db)


def _require_roles(current_user: dict, roles: List[str]) -> None:
    if current_user.get("role") not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required roles: {roles}",
        )


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class InitiateTitleSearchBody(BaseModel):
    agency_name: str
    checker_name: Optional[str] = None
    transaction_id: Optional[UUID] = None


class TransitionTitleSearchBody(BaseModel):
    to_status: str
    report_url: Optional[str] = None
    encumbrance_notes: Optional[str] = None
    encumbrance_details: Optional[List[Dict[str, Any]]] = None
    rejection_reason: Optional[str] = None
    resolution_plan: Optional[str] = None
    clearance_docs: Optional[List[Dict[str, Any]]] = None
    resolution_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/deals/{deal_id}/title-search",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a title search for a deal",
)
async def initiate_title_search(
    deal_id: UUID,
    body: InitiateTitleSearchBody,
    service: TitleSearchService = Depends(get_title_search_service),
    current_user: dict = Depends(get_current_user),
):
    _require_roles(current_user, ["AGENT", "ADMIN"])

    result = await service.initiate_title_search(
        deal_id=deal_id,
        agency_name=body.agency_name,
        checker_name=body.checker_name,
        initiated_by=UUID(str(current_user["user_id"])),
        transaction_id=body.transaction_id,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post(
    "/title-searches/{search_id}/transition",
    response_model=Dict[str, Any],
    summary="Transition a title search to a new status",
)
async def transition_title_search(
    search_id: UUID,
    body: TransitionTitleSearchBody,
    service: TitleSearchService = Depends(get_title_search_service),
    current_user: dict = Depends(get_current_user),
):
    _require_roles(current_user, ["AGENT", "ADMIN"])

    metadata = {}
    if body.report_url:
        metadata["report_url"] = body.report_url
    if body.encumbrance_notes:
        metadata["encumbrance_notes"] = body.encumbrance_notes
    if body.encumbrance_details:
        metadata["encumbrance_details"] = body.encumbrance_details
    if body.rejection_reason:
        metadata["rejection_reason"] = body.rejection_reason
    if body.resolution_plan:
        metadata["resolution_plan"] = body.resolution_plan
    if body.clearance_docs:
        metadata["clearance_docs"] = body.clearance_docs
    if body.resolution_notes:
        metadata["resolution_notes"] = body.resolution_notes

    result = await service.transition_title_search(
        search_id=search_id,
        to_status=body.to_status,
        actor_id=UUID(str(current_user["user_id"])),
        actor_role=current_user.get("role", "AGENT"),
        metadata=metadata,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get(
    "/deals/{deal_id}/title-searches",
    response_model=Dict[str, Any],
    summary="List all title searches for a deal",
)
async def get_deal_title_searches(
    deal_id: UUID,
    service: TitleSearchService = Depends(get_title_search_service),
    current_user: dict = Depends(get_current_user),
):
    result = await service.get_searches_for_deal(deal_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get(
    "/title-searches/{search_id}",
    response_model=Dict[str, Any],
    summary="Get detail of a single title search with event timeline",
)
async def get_title_search_detail(
    search_id: UUID,
    service: TitleSearchService = Depends(get_title_search_service),
    current_user: dict = Depends(get_current_user),
):
    result = await service.get_search_detail(search_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result
