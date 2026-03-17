from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from uuid import UUID
import asyncpg

from app.core.database import get_db_pool
from app.middleware.auth_middleware import get_current_user, AuthenticatedUser
from app.schemas.title_escrow_schemas import (
    TitleSearchCreate, TitleSearchUpdate, TitleSearchResponse,
    EscrowDisbursementCreate, EscrowDisbursementUpdate, EscrowDisbursementResponse
)
from app.services.title_escrow_service import TitleEscrowService

router = APIRouter(prefix="/escrow", tags=["title_escrow"])

def get_escrow_service(db: asyncpg.Pool = Depends(get_db_pool)) -> TitleEscrowService:
    return TitleEscrowService(db)

@router.post("/title-search", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_title_search(
    data: TitleSearchCreate,
    service: TitleEscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage title searches")
    result = await service.create_title_search(data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.patch("/title-search/{id}", response_model=Dict[str, Any])
async def update_title_search(
    id: UUID,
    data: TitleSearchUpdate,
    service: TitleEscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage title searches")
    result = await service.update_title_search(id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/disbursement", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_escrow_disbursement(
    data: EscrowDisbursementCreate,
    service: TitleEscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage disbursements")
    result = await service.create_escrow_disbursement(data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.patch("/disbursement/{id}", response_model=Dict[str, Any])
async def update_escrow_disbursement(
    id: UUID,
    data: EscrowDisbursementUpdate,
    service: TitleEscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can manage disbursements")
    result = await service.update_escrow_disbursement(id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/transaction/{transaction_id}", response_model=Dict[str, Any])
async def get_transaction_escrow(
    transaction_id: UUID,
    service: TitleEscrowService = Depends(get_escrow_service),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["ADMIN", "AGENT"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await service.get_transaction_escrow(transaction_id)
    return result
