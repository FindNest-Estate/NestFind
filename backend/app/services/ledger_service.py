from typing import Dict, Any, Optional, List
from uuid import UUID
from decimal import Decimal
import asyncpg
import json
from enum import Enum
from datetime import datetime

from .commission_service import CommissionService


class LedgerEntryType(str, Enum):
    # Phase 4A (Declarative)
    BOOKING_DECLARED = "BOOKING_DECLARED"
    COMMISSION_CALCULATED = "COMMISSION_CALCULATED"
    PLATFORM_FEE = "PLATFORM_FEE"
    ADJUSTMENT = "ADJUSTMENT"
    AGENT_COMMISSION = "AGENT_COMMISSION"
    # Phase 5A (Broker-Coordinated)
    BOOKING_RECEIVED = "BOOKING_RECEIVED"
    BALANCE_PAYMENT_DECLARED = "BALANCE_PAYMENT_DECLARED"
    TOKEN_FORFEITED = "TOKEN_FORFEITED"
    TOKEN_REFUND_CLAIMED = "TOKEN_REFUND_CLAIMED"
    TOKEN_REFUNDED = "TOKEN_REFUNDED"
    COMMISSION_PAYABLE = "COMMISSION_PAYABLE"
    PLATFORM_FEE_SETTLED = "PLATFORM_FEE_SETTLED"
    AGENT_COMMISSION_SETTLED = "AGENT_COMMISSION_SETTLED"

    
class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


PAYMENT_METHODS = ['UPI', 'NEFT', 'RTGS', 'CHEQUE', 'DD', 'CASH', 'OTHER']


