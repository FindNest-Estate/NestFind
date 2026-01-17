"""
Public Properties Router - Public browsing endpoints.

No authentication required for these endpoints.
Only ACTIVE properties are visible to public.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from typing import List

from ..services.property_service import PropertyService
from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_optional_user, AuthenticatedUser


router = APIRouter(tags=["Public Properties"])


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class PropertyCardResponse(BaseModel):
    """Property card for browse grid."""
    id: str
    title: Optional[str]
    type: Optional[str]
    price: Optional[float]
    city: Optional[str]
    state: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    latitude: Optional[float]
    longitude: Optional[float]
    thumbnail_url: Optional[str]
    agent_name: Optional[str]
    created_at: str


class PaginationResponse(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_more: bool


class BrowsePropertiesResponse(BaseModel):
    """Response for property browse endpoint."""
    properties: List[PropertyCardResponse]
    pagination: PaginationResponse


class AgentContactResponse(BaseModel):
    """Agent contact info for public display."""
    id: str
    name: str
    email: str


class PropertyMediaResponse(BaseModel):
    """Media item for property detail."""
    id: str
    media_type: str
    file_url: str
    display_order: int
    is_primary: bool


class ViewerContext(BaseModel):
    """Context about the viewing user (if authenticated)."""
    is_owner: bool
    is_agent: bool  # The assigned agent for this property
    visit_id: Optional[str] = None  # Existing visit request ID if any


class PropertyHighlightsResponse(BaseModel):
    """Property highlights/amenities."""
    facing: Optional[str]
    floor_number: Optional[int]
    total_floors: Optional[int]
    furnishing: Optional[str]
    possession_date: Optional[str]
    property_age: Optional[int]
    parking_spaces: Optional[int]
    balconies: Optional[int]


class PriceHistoryItem(BaseModel):
    """Price history point."""
    price: float
    date: str


class PropertyDetailResponse(BaseModel):
    """Full property detail for public view."""
    id: str
    title: Optional[str]
    description: Optional[str]
    type: Optional[str]
    price: Optional[float]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    agent: Optional[AgentContactResponse]
    media: List[PropertyMediaResponse]
    highlights: Optional[PropertyHighlightsResponse] = None
    price_history: List[PriceHistoryItem] = []
    viewer: Optional[ViewerContext] = None  # Only populated if user is authenticated
    created_at: str
    updated_at: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/properties/browse", response_model=BrowsePropertiesResponse)
async def browse_properties(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page"),
    city: Optional[str] = Query(None, description="Filter by city"),
    type: Optional[str] = Query(None, description="Filter by property type (LAND, HOUSE, APARTMENT, COMMERCIAL)"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    bedrooms: Optional[int] = Query(None, ge=0, description="Minimum bedrooms"),
    bathrooms: Optional[int] = Query(None, ge=0, description="Minimum bathrooms"),
    min_area: Optional[float] = Query(None, ge=0, description="Minimum area in sqft"),
    max_area: Optional[float] = Query(None, ge=0, description="Maximum area in sqft"),
    keyword: Optional[str] = Query(None, description="Search in title, description, address"),
    sort_by: Optional[str] = Query(None, description="Sort by: price_asc, price_desc, newest, area_desc, area_asc"),
    db_pool = Depends(get_db_pool)
):
    """
    Browse ACTIVE properties with advanced filters.
    
    Public endpoint - no authentication required.
    Only shows verified, live properties.
    
    Available filters:
    - city: Partial match on city name
    - type: LAND, HOUSE, APARTMENT, COMMERCIAL
    - min_price/max_price: Price range
    - bedrooms/bathrooms: Minimum count
    - min_area/max_area: Area range in sqft
    - keyword: Free text search
    - sort_by: price_asc, price_desc, newest (default), area_desc, area_asc
    """
    service = PropertyService(db_pool)
    result = await service.get_public_properties(
        page=page,
        per_page=per_page,
        city=city,
        property_type=type,
        min_price=min_price,
        max_price=max_price,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        min_area=min_area,
        max_area=max_area,
        keyword=keyword,
        sort_by=sort_by
    )
    
    return BrowsePropertiesResponse(
        properties=[PropertyCardResponse(**p) for p in result["properties"]],
        pagination=PaginationResponse(**result["pagination"])
    )


@router.get("/properties/{property_id}/public", response_model=PropertyDetailResponse)
async def get_property_detail(
    property_id: UUID,
    db_pool = Depends(get_db_pool),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user)
):
    """
    Get property detail for public view.
    
    Public endpoint - no authentication required.
    Only ACTIVE properties are viewable.
    
    If user is authenticated, includes viewer context with is_owner and is_agent flags.
    """
    service = PropertyService(db_pool)
    
    # Pass viewer_id if authenticated for ownership/agent checks
    viewer_id = current_user.user_id if current_user else None
    result = await service.get_public_property_by_id(property_id, viewer_id=viewer_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error", "Failed to get property")
        )
    
    prop = result["property"]
    
    # Build viewer context if authenticated and viewer data exists
    viewer_context = None
    if current_user and prop.get("viewer"):
        viewer_context = ViewerContext(
            is_owner=prop["viewer"]["is_owner"],
            is_agent=prop["viewer"]["is_agent"],
            visit_id=prop["viewer"].get("visit_id")
        )
    
    return PropertyDetailResponse(
        id=prop["id"],
        title=prop["title"],
        description=prop["description"],
        type=prop["type"],
        price=prop["price"],
        city=prop["city"],
        state=prop["state"],
        pincode=prop["pincode"],
        address=prop["address"],
        latitude=prop["latitude"],
        longitude=prop["longitude"],
        bedrooms=prop["bedrooms"],
        bathrooms=prop["bathrooms"],
        area_sqft=prop["area_sqft"],
        agent=AgentContactResponse(**prop["agent"]) if prop["agent"] else None,
        media=[PropertyMediaResponse(**m) for m in prop["media"]],
        highlights=PropertyHighlightsResponse(**prop["highlights"]) if prop.get("highlights") else None,
        price_history=[PriceHistoryItem(**ph) for ph in prop.get("price_history", [])],
        viewer=viewer_context,
        created_at=prop["created_at"],
        updated_at=prop["updated_at"]
    )
