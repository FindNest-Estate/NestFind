from decimal import Decimal
from typing import Dict, Any, Optional
from uuid import UUID
from enum import Enum
from datetime import datetime, timedelta
import asyncpg
import json


class CommissionStatus(str, Enum):
    CALCULATED = "CALCULATED"      # Ledger initialized, commission computed
    EARNED = "EARNED"              # Deal reached COMPLETED
    COOLING_OFF = "COOLING_OFF"    # 7-day cooling-off period active
    PAYABLE = "PAYABLE"            # All conditions met, ready for settlement
    SETTLEMENT_PENDING = "SETTLEMENT_PENDING"  # Admin authorized release
    SETTLED = "SETTLED"            # Settlement confirmed (terminal)
    VOIDED = "VOIDED"              # Deal cancelled, commission void (terminal)
    FROZEN = "FROZEN"              # Dispute froze commission


# Valid transitions for the commission state machine
COMMISSION_TRANSITIONS: Dict[str, list] = {
    'CALCULATED': ['EARNED', 'VOIDED'],
    'EARNED': ['COOLING_OFF', 'VOIDED', 'FROZEN'],
    'COOLING_OFF': ['PAYABLE', 'FROZEN', 'VOIDED'],
    'PAYABLE': ['SETTLEMENT_PENDING', 'FROZEN', 'VOIDED'],
    'SETTLEMENT_PENDING': ['SETTLED', 'FROZEN', 'VOIDED'],
    'FROZEN': ['COOLING_OFF', 'EARNED', 'VOIDED'],  # Unfreeze restores previous state
    'SETTLED': [],     # Terminal
    'VOIDED': [],      # Terminal
}

COOLING_OFF_DAYS = 7


