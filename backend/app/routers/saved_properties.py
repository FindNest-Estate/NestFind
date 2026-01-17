"""
Saved Properties Router - Bookmark management for buyers.

Authenticated endpoints for saving/unsaving properties.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from ..services.saved_properties_service import SavedPropertiesService
from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user


router = APIRouter(prefix="/properties", tags=["Saved Properties"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class SavePropertyRequest(BaseModel):
    """Request to save a property."""
    notes: Optional[str] = None


class SavedPropertyResponse(BaseModel):
    """Single saved property in list."""
    id: str
    title: Optional[str]
    type: Optional[str]
    price: Optional[float]
    city: Optional[str]
    state: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    notes: Optional[str]
    saved_at: str
    thumbnail_url: Optional[str]


class PaginationResponse(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_more: bool


class SavedPropertiesListResponse(BaseModel):
    """Response for listing saved properties."""
    properties: List[SavedPropertyResponse]
    pagination: PaginationResponse


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/{property_id}/save")
async def save_property(
    property_id: UUID,
    request: SavePropertyRequest,
    current_user: dict = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Save/bookmark a property.
    
    Requires authentication.
    Idempotent - won't error if already saved.
    """
    service = SavedPropertiesService(db_pool)
    result = await service.save_property(
        user_id=UUID(current_user["id"]),
        property_id=property_id,
        notes=request.notes
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error", "Failed to save property")
        )
    
    return {
        "message": result["message"],
        "saved_id": result["saved_id"]
    }


@router.delete("/{property_id}/save")
async def unsave_property(
    property_id: UUID,
    current_user: dict = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Remove a saved property.
    
    Requires authentication.
    Idempotent - won't error if not saved.
    """
    service = SavedPropertiesService(db_pool)
    result = await service.unsave_property(
        user_id=UUID(current_user["id"]),
        property_id=property_id
    )
    
    return {"message": result["message"]}


@router.get("/saved", response_model=SavedPropertiesListResponse)
async def list_saved_properties(
    page: int = 1,
    per_page: int = 12,
    current_user: dict = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get user's saved properties.
    
    Requires authentication.
    Returns properties ordered by most recently saved.
    """
    service = SavedPropertiesService(db_pool)
    result = await service.get_saved_properties(
        user_id=UUID(current_user["id"]),
        page=page,
        per_page=per_page
    )
    
    return SavedPropertiesListResponse(
        properties=[SavedPropertyResponse(**p) for p in result["properties"]],
        pagination=PaginationResponse(**result["pagination"])
    )


@router.get("/{property_id}/is-saved")
async def check_if_saved(
    property_id: UUID,
    current_user: dict = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Check if property is saved by current user.
    
    Useful for UI to show correct saved/unsaved icon.
    """
    service = SavedPropertiesService(db_pool)
    is_saved = await service.is_property_saved(
        user_id=UUID(current_user["id"]),
        property_id=property_id
    )
    
    return {"is_saved": is_saved}
