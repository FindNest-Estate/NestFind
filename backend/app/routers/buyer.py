from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.core.database import get_db_pool
from app.middleware.auth_middleware import get_current_user, AuthenticatedUser, require_role, require_any_role
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter()

@router.get("/buyer/dashboard", tags=["buyer"])
async def get_buyer_dashboard(
    current_user: AuthenticatedUser = Depends(require_any_role("BUYER", "USER")),
    db_pool = Depends(get_db_pool)
):
    """
    Get aggregated dashboard data for buyer.
    """
    user_id = current_user.user_id
    
    try:
        async with db_pool.acquire() as conn:
            # 1. Get Stats (Concurrent-ish in SQL)
            stats_query = """
                SELECT
                    (SELECT COUNT(*) FROM offers WHERE buyer_id = $1 AND status IN ('PENDING', 'COUNTERED', 'ACCEPTED')) as active_offers,
                    (SELECT COUNT(*) FROM visit_requests WHERE buyer_id = $1 AND status IN ('REQUESTED', 'APPROVED')) as upcoming_visits,
                    (SELECT COUNT(*) FROM saved_properties WHERE user_id = $1) as saved_properties,
                    -- Mock unread messages for now
                    0 as unread_messages
            """
            stats = await conn.fetchrow(stats_query, user_id)
            
            # 2. Get Recent Activity & Actionable Items
            
            # Actionable Items: Countered Offers
            countered_offers = await conn.fetch("""
                SELECT 
                    o.id as target_id, 'offer' as type, 'ACTION_REQUIRED' as urgency,
                    'Counter Offer Received' as title,
                    'You have a pending counter-offer for ' || p.title as message,
                    '/offers/' || o.id as link, o.updated_at as created_at
                FROM offers o
                JOIN properties p ON o.property_id = p.id
                WHERE o.buyer_id = $1 AND o.status = 'COUNTERED'
            """, user_id)

            # Actionable Items: Urgent Visits (Next 24 Hours)
            urgent_visits = await conn.fetch("""
                SELECT 
                    vr.id as target_id, 'visit' as type, 'ACTION_REQUIRED' as urgency,
                    'Upcoming Tour Today' as title,
                    'You have a property tour scheduled for ' || p.title as message,
                    '/visits/' || vr.id as link, vr.preferred_date as created_at
                FROM visit_requests vr
                JOIN properties p ON vr.property_id = p.id
                WHERE vr.buyer_id = $1 AND vr.status = 'APPROVED'
                  AND vr.preferred_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
            """, user_id)
            
            # Recent Visits (For Timeline)
            visits = await conn.fetch("""
                SELECT 
                    vr.id, vr.status, vr.preferred_date as action_date, p.title as property_title, 
                    p.city as property_city, 'visit' as type, vr.updated_at,
                    (SELECT file_url FROM property_media pm WHERE pm.property_id = p.id AND pm.is_primary = TRUE LIMIT 1) as thumbnail
                FROM visit_requests vr
                JOIN properties p ON vr.property_id = p.id
                WHERE vr.buyer_id = $1
                ORDER BY vr.updated_at DESC
                LIMIT 5
            """, user_id)
            
            # Recent Offers (For Timeline)
            offers = await conn.fetch("""
                SELECT 
                    o.id, o.status, o.offered_price as amount, p.title as property_title, 
                    p.city as property_city, 'offer' as type, o.updated_at as action_date, o.updated_at,
                    (SELECT file_url FROM property_media pm WHERE pm.property_id = p.id AND pm.is_primary = TRUE LIMIT 1) as thumbnail
                FROM offers o
                JOIN properties p ON o.property_id = p.id
                WHERE o.buyer_id = $1
                ORDER BY o.updated_at DESC
                LIMIT 5
            """, user_id)
            
            # Combine and sort activity by updated_at
            all_activity = list(visits) + list(offers)
            all_activity.sort(key=lambda x: x['updated_at'], reverse=True)
            
            # 3. Recommended Properties
            recommended = await conn.fetch("""
                SELECT 
                    p.id, p.title, p.price, p.city, p.bedrooms, p.bathrooms, p.area_sqft,
                    (SELECT file_url FROM property_media pm WHERE pm.property_id = p.id AND pm.is_primary = TRUE LIMIT 1) as thumbnail
                FROM properties p
                WHERE p.status = 'ACTIVE'
                ORDER BY RANDOM()
                LIMIT 4
            """)
            
            return {
                "success": True,
                "stats": {
                    "active_offers": stats["active_offers"],
                    "upcoming_visits": stats["upcoming_visits"],
                    "saved_properties": stats["saved_properties"],
                    "unread_messages": stats["unread_messages"]
                },
                "action_required": [
                    {
                        "id": str(r["target_id"]),
                        "type": r["type"],
                        "urgency": r["urgency"],
                        "title": r["title"],
                        "message": r["message"],
                        "link": r["link"],
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None
                    } for r in (countered_offers + urgent_visits)
                ],
                "recent_activity": [
                    {
                        "id": str(r["id"]),
                        "type": r["type"],
                        "title": r["property_title"],
                        "location": r["property_city"],
                        "status": r["status"],
                        "amount": float(r["amount"]) if r["type"] == 'offer' else None,
                        "date": r["action_date"].isoformat() if r["action_date"] else None,
                        "image": r["thumbnail"] or ""
                    } for r in all_activity[:10]
                ],
                "recommended": [
                    {
                        "id": str(r["id"]),
                        "title": r["title"],
                        "price": float(r["price"]),
                        "location": r["city"],
                        "specs": f"{r['bedrooms']} bds | {r['bathrooms']} ba | {r['area_sqft']} sqft",
                        "image": r["thumbnail"] or ""
                    } for r in recommended
                ]
            }

    except Exception as e:
        print(f"Error fetching buyer dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard data")


