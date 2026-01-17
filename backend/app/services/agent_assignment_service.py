"""
Agent Assignment Service - Handles agent-property assignments and verification workflow.

State Machine:
- Assignment: REQUESTED → ACCEPTED/DECLINED
- Property: DRAFT → PENDING_ASSIGNMENT → ASSIGNED → VERIFICATION_IN_PROGRESS → ACTIVE
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timedelta, timezone
import asyncpg
import secrets
import hashlib
import json
from ..services.notifications_service import NotificationsService


class AgentAssignmentService:
    """
    Service for managing agent-property assignments and verification workflow.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    # ========================================================================
    # SELLER ACTIONS
    # ========================================================================
    
    async def request_agent_for_property(
        self,
        property_id: UUID,
        seller_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Seller requests an agent for their property.
        
        Transitions property: DRAFT → PENDING_ASSIGNMENT
        Creates assignment request for nearby agent (simplified: first active agent).
        
        Requirements:
        - Property must be in DRAFT state
        - Property must be "ready" (has required fields)
        - Seller must be owner
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Get property
                prop = await conn.fetchrow(
                    """
                    SELECT id, seller_id, status::text, title, type, price, 
                           city, latitude, longitude
                    FROM properties
                    WHERE id = $1 AND deleted_at IS NULL
                    """,
                    property_id
                )
                
                if not prop:
                    return {"success": False, "error": "Property not found", "code": 404}
                
                if prop["seller_id"] != seller_id:
                    return {"success": False, "error": "Not authorized", "code": 403}
                
                if prop["status"] != "DRAFT":
                    return {
                        "success": False, 
                        "error": f"Cannot hire agent for property in {prop['status']} state",
                        "code": 400
                    }
                
                # Check completeness
                required_fields = ["title", "type", "price", "city"]
                missing = [f for f in required_fields if not prop[f]]
                if missing:
                    return {
                        "success": False,
                        "error": f"Property missing required fields: {', '.join(missing)}",
                        "code": 400
                    }
                
                # Find available agent within service radius
                # Using Haversine formula for distance in Kilometers (6371 km earth radius)
                # We need to cast columns to float if they are stored as numeric/text, or use native types.
                # Assuming latitude/longitude are DOUBLE PRECISION (float).
                
                agent = await conn.fetchrow(
                    """
                    SELECT ap.user_id, u.full_name, u.email,
                           (
                               6371 * acos(
                                   least(1.0, greatest(-1.0,
                                       cos(radians($1)) * cos(radians(u.latitude)) * 
                                       cos(radians(u.longitude) - radians($2)) + 
                                       sin(radians($1)) * sin(radians(u.latitude))
                                   ))
                               )
                           ) as distance_km
                    FROM agent_profiles ap
                    JOIN users u ON ap.user_id = u.id
                    WHERE u.status = 'ACTIVE' 
                      AND u.latitude IS NOT NULL 
                      AND u.longitude IS NOT NULL
                      AND (
                           6371 * acos(
                               least(1.0, greatest(-1.0,
                                   cos(radians($1)) * cos(radians(u.latitude)) * 
                                   cos(radians(u.longitude) - radians($2)) + 
                                   sin(radians($1)) * sin(radians(u.latitude))
                               ))
                           )
                       ) <= ap.service_radius_km
                    ORDER BY distance_km ASC
                    LIMIT 1
                    """,
                    prop["latitude"],
                    prop["longitude"]
                )
                
                if not agent:
                    return {
                        "success": False,
                        "error": "No agents available at this time. Please try again later.",
                        "code": 400
                    }
                
                # Create assignment request
                assignment_id = await conn.fetchval(
                    """
                    INSERT INTO agent_assignments (property_id, agent_id, status)
                    VALUES ($1, $2, 'REQUESTED')
                    RETURNING id
                    """,
                    property_id,
                    agent["user_id"]
                )
                
                # Transition property to PENDING_ASSIGNMENT
                await conn.execute(
                    """
                    UPDATE properties
                    SET status = 'PENDING_ASSIGNMENT', submitted_at = NOW()
                    WHERE id = $1
                    """,
                    property_id
                )
                
                # Audit log
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_REQUESTED', 'agent_assignments', $2, $3, $4)
                    """,
                    seller_id,
                    assignment_id,
                    ip_address,
                    f'{{"property_id": "{property_id}", "agent_id": "{agent["user_id"]}"}}'
                )
                
                return {
                    "success": True,
                    "assignment_id": str(assignment_id),
                    "agent_name": agent["full_name"],
                    "new_status": "PENDING_ASSIGNMENT"
                }
    
    # ========================================================================
    # AGENT QUERIES
    # ========================================================================
    
    async def get_agent_assignments(
        self,
        agent_id: UUID,
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get list of assignments for an agent.
        
        Returns:
        - pending: assignments awaiting response (REQUESTED)
        - active: accepted and in progress
        - completed: finished assignments
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build WHERE clause
            conditions = ["aa.agent_id = $1"]
            params: List = [agent_id]
            param_idx = 2
            
            if status_filter:
                if status_filter == "pending":
                    conditions.append("aa.status = 'REQUESTED'")
                elif status_filter == "active":
                    conditions.append("aa.status = 'ACCEPTED'")
                elif status_filter == "completed":
                    conditions.append("aa.status IN ('COMPLETED', 'DECLINED', 'CANCELLED')")
            
            where_clause = " AND ".join(conditions)
            
            # Count total
            total = await conn.fetchval(
                f"""
                SELECT COUNT(*) FROM agent_assignments aa
                WHERE {where_clause}
                """,
                *params
            )
            
            # Get assignments with property data
            params.extend([per_page, offset])
            rows = await conn.fetch(
                f"""
                SELECT 
                    aa.id, aa.status::text, aa.requested_at, aa.responded_at,
                    p.id as property_id, p.title, p.type::text, p.price,
                    p.city, p.status::text as property_status,
                    u.full_name as seller_name, u.email as seller_email,
                    (SELECT file_url FROM property_media 
                     WHERE property_id = p.id AND is_primary = true AND deleted_at IS NULL 
                     LIMIT 1) as thumbnail_url
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                JOIN users u ON p.seller_id = u.id
                WHERE {where_clause}
                ORDER BY aa.requested_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
                """,
                *params
            )
            
            assignments = []
            for row in rows:
                assignments.append({
                    "id": str(row["id"]),
                    "status": row["status"],
                    "requested_at": row["requested_at"].isoformat(),
                    "responded_at": row["responded_at"].isoformat() if row["responded_at"] else None,
                    "property": {
                        "id": str(row["property_id"]),
                        "title": row["title"],
                        "type": row["type"],
                        "price": float(row["price"]) if row["price"] else None,
                        "city": row["city"],
                        "status": row["property_status"],
                        "thumbnail_url": row["thumbnail_url"]
                    },
                    "seller": {
                        "name": row["seller_name"],
                        "email": row["seller_email"]
                    }
                })
            
            return {
                "success": True,
                "assignments": assignments,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page if total > 0 else 0,
                    "has_more": (page * per_page) < total
                }
            }
    
    async def get_assignment_detail(
        self,
        assignment_id: UUID,
        agent_id: UUID
    ) -> Dict[str, Any]:
        """Get detailed assignment info for agent view."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    aa.id, aa.status::text, aa.requested_at, aa.responded_at,
                    aa.decline_reason,
                    p.id as property_id, p.title, p.description, p.type::text, 
                    p.price, p.city, p.state, p.pincode, p.address,
                    p.latitude, p.longitude, p.bedrooms, p.bathrooms, p.area_sqft,
                    p.status::text as property_status,
                    u.id as seller_id, u.full_name as seller_name, 
                    u.email as seller_email, u.mobile_number as seller_phone
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                JOIN users u ON p.seller_id = u.id
                WHERE aa.id = $1 AND aa.agent_id = $2
                """,
                assignment_id,
                agent_id
            )
            
            if not row:
                return {"success": False, "error": "Assignment not found", "code": 404}
            
            # Get property media
            media = await conn.fetch(
                """
                SELECT id, file_url, is_primary, display_order
                FROM property_media
                WHERE property_id = $1 AND deleted_at IS NULL
                ORDER BY is_primary DESC, display_order
                """,
                row["property_id"]
            )
            
            return {
                "success": True,
                "assignment": {
                    "id": str(row["id"]),
                    "status": row["status"],
                    "requested_at": row["requested_at"].isoformat(),
                    "responded_at": row["responded_at"].isoformat() if row["responded_at"] else None,
                    "decline_reason": row["decline_reason"],
                    "property": {
                        "id": str(row["property_id"]),
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
                        "status": row["property_status"],
                        "media": [
                            {
                                "id": str(m["id"]),
                                "file_url": m["file_url"],
                                "is_primary": m["is_primary"]
                            }
                            for m in media
                        ]
                    },
                    "seller": {
                        "id": str(row["seller_id"]),
                        "name": row["seller_name"],
                        "email": row["seller_email"],
                        "phone": row["seller_phone"]
                    }
                }
            }
    
    # ========================================================================
    # AGENT ACTIONS
    # ========================================================================
    
    async def accept_assignment(
        self,
        assignment_id: UUID,
        agent_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent accepts an assignment.
        
        Transitions:
        - Assignment: REQUESTED → ACCEPTED
        - Property: PENDING_ASSIGNMENT → ASSIGNED
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Get assignment
                row = await conn.fetchrow(
                    """
                    SELECT aa.id, aa.status::text, aa.property_id, p.status::text as prop_status
                    FROM agent_assignments aa
                    JOIN properties p ON aa.property_id = p.id
                    WHERE aa.id = $1 AND aa.agent_id = $2
                    """,
                    assignment_id,
                    agent_id
                )
                
                if not row:
                    return {"success": False, "error": "Assignment not found", "code": 404}
                
                if row["status"] != "REQUESTED":
                    return {
                        "success": False,
                        "error": f"Cannot accept assignment in {row['status']} state",
                        "code": 400
                    }
                
                # Update assignment
                await conn.execute(
                    """
                    UPDATE agent_assignments
                    SET status = 'ACCEPTED', responded_at = NOW()
                    WHERE id = $1
                    """,
                    assignment_id
                )
                
                # Update property
                await conn.execute(
                    """
                    UPDATE properties
                    SET status = 'ASSIGNED'
                    WHERE id = $1
                    """,
                    row["property_id"]
                )
                
                # Audit log
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'ASSIGNMENT_ACCEPTED', 'agent_assignments', $2, $3, $4)
                    """,
                    agent_id,
                    assignment_id,
                    ip_address,
                    f'{{"property_id": "{row["property_id"]}"}}'
                )
                
                return {
                    "success": True,
                    "new_status": "ACCEPTED",
                    "property_status": "ASSIGNED"
                }
    
    async def decline_assignment(
        self,
        assignment_id: UUID,
        agent_id: UUID,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent declines an assignment.
        
        Transitions:
        - Assignment: REQUESTED → DECLINED
        - Property: PENDING_ASSIGNMENT → DRAFT (seller can modify and retry)
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    SELECT aa.id, aa.status::text, aa.property_id
                    FROM agent_assignments aa
                    WHERE aa.id = $1 AND aa.agent_id = $2
                    """,
                    assignment_id,
                    agent_id
                )
                
                if not row:
                    return {"success": False, "error": "Assignment not found", "code": 404}
                
                if row["status"] != "REQUESTED":
                    return {
                        "success": False,
                        "error": f"Cannot decline assignment in {row['status']} state",
                        "code": 400
                    }
                
                # Update assignment
                await conn.execute(
                    """
                    UPDATE agent_assignments
                    SET status = 'DECLINED', responded_at = NOW(), decline_reason = $2
                    WHERE id = $1
                    """,
                    assignment_id,
                    reason
                )
                
                # Return property to DRAFT so seller can modify
                await conn.execute(
                    """
                    UPDATE properties
                    SET status = 'DRAFT'
                    WHERE id = $1
                    """,
                    row["property_id"]
                )
                
                # Audit log
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'ASSIGNMENT_DECLINED', 'agent_assignments', $2, $3, $4)
                    """,
                    agent_id,
                    assignment_id,
                    ip_address,
                    f'{{"property_id": "{row["property_id"]}", "reason": "{reason or ""}"}}'
                )
                
                return {
                    "success": True,
                    "new_status": "DECLINED"
                }
    
                return {
                    "success": True,
                    "new_status": "DECLINED"
                }
    
    # ========================================================================
    # VERIFICATION WORKFLOW
    # ========================================================================
    
    def _hash_otp(self, otp: str) -> str:
        """Hash OTP for storage."""
        return hashlib.sha256(otp.encode()).hexdigest()

    async def generate_verification_otp(
        self,
        assignment_id: UUID,
        agent_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate and send OTP to seller.
        """
        async with self.db.acquire() as conn:
            # check assignment and get seller details
            row = await conn.fetchrow(
                """
                SELECT aa.id, aa.property_id, p.seller_id, u.email, u.full_name
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                JOIN users u ON p.seller_id = u.id
                WHERE aa.id = $1 AND aa.agent_id = $2
                """,
                assignment_id,
                agent_id
            )
            
            if not row:
                return {"success": False, "error": "Assignment not found", "code": 404}
            
            # Get pending verification
            verification_id = await conn.fetchval(
                """
                SELECT id FROM property_verifications
                WHERE property_id = $1 AND agent_id = $2 AND completed_at IS NULL
                ORDER BY started_at DESC LIMIT 1
                """,
                row["property_id"],
                agent_id
            )
            
            if not verification_id:
                return {"success": False, "error": "Verification not started", "code": 400}
            
            # Generate OTP
            otp_code = secrets.token_hex(3).upper() # 6 chars
            otp_hash = self._hash_otp(otp_code)
            
            # Save to DB
            await conn.execute(
                """
                UPDATE property_verifications
                SET otp_code = $2, otp_expires_at = NOW() + INTERVAL '15 minutes', seller_otp_verified = false
                WHERE id = $1
                """,
                verification_id,
                otp_hash
            )
            
            # Send Notification (Email + In-App)
            # 1. In-App
            notif_service = NotificationsService(self.db)
            await notif_service.create_notification(
                user_id=row["seller_id"],
                notification_type="VERIFICATION_OTP",
                title="Property Verification OTP",
                body=f"Your verification code is: {otp_code}. Provide this to the agent on-site.",
                link=f"/seller/properties/{row['property_id']}"
            )
            
            # 2. Email (Mocked logging for now, integration would go here)
            print(f"[OTP SERVICE] Sent OTP {otp_code} to {row['email']}")
            
            return {"success": True}

    async def verify_seller_otp(
        self,
        assignment_id: UUID,
        agent_id: UUID,
        otp_code: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify the OTP provided by seller.
        """
        async with self.db.acquire() as conn:
            # Get pending verification
            row = await conn.fetchrow(
                """
                SELECT pv.id, pv.otp_code, pv.otp_expires_at
                FROM property_verifications pv
                JOIN agent_assignments aa ON pv.property_id = aa.property_id
                WHERE aa.id = $1 AND aa.agent_id = $2 AND pv.completed_at IS NULL
                ORDER BY pv.started_at DESC LIMIT 1
                """,
                assignment_id,
                agent_id
            )
            
            if not row:
                return {"success": False, "error": "Verification session not found", "code": 404}
            
            if not row["otp_code"]:
                return {"success": False, "error": "No OTP generated", "code": 400}
            
            # Check expiry
            if row["otp_expires_at"] < datetime.now(timezone.utc).replace(tzinfo=None): # naive comparison if db returns naive
                 # Correction: asyncpg returns offset-aware if configured or naive. 
                 # Let's rely on DB or ensure both are compatible. 
                 # Safest: Let DB check validity or use simple comparison if we trust server time.
                 pass

            # Check Hash
            if self._hash_otp(otp_code) != row["otp_code"]:
                 return {"success": False, "error": "Invalid OTP", "code": 400}

            # Check Expiry (Python side safe check)
            # Assuming row['otp_expires_at'] is naive if DB timezone is UTC
            # or aware. We will just check basic timestamp.
            # actually better: check in SQL update command
            
            result = await conn.execute(
                """
                UPDATE property_verifications
                SET seller_otp_verified = true, seller_otp_verified_at = NOW()
                WHERE id = $1 AND otp_expires_at > NOW()
                """,
                row["id"]
            )
            
            if "0" in result: # UPDATE 0
                return {"success": False, "error": "OTP expired or invalid", "code": 400}
            
            return {"success": True}
    
    async def start_verification(
        self,
        assignment_id: UUID,
        agent_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent starts verification process.
        
        Transitions property: ASSIGNED → VERIFICATION_IN_PROGRESS
        Creates verification record.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    SELECT aa.id, aa.status::text, aa.property_id, p.status::text as prop_status
                    FROM agent_assignments aa
                    JOIN properties p ON aa.property_id = p.id
                    WHERE aa.id = $1 AND aa.agent_id = $2
                    """,
                    assignment_id,
                    agent_id
                )
                
                if not row:
                    return {"success": False, "error": "Assignment not found", "code": 404}
                
                if row["status"] != "ACCEPTED":
                    return {
                        "success": False,
                        "error": "Must accept assignment before starting verification",
                        "code": 400
                    }
                
                if row["prop_status"] != "ASSIGNED":
                    return {
                        "success": False,
                        "error": f"Property in unexpected state: {row['prop_status']}",
                        "code": 400
                    }
                
                # Create verification record
                verification_id = await conn.fetchval(
                    """
                    INSERT INTO property_verifications (property_id, agent_id)
                    VALUES ($1, $2)
                    RETURNING id
                    """,
                    row["property_id"],
                    agent_id
                )
                
                # Update property status
                await conn.execute(
                    """
                    UPDATE properties
                    SET status = 'VERIFICATION_IN_PROGRESS'
                    WHERE id = $1
                    """,
                    row["property_id"]
                )
                
                return {
                    "success": True,
                    "verification_id": str(verification_id),
                    "property_status": "VERIFICATION_IN_PROGRESS"
                }
    
    async def complete_verification(
        self,
        assignment_id: UUID,
        agent_id: UUID,
        approved: bool,
        gps_lat: Optional[float] = None,
        gps_lng: Optional[float] = None,
        notes: Optional[str] = None,
        rejection_reason: Optional[str] = None,
        checklist: Optional[dict] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete verification with result.
        
        If approved:
        - Property: VERIFICATION_IN_PROGRESS → ACTIVE
        - Assignment: ACCEPTED → COMPLETED
        
        If rejected:
        - Property: VERIFICATION_IN_PROGRESS → ASSIGNED (can retry)
        - Verification record updated with reason
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    SELECT aa.id, aa.property_id, p.status::text as prop_status
                    FROM agent_assignments aa
                    JOIN properties p ON aa.property_id = p.id
                    WHERE aa.id = $1 AND aa.agent_id = $2 AND aa.status = 'ACCEPTED'
                    """,
                    assignment_id,
                    agent_id
                )
                
                if not row:
                    return {"success": False, "error": "Active assignment not found", "code": 404}
                
                if row["prop_status"] != "VERIFICATION_IN_PROGRESS":
                    return {
                        "success": False,
                        "error": "Verification not started",
                        "code": 400
                    }
                
                # Get pending verification
                verification = await conn.fetchrow(
                    """
                    SELECT id FROM property_verifications
                    WHERE property_id = $1 AND agent_id = $2 AND completed_at IS NULL
                    ORDER BY started_at DESC LIMIT 1
                    """,
                    row["property_id"],
                    agent_id
                )
                
                if not verification:
                    return {"success": False, "error": "No pending verification found", "code": 400}
                
                result = "APPROVED" if approved else "REJECTED"
                
                # Update verification record
                await conn.execute(
                    """
                    UPDATE property_verifications
                    SET completed_at = NOW(),
                        result = $2::verification_result,
                        agent_gps_lat = $3::double precision,
                        agent_gps_lng = $4::double precision,
                        notes = $5::text,
                        rejection_reason = $6::text,
                        checklist = $7::jsonb,
                        gps_verified_at = CASE WHEN $3::double precision IS NOT NULL THEN NOW() ELSE NULL END
                    WHERE id = $1
                    """,
                    verification["id"],
                    result,
                    gps_lat,
                    gps_lng,
                    notes,
                    rejection_reason,
                    json.dumps(checklist) if checklist else None
                )

                
                if approved:
                    # Property goes ACTIVE
                    await conn.execute(
                        """
                        UPDATE properties
                        SET status = 'ACTIVE', verified_at = NOW()
                        WHERE id = $1
                        """,
                        row["property_id"]
                    )
                    
                    # Assignment remains ACCEPTED (Active) so agent can track it
                    # We do NOT set it to COMPLETED here.
                    
                    new_prop_status = "ACTIVE"
                    new_assign_status = "ACCEPTED"
                else:
                    # Return to ASSIGNED for retry
                    await conn.execute(
                        """
                        UPDATE properties SET status = 'ASSIGNED' WHERE id = $1
                        """,
                        row["property_id"]
                    )
                    new_prop_status = "ASSIGNED"
                    new_assign_status = "ACCEPTED"
                
                return {
                    "success": True,
                    "result": result,
                    "property_status": new_prop_status,
                    "assignment_status": new_assign_status
                }

    # ========================================================================
    # NEW ANALYTICS & CRM FEATURES
    # ========================================================================

    async def get_agent_analytics(self, agent_id: UUID, period: str = "month") -> Dict[str, Any]:
        """
        Get comprehensive analytics for agent performance from DB.
        """
        async with self.db.acquire() as conn:
            # 1. Overview Stats & KPIs
            stats = await conn.fetchrow(
                """
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_deals,
                    COUNT(*) FILTER (WHERE status = 'ACCEPTED') as active_deals,
                    COUNT(*) FILTER (WHERE status = 'REQUESTED') as pending_requests,
                    COUNT(*) as total_assignments
                FROM agent_assignments
                WHERE agent_id = $1
                """,
                agent_id
            )
            
            # 2. Financials (Total Earnings & Avg Deal Size)
            financials = await conn.fetchrow(
                """
                SELECT 
                    COALESCE(SUM(p.price * 0.01), 0) as total_earnings,
                    COALESCE(AVG(p.price), 0) as avg_property_price
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                WHERE aa.agent_id = $1 AND aa.status = 'COMPLETED'
                """,
                agent_id
            )

            # Calculation: Conversion Rate (Completed / Total Assignments) * 100
            total_cases = stats["total_assignments"]
            conversion_rate = 0.0
            if total_cases > 0:
                conversion_rate = (stats["completed_deals"] / total_cases) * 100

            # 3. Time Series Data (Deals & Earnings)
            deals_series = await conn.fetch("""
                SELECT 
                    TO_CHAR(aa.completed_at, 'Mon') as name,
                    DATE_TRUNC('month', aa.completed_at) as date_month,
                    COUNT(*) as deals,
                    COALESCE(SUM(p.price * 0.01), 0) as earnings
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                WHERE aa.agent_id = $1 AND aa.status = 'COMPLETED'
                AND aa.completed_at > NOW() - INTERVAL '6 months'
                GROUP BY 1, 2
            """, agent_id)

            # 4. Visit Stats (for Chart)
            # Use naive dates for visit_requests query if needed, but here we group by month so safe
            visits_series = await conn.fetch("""
                SELECT 
                    TO_CHAR(preferred_date, 'Mon') as name,
                    DATE_TRUNC('month', preferred_date) as date_month,
                    COUNT(*) as visits
                FROM visit_requests
                WHERE agent_id = $1
                AND preferred_date > NOW() - INTERVAL '6 months'
                GROUP BY 1, 2
            """, agent_id)

            # Merge Series
            data_map = {}
            # Initialize with last 6 months to ensure continuity? 
            # For now, just sparse merge
            for row in deals_series:
                m = row["name"]
                if m not in data_map: data_map[m] = {"name": m, "deals": 0, "earnings": 0, "visits": 0, "sort_key": row["date_month"]}
                data_map[m]["deals"] = row["deals"]
                data_map[m]["earnings"] = float(row["earnings"])

            for row in visits_series:
                m = row["name"]
                if m not in data_map: data_map[m] = {"name": m, "deals": 0, "earnings": 0, "visits": 0, "sort_key": row["date_month"]}
                data_map[m]["visits"] = row["visits"]

            # Sort by date
            chart_data = sorted(data_map.values(), key=lambda x: x["sort_key"])
            # Remove sort_key before sending
            for item in chart_data:
                del item["sort_key"]
            
            # 5. Portfolio Distribution (Property Types)
            portfolio_dist = await conn.fetch("""
                SELECT p.type, COUNT(*) as count
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                WHERE aa.agent_id = $1 AND aa.status IN ('ACCEPTED', 'COMPLETED')
                GROUP BY p.type
            """, agent_id)
            
            portfolio_data = [{"name": row["type"], "value": row["count"]} for row in portfolio_dist]

            return {
                "success": True,
                "overview": {
                    "completed_deals": stats["completed_deals"],
                    "active_deals": stats["active_deals"],
                    "pending_requests": stats["pending_requests"],
                    "total_earnings": float(financials["total_earnings"]),
                    "conversion_rate": round(conversion_rate, 1),
                    "avg_deal_size": float(financials["avg_property_price"])
                },
                "chart_data": chart_data,
                "portfolio_data": portfolio_data
            }

    async def get_agent_crm_leads(self, agent_id: UUID) -> Dict[str, Any]:
        """
        Get CRM leads (Sellers and potential Buyers) from DB.
        """
        async with self.db.acquire() as conn:
            # 1. Sellers (from assignments)
            # agent_assignments has no updated_at, using COALESCE(completed_at, responded_at, requested_at)
            sellers = await conn.fetch(
                """
                SELECT DISTINCT u.id, u.full_name, u.email, u.mobile_number, 
                       'SELLER' as type, aa.status as deal_stage,
                       p.title as property_interest, 
                       COALESCE(aa.completed_at, aa.responded_at, aa.requested_at) as last_interaction
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                JOIN users u ON p.seller_id = u.id
                WHERE aa.agent_id = $1
                """,
                agent_id
            )
            
            # 2. Buyers (from visit requests)
            # visit_requests HAS updated_at
            buyers = await conn.fetch(
                """
                SELECT DISTINCT u.id, u.full_name, u.email, u.mobile_number,
                       'BUYER' as type, vr.status as deal_stage,
                       p.title as property_interest, vr.updated_at as last_interaction
                FROM visit_requests vr
                JOIN properties p ON vr.property_id = p.id
                JOIN users u ON vr.buyer_id = u.id
                WHERE vr.agent_id = $1
                """,
                agent_id
            )
            
            leads = []
            for row in sellers + buyers:
                leads.append({
                    "id": str(row["id"]),
                    "name": row["full_name"],
                    "email": row["email"],
                    "phone": row["mobile_number"],
                    "type": row["type"],
                    "stage": row["deal_stage"],
                    "interest": row["property_interest"],
                    "last_contact": row["last_interaction"].strftime("%Y-%m-%d") if row["last_interaction"] else "N/A"
                })
                
            return {
                "success": True,
                "leads": leads
            }

    async def get_agent_insights(self, agent_id: UUID) -> Dict[str, Any]:
        """
        Get real insights based on DB state.
        """
        async with self.db.acquire() as conn:
            insights = []
            
            # Insight 1: Pending Verifications
            # Fix: PENDING_VERIFICATION is not a valid enum value. Use ASSIGNED or VERIFICATION_IN_PROGRESS.
            pending_verifications = await conn.fetchval("""
                SELECT COUNT(*) 
                FROM agent_assignments aa
                JOIN properties p ON aa.property_id = p.id
                WHERE aa.agent_id = $1 AND aa.status = 'ACCEPTED' 
                AND p.status IN ('ASSIGNED', 'VERIFICATION_IN_PROGRESS')
            """, agent_id)
            
            if pending_verifications > 0:
                insights.append({
                    "id": "ins_ver",
                    "type": "warning",
                    "title": "Pending Verifications",
                    "description": f"You have {pending_verifications} properties waiting for verification.",
                    "action": "View Assignments"
                })

            # Insight 2: Pending Visits
            pending_visits = await conn.fetchval("""
                SELECT COUNT(*) FROM visit_requests 
                WHERE agent_id = $1 AND status = 'REQUESTED'
            """, agent_id)
            
            if pending_visits > 0:
                insights.append({
                    "id": "ins_vis",
                    "type": "info",
                    "title": "New Visit Requests",
                    "description": f"You have {pending_visits} new buyer visit requests to review.",
                    "action": "Open Calendar"
                })

            # Insight 3: Pending Offers
            # Need to join offers with assignments
            pending_offers = await conn.fetchval("""
                SELECT COUNT(*) 
                FROM offers o
                JOIN agent_assignments aa ON aa.property_id = o.property_id
                WHERE aa.agent_id = $1 AND aa.status = 'ACCEPTED' AND o.status = 'PENDING'
            """, agent_id)
            
            if pending_offers > 0:
                insights.append({
                    "id": "ins_off",
                    "type": "opportunity",
                    "title": "Active Offers",
                    "description": f"There are {pending_offers} pending offers on your properties.",
                    "action": "Negotiations"
                })

        return {
            "success": True,
            "insights": insights
        }

    # ========================================================================
    # PHASE 2: CALENDAR & MARKETING
    # ========================================================================

    from datetime import datetime, timezone

    async def get_agent_schedule(self, agent_id: UUID, start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Get composite schedule (Visits + Tasks + Verifications).
        """
        async with self.db.acquire() as conn:
            # Helper to ensure timezone awareness
            def parse_date(date_str: str):
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt

            start_dt_aware = parse_date(start_date)
            end_dt_aware = parse_date(end_date)
            
            # For table 'visit_requests', the 'preferred_date' column is TIMESTAMP without time zone.
            # We must pass naive datetimes to avoid asyncpg encoding errors.
            # Convert UTC aware to naive (representing UTC keys)
            start_dt_naive = start_dt_aware.astimezone(timezone.utc).replace(tzinfo=None)
            end_dt_naive = end_dt_aware.astimezone(timezone.utc).replace(tzinfo=None)

            # 1. Custom Events from agent_schedule_events (TIMESTAMP WITH TIME ZONE) - Use Aware keys
            custom_events = await conn.fetch("""
                SELECT id, title, start_time, event_type, color
                FROM agent_schedule_events
                WHERE agent_id = $1 AND start_time >= $2 AND start_time <= $3
            """, agent_id, start_dt_aware, end_dt_aware)
            
            # 2. Visit Requests (TIMESTAMP WITHOUT TIME ZONE) - Use Naive keys
            visits = await conn.fetch("""
                SELECT vr.id, p.title as property_title, vr.preferred_date, vr.status
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.agent_id = $1 
                AND vr.preferred_date >= $2 AND vr.preferred_date <= $3
                AND vr.status IN ('APPROVED', 'CHECKED_IN', 'COMPLETED')
            """, agent_id, start_dt_naive, end_dt_naive)
            
            # 3. Pending Verifications (Assignments)
            verifications = await conn.fetch("""
                SELECT aa.id, p.title as property_title, aa.requested_at
                FROM agent_assignments aa
                JOIN properties p ON p.id = aa.property_id
                WHERE aa.agent_id = $1 
                AND aa.status = 'ACCEPTED' AND p.status IN ('ASSIGNED', 'VERIFICATION_IN_PROGRESS')
            """, agent_id)

            events = []
            
            for evt in custom_events:
                events.append({
                    "id": str(evt['id']),
                    "title": evt['title'],
                    "start": evt['start_time'].isoformat(),
                    "allDay": False,
                    "type": evt['event_type'],
                    "color": evt['color']
                })
                
            for v in visits:
                events.append({
                    "id": str(v['id']),
                    "title": f"Visit: {v['property_title']}",
                    "start": v['preferred_date'].isoformat(),
                    "allDay": False,
                    "type": "visit",
                    "color": "#10B981" if v['status'] == 'APPROVED' else "#6B7280"
                })

            for ver in verifications:
                events.append({
                    "id": str(ver['id']),
                    "title": f"Verify: {ver['property_title']}",
                    "start": ver['requested_at'].isoformat(), # Just a placeholder date
                    "allDay": True,
                    "type": "verification",
                    "color": "#8B5CF6"
                })
                
            return {
                "success": True,
                "events": events
            }

    async def generate_marketing_asset(
        self, 
        agent_id: UUID, 
        property_id: UUID, 
        template_id: str,
        custom_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a marketing asset and save to history.
        """
        async with self.db.acquire() as conn:
            # Get property title for placeholder
            prop = await conn.fetchrow("SELECT title FROM properties WHERE id = $1", property_id)
            prop_title = prop['title'] if prop else 'Property'
            
            accent_color = custom_options.get("accentColor", "000000").replace("#", "") if custom_options else "000000"
            # In a real app, we would call an image generation service here
            # For now, we generate a URL that "looks" real but is generated on the fly via placeholder service
            mock_url = f"https://placehold.co/600x800/{accent_color}/FFF?text={prop_title.replace(' ', '+')}"
            
            # Save to history
            asset_row = await conn.fetchrow("""
                INSERT INTO marketing_history (
                    agent_id, property_id, template_id, template_name, asset_url, asset_type
                ) VALUES ($1, $2, $3, $4, $5, 'flyer')
                RETURNING id, generated_at
            """, agent_id, property_id, template_id, f"Template {template_id}", mock_url)
            
            return {
                "success": True,
                "asset_url": mock_url,
                "type": "flyer",
                "generated_at": asset_row['generated_at'].isoformat()
            }

    async def get_marketing_history(self, agent_id: UUID) -> Dict[str, Any]:
        """
        Get history of generated assets from DB.
        """
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT mh.id, mh.template_name, mh.generated_at, mh.asset_url, 
                       p.title as property_title
                FROM marketing_history mh
                LEFT JOIN properties p ON p.id = mh.property_id
                WHERE mh.agent_id = $1
                ORDER BY mh.generated_at DESC
            """, agent_id)
            
            history = [
                {
                    "id": str(r['id']),
                    "property_title": r['property_title'] or 'Unknown Property',
                    "template_name": r['template_name'],
                    "generated_at": r['generated_at'].isoformat(),
                    "url": r['asset_url']
                }
                for r in rows
            ]
            
            return {
                "success": True,
                "history": history
            }

    async def create_schedule_event(self, agent_id: UUID, title: str, start: str, type: str) -> Dict[str, Any]:
        """
        Create a new calendar event in DB.
        """
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO agent_schedule_events (agent_id, title, start_time, event_type, color)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, title, start_time, event_type, color
            """, agent_id, title, datetime.fromisoformat(start.replace('Z', '+00:00')), type, '#6366F1')
            
            new_event = {
                "id": str(row['id']),
                "title": row['title'],
                "start": row['start_time'].isoformat(),
                "allDay": False,
                "type": row['event_type'],
                "color": row['color']
            }
            return {
                "success": True,
                "event": new_event
            }

    async def delete_schedule_event(self, agent_id: UUID, event_id: str) -> Dict[str, Any]:
        """
        Delete a calendar event from DB.
        """
        async with self.db.acquire() as conn:
            # Ensure it belongs to the agent
            await conn.execute("""
                DELETE FROM agent_schedule_events 
                WHERE id = $1 AND agent_id = $2
            """, UUID(event_id), agent_id)
            return {"success": True}

    async def get_marketing_templates(self) -> Dict[str, Any]:
        """
        Get available marketing templates.
        """
        templates = [
            {
                "id": "flyer-modern",
                "name": "Modern Flyer",
                "type": "flyer",
                "thumbnail": "https://placehold.co/200x300/png?text=Modern"
            },
            {
                "id": "flyer-classic",
                "name": "Classic Flyer",
                "type": "flyer",
                "thumbnail": "https://placehold.co/200x300/png?text=Classic"
            },
            {
                "id": "social-story",
                "name": "Instagram Story",
                "type": "social_story",
                "thumbnail": "https://placehold.co/200x350/png?text=Story"
            }
        ]
        
        return {
            "success": True,
            "templates": templates
        }

    async def manage_visit_action(self, agent_id: UUID, visit_id: str, action: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Handle visit actions: check-in, complete. 
        Note: approve/reject are handled by dedicated VisitService methods, but we support simple status updates here for the modal.
        """
        async with self.db.acquire() as conn:
            # Map action keywords to DB status
            # action: 'check_in' -> status: 'CHECKED_IN'
            # action: 'complete' -> status: 'COMPLETED'
            
            new_status = None
            if action == 'check_in':
                new_status = 'CHECKED_IN'
                # For check-in, we usually want GPS data, but for this simplified "Action" button from calendar, 
                # we might be skipping GPS verification or assuming it happens client-side.
                # Ideally, this should call VisitService.check_in, but for now we update status directly for the 'Action Modal' workflow.
                
            elif action == 'complete':
                new_status = 'COMPLETED'
            
            if not new_status:
                return {"success": False, "error": "Invalid action"}

            # Update DB
            await conn.execute("""
                UPDATE visit_requests
                SET status = $1::visit_status, updated_at = NOW()
                WHERE id = $2 AND agent_id = $3
            """, new_status, UUID(visit_id), agent_id)
            
            return {
                "success": True,
                "new_status": new_status,
                "visit_id": visit_id
            }

    async def get_agent_offers(self, agent_id: UUID) -> Dict[str, Any]:
        """
        Get active offers for agent's properties from DB.
        """
        async with self.db.acquire() as conn:
            # Select offers for properties assigned to this agent
            # We filter by properties where this agent is assigned currently
            rows = await conn.fetch("""
                SELECT o.id, o.property_id, p.title as property_title, 
                       u.full_name as buyer_name, o.offered_price, p.price as asking_price,
                       o.status, o.counter_price, o.created_at,
                       (SELECT file_url FROM property_media WHERE property_id = p.id AND is_primary = true LIMIT 1) as thumbnail
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                JOIN users u ON u.id = o.buyer_id
                JOIN agent_assignments aa ON aa.property_id = p.id
                WHERE aa.agent_id = $1 AND aa.status = 'ACCEPTED'
                AND o.status IN ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED')
                ORDER BY o.created_at DESC
            """, agent_id)

            offers = []
            for r in rows:
                offers.append({
                    "id": str(r['id']),
                    "property_id": str(r['property_id']),
                    "property_title": r['property_title'],
                    "property_thumbnail": r['thumbnail'] or "",
                    "buyer_name": r['buyer_name'],
                    "offer_amount": float(r['offered_price']),
                    "asking_price": float(r['asking_price'] or 0),
                    "status": r['status'],
                    "counter_amount": float(r['counter_price']) if r['counter_price'] else None,
                    "submitted_at": r['created_at'].isoformat()
                })

            return {
                "success": True,
                "offers": offers
            }

    async def manage_offer_action(self, agent_id: UUID, offer_id: str, action: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """
        Handle offer actions: accept, reject, counter in DB.
        """
        async with self.db.acquire() as conn:
            # Verify agent permissions via property assignment
            offer = await conn.fetchrow("""
                SELECT o.*, aa.agent_id 
                FROM offers o
                JOIN agent_assignments aa ON aa.property_id = o.property_id
                WHERE o.id = $1 AND aa.agent_id = $2 AND aa.status = 'ACCEPTED'
            """, UUID(offer_id), agent_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found or access denied"}
            
            new_status = None
            update_query = ""
            params = []
            
            if action == 'accept':
                new_status = 'ACCEPTED'
                update_query = "UPDATE offers SET status = 'ACCEPTED', responded_at = NOW() WHERE id = $1"
                params = [UUID(offer_id)]
            elif action == 'reject':
                new_status = 'REJECTED'
                update_query = "UPDATE offers SET status = 'REJECTED', responded_at = NOW() WHERE id = $1"
                params = [UUID(offer_id)]
            elif action == 'counter':
                if not amount:
                    return {"success": False, "error": "Counter amount required"}
                new_status = 'COUNTERED'
                update_query = "UPDATE offers SET status = 'COUNTERED', counter_price = $2, responded_at = NOW() WHERE id = $1"
                params = [UUID(offer_id), amount]
            else:
                return {"success": False, "error": "Invalid action"}
                
            await conn.execute(update_query, *params)
            
            return {
                "success": True,
                "new_status": new_status,
                "offer_id": offer_id,
                "amount": amount
            }
