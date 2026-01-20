"""
Admin Properties Service for property management.

Provides:
- List all properties with filters
- Override property status
- Property statistics
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone
import asyncpg


class AdminPropertiesService:
    """Service for admin property management."""
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def get_properties(
        self,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        city_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get all properties with optional filters.
        """
        async with self.db.acquire() as conn:
            # Build query conditions
            conditions = []
            params = []
            param_count = 0
            
            if search:
                param_count += 1
                conditions.append(f"(p.title ILIKE ${param_count} OR p.address ILIKE ${param_count})")
                params.append(f"%{search}%")
            
            if status_filter:
                param_count += 1
                conditions.append(f"p.status = ${param_count}")
                params.append(status_filter)
            
            if city_filter:
                param_count += 1
                conditions.append(f"p.city ILIKE ${param_count}")
                params.append(f"%{city_filter}%")
            
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            
            offset = (page - 1) * per_page
            
            # Get properties
            query = f"""
                SELECT 
                    p.id, p.title, p.address, p.city, p.state,
                    p.price, p.type as property_type, p.status, p.created_at,
                    p.verified_at,
                    seller.id as seller_id, seller.full_name as seller_name,
                    agent.id as agent_id, agent.full_name as agent_name,
                    (SELECT file_url FROM property_media WHERE property_id = p.id AND is_primary = true LIMIT 1) as thumbnail_url,
                    (SELECT COUNT(*) FROM visit_requests WHERE property_id = p.id) as visit_count,
                    (SELECT COUNT(*) FROM offers WHERE property_id = p.id) as offer_count
                FROM properties p
                LEFT JOIN users seller ON seller.id = p.seller_id
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id AND aa.status = 'ACCEPTED'
                LEFT JOIN users agent ON agent.id = aa.agent_id
                {where_clause}
                ORDER BY p.created_at DESC
                LIMIT {per_page} OFFSET {offset}
            """
            
            properties = await conn.fetch(query, *params)
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM properties p {where_clause}"
            total = await conn.fetchval(count_query, *params)
            
            # Get stats by status
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'VERIFICATION_IN_PROGRESS') as pending_count,
                    COUNT(*) FILTER (WHERE status = 'ACTIVE') as verified_count,
                    COUNT(*) FILTER (WHERE status = 'RESERVED') as reserved_count,
                    COUNT(*) FILTER (WHERE status = 'SOLD') as sold_count,
                    COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_count,
                    COUNT(*) as total_count
                FROM properties
            """)
            
            return {
                "success": True,
                "properties": [
                    {
                        "id": str(p['id']),
                        "title": p['title'],
                        "address": p['address'],
                        "city": p['city'],
                        "state": p['state'],
                        "price": float(p['price']) if p['price'] else 0,
                        "property_type": p['property_type'],
                        "status": p['status'],
                        "created_at": p['created_at'].isoformat() if p['created_at'] else None,
                        "verified_at": p['verified_at'].isoformat() if p['verified_at'] else None,
                        "seller_id": str(p['seller_id']) if p['seller_id'] else None,
                        "seller_name": p['seller_name'],
                        "agent_id": str(p['agent_id']) if p['agent_id'] else None,
                        "agent_name": p['agent_name'],
                        "thumbnail_url": p['thumbnail_url'],
                        "visit_count": p['visit_count'] or 0,
                        "offer_count": p['offer_count'] or 0
                    }
                    for p in properties
                ],
                "stats": {
                    "pending": stats['pending_count'] or 0,
                    "verified": stats['verified_count'] or 0,
                    "reserved": stats['reserved_count'] or 0,
                    "sold": stats['sold_count'] or 0,
                    "draft": stats['draft_count'] or 0,
                    "total": stats['total_count'] or 0
                },
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page
                }
            }
    
    async def override_property_status(
        self,
        property_id: UUID,
        admin_id: UUID,
        new_status: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Admin overrides property status."""
        valid_statuses = ['DRAFT', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'VERIFICATION_IN_PROGRESS', 'ACTIVE', 'INACTIVE', 'RESERVED', 'SOLD', 'REJECTED', 'ARCHIVED']
        
        if new_status not in valid_statuses:
            return {"success": False, "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}
        
        async with self.db.acquire() as conn:
            # Verify admin
            is_admin = await conn.fetchval("""
                SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'ADMIN')
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            # Get property
            prop = await conn.fetchrow("""
                SELECT id, title, status FROM properties WHERE id = $1
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found"}
            
            old_status = prop['status']
            
            # Update status
            if new_status == 'ACTIVE':
                await conn.execute("""
                    UPDATE properties 
                    SET status = $2, verified_at = NOW() 
                    WHERE id = $1
                """, property_id, new_status)
            else:
                await conn.execute("""
                    UPDATE properties SET status = $2 WHERE id = $1
                """, property_id, new_status)
            
            return {
                "success": True,
                "message": f"Property status changed from {old_status} to {new_status}",
                "old_status": old_status,
                "new_status": new_status
            }
    
    async def get_property_detail(
        self,
        property_id: UUID,
        admin_id: UUID
    ) -> Dict[str, Any]:
        """Get detailed property information for admin."""
        async with self.db.acquire() as conn:
            # Verify admin
            is_admin = await conn.fetchval("""
                SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'ADMIN')
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            prop = await conn.fetchrow("""
                SELECT 
                    p.*,
                    seller.full_name as seller_name, seller.email as seller_email,
                    agent.full_name as agent_name, agent.email as agent_email,
                    (SELECT COUNT(*) FROM visit_requests WHERE property_id = p.id) as visit_count,
                    (SELECT COUNT(*) FROM offers WHERE property_id = p.id) as offer_count,
                    (SELECT COUNT(*) FROM transactions WHERE property_id = p.id) as transaction_count
                FROM properties p
                LEFT JOIN users seller ON seller.id = p.seller_id
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id AND aa.status = 'ACCEPTED'
                LEFT JOIN users agent ON agent.id = aa.agent_id
                WHERE p.id = $1
            """, property_id)
            
            if not prop:
                return {"success": False, "error": "Property not found"}
            
            # Get media
            media = await conn.fetch("""
                SELECT id, file_url, file_type, is_primary
                FROM property_media WHERE property_id = $1
                ORDER BY is_primary DESC, created_at
            """, property_id)
            
            return {
                "success": True,
                "property": {
                    "id": str(prop['id']),
                    "title": prop['title'],
                    "description": prop['description'],
                    "address": prop['address'],
                    "city": prop['city'],
                    "state": prop['state'],
                    "pincode": prop['pincode'],
                    "price": float(prop['price']) if prop['price'] else 0,
                    "property_type": prop['type'],
                    "bedrooms": prop['bedrooms'],
                    "bathrooms": prop['bathrooms'],
                    "area_sqft": prop['area_sqft'],
                    "status": prop['status'],
                    "created_at": prop['created_at'].isoformat() if prop['created_at'] else None,
                    "verified_at": prop['verified_at'].isoformat() if prop['verified_at'] else None,
                    "seller": {
                        "id": str(prop['seller_id']) if prop['seller_id'] else None,
                        "name": prop['seller_name'],
                        "email": prop['seller_email']
                    },
                    "agent": {
                        "id": str(prop['agent_id']) if prop.get('agent_id') else None,
                        "name": prop['agent_name'],
                        "email": prop['agent_email']
                    } if prop['agent_name'] else None,
                    "stats": {
                        "visits": prop['visit_count'] or 0,
                        "offers": prop['offer_count'] or 0,
                        "transactions": prop['transaction_count'] or 0
                    },
                    "media": [
                        {
                            "id": str(m['id']),
                            "url": m['file_url'],
                            "type": m['file_type'],
                            "is_primary": m['is_primary']
                        }
                        for m in media
                    ]
                }
            }
