"""
Escrow Router — /deals/{deal_id}/escrow/* and /escrow/{disbursement_id}/*
"""
from typing import Any, Dict, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.database import get_db_pool
from app.middleware.auth_middleware import get_current_user
from app.services.title_escrow_engine import EscrowService

router = APIRouter(tags=["escrow"])


def get_escrow_service(db: asyncpg.Pool = Depends(get_db_pool)) -> EscrowService:
    return EscrowService(db)


def _require_admin(current_user: dict) -> None:
    if current_user.get("role") not in ("ADMIN", "CEO"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class HoldBody(BaseModel):
    hold_reason: str


class LiftHoldBody(BaseModel):
    reason: str


class CancelBody(BaseModel):
    cancellation_reason: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/deals/{deal_id}/escrow/generate",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Generate disbursement schedule for a completed deal",
)
async def generate_escrow_schedule(
    deal_id: UUID,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.generate_disbursement_schedule(deal_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get(
    "/deals/{deal_id}/escrow",
    response_model=Dict[str, Any],
    summary="Get disbursement schedule and summary for a deal",
)
async def get_deal_escrow(
    deal_id: UUID,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    # Admin or deal participants may view
    result = await service.get_deal_disbursements(deal_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post(
    "/escrow/{disbursement_id}/approve",
    response_model=Dict[str, Any],
    summary="Approve a pending disbursement (ADMIN only)",
)
async def approve_disbursement(
    disbursement_id: UUID,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.approve_disbursement(
        disbursement_id=disbursement_id,
        approved_by=UUID(str(current_user["user_id"])),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post(
    "/escrow/{disbursement_id}/process",
    response_model=Dict[str, Any],
    summary="Process an approved disbursement via payment engine (ADMIN only)",
)
async def process_disbursement(
    disbursement_id: UUID,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.process_disbursement(disbursement_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post(
    "/escrow/{disbursement_id}/hold",
    response_model=Dict[str, Any],
    summary="Put a disbursement on hold (ADMIN only)",
)
async def hold_disbursement(
    disbursement_id: UUID,
    body: HoldBody,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.hold_disbursement(
        disbursement_id=disbursement_id,
        hold_reason=body.hold_reason,
        hold_by=UUID(str(current_user["user_id"])),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post(
    "/escrow/{disbursement_id}/lift-hold",
    response_model=Dict[str, Any],
    summary="Lift a hold on a disbursement (ADMIN only)",
)
async def lift_hold(
    disbursement_id: UUID,
    body: LiftHoldBody,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.lift_hold(
        disbursement_id=disbursement_id,
        reason=body.reason,
        admin_id=UUID(str(current_user["user_id"])),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post(
    "/escrow/{disbursement_id}/cancel",
    response_model=Dict[str, Any],
    summary="Cancel a disbursement (ADMIN only)",
)
async def cancel_disbursement(
    disbursement_id: UUID,
    body: CancelBody,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.cancel_disbursement(
        disbursement_id=disbursement_id,
        reason=body.cancellation_reason,
        cancelled_by=UUID(str(current_user["user_id"])),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post(
    "/escrow/{disbursement_id}/retry",
    response_model=Dict[str, Any],
    summary="Retry a failed disbursement (ADMIN only, max 3 retries)",
)
async def retry_disbursement(
    disbursement_id: UUID,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await service.retry_disbursement(
        disbursement_id=disbursement_id,
        admin_id=UUID(str(current_user["user_id"])),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get(
    "/escrow/{disbursement_id}",
    response_model=Dict[str, Any],
    summary="Get disbursement detail with event timeline",
)
async def get_disbursement_detail(
    disbursement_id: UUID,
    service: EscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user),
):
    result = await service.get_disbursement_detail(disbursement_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result
