"""
Agreement Service — Legal artifact management for deals.

Implements:
- Versioned agreement creation (TOKEN, SALE, COMMISSION)
- Multi-party signing with IP + timestamp
- Immutability enforcement (SIGNED agreements cannot be edited)
- Admin void with reason
- Agreement requirement gates for deal transitions

Agreement Lifecycle:
    DRAFT → SIGNED (immutable) → VOID (admin only, with reason)
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone
import asyncpg

from .deal_events_service import DealEventsService
from .notifications_service import NotificationsService


# Valid agreement types (must match DB enum)
VALID_AGREEMENT_TYPES = {'TOKEN', 'SALE', 'COMMISSION'}

# Which parties must sign for an agreement to be SIGNED
REQUIRED_SIGNATURES = {
    'TOKEN': {'buyer', 'seller'},       # Both parties for token agreement
    'SALE': {'buyer', 'seller'},        # Both parties for sale deed
    'COMMISSION': {'agent', 'seller'},  # Agent + seller for commission split
}


class AgreementService:
    """
    Service for managing deal-level legal agreements.
    
    Agreements are versioned (append-only) and immutable after signing.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.events_service = DealEventsService(db)
    
    async def create_agreement(
        self,
        deal_id: UUID,
        agreement_type: str,
        actor_id: UUID,
        actor_role: str,
        document_url: Optional[str] = None,
        file_hash: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a DRAFT agreement for a deal.
        
        If a previous version exists (non-VOID), increments version number.
        New version = new row. Old versions remain for audit trail.
        """
        if agreement_type not in VALID_AGREEMENT_TYPES:
            return {
                "success": False,
                "error": f"Invalid agreement type. Must be one of: {', '.join(VALID_AGREEMENT_TYPES)}"
            }
        
        async with self.db.acquire() as conn:
            # Verify deal exists and is active
            deal = await conn.fetchrow("""
                SELECT id, status, buyer_id, seller_id, agent_id
                FROM deals WHERE id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            # Guard: No agreements on terminal/disputed deals
            terminal = {'COMPLETED', 'COMMISSION_RELEASED', 'CANCELLED', 'EXPIRED'}
            if deal['status'] in terminal or deal['status'] == 'DISPUTED':
                return {
                    "success": False,
                    "error": f"Cannot create agreement for deal in {deal['status']} state"
                }
            
            # Guard: Participant check
            if actor_role not in ('ADMIN', 'SYSTEM'):
                is_participant = (
                    actor_id == deal['buyer_id'] or
                    actor_id == deal['seller_id'] or
                    actor_id == deal['agent_id']
                )
                if not is_participant:
                    return {"success": False, "error": "You are not a participant in this deal"}
            
            # Get next version number
            latest = await conn.fetchval("""
                SELECT MAX(version) FROM agreements
                WHERE deal_id = $1 AND agreement_type = $2::agreement_type
                  AND status != 'VOID'
            """, deal_id, agreement_type)
            
            next_version = (latest or 0) + 1
            
            async with conn.transaction():
                agreement = await conn.fetchrow("""
                    INSERT INTO agreements (
                        deal_id, agreement_type, version,
                        document_url, file_hash, status
                    )
                    VALUES ($1, $2::agreement_type, $3, $4, $5, 'DRAFT')
                    RETURNING id, created_at
                """, deal_id, agreement_type, next_version,
                    document_url, file_hash)
                
                # Log deal event
                await self.events_service.log_event(
                    deal_id=deal_id,
                    event_type='AGREEMENT_CREATED',
                    actor_id=actor_id,
                    actor_role=actor_role,
                    notes=f'{agreement_type} agreement v{next_version} created',
                    metadata={
                        'agreement_id': str(agreement['id']),
                        'agreement_type': agreement_type,
                        'version': next_version
                    },
                    conn=conn
                )
            
            return {
                "success": True,
                "agreement": {
                    "id": str(agreement['id']),
                    "deal_id": str(deal_id),
                    "agreement_type": agreement_type,
                    "version": next_version,
                    "status": "DRAFT",
                    "document_url": document_url,
                    "created_at": agreement['created_at'].isoformat()
                },
                "message": f"{agreement_type} agreement v{next_version} created as DRAFT"
            }
    
    async def sign_agreement(
        self,
        agreement_id: UUID,
        user_id: UUID,
        role: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a party's signature on an agreement.
        
        - Records timestamp + IP (legally significant)
        - Auto-transitions to SIGNED when all required parties have signed
        - Logs AGREEMENT_ACCEPTED deal event
        """
        if role not in ('BUYER', 'SELLER', 'AGENT'):
            return {"success": False, "error": "Invalid signing role"}
        
        async with self.db.acquire() as conn:
            agreement = await conn.fetchrow("""
                SELECT a.*, d.buyer_id, d.seller_id, d.agent_id
                FROM agreements a
                JOIN deals d ON d.id = a.deal_id
                WHERE a.id = $1
            """, agreement_id)
            
            if not agreement:
                return {"success": False, "error": "Agreement not found"}
            
            if agreement['status'] != 'DRAFT':
                return {
                    "success": False,
                    "error": f"Cannot sign agreement in {agreement['status']} status"
                }
            
            # Verify user matches role
            role_to_id = {
                'BUYER': agreement['buyer_id'],
                'SELLER': agreement['seller_id'],
                'AGENT': agreement['agent_id']
            }
            
            if role_to_id.get(role) != user_id:
                return {"success": False, "error": "You cannot sign as this role"}
            
            # Check if already signed
            signed_column = f"signed_by_{role.lower()}_at"
            if agreement[signed_column] is not None:
                return {"success": False, "error": f"{role} has already signed this agreement"}
            
            # Record signature
            ip_column = f"{role.lower()}_ip"
            
            async with conn.transaction():
                await conn.execute(f"""
                    UPDATE agreements 
                    SET {signed_column} = NOW(),
                        {ip_column} = $2
                    WHERE id = $1
                """, agreement_id, ip_address)
                
                # Log event
                await self.events_service.log_event(
                    deal_id=agreement['deal_id'],
                    event_type='AGREEMENT_ACCEPTED',
                    actor_id=user_id,
                    actor_role=role,
                    notes=f'{role} signed {agreement["agreement_type"]} agreement v{agreement["version"]}',
                    metadata={
                        'agreement_id': str(agreement_id),
                        'agreement_type': agreement['agreement_type'],
                        'ip_address': ip_address
                    },
                    conn=conn
                )
                
                # Check if all required parties have now signed
                updated = await conn.fetchrow("""
                    SELECT signed_by_buyer_at, signed_by_seller_at, signed_by_agent_at
                    FROM agreements WHERE id = $1
                """, agreement_id)
                
                required = REQUIRED_SIGNATURES.get(agreement['agreement_type'], set())
                all_signed = True
                for party in required:
                    if updated[f'signed_by_{party}_at'] is None:
                        all_signed = False
                        break
                
                if all_signed:
                    # Auto-transition to SIGNED
                    await conn.execute("""
                        UPDATE agreements SET status = 'SIGNED' WHERE id = $1
                    """, agreement_id)
            
            return {
                "success": True,
                "message": f"{role} signature recorded",
                "all_signed": all_signed,
                "status": "SIGNED" if all_signed else "DRAFT",
                "signatures": {
                    "buyer": updated['signed_by_buyer_at'] is not None,
                    "seller": updated['signed_by_seller_at'] is not None,
                    "agent": updated['signed_by_agent_at'] is not None
                }
            }
    
    async def check_agreement_signed(
        self,
        deal_id: UUID,
        agreement_type: str
    ) -> bool:
        """
        Check if the latest non-void agreement of a type is SIGNED.
        
        Used as a gate for deal transitions:
        - TOKEN_PAID → AGREEMENT_SIGNED requires TOKEN agreement SIGNED
        - AGREEMENT_SIGNED → REGISTRATION requires SALE agreement SIGNED
        """
        async with self.db.acquire() as conn:
            result = await conn.fetchval("""
                SELECT status FROM agreements
                WHERE deal_id = $1 
                  AND agreement_type = $2::agreement_type
                  AND status = 'SIGNED'
                ORDER BY version DESC
                LIMIT 1
            """, deal_id, agreement_type)
            
            return result == 'SIGNED'
    
    async def void_agreement(
        self,
        agreement_id: UUID,
        admin_id: UUID,
        reason: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Admin voids an agreement with reason.
        
        - Only admin can void
        - Reason is mandatory
        - Logged in deal events and admin_actions
        """
        if not reason or len(reason.strip()) < 5:
            return {"success": False, "error": "Void reason must be at least 5 characters"}
        
        async with self.db.acquire() as conn:
            agreement = await conn.fetchrow("""
                SELECT * FROM agreements WHERE id = $1
            """, agreement_id)
            
            if not agreement:
                return {"success": False, "error": "Agreement not found"}
            
            if agreement['status'] == 'VOID':
                return {"success": False, "error": "Agreement is already voided"}
            
            async with conn.transaction():
                await conn.execute("""
                    UPDATE agreements
                    SET status = 'VOID',
                        voided_by = $2,
                        void_reason = $3,
                        voided_at = NOW()
                    WHERE id = $1
                """, agreement_id, admin_id, reason)
                
                # Log deal event
                await self.events_service.log_event(
                    deal_id=agreement['deal_id'],
                    event_type='AGREEMENT_VOIDED',
                    actor_id=admin_id,
                    actor_role='ADMIN',
                    notes=f'{agreement["agreement_type"]} agreement v{agreement["version"]} voided: {reason}',
                    metadata={
                        'agreement_id': str(agreement_id),
                        'agreement_type': agreement['agreement_type'],
                        'previous_status': agreement['status'],
                        'void_reason': reason
                    },
                    conn=conn
                )
                
                # Log admin action
                await conn.execute("""
                    INSERT INTO admin_actions (
                        admin_id, action, target_type, target_id,
                        reason, previous_state, new_state
                    )
                    VALUES ($1, 'VOID_AGREEMENT', 'agreement', $2, $3, $4, 'VOID')
                """, admin_id, agreement_id, reason, agreement['status'])
            
            return {
                "success": True,
                "message": f"Agreement voided: {reason}",
                "agreement": {
                    "id": str(agreement_id),
                    "status": "VOID",
                    "void_reason": reason
                }
            }
    
    async def get_agreements(
        self,
        deal_id: UUID,
        user_id: UUID,
        agreement_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all agreements for a deal.
        Optionally filter by type.
        """
        async with self.db.acquire() as conn:
            # Verify access
            deal = await conn.fetchrow("""
                SELECT buyer_id, seller_id, agent_id FROM deals WHERE id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            is_participant = (
                user_id == deal['buyer_id'] or
                user_id == deal['seller_id'] or
                user_id == deal['agent_id']
            )
            if not is_participant:
                return {"success": False, "error": "Access denied"}
            
            if agreement_type:
                agreements = await conn.fetch("""
                    SELECT * FROM agreements
                    WHERE deal_id = $1 AND agreement_type = $2::agreement_type
                    ORDER BY version DESC
                """, deal_id, agreement_type)
            else:
                agreements = await conn.fetch("""
                    SELECT * FROM agreements
                    WHERE deal_id = $1
                    ORDER BY agreement_type, version DESC
                """, deal_id)
            
            return {
                "success": True,
                "agreements": [self._format_agreement(a) for a in agreements]
            }
    
    async def get_latest_agreement(
        self,
        deal_id: UUID,
        agreement_type: str
    ) -> Optional[Dict[str, Any]]:
        """Get the latest non-void agreement of a given type."""
        async with self.db.acquire() as conn:
            agreement = await conn.fetchrow("""
                SELECT * FROM agreements
                WHERE deal_id = $1 
                  AND agreement_type = $2::agreement_type
                  AND status != 'VOID'
                ORDER BY version DESC
                LIMIT 1
            """, deal_id, agreement_type)
            
            if not agreement:
                return None
            
            return self._format_agreement(agreement)
    
    def _format_agreement(self, a) -> dict:
        """Format agreement record for API response."""
        return {
            "id": str(a['id']),
            "deal_id": str(a['deal_id']),
            "agreement_type": a['agreement_type'],
            "version": a['version'],
            "document_url": a['document_url'],
            "file_hash": a['file_hash'],
            "status": a['status'],
            "signatures": {
                "buyer": {
                    "signed": a['signed_by_buyer_at'] is not None,
                    "signed_at": a['signed_by_buyer_at'].isoformat() if a['signed_by_buyer_at'] else None
                },
                "seller": {
                    "signed": a['signed_by_seller_at'] is not None,
                    "signed_at": a['signed_by_seller_at'].isoformat() if a['signed_by_seller_at'] else None
                },
                "agent": {
                    "signed": a['signed_by_agent_at'] is not None,
                    "signed_at": a['signed_by_agent_at'].isoformat() if a['signed_by_agent_at'] else None
                }
            },
            "void_reason": a['void_reason'] if a['status'] == 'VOID' else None,
            "created_at": a['created_at'].isoformat()
        }
