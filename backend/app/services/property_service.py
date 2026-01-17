"""
Property Service implementing SELLER_PROPERTY_LISTING workflow.

Handles property CRUD operations with state machine enforcement.
"""
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID
from decimal import Decimal
import asyncpg


# ============================================================================
# STATE MACHINE CONFIGURATION
# ============================================================================

ALLOWED_ACTIONS: Dict[str, List[str]] = {
    "DRAFT": ["edit", "upload_media", "delete", "hire_agent"],
    "PENDING_ASSIGNMENT": ["view", "cancel_agent_request"],
    "ASSIGNED": ["view"],
    "VERIFICATION_IN_PROGRESS": ["view"],
    "ACTIVE": ["view_listing", "view_analytics"],
    "INACTIVE": ["view", "reactivate"],
    "RESERVED": ["view"],
    "SOLD": ["view", "view_receipt"]
}

DISPLAY_STATUS: Dict[str, str] = {
    "DRAFT": "Draft",
    "PENDING_ASSIGNMENT": "Waiting for Agent",
    "ASSIGNED": "Agent Assigned",
    "VERIFICATION_IN_PROGRESS": "Verification in Progress",
    "ACTIVE": "Live",
    "INACTIVE": "Inactive",
    "RESERVED": "Reserved",
    "SOLD": "Sold"
}

# States that allow editing
EDITABLE_STATES = ["DRAFT"]

# States that allow deletion
DELETABLE_STATES = ["DRAFT"]


