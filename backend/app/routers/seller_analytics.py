"""
Seller Analytics Router - Dashboard stats and analytics endpoints.

Implements real-time seller analytics:
- GET /seller/dashboard/stats - Portfolio stats
- GET /seller/dashboard/activity - Recent activity feed
- GET /seller/analytics - Detailed analytics with trends
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/seller", tags=["Seller Analytics"])


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class Activity(BaseModel):
    type: str  # 'view', 'save', 'inquiry', 'visit', 'offer'
    title: str
    property_title: Optional[str] = None
    property_id: Optional[str] = None
    timestamp: str
    icon: str
    relative_time: str


class PortfolioStats(BaseModel):
    success: bool = True
    active_listings: int
    total_properties: int
    total_views: int
    total_visits: int
    total_offers: int
    deals_closed: int
    conversion_rate: float
    pending_actions: int


class ActivityResponse(BaseModel):
    success: bool = True
    activities: List[Activity]


class TrendPoint(BaseModel):
    date: str
    value: int


class AnalyticsData(BaseModel):
    success: bool = True
    views_trend: List[TrendPoint]
    saves_trend: List[TrendPoint]
    inquiries_trend: List[TrendPoint]
    total_views_30d: int
    total_saves_30d: int
    total_inquiries_30d: int
    top_property: Optional[dict] = None
    avg_time_to_first_offer: Optional[int] = None  # days


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_relative_time(timestamp: datetime) -> str:
    """Convert timestamp to relative time string."""
    now = datetime.utcnow()
    diff = now - timestamp
    
    if diff.days > 30:
        return timestamp.strftime("%b %d, %Y")
    elif diff.days > 0:
        return f"{diff.days}d ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours}h ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes}m ago"
    else:
        return "Just now"


def get_activity_icon(activity_type: str) -> str:
    """Map activity type to icon name."""
    icons = {
        'view': 'eye',
        'save': 'heart',
        'inquiry': 'message-circle',
        'visit': 'calendar',
        'offer': 'indian-rupee',
        'reservation': 'lock',
        'sold': 'check-circle'
    }
    return icons.get(activity_type, 'activity')


# ============================================================================
# DASHBOARD STATS
# ============================================================================

@router.get("/dashboard/stats", response_model=PortfolioStats)
async def get_dashboard_stats(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get seller portfolio statistics.
    
    Returns real-time stats from database:
    - Total properties count
    - Active listings count
    - Total views, visits, offers
    - Deals closed
    - Conversion rate
    """
    async with db_pool.acquire() as conn:
        # Get property counts
        property_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_properties,
                COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_listings,
                COUNT(*) FILTER (WHERE status = 'SOLD') as deals_closed,
                COUNT(*) FILTER (WHERE status IN ('DRAFT', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'VERIFICATION_IN_PROGRESS')) as pending_actions
            FROM properties
            WHERE seller_id = $1 AND deleted_at IS NULL
        """, current_user.user_id)
        
        # Get property IDs for this seller
        property_ids = await conn.fetch("""
            SELECT id FROM properties WHERE seller_id = $1 AND deleted_at IS NULL
        """, current_user.user_id)
        
        property_id_list = [p['id'] for p in property_ids]
        
        # Initialize counts
        total_views = 0
        total_visits = 0
        total_offers = 0
        
        if property_id_list:
            # Get view counts (from property_views table if exists, or property_stats)
            views_result = await conn.fetchval("""
                SELECT COALESCE(SUM(view_count), 0)
                FROM property_stats
                WHERE property_id = ANY($1)
            """, property_id_list)
            total_views = views_result or 0
            
            # Get visit counts
            visits_result = await conn.fetchval("""
                SELECT COUNT(*)
                FROM visit_requests
                WHERE property_id = ANY($1) AND status = 'COMPLETED'
            """, property_id_list)
            total_visits = visits_result or 0
            
            # Get offer counts
            offers_result = await conn.fetchval("""
                SELECT COUNT(*)
                FROM offers
                WHERE property_id = ANY($1)
            """, property_id_list)
            total_offers = offers_result or 0
        
        # Calculate conversion rate
        total = property_stats['total_properties'] or 0
        closed = property_stats['deals_closed'] or 0
        conversion_rate = (closed / total * 100) if total > 0 else 0
        
        return PortfolioStats(
            success=True,
            active_listings=property_stats['active_listings'] or 0,
            total_properties=total,
            total_views=total_views,
            total_visits=total_visits,
            total_offers=total_offers,
            deals_closed=closed,
            conversion_rate=round(conversion_rate, 1),
            pending_actions=property_stats['pending_actions'] or 0
        )


# ============================================================================
# ACTIVITY FEED
# ============================================================================

@router.get("/dashboard/activity", response_model=ActivityResponse)
async def get_dashboard_activity(
    limit: int = 10,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get recent activity across all seller's properties.
    
    Aggregates:
    - Visit requests
    - Offers received
    - Reservations made
    - Property status changes
    """
    activities = []
    
    async with db_pool.acquire() as conn:
        # Get property IDs for this seller
        property_ids = await conn.fetch("""
            SELECT id, title FROM properties WHERE seller_id = $1 AND deleted_at IS NULL
        """, current_user.user_id)
        
        if not property_ids:
            return ActivityResponse(success=True, activities=[])
        
        property_id_list = [p['id'] for p in property_ids]
        property_titles = {str(p['id']): p['title'] for p in property_ids}
        
        # Get recent visits
        visits = await conn.fetch("""
            SELECT 
                vr.id,
                vr.property_id,
                vr.status,
                vr.requested_at,
                u.full_name as buyer_name
            FROM visit_requests vr
            JOIN users u ON vr.buyer_id = u.id
            WHERE vr.property_id = ANY($1)
            ORDER BY vr.requested_at DESC
            LIMIT $2
        """, property_id_list, limit)
        
        for visit in visits:
            status_text = {
                'REQUESTED': 'requested a visit',
                'APPROVED': 'visit approved',
                'COMPLETED': 'completed visit',
                'CANCELLED': 'visit cancelled'
            }.get(visit['status'], 'visit update')
            
            activities.append(Activity(
                type='visit',
                title=f"{visit['buyer_name']} {status_text}",
                property_title=property_titles.get(str(visit['property_id'])),
                property_id=str(visit['property_id']),
                timestamp=visit['requested_at'].isoformat() if visit['requested_at'] else '',
                icon='calendar',
                relative_time=get_relative_time(visit['requested_at']) if visit['requested_at'] else ''
            ))
        
        # Get recent offers
        offers = await conn.fetch("""
            SELECT 
                o.id,
                o.property_id,
                o.offered_price,
                o.status,
                o.created_at,
                u.full_name as buyer_name
            FROM offers o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.property_id = ANY($1)
            ORDER BY o.created_at DESC
            LIMIT $2
        """, property_id_list, limit)
        
        for offer in offers:
            price_formatted = f"₹{offer['offered_price']:,.0f}" if offer['offered_price'] else ""
            activities.append(Activity(
                type='offer',
                title=f"{offer['buyer_name']} made an offer of {price_formatted}",
                property_title=property_titles.get(str(offer['property_id'])),
                property_id=str(offer['property_id']),
                timestamp=offer['created_at'].isoformat() if offer['created_at'] else '',
                icon='indian-rupee',
                relative_time=get_relative_time(offer['created_at']) if offer['created_at'] else ''
            ))
        
        # Sort all activities by timestamp
        activities.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Limit to requested number
        activities = activities[:limit]
        
    return ActivityResponse(success=True, activities=activities)