@router.get("/buyer/market-insights", tags=["buyer"])
async def get_market_insights(
    current_user: AuthenticatedUser = Depends(require_any_role("BUYER", "USER")),
    db_pool = Depends(get_db_pool)
):
    """
    Get aggregated market insights based on active listings.
    """
    try:
        async with db_pool.acquire() as conn:
            # Aggregate stats for ALL active properties
            # In a real app, this would be filtered by user's search preferences/location
            stats = await conn.fetchrow("""
                WITH current_stats AS (
                    SELECT 
                        count(*) as active_count,
                        avg(price) as avg_price,
                        avg(EXTRACT(DAY FROM NOW() - created_at)) as avg_days
                    FROM properties 
                    WHERE status = 'ACTIVE'
                ),
                past_stats AS (
                    -- Compare with properties created > 30 days ago to simulate trend
                    SELECT avg(price) as old_avg_price
                    FROM properties 
                    WHERE status = 'ACTIVE' 
                    AND created_at < NOW() - INTERVAL '30 days'
                )
                SELECT 
                    c.active_count,
                    COALESCE(c.avg_price, 0) as avg_price,
                    COALESCE(c.avg_days, 0) as avg_days,
                    p.old_avg_price
                FROM current_stats c
                CROSS JOIN past_stats p
            """)
            
            avg_price = float(stats['avg_price'])
            old_avg_price = float(stats['old_avg_price'] or avg_price) # Fallback if no old data
            
            # Avoid division by zero
            if old_avg_price > 0:
                price_trend = ((avg_price - old_avg_price) / old_avg_price) * 100
            else:
                price_trend = 0.0

            return {
                "success": True,
                "data": {
                    "average_price": avg_price,
                    "price_trend": round(price_trend, 1),
                    "days_on_market": int(stats['avg_days']),
                    "inventory_count": stats['active_count'],
                    "active_listings": stats['active_count']
                }
            }

    except Exception as e:
        print(f"Error fetching market insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to load market insights")
