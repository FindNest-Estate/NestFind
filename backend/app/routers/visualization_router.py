"""Public Visualization Router — Unauthenticated project exploration API."""
from fastapi import APIRouter, HTTPException
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..services.visualization_service import VisualizationService

router = APIRouter(prefix="/explore", tags=["Public Project Explorer"])


@router.get("/projects")
async def list_public_projects(
    city: Optional[str] = None,
    project_type: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
):
    """List projects with interactive visualization enabled (public)."""
    pool = get_db_pool()
    service = VisualizationService(pool)
    result = await service.list_public_projects(city, project_type, page, per_page)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/projects/{project_id}/master-plan")
async def get_master_plan(project_id: UUID):
    """
    Get the complete master plan data for a project.
    Returns all polygons, buildings, amenities, roads, and unit summary.
    """
    pool = get_db_pool()
    service = VisualizationService(pool)
    result = await service.get_master_plan(project_id)
    if not result["success"]:
        code = 404 if "not found" in result.get("error", "").lower() else 400
        raise HTTPException(status_code=code, detail=result["error"])
    return result


@router.get("/projects/{project_id}/building/{building_id}")
async def get_building_detail(project_id: UUID, building_id: UUID):
    """Get building detail with all floors and units (public)."""
    pool = get_db_pool()
    service = VisualizationService(pool)
    result = await service.get_building_detail(project_id, building_id)
    if not result["success"]:
        code = 404 if "not found" in result.get("error", "").lower() else 400
        raise HTTPException(status_code=code, detail=result["error"])
    return result


@router.get("/projects/{project_id}/unit/{unit_id}")
async def get_unit_detail(project_id: UUID, unit_id: UUID):
    """Get full unit detail (public)."""
    pool = get_db_pool()
    service = VisualizationService(pool)
    result = await service.get_unit_detail(project_id, unit_id)
    if not result["success"]:
        code = 404 if "not found" in result.get("error", "").lower() else 400
        raise HTTPException(status_code=code, detail=result["error"])
    return result