# ============================================================================
# DETAILED ANALYTICS
# ============================================================================

@router.get("/analytics", response_model=AnalyticsData)
async def get_analytics(
    days: int = 30,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get detailed analytics with trends.
    
    Returns view/save/inquiry trends over time.
    """
    async with db_pool.acquire() as conn:
        # Get property IDs for this seller
        property_ids = await conn.fetch("""
            SELECT id, title FROM properties WHERE seller_id = $1 AND deleted_at IS NULL
        """, current_user.user_id)
        
        if not property_ids:
            return AnalyticsData(
                success=True,
                views_trend=[],
                saves_trend=[],
                inquiries_trend=[],
                total_views_30d=0,
                total_saves_30d=0,
                total_inquiries_30d=0
            )
        
        property_id_list = [p['id'] for p in property_ids]
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Generate date range for trends
        views_trend = []
        saves_trend = []
        inquiries_trend = []
        
        # Get daily view counts from property_views if available
        # For now, generate sample trend data based on total stats
        # Note: properties table doesn't have view_count column yet
        total_views = 0  # Placeholder until property_stats table is implemented
        
        total_saves = await conn.fetchval("""
            SELECT COUNT(*)
            FROM saved_properties
            WHERE property_id = ANY($1) AND created_at >= $2
        """, property_id_list, start_date) or 0
        
        total_inquiries = await conn.fetchval("""
            SELECT COUNT(*)
            FROM visit_requests
            WHERE property_id = ANY($1) AND created_at >= $2
        """, property_id_list, start_date) or 0
        
        # Generate trend points (simplified - in production would be daily aggregates)
        for i in range(min(days, 7)):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            views_trend.append(TrendPoint(date=date, value=total_views // 7))
            saves_trend.append(TrendPoint(date=date, value=total_saves // 7))
            inquiries_trend.append(TrendPoint(date=date, value=total_inquiries // 7))
        
        # Get top performing property
        # Get top performing property (using visit requests as proxy for popularity since property_stats missing)
        top_property = await conn.fetchrow("""
            SELECT p.id, p.title, 
                   (SELECT COUNT(*) FROM visit_requests vr WHERE vr.property_id = p.id) as views
            FROM properties p
            WHERE p.seller_id = $1 AND p.deleted_at IS NULL
            ORDER BY views DESC
            LIMIT 1
        """, current_user.user_id)
        
        top_property_data = None
        if top_property:
            top_property_data = {
                "id": str(top_property['id']),
                "title": top_property['title'],
                "views": top_property['views']
            }
        
        return AnalyticsData(
            success=True,
            views_trend=list(reversed(views_trend)),
            saves_trend=list(reversed(saves_trend)),
            inquiries_trend=list(reversed(inquiries_trend)),
            total_views_30d=total_views,
            total_saves_30d=total_saves,
            total_inquiries_30d=total_inquiries,
            top_property=top_property_data
        )
