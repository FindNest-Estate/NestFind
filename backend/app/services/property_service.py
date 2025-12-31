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
        COMMON_REQUIRED = ["title", "type", "city", "latitude", "longitude", "price"]
        
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
                "bedrooms": row["bedrooms"],
                "bathrooms": row["bathrooms"],
                "area_sqft": float(row["area_sqft"]) if row["area_sqft"] else None,
                "status": status,
                "display_status": self._get_display_status(status),
                "allowed_actions": self._compute_allowed_actions(status),
                "visibility": self._compute_visibility(status),
                "agent": agent,
                "media": [dict(m) for m in media],
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
                    "latitude", "longitude", "address", "city",
                    "bedrooms", "bathrooms", "area_sqft"
                ]
                
                for field in allowed_fields:
                    if field in updates and updates[field] is not None:
                        update_fields.append(f"{field} = ${param_idx}")
                        values.append(updates[field])
                        param_idx += 1
                
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
