"""
Visit Service implementing BUYER_VISIT_BOOKING and AGENT_VISIT_EXECUTION workflows.

State Machine:
    REQUESTED → APPROVED/REJECTED
    APPROVED → CHECKED_IN → COMPLETED
    APPROVED → NO_SHOW/CANCELLED
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
import asyncpg
import math

from ..services.notifications_service import NotificationsService


class VisitService:
    """
    Service for managing property visit requests.
    
    Implements buyer visit booking and agent visit execution workflows
    with state machine enforcement.
    """
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        'REQUESTED': ['APPROVED', 'REJECTED', 'CANCELLED', 'COUNTERED'],
        'COUNTERED': ['APPROVED', 'REJECTED', 'CANCELLED', 'COUNTERED'],
        'APPROVED': ['CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
        'CHECKED_IN': ['COMPLETED'],
        'REJECTED': [],
        'COMPLETED': [],
        'NO_SHOW': [],
        'CANCELLED': []
    }
    
    # Display status labels
    DISPLAY_STATUS = {
        'REQUESTED': 'Pending Approval',
        'COUNTERED': 'Counter Offer',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'CHECKED_IN': 'In Progress',
        'COMPLETED': 'Completed',
        'NO_SHOW': 'No Show',
        'CANCELLED': 'Cancelled'
    }
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    def _can_transition(self, current_status: str, new_status: str) -> bool:
        """Check if state transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(current_status, [])
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return self.DISPLAY_STATUS.get(status, status)
    
    def _compute_allowed_actions(self, visit: Dict[str, Any], user_id: Optional[UUID] = None, role: str = None) -> List[str]:
        """Compute allowed actions based on status and role."""
        status = visit['status']
        actions = []
        
        # Determine if user is the one who needs to respond to a counter
        is_counter_recipient = False
        if status == 'COUNTERED' and visit.get('counter_by'):
            # If I am not the one who countered, I can respond
            is_counter_recipient = str(visit['counter_by']) != str(user_id)

        if status == 'REQUESTED':
            if role == 'agent':
                actions.extend(['approve', 'reject', 'counter'])
            if role == 'buyer':
                actions.append('cancel')
        
        elif status == 'COUNTERED':
            if is_counter_recipient:
                actions.extend(['accept_counter', 'reject', 'counter'])
            else:
                # User sent the counter, can only cancel (withdraw)
                actions.append('cancel')
                
        elif status == 'APPROVED':
            if role == 'agent':
                actions.extend(['check_in', 'mark_no_show'])
            if role == 'buyer':
                actions.append('cancel')
        elif status == 'CHECKED_IN':
            if role == 'agent':
                actions.append('complete')
        
        return actions
    
    async def request_visit(
        self,
        property_id: UUID,
        buyer_id: UUID,
        preferred_date: datetime,
        buyer_message: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Buyer requests a visit for a property.
        
        Requirements:
        - Property must be ACTIVE
        - Property must have an assigned agent
        - Preferred date must be in the future
        - No existing pending visit for same buyer/property
        """
        async with self.db.acquire() as conn:
            # Verify property exists and is ACTIVE
            property_row = await conn.fetchrow("""
                SELECT p.id, p.seller_id, p.title, p.status, p.latitude, p.longitude,
                       aa.agent_id
                FROM properties p
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id 
                    AND aa.status IN ('ACCEPTED', 'COMPLETED')
                WHERE p.id = $1 AND p.deleted_at IS NULL
            """, property_id)
            
            if not property_row:
                return {"success": False, "error": "Property not found"}
            
            if property_row['status'] != 'ACTIVE':
                return {
                    "success": False, 
                    "error": f"Property is not available for visits. Current status: {property_row['status']}"
                }
            
            if not property_row['agent_id']:
                return {"success": False, "error": "Property does not have an assigned agent"}
            
            # Buyer cannot visit their own property
            if property_row['seller_id'] == buyer_id:
                return {"success": False, "error": "You cannot request a visit to your own property"}
            
            # Preferred date must be in the future
            now = datetime.now(timezone.utc)
            if preferred_date.tzinfo is None:
                preferred_date = preferred_date.replace(tzinfo=timezone.utc)
            else:
                preferred_date = preferred_date.astimezone(timezone.utc)
            
            if preferred_date <= now:
                return {"success": False, "error": "Preferred date must be in the future"}
            
            # Convert to naive UTC for Postgres TIMESTAMP column
            preferred_date_naive = preferred_date.replace(tzinfo=None)
            now_naive = datetime.now(timezone.utc).replace(tzinfo=None)

            # Check for existing pending visit
            existing = await conn.fetchrow("""
                SELECT id FROM visit_requests
                WHERE property_id = $1 AND buyer_id = $2 
                AND status IN ('REQUESTED', 'APPROVED')
            """, property_id, buyer_id)
            
            if existing:
                return {
                    "success": False, 
                    "error": "You already have a pending visit request for this property"
                }
            
            # Create visit request
            try:
                visit_row = await conn.fetchrow("""
                    INSERT INTO visit_requests (
                        property_id, buyer_id, agent_id, 
                        preferred_date, buyer_message, status,
                        created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, 'REQUESTED', $6, $6)
                    RETURNING id, property_id, buyer_id, agent_id, 
                              preferred_date, status, created_at
                """, property_id, buyer_id, property_row['agent_id'], 
                    preferred_date_naive, buyer_message, now_naive)
                
                # Send notification to agent
                try:
                    notifications_service = NotificationsService(self.db)
                    await notifications_service.create_notification(
                        user_id=property_row['agent_id'],
                        notification_type='VISIT_REQUESTED',
                        title='New Visit Request',
                        message=f'A buyer has requested to visit property: {property_row["title"]}',
                        related_entity_type='visit',
                        related_entity_id=visit_row['id']
                    )
                except Exception:
                    pass  # Don't fail on notification error
                
                return {
                    "success": True,
                    "visit": {
                        "id": str(visit_row['id']),
                        "property_id": str(visit_row['property_id']),
                        "buyer_id": str(visit_row['buyer_id']),
                        "agent_id": str(visit_row['agent_id']),
                        "preferred_date": visit_row['preferred_date'].isoformat(),
                        "status": visit_row['status'],
                        "display_status": self._get_display_status(visit_row['status']),
                        "created_at": visit_row['created_at'].isoformat(),
                        "allowed_actions": self._compute_allowed_actions(
                            dict(visit_row), user_id=buyer_id, role='buyer'
                        )
                    }
                }
                
            except asyncpg.UniqueViolationError:
                return {
                    "success": False,
                    "error": "You already have a pending visit request for this property"
                }
    
    async def get_visits(
        self,
        user_id: UUID,
        role: str,  # 'buyer' or 'agent'
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get list of visits for a user.
        
        - Buyer sees their visit requests
        - Agent sees visits assigned to them
        - Seller sees visits to their properties
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build query based on role
            if role == 'buyer':
                base_query = "vr.buyer_id = $1"
            elif role == 'agent':
                base_query = "vr.agent_id = $1"
            elif role == 'seller':
                # Seller sees visits to properties they own
                base_query = "p.seller_id = $1"
            else:
                return {"success": False, "error": "Invalid role"}
            
            # Add status filter - handle comma-separated values
            params = [user_id]
            if status_filter:
                # Split comma-separated statuses into list
                statuses = [s.strip() for s in status_filter.split(',')]
                base_query += f" AND vr.status::text = ANY(${len(params) + 1})"
                params.append(statuses)
            
            # Get total count (need to join for seller role)
            count_row = await conn.fetchrow(f"""
                SELECT COUNT(*) as total 
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE {base_query}
            """, *params)
            
            # Get visits with property info
            params.extend([per_page, offset])
            visits = await conn.fetch(f"""
                SELECT 
                    vr.id, vr.property_id, vr.buyer_id, vr.agent_id,
                    vr.preferred_date, vr.confirmed_date, vr.status,
                    vr.rejection_reason, vr.buyer_message,
                    vr.counter_date, vr.counter_message, vr.counter_by,
                    vr.created_at, vr.responded_at,
                    p.title as property_title, p.city as property_city,
                    p.latitude as property_lat, p.longitude as property_lng,
                    u.full_name as buyer_name, u.email as buyer_email,
                    agent.full_name as agent_name,
                    (SELECT file_url FROM property_media 
                     WHERE property_id = p.id AND is_primary = true AND deleted_at IS NULL 
                     LIMIT 1) as thumbnail_url
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users u ON u.id = vr.buyer_id
                LEFT JOIN users agent ON agent.id = vr.agent_id
                WHERE {base_query}
                ORDER BY vr.created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """, *params)
            
            is_agent = role == 'agent'
            is_buyer = role == 'buyer'
            is_seller = role == 'seller'
            
            return {
                "success": True,
                "visits": [
                    {
                        "id": str(v['id']),
                        "property_id": str(v['property_id']),
                        "property_title": v['property_title'],
                        "property_city": v['property_city'],
                        "thumbnail_url": v['thumbnail_url'],
                        "buyer_id": str(v['buyer_id']),
                        # Agent sees full buyer info, Seller sees name only, Buyer sees nothing
                        "buyer_name": v['buyer_name'] if (is_agent or is_seller) else None,
                        "buyer_email": v['buyer_email'] if is_agent else None,
                        "agent_id": str(v['agent_id']) if v['agent_id'] else None,
                        "agent_name": v['agent_name'] if is_seller else None,
                        "preferred_date": v['preferred_date'].isoformat() if v['preferred_date'] else None,
                        "confirmed_date": v['confirmed_date'].isoformat() if v['confirmed_date'] else None,
                        "status": v['status'],
                        "display_status": self._get_display_status(v['status']),
                        "rejection_reason": v['rejection_reason'],
                        "buyer_message": v['buyer_message'] if is_agent else None,
                        "counter_date": v['counter_date'].isoformat() if v.get('counter_date') else None,
                        "counter_message": v['counter_message'],
                        "counter_by": str(v['counter_by']) if v.get('counter_by') else None,
                        "created_at": v['created_at'].isoformat(),
                        "responded_at": v['responded_at'].isoformat() if v['responded_at'] else None,
                        "allowed_actions": self._compute_allowed_actions(
                            dict(v), user_id=user_id, role=role
                        )
                    }
                    for v in visits
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": count_row['total'],
                    "total_pages": (count_row['total'] + per_page - 1) // per_page
                }
            }
    
    async def get_visit_by_id(
        self,
        visit_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get visit details. User must be buyer or agent of the visit."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT 
                    vr.*,
                    p.title as property_title, p.city as property_city,
                    p.address as property_address, p.latitude as property_lat,
                    p.longitude as property_lng, p.price as property_price,
                    buyer.full_name as buyer_name, buyer.email as buyer_email,
                    agent.full_name as agent_name
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                JOIN users agent ON agent.id = vr.agent_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            # Check access
            is_buyer = visit['buyer_id'] == user_id
            is_agent = visit['agent_id'] == user_id
            
            if not is_buyer and not is_agent:
                return {"success": False, "error": "Access denied"}
            
            # Get verification data if exists
            verification = await conn.fetchrow("""
                SELECT * FROM visit_verifications WHERE visit_id = $1
            """, visit_id)
            
            return {
                "success": True,
                "visit": {
                    "id": str(visit['id']),
                    "property": {
                        "id": str(visit['property_id']),
                        "title": visit['property_title'],
                        "city": visit['property_city'],
                        "address": visit['property_address'] if is_agent else None,
                        "latitude": visit['property_lat'],
                        "longitude": visit['property_lng'],
                        "price": float(visit['property_price']) if visit['property_price'] else None
                    },
                    "buyer": {
                        "id": str(visit['buyer_id']),
                        "name": visit['buyer_name'],
                        "email": visit['buyer_email'] if is_agent else None
                    },
                    "agent": {
                        "id": str(visit['agent_id']),
                        "name": visit['agent_name']
                    },
                    "preferred_date": visit['preferred_date'].isoformat() if visit['preferred_date'] else None,
                    "confirmed_date": visit['confirmed_date'].isoformat() if visit['confirmed_date'] else None,
                    "status": visit['status'],
                    "display_status": self._get_display_status(visit['status']),
                    "rejection_reason": visit['rejection_reason'],
                    "buyer_message": visit['buyer_message'],
                    "counter_date": visit['counter_date'].isoformat() if visit.get('counter_date') else None,
                    "counter_message": visit['counter_message'],
                    "counter_by": str(visit['counter_by']) if visit.get('counter_by') else None,
                    "created_at": visit['created_at'].isoformat(),
                    "responded_at": visit['responded_at'].isoformat() if visit['responded_at'] else None,
                    "allowed_actions": self._compute_allowed_actions(
                        dict(visit), user_id=user_id, role='agent' if is_agent else 'buyer'
                    ),
                    "verification": {
                        "gps_lat": verification['agent_gps_lat'] if verification else None,
                        "gps_lng": verification['agent_gps_lng'] if verification else None,
                        "gps_verified_at": verification['gps_verified_at'].isoformat() if verification and verification['gps_verified_at'] else None,
                        "completed_at": verification['completed_at'].isoformat() if verification and verification['completed_at'] else None,
                        "duration_minutes": verification['duration_minutes'] if verification else None
                    } if verification else None
                }
            }
    
    async def approve_visit(
        self,
        visit_id: UUID,
        agent_id: UUID,
        confirmed_date: Optional[datetime] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent approves a visit request."""
        async with self.db.acquire() as conn:
            # Get visit
            visit = await conn.fetchrow("""
                SELECT vr.*, p.title as property_title
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'APPROVED'):
                return {
                    "success": False,
                    "error": f"Cannot approve visit in {visit['status']} status"
                }
            
            # Use confirmed_date or preferred_date
            final_date = confirmed_date or visit['preferred_date']
            
            # Update visit
            await conn.execute("""
                UPDATE visit_requests
                SET status = 'APPROVED', 
                    confirmed_date = $2,
                    responded_at = NOW()
                WHERE id = $1
            """, visit_id, final_date)
            
            # Notify buyer
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=visit['buyer_id'],
                    notification_type='VISIT_APPROVED',
                    title='Visit Approved',
                    message=f'Your visit request for {visit["property_title"]} has been approved',
                    related_entity_type='visit',
                    related_entity_id=visit_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Visit approved successfully",
                "visit": {
                    "id": str(visit_id),
                    "status": "APPROVED",
                    "display_status": "Approved",
                    "confirmed_date": final_date.isoformat() if final_date else None
                }
            }
    
    async def reject_visit(
        self,
        visit_id: UUID,
        agent_id: UUID,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent rejects a visit request."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT vr.*, p.title as property_title
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'REJECTED'):
                return {
                    "success": False,
                    "error": f"Cannot reject visit in {visit['status']} status"
                }
            
            await conn.execute("""
                UPDATE visit_requests
                SET status = 'REJECTED', 
                    rejection_reason = $2,
                    responded_at = NOW()
                WHERE id = $1
            """, visit_id, reason)
            
            # Notify buyer
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=visit['buyer_id'],
                    notification_type='VISIT_REJECTED',
                    title='Visit Rejected',
                    message=f'Your visit request for {visit["property_title"]} has been rejected',
                    related_entity_type='visit',
                    related_entity_id=visit_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Visit rejected",
                "visit": {
                    "id": str(visit_id),
                    "status": "REJECTED",
                    "display_status": "Rejected"
                }
            }
    
    async def check_in(
        self,
        visit_id: UUID,
        agent_id: UUID,
        gps_lat: float,
        gps_lng: float,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent checks in at property location (GPS verification)."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT vr.*, p.latitude as property_lat, p.longitude as property_lng
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'CHECKED_IN'):
                return {
                    "success": False,
                    "error": f"Cannot check in for visit in {visit['status']} status"
                }
            
            # Calculate distance from property
            distance = self._calculate_distance(
                gps_lat, gps_lng,
                visit['property_lat'], visit['property_lng']
            )
            
            # Verify agent is within 100 meters of property
            if distance > 100:
                return {
                    "success": False,
                    "error": f"You must be within 100 meters of the property to check in. Current distance: {int(distance)} meters"
                }
            
            # Update visit status
            await conn.execute("""
                UPDATE visit_requests SET status = 'CHECKED_IN' WHERE id = $1
            """, visit_id)
            
            # Create verification record
            await conn.execute("""
                INSERT INTO visit_verifications (
                    visit_id, agent_gps_lat, agent_gps_lng, 
                    gps_verified_at, gps_distance_meters
                )
                VALUES ($1, $2, $3, NOW(), $4)
                ON CONFLICT (visit_id) DO UPDATE 
                SET agent_gps_lat = $2, agent_gps_lng = $3, 
                    gps_verified_at = NOW(), gps_distance_meters = $4
            """, visit_id, gps_lat, gps_lng, distance)
            
            return {
                "success": True,
                "message": "Checked in successfully",
                "visit": {
                    "id": str(visit_id),
                    "status": "CHECKED_IN",
                    "display_status": "In Progress",
                    "gps_distance_meters": int(distance)
                }
            }
    
    async def complete_visit(
        self,
        visit_id: UUID,
        agent_id: UUID,
        agent_notes: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent marks visit as completed."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT vr.*, p.title as property_title
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'COMPLETED'):
                return {
                    "success": False,
                    "error": f"Cannot complete visit in {visit['status']} status. Must check in first."
                }
            
            # Update visit status
            await conn.execute("""
                UPDATE visit_requests SET status = 'COMPLETED' WHERE id = $1
            """, visit_id)
            
            # Update verification record
            verification = await conn.fetchrow("""
                SELECT gps_verified_at FROM visit_verifications WHERE visit_id = $1
            """, visit_id)
            
            duration = None
            if verification and verification['gps_verified_at']:
                now = datetime.now(timezone.utc)
                duration = int((now - verification['gps_verified_at'].replace(tzinfo=timezone.utc)).total_seconds() / 60)
            
            await conn.execute("""
                UPDATE visit_verifications 
                SET completed_at = NOW(), 
                    duration_minutes = $2,
                    agent_notes = $3
                WHERE visit_id = $1
            """, visit_id, duration, agent_notes)
            
            # Notify buyer
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=visit['buyer_id'],
                    notification_type='VISIT_COMPLETED',
                    title='Visit Completed',
                    message=f'Your visit to {visit["property_title"]} has been completed',
                    related_entity_type='visit',
                    related_entity_id=visit_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Visit completed successfully",
                "visit": {
                    "id": str(visit_id),
                    "status": "COMPLETED",
                    "display_status": "Completed",
                    "duration_minutes": duration
                }
            }
    
    async def cancel_visit(
        self,
        visit_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Buyer or agent cancels a visit."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT * FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            # Only buyer or agent can cancel
            if visit['buyer_id'] != user_id and visit['agent_id'] != user_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'CANCELLED'):
                return {
                    "success": False,
                    "error": f"Cannot cancel visit in {visit['status']} status"
                }
            
            await conn.execute("""
                UPDATE visit_requests 
                SET status = 'CANCELLED', rejection_reason = $2
                WHERE id = $1
            """, visit_id, reason)
            
            return {
                "success": True,
                "message": "Visit cancelled",
                "visit": {
                    "id": str(visit_id),
                    "status": "CANCELLED",
                    "display_status": "Cancelled"
                }
            }
    
    async def mark_no_show(
        self,
        visit_id: UUID,
        agent_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent marks buyer as no-show."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT * FROM visit_requests WHERE id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'NO_SHOW'):
                return {
                    "success": False,
                    "error": f"Cannot mark as no-show in {visit['status']} status"
                }
            
            await conn.execute("""
                UPDATE visit_requests SET status = 'NO_SHOW' WHERE id = $1
            """, visit_id)
            
            return {
                "success": True,
                "message": "Marked as no-show",
                "visit": {
                    "id": str(visit_id),
                    "status": "NO_SHOW",
                    "display_status": "No Show"
                }
            }
    
    def _calculate_distance(
        self, 
        lat1: float, lon1: float, 
        lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two coordinates in meters using Haversine formula."""
        R = 6371000  # Earth's radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi/2)**2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c

    async def counter_visit(
        self,
        visit_id: UUID,
        user_id: UUID,
        new_date: datetime,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent or Buyer proposes a new visit date (counter-offer)."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT vr.*, p.title as property_title 
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            # Verify permission
            if visit['agent_id'] != user_id and visit['buyer_id'] != user_id:
                return {"success": False, "error": "Access denied"}
            
            # Check transition
            if not self._can_transition(visit['status'], 'COUNTERED'):
                 return {
                    "success": False,
                    "error": f"Cannot counter visit in {visit['status']} status"
                }

            # Ensure new date is in future
            now = datetime.now(timezone.utc)
            if new_date.tzinfo is None:
                new_date = new_date.replace(tzinfo=timezone.utc)
            else:
                 new_date = new_date.astimezone(timezone.utc)

            if new_date <= now:
                return {"success": False, "error": "New date must be in the future"}
            
            new_date_naive = new_date.replace(tzinfo=None)

            # Update visit
            await conn.execute("""
                UPDATE visit_requests
                SET status = 'COUNTERED',
                    counter_date = $2,
                    counter_message = $3,
                    counter_by = $4,
                    responded_at = NOW()
                WHERE id = $1
            """, visit_id, new_date_naive, message, user_id)
            
            # Determine notification recipient
            recipient_id = visit['buyer_id'] if visit['agent_id'] == user_id else visit['agent_id']
            is_agent_countering = visit['agent_id'] == user_id
            
            # Notify
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=recipient_id,
                    notification_type='VISIT_COUNTERED',
                    title='Visit Counter-Offer',
                    message=f'{"Agent" if is_agent_countering else "Buyer"} sent a counter-offer for {visit["property_title"]}',
                    related_entity_type='visit',
                    related_entity_id=visit_id
                )
            except Exception:
                pass
                
            return {
                "success": True,
                "message": "Counter offer sent",
                "visit": {
                    "id": str(visit_id),
                    "status": "COUNTERED",
                    "display_status": "Counter Offer",
                    "counter_date": new_date.isoformat(),
                    "counter_message": message,
                    "counter_by": str(user_id)
                }
            }

    async def respond_to_counter(
        self,
        visit_id: UUID,
        user_id: UUID,
        accept: bool
    ) -> Dict[str, Any]:
        """Accept or Reject a counter-offer."""
        async with self.db.acquire() as conn:
            visit = await conn.fetchrow("""
                SELECT vr.*, p.title as property_title
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['status'] != 'COUNTERED':
                return {"success": False, "error": "Visit is not in COUNTERED status"}
                
            # Verify user is NOT the one who countered
            if visit['counter_by'] == user_id:
                return {"success": False, "error": "You cannot respond to your own counter offer"}
            
            # Verify user involved
            if visit['agent_id'] != user_id and visit['buyer_id'] != user_id:
                 return {"success": False, "error": "Access denied"}

            if accept:
                # Accept counter -> APPROVED
                # Set confirmed_date to counter_date
                if not visit['counter_date']:
                     return {"success": False, "error": "No counter date found"}

                await conn.execute("""
                    UPDATE visit_requests
                    SET status = 'APPROVED',
                        confirmed_date = $2,
                        responded_at = NOW()
                    WHERE id = $1
                """, visit_id, visit['counter_date'])
                
                new_status = 'APPROVED'
                msg = "Visit approved/confirmed"
                
                # Notification
                recipient_id = visit['counter_by']
                try:
                    notifications_service = NotificationsService(self.db)
                    await notifications_service.create_notification(
                        user_id=recipient_id,
                        notification_type='VISIT_APPROVED',
                        title='Counter Offer Accepted',
                        message=f'Your counter offer for {visit["property_title"]} was accepted. Visit is confirmed.',
                        related_entity_type='visit',
                        related_entity_id=visit_id
                    )
                except Exception:
                    pass

            else:
                # Reject counter -> REJECTED
                await conn.execute("""
                    UPDATE visit_requests
                    SET status = 'REJECTED',
                        rejection_reason = 'Counter offer declined',
                        responded_at = NOW()
                    WHERE id = $1
                """, visit_id)
                
                new_status = 'REJECTED'
                msg = "Counter offer declined"
                 # Notification
                recipient_id = visit['counter_by']
                try:
                    notifications_service = NotificationsService(self.db)
                    await notifications_service.create_notification(
                        user_id=recipient_id,
                        notification_type='VISIT_REJECTED',
                        title='Counter Offer Declined',
                        message=f'Your counter offer for {visit["property_title"]} was declined.',
                        related_entity_type='visit',
                        related_entity_id=visit_id
                    )
                except Exception:
                    pass

            return {
                "success": True,
                "message": msg,
                "visit": {
                    "id": str(visit_id),
                    "status": new_status,
                    "display_status": self._get_display_status(new_status),
                    "confirmed_date": visit['counter_date'].isoformat() if accept else None
                }
            }

    def _generate_otp(self) -> str:
        """Generate 6-digit numeric OTP."""
        import secrets
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    async def start_visit_session(
        self,
        visit_id: UUID,
        agent_id: UUID,
        gps_lat: float,
        gps_lng: float,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent starts visit session: GPS verification + OTP generation/email to buyer.
        
        This combines check_in with OTP generation for buyer verification.
        The OTP is sent to buyer's email AND stored for display on buyer's page.
        """
        async with self.db.acquire() as conn:
            # Get visit with property and buyer info
            visit = await conn.fetchrow("""
                SELECT vr.*, 
                       p.latitude as property_lat, p.longitude as property_lng,
                       p.title as property_title,
                       buyer.email as buyer_email, buyer.full_name as buyer_name
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                JOIN users buyer ON buyer.id = vr.buyer_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if not self._can_transition(visit['status'], 'CHECKED_IN'):
                return {
                    "success": False,
                    "error": f"Cannot start session for visit in {visit['status']} status"
                }
            
            # Calculate distance from property
            distance = self._calculate_distance(
                gps_lat, gps_lng,
                visit['property_lat'], visit['property_lng']
            )
            
            # Verify agent is within 100 meters of property
            if distance > 100:
                return {
                    "success": False,
                    "error": f"You must be within 100 meters of the property. Current distance: {int(distance)} meters"
                }
            
            # Generate 6-digit OTP
            otp_code = self._generate_otp()
            otp_expiry = datetime.utcnow() + timedelta(minutes=10)
            
            # Start transaction
            async with conn.transaction():
                # Update visit status to CHECKED_IN
                await conn.execute("""
                    UPDATE visit_requests SET status = 'CHECKED_IN' WHERE id = $1
                """, visit_id)
                
                # Create/update verification record
                await conn.execute("""
                    INSERT INTO visit_verifications (
                        visit_id, agent_gps_lat, agent_gps_lng, 
                        gps_verified_at, gps_distance_meters
                    )
                    VALUES ($1, $2, $3, NOW(), $4)
                    ON CONFLICT (visit_id) DO UPDATE 
                    SET agent_gps_lat = $2, agent_gps_lng = $3, 
                        gps_verified_at = NOW(), gps_distance_meters = $4
                """, visit_id, gps_lat, gps_lng, distance)
                
                # Delete any existing OTP for this visit
                await conn.execute("""
                    DELETE FROM visit_otp WHERE visit_id = $1
                """, visit_id)
                
                # Store new OTP
                await conn.execute("""
                    INSERT INTO visit_otp (visit_id, otp_code, expires_at)
                    VALUES ($1, $2, $3)
                """, visit_id, otp_code, otp_expiry)
            
            # Send OTP via email to buyer
            try:
                from .email_service import EmailService
                email_service = EmailService(self.db)
                
                # [DEV MODE] Print OTP to console
                print(f"[DEV] Visit OTP for {visit['buyer_email']}: {otp_code}")
                
                subject = "Your Property Visit Verification Code"
                body = f"""Hi {visit['buyer_name']},

Your verification code for the property visit is: {otp_code}

Property: {visit['property_title']}

Please show this code to the agent when you meet them at the property.
This code is valid for 10 minutes.

- NestFind Team"""
                
                await email_service._send_email_sync(visit['buyer_email'], subject, body)
            except Exception as e:
                print(f"[ERROR] Failed to send visit OTP email: {str(e)}")
            
            # Notify buyer
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=visit['buyer_id'],
                    notification_type='VISIT_OTP_GENERATED',
                    title='Visit Session Started',
                    message=f'The agent has arrived. Check your email or visits page for the verification code.',
                    related_entity_type='visit',
                    related_entity_id=visit_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Visit session started. OTP sent to buyer.",
                "visit": {
                    "id": str(visit_id),
                    "status": "CHECKED_IN",
                    "display_status": "In Progress",
                    "gps_distance_meters": int(distance),
                    "otp_expires_at": otp_expiry.isoformat()
                }
            }

    async def get_buyer_otp(
        self,
        visit_id: UUID,
        buyer_id: UUID
    ) -> Dict[str, Any]:
        """
        Buyer retrieves the OTP for their visit to show to agent.
        
        Only the buyer of the visit can retrieve the OTP.
        """
        async with self.db.acquire() as conn:
            # Verify buyer owns this visit
            visit = await conn.fetchrow("""
                SELECT vr.id, vr.buyer_id, vr.status, p.title as property_title
                FROM visit_requests vr
                JOIN properties p ON p.id = vr.property_id
                WHERE vr.id = $1
            """, visit_id)
            
            if not visit:
                return {"success": False, "error": "Visit not found"}
            
            if visit['buyer_id'] != buyer_id:
                return {"success": False, "error": "Access denied"}
            
            if visit['status'] != 'CHECKED_IN':
                return {
                    "success": False, 
                    "error": "No active session. Agent must start the visit session first."
                }
            
            # Get OTP
            otp_record = await conn.fetchrow("""
                SELECT otp_code, expires_at, created_at
                FROM visit_otp
                WHERE visit_id = $1 AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            """, visit_id)
            
            if not otp_record:
                return {
                    "success": False,
                    "error": "No valid OTP found. The code may have expired."
                }
            
            return {
                "success": True,
                "otp": {
                    "code": otp_record['otp_code'],
                    "expires_at": otp_record['expires_at'].isoformat(),
                    "property_title": visit['property_title']
                }
            }
