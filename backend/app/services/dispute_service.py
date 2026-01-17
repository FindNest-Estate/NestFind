"""
Dispute Service implementing ADMIN_DISPUTE_RESOLUTION workflow.

State Machine:
    OPEN → UNDER_REVIEW → RESOLVED → CLOSED
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone
import asyncpg

from ..services.notifications_service import NotificationsService


class DisputeService:
    """
    Service for managing disputes.
    
    Implements user dispute raising and admin resolution workflow.
    """
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        'OPEN': ['UNDER_REVIEW', 'CLOSED'],
        'UNDER_REVIEW': ['RESOLVED', 'CLOSED'],
        'RESOLVED': ['CLOSED'],
        'CLOSED': []
    }
    
    # Display status labels
    DISPLAY_STATUS = {
        'OPEN': 'Open',
        'UNDER_REVIEW': 'Under Review',
        'RESOLVED': 'Resolved',
        'CLOSED': 'Closed'
    }
    
    # Valid categories
    VALID_CATEGORIES = [
        'PROPERTY_MISREPRESENTATION',
        'PAYMENT_ISSUE',
        'AGENT_MISCONDUCT',
        'VISIT_ISSUE',
        'VERIFICATION_ISSUE',
        'OTHER'
    ]
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    def _can_transition(self, current_status: str, new_status: str) -> bool:
        """Check if state transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(current_status, [])
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return self.DISPLAY_STATUS.get(status, status)
    
    def _compute_allowed_actions(
        self, 
        status: str, 
        is_raiser: bool = False, 
        is_admin: bool = False
    ) -> List[str]:
        """Compute allowed actions based on status and role."""
        actions = []
        
        if is_admin:
            if status == 'OPEN':
                actions.extend(['assign', 'close'])
            elif status == 'UNDER_REVIEW':
                actions.extend(['resolve', 'close'])
            elif status == 'RESOLVED':
                actions.append('close')
        
        if is_raiser and status == 'OPEN':
            actions.append('close')  # Can withdraw dispute
        
        return actions
    
    async def raise_dispute(
        self,
        raised_by_id: UUID,
        against_id: UUID,
        category: str,
        title: str,
        description: str,
        property_id: Optional[UUID] = None,
        transaction_id: Optional[UUID] = None,
        visit_id: Optional[UUID] = None,
        offer_id: Optional[UUID] = None,
        evidence_urls: Optional[List[str]] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        User raises a dispute.
        
        Requirements:
        - At least one related entity must be provided
        - Cannot raise dispute against self
        - Valid category required
        """
        if raised_by_id == against_id:
            return {"success": False, "error": "Cannot raise dispute against yourself"}
        
        if category not in self.VALID_CATEGORIES:
            return {"success": False, "error": f"Invalid category. Must be one of: {', '.join(self.VALID_CATEGORIES)}"}
        
        if not any([property_id, transaction_id, visit_id, offer_id]):
            return {
                "success": False,
                "error": "At least one related entity (property, transaction, visit, or offer) must be provided"
            }
        
        async with self.db.acquire() as conn:
            # Verify against_id exists
            against_user = await conn.fetchrow("""
                SELECT id, full_name FROM users WHERE id = $1
            """, against_id)
            
            if not against_user:
                return {"success": False, "error": "The user you're raising dispute against does not exist"}
            
            # Create dispute
            dispute = await conn.fetchrow("""
                INSERT INTO disputes (
                    raised_by_id, against_id, category,
                    title, description,
                    property_id, transaction_id, visit_id, offer_id,
                    evidence_urls, status
                )
                VALUES ($1, $2, $3::dispute_category, $4, $5, $6, $7, $8, $9, $10, 'OPEN')
                RETURNING id, created_at
            """, raised_by_id, against_id, category,
                title, description,
                property_id, transaction_id, visit_id, offer_id,
                evidence_urls)
            
            return {
                "success": True,
                "dispute": {
                    "id": str(dispute['id']),
                    "raised_by_id": str(raised_by_id),
                    "against_id": str(against_id),
                    "against_name": against_user['full_name'],
                    "category": category,
                    "title": title,
                    "status": "OPEN",
                    "display_status": "Open",
                    "created_at": dispute['created_at'].isoformat()
                },
                "message": "Dispute raised successfully. Our team will review it shortly."
            }
    
    async def get_disputes(
        self,
        user_id: UUID,
        is_admin: bool = False,
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get list of disputes.
        
        - Regular users see disputes they raised or are against
        - Admin sees all disputes
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            if is_admin:
                base_query = "1=1"
                params = []
            else:
                base_query = "(d.raised_by_id = $1 OR d.against_id = $1)"
                params = [user_id]
            
            if status_filter:
                base_query += f" AND d.status = ${len(params) + 1}::dispute_status"
                params.append(status_filter)
            
            # Get total count
            count_row = await conn.fetchrow(f"""
                SELECT COUNT(*) as total FROM disputes d WHERE {base_query}
            """, *params)
            
            # Get disputes
            params.extend([per_page, offset])
            disputes = await conn.fetch(f"""
                SELECT 
                    d.*,
                    raiser.full_name as raiser_name,
                    against.full_name as against_name,
                    p.title as property_title
                FROM disputes d
                JOIN users raiser ON raiser.id = d.raised_by_id
                JOIN users against ON against.id = d.against_id
                LEFT JOIN properties p ON p.id = d.property_id
                WHERE {base_query}
                ORDER BY d.created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """, *params)
            
            return {
                "success": True,
                "disputes": [
                    {
                        "id": str(d['id']),
                        "raised_by": {
                            "id": str(d['raised_by_id']),
                            "name": d['raiser_name']
                        },
                        "against": {
                            "id": str(d['against_id']),
                            "name": d['against_name']
                        },
                        "category": d['category'],
                        "title": d['title'],
                        "property_title": d['property_title'],
                        "status": d['status'],
                        "display_status": self._get_display_status(d['status']),
                        "created_at": d['created_at'].isoformat(),
                        "resolved_at": d['resolved_at'].isoformat() if d['resolved_at'] else None,
                        "allowed_actions": self._compute_allowed_actions(
                            d['status'], 
                            is_raiser=(d['raised_by_id'] == user_id),
                            is_admin=is_admin
                        )
                    }
                    for d in disputes
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": count_row['total'],
                    "total_pages": (count_row['total'] + per_page - 1) // per_page
                }
            }
    
    async def get_dispute_by_id(
        self,
        dispute_id: UUID,
        user_id: UUID,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """Get dispute details."""
        async with self.db.acquire() as conn:
            dispute = await conn.fetchrow("""
                SELECT 
                    d.*,
                    raiser.full_name as raiser_name, raiser.email as raiser_email,
                    against.full_name as against_name, against.email as against_email,
                    p.title as property_title,
                    admin.full_name as admin_name
                FROM disputes d
                JOIN users raiser ON raiser.id = d.raised_by_id
                JOIN users against ON against.id = d.against_id
                LEFT JOIN properties p ON p.id = d.property_id
                LEFT JOIN users admin ON admin.id = d.assigned_admin_id
                WHERE d.id = $1
            """, dispute_id)
            
            if not dispute:
                return {"success": False, "error": "Dispute not found"}
            
            # Check access
            is_raiser = dispute['raised_by_id'] == user_id
            is_against = dispute['against_id'] == user_id
            
            if not is_admin and not is_raiser and not is_against:
                return {"success": False, "error": "Access denied"}
            
            return {
                "success": True,
                "dispute": {
                    "id": str(dispute['id']),
                    "raised_by": {
                        "id": str(dispute['raised_by_id']),
                        "name": dispute['raiser_name'],
                        "email": dispute['raiser_email'] if is_admin else None
                    },
                    "against": {
                        "id": str(dispute['against_id']),
                        "name": dispute['against_name'],
                        "email": dispute['against_email'] if is_admin else None
                    },
                    "category": dispute['category'],
                    "title": dispute['title'],
                    "description": dispute['description'],
                    "evidence_urls": dispute['evidence_urls'],
                    "property_id": str(dispute['property_id']) if dispute['property_id'] else None,
                    "property_title": dispute['property_title'],
                    "transaction_id": str(dispute['transaction_id']) if dispute['transaction_id'] else None,
                    "visit_id": str(dispute['visit_id']) if dispute['visit_id'] else None,
                    "offer_id": str(dispute['offer_id']) if dispute['offer_id'] else None,
                    "status": dispute['status'],
                    "display_status": self._get_display_status(dispute['status']),
                    "assigned_admin": {
                        "id": str(dispute['assigned_admin_id']),
                        "name": dispute['admin_name']
                    } if dispute['assigned_admin_id'] else None,
                    "decision": dispute['decision'],
                    "resolution_notes": dispute['resolution_notes'],
                    "created_at": dispute['created_at'].isoformat(),
                    "resolved_at": dispute['resolved_at'].isoformat() if dispute['resolved_at'] else None,
                    "allowed_actions": self._compute_allowed_actions(
                        dispute['status'], 
                        is_raiser=is_raiser,
                        is_admin=is_admin
                    )
                }
            }
    
    async def assign_dispute(
        self,
        dispute_id: UUID,
        admin_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Admin assigns dispute to themselves for review."""
        async with self.db.acquire() as conn:
            dispute = await conn.fetchrow("""
                SELECT * FROM disputes WHERE id = $1
            """, dispute_id)
            
            if not dispute:
                return {"success": False, "error": "Dispute not found"}
            
            if not self._can_transition(dispute['status'], 'UNDER_REVIEW'):
                return {
                    "success": False,
                    "error": f"Cannot assign dispute in {dispute['status']} status"
                }
            
            await conn.execute("""
                UPDATE disputes 
                SET status = 'UNDER_REVIEW', 
                    assigned_admin_id = $2
                WHERE id = $1
            """, dispute_id, admin_id)
            
            # Notify parties
            try:
                notifications_service = NotificationsService(self.db)
                for user_id in [dispute['raised_by_id'], dispute['against_id']]:
                    await notifications_service.create_notification(
                        user_id=user_id,
                        notification_type='DISPUTE_UNDER_REVIEW',
                        title='Dispute Under Review',
                        message='Your dispute is now being reviewed by our team.',
                        related_entity_type='dispute',
                        related_entity_id=dispute_id
                    )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Dispute assigned for review",
                "dispute": {
                    "id": str(dispute_id),
                    "status": "UNDER_REVIEW",
                    "display_status": "Under Review"
                }
            }
    
    async def resolve_dispute(
        self,
        dispute_id: UUID,
        admin_id: UUID,
        decision: str,
        resolution_notes: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Admin resolves a dispute with a decision."""
        valid_decisions = ['FAVOR_BUYER', 'FAVOR_SELLER', 'FAVOR_AGENT', 'NO_ACTION', 'PARTIAL_REFUND']
        
        if decision not in valid_decisions:
            return {
                "success": False,
                "error": f"Invalid decision. Must be one of: {', '.join(valid_decisions)}"
            }
        
        async with self.db.acquire() as conn:
            dispute = await conn.fetchrow("""
                SELECT * FROM disputes WHERE id = $1
            """, dispute_id)
            
            if not dispute:
                return {"success": False, "error": "Dispute not found"}
            
            if not self._can_transition(dispute['status'], 'RESOLVED'):
                return {
                    "success": False,
                    "error": f"Cannot resolve dispute in {dispute['status']} status"
                }
            
            await conn.execute("""
                UPDATE disputes 
                SET status = 'RESOLVED',
                    decision = $2::dispute_decision,
                    resolution_notes = $3,
                    resolved_at = NOW(),
                    assigned_admin_id = COALESCE(assigned_admin_id, $4)
                WHERE id = $1
            """, dispute_id, decision, resolution_notes, admin_id)
            
            # Log admin action
            await conn.execute("""
                INSERT INTO admin_actions (
                    admin_id, action, target_type, target_id,
                    reason, previous_state, new_state
                )
                VALUES ($1, 'RESOLVE_DISPUTE', 'dispute', $2, $3, $4, 'RESOLVED')
            """, admin_id, dispute_id, resolution_notes, dispute['status'])
            
            # Notify parties
            try:
                notifications_service = NotificationsService(self.db)
                for user_id in [dispute['raised_by_id'], dispute['against_id']]:
                    await notifications_service.create_notification(
                        user_id=user_id,
                        notification_type='DISPUTE_RESOLVED',
                        title='Dispute Resolved',
                        message=f'Your dispute has been resolved. Decision: {decision.replace("_", " ").title()}',
                        related_entity_type='dispute',
                        related_entity_id=dispute_id
                    )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Dispute resolved successfully",
                "dispute": {
                    "id": str(dispute_id),
                    "status": "RESOLVED",
                    "display_status": "Resolved",
                    "decision": decision
                }
            }
    
    async def close_dispute(
        self,
        dispute_id: UUID,
        user_id: UUID,
        is_admin: bool = False,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Close a dispute (admin or raiser can close)."""
        async with self.db.acquire() as conn:
            dispute = await conn.fetchrow("""
                SELECT * FROM disputes WHERE id = $1
            """, dispute_id)
            
            if not dispute:
                return {"success": False, "error": "Dispute not found"}
            
            # Raiser can only close OPEN disputes
            if not is_admin and dispute['raised_by_id'] != user_id:
                return {"success": False, "error": "Access denied"}
            
            if not is_admin and dispute['status'] != 'OPEN':
                return {"success": False, "error": "You can only close open disputes"}
            
            if not self._can_transition(dispute['status'], 'CLOSED'):
                return {
                    "success": False,
                    "error": f"Cannot close dispute in {dispute['status']} status"
                }
            
            await conn.execute("""
                UPDATE disputes SET status = 'CLOSED' WHERE id = $1
            """, dispute_id)
            
            return {
                "success": True,
                "message": "Dispute closed",
                "dispute": {
                    "id": str(dispute_id),
                    "status": "CLOSED",
                    "display_status": "Closed"
                }
            }
