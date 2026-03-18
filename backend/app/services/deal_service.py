"""
Deal Service — Unified orchestration spine for the entire property transaction lifecycle.

Implements:
- State machine with strict transition guards
- Actor permission matrix (codified, not implicit)
- Participant snapshot at deal creation (for legal compliance)
- Single active deal per property enforcement

State Machine:
    INITIATED → VISIT_SCHEDULED → OFFER_MADE → NEGOTIATION → PRICE_AGREED →
    TOKEN_PENDING → TOKEN_PAID → AGREEMENT_SIGNED → REGISTRATION →
    COMPLETED → COMMISSION_RELEASED

    Any active state → CANCELLED (by authorized actor)
    TOKEN_PENDING → EXPIRED (by system timeout)
    Any active state → DISPUTED (by system on dispute creation)
    DISPUTED → prior_state or CANCELLED (by admin resolution)
"""
from typing import Dict, Any, Optional, Set
from uuid import UUID
from decimal import Decimal
import asyncpg
import json
from contextlib import asynccontextmanager

from .deal_events_service import DealEventsService
from .notifications_service import NotificationsService


# ============================================================================
# GUARDRAIL 1: Explicit Active Deal Statuses — NEVER scatter this logic
# ============================================================================

ACTIVE_DEAL_STATUSES: Set[str] = {
    'INITIATED',
    'VISIT_SCHEDULED',
    'OFFER_MADE',
    'NEGOTIATION',
    'PRICE_AGREED',
    'TOKEN_PENDING',
    'TOKEN_PAID',
    'AGREEMENT_SIGNED',
    'REGISTRATION',
}

TERMINAL_DEAL_STATUSES: Set[str] = {
    'COMPLETED',
    'COMMISSION_RELEASED',
    'CANCELLED',
    'EXPIRED',
}

# Phase 2.5: DISPUTED is BLOCKING, not terminal
# Deal cannot advance but CAN be resumed or cancelled after admin resolution
BLOCKED_DEAL_STATUSES: Set[str] = {
    'DISPUTED',
}

# Display labels for each status
DISPLAY_STATUS = {
    'INITIATED': 'Deal Started',
    'VISIT_SCHEDULED': 'Visit Scheduled',
    'OFFER_MADE': 'Offer Submitted',
    'NEGOTIATION': 'In Negotiation',
    'PRICE_AGREED': 'Price Agreed',
    'TOKEN_PENDING': 'Awaiting Token',
    'TOKEN_PAID': 'Token Paid',
    'AGREEMENT_SIGNED': 'Agreement Signed',
    'REGISTRATION': 'At Registration',
    'COMPLETED': 'Completed',
    'COMMISSION_RELEASED': 'Commission Released',
    'CANCELLED': 'Cancelled',
    'EXPIRED': 'Expired',
    'DISPUTED': 'Under Dispute',
}


# ============================================================================
# GUARDRAIL 2: Actor Permission Matrix — codified, not implicit
# ============================================================================

# Maps (from_status, to_status) → set of allowed actor roles
TRANSITION_PERMISSIONS: Dict[tuple, Set[str]] = {
    ('INITIATED', 'VISIT_SCHEDULED'):      {'AGENT', 'ADMIN'},
    ('INITIATED', 'OFFER_MADE'):           {'BUYER', 'ADMIN'},        # Skip visit (direct offer)
    ('INITIATED', 'CANCELLED'):            {'BUYER', 'SELLER', 'ADMIN'},
    
    ('VISIT_SCHEDULED', 'OFFER_MADE'):     {'BUYER', 'ADMIN'},
    ('VISIT_SCHEDULED', 'CANCELLED'):      {'BUYER', 'SELLER', 'ADMIN'},
    
    ('OFFER_MADE', 'NEGOTIATION'):         {'BUYER', 'SELLER', 'AGENT', 'ADMIN'},
    ('OFFER_MADE', 'PRICE_AGREED'):        {'SELLER', 'ADMIN'},       # Direct accept
    ('OFFER_MADE', 'CANCELLED'):           {'BUYER', 'SELLER', 'ADMIN'},
    
    ('NEGOTIATION', 'NEGOTIATION'):        {'BUYER', 'SELLER', 'AGENT', 'ADMIN'},  # Phase 2: Re-entry for subsequent offers
    ('NEGOTIATION', 'PRICE_AGREED'):       {'SELLER', 'ADMIN'},
    ('NEGOTIATION', 'CANCELLED'):          {'BUYER', 'SELLER', 'ADMIN'},
    
    ('PRICE_AGREED', 'TOKEN_PENDING'):     {'AGENT', 'ADMIN'},
    ('PRICE_AGREED', 'CANCELLED'):         {'BUYER', 'SELLER', 'ADMIN'},
    
    ('TOKEN_PENDING', 'TOKEN_PAID'):       {'BUYER'},                 # Only buyer pays
    ('TOKEN_PENDING', 'EXPIRED'):          {'SYSTEM', 'ADMIN'},
    ('TOKEN_PENDING', 'CANCELLED'):        {'BUYER', 'SELLER', 'ADMIN'},
    
    ('TOKEN_PAID', 'AGREEMENT_SIGNED'):    {'AGENT', 'ADMIN'},
    ('TOKEN_PAID', 'CANCELLED'):           {'BUYER', 'SELLER', 'ADMIN'},
    
    ('AGREEMENT_SIGNED', 'REGISTRATION'):  {'AGENT', 'ADMIN'},
    
    ('REGISTRATION', 'COMPLETED'):         {'AGENT', 'ADMIN'},
    
    ('COMPLETED', 'COMMISSION_RELEASED'):  {'ADMIN'},                 # Only admin releases commission
}

# Valid state transitions (derived from permission matrix)
VALID_TRANSITIONS: Dict[str, list] = {}
for (from_s, to_s) in TRANSITION_PERMISSIONS.keys():
    if from_s not in VALID_TRANSITIONS:
        VALID_TRANSITIONS[from_s] = []
    VALID_TRANSITIONS[from_s].append(to_s)

# ============================================================================
# PHASE 2: COMMISSION & MONEY CONSTANTS
# ============================================================================
from decimal import Decimal

BUYER_COMMISSION_PCT = Decimal('0.001')     # 0.1% (token/reservation)
SELLER_COMMISSION_PCT = Decimal('0.009')    # 0.9%
AGENT_SPLIT_PCT = Decimal('0.70')           # 70% of seller commission to agent
PLATFORM_SPLIT_PCT = Decimal('0.30')        # 30% of seller commission to platform

# Commission calculation:
# total_seller_portion = agreed_price * SELLER_COMMISSION_PCT
# agent_commission = total_seller_portion * AGENT_SPLIT_PCT
# platform_from_seller = total_seller_portion * PLATFORM_SPLIT_PCT
# platform_total = platform_from_seller + (agreed_price * BUYER_COMMISSION_PCT)


