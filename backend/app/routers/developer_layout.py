"""Developer Layout Mapping Router."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, AuthenticatedUser
from ..schemas.developer_schemas import LayoutUnitMapping, LayoutUnitResponse
from ..services.developer_layout_service import DeveloperLayoutService

router = APIRouter(prefix="/developer/layout", tags=["Developer Layout Mapping"])


@router.post("/{project_id}/mappings")
async def save_layout_mappings(
    project_id: UUID,
    mappings: List[LayoutUnitMapping],
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Save or update unit mappings for a project layout map."""
    pool = get_db_pool()
    service = DeveloperLayoutService(pool)
    # Convert Pydantic models to dicts
    mapping_dicts = [m.model_dump() for m in mappings]
    result = await service.save_mappings(current_user.user_id, project_id, mapping_dicts)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{project_id}/inventory")
async def get_layout_inventory(
    project_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get all unit mappings and their current status for a project."""
    pool = get_db_pool()
    service = DeveloperLayoutService(pool)
    result = await service.get_layout_inventory(project_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/mappings/{mapping_id}")
async def delete_layout_mapping(
    mapping_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Delete a specific unit mapping from the layout."""
    pool = get_db_pool()
    service = DeveloperLayoutService(pool)
    result = await service.delete_mapping(current_user.user_id, mapping_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
