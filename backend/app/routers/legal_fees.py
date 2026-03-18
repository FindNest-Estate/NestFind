"""
Legal Fees Router — Stamp duty, registration fee, TDS calculation
"""
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.database import get_db_pool
from app.middleware.auth_middleware import get_current_user
from app.services.title_escrow_engine import LegalComplianceService

router = APIRouter(tags=["legal_fees"])


def get_legal_service(db: asyncpg.Pool = Depends(get_db_pool)) -> LegalComplianceService:
    return LegalComplianceService(db)


class CalculateLegalFeesBody(BaseModel):
    state: str
    buyer_gender: str = "MALE"          # MALE, FEMALE, JOINT
    property_type: str = "RESIDENTIAL"  # RESIDENTIAL, COMMERCIAL, AGRICULTURAL


@router.post(
    "/deals/{deal_id}/legal-fees/calculate",
    response_model=Dict[str, Any],
    summary="Calculate stamp duty, registration fee, and TDS for a deal",
)
async def calculate_legal_fees(
    deal_id: UUID,
    body: CalculateLegalFeesBody,
    service: LegalComplianceService = Depends(get_legal_service),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db_pool),
):
    if current_user.get("role") not in ("ADMIN", "AGENT", "CEO"):
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch property value from deal
    async with db.acquire() as conn:
        deal = await conn.fetchrow(
            "SELECT agreed_price FROM deals WHERE id = $1", deal_id
        )
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if not deal["agreed_price"]:
        raise HTTPException(status_code=400, detail="Deal does not have an agreed price yet")

    result = await service.calculate_legal_fees(
        deal_id=deal_id,
        property_value=Decimal(str(deal["agreed_price"])),
        state=body.state,
        buyer_gender=body.buyer_gender,
        property_type=body.property_type,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get(
    "/deals/{deal_id}/legal-fees",
    response_model=Dict[str, Any],
    summary="Get the most recent persisted legal fee calculation for a deal",
)
async def get_deal_legal_fees(
    deal_id: UUID,
    service: LegalComplianceService = Depends(get_legal_service),
    current_user: dict = Depends(get_current_user),
):
    result = await service.get_legal_fees_for_deal(deal_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get(
    "/legal-fees/stamp-duty-rates",
    response_model=Dict[str, Any],
    summary="List all active stamp duty rates (optionally filter by state)",
)
async def list_stamp_duty_rates(
    state: Optional[str] = Query(None, description="Filter by state code e.g. MAHARASHTRA"),
    service: LegalComplianceService = Depends(get_legal_service),
    current_user: dict = Depends(get_current_user),
):
    result = await service.get_all_stamp_duty_rates(state=state)
    return result
