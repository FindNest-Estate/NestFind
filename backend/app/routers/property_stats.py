"""
Property Stats Router - Analytics and statistics endpoints.

Provides:
- View tracking
- Property statistics (days on market, price/sqft)
- Owner analytics dashboard
- Similar properties
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from ..services.property_stats_service import PropertyStatsService
from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_optional_user, get_current_user, AuthenticatedUser, require_role


router = APIRouter(tags=["Property Stats"])


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class OwnerStatsResponse(BaseModel):
    """Owner-only statistics."""
    saves_count: int
    pending_visits: int
    active_offers: int
    highest_offer: Optional[float]
    last_7_days_views: int
    inquiries_count: int


class PropertyStatsResponse(BaseModel):
    """Property statistics for detail page."""
    property_id: str
    days_on_market: int
    price_per_sqft: Optional[float]
    total_views: int
    is_owner: bool
    owner_stats: Optional[OwnerStatsResponse] = None


class RecordViewResponse(BaseModel):
    """Response for view recording."""
    success: bool
    counted: bool
    message: Optional[str] = None
    total_views: Optional[int] = None


class SimilarPropertyResponse(BaseModel):
    """Similar property card."""
    id: str
    title: Optional[str]
    type: Optional[str]
    price: Optional[float]
    city: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    thumbnail_url: Optional[str]


class SimilarPropertiesResponse(BaseModel):
    """List of similar properties."""
    success: bool
    properties: List[SimilarPropertyResponse]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/properties/{property_id}/view", response_model=RecordViewResponse)
async def record_property_view(
    property_id: UUID,
    request: Request,
    db_pool = Depends(get_db_pool),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user)
):
    """
    Record a property view.
    
    Called when property detail page loads.
    Deduplicates views by user/IP within 24 hours.
    Owner views are not counted.
    """
    service = PropertyStatsService(db_pool)
    
    # Get client IP
    ip_address = request.client.host if request.client else None
    viewer_id = current_user.user_id if current_user else None
    
    result = await service.record_view(
        property_id=property_id,
        viewer_id=viewer_id,
        ip_address=ip_address
    )
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to record view"))
    
    return RecordViewResponse(
        success=True,
        counted=result.get("counted", False),
        message=result.get("message"),
        total_views=result.get("total_views")
    )


@router.get("/properties/{property_id}/stats", response_model=PropertyStatsResponse)
async def get_property_stats(
    property_id: UUID,
    db_pool = Depends(get_db_pool),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user)
):
    """
    Get property statistics.
    
    Public stats:
    - days_on_market
    - price_per_sqft
    - total_views
    
    Owner-only stats (when authenticated as owner):
    - saves_count
    - pending_visits
    - active_offers
    - highest_offer
    - last_7_days_views
    - inquiries_count
    """
    service = PropertyStatsService(db_pool)
    
    viewer_id = current_user.user_id if current_user else None
    result = await service.get_property_stats(property_id, viewer_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to get stats"))
    
    owner_stats = None
    if result.get("owner_stats"):
        owner_stats = OwnerStatsResponse(**result["owner_stats"])
    
    return PropertyStatsResponse(
        property_id=result["property_id"],
        days_on_market=result["days_on_market"],
        price_per_sqft=result["price_per_sqft"],
        total_views=result["total_views"],
        is_owner=result["is_owner"],
        owner_stats=owner_stats
    )


@router.get("/properties/{property_id}/similar", response_model=SimilarPropertiesResponse)
async def get_similar_properties(
    property_id: UUID,
    limit: int = 6,
    db_pool = Depends(get_db_pool)
):
    """
    Get similar properties.
    
    Returns properties in same city with similar price range.
    Used for "You might also like" section.
    """
    service = PropertyStatsService(db_pool)
    result = await service.get_similar_properties(property_id, limit=min(limit, 12))
    
    if not result["success"]:
        # Return empty list instead of error for UI friendliness
        return SimilarPropertiesResponse(success=True, properties=[])
    
    return SimilarPropertiesResponse(
        success=True,
        properties=[SimilarPropertyResponse(**p) for p in result["properties"]]
    )


# ============================================================================
# NEW ENDPOINTS FOR ADVANCED DASHBOARD
# ============================================================================

class WeeklyViewStats(BaseModel):
    date: str
    day_name: str
    views: int

class WeeklyViewsResponse(BaseModel):
    success: bool
    property_id: str
    weekly_views: List[WeeklyViewStats]
    total: int

class ActivityItem(BaseModel):
    type: str
    title: str
    timestamp: str
    icon: str
    relative_time: Optional[str] = None
    actor: Optional[str] = None

class RecentActivityResponse(BaseModel):
    success: bool
    property_id: str
    activities: List[ActivityItem]


class SellerPortfolioStats(BaseModel):
    success: bool
    active_listings: int
    total_properties: int
    total_views: int
    total_visits: int
    deals_closed: int
    conversion_rate: float


@router.get("/properties/{property_id}/weekly-views", response_model=WeeklyViewsResponse)
async def get_weekly_views(
    property_id: UUID,
    db_pool = Depends(get_db_pool),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get daily view counts for the last 7 days.
    Owner only.
    """
    service = PropertyStatsService(db_pool)
    result = await service.get_weekly_views(property_id, current_user.user_id)
    
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result.get("error", "Failed to get weekly views"))
    
    return WeeklyViewsResponse(**result)


@router.get("/properties/{property_id}/activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    property_id: UUID,
    limit: int = 10,
    db_pool = Depends(get_db_pool),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get recent activity timeline (views, saves, inquiries, visits).
    Owner only.
    """
    service = PropertyStatsService(db_pool)
    result = await service.get_recent_activity(property_id, current_user.user_id, limit)
    
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result.get("error", "Failed to get activity"))
    
    return RecentActivityResponse(**result)


@router.get("/agent/portfolio-stats", response_model=SellerPortfolioStats)
async def get_agent_portfolio_stats(
    db_pool = Depends(get_db_pool),
    current_user: AuthenticatedUser = Depends(require_role("AGENT"))
):
    """
    Get aggregated statistics for the logged-in agent.
    """
    from ..middleware.auth_middleware import require_role  # runtime import to avoid circular
    
    service = PropertyStatsService(db_pool)
    result = await service.get_seller_portfolio_performance(current_user.user_id)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to calculate portfolio stats")
        
    return SellerPortfolioStats(**result)


@router.get("/seller/dashboard/stats", response_model=SellerPortfolioStats)
async def get_seller_dashboard_stats(
    db_pool = Depends(get_db_pool),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get aggregated statistics for the logged-in seller.
    """
    service = PropertyStatsService(db_pool)
    result = await service.get_seller_portfolio_performance(current_user.user_id)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to calculate dashboard stats")
        
    return SellerPortfolioStats(**result)


class GlobalActivityResponse(BaseModel):
    success: bool
    activities: List[ActivityItem]


@router.get("/seller/dashboard/activity", response_model=GlobalActivityResponse)
async def get_seller_dashboard_activity(
    limit: int = 10,
    db_pool = Depends(get_db_pool),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get recent activity across ALL seller's properties.
    """
    service = PropertyStatsService(db_pool)
    result = await service.get_seller_global_activity(current_user.user_id, limit)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to fetch activity")
        
    return GlobalActivityResponse(**result)
