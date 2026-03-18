"""
EscrowService — Multi-party fund disbursement engine.

States: PENDING → APPROVED → PROCESSING → DISBURSED | FAILED
                → ON_HOLD  → APPROVED
        PENDING | APPROVED | ON_HOLD → CANCELLED
        FAILED  → PROCESSING (retry, max 3)
"""
from __future__ import annotations

import json
import logging
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

import asyncpg

from .title_escrow_events_service import TitleEscrowEventsService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "PENDING":    {"APPROVED", "ON_HOLD", "CANCELLED"},
    "APPROVED":   {"PROCESSING", "ON_HOLD"},
    "PROCESSING": {"DISBURSED", "FAILED"},
    "FAILED":     {"PROCESSING"},   # retry
    "ON_HOLD":    {"APPROVED", "CANCELLED"},
}
TERMINAL_STATUSES: Set[str] = {"DISBURSED", "CANCELLED"}

TDS_THRESHOLD = Decimal("5000000")   # ₹50 Lakhs
TDS_RATE = Decimal("1")              # 1%

SYSTEM_USER_ID: Optional[str] = os.getenv("PLATFORM_SYSTEM_USER_ID", None)


class EscrowService:
    """Escrow disbursement lifecycle with payment engine integration."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.events = TitleEscrowEventsService(db)

    # -----------------------------------------------------------------------
    # SCHEDULE GENERATION
    # -----------------------------------------------------------------------

    async def generate_disbursement_schedule(self, deal_id: UUID) -> Dict[str, Any]:
        """
        Auto-generate disbursement records when a deal is COMPLETED.
        Idempotent — skips if non-cancelled records already exist.
        """
        async with self.db.acquire() as conn:
            deal = await conn.fetchrow(
                """
                SELECT d.*, p.state AS property_state
                FROM deals d
                LEFT JOIN properties p ON p.id = d.property_id
                WHERE d.id = $1
                """,
                deal_id,
            )
            if not deal:
                return {"success": False, "error": "Deal not found"}

            if deal["status"] != "COMPLETED":
                return {
                    "success": False,
                    "error": f"Disbursement schedule can only be generated for COMPLETED deals. Current: {deal['status']}",
                }

            # Idempotency: check if schedule already exists
            existing = await conn.fetchval(
                """
                SELECT COUNT(*) FROM escrow_disbursements
                WHERE deal_id = $1 AND status != 'CANCELLED'
                """,
                deal_id,
            )
            if existing and existing > 0:
                return {
                    "success": True,
                    "message": "Disbursement schedule already exists",
                    "idempotent": True,
                }

            # Fetch ledger for commission splits
            ledger = await conn.fetchrow(
                "SELECT * FROM financial_ledgers WHERE deal_id = $1", deal_id
            )

            sale_price = Decimal(str(deal["agreed_price"] or 0))
            agent_commission = (
                Decimal(str(ledger["agent_commission"])) if ledger else Decimal("0")
            )
            platform_fee = (
                Decimal(str(ledger["platform_fee"])) if ledger else Decimal("0")
            )

            # TDS calculation (Section 194-IA)
            tds_amount = Decimal("0")
            if sale_price > TDS_THRESHOLD:
                tds_amount = (sale_price * TDS_RATE / 100).quantize(Decimal("0.01"))

            # Seller proceeds = sale_price - all deductions
            seller_proceeds = (
                sale_price - agent_commission - platform_fee - tds_amount
            ).quantize(Decimal("0.01"))
            if seller_proceeds <= 0:
                seller_proceeds = Decimal("0.01")  # prevent zero/negative

            disbursements: List[Dict[str, Any]] = [
                {
                    "payee_id": str(deal["seller_id"]),
                    "payee_role": "SELLER",
                    "amount": seller_proceeds,
                    "purpose": "SALE_PROCEEDS",
                },
            ]

            if agent_commission > 0:
                disbursements.append({
                    "payee_id": str(deal["agent_id"]),
                    "payee_role": "AGENT",
                    "amount": agent_commission,
                    "purpose": "AGENT_COMMISSION",
                })

            if platform_fee > 0:
                disbursements.append({
                    "payee_id": str(deal["seller_id"]),  # platform uses admin as placeholder
                    "payee_role": "PLATFORM",
                    "amount": platform_fee,
                    "purpose": "PLATFORM_FEE",
                })

            if tds_amount > 0:
                disbursements.append({
                    "payee_id": str(deal["buyer_id"]),   # buyer deducts TDS
                    "payee_role": "GOVERNMENT",
                    "amount": tds_amount,
                    "purpose": "TDS_DEDUCTION",
                })

            created_records: List[Dict[str, Any]] = []

            async with conn.transaction():
                for d in disbursements:
                    row = await conn.fetchrow(
                        """
                        INSERT INTO escrow_disbursements (
                            deal_id, transaction_id,
                            payee_id, payee_role,
                            amount, purpose, status
                        )
                        SELECT $1,
                               (SELECT id FROM transactions WHERE deal_id = $1 LIMIT 1),
                               $2, $3, $4, $5, 'PENDING'
                        RETURNING *
                        """,
                        deal_id,
                        UUID(d["payee_id"]),
                        d["payee_role"],
                        d["amount"],
                        d["purpose"],
                    )

                    await self.events.log_event(
                        entity_type="ESCROW_DISBURSEMENT",
                        entity_id=row["id"],
                        event_type="DISBURSEMENT_CREATED",
                        actor_type="SYSTEM",
                        to_status="PENDING",
                        metadata={
                            "deal_id": str(deal_id),
                            "payee_role": d["payee_role"],
                            "amount": str(d["amount"]),
                            "purpose": d["purpose"],
                        },
                        conn=conn,
                    )

                    created_records.append({
                        "id": str(row["id"]),
                        "payee_role": d["payee_role"],
                        "amount": float(d["amount"]),
                        "purpose": d["purpose"],
                    })

        return {
            "success": True,
            "deal_id": str(deal_id),
            "disbursements": created_records,
            "breakdown": {
                "sale_price": float(sale_price),
                "agent_commission": float(agent_commission),
                "platform_fee": float(platform_fee),
                "tds_amount": float(tds_amount),
                "seller_proceeds": float(seller_proceeds),
            },
        }

    # -----------------------------------------------------------------------
    # STATE TRANSITIONS
    # -----------------------------------------------------------------------

    async def _transition(
        self,
        disbursement_id: UUID,
        to_status: str,
        actor_id: Optional[UUID],
        actor_type: str,
        event_type: str,
        extra_updates: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Internal: generic state transition helper."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM escrow_disbursements WHERE id = $1 FOR UPDATE",
                disbursement_id,
            )
            if not row:
                return {"success": False, "error": "Disbursement not found"}

            current = row["status"]
            if current in TERMINAL_STATUSES:
                return {
                    "success": False,
                    "error": f"Disbursement is in terminal state: {current}",
                }

            if to_status not in VALID_TRANSITIONS.get(current, set()):
                return {
                    "success": False,
                    "error": f"Invalid transition {current} → {to_status}",
                }

            # Build SET clause
            set_parts: List[str] = ["status = $2"]
            params: List[Any] = [disbursement_id, to_status]
            idx = 3
            for field, value in (extra_updates or {}).items():
                set_parts.append(f"{field} = ${idx}")
                params.append(value)
                idx += 1

            async with conn.transaction():
                updated = await conn.fetchrow(
                    f"""
                    UPDATE escrow_disbursements
                    SET {', '.join(set_parts)}
                    WHERE id = $1
                    RETURNING *
                    """,
                    *params,
                )

                await self.events.log_event(
                    entity_type="ESCROW_DISBURSEMENT",
                    entity_id=disbursement_id,
                    event_type=event_type,
                    actor_id=actor_id,
                    actor_type=actor_type,
                    from_status=current,
                    to_status=to_status,
                    metadata=metadata or {},
                    conn=conn,
                )

        return {
            "success": True,
            "disbursement": self._format_disbursement(updated),
        }

    async def approve_disbursement(
        self, disbursement_id: UUID, approved_by: UUID
    ) -> Dict[str, Any]:
        from datetime import datetime, timezone

        return await self._transition(
            disbursement_id, "APPROVED",
            actor_id=approved_by, actor_type="ADMIN",
            event_type="DISBURSEMENT_APPROVED",
            extra_updates={
                "approved_by": approved_by,
                "approved_at": datetime.now(timezone.utc),
            },
            metadata={"approved_by": str(approved_by)},
        )

    async def process_disbursement(self, disbursement_id: UUID) -> Dict[str, Any]:
        """APPROVED → PROCESSING. Creates payment intent via payment engine."""
        import asyncio

        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM escrow_disbursements WHERE id = $1", disbursement_id
            )
        if not row:
            return {"success": False, "error": "Disbursement not found"}
        if row["status"] != "APPROVED":
            return {
                "success": False,
                "error": f"Can only process APPROVED disbursements. Current: {row['status']}",
            }

        # Create payment intent
        try:
            from ..payment_engine.payment_service import PaymentService

            payment_svc = PaymentService(self.db)
            payer_id = row["payee_id"]  # Platform initiates payout; use payee as ref
            result = await payment_svc.create_payment_intent(
                intent_type="ESCROW",
                reference_id=disbursement_id,
                reference_type="escrow_disbursement",
                amount=Decimal(str(row["amount"])),
                currency="INR",
                payer_id=payer_id,
                ip_address="0.0.0.0",
                metadata={
                    "deal_id": str(row["deal_id"]) if row.get("deal_id") else None,
                    "payee_role": row["payee_role"],
                    "purpose": row["purpose"],
                },
            )
        except Exception as e:
            logger.error(f"Payment intent creation failed for disbursement {disbursement_id}: {e}")
            return {"success": False, "error": f"Payment engine error: {e}"}

        if not result.get("success"):
            return {"success": False, "error": result.get("error", "Payment intent creation failed")}

        intent_id_str = result["intent_id"]

        # Transition to PROCESSING and link intent
        transition = await self._transition(
            disbursement_id, "PROCESSING",
            actor_id=None, actor_type="SYSTEM",
            event_type="DISBURSEMENT_PROCESSING",
            extra_updates={"payment_intent_id": UUID(intent_id_str)},
            metadata={"payment_intent_id": intent_id_str},
        )

        if transition.get("success"):
            transition["payment_intent_id"] = intent_id_str
            transition["checkout_url"] = result.get("checkout_url")

        return transition

    async def mark_disbursed(
        self, disbursement_id: UUID, payment_intent_id: UUID
    ) -> Dict[str, Any]:
        from datetime import datetime, timezone

        result = await self._transition(
            disbursement_id, "DISBURSED",
            actor_id=None, actor_type="SYSTEM",
            event_type="DISBURSEMENT_DISBURSED",
            extra_updates={
                "payment_intent_id": payment_intent_id,
                "disbursed_at": datetime.now(timezone.utc),
            },
            metadata={"payment_intent_id": str(payment_intent_id)},
        )

        if result.get("success"):
            # Create ledger entry
            try:
                async with self.db.acquire() as conn:
                    disb = await conn.fetchrow(
                        "SELECT * FROM escrow_disbursements WHERE id = $1",
                        disbursement_id,
                    )
                if disb and disb.get("deal_id"):
                    from ..ledger_service import LedgerService

                    ledger_svc = LedgerService(self.db)
                    await ledger_svc.record_entry(
                        deal_id=disb["deal_id"],
                        entry_type="ESCROW_DISBURSED",
                        amount=Decimal(str(disb["amount"])),
                        direction="DEBIT",
                        description=f"Escrow disbursement: {disb['purpose']} to {disb['payee_role']}",
                        user_id=disb["payee_id"],
                        metadata={
                            "disbursement_id": str(disbursement_id),
                            "payee_role": disb["payee_role"],
                            "payment_intent_id": str(payment_intent_id),
                        },
                        verification_status="VERIFIED",
                    )
            except Exception as e:
                logger.warning(f"Failed to create ledger entry for disbursement {disbursement_id}: {e}")

        return result

    async def mark_failed(
        self, disbursement_id: UUID, failure_reason: str
    ) -> Dict[str, Any]:
        return await self._transition(
            disbursement_id, "FAILED",
            actor_id=None, actor_type="SYSTEM",
            event_type="DISBURSEMENT_FAILED",
            extra_updates={"failure_reason": failure_reason},
            metadata={"failure_reason": failure_reason},
        )

    async def hold_disbursement(
        self, disbursement_id: UUID, hold_reason: str, hold_by: UUID
    ) -> Dict[str, Any]:
        from datetime import datetime, timezone

        return await self._transition(
            disbursement_id, "ON_HOLD",
            actor_id=hold_by, actor_type="ADMIN",
            event_type="DISBURSEMENT_ON_HOLD",
            extra_updates={
                "hold_reason": hold_reason,
                "hold_by": hold_by,
                "hold_at": datetime.now(timezone.utc),
            },
            metadata={"hold_reason": hold_reason},
        )

    async def lift_hold(
        self, disbursement_id: UUID, reason: str, admin_id: UUID
    ) -> Dict[str, Any]:
        return await self._transition(
            disbursement_id, "APPROVED",
            actor_id=admin_id, actor_type="ADMIN",
            event_type="DISBURSEMENT_HOLD_LIFTED",
            metadata={"lift_reason": reason},
        )

    async def cancel_disbursement(
        self, disbursement_id: UUID, reason: str, cancelled_by: UUID
    ) -> Dict[str, Any]:
        from datetime import datetime, timezone

        return await self._transition(
            disbursement_id, "CANCELLED",
            actor_id=cancelled_by, actor_type="ADMIN",
            event_type="DISBURSEMENT_CANCELLED",
            extra_updates={
                "cancellation_reason": reason,
                "cancelled_by": cancelled_by,
                "cancelled_at": datetime.now(timezone.utc),
            },
            metadata={"cancellation_reason": reason},
        )

    async def retry_disbursement(
        self, disbursement_id: UUID, admin_id: UUID
    ) -> Dict[str, Any]:
        """FAILED → PROCESSING (retry). Enforces max 3 retries."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM escrow_disbursements WHERE id = $1", disbursement_id
            )
        if not row:
            return {"success": False, "error": "Disbursement not found"}
        if row["status"] != "FAILED":
            return {"success": False, "error": "Only FAILED disbursements can be retried"}

        retry_count = row.get("retry_count") or 0
        if retry_count >= 3:
            return {
                "success": False,
                "error": f"Max retry count (3) reached for disbursement {disbursement_id}",
            }

        # Increment retry_count first
        async with self.db.acquire() as conn:
            await conn.execute(
                "UPDATE escrow_disbursements SET retry_count = retry_count + 1 WHERE id = $1",
                disbursement_id,
            )

        # Transition back to APPROVED so process_disbursement can pick it up
        await self._transition(
            disbursement_id, "APPROVED",
            actor_id=admin_id, actor_type="ADMIN",
            event_type="DISBURSEMENT_RETRY",
            metadata={"retry_attempt": retry_count + 1, "admin_id": str(admin_id)},
        )

        # Now process
        return await self.process_disbursement(disbursement_id)

    # -----------------------------------------------------------------------
    # QUERIES
    # -----------------------------------------------------------------------

    async def get_deal_disbursements(self, deal_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT ed.*, u.full_name AS payee_name
                FROM escrow_disbursements ed
                LEFT JOIN users u ON u.id = ed.payee_id
                WHERE ed.deal_id = $1
                ORDER BY ed.created_at ASC
                """,
                deal_id,
            )
        disbursements = [self._format_disbursement(r) for r in rows]
        summary = self._compute_summary(rows)
        return {
            "success": True,
            "deal_id": str(deal_id),
            "disbursements": disbursements,
            "summary": summary,
        }

    async def get_disbursement_detail(self, disbursement_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT ed.*, u.full_name AS payee_name
                FROM escrow_disbursements ed
                LEFT JOIN users u ON u.id = ed.payee_id
                WHERE ed.id = $1
                """,
                disbursement_id,
            )
        if not row:
            return {"success": False, "error": "Disbursement not found"}

        events = await self.events.get_events("ESCROW_DISBURSEMENT", disbursement_id)
        return {
            "success": True,
            "disbursement": self._format_disbursement(row),
            "timeline": events,
        }

    # -----------------------------------------------------------------------
    # HELPERS
    # -----------------------------------------------------------------------

    def _compute_summary(self, rows) -> Dict[str, Any]:
        total = Decimal("0")
        disbursed = Decimal("0")
        pending = Decimal("0")
        failed = Decimal("0")
        for r in rows:
            amt = Decimal(str(r["amount"]))
            total += amt
            if r["status"] == "DISBURSED":
                disbursed += amt
            elif r["status"] in ("PENDING", "APPROVED", "PROCESSING", "ON_HOLD"):
                pending += amt
            elif r["status"] == "FAILED":
                failed += amt
        return {
            "total": float(total),
            "disbursed": float(disbursed),
            "pending": float(pending),
            "failed": float(failed),
        }

    def _format_disbursement(self, row: asyncpg.Record) -> Dict[str, Any]:
        return {
            "id": str(row["id"]),
            "deal_id": str(row["deal_id"]) if row.get("deal_id") else None,
            "transaction_id": str(row["transaction_id"]) if row.get("transaction_id") else None,
            "payee_id": str(row["payee_id"]),
            "payee_name": row.get("payee_name"),
            "payee_role": row["payee_role"],
            "amount": float(row["amount"]),
            "purpose": row["purpose"],
            "status": row["status"],
            "payment_intent_id": str(row["payment_intent_id"]) if row.get("payment_intent_id") else None,
            "payment_reference": row.get("payment_reference"),
            "bank_account_last4": row.get("bank_account_last4"),
            "approved_by": str(row["approved_by"]) if row.get("approved_by") else None,
            "approved_at": row["approved_at"].isoformat() if row.get("approved_at") else None,
            "hold_reason": row.get("hold_reason"),
            "cancellation_reason": row.get("cancellation_reason"),
            "failure_reason": row.get("failure_reason"),
            "retry_count": row.get("retry_count", 0),
            "disbursed_at": row["disbursed_at"].isoformat() if row.get("disbursed_at") else None,
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
