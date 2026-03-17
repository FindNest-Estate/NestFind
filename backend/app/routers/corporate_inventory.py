from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from uuid import UUID
import asyncpg

from app.core.database import get_db_pool
from app.middleware.auth_middleware import get_current_user, AuthenticatedUser
from app.schemas.corporate_schemas import (
    CorporateInventoryCreate, CorporateInventoryUpdate, CorporateInventoryResponse,
    RenovationLedgerCreate, RenovationLedgerUpdate, RenovationLedgerResponse
)
from app.services.corporate_service import CorporateInventoryService

router = APIRouter(prefix="/corporate", tags=["corporate_inventory"])

def get_corporate_service(db: asyncpg.Pool = Depends(get_db_pool)) -> CorporateInventoryService:
    return CorporateInventoryService(db)

@router.post("/inventory", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_inventory(
    data: CorporateInventoryCreate,
    service: CorporateInventoryService = Depends(get_corporate_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage corporate inventory")
    result = await service.create_inventory(data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/inventory/{id}", response_model=Dict[str, Any])
async def get_inventory(
    id: UUID,
    service: CorporateInventoryService = Depends(get_corporate_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage corporate inventory")
    result = await service.get_inventory(id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.patch("/inventory/{id}", response_model=Dict[str, Any])
async def update_inventory(
    id: UUID,
    data: CorporateInventoryUpdate,
    service: CorporateInventoryService = Depends(get_corporate_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage corporate inventory")
    result = await service.update_inventory(id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/renovation", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def add_renovation_ledger(
    data: RenovationLedgerCreate,
    service: CorporateInventoryService = Depends(get_corporate_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage corporate inventory")
    result = await service.add_renovation_ledger(data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/inventory/{inventory_id}/renovations", response_model=Dict[str, Any])
async def get_renovation_ledgers(
    inventory_id: UUID,
    service: CorporateInventoryService = Depends(get_corporate_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage corporate inventory")
    result = await service.get_renovation_ledgers(inventory_id)
    return result