class PropertyService:
    """
    Property management service.
    
    Implements database-first UI rules:
    - All state transitions controlled by backend
    - allowed_actions computed from current state
    - No optimistic updates
    """
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _compute_allowed_actions(self, status: str) -> List[str]:
        """Compute allowed actions based on property status."""
        return ALLOWED_ACTIONS.get(status, ["view"])
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return DISPLAY_STATUS.get(status, status)
    
    def _compute_visibility(self, status: str) -> Dict[str, bool]:
        """Compute visibility flags based on status."""
        return {
            "show_analytics": status in ["ACTIVE", "RESERVED", "SOLD"],
            "show_offers": status in ["ACTIVE", "RESERVED", "SOLD"],
            "show_visits": status in ["ACTIVE", "RESERVED", "SOLD"],
            "show_agent": status not in ["DRAFT"]
        }
    
    def _compute_completeness(self, property_data: dict) -> Dict[str, Any]:
        """
        Calculate property completeness based on property type.
        
        This is the AUTHORITATIVE completeness algorithm.
        Frontend MUST NOT compute this - only render what backend returns.
        
        Returns:
            {
                "level": "BASIC" | "READY_FOR_AGENT",
                "percentage": int (0-100),
                "can_hire_agent": bool,
                "missing_fields": list[str]
            }
        """
        property_type = property_data.get("type")
        
        # Required fields by property type
        COMMON_REQUIRED = ["title", "description", "type", "city", "latitude", "longitude", "price"]
        
        TYPE_SPECIFIC_REQUIRED = {
            "LAND": ["area_sqft"],
            "HOUSE": ["bedrooms", "bathrooms", "area_sqft"],
            "APARTMENT": ["bedrooms", "bathrooms", "area_sqft"],
            "COMMERCIAL": ["area_sqft"],
            None: []  # No type selected yet
        }
        
        # Get required fields for this type
        type_fields = TYPE_SPECIFIC_REQUIRED.get(property_type, [])
        required_fields = COMMON_REQUIRED + type_fields
        
        # Calculate missing fields
        missing = []
        for field in required_fields:
            value = property_data.get(field)
            if value is None or value == "":
                # Map DB field names to human-readable labels
                field_labels = {
                    "title": "Property Title",
                    "description": "Description",
                    "type": "Property Type",
                    "city": "City",
                    "latitude": "Location",
                    "longitude": "Location",
                    "price": "Price",
                    "area_sqft": "Area",
                    "bedrooms": "Bedrooms",
                    "bathrooms": "Bathrooms"
                }
                label = field_labels.get(field, field)
                # Avoid duplicate "Location" entries
                if label not in missing:
                    missing.append(label)
        
        # Calculate percentage
        completed = len(required_fields) - len(missing)
        percentage = int((completed / len(required_fields)) * 100) if required_fields else 0
        
        # Determine semantic level
        level = "READY_FOR_AGENT" if len(missing) == 0 else "BASIC"
        
        # Can hire agent only if fully complete
        can_hire_agent = level == "READY_FOR_AGENT"
        
        return {
            "level": level,
            "percentage": percentage,
            "can_hire_agent": can_hire_agent,
            "missing_fields": missing
        }
    
    def _get_address_preview(self, city: Optional[str], address: Optional[str]) -> Optional[str]:
        """Generate address preview (city only for privacy)."""
        if city:
            return city
        if address:
            # Extract city-like part (last comma-separated segment)
            parts = address.split(",")
            if len(parts) >= 2:
                return parts[-2].strip()
        return None
    
    # ========================================================================
    # CRUD OPERATIONS
    # ========================================================================
    
    async def create_property(
        self,
        seller_id: UUID,
        title: Optional[str] = None,
        property_type: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new property in DRAFT state.
        
        Returns:
            {
                "success": bool,
                "property": {...} or None,
                "error": optional error message
            }
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Check if user already has a DRAFT property
                existing_draft = await conn.fetchval(
                    """
                    SELECT id FROM properties 
                    WHERE seller_id = $1 AND status = 'DRAFT' AND deleted_at IS NULL
                    LIMIT 1
                    """,
                    seller_id
                )
                
                if existing_draft:
                    return {
                        "success": False,
                        "error": "You already have a draft property. Please complete or delete it before creating a new one.",
                        "existing_draft_id": str(existing_draft)
                    }
                
                # Create property
                property_id = await conn.fetchval(
                    """
                    INSERT INTO properties 
                    (seller_id, title, type, status, created_at, updated_at)
                    VALUES ($1, $2, $3, 'DRAFT', NOW(), NOW())
                    RETURNING id
                    """,
                    seller_id,
                    title,
                    property_type
                )
                
                # Audit log
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'PROPERTY_CREATED', 'properties', $2, $3, $4)
                    """,
                    seller_id,
                    property_id,
                    ip_address,
                    json.dumps({"title": title, "type": property_type})
                )
                
                return {
                    "success": True,
                    "property": {
                        "id": property_id,
                        "status": "DRAFT",
                        "display_status": "Draft",
                        "allowed_actions": self._compute_allowed_actions("DRAFT"),
                        "next_action": {
                            "action": "complete_details",
                            "message": "Add property details and photos to proceed"
                        }
                    }
                }
    
    async def get_seller_properties(
        self,
        seller_id: UUID,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get paginated list of seller's properties.
        
        Returns properties with computed allowed_actions and visibility.
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Get total count
            total = await conn.fetchval(
                """
                SELECT COUNT(*) FROM properties 
                WHERE seller_id = $1 AND deleted_at IS NULL
                """,
                seller_id
            )
            
            # Get properties
            rows = await conn.fetch(
                """
                SELECT 
                    p.id, p.title, p.status::text, p.price, p.city, p.address,
                    p.created_at, p.updated_at,
                    (SELECT file_url FROM property_media 
                     WHERE property_id = p.id AND is_primary = true AND deleted_at IS NULL 
                     LIMIT 1) as thumbnail_url,
                    aa.agent_id,
                    aa.status::text as agent_status,
                    aa.requested_at,
                    u.full_name as agent_name
                FROM properties p
                LEFT JOIN agent_assignments aa ON p.id = aa.property_id 
                    AND aa.status IN ('REQUESTED', 'ACCEPTED')
                LEFT JOIN users u ON aa.agent_id = u.id
                WHERE p.seller_id = $1 AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                LIMIT $2 OFFSET $3
                """,
                seller_id, per_page, offset
            )
            
            properties = []
            for row in rows:
                status = row["status"]
                
                # Build agent summary if exists
                agent = None
                if row["agent_id"]:
                    agent = {
                        "id": row["agent_id"],
                        "name": row["agent_name"],
                        "status": row["agent_status"],
                        "requested_at": row["requested_at"].isoformat() if row["requested_at"] else None
                    }
                
                properties.append({
                    "id": row["id"],
                    "title": row["title"],
                    "status": status,
                    "display_status": self._get_display_status(status),
                    "address_preview": self._get_address_preview(row["city"], row["address"]),
                    "price": float(row["price"]) if row["price"] else None,
                    "thumbnail_url": row["thumbnail_url"],
                    "created_at": row["created_at"].isoformat(),
                    "allowed_actions": self._compute_allowed_actions(status),
                    "visibility": self._compute_visibility(status),
                    "agent": agent
                })
            
            return {
                "properties": properties,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page
                }
            }
    
    async def get_property_by_id(
        self,
        property_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Get property by ID with owner verification.
        
        Returns full property details if user is owner, otherwise 403/404.
        """
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    p.*,
                    aa.agent_id,
                    aa.status::text as agent_status,
                    aa.requested_at,
                    u.full_name as agent_name
                FROM properties p
                LEFT JOIN agent_assignments aa ON p.id = aa.property_id 
                    AND aa.status IN ('REQUESTED', 'ACCEPTED')
                LEFT JOIN users u ON aa.agent_id = u.id
                WHERE p.id = $1 AND p.deleted_at IS NULL
                """,
                property_id
            )
            
            if not row:
                return {"success": False, "error": "Property not found", "code": 404}
            
            if row["seller_id"] != user_id:
                return {"success": False, "error": "Not authorized", "code": 403}
            
            status = row["status"]
            
            # Get media
            media = await conn.fetch(
                """
                SELECT id, media_type::text, file_url, display_order, is_primary
                FROM property_media
                WHERE property_id = $1 AND deleted_at IS NULL
                ORDER BY display_order
                """,
                property_id
            )
            
            # Build agent summary
            agent = None
            if row["agent_id"]:
                agent = {
                    "id": row["agent_id"],
                    "name": row["agent_name"],
                    "status": row["agent_status"],
                    "requested_at": row["requested_at"].isoformat() if row["requested_at"] else None
                }
            
            # Build property response
            property_data = {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "type": row["type"],
                "price": float(row["price"]) if row["price"] else None,
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "address": row["address"],
                "city": row["city"],
                "state": row["state"],
                "pincode": row["pincode"],
                "bedrooms": row["bedrooms"],
                "bathrooms": row["bathrooms"],
                "area_sqft": float(row["area_sqft"]) if row["area_sqft"] else None,
                "status": status,
                "display_status": self._get_display_status(status),
                "allowed_actions": self._compute_allowed_actions(status),
                "visibility": self._compute_visibility(status),
                "agent": agent,
                "media": [dict(m) for m in media],
                "highlights": [dict(h) for h in highlights],
                "price_history": [dict(ph) for ph in price_history],
                "created_at": row["created_at"].isoformat(),
                "updated_at": row["updated_at"].isoformat(),
                "has_media": len(media) > 0
            }
            
            # Add completeness (computed at read-time, not stored)
            property_data["completeness"] = self._compute_completeness(property_data)
            
            return {"success": True, "property": property_data}
    
    async def update_property(
        self,
        property_id: UUID,
        user_id: UUID,
        updates: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update property. Only allowed in DRAFT state.
        
        Enforces state machine: cannot edit non-DRAFT properties.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Get current property with lock
                row = await conn.fetchrow(
                    """
                    SELECT id, seller_id, status::text, version
                    FROM properties
                    WHERE id = $1 AND deleted_at IS NULL
                    FOR UPDATE
                    """,
                    property_id
                )
                
                if not row:
                    return {"success": False, "error": "Property not found", "code": 404}
                
                if row["seller_id"] != user_id:
                    return {"success": False, "error": "Not authorized", "code": 403}
                
                if row["status"] not in EDITABLE_STATES:
                    return {
                        "success": False,
                        "error": {
                            "code": "INVALID_STATE",
                            "message": "Cannot edit property in current state",
                            "current_state": row["status"],
                            "allowed_states": EDITABLE_STATES
                        },
                        "code": 400
                    }
                
                # Build update query dynamically
                update_fields = []
                values = []
                param_idx = 1
                
                allowed_fields = [
                    "title", "description", "type", "price", 
                    "latitude", "longitude", "address", "city", "state", "pincode",
                    "bedrooms", "bathrooms", "area_sqft"
                ]
                
                for field in allowed_fields:
                    if field in updates and updates[field] is not None:
                        update_fields.append(f"{field} = ${param_idx}")
                        values.append(updates[field])
                        param_idx += 1
                        print(f"[PropertyService] Updating field: {field} = {updates[field]}")
                
                if not update_fields:
                    return {"success": False, "error": "No valid fields to update", "code": 400}
                
                values.append(property_id)
                
                await conn.execute(
                    f"""
                    UPDATE properties
                    SET {", ".join(update_fields)}
                    WHERE id = ${param_idx}
                    """,
                    *values
                )
                
                # Audit log
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'PROPERTY_UPDATED', 'properties', $2, $3, $4)
                    """,
                    user_id,
                    property_id,
                    ip_address,
                    json.dumps({"updated_fields": list(updates.keys())})
                )
                
                # Get updated property for response
                updated = await conn.fetchrow(
                    """
                    SELECT id, title, description, type, price, latitude, longitude, 
                           address, city, bedrooms, bathrooms, area_sqft, status::text
                    FROM properties WHERE id = $1
                    """,
                    property_id
                )
                
                # Check for media
                has_media = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM property_media WHERE property_id = $1 AND deleted_at IS NULL)",
                    property_id
                )
                
                property_dict = dict(updated)
                property_dict["has_media"] = has_media
                
                return {
                    "success": True,
                    "property": {
                        "id": property_id,
                        "status": updated["status"],
                        "display_status": self._get_display_status(updated["status"]),
                        "allowed_actions": self._compute_allowed_actions(updated["status"]),
                        "completeness": self._compute_completeness(property_dict)
                    }
                }
    
    async def delete_property(
        self,
        property_id: UUID,
        user_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Soft-delete property. Only allowed in DRAFT state.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    SELECT id, seller_id, status::text
                    FROM properties
                    WHERE id = $1 AND deleted_at IS NULL
                    FOR UPDATE
                    """,
                    property_id
                )
                
                if not row:
                    return {"success": False, "error": "Property not found", "code": 404}
                
                if row["seller_id"] != user_id:
                    return {"success": False, "error": "Not authorized", "code": 403}
                
                if row["status"] not in DELETABLE_STATES:
                    return {
                        "success": False,
                        "error": {
                            "code": "INVALID_STATE",
                            "message": "Cannot delete property in current state",
                            "current_state": row["status"],
                            "allowed_states": DELETABLE_STATES
                        },
                        "code": 400
                    }
                
                # Soft delete
                await conn.execute(
                    "UPDATE properties SET deleted_at = NOW() WHERE id = $1",
                    property_id
                )
                
                # Audit log
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'PROPERTY_DELETED', 'properties', $2, $3, $4)
                    """,
                    user_id,
                    property_id,
                    ip_address,
                    json.dumps({})
                )
                
                return {
                    "success": True,
                    "message": "Property deleted successfully"
                }
    
    # ========================================================================
    # PUBLIC BROWSING METHODS (No auth required)
    # ========================================================================
    
    async def get_public_properties(
        self,
        page: int = 1,
        per_page: int = 12,
        city: Optional[str] = None,
        property_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[int] = None,
        min_area: Optional[float] = None,
        max_area: Optional[float] = None,
        keyword: Optional[str] = None,
        sort_by: Optional[str] = None  # price_asc, price_desc, newest, area_desc
    ) -> Dict[str, Any]:
        """
        Get paginated list of ACTIVE properties for public browsing.
        
        Only shows verified, live properties. No seller info exposed.
        
        Filters:
        - city: Partial match on city name
        - property_type: Exact match (LAND, HOUSE, APARTMENT, COMMERCIAL)
        - min_price/max_price: Price range
        - bedrooms: Minimum bedrooms
        - bathrooms: Minimum bathrooms
        - min_area/max_area: Area range in sqft
        - keyword: Search in title, description, address
        - sort_by: price_asc, price_desc, newest (default), area_desc
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build WHERE clause dynamically
            conditions = ["p.status = 'ACTIVE'", "p.deleted_at IS NULL"]
            params = []
            param_idx = 1
            
            if city:
                conditions.append(f"LOWER(p.city) LIKE LOWER(${param_idx})")
                params.append(f"%{city}%")
                param_idx += 1
            
            if property_type:
                conditions.append(f"p.type = ${param_idx}")
                params.append(property_type)
                param_idx += 1
            
            if min_price is not None:
                conditions.append(f"p.price >= ${param_idx}")
                params.append(min_price)
                param_idx += 1
            
            if max_price is not None:
                conditions.append(f"p.price <= ${param_idx}")
                params.append(max_price)
                param_idx += 1
            
            if bedrooms is not None:
                conditions.append(f"p.bedrooms >= ${param_idx}")
                params.append(bedrooms)
                param_idx += 1
            
            if bathrooms is not None:
                conditions.append(f"p.bathrooms >= ${param_idx}")
                params.append(bathrooms)
                param_idx += 1
            
            if min_area is not None:
                conditions.append(f"p.area_sqft >= ${param_idx}")
                params.append(min_area)
                param_idx += 1
            
            if max_area is not None:
                conditions.append(f"p.area_sqft <= ${param_idx}")
                params.append(max_area)
                param_idx += 1
            
            if keyword:
                # Search in title, description, address, and city
                conditions.append(f"""(
                    LOWER(p.title) LIKE LOWER(${param_idx}) OR
                    LOWER(p.description) LIKE LOWER(${param_idx}) OR
                    LOWER(p.address) LIKE LOWER(${param_idx}) OR
                    LOWER(p.city) LIKE LOWER(${param_idx})
                )""")
                params.append(f"%{keyword}%")
                param_idx += 1
            
            where_clause = " AND ".join(conditions)
            
            # Determine sort order
            sort_options = {
                "price_asc": "p.price ASC NULLS LAST",
                "price_desc": "p.price DESC NULLS LAST",
                "newest": "p.created_at DESC",
                "area_desc": "p.area_sqft DESC NULLS LAST",
                "area_asc": "p.area_sqft ASC NULLS LAST"
            }
            order_by = sort_options.get(sort_by, "p.created_at DESC")
            
            # Get total count
            count_query = f"""
                SELECT COUNT(*) FROM properties p
                WHERE {where_clause}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get properties
            params.extend([per_page, offset])
            query = f"""
                SELECT 
                    p.id, p.title, p.type::text, p.price, p.city, p.state,
                    p.bedrooms, p.bathrooms, p.area_sqft,
                    p.latitude, p.longitude,
                    p.created_at,
                    (SELECT file_url FROM property_media 
                     WHERE property_id = p.id AND is_primary = true AND deleted_at IS NULL 
                     LIMIT 1) as thumbnail_url,
                    u.full_name as agent_name
                FROM properties p
                LEFT JOIN agent_assignments aa ON p.id = aa.property_id 
                    AND aa.status = 'ACCEPTED'
                LEFT JOIN users u ON aa.agent_id = u.id
                WHERE {where_clause}
                ORDER BY {order_by}
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """
            rows = await conn.fetch(query, *params)
            
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
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "thumbnail_url": row["thumbnail_url"],
                    "agent_name": row["agent_name"],
                    "created_at": row["created_at"].isoformat()
                })
            
            return {
                "success": True,
                "properties": properties,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page if total > 0 else 0,
                    "has_more": (page * per_page) < total
                },
                "filters_applied": {
                    "city": city,
                    "type": property_type,
                    "min_price": min_price,
                    "max_price": max_price,
                    "bedrooms": bedrooms,
                    "bathrooms": bathrooms,
                    "min_area": min_area,
                    "max_area": max_area,
                    "keyword": keyword,
                    "sort_by": sort_by or "newest"
                }
            }
    
    async def get_public_property_by_id(
        self,
        property_id: UUID,
        viewer_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get single property for public view.
        
        Only ACTIVE properties are viewable. No seller info exposed.
        Agent contact info is shown.
        
        If viewer_id is provided, returns viewer context with is_owner and is_agent flags.
        """
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    p.id, p.title, p.description, p.type::text, p.price,
                    p.city, p.state, p.pincode, p.address,
                    p.latitude, p.longitude,
                    p.bedrooms, p.bathrooms, p.area_sqft,
                    p.status::text,
                    p.seller_id,
                    p.created_at, p.updated_at,
                    u.id as agent_id, u.full_name as agent_name, u.email as agent_email
                FROM properties p
                LEFT JOIN agent_assignments aa ON p.id = aa.property_id 
                    AND aa.status = 'ACCEPTED'
                LEFT JOIN users u ON aa.agent_id = u.id
                WHERE p.id = $1 AND p.deleted_at IS NULL
                """,
                property_id
            )
            
            if not row:
                return {"success": False, "error": "Property not found", "code": 404}
            
            if row["status"] != "ACTIVE":
                return {"success": False, "error": "Property not available", "code": 404}
            
            # Get all media
            media = await conn.fetch(
                """
                SELECT id, media_type::text, file_url, display_order, is_primary
                FROM property_media
                WHERE property_id = $1 AND deleted_at IS NULL
                ORDER BY is_primary DESC, display_order ASC
                """,
                property_id
            )
            
            # Build agent info (public contact)
            agent = None
            if row["agent_id"]:
                agent = {
                    "id": str(row["agent_id"]),
                    "name": row["agent_name"],
                    "email": row["agent_email"]
                }
            
            # Build viewer context if authenticated viewer
            viewer_context = None
            if viewer_id:
                # Check for existing active visit
                visit_id = await conn.fetchval("""
                    SELECT id 
                    FROM visit_requests 
                    WHERE property_id = $1 
                      AND buyer_id = $2
                      AND status IN ('REQUESTED', 'APPROVED', 'COUNTERED', 'CHECKED_IN')
                    LIMIT 1
                """, property_id, viewer_id)

                viewer_context = {
                    "is_owner": row["seller_id"] == viewer_id,
                    "is_agent": row["agent_id"] == viewer_id if row["agent_id"] else False,
                    "visit_id": str(visit_id) if visit_id else None
                }
                print(f"[DEBUG] viewer_context for property {property_id}: {viewer_context}")
                
            # Get property highlights
            highlights_row = await conn.fetchrow("""
                SELECT facing, floor_number, total_floors, furnishing, 
                       possession_date, property_age, parking_spaces, balconies
                FROM property_highlights
                WHERE property_id = $1
            """, property_id)
            
            highlights = None
            if highlights_row:
                highlights = {
                    "facing": highlights_row["facing"],
                    "floor_number": highlights_row["floor_number"],
                    "total_floors": highlights_row["total_floors"],
                    "furnishing": highlights_row["furnishing"],
                    "possession_date": highlights_row["possession_date"].isoformat() if highlights_row["possession_date"] else None,
                    "property_age": highlights_row["property_age"],
                    "parking_spaces": highlights_row["parking_spaces"],
                    "balconies": highlights_row["balconies"]
                }
            
            # Get price history
            price_history_rows = await conn.fetch("""
                SELECT new_price as price, changed_at as date
                FROM property_price_history
                WHERE property_id = $1
                ORDER BY changed_at ASC
            """, property_id)
            
            price_history = [
                {"price": float(r["price"]), "date": r["date"].isoformat()}
                for r in price_history_rows
            ]
            
            result = {
                "success": True,
                "property": {
                    "id": str(row["id"]),
                    "title": row["title"],
                    "description": row["description"],
                    "type": row["type"],
                    "price": float(row["price"]) if row["price"] else None,
                    "city": row["city"],
                    "state": row["state"],
                    "pincode": row["pincode"],
                    "address": row["address"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "bedrooms": row["bedrooms"],
                    "bathrooms": row["bathrooms"],
                    "area_sqft": float(row["area_sqft"]) if row["area_sqft"] else None,
                    "agent": agent,
                    "media": [
                        {
                            "id": str(m["id"]),
                            "media_type": m["media_type"],
                            "file_url": m["file_url"],
                            "display_order": m["display_order"],
                            "is_primary": m["is_primary"]
                        }
                        for m in media
                    ],
                    "highlights": highlights,
                    "price_history": price_history,
                    "created_at": row["created_at"].isoformat(),
                    "updated_at": row["updated_at"].isoformat()
                }
            }
            
            # Add viewer context to property if authenticated
            if viewer_context:
                result["property"]["viewer"] = viewer_context
            
            return result
    
    # ========================================================================
    # ADMIN OVERRIDE METHODS
    # ========================================================================
    
    async def admin_override_status(
        self,
        property_id: UUID,
        new_status: str,
        admin_id: UUID,
        reason: str,
        ip_address: str
    ) -> Dict[str, Any]:
        """
        Admin override for property status.
        
        Bypasses normal state machine validation.
        CRITICAL: Requires mandatory audit logging with reason.
        
        Args:
            property_id: Property to override
            new_status: Target status
            admin_id: Admin performing override
            reason: Mandatory reason for audit
            ip_address: Admin's IP
            
        Returns:
            {"success": bool, "error": optional str}
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Get current property
                row = await conn.fetchrow("""
                    SELECT id, status::text, seller_id
                    FROM properties
                    WHERE id = $1 AND deleted_at IS NULL
                    FOR UPDATE
                """, property_id)
                
                if not row:
                    return {
                        "success": False,
                        "error": "Property not found",
                        "code": 404
                    }
                
                old_status = row["status"]
                
                if old_status == new_status:
                    return {
                        "success": False,
                        "error": f"Property is already in {new_status} status",
                        "code": 400
                    }
                
                # Update property status
                await conn.execute("""
                    UPDATE properties
                    SET status = $1::property_status, updated_at = NOW()
                    WHERE id = $2
                """, new_status, property_id)
                
                # CRITICAL: Audit log with reason
                await conn.execute("""
                    INSERT INTO audit_logs (
                        user_id, action, entity_type, entity_id, 
                        ip_address, details
                    )
                    VALUES ($1, 'ADMIN_PROPERTY_OVERRIDE', 'properties', $2, $3, $4)
                """,
                admin_id,
                property_id,
                ip_address,
                json.dumps({
                    "old_status": old_status,
                    "new_status": new_status,
                    "reason": reason,
                    "seller_id": str(row["seller_id"])
                }))
                
                return {
                    "success": True,
                    "old_status": old_status,
                    "new_status": new_status
                }


