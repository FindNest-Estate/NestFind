"""Developer Projects Router."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, AuthenticatedUser
from ..schemas.developer_schemas import ProjectCreate, ProjectUpdate
from ..services.developer_project_service import DeveloperProjectService

router = APIRouter(prefix="/developer/projects", tags=["Developer Projects"])


@router.post("")
async def create_project(
    data: ProjectCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Create a new real estate project."""
    pool = get_db_pool()
    service = DeveloperProjectService(pool)
    result = await service.create_project(current_user.user_id, data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("")
async def list_projects(
    status: Optional[str] = None,
    project_type: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List developer's projects with pagination."""
    pool = get_db_pool()
    service = DeveloperProjectService(pool)
    result = await service.list_projects(
        developer_id=current_user.user_id,
        status=status,
        project_type=project_type,
        page=page,
        per_page=per_page
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get project detail."""
    pool = get_db_pool()
    service = DeveloperProjectService(pool)
    result = await service.get_project(project_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(
            status_code=404 if "not found" in result["error"].lower() else 403,
            detail=result["error"]
        )
    return result


@router.put("/{project_id}")
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Update a project."""
    pool = get_db_pool()
    service = DeveloperProjectService(pool)
    result = await service.update_project(
        project_id, current_user.user_id, data.model_dump(exclude_none=True)
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Soft-delete a project."""
    pool = get_db_pool()
    service = DeveloperProjectService(pool)
    result = await service.delete_project(project_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{project_id}/images")
async def upload_project_image(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Upload a project image."""
    import uuid as uuid_lib
    from pathlib import Path

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    content = await file.read()
    ext = Path(file.filename).suffix or ".jpg"
    save_path = Path(f"uploads/developer/{current_user.user_id}/{project_id}")
    save_path.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid_lib.uuid4()}{ext}"
    (save_path / filename).write_bytes(content)

    image_url = f"/uploads/developer/{current_user.user_id}/{project_id}/{filename}"

    pool = get_db_pool()
    service = DeveloperProjectService(pool)
    result = await service.add_project_image(project_id, current_user.user_id, image_url)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