class DealService:
    """
    Unified Deal orchestration service.
    
    The DEAL entity is the single source of truth for a property transaction.
    It wraps visits, offers, reservations, and transactions into one
    auditable, state-driven record.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.events_service = DealEventsService(db)

    @asynccontextmanager
    async def _get_conn(self, existing_conn=None):
        """Helper to use an existing connection or acquire a new one"""
        if existing_conn:
            # When using an existing connection, transaction management is handled by the caller
            yield existing_conn
        else:
            async with self.db.acquire() as new_conn:
                yield new_conn
    
    # ========================================================================
    # STATE MACHINE GUARDS
    # ========================================================================
    
    def _can_transition(self, from_status: str, to_status: str) -> bool:
        """Check if a state transition is valid."""
        return to_status in VALID_TRANSITIONS.get(from_status, [])
    
    def _can_actor_transition(
        self, from_status: str, to_status: str, actor_role: str
    ) -> bool:
        """Check if a specific actor role is allowed to perform this transition."""
        allowed_roles = TRANSITION_PERMISSIONS.get((from_status, to_status), set())
        return actor_role in allowed_roles
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return DISPLAY_STATUS.get(status, status)
    
    def _get_allowed_actions(self, status: str, actor_role: str) -> list:
        """Compute allowed next actions for a given status and actor role."""
        actions = []
        for to_status in VALID_TRANSITIONS.get(status, []):
            if actor_role in TRANSITION_PERMISSIONS.get((status, to_status), set()):
                actions.append(to_status.lower())
        return actions
    
    # ========================================================================
    # DEAL CREATION
    # ========================================================================
    
    async def create_deal(
        self,
        property_id: UUID,
        buyer_id: UUID,
        ip_address: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new deal for a property.
        
        Requirements:
        - Property must be ACTIVE
        - No existing active deal on the property
        - Buyer cannot be the property seller
        - Property must have an assigned agent
        
        Snapshots all participant profiles at creation time.
        Transitions property status to UNDER_DEAL.
        """
        async with self.db.acquire() as conn:
            # Get property + seller + assigned agent
            property_data = await conn.fetchrow("""
                SELECT p.*, 
                       aa.agent_id,
                       seller.full_name as seller_name,
                       seller.email as seller_email,
                       seller.mobile_number as seller_mobile
                FROM properties p
                JOIN users seller ON seller.id = p.seller_id
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id 
                    AND aa.status = 'ACCEPTED'
                WHERE p.id = $1
            """, property_id)
            
            if not property_data:
                return {"success": False, "error": "Property not found"}
            
            if property_data['status'] != 'ACTIVE':
                return {
                    "success": False,
                    "error": f"Property must be ACTIVE to create a deal. Current status: {property_data['status']}"
                }
            
            if property_data['seller_id'] == buyer_id:
                return {"success": False, "error": "Buyer cannot be the property seller"}
            
            if not property_data['agent_id']:
                return {"success": False, "error": "Property must have an assigned agent to create a deal"}
            
            agent_id = property_data['agent_id']
            
            # Check for existing active deal
            existing = await conn.fetchrow("""
                SELECT id, status FROM deals
                WHERE property_id = $1 AND status = ANY($2::deal_status[])
            """, property_id, list(ACTIVE_DEAL_STATUSES))
            
            if existing:
                return {
                    "success": False,
                    "error": f"Property already has an active deal (status: {existing['status']})"
                }
            
            # Build participant snapshots
            buyer_data = await conn.fetchrow("""
                SELECT id, full_name, email, mobile_number
                FROM users WHERE id = $1
            """, buyer_id)
            
            if not buyer_data:
                return {"success": False, "error": "Buyer not found"}
            
            agent_profile = await conn.fetchrow("""
                SELECT ap.user_id, u.full_name, u.email, u.mobile_number,
                       ap.rating, ap.total_cases
                FROM agent_profiles ap
                JOIN users u ON u.id = ap.user_id
                WHERE ap.user_id = $1
            """, agent_id)
            
            buyer_snapshot = json.dumps({
                "id": str(buyer_data['id']),
                "full_name": buyer_data['full_name'],
                "email": buyer_data['email'],
                "mobile_number": buyer_data['mobile_number']
            })
            
            seller_snapshot = json.dumps({
                "id": str(property_data['seller_id']),
                "full_name": property_data['seller_name'],
                "email": property_data['seller_email'],
                "mobile_number": property_data['seller_mobile']
            })
            
            agent_snapshot = json.dumps({
                "id": str(agent_profile['user_id']),
                "full_name": agent_profile['full_name'],
                "email": agent_profile['email'],
                "mobile_number": agent_profile['mobile_number'],
                "rating": float(agent_profile['rating']) if agent_profile['rating'] else None,
                "total_cases": agent_profile['total_cases']
            })
            
            # Create deal + transition property in a single transaction
            async with conn.transaction():
                deal = await conn.fetchrow("""
                    INSERT INTO deals (
                        property_id, buyer_id, seller_id, agent_id,
                        status,
                        buyer_snapshot, seller_snapshot, agent_snapshot
                    )
                    VALUES ($1, $2, $3, $4, 'INITIATED', $5, $6, $7)
                    RETURNING *
                """, property_id, buyer_id, property_data['seller_id'], agent_id,
                    buyer_snapshot, seller_snapshot, agent_snapshot)
                
                # Transition property to UNDER_DEAL
                await conn.execute("""
                    UPDATE properties SET status = 'UNDER_DEAL' WHERE id = $1
                """, property_id)
                
                # Log creation event
                await self.events_service.log_event(
                    deal_id=deal['id'],
                    event_type='DEAL_CREATED',
                    actor_id=buyer_id,
                    actor_role='BUYER',
                    to_status='INITIATED',
                    notes=notes or 'Deal initiated by buyer',
                    metadata={
                        "property_id": str(property_id),
                        "ip_address": ip_address
                    },
                    conn=conn
                )
                
                # Log audit
                await conn.execute("""
                    INSERT INTO audit_logs (
                        user_id, action, entity_type, entity_id,
                        ip_address, details
                    )
                    VALUES ($1, 'DEAL_CREATED', 'deal', $2, $3, $4)
                """, buyer_id, deal['id'], ip_address,
                    json.dumps({"property_id": str(property_id), "actor_role": "BUYER"}))
            
            # Notify seller and agent
            try:
                notifications = NotificationsService(self.db)
                await notifications.create_notification(
                    user_id=property_data['seller_id'],
                    notification_type='DEAL_CREATED',
                    title='New Deal Started',
                    message=f'A buyer has initiated a deal on your property "{property_data["title"]}".',
                    related_entity_type='deal',
                    related_entity_id=deal['id']
                )
                await notifications.create_notification(
                    user_id=agent_id,
                    notification_type='DEAL_CREATED',
                    title='New Deal Assignment',
                    message=f'A new deal has been created for property "{property_data["title"]}". You are the assigned agent.',
                    related_entity_type='deal',
                    related_entity_id=deal['id']
                )
            except Exception:
                pass  # Notifications are best-effort
            
            return {
                "success": True,
                "deal": self._format_deal(deal, property_data['title']),
                "message": "Deal created successfully. Property is now under deal."
            }

        # Trust Engine: velocity fraud detection (best-effort)
        try:
            from .trust_fraud_engine import FraudDetectionService
            fd = FraudDetectionService(self.db)
            await fd.run_detectors("DEAL_CREATION", {
                "property_id": property_id,
                "buyer_id": buyer_id,
            })
        except Exception:
            pass

        return result_from_deal
    
    async def finalize_deal_from_offer(
        self,
        offer_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Finalize (or create) a Deal from an ACCEPTED offer.
        
        Promotes the transaction to 'PRICE_AGREED' status.
        Ensures execution_stage is 'AWAITING_DOCS'.
        Updates/Sets snapshots and agreed price.
        """
        async with self.db.acquire() as conn:
            # 1. Fetch Offer + Context
            offer_data = await conn.fetchrow("""
                SELECT 
                    o.id as offer_id, o.property_id, o.buyer_id, o.offered_price, o.counter_price,
                    p.seller_id, p.title as property_title, p.status as property_status,
                    aa.agent_id,
                    buyer.full_name as buyer_name, buyer.email as buyer_email, buyer.mobile_number as buyer_mobile,
                    seller.full_name as seller_name, seller.email as seller_email, seller.mobile_number as seller_mobile
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                JOIN users buyer ON buyer.id = o.buyer_id
                JOIN users seller ON seller.id = p.seller_id
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id AND aa.status = 'ACCEPTED'
                WHERE o.id = $1
            """, offer_id)
            
            if not offer_data:
                return {"success": False, "error": "Offer not found"}
            
            final_price = offer_data['counter_price'] if offer_data['counter_price'] else offer_data['offered_price']

            # 2. Check for existing deal (Shadow or Active)
            deal = await conn.fetchrow("""
                SELECT id, status FROM deals
                WHERE property_id = $1 AND status != 'CANCELLED' AND status != 'EXPIRED'
            """, offer_data['property_id'])
            
            # Prepare Snapshots
            buyer_snapshot = json.dumps({
                "id": str(offer_data['buyer_id']),
                "full_name": offer_data['buyer_name'],
                "email": offer_data['buyer_email'],
                "mobile_number": offer_data['buyer_mobile']
            })
            seller_snapshot = json.dumps({
                "id": str(offer_data['seller_id']),
                "full_name": offer_data['seller_name'],
                "email": offer_data['seller_email'],
                "mobile_number": offer_data['seller_mobile']
            })
            agent_snapshot = {}
            if offer_data['agent_id']:
                agent_profile = await conn.fetchrow("""
                    SELECT ap.user_id, u.full_name, u.email, u.mobile_number
                    FROM agent_profiles ap
                    JOIN users u ON u.id = ap.user_id
                    WHERE ap.user_id = $1
                """, offer_data['agent_id'])
                if agent_profile:
                    agent_snapshot = json.dumps({
                        "id": str(agent_profile['user_id']),
                        "full_name": agent_profile['full_name'],
                        "email": agent_profile['email']
                    })
            else:
                 return {"success": False, "error": "Property must have an assigned agent"}

            async with conn.transaction():
                if deal:
                    # UPDATE existing deal
                    deal_id = deal['id']
                    await conn.execute("""
                        UPDATE deals 
                        SET status = 'PRICE_AGREED',
                            agreed_price = $2,
                            offer_id = $3,
                            execution_stage = 'AWAITING_DOCS',
                            buyer_snapshot = $4,
                            seller_snapshot = $5,
                            agent_snapshot = $6,
                            updated_at = NOW()
                        WHERE id = $1
                    """, deal_id, final_price, offer_id, 
                       buyer_snapshot, seller_snapshot, json.dumps(agent_snapshot))
                else:
                    # CREATE new deal
                    new_deal = await conn.fetchrow("""
                        INSERT INTO deals (
                            property_id, buyer_id, seller_id, agent_id,
                            status, agreed_price, offer_id,
                            buyer_snapshot, seller_snapshot, agent_snapshot,
                            execution_stage
                        )
                        VALUES ($1, $2, $3, $4, 'PRICE_AGREED', $5, $6, $7, $8, $9, 'AWAITING_DOCS')
                        RETURNING id
                    """, offer_data['property_id'], offer_data['buyer_id'], offer_data['seller_id'], offer_data['agent_id'],
                       final_price, offer_id,
                       buyer_snapshot, seller_snapshot, json.dumps(agent_snapshot))
                    deal_id = new_deal['id']

                # Update Property Status
                await conn.execute("UPDATE properties SET status = 'UNDER_DEAL' WHERE id = $1", offer_data['property_id'])
                
            # Log Event
            await self.events_service.log_event(
                deal_id=deal_id,
                event_type='DEAL_CREATED' if not deal else 'STATUS_CHANGED',
                actor_id=offer_data['buyer_id'], 
                actor_role='SYSTEM',
                to_status='PRICE_AGREED',
                notes='Deal finalized from Accepted Offer',
                metadata={"offer_id": str(offer_id), "ip": ip_address},
                conn=conn
            )
            
            # 3. Initialize Financial Ledger (Phase 4A)
            try:
                from .ledger_service import LedgerService
                ledger_service = LedgerService(self.db)
                await ledger_service.initialize_ledger(
                    deal_id=deal_id,
                    deal_value=final_price,
                    conn=conn
                )
            except Exception as e:
                # Log error but don't fail the deal creation
                print(f"[ERROR] Failed to init ledger for deal {deal_id}: {e}")

        return {
            "success": True,
            "deal_id": deal_id,
            "message": "Deal finalized successfully from offer."
        }

    # ========================================================================
    # STATE TRANSITIONS
    # ========================================================================
    
    async def transition_deal(
        self,
        deal_id: UUID,
        new_status: str,
        actor_id: UUID,
        actor_role: str,
        notes: Optional[str] = None,
        metadata: Optional[dict] = None,
        ip_address: Optional[str] = None,
        existing_conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """
        Advance a deal to the next state.
        
        Validates:
        1. State transition is valid (state machine)
        2. Actor has permission (permission matrix)
        3. Deal is in an active state
        
        Records event in immutable timeline.
        """
        async with self._get_conn(existing_conn) as conn:
            deal = await conn.fetchrow("""
                SELECT d.*, p.title as property_title
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                WHERE d.id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            current_status = deal['status']
            
            # Guard 1: Is deal still active?
            if current_status in TERMINAL_DEAL_STATUSES:
                return {
                    "success": False,
                    "error": f"Deal is in terminal state: {current_status}. No further transitions allowed."
                }
            
            # Guard 1.5 (Phase 2.5): Is deal frozen under dispute?
            # Guard 1.5 (Phase 2.5): Is deal frozen under dispute?
            if deal.get('is_frozen'):
                return {
                    "success": False,
                    "error": f"Deal is frozen: {deal.get('freeze_reason')}. Resolve disputes before proceeding."
                }
            
            if current_status in BLOCKED_DEAL_STATUSES:
                return {
                    "success": False,
                    "error": "Deal is frozen under dispute. Resolve the dispute before proceeding."
                }
            
            # Guard 2: Is the transition valid?
            if not self._can_transition(current_status, new_status):
                valid = VALID_TRANSITIONS.get(current_status, [])
                return {
                    "success": False,
                    "error": f"Invalid transition: {current_status} → {new_status}. Valid transitions: {valid}"
                }
            
            # Guard 3: Does this actor have permission?
            if not self._can_actor_transition(current_status, new_status, actor_role):
                allowed = TRANSITION_PERMISSIONS.get((current_status, new_status), set())
                return {
                    "success": False,
                    "error": f"Role '{actor_role}' is not authorized for transition {current_status} → {new_status}. Allowed roles: {allowed}"
                }
            
            # Guard 4: Is actor a participant in this deal?
            if actor_role not in ('ADMIN', 'SYSTEM'):
                is_participant = (
                    actor_id == deal['buyer_id'] or
                    actor_id == deal['seller_id'] or
                    actor_id == deal['agent_id']
                )
                if not is_participant:
                    return {
                        "success": False,
                        "error": "You are not a participant in this deal"
                    }
            
            # Guard 5 (Phase 3): Agreement gate for key transitions
            if new_status == 'AGREEMENT_SIGNED':
                from .agreement_service import AgreementService
                agreement_svc = AgreementService(self.db)
                has_token_agreement = await agreement_svc.check_agreement_signed(deal_id, 'TOKEN')
                if not has_token_agreement:
                    return {
                        "success": False,
                        "error": "Cannot advance to AGREEMENT_SIGNED — TOKEN agreement must be signed by buyer and seller first."
                    }
            
            if new_status == 'REGISTRATION':
                from .agreement_service import AgreementService
                agreement_svc = AgreementService(self.db)
                has_sale_agreement = await agreement_svc.check_agreement_signed(deal_id, 'SALE')
                if not has_sale_agreement:
                    return {
                        "success": False,
                        "error": "Cannot advance to REGISTRATION — SALE agreement must be signed by buyer and seller first."
                    }

                # Guard 5b (Phase 6): Title clear gate
                from .title_escrow_engine import TitleSearchService
                ts_svc = TitleSearchService(self.db)
                title_is_clear = await ts_svc.check_title_clear(deal_id)
                if not title_is_clear:
                    return {
                        "success": False,
                        "error": "Cannot advance to REGISTRATION — title search must be in CLEAR status. Complete a title search first."
                    }
            
            # Guard 6 (Phase 5A): Commission release gate
            if new_status == 'COMMISSION_RELEASED':
                from .commission_service import CommissionService as CS5A
                commission_svc = CS5A(self.db)
                commission_result = await commission_svc.get_commission_status(deal_id)
                if commission_result['success']:
                    commission = commission_result['commission']
                    if commission['status'] != 'SETTLEMENT_PENDING':
                        return {
                            "success": False,
                            "error": f"Cannot release commission — commission must be authorized for settlement. Current status: {commission['status']}"
                        }
                else:
                    return {
                        "success": False,
                        "error": "Cannot release commission — financial ledger not found for this deal."
                    }
            
            # Perform transition
            async with conn.transaction():
                await conn.execute("""
                    UPDATE deals SET status = $2 WHERE id = $1
                """, deal_id, new_status)
                
                # Handle property status changes for key transitions
                if new_status == 'COMPLETED':
                    await conn.execute("""
                        UPDATE properties SET status = 'SOLD' WHERE id = $1
                    """, deal['property_id'])
                    
                    # Phase 5A: Commission lifecycle — EARNED + start cooling-off
                    try:
                        from .commission_service import CommissionService as CS5A
                        commission_svc = CS5A(self.db)
                        await commission_svc.handle_deal_completed(deal_id)
                    except Exception as e:
                        # Log but don't block the transition
                        import logging
                        logging.getLogger(__name__).warning(
                            f"Commission lifecycle hook failed for deal {deal_id}: {e}"
                        )

                    # Trust Engine: recompute scores on deal completion
                    try:
                        from .trust_fraud_engine import TrustScoreService, AgentScoreService
                        _ts = TrustScoreService(self.db)
                        await _ts.compute_property_score(deal['property_id'], trigger_source="DEAL_COMPLETED")
                        _ag = AgentScoreService(self.db)
                        await _ag.compute_agent_score(deal['agent_id'], trigger_source="DEAL_COMPLETED")
                    except Exception:
                        pass

                    # Phase 6: Generate escrow disbursement schedule on completion
                    try:
                        from .title_escrow_engine import EscrowService
                        escrow_svc = EscrowService(self.db)
                        await escrow_svc.generate_disbursement_schedule(deal_id)
                    except Exception as _e:
                        import logging
                        logging.getLogger(__name__).warning(
                            f"Escrow schedule generation failed for deal {deal_id}: {_e}"
                        )
                
                # Phase 5A: Commission release — mark as SETTLED
                if new_status == 'COMMISSION_RELEASED':
                    try:
                        from .commission_service import CommissionService as CS5A
                        commission_svc = CS5A(self.db)
                        await commission_svc.transition_commission(deal_id, 'SETTLED')
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).warning(
                            f"Commission settle hook failed for deal {deal_id}: {e}"
                        )
                
                # Log event
                await self.events_service.log_event(
                    deal_id=deal_id,
                    event_type='STATUS_CHANGED',
                    from_status=current_status,
                    to_status=new_status,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    notes=notes,
                    metadata=metadata or {},
                    conn=conn
                )
                
                # Audit log
                await conn.execute("""
                    INSERT INTO audit_logs (
                        user_id, action, entity_type, entity_id,
                        ip_address, details
                    )
                    VALUES ($1, 'DEAL_TRANSITION', 'deal', $2, $3, $4)
                """, actor_id, deal_id, ip_address,
                    json.dumps({
                        "actor_role": actor_role,
                        "from": current_status,
                        "to": new_status,
                        "notes": notes
                    }))
            
            # Re-fetch updated deal
            updated = await conn.fetchrow("""
                SELECT d.*, p.title as property_title
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                WHERE d.id = $1
            """, deal_id)
            
            return {
                "success": True,
                "deal": self._format_deal(updated, updated['property_title']),
                "transition": {
                    "from": current_status,
                    "to": new_status,
                    "display_from": self._get_display_status(current_status),
                    "display_to": self._get_display_status(new_status)
                },
                "message": f"Deal transitioned: {self._get_display_status(current_status)} → {self._get_display_status(new_status)}"
            }
    
    # ========================================================================
    # DEAL CANCELLATION
    # ========================================================================
    
    async def cancel_deal(
        self,
        deal_id: UUID,
        actor_id: UUID,
        actor_role: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cancel a deal and revert property status to ACTIVE.
        
        Only Buyer, Seller, or Admin can cancel.
        Agent cannot cancel — they must escalate to admin.
        """
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow("""
                SELECT d.*, p.title as property_title
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                WHERE d.id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            current_status = deal['status']
            
            if current_status in TERMINAL_DEAL_STATUSES:
                return {
                    "success": False,
                    "error": f"Cannot cancel deal in terminal state: {current_status}"
                }
            
            # Check cancellation permission
            if not self._can_actor_transition(current_status, 'CANCELLED', actor_role):
                return {
                    "success": False,
                    "error": f"Role '{actor_role}' cannot cancel deal in {current_status} state"
                }
            
            # Verify actor is participant (unless admin)
            if actor_role != 'ADMIN':
                is_participant = (
                    actor_id == deal['buyer_id'] or
                    actor_id == deal['seller_id']
                )
                if not is_participant:
                    return {
                        "success": False,
                        "error": "You are not authorized to cancel this deal"
                    }
            
            async with conn.transaction():
                # Cancel deal
                await conn.execute("""
                    UPDATE deals 
                    SET status = 'CANCELLED',
                        cancelled_at = NOW(),
                        cancelled_by = $2,
                        cancellation_reason = $3
                    WHERE id = $1
                """, deal_id, actor_id, reason)
                
                # Payment Engine Refund Integration
                if deal.get('reservation_id'):
                    reservation = await conn.fetchrow("""
                        SELECT payment_intent_id, amount
                        FROM reservations
                        WHERE id = $1
                    """, deal['reservation_id'])
                    
                    if reservation and reservation.get('payment_intent_id'):
                        intent = await conn.fetchrow("""
                            SELECT id, status FROM payment_intents
                            WHERE id = $1 AND status IN ('CAPTURED', 'SETTLED')
                        """, reservation['payment_intent_id'])
                        
                        if intent:
                            try:
                                from .payment_engine.payment_service import PaymentService
                                payment_svc = PaymentService(self.db)
                                await payment_svc.request_refund(
                                    intent_id=intent['id'],
                                    amount=Decimal(str(reservation['amount'])),
                                    reason=f"Deal cancelled based on reason: {reason}" if reason else "Deal cancelled before completion",
                                    requested_by=actor_id
                                )
                                # Update reservation refund amount
                                await conn.execute("""
                                    UPDATE reservations
                                    SET refund_amount = $2
                                    WHERE id = $1
                                """, deal['reservation_id'], reservation['amount'])
                                
                                # Record refund in ledger
                                from .ledger_service import LedgerService
                                ledger_svc = LedgerService(self.db)
                                await ledger_svc.record_entry(
                                    deal_id=deal_id,
                                    entry_type='TOKEN_REFUNDED',
                                    amount=Decimal(str(reservation['amount'])),
                                    direction='DEBIT',
                                    description=f"Token refunded due to deal cancellation. Reason: {reason}" if reason else "Token refunded due to deal cancellation.",
                                    user_id=actor_id,
                                    verification_status='VERIFIED'
                                )
                            except Exception as e:
                                import logging
                                logging.getLogger(__name__).warning(
                                    f"Refund failed during deal {deal_id} cancellation: {e}"
                                )
                
                # Revert property to ACTIVE
                await conn.execute("""
                    UPDATE properties SET status = 'ACTIVE' WHERE id = $1
                """, deal['property_id'])
                
                # Log cancellation event
                await self.events_service.log_event(
                    deal_id=deal_id,
                    event_type='CANCELLED',
                    from_status=current_status,
                    to_status='CANCELLED',
                    actor_id=actor_id,
                    actor_role=actor_role,
                    notes=reason or 'Deal cancelled',
                    conn=conn
                )
                
                # Audit log
                await conn.execute("""
                    INSERT INTO audit_logs (
                        user_id, action, entity_type, entity_id,
                        ip_address, details
                    )
                    VALUES ($1, 'DEAL_CANCELLED', 'deal', $2, $3, $4)
                """, actor_id, deal_id, ip_address,
                    json.dumps({
                        "actor_role": actor_role,
                        "from_status": current_status,
                        "reason": reason
                    }))
            
            # Notify all participants
            try:
                notifications = NotificationsService(self.db)
                participants = [deal['buyer_id'], deal['seller_id'], deal['agent_id']]
                for pid in participants:
                    if pid != actor_id:
                        await notifications.create_notification(
                            user_id=pid,
                            notification_type='DEAL_CANCELLED',
                            title='Deal Cancelled',
                            message=f'Deal for "{deal["property_title"]}" has been cancelled. Reason: {reason or "Not specified"}',
                            related_entity_type='deal',
                            related_entity_id=deal_id
                        )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Deal cancelled. Property status reverted to ACTIVE.",
                "deal": {
                    "id": str(deal_id),
                    "status": "CANCELLED",
                    "display_status": "Cancelled",
                    "previous_status": current_status,
                    "cancellation_reason": reason
                }
            }
    
    # ========================================================================
    # ENTITY LINKING (for integration with existing services)
    # ========================================================================
    
    async def link_visit(
        self,
        deal_id: UUID,
        visit_request_id: UUID,
        actor_id: UUID,
        actor_role: str,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """Link a visit request to a deal."""
        return await self._link_entity(
            deal_id, 'visit_request_id', visit_request_id,
            'VISIT_LINKED', actor_id, actor_role, conn
        )
    
    async def link_offer(
        self,
        deal_id: UUID,
        offer_id: UUID,
        agreed_price: Decimal,
        actor_id: UUID,
        actor_role: str,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """Link an accepted offer to a deal and set agreed price."""
        result = await self._link_entity(
            deal_id, 'offer_id', offer_id,
            'OFFER_LINKED', actor_id, actor_role, conn,
            extra_updates={"agreed_price": agreed_price}
        )
        return result
    
    async def link_reservation(
        self,
        deal_id: UUID,
        reservation_id: UUID,
        token_amount: Decimal,
        actor_id: UUID,
        actor_role: str,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """Link a reservation (token payment) to a deal."""
        return await self._link_entity(
            deal_id, 'reservation_id', reservation_id,
            'RESERVATION_LINKED', actor_id, actor_role, conn,
            extra_updates={"token_amount": token_amount}
        )
    
    async def link_transaction(
        self,
        deal_id: UUID,
        transaction_id: UUID,
        commission_amount: Decimal,
        platform_fee: Decimal,
        agent_commission: Decimal,
        actor_id: UUID,
        actor_role: str,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """Link a completed transaction to a deal."""
        return await self._link_entity(
            deal_id, 'transaction_id', transaction_id,
            'TRANSACTION_LINKED', actor_id, actor_role, conn,
            extra_updates={
                "commission_amount": commission_amount,
                "platform_fee": platform_fee,
                "agent_commission": agent_commission
            }
        )
    
    async def _link_entity(
        self,
        deal_id: UUID,
        fk_column: str,
        entity_id: UUID,
        event_type: str,
        actor_id: UUID,
        actor_role: str,
        conn: Optional[asyncpg.Connection] = None,
        extra_updates: Optional[dict] = None
    ) -> Dict[str, Any]:
        """Generic entity linking with event logging."""
        should_release = conn is None
        if conn is None:
            conn = await self.db.acquire()
        
        try:
            # Build SET clause
            set_parts = [f"{fk_column} = ${1}"]
            params = [entity_id]
            
            if extra_updates:
                for k, v in extra_updates.items():
                    params.append(v)
                    set_parts.append(f"{k} = ${len(params)}")
            
            params.append(deal_id)
            set_clause = ", ".join(set_parts)
            
            await conn.execute(f"""
                UPDATE deals SET {set_clause}
                WHERE id = ${len(params)}
            """, *params)
            
            await self.events_service.log_event(
                deal_id=deal_id,
                event_type=event_type,
                actor_id=actor_id,
                actor_role=actor_role,
                notes=f"Linked {fk_column.replace('_id', '')} {entity_id}",
                metadata={fk_column: str(entity_id)},
                conn=conn
            )
            
            return {"success": True}
        finally:
            if should_release:
                await self.db.release(conn)
    
    # ========================================================================
    # QUERIES
    # ========================================================================
    
    async def get_deal(
        self,
        deal_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get deal details. Only accessible by deal participants or admin."""
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow("""
                SELECT d.*,
                       p.title as property_title, p.city as property_city,
                       p.address as property_address, p.price as property_price,
                       p.type as property_type, p.status as property_status,
                       p.bedrooms, p.bathrooms, p.area_sqft,
                       p.property_sub_type, p.floor_number, p.total_floors,
                       p.property_age_years, p.balconies, p.parking_available,
                       p.parking_count, p.furnishing_status, p.facing_direction,
                       p.price_negotiable, p.maintenance_charges, p.ownership_type,
                       buyer.full_name as buyer_name,
                       seller.full_name as seller_name,
                       agent_user.full_name as agent_name,
                       r.proof_url as reservation_proof_url,
                       r.status as reservation_status
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                JOIN users agent_user ON agent_user.id = d.agent_id
                LEFT JOIN reservations r ON r.id = d.reservation_id
                WHERE d.id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            # Check access — must be participant or admin
            user_roles = await conn.fetch("""
                SELECT r.name FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
            """, user_id)
            role_names = [r['name'] for r in user_roles]
            
            is_participant = (
                user_id == deal['buyer_id'] or
                user_id == deal['seller_id'] or
                user_id == deal['agent_id']
            )
            is_admin = 'ADMIN' in role_names or 'CEO' in role_names
            
            if not is_participant and not is_admin:
                return {"success": False, "error": "Access denied"}
            
            # Determine actor's role in this deal
            if user_id == deal['buyer_id']:
                viewer_role = 'BUYER'
            elif user_id == deal['seller_id']:
                viewer_role = 'SELLER'
            elif user_id == deal['agent_id']:
                viewer_role = 'AGENT'
            else:
                viewer_role = 'ADMIN'
            
            # Get timeline
            timeline_result = await self.events_service.get_timeline(deal_id, limit=50)
            
            return {
                "success": True,
                "deal": {
                    **self._format_deal(deal, deal['property_title']),
                    "execution_stage": deal.get('execution_stage'),
                    "pre_dispute_status": deal.get('pre_dispute_status'),
                    "is_frozen": deal.get('is_frozen', False),
                    "freeze_reason": deal.get('freeze_reason'),
                    "registration_date": deal.get('registration_date').isoformat() if deal.get('registration_date') else None,
                    "registration_notes": deal.get('registration_notes'),
                    "agent_commission": float(deal['agent_commission']) if deal.get('agent_commission') else None,
                    "property": {
                        "id": str(deal['property_id']),
                        "title": deal['property_title'],
                        "city": deal['property_city'],
                        "address": deal['property_address'],
                        "price": float(deal['property_price']) if deal['property_price'] else None,
                        "type": deal['property_type'],
                        "status": deal['property_status'],
                        "bedrooms": deal.get('bedrooms'),
                        "bathrooms": deal.get('bathrooms'),
                        "area_sqft": float(deal['area_sqft']) if deal.get('area_sqft') else None,
                        "property_sub_type": deal.get('property_sub_type'),
                        "floor_number": deal.get('floor_number'),
                        "total_floors": deal.get('total_floors'),
                        "property_age_years": deal.get('property_age_years'),
                        "balconies": deal.get('balconies'),
                        "parking_available": deal.get('parking_available'),
                        "parking_count": deal.get('parking_count'),
                        "furnishing_status": deal.get('furnishing_status'),
                        "facing_direction": deal.get('facing_direction'),
                        "price_negotiable": deal.get('price_negotiable'),
                        "maintenance_charges": float(deal['maintenance_charges']) if deal.get('maintenance_charges') else None,
                        "ownership_type": deal.get('ownership_type')
                    },
                    "parties": {
                        "buyer": {
                            "id": str(deal['buyer_id']),
                            "name": deal['buyer_name'],
                            "email": json.loads(deal.get('buyer_snapshot', '{}')).get('email'),
                            "mobile_number": json.loads(deal.get('buyer_snapshot', '{}')).get('mobile_number')
                        },
                        "seller": {
                            "id": str(deal['seller_id']),
                            "name": deal['seller_name'],
                            "email": json.loads(deal.get('seller_snapshot', '{}')).get('email'),
                            "mobile_number": json.loads(deal.get('seller_snapshot', '{}')).get('mobile_number')
                        },
                        "agent": {
                            "id": str(deal['agent_id']),
                            "name": deal['agent_name'],
                            "email": json.loads(deal.get('agent_snapshot', '{}')).get('email'),
                            "mobile_number": json.loads(deal.get('agent_snapshot', '{}')).get('mobile_number'),
                            "rating": json.loads(deal.get('agent_snapshot', '{}')).get('rating'),
                            "total_cases": json.loads(deal.get('agent_snapshot', '{}')).get('total_cases')
                        }
                    },
                    "reservation": {
                        "id": str(deal['reservation_id']) if deal['reservation_id'] else None,
                        "status": deal['reservation_status'],
                        "proof_url": deal['reservation_proof_url']
                    } if deal['reservation_id'] else None,
                    "viewer_role": viewer_role,
                    "allowed_actions": self._get_allowed_actions(deal['status'], viewer_role),
                    "timeline": timeline_result.get('events', [])
                }
            }
    
    async def get_deals_for_user(
        self,
        user_id: UUID,
        status_filter: Optional[str] = None,
        active_only: bool = False,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get all deals for a user (role-aware).
        
        Returns deals where user is buyer, seller, or agent.
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Base filter: user is a participant
            where_clause = "(d.buyer_id = $1 OR d.seller_id = $1 OR d.agent_id = $1)"
            params = [user_id]
            
            if active_only:
                params.append(list(ACTIVE_DEAL_STATUSES))
                where_clause += f" AND d.status = ANY(${len(params)}::deal_status[])"
            elif status_filter:
                params.append(status_filter)
                where_clause += f" AND d.status = ${len(params)}"
            
            # Count
            count = await conn.fetchval(f"""
                SELECT COUNT(*) FROM deals d WHERE {where_clause}
            """, *params)
            
            # Fetch
            params.extend([per_page, offset])
            deals = await conn.fetch(f"""
                SELECT d.*,
                       p.title as property_title, p.city as property_city,
                       p.type as property_type,
                       p.bedrooms, p.bathrooms, p.area_sqft,
                       buyer.full_name as buyer_name,
                       seller.full_name as seller_name,
                       agent_user.full_name as agent_name
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                JOIN users buyer ON buyer.id = d.buyer_id
                JOIN users seller ON seller.id = d.seller_id
                JOIN users agent_user ON agent_user.id = d.agent_id
                WHERE {where_clause}
                ORDER BY d.updated_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """, *params)
            
            result_deals = []
            for deal in deals:
                # Determine user's role in this deal
                if user_id == deal['buyer_id']:
                    viewer_role = 'BUYER'
                elif user_id == deal['seller_id']:
                    viewer_role = 'SELLER'
                elif user_id == deal['agent_id']:
                    viewer_role = 'AGENT'
                else:
                    viewer_role = 'ADMIN'
                
                result_deals.append({
                    **self._format_deal(deal, deal['property_title']),
                    "property_city": deal['property_city'],
                    "property_type": deal['property_type'],
                    "buyer_name": deal['buyer_name'],
                    "seller_name": deal['seller_name'],
                    "agent_name": deal['agent_name'],
                    "viewer_role": viewer_role,
                    "allowed_actions": self._get_allowed_actions(deal['status'], viewer_role)
                })
            
            return {
                "success": True,
                "deals": result_deals,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": count,
                    "total_pages": (count + per_page - 1) // per_page if count > 0 else 0
                }
            }
    
    async def get_deal_by_property(
        self,
        property_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """
        Get the active deal for a property (if any).
        
        Uses ACTIVE_DEAL_STATUSES — the single source of truth.
        """
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow("""
                SELECT d.*, p.title as property_title
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                WHERE d.property_id = $1 
                  AND d.status = ANY($2::deal_status[])
                ORDER BY d.created_at DESC
                LIMIT 1
            """, property_id, list(ACTIVE_DEAL_STATUSES))
            
            if not deal:
                return None
            
            return self._format_deal(deal, deal['property_title'])
    
    async def get_active_deal_by_property(
        self,
        property_id: UUID,
        conn: Optional[asyncpg.Connection] = None
    ) -> Optional[asyncpg.Record]:
        """
        Get the active deal for a property (raw DB row).
        
        For internal use by service integrations.
        Returns raw asyncpg.Record or None.
        """
        should_release = conn is None
        if conn is None:
            conn = await self.db.acquire()
        
        try:
            deal = await conn.fetchrow("""
                SELECT d.*
                FROM deals d
                WHERE d.property_id = $1 
                  AND d.status = ANY($2::deal_status[])
                ORDER BY d.created_at DESC
                LIMIT 1
            """, property_id, list(ACTIVE_DEAL_STATUSES))
            
            return deal
        finally:
            if should_release:
                await self.db.release(conn)
    
    async def get_or_create_deal(
        self,
        property_id: UUID,
        buyer_id: UUID,
        conn: Optional[asyncpg.Connection] = None
    ) -> Optional[asyncpg.Record]:
        """
        Get existing active deal or silently create one.
        
        For internal use by service integrations.
        Returns raw asyncpg.Record or None if creation fails.
        
        This differs from create_deal() in that it:
        - Returns existing deal if present (no error)
        - Returns raw DB row (not formatted)
        - Gracefully returns None on creation failure
        """
        should_release = conn is None
        if conn is None:
            conn = await self.db.acquire()
        
        try:
            # Check for existing active deal
            existing = await self.get_active_deal_by_property(property_id, conn)
            if existing:
                return existing
            
            # Need to create new deal - get property + agent info
            property_data = await conn.fetchrow("""
                SELECT p.*, 
                       aa.agent_id,
                       seller.full_name as seller_name,
                       seller.email as seller_email,
                       seller.mobile_number as seller_mobile
                FROM properties p
                JOIN users seller ON seller.id = p.seller_id
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id 
                    AND aa.status = 'ACCEPTED'
                WHERE p.id = $1
            """, property_id)
            
            if not property_data:
                return None
            
            # Allow ACTIVE or UNDER_DEAL (deal may have been created elsewhere)
            if property_data['status'] not in ('ACTIVE', 'UNDER_DEAL'):
                return None
            
            if property_data['seller_id'] == buyer_id:
                return None  # Buyer can't be seller
            
            if not property_data['agent_id']:
                return None  # Need assigned agent
            
            agent_id = property_data['agent_id']
            
            # Build snapshots
            buyer_data = await conn.fetchrow("""
                SELECT id, full_name, email, mobile_number
                FROM users WHERE id = $1
            """, buyer_id)
            
            if not buyer_data:
                return None
            
            agent_profile = await conn.fetchrow("""
                SELECT ap.user_id, u.full_name, u.email, u.mobile_number,
                       ap.rating, ap.total_cases
                FROM agent_profiles ap
                JOIN users u ON u.id = ap.user_id
                WHERE ap.user_id = $1
            """, agent_id)
            
            buyer_snapshot = json.dumps({
                "id": str(buyer_data['id']),
                "full_name": buyer_data['full_name'],
                "email": buyer_data['email'],
                "mobile_number": buyer_data['mobile_number']
            })
            
            seller_snapshot = json.dumps({
                "id": str(property_data['seller_id']),
                "full_name": property_data['seller_name'],
                "email": property_data['seller_email'],
                "mobile_number": property_data['seller_mobile']
            })
            
            agent_snapshot = json.dumps({
                "id": str(agent_profile['user_id']),
                "full_name": agent_profile['full_name'],
                "email": agent_profile['email'],
                "mobile_number": agent_profile['mobile_number'],
                "rating": float(agent_profile['rating']) if agent_profile['rating'] else None,
                "total_cases": agent_profile['total_cases']
            })
            
            # Create deal
            async with conn.transaction():
                deal = await conn.fetchrow("""
                    INSERT INTO deals (
                        property_id, buyer_id, seller_id, agent_id,
                        status,
                        buyer_snapshot, seller_snapshot, agent_snapshot
                    )
                    VALUES ($1, $2, $3, $4, 'INITIATED', $5, $6, $7)
                    RETURNING *
                """, property_id, buyer_id, property_data['seller_id'], agent_id,
                    buyer_snapshot, seller_snapshot, agent_snapshot)
                
                # Transition property to UNDER_DEAL (if not already)
                if property_data['status'] == 'ACTIVE':
                    await conn.execute("""
                        UPDATE properties SET status = 'UNDER_DEAL' WHERE id = $1
                    """, property_id)
                
                # Log creation event
                await self.events_service.log_event(
                    deal_id=deal['id'],
                    event_type='DEAL_CREATED',
                    actor_id=buyer_id,
                    actor_role='BUYER',
                    to_status='INITIATED',
                    notes='Deal auto-created by legacy service integration',
                    metadata={"property_id": str(property_id), "source": "auto"},
                    conn=conn
                )
            
            return deal
            
        except Exception as e:
            # Silent failure - don't block legacy flows
            print(f"[WARN] get_or_create_deal failed: {str(e)}")
            return None
        finally:
            if should_release:
                await self.db.release(conn)
    
    
    # ========================================================================
    # PHASE 2.5: CANCELLATION & DEAL FREEZE
    # ========================================================================
    
    # States where cancellation is free (no penalty)
    FREE_CANCEL_STATES = {'INITIATED', 'VISIT_SCHEDULED', 'OFFER_MADE', 
                          'NEGOTIATION', 'TOKEN_PENDING'}
    
    # States where cancellation triggers penalty + auto-dispute
    PENALTY_CANCEL_STATES = {'PRICE_AGREED', 'TOKEN_PAID'}
    
    # States where cancellation is BLOCKED (dispute only)
    BLOCKED_CANCEL_STATES = {'AGREEMENT_SIGNED', 'REGISTRATION', 
                             'COMPLETED', 'COMMISSION_RELEASED'}
    
    async def cancel_deal(
        self,
        deal_id: UUID,
        actor_id: UUID,
        actor_role: str,
        reason: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cancel a deal with state-based penalty rules.
        
        Cancellation Matrix:
        - INITIATED → NEGOTIATION: Free cancel
        - PRICE_AGREED: Cancel with intent logged
        - TOKEN_PENDING: Free cancel
        - TOKEN_PAID: Penalty + auto-dispute + deal freeze
        - AGREEMENT_SIGNED+: BLOCKED — must raise dispute
        """
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow("""
                SELECT d.*, p.title as property_title
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                WHERE d.id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            current_status = deal['status']
            
            # Guard: Terminal deals cannot be cancelled
            if current_status in TERMINAL_DEAL_STATUSES:
                return {
                    "success": False,
                    "error": f"Deal is in terminal state: {current_status}. Cannot cancel."
                }
            
            # Guard: Disputed deals cannot be cancelled (must resolve first)
            if current_status in BLOCKED_DEAL_STATUSES:
                return {
                    "success": False,
                    "error": "Deal is under dispute. Resolve the dispute before cancelling."
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
            
            # Determine actor's deal role
            if actor_id == deal['buyer_id']:
                deal_role = 'BUYER'
            elif actor_id == deal['seller_id']:
                deal_role = 'SELLER'
            elif actor_id == deal['agent_id']:
                deal_role = 'AGENT'
            else:
                deal_role = actor_role
            
            # ================================================================
            # BLOCKED CANCEL STATES (AGREEMENT_SIGNED+)
            # ================================================================
            if current_status in self.BLOCKED_CANCEL_STATES:
                return {
                    "success": False,
                    "error": f"Cannot cancel deal in {current_status} state. You must raise a dispute instead.",
                    "action_required": "RAISE_DISPUTE"
                }
            
            # ================================================================
            # PENALTY CANCEL STATES (TOKEN_PAID)
            # ================================================================
            if current_status == 'TOKEN_PAID':
                return await self._cancel_with_penalty(
                    deal=deal,
                    deal_role=deal_role,
                    actor_id=actor_id,
                    actor_role=actor_role,
                    reason=reason,
                    ip_address=ip_address,
                    conn=conn
                )
            
            # ================================================================
            # PRICE_AGREED — Cancel with intent logged (no penalty)
            # ================================================================
            if current_status == 'PRICE_AGREED':
                # Log cancellation intent (legally significant)
                async with conn.transaction():
                    await conn.execute("""
                        UPDATE deals 
                        SET status = 'CANCELLED',
                            cancelled_at = NOW(),
                            cancelled_by = $2,
                            cancellation_reason = $3
                        WHERE id = $1
                    """, deal_id, actor_id, reason)
                    
                    # Restore property to ACTIVE
                    await conn.execute("""
                        UPDATE properties SET status = 'ACTIVE' 
                        WHERE id = $1 AND status = 'UNDER_DEAL'
                    """, deal['property_id'])
                    
                    # Log cancellation event with intent flag
                    await self.events_service.log_event(
                        deal_id=deal_id,
                        event_type='CANCELLED',
                        from_status=current_status,
                        to_status='CANCELLED',
                        actor_id=actor_id,
                        actor_role=actor_role,
                        notes=f'Deal cancelled at PRICE_AGREED by {deal_role}: {reason}',
                        metadata={
                            'cancellation_type': 'INTENT_LOGGED',
                            'deal_role': deal_role,
                            'had_agreed_price': str(deal['agreed_price']) if deal['agreed_price'] else None
                        },
                        conn=conn
                    )
                
                return {
                    "success": True,
                    "cancellation_type": "INTENT_LOGGED",
                    "penalty": None,
                    "message": f"Deal cancelled at PRICE_AGREED by {deal_role}. Intent logged."
                }
            
            # ================================================================
            # FREE CANCEL STATES (INITIATED → NEGOTIATION, TOKEN_PENDING)
            # ================================================================
            async with conn.transaction():
                await conn.execute("""
                    UPDATE deals 
                    SET status = 'CANCELLED',
                        cancelled_at = NOW(),
                        cancelled_by = $2,
                        cancellation_reason = $3
                    WHERE id = $1
                """, deal_id, actor_id, reason)
                
                # Restore property to ACTIVE
                await conn.execute("""
                    UPDATE properties SET status = 'ACTIVE' 
                    WHERE id = $1 AND status = 'UNDER_DEAL'
                """, deal['property_id'])
                
                # Log event
                await self.events_service.log_event(
                    deal_id=deal_id,
                    event_type='CANCELLED',
                    from_status=current_status,
                    to_status='CANCELLED',
                    actor_id=actor_id,
                    actor_role=actor_role,
                    notes=f'Deal cancelled by {deal_role}: {reason}',
                    metadata={
                        'cancellation_type': 'FREE',
                        'deal_role': deal_role
                    },
                    conn=conn
                )
                
                # Audit log
                await conn.execute("""
                    INSERT INTO audit_logs (
                        user_id, action, entity_type, entity_id,
                        ip_address, details
                    )
                    VALUES ($1, 'DEAL_CANCELLED', 'deal', $2, $3, $4)
                """, actor_id, deal_id, ip_address,
                    json.dumps({
                        "actor_role": actor_role,
                        "from_status": current_status,
                        "reason": reason,
                        "cancellation_type": "FREE"
                    }))
            
            return {
                "success": True,
                "cancellation_type": "FREE",
                "penalty": None,
                "message": f"Deal cancelled successfully by {deal_role}."
            }
    
    async def _cancel_with_penalty(
        self,
        deal: asyncpg.Record,
        deal_role: str,
        actor_id: UUID,
        actor_role: str,
        reason: str,
        ip_address: Optional[str],
        conn: asyncpg.Connection
    ) -> Dict[str, Any]:
        """
        Handle TOKEN_PAID cancellation with penalty + auto-dispute.
        
        Buyer cancels → token forfeited
        Seller cancels → token refund pending + seller penalty
        """
        deal_id = deal['id']
        token_amount = deal['token_amount'] or Decimal('0')
        refund_result = None
        
        if deal_role == 'BUYER':
            # BUYER cancels at TOKEN_PAID → token forfeited
            refund_status = 'FORFEITED'
            penalty_description = f'Buyer forfeited token of ₹{token_amount}'
        elif deal_role == 'SELLER':
            # SELLER cancels at TOKEN_PAID → token refund pending
            refund_status = 'PENDING'
            penalty_description = f'Seller cancellation — buyer token ₹{token_amount} refund pending admin approval'
        else:
            # AGENT/ADMIN → treated as neutral, refund pending
            refund_status = 'PENDING'
            penalty_description = f'{deal_role} cancelled deal — token ₹{token_amount} refund under review'
        
        async with conn.transaction():
            # Freeze the deal (DISPUTED, not CANCELLED)
            await conn.execute("""
                UPDATE deals 
                SET status = 'DISPUTED',
                    pre_dispute_status = 'TOKEN_PAID',
                    cancelled_by = $2,
                    cancellation_reason = $3
                WHERE id = $1
            """, deal_id, actor_id, reason)
            
            # Log cancellation request event
            await self.events_service.log_event(
                deal_id=deal_id,
                event_type='CANCELLATION_REQUESTED',
                from_status='TOKEN_PAID',
                to_status='DISPUTED',
                actor_id=actor_id,
                actor_role=actor_role,
                notes=penalty_description,
                metadata={
                    'deal_role': deal_role,
                    'token_amount': str(token_amount),
                    'refund_status': refund_status,
                    'reason': reason
                },
                conn=conn
            )
            
            # Log deal freeze event
            await self.events_service.log_event(
                deal_id=deal_id,
                event_type='DEAL_FROZEN',
                from_status='TOKEN_PAID',
                to_status='DISPUTED',
                actor_id=actor_id,
                actor_role='SYSTEM',
                notes='Deal frozen due to TOKEN_PAID cancellation — auto-dispute created',
                metadata={'pre_dispute_status': 'TOKEN_PAID'},
                conn=conn
            )
            
            # Auto-create dispute
            from .dispute_service import DisputeService
            dispute_service = DisputeService(self.db)
            
            # Determine against_id
            if deal_role == 'BUYER':
                against_id = deal['seller_id']
            else:
                against_id = deal['buyer_id']
            
            dispute_result = await dispute_service.auto_create_dispute(
                deal_id=deal_id,
                raised_by_id=actor_id,
                against_id=against_id,
                reason=f'Cancellation at TOKEN_PAID: {reason}',
                amount_involved=token_amount,
                refund_status=refund_status,
                property_id=deal['property_id'],
                conn=conn
            )
            
            # Audit log
            await conn.execute("""
                INSERT INTO audit_logs (
                    user_id, action, entity_type, entity_id,
                    ip_address, details
                )
                VALUES ($1, 'DEAL_CANCEL_PENALTY', 'deal', $2, $3, $4)
            """, actor_id, deal_id, ip_address,
                json.dumps({
                    "actor_role": actor_role,
                    "from_status": "TOKEN_PAID",
                    "deal_role": deal_role,
                    "refund_status": refund_status,
                    "token_amount": str(token_amount),
                    "reason": reason
                }))
        
        return {
            "success": True,
            "cancellation_type": "PENALTY",
            "deal_status": "DISPUTED",
            "penalty": {
                "token_amount": float(token_amount),
                "refund_status": refund_status,
                "description": penalty_description
            },
            "dispute": dispute_result,
            "message": f"Deal frozen under dispute. {penalty_description}"
        }
    
    async def freeze_deal(
        self,
        deal_id: UUID,
        actor_id: UUID,
        reason: str,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """
        Freeze a deal by setting status to DISPUTED.
        Stores pre_dispute_status for admin resolution.
        """
        should_release = conn is None
        if conn is None:
            conn = await self.db.acquire()
        
        try:
            deal = await conn.fetchrow("SELECT * FROM deals WHERE id = $1", deal_id)
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            current = deal['status']
            
            if current in TERMINAL_DEAL_STATUSES or current in BLOCKED_DEAL_STATUSES:
                return {"success": False, "error": f"Cannot freeze deal in {current} state"}
            
            await conn.execute("""
                UPDATE deals 
                SET status = 'DISPUTED',
                    pre_dispute_status = $2
                WHERE id = $1
            """, deal_id, current)
            
            await self.events_service.log_event(
                deal_id=deal_id,
                event_type='DEAL_FROZEN',
                from_status=current,
                to_status='DISPUTED',
                actor_id=actor_id,
                actor_role='SYSTEM',
                notes=f'Deal frozen: {reason}',
                metadata={'pre_dispute_status': current},
                conn=conn
            )
            
            return {
                "success": True,
                "pre_dispute_status": current,
                "message": f"Deal frozen from {current}. Dispute resolution required."
            }
        finally:
            if should_release:
                await self.db.release(conn)
    
    async def unfreeze_deal(
        self,
        deal_id: UUID,
        admin_id: UUID,
        resolution: str,  # 'RESUME' or 'CANCEL'
        notes: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Admin unfreezes a deal after dispute resolution.
        
        resolution='RESUME' → restore pre_dispute_status
        resolution='CANCEL' → cancel the deal
        """
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow("""
                SELECT d.*, p.title as property_title
                FROM deals d
                JOIN properties p ON p.id = d.property_id
                WHERE d.id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            if deal['status'] != 'DISPUTED':
                return {"success": False, "error": f"Deal is not disputed (status: {deal['status']})"}
            
            pre_status = deal['pre_dispute_status']
            
            if resolution == 'RESUME':
                if not pre_status:
                    return {"success": False, "error": "No pre-dispute status to resume to"}
                
                new_status = pre_status
                
                async with conn.transaction():
                    await conn.execute("""
                        UPDATE deals 
                        SET status = $2, pre_dispute_status = NULL
                        WHERE id = $1
                    """, deal_id, new_status)
                    
                    await self.events_service.log_event(
                        deal_id=deal_id,
                        event_type='DEAL_UNFROZEN',
                        from_status='DISPUTED',
                        to_status=new_status,
                        actor_id=admin_id,
                        actor_role='ADMIN',
                        notes=notes or f'Deal resumed to {new_status} by admin',
                        metadata={'resolution': 'RESUME', 'restored_status': new_status},
                        conn=conn
                    )
                    
                    await conn.execute("""
                        INSERT INTO admin_actions (
                            admin_id, action, target_type, target_id,
                            reason, previous_state, new_state
                        )
                        VALUES ($1, 'UNFREEZE_DEAL', 'deal', $2, $3, 'DISPUTED', $4)
                    """, admin_id, deal_id, notes or 'Dispute resolved — deal resumed', new_status)
                
                return {
                    "success": True,
                    "resolution": "RESUMED",
                    "new_status": new_status,
                    "message": f"Deal unfrozen and resumed at {new_status}"
                }
            
            elif resolution == 'CANCEL':
                async with conn.transaction():
                    await conn.execute("""
                        UPDATE deals 
                        SET status = 'CANCELLED',
                            pre_dispute_status = NULL,
                            cancelled_at = NOW(),
                            cancelled_by = $2,
                            cancellation_reason = $3
                        WHERE id = $1
                    """, deal_id, admin_id, notes or 'Cancelled by admin after dispute resolution')
                    
                    # Restore property
                    await conn.execute("""
                        UPDATE properties SET status = 'ACTIVE' 
                        WHERE id = $1 AND status = 'UNDER_DEAL'
                    """, deal['property_id'])
                    
                    await self.events_service.log_event(
                        deal_id=deal_id,
                        event_type='DEAL_UNFROZEN',
                        from_status='DISPUTED',
                        to_status='CANCELLED',
                        actor_id=admin_id,
                        actor_role='ADMIN',
                        notes=notes or 'Deal cancelled after dispute resolution',
                        metadata={'resolution': 'CANCEL', 'pre_dispute_status': pre_status},
                        conn=conn
                    )
                    
                    await conn.execute("""
                        INSERT INTO admin_actions (
                            admin_id, action, target_type, target_id,
                            reason, previous_state, new_state
                        )
                        VALUES ($1, 'CANCEL_AFTER_DISPUTE', 'deal', $2, $3, 'DISPUTED', 'CANCELLED')
                    """, admin_id, deal_id, notes or 'Cancelled after dispute resolution')
                
                return {
                    "success": True,
                    "resolution": "CANCELLED",
                    "new_status": "CANCELLED",
                    "message": "Deal cancelled after dispute resolution"
                }
            
            else:
                return {"success": False, "error": f"Invalid resolution: {resolution}. Use 'RESUME' or 'CANCEL'."}

    # ========================================================================
    # PHASE 2: COMMISSION & CANCELLATION
    # ========================================================================
    
    async def calculate_and_lock_commission(
        self,
        deal_id: UUID,
        agreed_price: Decimal,
        actor_id: UUID,
        actor_role: str,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """
        Calculate and lock commission at PRICE_AGREED.
        
        This is called ONCE when price is agreed and becomes immutable.
        Commission breakdown:
        - Seller pays 0.9%
        - Buyer already paid 0.1% (token)
        - Agent gets 70% of seller's 0.9%
        - Platform gets 30% of seller's 0.9% + buyer's 0.1%
        """
        should_release = conn is None
        if conn is None:
            conn = await self.db.acquire()
        
        try:
            # Calculate commission breakdown
            total_seller_portion = agreed_price * SELLER_COMMISSION_PCT
            agent_commission = total_seller_portion * AGENT_SPLIT_PCT
            platform_from_seller = total_seller_portion * PLATFORM_SPLIT_PCT
            buyer_token = agreed_price * BUYER_COMMISSION_PCT
            platform_total = platform_from_seller + buyer_token
            
            # Update deal with commission details
            await conn.execute("""
                UPDATE deals
                SET commission_amount = $2,
                    agent_commission = $3,
                    platform_fee = $4,
                    updated_at = NOW()
                WHERE id = $1
            """, deal_id, total_seller_portion, agent_commission, platform_total)
            
            # Log commission lock event
            await self.events_service.log_event(
                deal_id=deal_id,
                event_type='COMMISSION_CALCULATED',
                actor_id=actor_id,
                actor_role=actor_role,
                notes=f'Commission locked at price agreement',
                metadata={
                    'agreed_price': str(agreed_price),
                    'seller_commission': str(total_seller_portion),
                    'agent_commission': str(agent_commission),
                    'platform_fee': str(platform_total)
                },
                conn=conn
            )
            
            return {
                "success": True,
                "commission": {
                    "agreed_price": float(agreed_price),
                    "seller_commission": float(total_seller_portion),
                    "agent_commission": float(agent_commission),
                    "platform_fee": float(platform_total),
                    "buyer_token": float(buyer_token)
                }
            }
        finally:
            if should_release:
                await self.db.release(conn)
    
    async def get_commission_breakdown(
        self,
        deal_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """
        Get commission breakdown for a deal (read-only).
        
        Returns None if commission not yet calculated.
        """
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow("""
                SELECT id, agreed_price, commission_amount,
                       agent_commission, platform_fee, token_amount,
                       status
                FROM deals
                WHERE id = $1
            """, deal_id)
            
            if not deal or not deal['commission_amount']:
                return None
            
            return {
                "deal_id": str(deal['id']),
                "status": deal['status'],
                "agreed_price": float(deal['agreed_price']) if deal['agreed_price'] else None,
                "seller_commission": float(deal['commission_amount']),
                "agent_commission": float(deal['agent_commission']),
                "platform_fee": float(deal['platform_fee']),
                "buyer_token": float(deal['token_amount']) if deal['token_amount'] else None,
                "commission_locked": True,
                "editable": False  # Commission is NEVER editable
            }
    
    # ========================================================================
    # FORMATTING
    # ========================================================================
    
    def _format_deal(self, deal, property_title: str = '') -> dict:
        """Format a deal record for API response."""
        return {
            "id": str(deal['id']),
            "property_id": str(deal['property_id']),
            "property_title": property_title,
            "buyer_id": str(deal['buyer_id']),
            "seller_id": str(deal['seller_id']),
            "agent_id": str(deal['agent_id']),
            "status": deal['status'],
            "display_status": self._get_display_status(deal['status']),
            "is_active": deal['status'] in ACTIVE_DEAL_STATUSES,
            "visit_request_id": str(deal['visit_request_id']) if deal['visit_request_id'] else None,
            "offer_id": str(deal['offer_id']) if deal['offer_id'] else None,
            "reservation_id": str(deal['reservation_id']) if deal['reservation_id'] else None,
            "transaction_id": str(deal['transaction_id']) if deal['transaction_id'] else None,
            "agreed_price": float(deal['agreed_price']) if deal['agreed_price'] else None,
            "token_amount": float(deal['token_amount']) if deal['token_amount'] else None,
            "commission_amount": float(deal['commission_amount']) if deal['commission_amount'] else None,
            "platform_fee": float(deal['platform_fee']) if deal['platform_fee'] else None,
            "agent_commission": float(deal['agent_commission']) if deal['agent_commission'] else None,
            "created_at": deal['created_at'].isoformat(),
            "updated_at": deal['updated_at'].isoformat(),
            "cancelled_at": deal['cancelled_at'].isoformat() if deal['cancelled_at'] else None,
            "cancellation_reason": deal['cancellation_reason'],
            "pre_dispute_status": deal.get('pre_dispute_status', None)
        }




