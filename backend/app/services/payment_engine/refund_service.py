from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Dict
from uuid import UUID

import asyncpg

from .payment_events_service import PaymentEventsService
from .provider_factory import ProviderFactory


class RefundService:
    """Refund lifecycle orchestration with provider abstraction."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.provider_factory = ProviderFactory(db)
        self.events = PaymentEventsService(db)

    async def request_refund(
        self,
        intent_id: UUID,
        amount: Decimal,
        reason: str,
        requested_by: UUID,
    ) -> Dict[str, Any]:
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        if amount <= Decimal("0"):
            return {"success": False, "error": "Refund amount must be greater than zero"}

        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return {"success": False, "error": "Payment intent not found"}

            if intent["status"] not in ("CAPTURED", "SETTLED", "PARTIALLY_REFUNDED"):
                return {
                    "success": False,
                    "error": f"Refund not allowed in status {intent['status']}",
                }

            already_refunded = await conn.fetchval(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM refunds
                WHERE intent_id = $1
                  AND status IN ('REQUESTED', 'PROCESSING', 'COMPLETED')
                """,
                intent_id,
            )
            remaining = Decimal(str(intent["amount"])) - Decimal(str(already_refunded or 0))
            if amount > remaining:
                return {
                    "success": False,
                    "error": f"Refund exceeds remaining refundable amount ({remaining:.2f})",
                }

        provider_name, provider, _ = await self.provider_factory.get_provider(intent["provider"])
        provider_result = await provider.process_refund(
            provider_payment_id=intent["provider_payment_id"] or "",
            amount=amount,
            reason=reason,
        )

        async with self.db.acquire() as conn:
            async with conn.transaction():
                refund = await conn.fetchrow(
                    """
                    INSERT INTO refunds (
                        intent_id,
                        amount,
                        reason,
                        status,
                        provider_refund_id,
                        provider_response,
                        requested_by,
                        approved_by,
                        requested_at,
                        processed_at,
                        completed_at,
                        failed_at
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4::refund_status,
                        $5,
                        $6::jsonb,
                        $7,
                        $8,
                        NOW(),
                        NOW(),
                        CASE WHEN $4 = 'COMPLETED' THEN NOW() ELSE NULL END,
                        CASE WHEN $4 = 'FAILED' THEN NOW() ELSE NULL END
                    )
                    RETURNING *
                    """,
                    intent_id,
                    amount,
                    reason,
                    "COMPLETED" if provider_result.status.lower() == "completed" else "FAILED",
                    provider_result.refund_id,
                    json.dumps(provider_result.raw_response or {}),
                    requested_by,
                    requested_by,
                )

                if provider_result.status.lower() == "completed":
                    await conn.execute(
                        """
                        INSERT INTO payment_transactions (
                            intent_id,
                            transaction_type,
                            amount,
                            direction,
                            provider_txn_id,
                            provider_response,
                            status
                        )
                        VALUES ($1, 'REFUND', $2, 'DEBIT', $3, $4::jsonb, 'COMPLETED')
                        """,
                        intent_id,
                        amount,
                        provider_result.refund_id,
                        json.dumps(provider_result.raw_response or {}),
                    )

                    total_refunded = await conn.fetchval(
                        """
                        SELECT COALESCE(SUM(amount), 0)
                        FROM refunds
                        WHERE intent_id = $1
                          AND status = 'COMPLETED'
                        """,
                        intent_id,
                    )
                    intent_amount = Decimal(str(intent["amount"]))
                    new_status = "FULLY_REFUNDED" if Decimal(str(total_refunded or 0)) >= intent_amount else "PARTIALLY_REFUNDED"

                    await conn.execute(
                        "UPDATE payment_intents SET status = $2::payment_intent_status WHERE id = $1",
                        intent_id,
                        new_status,
                    )

                    await self.events.log_event(
                        intent_id=intent_id,
                        event_type="REFUND_COMPLETED",
                        from_status=intent["status"],
                        to_status=new_status,
                        actor_id=requested_by,
                        actor_type="ADMIN",
                        metadata={
                            "refund_id": str(refund["id"]),
                            "provider": provider_name,
                            "amount": str(amount),
                            "reason": reason,
                        },
                        conn=conn,
                    )
                else:
                    await self.events.log_event(
                        intent_id=intent_id,
                        event_type="REFUND_FAILED",
                        from_status=intent["status"],
                        to_status=intent["status"],
                        actor_id=requested_by,
                        actor_type="ADMIN",
                        metadata={
                            "reason": reason,
                            "provider_response": provider_result.raw_response,
                        },
                        conn=conn,
                    )

        return {
            "success": provider_result.status.lower() == "completed",
            "refund_id": str(refund["id"]),
            "status": refund["status"],
            "amount": float(refund["amount"]),
        }
