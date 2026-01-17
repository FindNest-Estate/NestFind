"""
Public Agents Service - Agent discovery for public browsing.

Exposes agent profiles for public view with filtering and geo-search.
No authentication required for these operations.
"""
import asyncpg
from typing import Optional, Dict, Any, List
from uuid import UUID
import math


class PublicAgentsService:
    """Public agent discovery service."""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    async def get_public_agents(
        self,
        page: int = 1,
        per_page: int = 12,
        city: Optional[str] = None,
        min_rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Get paginated list of active agents for public browsing.
        
        Only shows verified, active agents.
        """
        offset = (page - 1) * per_page
        
        # Build WHERE clause
        conditions = ["u.status = 'ACTIVE'", "ap.is_active = true", "ap.kyc_status = 'VERIFIED'"]
        params = []
        param_count = 1
        
        if city:
            # Note: Need to add city field to users or agent_profiles table
            # For now, skip city filter until schema is updated
            pass
        
        if min_rating is not None:
            conditions.append(f"ap.rating >= ${param_count}")
            params.append(min_rating)
            param_count += 1
        
        where_clause = " AND ".join(conditions)
        
        # Count query
        count_query = f"""
            SELECT COUNT(*)
            FROM users u
            INNER JOIN agent_profiles ap ON u.id = ap.user_id
            WHERE {where_clause}
        """
        
        # Data query
        data_query = f"""
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.latitude,
                u.longitude,
                ap.service_radius_km,
                ap.rating,
                ap.total_cases,
                u.created_at
            FROM users u
            INNER JOIN agent_profiles ap ON u.id = ap.user_id
            WHERE {where_clause}
            ORDER BY ap.rating DESC, ap.total_cases DESC
            LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        
        params.extend([per_page, offset])
        
        async with self.db_pool.acquire() as conn:
            # Get total count
            total = await conn.fetchval(count_query, *params[:-2])
            
            # Get agents
            rows = await conn.fetch(data_query, *params)
            
            agents = []
            for row in rows:
                agents.append({
                    "id": str(row["id"]),
                    "name": row["full_name"],
                    "email": row["email"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "service_radius_km": row["service_radius_km"],
                    "rating": float(row["rating"]) if row["rating"] else 0.0,
                    "completed_cases": row["total_cases"],
                    "joined_date": row["created_at"].isoformat()
                })
            
            # Pagination
            total_pages = math.ceil(total / per_page) if total > 0 else 1
            
            return {
                "success": True,
                "agents": agents,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": total_pages,
                    "has_more": page < total_pages
                }
            }
    
    async def get_agent_public_profile(self, agent_id: UUID) -> Dict[str, Any]:
        """
        Get single agent profile for public view.
        
        Only returns profile if agent is ACTIVE and VERIFIED.
        """
        query = """
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.created_at,
                u.latitude,
                u.longitude,
                ap.service_radius_km,
                ap.rating,
                ap.total_cases
            FROM users u
            INNER JOIN agent_profiles ap ON u.id = ap.user_id
            WHERE u.id = $1 
                AND u.status = 'ACTIVE' 
                AND ap.is_active = true 
                AND ap.kyc_status = 'VERIFIED'
        """
        
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, agent_id)
            
            if not row:
                return {
                    "success": False,
                    "error": "Agent not found or not active",
                    "code": 404
                }
            
            # Get active listings count
            listings_query = """
                SELECT COUNT(*) 
                FROM agent_assignments aa
                INNER JOIN properties p ON aa.property_id = p.id
                WHERE aa.agent_id = $1 
                    AND aa.status = 'ACCEPTED'
                    AND p.status = 'ACTIVE'
            """
            active_listings = await conn.fetchval(listings_query, agent_id)
            
            return {
                "success": True,
                "agent": {
                    "id": str(row["id"]),
                    "name": row["full_name"],
                    "email": row["email"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "service_radius_km": row["service_radius_km"],
                    "rating": float(row["rating"]) if row["rating"] else 0.0,
                    "completed_transactions": row["total_cases"],
                    "active_listings": active_listings,
                    "joined_date": row["created_at"].isoformat()
                }
            }
    
    async def get_nearby_agents(
        self,
        latitude: float,
        longitude: float,
        radius_km: int = 50,
        page: int = 1,
        per_page: int = 12
    ) -> Dict[str, Any]:
        """
        Get agents within specified radius using Haversine formula.
        
        Returns agents sorted by distance.
        """
        offset = (page - 1) * per_page
        
        # Haversine distance calculation in SQL
        # Formula: 2 * R * ASIN(SQRT(POWER(SIN((lat2-lat1)/2), 2) + COS(lat1) * COS(lat2) * POWER(SIN((lng2-lng1)/2), 2)))
        # R = Earth radius in km (6371)
        
        query = """
            WITH agent_distances AS (
                SELECT 
                    u.id,
                    u.full_name,
                    u.email,
                    u.latitude,
                    u.longitude,
                    ap.service_radius_km,
                    ap.rating,
                    ap.total_cases,
                    u.created_at,
                    (
                        6371 * ACOS(
                            COS(RADIANS($1)) * COS(RADIANS(u.latitude)) * 
                            COS(RADIANS(u.longitude) - RADIANS($2)) +
                            SIN(RADIANS($1)) * SIN(RADIANS(u.latitude))
                        )
                    ) AS distance_km
                FROM users u
                INNER JOIN agent_profiles ap ON u.id = ap.user_id
                WHERE u.status = 'ACTIVE' 
                    AND ap.is_active = true 
                    AND ap.kyc_status = 'VERIFIED'
            )
            SELECT *
            FROM agent_distances
            WHERE distance_km <= $3
            ORDER BY distance_km ASC, rating DESC
            LIMIT $4 OFFSET $5
        """
        
        count_query = """
            SELECT COUNT(*)
            FROM (
                SELECT 
                    u.id,
                    (
                        6371 * ACOS(
                            COS(RADIANS($1)) * COS(RADIANS(u.latitude)) * 
                            COS(RADIANS(u.longitude) - RADIANS($2)) +
                            SIN(RADIANS($1)) * SIN(RADIANS(u.latitude))
                        )
                    ) AS distance_km
                FROM users u
                INNER JOIN agent_profiles ap ON u.id = ap.user_id
                WHERE u.status = 'ACTIVE' 
                    AND ap.is_active = true 
                    AND ap.kyc_status = 'VERIFIED'
            ) subq
            WHERE distance_km <= $3
        """
        
        async with self.db_pool.acquire() as conn:
            # Get total count
            total = await conn.fetchval(count_query, latitude, longitude, radius_km)
            
            # Get agents
            rows = await conn.fetch(query, latitude, longitude, radius_km, per_page, offset)
            
            agents = []
            for row in rows:
                agents.append({
                    "id": str(row["id"]),
                    "name": row["full_name"],
                    "email": row["email"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "service_radius_km": row["service_radius_km"],
                    "rating": float(row["rating"]) if row["rating"] else 0.0,
                    "completed_cases": row["total_cases"],
                    "distance_km": round(float(row["distance_km"]), 2),
                    "joined_date": row["created_at"].isoformat()
                })
            
            # Pagination
            total_pages = math.ceil(total / per_page) if total > 0 else 1
            
            return {
                "success": True,
                "agents": agents,
                "search_location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius_km": radius_km
                },
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": total_pages,
                    "has_more": page < total_pages
                }
            }