class LedgerService:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool

    async def initialize_ledger(
        self, 
        deal_id: UUID, 
        deal_value: Decimal,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """
        Creates the initial financial ledger for a finalized deal.
        Calculates commission and platform fee snapshot.
        """
        # Calculate Commissions
        commission_data = CommissionService.calculate_commission(deal_value)
        
        async def _execute(connection):
            # 1. Create Ledger
            ledger = await connection.fetchrow("""
                INSERT INTO financial_ledgers (
                    deal_id, total_deal_value, 
                    total_commission_owed, platform_fee, agent_commission,
                    status, commission_status
                )
                VALUES ($1, $2, $3, $4, $5, 'PENDING', 'CALCULATED')
                RETURNING id
            """, deal_id, deal_value, 
               commission_data['total_commission'], 
               commission_data['platform_fee'], 
               commission_data['agent_commission'])
            
            ledger_id = ledger['id']
            
            # 2. Add Initial Entries (Immutable Log)
            # Commission Owed (Debit from Deal perspective)
            await connection.execute("""
                INSERT INTO ledger_entries (
                    ledger_id, entry_type, amount, direction, description, metadata, verification_status
                )
                VALUES ($1, 'COMMISSION_CALCULATED', $2, 'DEBIT', 'Total commission based on deal value', $3, 'VERIFIED')
            """, ledger_id, commission_data['total_commission'], json.dumps(commission_data['calculation_basis']))
            
            return {"success": True, "ledger_id": ledger_id}

        if conn:
            return await _execute(conn)
        else:
            async with self.db.acquire() as conn:
                async with conn.transaction():
                    return await _execute(conn)

    async def record_entry(
        self,
        deal_id: UUID,
        entry_type: str,
        amount: Decimal,
        direction: str,
        description: str,
        user_id: UUID,  # Who created this entry
        metadata: Dict[str, Any] = {},
        verification_status: str = 'PENDING'
    ) -> Dict[str, Any]:
        """
        Append-only method to add a financial event.
        Suitable for: Booking Amount Declared, Admin Adjustment.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("SELECT id FROM financial_ledgers WHERE deal_id = $1", deal_id)
            if not ledger:
                return {"success": False, "error": "Ledger not found for this deal"}
            
            entry = await conn.fetchrow("""
                INSERT INTO ledger_entries (
                    ledger_id, entry_type, amount, direction, description, 
                    metadata, created_by, verification_status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, created_at
            """, ledger['id'], entry_type, amount, direction, description, 
               json.dumps(metadata), user_id, verification_status)
               
            return {
                "success": True, 
                "entry_id": entry['id'], 
                "created_at": entry['created_at'].isoformat()
            }

    # ========================================================================
    # PHASE 5A: Enhanced Payment Recording
    # ========================================================================

    async def record_payment_with_proof(
        self,
        deal_id: UUID,
        entry_type: str,
        amount: Decimal,
        description: str,
        user_id: UUID,
        proof_url: str,
        payment_method: str,
        bank_reference: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a payment event with mandatory proof and payment method.
        Used for: BOOKING_RECEIVED, BALANCE_PAYMENT_DECLARED.
        
        This is the enhanced version of record_entry that requires
        proof documentation — aligned with Phase 5A broker-coordinated model.
        """
        if entry_type not in [
            LedgerEntryType.BOOKING_RECEIVED,
            LedgerEntryType.BALANCE_PAYMENT_DECLARED,
            LedgerEntryType.TOKEN_FORFEITED,
            LedgerEntryType.TOKEN_REFUND_CLAIMED,
            LedgerEntryType.TOKEN_REFUNDED,
        ]:
            return {"success": False, "error": f"Invalid entry type for payment recording: {entry_type}"}
        
        if payment_method not in PAYMENT_METHODS:
            return {"success": False, "error": f"Invalid payment method. Must be one of: {', '.join(PAYMENT_METHODS)}"}

        if not proof_url or not proof_url.strip():
            return {"success": False, "error": "Proof URL is required for payment recording"}

        metadata = {
            "proof_url": proof_url.strip(),
            "payment_method": payment_method,
            "bank_reference": bank_reference,
            "notes": notes,
            "recorded_at": datetime.utcnow().isoformat()
        }

        async with self.db.acquire() as conn:
            # Check deal is not frozen
            deal = await conn.fetchrow("""
                SELECT d.is_frozen, d.status FROM deals d
                JOIN financial_ledgers fl ON fl.deal_id = d.id
                WHERE d.id = $1
            """, deal_id)
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            if deal['is_frozen']:
                return {"success": False, "error": "Deal is frozen. Cannot record payment events while disputes are active."}

            ledger = await conn.fetchrow("SELECT id FROM financial_ledgers WHERE deal_id = $1", deal_id)
            if not ledger:
                return {"success": False, "error": "Ledger not found for this deal"}
            
            entry = await conn.fetchrow("""
                INSERT INTO ledger_entries (
                    ledger_id, entry_type, amount, direction, description,
                    metadata, created_by, verification_status,
                    counterparty_confirmed
                )
                VALUES ($1, $2, $3, 'CREDIT', $4, $5, $6, 'PENDING', FALSE)
                RETURNING id, created_at
            """, ledger['id'], entry_type, amount, description,
               json.dumps(metadata), user_id)
            
            return {
                "success": True,
                "entry_id": str(entry['id']),
                "created_at": entry['created_at'].isoformat(),
                "message": "Payment recorded. Awaiting counterparty confirmation and verification."
            }

    # ========================================================================
    # PHASE 5A: Counterparty Confirmation
    # ========================================================================

    async def confirm_counterparty(
        self,
        entry_id: UUID,
        confirmer_id: UUID
    ) -> Dict[str, Any]:
        """
        Counterparty confirms a payment entry is accurate.
        e.g., Seller confirms they received the booking amount from buyer.
        
        The confirmer must NOT be the person who created the entry.
        """
        async with self.db.acquire() as conn:
            entry = await conn.fetchrow("""
                SELECT le.*, fl.deal_id
                FROM ledger_entries le
                JOIN financial_ledgers fl ON fl.id = le.ledger_id
                WHERE le.id = $1
            """, entry_id)
            
            if not entry:
                return {"success": False, "error": "Entry not found"}
            
            if entry['counterparty_confirmed']:
                return {"success": False, "error": "Entry already confirmed by counterparty"}
            
            if entry['created_by'] == confirmer_id:
                return {"success": False, "error": "You cannot confirm your own payment entry"}
            
            # Verify confirmer is a participant in the deal
            deal = await conn.fetchrow("""
                SELECT buyer_id, seller_id, agent_id, is_frozen
                FROM deals WHERE id = $1
            """, entry['deal_id'])
            
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            if deal['is_frozen']:
                return {"success": False, "error": "Deal is frozen. Cannot confirm entries during dispute."}
            
            is_participant = confirmer_id in (deal['buyer_id'], deal['seller_id'], deal['agent_id'])
            if not is_participant:
                return {"success": False, "error": "Only deal participants can confirm payment entries"}
            
            await conn.execute("""
                UPDATE ledger_entries
                SET counterparty_confirmed = TRUE,
                    counterparty_confirmed_by = $2,
                    counterparty_confirmed_at = NOW()
                WHERE id = $1
            """, entry_id, confirmer_id)
            
            return {
                "success": True,
                "message": "Payment entry confirmed by counterparty"
            }

    async def get_unconfirmed_entries(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Get ledger entries that are awaiting counterparty confirmation.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("SELECT id FROM financial_ledgers WHERE deal_id = $1", deal_id)
            if not ledger:
                return {"success": False, "error": "Ledger not found"}
            
            entries = await conn.fetch("""
                SELECT le.*, u.full_name as created_by_name
                FROM ledger_entries le
                LEFT JOIN users u ON u.id = le.created_by
                WHERE le.ledger_id = $1
                  AND le.counterparty_confirmed = FALSE
                  AND le.entry_type IN ('BOOKING_RECEIVED', 'BALANCE_PAYMENT_DECLARED', 
                                        'TOKEN_FORFEITED', 'TOKEN_REFUND_CLAIMED', 'TOKEN_REFUNDED')
                ORDER BY le.created_at DESC
            """, ledger['id'])
            
            return {
                "success": True,
                "entries": [{
                    "id": str(e['id']),
                    "type": e['entry_type'],
                    "amount": float(e['amount']),
                    "direction": e['direction'],
                    "description": e['description'],
                    "verification_status": e['verification_status'],
                    "counterparty_confirmed": e['counterparty_confirmed'],
                    "created_at": e['created_at'].isoformat(),
                    "created_by": e['created_by_name'] or 'System',
                    "metadata": json.loads(e['metadata']) if e['metadata'] else {}
                } for e in entries]
            }

    # ========================================================================
    # QUERIES (Enhanced for Phase 5A)
    # ========================================================================

    async def get_ledger(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Fetch full ledger history for a deal.
        Enhanced with commission lifecycle and counterparty confirmation data.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("""
                SELECT * FROM financial_ledgers WHERE deal_id = $1
            """, deal_id)
            
            if not ledger:
                return {"success": False, "error": "Ledger not found"}
                
            entries = await conn.fetch("""
                SELECT le.*, 
                       u.full_name as created_by_name,
                       cu.full_name as confirmed_by_name
                FROM ledger_entries le
                LEFT JOIN users u ON u.id = le.created_by
                LEFT JOIN users cu ON cu.id = le.counterparty_confirmed_by
                WHERE le.ledger_id = $1
                ORDER BY le.created_at DESC
            """, ledger['id'])
            
            return {
                "success": True,
                "ledger": {
                    "id": str(ledger['id']),
                    "total_deal_value": float(ledger['total_deal_value']),
                    "total_commission": float(ledger['total_commission_owed']),
                    "agent_commission": float(ledger['agent_commission']),
                    "platform_fee": float(ledger['platform_fee']),
                    "status": ledger['status'],
                    # Phase 5A additions
                    "commission_status": ledger.get('commission_status', 'CALCULATED'),
                    "cooling_off_expires_at": ledger['cooling_off_expires_at'].isoformat() if ledger.get('cooling_off_expires_at') else None,
                    "settlement_authorized_at": ledger['settlement_authorized_at'].isoformat() if ledger.get('settlement_authorized_at') else None,
                    "entries": [{
                        "id": str(e['id']),
                        "type": e['entry_type'],
                        "amount": float(e['amount']),
                        "direction": e['direction'],
                        "description": e['description'],
                        "verification_status": e['verification_status'],
                        "created_at": e['created_at'].isoformat(),
                        "created_by": e['created_by_name'] or 'System',
                        # Phase 5A additions
                        "counterparty_confirmed": e.get('counterparty_confirmed', False),
                        "counterparty_confirmed_by": e.get('confirmed_by_name'),
                        "counterparty_confirmed_at": e['counterparty_confirmed_at'].isoformat() if e.get('counterparty_confirmed_at') else None,
                        "metadata": json.loads(e['metadata']) if e.get('metadata') else {}
                    } for e in entries]
                }
            }
            
    async def verify_entry(
        self,
        entry_id: UUID,
        verifier_id: UUID,
        status: str,  # VERIFIED, REJECTED
        notes: Optional[str] = None,
        deal_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Update verification status of an entry (e.g., Agent/Admin verifies payment proof).
        Enforces entry existence, deal scoping, and participant/admin authorization.
        """
        if status not in ['VERIFIED', 'REJECTED']:
            return {"success": False, "error": "Invalid status"}

        async with self.db.acquire() as conn:
            entry = await conn.fetchrow(
                """
                SELECT le.id, fl.deal_id
                FROM ledger_entries le
                JOIN financial_ledgers fl ON fl.id = le.ledger_id
                WHERE le.id = $1
                """,
                entry_id,
            )
            if not entry:
                return {"success": False, "error": "Entry not found"}

            if deal_id and entry['deal_id'] != deal_id:
                return {"success": False, "error": "Entry does not belong to this deal"}

            deal = await conn.fetchrow(
                """
                SELECT buyer_id, seller_id, agent_id
                FROM deals
                WHERE id = $1
                """,
                entry['deal_id'],
            )
            if not deal:
                return {"success": False, "error": "Deal not found"}

            roles = await conn.fetch(
                """
                SELECT r.name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
                """,
                verifier_id,
            )
            role_names = [r['name'] for r in roles]
            is_admin = 'ADMIN' in role_names or 'CEO' in role_names
            is_participant = verifier_id in (deal['buyer_id'], deal['seller_id'], deal['agent_id'])

            if not (is_participant or is_admin):
                return {"success": False, "error": "User not authorized to verify this entry"}

            notes_json = json.dumps(notes) if notes else json.dumps(None)
            await conn.execute(
                """
                UPDATE ledger_entries
                SET verification_status = $2,
                    verified_by = $3,
                    verified_at = NOW(),
                    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{verification_notes}', $4::jsonb)
                WHERE id = $1
                """,
                entry_id,
                status,
                verifier_id,
                notes_json,
            )

            return {"success": True, "status": status}

    # ========================================================================
    # PHASE 5A: Release Condition Checks
    # ========================================================================

    async def check_all_entries_verified(self, deal_id: UUID) -> bool:
        """
        Check if all payment-related ledger entries are verified.
        Required before commission can become PAYABLE.
        """
        async with self.db.acquire() as conn:
            ledger = await conn.fetchrow("SELECT id FROM financial_ledgers WHERE deal_id = $1", deal_id)
            if not ledger:
                return False
            
            unverified = await conn.fetchval("""
                SELECT COUNT(*) FROM ledger_entries
                WHERE ledger_id = $1
                  AND entry_type IN ('BOOKING_RECEIVED', 'BALANCE_PAYMENT_DECLARED')
                  AND verification_status != 'VERIFIED'
            """, ledger['id'])
            
            return unverified == 0

