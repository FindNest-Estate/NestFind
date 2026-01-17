"""
Public Agents Router - Agent discovery endpoints.

No authentication required for these endpoints.
Only shows ACTIVE and VERIFIED agents.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from ..services.public_agents_service import PublicAgentsService
from ..core.database import get_db_pool


router = APIRouter(prefix="/agents/public", tags=["Public Agents"])


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class AgentCardResponse(BaseModel):
    """Agent card for browse grid."""
    id: str
    name: str
    email: str
    latitude: float
    longitude: float
    service_radius_km: int
    rating: float
    completed_cases: int
    joined_date: str
    distance_km: Optional[float] = None  # Only for nearby search


class PaginationResponse(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_more: bool


class BrowseAgentsResponse(BaseModel):
    """Response for agent browse endpoint."""
    agents: List[AgentCardResponse]
    pagination: PaginationResponse
    search_location: Optional[dict] = None  # For nearby searches


class AgentProfileResponse(BaseModel):
    """Full agent profile for public view."""
    id: str
    name: str
    email: str
    latitude: float
    longitude: float
    service_radius_km: int
    rating: float
    completed_transactions: int
    active_listings: int
    joined_date: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/browse", response_model=BrowseAgentsResponse)
async def browse_agents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page"),
    city: Optional[str] = Query(None, description="Filter by city"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating"),
    db_pool = Depends(get_db_pool)
):
    """
    Browse active and verified agents.
    
    Public endpoint - no authentication required.
    Only shows agents with status=ACTIVE, kyc_status=VERIFIED, is_active=true.
    """
    service = PublicAgentsService(db_pool)
    result = await service.get_public_agents(
        page=page,
        per_page=per_page,
        city=city,
        min_rating=min_rating
    )
    
    return BrowseAgentsResponse(
        agents=[AgentCardResponse(**a) for a in result["agents"]],
        pagination=PaginationResponse(**result["pagination"])
    )


@router.get("/nearby", response_model=BrowseAgentsResponse)
async def get_nearby_agents(
    latitude: float = Query(..., description="Search latitude"),
    longitude: float = Query(..., description="Search longitude"),
    radius_km: int = Query(50, ge=1, le=200, description="Search radius in km"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page"),
    db_pool = Depends(get_db_pool)
):
    """
    Find agents within specified radius.
    
    Uses Haversine formula for distance calculation.
    Results sorted by distance (closest first), then by rating.
    
    Public endpoint - no authentication required.
    """
    service = PublicAgentsService(db_pool)
    result = await service.get_nearby_agents(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        per_page=per_page
    )
    
    return BrowseAgentsResponse(
        agents=[AgentCardResponse(**a) for a in result["agents"]],
        pagination=PaginationResponse(**result["pagination"]),
        search_location=result.get("search_location")
    )


@router.get("/{agent_id}", response_model=AgentProfileResponse)
async def get_agent_profile(
    agent_id: UUID,
    db_pool = Depends(get_db_pool)
):
    """
    Get agent public profile.
    
    Public endpoint - no authentication required.
    Only returns profile if agent is ACTIVE and VERIFIED.
    """
    service = PublicAgentsService(db_pool)
    result = await service.get_agent_public_profile(agent_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error", "Failed to get agent profile")
        )
    
    return AgentProfileResponse(**result["agent"])
