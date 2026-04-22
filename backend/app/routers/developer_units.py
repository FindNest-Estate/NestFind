"""Developer Units Router with CSV bulk upload."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, get_current_user, AuthenticatedUser
from ..schemas.developer_schemas import UnitCreate, UnitUpdate, DevOfferCreate
from ..services.developer_unit_service import DeveloperUnitService
from ..services.developer_offer_service import DeveloperOfferService

router = APIRouter(prefix="/developer/units", tags=["Developer Units"])


@router.post("")
async def create_unit(
    data: UnitCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperUnitService(pool)
    result = await service.create_unit(current_user.user_id, data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("")
async def list_units(
    project_id: Optional[UUID] = None,
    status: Optional[str] = None,
    unit_type: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperUnitService(pool)
    result = await service.list_units(
        developer_id=current_user.user_id,
        project_id=project_id,
        status=status,
        unit_type=unit_type,
        page=page,
        per_page=per_page
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{unit_id}")
async def get_unit(
    unit_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperUnitService(pool)
    result = await service.get_unit(unit_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(
            status_code=404 if "not found" in result["error"].lower() else 403,
            detail=result["error"]
        )
    return result


@router.put("/{unit_id}")
async def update_unit(
    unit_id: UUID,
    data: UnitUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperUnitService(pool)
    result = await service.update_unit(unit_id, current_user.user_id, data.model_dump(exclude_none=True))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/{unit_id}")
async def delete_unit(
    unit_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperUnitService(pool)
    result = await service.delete_unit(unit_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/bulk-upload")
async def bulk_upload_units(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """
    Bulk upload units via CSV file.

    CSV must have columns: unit_number, unit_type, price
    Optional: area_sqft, facing, floor, bedrooms, bathrooms, parking

    Download sample: GET /developer/units/bulk-upload/sample
    """
    if not (file.filename.endswith(".csv") or file.content_type == "text/csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported. Download sample CSV for format.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")

    pool = get_db_pool()
    service = DeveloperUnitService(pool)
    result = await service.bulk_upload_csv(current_user.user_id, project_id, content)
    if not result["success"]:
        status_code = 422 if "row_errors" in result else 400
        raise HTTPException(status_code=status_code, detail=result)
    return result


@router.get("/bulk-upload/sample")
async def get_sample_csv(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Download sample CSV template for bulk unit upload."""
    from fastapi.responses import Response
    sample = (
        "unit_number,unit_type,area_sqft,price,facing,floor,bedrooms,bathrooms,parking\n"
        "A-101,Apartment,1200,5500000,East,1,2,2,1\n"
        "A-102,Apartment,1400,6500000,West,1,3,2,1\n"
        "B-201,Penthouse,2800,12000000,North,2,4,3,2\n"
        "P-001,Plot,2400,3200000,South,,,,0\n"
    )
    return Response(
        content=sample,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=units_template.csv"}
    )


# ---------------------------------------------------------------------------
# PUBLIC: Buyer submits offer on a unit (accessible by BUYER role)
# This endpoint is called from the Buyer portal
# ---------------------------------------------------------------------------

@router.post("/{unit_id}/offers")
async def submit_offer_on_unit(
    unit_id: UUID,
    data: DevOfferCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Buyer submits an offer on a developer unit.
    Called from Buyer Portal — accessible by any authenticated user.
    Multiple buyers can offer simultaneously.
    """
    pool = get_db_pool()
    service = DeveloperOfferService(pool)
    result = await service.submit_offer(
        unit_id=unit_id,
        buyer_id=current_user.user_id,
        offer_price=data.offer_price,
        buyer_message=data.buyer_message,
        expiry_hours=data.expiry_hours,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
