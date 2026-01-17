"""
Saved Properties Service

Allows authenticated buyers to save/bookmark properties for later viewing.
"""
import asyncpg
from typing import Optional, Dict, Any, List
from uuid import UUID
import math


class SavedPropertiesService:
    """Saved properties management service."""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def save_property(
        self,
        user_id: UUID,
        property_id: UUID,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Save a property for the user.
        
        Returns success=False if property doesn't exist or isn't ACTIVE.
        Idempotent - won't error if already saved.
        """
        async with self.db_pool.acquire() as conn:
            # Check if property exists and is ACTIVE
            property_exists = await conn.fetchrow("""
                SELECT id, status 
                FROM properties 
                WHERE id = $1
            """, property_id)
            
            if not property_exists:
                return {
                    "success": False,
                    "error": "Property not found",
                    "code": 404
                }
            
            # Only allow saving ACTIVE or RESERVED properties
            if property_exists['status'] not in ['ACTIVE', 'RESERVED']:
                return {
                    "success": False,
                    "error": "Property is not available",
                    "code": 400
                }
            
            # Insert or update (upsert)
            saved_id = await conn.fetchval("""
                INSERT INTO saved_properties (user_id, property_id, notes)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, property_id) 
                DO UPDATE SET notes = EXCLUDED.notes, created_at = NOW()
                RETURNING id
            """, user_id, property_id, notes)
            
            return {
                "success": True,
                "saved_id": str(saved_id),
                "message": "Property saved successfully"
            }
    
    async def unsave_property(
        self,
        user_id: UUID,
        property_id: UUID
    ) -> Dict[str, Any]:
        """
        Remove a saved property.
        
        Idempotent - won't error if not saved.
        """
        async with self.db_pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM saved_properties
                WHERE user_id = $1 AND property_id = $2
            """, user_id, property_id)
            
            # Extract count from "DELETE 1" or "DELETE 0"
            deleted = int(result.split()[-1]) if result.startswith('DELETE') else 0
            
            return {
                "success": True,
                "message": "Property unsaved" if deleted > 0 else "Property was not saved"
            }
    
    async def get_saved_properties(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 12
    ) -> Dict[str, Any]:
        """
        Get paginated list of user's saved properties.
        
        Returns properties with their current status and thumbnail.
        """
        offset = (page - 1) * per_page
        
        # Count query
        total = await self.db_pool.fetchval("""
            SELECT COUNT(*)
            FROM saved_properties sp
            INNER JOIN properties p ON sp.property_id = p.id
            WHERE sp.user_id = $1
        """, user_id)
        
        # Data query
        rows = await self.db_pool.fetch("""
            SELECT 
                p.id,
                p.title,
                p.type,
                p.price,
                p.city,
                p.state,
                p.bedrooms,
                p.bathrooms,
                p.area_sqft,
                p.status,
                p.latitude,
                p.longitude,
                sp.notes,
                sp.created_at as saved_at,
                (SELECT file_url FROM property_media 
                 WHERE property_id = p.id AND is_primary = true 
                 LIMIT 1) as thumbnail_url
            FROM saved_properties sp
            INNER JOIN properties p ON sp.property_id = p.id
            WHERE sp.user_id = $1
            ORDER BY sp.created_at DESC
            LIMIT $2 OFFSET $3
        """, user_id, per_page, offset)
        
        properties = []
        for row in rows:
            properties.append({
                "id": str(row["id"]),
                "title": row["title"],
                "type": row["type"],
                "price": float(row["price"]) if row["price"] else None,
                "city": row["city"],
                "state": row["state"],
                "bedrooms": row["bedrooms"],
                "bathrooms": row["bathrooms"],
                "area_sqft": float(row["area_sqft"]) if row["area_sqft"] else None,
                "status": row["status"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "notes": row["notes"],
                "saved_at": row["saved_at"].isoformat(),
                "thumbnail_url": row["thumbnail_url"]
            })
        
        # Pagination
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        
        return {
            "success": True,
            "properties": properties,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_more": page < total_pages
            }
        }
    
    async def is_property_saved(
        self,
        user_id: UUID,
        property_id: UUID
    ) -> bool:
        """
        Check if a property is saved by the user.
        
        Useful for UI to show saved/unsaved state.
        """
        async with self.db_pool.acquire() as conn:
            exists = await conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM saved_properties
                    WHERE user_id = $1 AND property_id = $2
                )
            """, user_id, property_id)
            
            return exists