class CommissionService:
    """
    Commission calculation and lifecycle management.
    
    Phase 4A: Pure calculation logic (static methods)
    Phase 5A: Lifecycle state machine (instance methods requiring DB)
    """
    
    # Default Configuration (Could be moved to DB/Config later)
    DEFAULT_COMMISSION_RATE = Decimal('0.02')  # 2%
    PLATFORM_SPLIT_RATE = Decimal('0.20')      # 20% of total commission
    AGENT_SPLIT_RATE = Decimal('0.80')         # 80% of total commission
    
    def __init__(self, db_pool: asyncpg.Pool = None):
        self.db = db_pool

    @staticmethod
    def calculate_commission(deal_value: Decimal, rules: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Calculate total commission, platform fee, and agent share.
        
        Args:
            deal_value: The final agreed price of the property
            rules: Optional overrides (e.g., fixed rate, different split)
            
        Returns:
            Dict containing breakdown of amounts
        """
        # 1. Determine Total Commission
        if rules and rules.get('type') == 'FIXED':
            total_commission = Decimal(str(rules['value']))
        else:
            rate = Decimal(str(rules.get('rate', CommissionService.DEFAULT_COMMISSION_RATE))) if rules else CommissionService.DEFAULT_COMMISSION_RATE
            total_commission = deal_value * rate
            
        # 2. Calculate Splits
        # Platform Fee
        platform_fee = total_commission * CommissionService.PLATFORM_SPLIT_RATE
        
        # Agent Commission (Remainder or explicit split)
        agent_commission = total_commission - platform_fee
        
        return {
            "deal_value": deal_value,
            "total_commission": total_commission.quantize(Decimal('0.01')),
            "platform_fee": platform_fee.quantize(Decimal('0.01')),
            "agent_commission": agent_commission.quantize(Decimal('0.01')),
            "calculation_basis": {
                "type": rules.get('type', 'PERCENTAGE') if rules else 'PERCENTAGE',
                "rate": str(rules.get('rate', CommissionService.DEFAULT_COMMISSION_RATE)) if not rules or rules.get('type') != 'FIXED' else None,
                "platform_split": str(CommissionService.PLATFORM_SPLIT_RATE)
            }
        }

    # ========================================================================
    # PHASE 5A: Commission Lifecycle State Machine
    # ========================================================================

    async def get_commission_status(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Get the current commission lifecycle status and release conditions.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT fl.*, d.status as deal_status, d.is_frozen as deal_frozen
                FROM financial_ledgers fl
                JOIN deals d ON d.id = fl.deal_id
                WHERE fl.deal_id = $1
            """, deal_id)
            
            if not ledger:
                return {"success": False, "error": "Ledger not found"}
            
            # Check release conditions
            conditions = await self._check_release_conditions(deal_id, conn)
            
            return {
                "success": True,
                "commission": {
                    "status": ledger.get('commission_status', 'CALCULATED'),
                    "total_commission": float(ledger['total_commission_owed']),
                    "agent_commission": float(ledger['agent_commission']),
                    "platform_fee": float(ledger['platform_fee']),
                    "cooling_off_expires_at": ledger['cooling_off_expires_at'].isoformat() if ledger.get('cooling_off_expires_at') else None,
                    "settlement_authorized_at": ledger['settlement_authorized_at'].isoformat() if ledger.get('settlement_authorized_at') else None,
                    "deal_status": ledger['deal_status'],
                    "deal_frozen": ledger.get('deal_frozen', False),
                    "release_conditions": conditions
                }
            }

    async def _check_release_conditions(self, deal_id: UUID, conn: asyncpg.Connection) -> Dict[str, Any]:
        """
        Check all conditions required for commission to become PAYABLE.
        Returns a dict of condition_name -> {met: bool, detail: str}
        """
        ledger = await conn.fetchrow("""
            SELECT fl.*, d.status as deal_status, d.is_frozen
            FROM financial_ledgers fl
            JOIN deals d ON d.id = fl.deal_id
            WHERE fl.deal_id = $1
        """, deal_id)
        
        conditions = {}
        
        # 1. Deal must be COMPLETED or later
        deal_completed = ledger['deal_status'] in ('COMPLETED', 'COMMISSION_RELEASED')
        conditions['deal_completed'] = {
            'met': deal_completed,
            'label': 'Deal completed',
            'detail': f"Current status: {ledger['deal_status']}"
        }
        
        # 2. No active disputes
        active_disputes = await conn.fetchval("""
            SELECT COUNT(*) FROM disputes
            WHERE deal_id = $1 AND status IN ('OPEN', 'UNDER_REVIEW')
        """, deal_id)
        conditions['no_active_disputes'] = {
            'met': active_disputes == 0,
            'label': 'No active disputes',
            'detail': f"{active_disputes} active dispute(s)" if active_disputes > 0 else "No disputes"
        }
        
        # 3. Deal not frozen
        conditions['deal_not_frozen'] = {
            'met': not ledger.get('is_frozen', False),
            'label': 'Deal not frozen',
            'detail': 'Deal is frozen' if ledger.get('is_frozen') else 'Deal is active'
        }
        
        # 4. Cooling-off period expired
        cooling_off_expired = False
        cooling_off_detail = "Not started"
        if ledger.get('cooling_off_expires_at'):
            now = datetime.utcnow().replace(tzinfo=ledger['cooling_off_expires_at'].tzinfo)
            cooling_off_expired = now >= ledger['cooling_off_expires_at']
            if cooling_off_expired:
                cooling_off_detail = "Expired"
            else:
                remaining = ledger['cooling_off_expires_at'] - now
                cooling_off_detail = f"{remaining.days}d {remaining.seconds // 3600}h remaining"
        conditions['cooling_off_expired'] = {
            'met': cooling_off_expired,
            'label': 'Cooling-off period expired',
            'detail': cooling_off_detail
        }
        
        # 5. All payment entries verified
        unverified = await conn.fetchval("""
            SELECT COUNT(*) FROM ledger_entries le
            JOIN financial_ledgers fl ON fl.id = le.ledger_id
            WHERE fl.deal_id = $1
              AND le.entry_type IN ('BOOKING_RECEIVED', 'BALANCE_PAYMENT_DECLARED')
              AND le.verification_status != 'VERIFIED'
        """, deal_id)
        conditions['all_entries_verified'] = {
            'met': unverified == 0,
            'label': 'All payment entries verified',
            'detail': f"{unverified} unverified entry(ies)" if unverified > 0 else "All verified"
        }
        
        return conditions

    async def transition_commission(
        self,
        deal_id: UUID,
        new_status: str,
        reason: Optional[str] = None,
        actor_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Transition commission to a new lifecycle state.
        Validates against the state machine.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT * FROM financial_ledgers WHERE deal_id = $1
            """, deal_id)
            
            if not ledger:
                return {"success": False, "error": "Ledger not found"}
            
            current = ledger.get('commission_status', 'CALCULATED')
            
            # Validate transition
            valid_next = COMMISSION_TRANSITIONS.get(current, [])
            if new_status not in valid_next:
                return {
                    "success": False,
                    "error": f"Invalid commission transition: {current} → {new_status}. Valid: {valid_next}"
                }
            
            # Payment gate: commission cannot settle unless commission payment is captured/settled.
            if new_status in ('SETTLEMENT_PENDING', 'SETTLED'):
                deal = await conn.fetchrow("SELECT transaction_id FROM deals WHERE id = $1", deal_id)
                txn_id = deal['transaction_id'] if deal else None
                if not txn_id:
                    return {"success": False, "error": "Deal has no linked transaction for commission verification"}

                from .payment_engine.payment_service import PaymentService
                payment_svc = PaymentService(self.db)
                payment_resp = await payment_svc.get_payment_by_reference('transaction', txn_id)
                
                if not payment_resp.get('success'):
                    return {"success": False, "error": payment_resp.get('error', 'Commission payment not found')}

                payment = payment_resp.get('payment')
                if not payment or payment['status'] not in ('CAPTURED', 'SETTLED'):
                    current_payment = payment['status'] if payment else 'NOT_FOUND'
                    return {
                        "success": False,
                        "error": f"Commission payment not completed. Current payment status: {current_payment}"
                    }
            # Build update
            update_parts = ["commission_status = $2"]
            params = [deal_id, new_status]
            
            # Set cooling-off timer when transitioning to COOLING_OFF
            if new_status == 'COOLING_OFF':
                expires = datetime.utcnow() + timedelta(days=COOLING_OFF_DAYS)
                update_parts.append(f"cooling_off_expires_at = ${len(params) + 1}")
                params.append(expires)
            
            # Record authorization
            if new_status == 'SETTLEMENT_PENDING' and actor_id:
                update_parts.append(f"settlement_authorized_by = ${len(params) + 1}")
                params.append(actor_id)
                update_parts.append(f"settlement_authorized_at = NOW()")
            
            set_clause = ", ".join(update_parts)
            
            await conn.execute(f"""
                UPDATE financial_ledgers
                SET {set_clause}
                WHERE deal_id = $1
            """, *params)
            
            return {
                "success": True,
                "from": current,
                "to": new_status,
                "message": f"Commission transitioned: {current} → {new_status}"
            }

    async def authorize_settlement(
        self,
        deal_id: UUID,
        admin_id: UUID,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Admin authorizes commission for settlement.
        Validates all release conditions are met before allowing.
        No money moves — this is a record of admin approval.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT fl.*, d.status as deal_status, d.is_frozen
                FROM financial_ledgers fl
                JOIN deals d ON d.id = fl.deal_id
                WHERE fl.deal_id = $1
            """, deal_id)
            
            if not ledger:
                return {"success": False, "error": "Ledger not found"}
            
            current = ledger.get('commission_status', 'CALCULATED')
            if current != 'PAYABLE':
                return {
                    "success": False,
                    "error": f"Commission must be PAYABLE to authorize. Current: {current}"
                }
            
            # Verify all release conditions
            conditions = await self._check_release_conditions(deal_id, conn)
            unmet = [k for k, v in conditions.items() if not v['met']]
            if unmet:
                return {
                    "success": False,
                    "error": f"Release conditions not met: {', '.join(unmet)}",
                    "conditions": conditions
                }
            
            # Perform authorization
            await conn.execute("""
                UPDATE financial_ledgers
                SET commission_status = 'SETTLEMENT_PENDING',
                    settlement_authorized_by = $2,
                    settlement_authorized_at = NOW()
                WHERE deal_id = $1
            """, deal_id, admin_id)
            
            # Log event
            from .deal_events_service import DealEventsService
            events = DealEventsService(self.db)
            await events.log_event(
                deal_id=deal_id,
                event_type='COMMISSION_AUTHORIZED',
                actor_id=admin_id,
                actor_role='ADMIN',
                notes=notes or 'Commission settlement authorized by admin',
                metadata={"commission": float(ledger['total_commission_owed'])}
            )
            
            return {
                "success": True,
                "message": "Commission settlement authorized. No money has moved — this is a record of approval.",
                "commission_status": "SETTLEMENT_PENDING",
                "total_commission": float(ledger['total_commission_owed']),
                "agent_commission": float(ledger['agent_commission']),
                "platform_fee": float(ledger['platform_fee'])
            }

    async def handle_deal_completed(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Called when deal transitions to COMPLETED.
        Moves commission from CALCULATED → EARNED → COOLING_OFF and sets timer.
        """
        # First transition to EARNED
        result = await self.transition_commission(deal_id, 'EARNED')
        if not result['success']:
            return result
        
        # Then immediately start cooling-off
        result = await self.transition_commission(deal_id, 'COOLING_OFF')
        return result

    async def handle_dispute_raised(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Called when a dispute is raised on a deal.
        Freezes commission if it's in an active lifecycle state.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT commission_status FROM financial_ledgers WHERE deal_id = $1
            """, deal_id)
            
            if not ledger:
                return {"success": True}  # No ledger = no commission to freeze
            
            current = ledger.get('commission_status', 'CALCULATED')
            freezable = ['EARNED', 'COOLING_OFF', 'PAYABLE']
            
            if current in freezable:
                # Store the pre-freeze state for restoration
                await conn.execute("""
                    UPDATE financial_ledgers
                    SET commission_status = 'FROZEN',
                        cooling_off_expires_at = NULL
                    WHERE deal_id = $1
                """, deal_id)
                
                return {
                    "success": True,
                    "frozen_from": current,
                    "message": f"Commission frozen (was {current})"
                }
            
            return {"success": True, "message": f"Commission not in freezable state ({current})"}

    async def handle_dispute_resolved(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Called when all disputes on a deal are resolved.
        Unfreezes commission and resets cooling-off period.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT commission_status, deal_id FROM financial_ledgers WHERE deal_id = $1
            """, deal_id)
            
            if not ledger or ledger.get('commission_status') != 'FROZEN':
                return {"success": True}
            
            # Check if deal is still completed
            deal = await conn.fetchrow("SELECT status FROM deals WHERE id = $1", deal_id)
            if deal and deal['status'] in ('COMPLETED', 'COMMISSION_RELEASED'):
                # Resume to COOLING_OFF with fresh timer
                expires = datetime.utcnow() + timedelta(days=COOLING_OFF_DAYS)
                await conn.execute("""
                    UPDATE financial_ledgers
                    SET commission_status = 'COOLING_OFF',
                        cooling_off_expires_at = $2
                    WHERE deal_id = $1
                """, deal_id, expires)
                return {"success": True, "message": "Commission unfrozen. Cooling-off period reset."}
            else:
                # Deal was cancelled during dispute
                await conn.execute("""
                    UPDATE financial_ledgers
                    SET commission_status = 'VOIDED'
                    WHERE deal_id = $1
                """, deal_id)
                return {"success": True, "message": "Commission voided (deal no longer active)"}

    async def check_and_advance_cooling_off(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Check if cooling-off period has expired and advance to PAYABLE if so.
        Called by the system/cron job or on-demand.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT * FROM financial_ledgers WHERE deal_id = $1
            """, deal_id)
            
            if not ledger or ledger.get('commission_status') != 'COOLING_OFF':
                return {"success": True, "advanced": False}
            
            if not ledger.get('cooling_off_expires_at'):
                return {"success": True, "advanced": False}
            
            now = datetime.utcnow().replace(tzinfo=ledger['cooling_off_expires_at'].tzinfo)
            if now >= ledger['cooling_off_expires_at']:
                # Check conditions before auto-advancing
                conditions = await self._check_release_conditions(deal_id, conn)
                disputes_ok = conditions['no_active_disputes']['met']
                frozen_ok = conditions['deal_not_frozen']['met']
                
                if disputes_ok and frozen_ok:
                    await conn.execute("""
                        UPDATE financial_ledgers
                        SET commission_status = 'PAYABLE'
                        WHERE deal_id = $1
                    """, deal_id)
                    return {"success": True, "advanced": True, "new_status": "PAYABLE"}
            
            return {"success": True, "advanced": False}

