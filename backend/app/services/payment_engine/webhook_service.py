from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID

import asyncpg

from .provider_factory import ProviderFactory


class WebhookService:
    """Webhook intake, signature verification, idempotency, and retry handling."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.provider_factory = ProviderFactory(db)

    async def receive_webhook(
        self,
        provider: str,
        payload: Dict[str, Any],
        signature: Optional[str],
    ) -> Dict[str, Any]:
        provider_name, provider_impl, config = await self.provider_factory.get_provider(provider)
        secret = str(config.get("webhook_secret") or "")
        signature_verified = provider_impl.verify_webhook_signature(payload, signature, secret)

        idempotency_key = str(payload.get("idempotency_key") or self._build_idempotency_key(provider_name, payload))

        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO payment_webhooks (
                    provider,
                    event_type,
                    raw_payload,
                    signature,
                    signature_verified,
                    processed,
                    idempotency_key
                )
                VALUES ($1, $2, $3::jsonb, $4, $5, FALSE, $6)
                ON CONFLICT (idempotency_key) DO NOTHING
                RETURNING id
                """,
                provider_name,
                payload.get("event_type", "payment.unknown"),
                json.dumps(payload),
                signature,
                signature_verified,
                idempotency_key,
            )

        if not row:
            return {"success": True, "duplicate": True, "idempotency_key": idempotency_key}

        process_result = await self.process_webhook_record(row["id"])
        return {
            "success": process_result.get("success", False),
            "webhook_id": str(row["id"]),
            "idempotency_key": idempotency_key,
            **process_result,
        }

    async def process_webhook_record(self, webhook_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            webhook = await conn.fetchrow(
                "SELECT * FROM payment_webhooks WHERE id = $1",
                webhook_id,
            )
            if not webhook:
                return {"success": False, "error": "Webhook not found"}

        provider_name, provider_impl, _ = await self.provider_factory.get_provider(webhook["provider"])
        raw_payload = webhook["raw_payload"]
        if isinstance(raw_payload, str):
            raw_payload = json.loads(raw_payload)

        event = provider_impl.parse_webhook_event(raw_payload)
        intent_id = raw_payload.get("intent_id")

        async with self.db.acquire() as conn:
            if not intent_id and event.order_id:
                intent_id = await conn.fetchval(
                    "SELECT id FROM payment_intents WHERE provider_order_id = $1 LIMIT 1",
                    event.order_id,
                )
            if not intent_id and event.payment_id:
                intent_id = await conn.fetchval(
                    "SELECT id FROM payment_intents WHERE provider_payment_id = $1 LIMIT 1",
                    event.payment_id,
                )

        if not intent_id:
            await self._mark_webhook_failed(webhook_id, "Unable to resolve payment intent")
            return {"success": False, "error": "Unable to resolve payment intent"}

        from .payment_service import PaymentService

        payment_service = PaymentService(self.db)
        status = self._map_event_status(event.status)
        update_result = await payment_service.apply_provider_status(
            intent_id=UUID(str(intent_id)),
            provider_payment_id=event.payment_id or "",
            provider_status=status,
            amount=Decimal(str(event.amount)),
            raw_response={"provider": provider_name, "webhook_event": event.raw},
            actor_type="WEBHOOK",
            actor_id=None,
        )

        if not update_result.get("success"):
            await self._mark_webhook_failed(webhook_id, update_result.get("error", "Webhook processing failed"))
            return update_result

        async with self.db.acquire() as conn:
            await conn.execute(
                """
                UPDATE payment_webhooks
                SET processed = TRUE,
                    processed_at = NOW(),
                    processing_error = NULL
                WHERE id = $1
                """,
                webhook_id,
            )

        return {"success": True, "status": status, "intent_id": str(intent_id)}

    async def retry_failed_webhooks(self) -> Dict[str, Any]:
        retries = 0
        successes = 0

        async with self.db.acquire() as conn:
            pending = await conn.fetch(
                """
                SELECT id
                FROM payment_webhooks
                WHERE processed = FALSE
                  AND retry_count < 3
                ORDER BY received_at ASC
                LIMIT 100
                """
            )

        for row in pending:
            retries += 1
            async with self.db.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE payment_webhooks
                    SET retry_count = retry_count + 1,
                        last_retry_at = NOW()
                    WHERE id = $1
                    """,
                    row["id"],
                )

            result = await self.process_webhook_record(row["id"])
            if result.get("success"):
                successes += 1

        return {
            "success": True,
            "retried": retries,
            "succeeded": successes,
            "failed": retries - successes,
        }

    async def _mark_webhook_failed(self, webhook_id: UUID, error: str) -> None:
        async with self.db.acquire() as conn:
            await conn.execute(
                """
                UPDATE payment_webhooks
                SET processed = FALSE,
                    processed_at = NULL,
                    processing_error = $2
                WHERE id = $1
                """,
                webhook_id,
                error[:1000],
            )

    def _map_event_status(self, status: str) -> str:
        normalized = (status or "").upper()
        if normalized in {"AUTHORIZED"}:
            return "AUTHORIZED"
        if normalized in {"CAPTURED", "SUCCESS", "SUCCEEDED"}:
            return "CAPTURED"
        if normalized in {"SETTLED"}:
            return "SETTLED"
        if normalized in {"TIMED_OUT", "TIMEOUT"}:
            return "TIMED_OUT"
        if normalized in {"FAILED", "DECLINED", "ERROR"}:
            return "FAILED"
        if normalized in {"PARTIALLY_REFUNDED"}:
            return "PARTIALLY_REFUNDED"
        if normalized in {"FULLY_REFUNDED", "REFUNDED"}:
            return "FULLY_REFUNDED"
        return "FAILED"

    def _build_idempotency_key(self, provider: str, payload: Dict[str, Any]) -> str:
        source = json.dumps(
            {
                "provider": provider,
                "event_type": payload.get("event_type"),
                "payment_id": payload.get("payment_id"),
                "order_id": payload.get("order_id"),
                "timestamp": payload.get("timestamp"),
            },
            sort_keys=True,
        )
        return hashlib.sha256(source.encode("utf-8")).hexdigest()
