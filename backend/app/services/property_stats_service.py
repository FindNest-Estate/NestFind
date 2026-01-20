"""
Property Statistics Service

Handles property analytics and statistics for both buyers and sellers:
- View tracking
- Days on market calculation
- Price insights
- Engagement metrics (saves, inquiries)
- Visit/offer summaries for owners
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID
import asyncpg


class PropertyStatsService:
    """
    Service for property statistics and analytics.
    
    Provides:
    - View tracking (increment on page load)
    - Days on market calculation
    - Aggregate stats for property detail page
    - Owner dashboard stats
    """
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    async def record_view(
        self,
        property_id: UUID,
        viewer_id: Optional[UUID] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a property view.
        
        Deduplicates by viewer_id or IP within 24 hours.
        Returns updated view count.
        """
        async with self.db.acquire() as conn:
            # Check if property exists and is active
            prop = await conn.fetchrow("""
                SELECT id, seller_id FROM properties 
                WHERE id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found"}
            
            # Don't count owner's own views
            if viewer_id and prop['seller_id'] == viewer_id:
                return {"success": True, "counted": False, "message": "Owner view not counted"}
            
            # Check for duplicate view in last 24 hours
            twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
            
            existing_view = None
            if viewer_id:
                existing_view = await conn.fetchrow("""
                    SELECT id FROM property_views 
                    WHERE property_id = $1 AND viewer_id = $2 AND viewed_at > $3
                """, property_id, viewer_id, twenty_four_hours_ago)
            elif ip_address:
                existing_view = await conn.fetchrow("""
                    SELECT id FROM property_views 
                    WHERE property_id = $1 AND ip_address = $2 AND viewed_at > $3
                """, property_id, ip_address, twenty_four_hours_ago)
            
            if existing_view:
                return {"success": True, "counted": False, "message": "Duplicate view"}
            
            # Record the view
            await conn.execute("""
                INSERT INTO property_views (property_id, viewer_id, ip_address, viewed_at)
                VALUES ($1, $2, $3, $4)
            """, property_id, viewer_id, ip_address, datetime.now(timezone.utc))
            
            # Get updated count
            total_views = await conn.fetchval("""
                SELECT COUNT(*) FROM property_views WHERE property_id = $1
            """, property_id)
            
            return {"success": True, "counted": True, "total_views": total_views}
    
    async def get_property_stats(
        self,
        property_id: UUID,
        viewer_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get property statistics for display on detail page.
        
        For all users:
        - days_on_market
        - price_per_sqft
        - total_views (public)
        
        For owner only:
        - saves_count
        - inquiries_count
        - pending_visits
        - active_offers
        - last_7_days_views
        """
        async with self.db.acquire() as conn:
            # Get property details
            prop = await conn.fetchrow("""
                SELECT id, seller_id, price, area_sqft, created_at, status
                FROM properties 
                WHERE id = $1 AND deleted_at IS NULL
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found"}
            
            is_owner = viewer_id and prop['seller_id'] == viewer_id
            
            # Calculate days on market (from creation or first ACTIVE date)
            days_on_market = (datetime.now(timezone.utc) - prop['created_at'].replace(tzinfo=timezone.utc)).days
            
            # Calculate price per sqft
            price_per_sqft = None
            if prop['price'] and prop['area_sqft'] and prop['area_sqft'] > 0:
                price_per_sqft = round(float(prop['price']) / float(prop['area_sqft']), 2)
            
            # Get total views
            total_views = await conn.fetchval("""
                SELECT COUNT(*) FROM property_views WHERE property_id = $1
            """, property_id)
            
            stats = {
                "success": True,
                "property_id": str(property_id),
                "days_on_market": max(0, days_on_market),
                "price_per_sqft": price_per_sqft,
                "total_views": total_views or 0,
                "is_owner": is_owner
            }
            
            # Owner-only stats
            if is_owner:
                # Saves count
                saves_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM saved_properties WHERE property_id = $1
                """, property_id)
                
                # Pending visits
                pending_visits = await conn.fetchval("""
                    SELECT COUNT(*) FROM visit_requests 
                    WHERE property_id = $1 AND status IN ('REQUESTED', 'APPROVED')
                """, property_id)
                
                # Active offers
                active_offers = await conn.fetchval("""
                    SELECT COUNT(*) FROM offers 
                    WHERE property_id = $1 AND status IN ('PENDING', 'COUNTERED')
                """, property_id)
                
                # Highest offer
                highest_offer = await conn.fetchval("""
                    SELECT MAX(offered_price) FROM offers 
                    WHERE property_id = $1 AND status IN ('PENDING', 'COUNTERED', 'ACCEPTED')
                """, property_id)
                
                # Last 7 days views
                seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
                last_7_days_views = await conn.fetchval("""
                    SELECT COUNT(*) FROM property_views 
                    WHERE property_id = $1 AND viewed_at > $2
                """, property_id, seven_days_ago)
                
                # Inquiries (conversations started)
                inquiries_count = await conn.fetchval("""
                    SELECT COUNT(DISTINCT c.id) FROM conversations c
                    JOIN users u ON c.buyer_id = u.id
                    WHERE c.property_id = $1
                """, property_id)
                
                stats["owner_stats"] = {
                    "saves_count": saves_count or 0,
                    "pending_visits": pending_visits or 0,
                    "active_offers": active_offers or 0,
                    "highest_offer": float(highest_offer) if highest_offer else None,
                    "last_7_days_views": last_7_days_views or 0,
                    "inquiries_count": inquiries_count or 0
                }
            
            return stats
    
    async def get_similar_properties(
        self,
        property_id: UUID,
        limit: int = 6
    ) -> Dict[str, Any]:
        """
        Get similar properties based on:
        - Same city
        - Similar price range (±30%)
        - Same property type (if available)
        """
        async with self.db.acquire() as conn:
            # Get reference property
            prop = await conn.fetchrow("""
                SELECT city, price, type FROM properties 
                WHERE id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found", "properties": []}
            
            # Build similar properties query
            min_price = float(prop['price']) * 0.7 if prop['price'] else 0
            max_price = float(prop['price']) * 1.3 if prop['price'] else float('inf')
            
            similar = await conn.fetch("""
                SELECT 
                    p.id,
                    p.title,
                    p.type,
                    p.price,
                    p.city,
                    p.bedrooms,
                    p.bathrooms,
                    p.area_sqft,
                    (SELECT pm.file_url FROM property_media pm 
                     WHERE pm.property_id = p.id AND pm.is_primary = true 
                     LIMIT 1) as thumbnail_url
                FROM properties p
                WHERE p.id != $1
                  AND p.status = 'ACTIVE'
                  AND p.deleted_at IS NULL
                  AND (p.city = $2 OR $2 IS NULL)
                  AND (p.price BETWEEN $3 AND $4 OR p.price IS NULL)
                  AND (p.type = $5 OR $5 IS NULL)
                ORDER BY 
                    CASE WHEN p.city = $2 THEN 0 ELSE 1 END,
                    CASE WHEN p.type = $5 THEN 0 ELSE 1 END,
                    ABS(COALESCE(p.price, 0) - COALESCE($6, 0))
                LIMIT $7
            """, property_id, prop['city'], min_price, max_price, 
                prop['type'], prop['price'], limit)
            
            properties = []
            for row in similar:
                properties.append({
                    "id": str(row['id']),
                    "title": row['title'],
                    "type": row['type'],
                    "price": float(row['price']) if row['price'] else None,
                    "city": row['city'],
                    "bedrooms": row['bedrooms'],
                    "bathrooms": row['bathrooms'],
                    "area_sqft": float(row['area_sqft']) if row['area_sqft'] else None,
                    "thumbnail_url": row['thumbnail_url']
                })
            
            return {"success": True, "properties": properties}
    
    async def get_weekly_views(
        self,
        property_id: UUID,
        viewer_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get daily view counts for the last 7 days.
        Returns array of view counts per day (Mon-Sun aligned).
        Only accessible by property owner.
        """
        async with self.db.acquire() as conn:
            # Verify ownership
            prop = await conn.fetchrow("""
                SELECT id, seller_id FROM properties 
                WHERE id = $1 AND deleted_at IS NULL
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found"}
            
            if not viewer_id or prop['seller_id'] != viewer_id:
                return {"success": False, "error": "Not authorized"}
            
            # Get daily views for last 7 days
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            
            daily_views = await conn.fetch("""
                SELECT 
                    DATE(viewed_at) as view_date,
                    COUNT(*) as view_count
                FROM property_views 
                WHERE property_id = $1 AND viewed_at > $2
                GROUP BY DATE(viewed_at)
                ORDER BY view_date
            """, property_id, seven_days_ago)
            
            # Build array for last 7 days
            result = []
            for i in range(7):
                day = (datetime.now(timezone.utc) - timedelta(days=6-i)).date()
                count = 0
                for row in daily_views:
                    if row['view_date'] == day:
                        count = row['view_count']
                        break
                result.append({
                    "date": str(day),
                    "day_name": day.strftime('%a'),
                    "views": count
                })
            
            return {
                "success": True,
                "property_id": str(property_id),
                "weekly_views": result,
                "total": sum(item['views'] for item in result)
            }
    
    async def get_recent_activity(
        self,
        property_id: UUID,
        viewer_id: Optional[UUID] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get recent activity on a property (owner only).
        Combines views, saves, inquiries, and visits into a unified timeline.
        """
        async with self.db.acquire() as conn:
            # Verify ownership
            prop = await conn.fetchrow("""
                SELECT id, seller_id FROM properties 
                WHERE id = $1 AND deleted_at IS NULL
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found"}
            
            if not viewer_id or prop['seller_id'] != viewer_id:
                return {"success": False, "error": "Not authorized"}
            
            activities = []
            
            # Get recent views
            views = await conn.fetch("""
                SELECT 
                    pv.viewed_at as timestamp,
                    'view' as type,
                    COALESCE(u.email, 'Anonymous') as actor
                FROM property_views pv
                LEFT JOIN users u ON pv.viewer_id = u.id
                WHERE pv.property_id = $1
                ORDER BY pv.viewed_at DESC
                LIMIT $2
            """, property_id, limit)
            
            for v in views:
                activities.append({
                    "type": "view",
                    "title": "Property viewed" + (f" by {v['actor'][:20]}..." if v['actor'] != 'Anonymous' else ""),
                    "timestamp": v['timestamp'].isoformat(),
                    "icon": "eye"
                })
            
            # Get recent saves
            saves = await conn.fetch("""
                SELECT 
                    sp.created_at as timestamp,
                    u.email as actor
                FROM saved_properties sp
                JOIN users u ON sp.user_id = u.id
                WHERE sp.property_id = $1
                ORDER BY sp.created_at DESC
                LIMIT $2
            """, property_id, limit)
            
            for s in saves:
                activities.append({
                    "type": "save",
                    "title": f"Saved by a buyer",
                    "timestamp": s['timestamp'].isoformat(),
                    "icon": "bookmark"
                })
            
            # Get recent inquiries (conversations)
            inquiries = await conn.fetch("""
                SELECT 
                    c.created_at as timestamp,
                    u.email as actor
                FROM conversations c
                JOIN users u ON c.buyer_id = u.id
                WHERE c.property_id = $1
                ORDER BY c.created_at DESC
                LIMIT $2
            """, property_id, limit)
            
            for i in inquiries:
                activities.append({
                    "type": "inquiry",
                    "title": "New inquiry received",
                    "timestamp": i['timestamp'].isoformat(),
                    "icon": "message"
                })
            
            # Get recent visit requests
            visits = await conn.fetch("""
                SELECT 
                    vr.created_at as timestamp,
                    vr.status,
                    u.email as actor
                FROM visit_requests vr
                JOIN users u ON vr.buyer_id = u.id
                WHERE vr.property_id = $1
                ORDER BY vr.created_at DESC
                LIMIT $2
            """, property_id, limit)
            
            for v in visits:
                status_text = {
                    'REQUESTED': 'Visit requested',
                    'APPROVED': 'Visit approved',
                    'COMPLETED': 'Visit completed',
                    'CANCELLED': 'Visit cancelled'
                }.get(v['status'], 'Visit update')
                
                activities.append({
                    "type": "visit",
                    "title": status_text,
                    "timestamp": v['timestamp'].isoformat(),
                    "icon": "calendar"
                })
            
            # Get recent offers
            offers = await conn.fetch("""
                SELECT 
                    o.created_at as timestamp,
                    o.status,
                    o.offered_price,
                    u.email as actor
                FROM offers o
                JOIN users u ON o.buyer_id = u.id
                WHERE o.property_id = $1
                ORDER BY o.created_at DESC
                LIMIT $2
            """, property_id, limit)
            
            for o in offers:
                price_str = f"₹{o['offered_price']:,.0f}" if o['offered_price'] else ""
                status_text = {
                    'PENDING': f'New offer received {price_str}',
                    'ACCEPTED': f'Offer accepted {price_str}',
                    'REJECTED': 'Offer rejected',
                    'COUNTERED': 'Counter offer sent'
                }.get(o['status'], 'Offer update')
                
                activities.append({
                    "type": "offer",
                    "title": status_text,
                    "timestamp": o['timestamp'].isoformat(),
                    "icon": "file"
                })
            
            # Sort all activities by timestamp (newest first)
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            # Format relative time
            now = datetime.now(timezone.utc)
            for a in activities[:limit]:
                ts = datetime.fromisoformat(a['timestamp'].replace('Z', '+00:00'))
                # Ensure ts is timezone-aware
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                diff = now - ts
                if diff.days > 0:
                    a['relative_time'] = f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
                elif diff.seconds > 3600:
                    hours = diff.seconds // 3600
                    a['relative_time'] = f"{hours} hour{'s' if hours > 1 else ''} ago"
                elif diff.seconds > 60:
                    mins = diff.seconds // 60
                    a['relative_time'] = f"{mins} minute{'s' if mins > 1 else ''} ago"
                else:
                    a['relative_time'] = "Just now"
            
            return {
                "success": True,
                "property_id": str(property_id),
                "activities": activities[:limit]
            }

    async def get_seller_portfolio_performance(
        self,
        seller_id: UUID
    ) -> Dict[str, Any]:
        """
        Get aggregated performance stats for a seller's (or agent's) entire portfolio.
        """
        async with self.db.acquire() as conn:
            # 1. Active Listings
            active_listings = await conn.fetchval("""
                SELECT COUNT(*) FROM properties 
                WHERE seller_id = $1 AND status = 'ACTIVE'
            """, seller_id)

            # 2. Total Properties (active, sold, etc)
            total_properties = await conn.fetchval("""
                SELECT COUNT(*) FROM properties 
                WHERE seller_id = $1 AND deleted_at IS NULL
            """, seller_id)

            # 3. Total Views (across all properties)
            total_views = await conn.fetchval("""
                SELECT COUNT(*) FROM property_views pv
                JOIN properties p ON pv.property_id = p.id
                WHERE p.seller_id = $1
            """, seller_id)

            # 4. Total Visits (Requested/Approved)
            total_visits = await conn.fetchval("""
                SELECT COUNT(*) FROM visit_requests vr
                JOIN properties p ON vr.property_id = p.id
                WHERE p.seller_id = $1
            """, seller_id)

            # 5. Deals Closed (Transactions Completed)
            deals_closed = await conn.fetchval("""
                SELECT COUNT(*) FROM transactions t
                JOIN properties p ON t.property_id = p.id
                WHERE p.seller_id = $1 AND t.status = 'COMPLETED'
            """, seller_id)

            return {
                "success": True,
                "active_listings": active_listings or 0,
                "total_properties": total_properties or 0,
                "total_views": total_views or 0,
                "total_visits": total_visits or 0,
                "deals_closed": deals_closed or 0,
                "conversion_rate": round((deals_closed / total_visits * 100), 1) if total_visits and total_visits > 0 else 0
            }

    async def get_seller_global_activity(
        self,
        seller_id: UUID,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get recent activity across ALL properties owned by the seller.
        """
        async with self.db.acquire() as conn:
            activities = []
            
            # Get recent views
            views = await conn.fetch("""
                SELECT 
                    pv.viewed_at as timestamp,
                    'view' as type,
                    p.title as property_title,
                    COALESCE(u.email, 'Anonymous') as actor
                FROM property_views pv
                JOIN properties p ON pv.property_id = p.id
                LEFT JOIN users u ON pv.viewer_id = u.id
                WHERE p.seller_id = $1
                ORDER BY pv.viewed_at DESC
                LIMIT $2
            """, seller_id, limit)
            
            for v in views:
                activities.append({
                    "type": "view",
                    "title": f"View on {v['property_title']}", 
                    "timestamp": v['timestamp'].isoformat(),
                    "icon": "eye"
                })
            
            # Get recent saves
            saves = await conn.fetch("""
                SELECT 
                    sp.created_at as timestamp,
                    p.title as property_title,
                    u.email as actor
                FROM saved_properties sp
                JOIN properties p ON sp.property_id = p.id
                JOIN users u ON sp.user_id = u.id
                WHERE p.seller_id = $1
                ORDER BY sp.created_at DESC
                LIMIT $2
            """, seller_id, limit)
            
            for s in saves:
                activities.append({
                    "type": "save",
                    "title": f"Saved {s['property_title']}",
                    "timestamp": s['timestamp'].isoformat(),
                    "icon": "bookmark"
                })

            # Get recent inquiries
            inquiries = await conn.fetch("""
                SELECT 
                    c.created_at as timestamp,
                    p.title as property_title,
                    u.email as actor
                FROM conversations c
                JOIN properties p ON c.property_id = p.id
                JOIN users u ON c.buyer_id = u.id
                WHERE p.seller_id = $1
                ORDER BY c.created_at DESC
                LIMIT $2
            """, seller_id, limit)
            
            for i in inquiries:
                activities.append({
                    "type": "inquiry",
                    "title": f"Inquiry on {i['property_title']}",
                    "timestamp": i['timestamp'].isoformat(),
                    "icon": "message"
                })
                
            # Get recent visits
            visits = await conn.fetch("""
                SELECT 
                    vr.created_at as timestamp,
                    vr.status,
                    p.title as property_title,
                    u.email as actor
                FROM visit_requests vr
                JOIN properties p ON vr.property_id = p.id
                JOIN users u ON vr.buyer_id = u.id
                WHERE p.seller_id = $1
                ORDER BY vr.created_at DESC
                LIMIT $2
            """, seller_id, limit)
            
            for v in visits:
                status_text = {
                    'REQUESTED': 'Visit requested',
                    'APPROVED': 'Visit approved',
                    'COMPLETED': 'Visit completed',
                    'CANCELLED': 'Visit cancelled'
                }.get(v['status'], 'Visit update')
                
                activities.append({
                    "type": "visit",
                    "title": f"{status_text}: {v['property_title']}",
                    "timestamp": v['timestamp'].isoformat(),
                    "icon": "calendar"
                })

            # Sort and Limit
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            activities = activities[:limit]
            
            # Format Relative Time
            now = datetime.now(timezone.utc)
            for a in activities:
                ts = datetime.fromisoformat(a['timestamp'].replace('Z', '+00:00'))
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                diff = now - ts
                if diff.days > 0:
                    a['relative_time'] = f"{diff.days}d ago"
                elif diff.seconds > 3600:
                    hours = diff.seconds // 3600
                    a['relative_time'] = f"{hours}h ago"
                elif diff.seconds > 60:
                    mins = diff.seconds // 60
                    a['relative_time'] = f"{mins}m ago"
                else:
                    a['relative_time'] = "Just now"

            return {
                "success": True,
                "activities": activities
            }

