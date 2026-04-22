"""Developer Polygons Router — CRUD + SVG/DXF import."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional, List
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, AuthenticatedUser
from ..schemas.developer_schemas import PolygonCreate, PolygonUpdate, PolygonBulkCreate
from ..services.developer_polygon_service import DeveloperPolygonService

router = APIRouter(prefix="/developer/polygons", tags=["Developer Layout Polygons"])


@router.post("/{project_id}")
async def create_polygon(
    project_id: UUID,
    data: PolygonCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Create a single layout polygon."""
    pool = get_db_pool()
    service = DeveloperPolygonService(pool)
    poly_data = data.model_dump()
    poly_data["project_id"] = project_id
    result = await service.create_polygon(current_user.user_id, poly_data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{project_id}/bulk")
async def bulk_create_polygons(
    project_id: UUID,
    data: PolygonBulkCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Bulk create layout polygons (for import)."""
    pool = get_db_pool()
    service = DeveloperPolygonService(pool)
    polygons = [p.model_dump() for p in data.polygons]
    result = await service.bulk_create_polygons(current_user.user_id, project_id, polygons)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{project_id}")
async def list_polygons(
    project_id: UUID,
    polygon_type: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List all polygons for a project."""
    pool = get_db_pool()
    service = DeveloperPolygonService(pool)
    result = await service.list_polygons(project_id, polygon_type)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.put("/polygon/{polygon_id}")
async def update_polygon(
    polygon_id: UUID,
    data: PolygonUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Update a single polygon."""
    pool = get_db_pool()
    service = DeveloperPolygonService(pool)
    result = await service.update_polygon(
        polygon_id, current_user.user_id, data.model_dump(exclude_none=True)
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/polygon/{polygon_id}")
async def delete_polygon(
    polygon_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Delete a polygon."""
    pool = get_db_pool()
    service = DeveloperPolygonService(pool)
    result = await service.delete_polygon(polygon_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/{project_id}/clear")
async def clear_polygons(
    project_id: UUID,
    polygon_type: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Clear all polygons of a type (or all) for reimport."""
    pool = get_db_pool()
    service = DeveloperPolygonService(pool)
    result = await service.clear_project_polygons(project_id, current_user.user_id, polygon_type)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{project_id}/import-svg")
async def import_svg(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Parse an SVG file and extract polygons into the database."""
    if not file.filename.lower().endswith(".svg"):
        raise HTTPException(status_code=400, detail="Only SVG files are supported")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        from ..services.svg_parser_service import SVGParserService
        parser = SVGParserService()
        polygons = parser.parse(content.decode("utf-8"))

        pool = get_db_pool()
        service = DeveloperPolygonService(pool)
        result = await service.bulk_create_polygons(current_user.user_id, project_id, polygons)
        return result
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse SVG: {str(e)}")


@router.post("/{project_id}/import-dxf")
async def import_dxf(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Parse a DXF file and extract polygons into the database."""
    if not file.filename.lower().endswith(".dxf"):
        raise HTTPException(status_code=400, detail="Only DXF files are supported")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit for CAD
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    try:
        from ..services.cad_parser_service import CADParserService
        parser = CADParserService()
        polygons = parser.parse_dxf(content)

        pool = get_db_pool()
        service = DeveloperPolygonService(pool)
        result = await service.bulk_create_polygons(current_user.user_id, project_id, polygons)
        return result
    except ImportError:
        raise HTTPException(status_code=501, detail="DXF parsing not available — install ezdxf")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse DXF: {str(e)}")
