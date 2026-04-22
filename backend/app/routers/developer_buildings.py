"""Developer Buildings & Floors Router."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, AuthenticatedUser
from ..schemas.developer_schemas import (
    BuildingCreate, BuildingUpdate, FloorCreate, FloorUpdate
)
from ..services.developer_building_service import DeveloperBuildingService

router = APIRouter(prefix="/developer/buildings", tags=["Developer Buildings"])


# ---------------------------------------------------------------------------
# BUILDINGS
# ---------------------------------------------------------------------------

@router.post("")
async def create_building(
    data: BuildingCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Create a building/tower within a project."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.create_building(current_user.user_id, data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("")
async def list_buildings(
    project_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List all buildings for a project."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.list_buildings(current_user.user_id, project_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{building_id}")
async def get_building(
    building_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get building detail with floors."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.get_building(building_id, current_user.user_id)
    if not result["success"]:
        code = 404 if "not found" in result["error"].lower() else 403
        raise HTTPException(status_code=code, detail=result["error"])
    return result


@router.put("/{building_id}")
async def update_building(
    building_id: UUID,
    data: BuildingUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Update a building."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.update_building(
        building_id, current_user.user_id, data.model_dump(exclude_none=True)
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/{building_id}")
async def delete_building(
    building_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Soft-delete a building."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.delete_building(building_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ---------------------------------------------------------------------------
# FLOORS
# ---------------------------------------------------------------------------

@router.post("/{building_id}/floors")
async def create_floor(
    building_id: UUID,
    data: FloorCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Create a floor within a building."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    floor_data = data.model_dump()
    floor_data["building_id"] = building_id
    result = await service.create_floor(current_user.user_id, floor_data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{building_id}/floors")
async def list_floors(
    building_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List all floors for a building."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.list_floors(building_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{building_id}/auto-generate-floors")
async def auto_generate_floors(
    building_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Auto-generate floors based on building total_floors setting."""
    pool = get_db_pool()
    service = DeveloperBuildingService(pool)
    result = await service.auto_generate_floors(current_user.user_id, building_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
