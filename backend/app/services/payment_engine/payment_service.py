
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import asyncpg

from .payment_events_service import PaymentEventsService
from .provider_factory import ProviderFactory
from .providers.mock_provider import MockPaymentProvider


INTENT_TRANSITIONS: Dict[str, set[str]] = {
    "CREATED": {"CHECKOUT_INITIATED", "EXPIRED"},
    "CHECKOUT_INITIATED": {"AUTHORIZED", "FAILED", "TIMED_OUT", "EXPIRED"},
    "AUTHORIZED": {"CAPTURED", "AUTHORIZATION_EXPIRED", "FAILED"},
    "CAPTURED": {"SETTLED", "PARTIALLY_REFUNDED", "FULLY_REFUNDED"},
    "SETTLED": {"PARTIALLY_REFUNDED", "FULLY_REFUNDED"},
    "PARTIALLY_REFUNDED": {"PARTIALLY_REFUNDED", "FULLY_REFUNDED"},
    "FULLY_REFUNDED": set(),
    "FAILED": set(),
    "TIMED_OUT": set(),
    "EXPIRED": set(),
    "AUTHORIZATION_EXPIRED": set(),
}

SUCCESS_SCENARIOS = {"SUCCESS", "DEFAULT", "DELAYED_WEBHOOK", "REFUND_FAIL"}
FAIL_SCENARIOS = {"ALWAYS_FAIL", "INSUFFICIENT", "FRAUD_BLOCKED"}
TIMEOUT_SCENARIOS = {"TIMEOUT", "NETWORK_ERROR"}


class PaymentService:
    """Core payment orchestration service (provider-agnostic)."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.events = PaymentEventsService(db)
        self.provider_factory = ProviderFactory(db)
        self.public_base_url = os.getenv("PAYMENT_PUBLIC_BASE_URL", "http://localhost:8000")

    async def create_payment_intent(
        self,
        intent_type: str,
        reference_id: UUID,
        reference_type: str,
        amount: Decimal,
        currency: str,
        payer_id: UUID,
        ip_address: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        if amount <= Decimal("0"):
            return {"success": False, "error": "Amount must be greater than zero"}

        provider_name, provider, provider_config = await self.provider_factory.get_default_provider()
        intent_id = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        async with self.db.acquire() as conn:
            duplicate = await conn.fetchrow(
                """
                SELECT id, status
                FROM payment_intents
                WHERE reference_type = $1
                  AND reference_id = $2
                  AND status NOT IN (
                    'CAPTURED',
                    'SETTLED',
                    'FULLY_REFUNDED',
                    'FAILED',
                    'TIMED_OUT',
                    'EXPIRED',
                    'AUTHORIZATION_EXPIRED'
                  )
                LIMIT 1
                """,
                reference_type,
                reference_id,
            )
            if duplicate:
                return {
                    "success": False,
                    "error": f"Active payment intent already exists (status: {duplicate['status']})",
                    "intent_id": str(duplicate["id"]),
                }

        order_result = await provider.create_order(
            amount=amount,
            currency=currency,
            metadata={
                "intent_id": str(intent_id),
                "intent_type": intent_type,
                "reference_id": str(reference_id),
                "reference_type": reference_type,
                **(metadata or {}),
            },
        )

        checkout_url = order_result.checkout_url or f"/payments/mock-checkout/{intent_id}"
        provider_response = {
            "provider_order_create": order_result.raw_response,
            "provider_config_snapshot": provider_config,
            "metadata": metadata or {},
        }

        async with self.db.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO payment_intents (
                        id,
                        intent_type,
                        reference_id,
                        reference_type,
                        amount,
                        currency,
                        payer_id,
                        provider,
                        provider_order_id,
                        checkout_url,
                        status,
                        expires_at,
                        provider_response,
                        ip_address
                    )
                    VALUES (
                        $1, $2::payment_intent_type, $3, $4, $5, $6, $7, $8, $9, $10,
                        'CREATED', $11, $12::jsonb, $13
                    )
                    """,
                    intent_id,
                    intent_type,
                    reference_id,
                    reference_type,
                    amount,
                    currency,
                    payer_id,
                    provider_name,
                    order_result.provider_order_id,
                    checkout_url,
                    expires_at,
                    json.dumps(provider_response),
                    ip_address,
                )

                await self.events.log_event(
                    intent_id=intent_id,
                    event_type="PAYMENT_INTENT_CREATED",
                    from_status=None,
                    to_status="CREATED",
                    actor_id=payer_id,
                    actor_type="USER",
                    metadata={
                        "intent_type": intent_type,
                        "reference_id": str(reference_id),
                        "reference_type": reference_type,
                        "amount": str(amount),
                        "currency": currency,
                        "provider": provider_name,
                    },
                    conn=conn,
                )

        return {
            "success": True,
            "intent_id": str(intent_id),
            "checkout_url": checkout_url,
            "expires_at": expires_at.isoformat(),
            "provider": provider_name,
        }

    async def initiate_checkout(self, intent_id: UUID, ip_address: str) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return {"success": False, "error": "Payment intent not found"}

            now = datetime.now(timezone.utc)
            expires_at = self._to_aware(intent["expires_at"])
            if now > expires_at:
                await self._transition_intent(
                    conn=conn,
                    intent=intent,
                    to_status="EXPIRED",
                    actor_id=None,
                    actor_type="SYSTEM",
                    metadata={"reason": "intent_expired_before_checkout"},
                )
                return {"success": False, "error": "Payment intent has expired"}

            if intent["status"] == "CHECKOUT_INITIATED":
                return {
                    "success": True,
                    "checkout_url": intent["checkout_url"],
                    "provider": intent["provider"],
                    "status": intent["status"],
                }

            if intent["status"] != "CREATED":
                return {
                    "success": False,
                    "error": f"Checkout can only be initiated from CREATED. Current: {intent['status']}",
                }

            async with conn.transaction():
                await self._transition_intent(
                    conn=conn,
                    intent=intent,
                    to_status="CHECKOUT_INITIATED",
                    actor_id=intent["payer_id"],
                    actor_type="SYSTEM",
                    metadata={"ip_address": ip_address},
                )

        return {
            "success": True,
            "checkout_url": intent["checkout_url"],
            "provider": intent["provider"],
            "status": "CHECKOUT_INITIATED",
        }
    async def handle_provider_callback(
        self,
        intent_id: UUID,
        provider_payment_id: str,
        provider_response: Dict[str, Any],
        actor_type: str = "SYSTEM",
    ) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return {"success": False, "error": "Payment intent not found"}

        _, provider, _ = await self.provider_factory.get_provider(intent["provider"])
        verification = await provider.verify_payment(provider_payment_id, intent["provider_order_id"])

        if verification.verified:
            target_status = "CAPTURED"
            if verification.status.lower() == "authorized":
                target_status = "AUTHORIZED"
            elif verification.status.lower() == "settled":
                target_status = "SETTLED"
        else:
            target_status = "FAILED" if verification.status.lower() != "timed_out" else "TIMED_OUT"

        merged_response = {
            "provider_callback": provider_response,
            "verification": verification.raw_response,
        }

        return await self.apply_provider_status(
            intent_id=intent_id,
            provider_payment_id=verification.provider_payment_id or provider_payment_id,
            provider_status=target_status,
            amount=verification.amount,
            raw_response=merged_response,
            actor_type=actor_type,
            actor_id=None,
        )

    async def apply_provider_status(
        self,
        intent_id: UUID,
        provider_payment_id: str,
        provider_status: str,
        amount: Decimal,
        raw_response: Optional[Dict[str, Any]] = None,
        actor_type: str = "SYSTEM",
        actor_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        target = provider_status.upper()
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        captured_newly = False

        async with self.db.acquire() as conn:
            async with conn.transaction():
                intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1 FOR UPDATE", intent_id)
                if not intent:
                    return {"success": False, "error": "Payment intent not found"}

                current_status = intent["status"]
                if current_status == target:
                    return {"success": True, "status": current_status, "idempotent": True}

                merged_provider_response = self._merge_provider_response(intent["provider_response"], raw_response or {})
                await conn.execute(
                    """
                    UPDATE payment_intents
                    SET provider_payment_id = COALESCE($2, provider_payment_id),
                        provider_response = $3::jsonb
                    WHERE id = $1
                    """,
                    intent_id,
                    provider_payment_id,
                    json.dumps(merged_provider_response),
                )
                intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)

                if target in {"AUTHORIZED", "CAPTURED", "SETTLED"}:
                    if intent["status"] == "CREATED":
                        intent = await self._transition_intent(
                            conn,
                            intent,
                            "CHECKOUT_INITIATED",
                            actor_id,
                            actor_type,
                            {"source": "provider_callback"},
                        )

                    if target in {"AUTHORIZED", "CAPTURED", "SETTLED"} and intent["status"] == "CHECKOUT_INITIATED":
                        intent = await self._transition_intent(
                            conn,
                            intent,
                            "AUTHORIZED",
                            actor_id,
                            actor_type,
                            {"provider_payment_id": provider_payment_id},
                        )

                    if target in {"CAPTURED", "SETTLED"} and intent["status"] == "AUTHORIZED":
                        intent = await self._transition_intent(
                            conn,
                            intent,
                            "CAPTURED",
                            actor_id,
                            actor_type,
                            {"captured_amount": str(amount)},
                        )
                        captured_newly = True
                        await self._insert_payment_transaction(
                            conn=conn,
                            intent_id=intent_id,
                            transaction_type="CAPTURE",
                            amount=amount,
                            direction="CREDIT",
                            provider_txn_id=provider_payment_id,
                            status="COMPLETED",
                            provider_response=raw_response or {},
                        )

                    if target == "SETTLED" and intent["status"] == "CAPTURED":
                        intent = await self._transition_intent(
                            conn,
                            intent,
                            "SETTLED",
                            actor_id,
                            actor_type,
                            {"settled_amount": str(amount)},
                        )
                        await self._insert_payment_transaction(
                            conn=conn,
                            intent_id=intent_id,
                            transaction_type="SETTLEMENT",
                            amount=amount,
                            direction="CREDIT",
                            provider_txn_id=f"settlement_{provider_payment_id}",
                            status="COMPLETED",
                            provider_response=raw_response or {},
                        )

                elif target in {"FAILED", "TIMED_OUT", "EXPIRED", "AUTHORIZATION_EXPIRED"}:
                    await self._transition_intent(
                        conn,
                        intent,
                        target,
                        actor_id,
                        actor_type,
                        {
                            "failure_code": (raw_response or {}).get("failure_code"),
                            "failure_message": (raw_response or {}).get("failure_message"),
                        },
                    )

                elif target in {"PARTIALLY_REFUNDED", "FULLY_REFUNDED"}:
                    await self._transition_intent(
                        conn,
                        intent,
                        target,
                        actor_id,
                        actor_type,
                        {"refund_amount": str(amount)},
                    )
                else:
                    return {"success": False, "error": f"Unsupported provider status {target}"}

        if captured_newly:
            await self._run_post_capture_hooks(intent_id)

        return {"success": True, "status": target, "intent_id": str(intent_id)}

    async def process_webhook(self, provider: str, payload: Dict[str, Any], signature: Optional[str]) -> Dict[str, Any]:
        from .webhook_service import WebhookService

        webhook_service = WebhookService(self.db)
        return await webhook_service.receive_webhook(provider=provider, payload=payload, signature=signature)

    async def get_payment_status(self, intent_id: UUID, user_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return {"success": False, "error": "Payment intent not found"}

            if intent["payer_id"] != user_id:
                admin_or_ceo = await conn.fetchval(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM user_roles ur
                        JOIN roles r ON ur.role_id = r.id
                        WHERE ur.user_id = $1
                          AND r.name IN ('ADMIN', 'CEO')
                    )
                    """,
                    user_id,
                )
                if not admin_or_ceo:
                    return {"success": False, "error": "Access denied"}

            refunds = await conn.fetch(
                """
                SELECT *
                FROM refunds
                WHERE intent_id = $1
                ORDER BY requested_at DESC
                """,
                intent_id,
            )

        timeline = await self.events.get_timeline(intent_id)
        return {
            "success": True,
            "payment": self._format_intent(intent),
            "timeline": timeline.get("events", []),
            "refunds": [self._format_refund(refund) for refund in refunds],
        }

    async def get_payment_by_reference(self, reference_type: str, reference_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow(
                """
                SELECT *
                FROM payment_intents
                WHERE reference_type = $1
                  AND reference_id = $2
                ORDER BY created_at DESC
                LIMIT 1
                """,
                reference_type,
                reference_id,
            )

        if not intent:
            return {"success": False, "error": "Payment intent not found"}
        return {"success": True, "payment": self._format_intent(intent)}

    async def request_refund(
        self,
        intent_id: UUID,
        amount: Decimal,
        reason: str,
        requested_by: UUID,
    ) -> Dict[str, Any]:
        from .refund_service import RefundService

        service = RefundService(self.db)
        return await service.request_refund(
            intent_id=intent_id,
            amount=amount,
            reason=reason,
            requested_by=requested_by,
        )

    async def list_refunds(self, intent_id: UUID, user_id: UUID) -> Dict[str, Any]:
        payment = await self.get_payment_status(intent_id, user_id)
        if not payment.get("success"):
            return payment
        return {"success": True, "refunds": payment.get("refunds", [])}
    async def list_payments(
        self,
        status: Optional[str] = None,
        provider: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        page = max(1, page)
        limit = min(max(1, limit), 200)
        offset = (page - 1) * limit

        filters: List[str] = ["1=1"]
        params: List[Any] = []
        idx = 1

        if status:
            filters.append(f"status = ${idx}::payment_intent_status")
            params.append(status.upper())
            idx += 1

        if provider:
            filters.append(f"provider = ${idx}")
            params.append(provider.upper())
            idx += 1

        if date_from:
            filters.append(f"created_at >= ${idx}")
            params.append(date_from)
            idx += 1

        if date_to:
            filters.append(f"created_at <= ${idx}")
            params.append(date_to)
            idx += 1

        where_clause = " AND ".join(filters)

        async with self.db.acquire() as conn:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM payment_intents WHERE {where_clause}", *params)
            rows = await conn.fetch(
                f"""
                SELECT *
                FROM payment_intents
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
                """,
                *params,
                limit,
                offset,
            )

        return {
            "success": True,
            "payments": [self._format_intent(row) for row in rows],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": count,
                "total_pages": (count + limit - 1) // limit,
            },
        }

    async def get_admin_stats(self, date_from: Optional[datetime], date_to: Optional[datetime]) -> Dict[str, Any]:
        filters: List[str] = ["1=1"]
        params: List[Any] = []
        idx = 1

        if date_from:
            filters.append(f"created_at >= ${idx}")
            params.append(date_from)
            idx += 1
        if date_to:
            filters.append(f"created_at <= ${idx}")
            params.append(date_to)
            idx += 1

        where_clause = " AND ".join(filters)

        async with self.db.acquire() as conn:
            total_collected = await conn.fetchval(
                f"""
                SELECT COALESCE(SUM(amount), 0)
                FROM payment_transactions
                WHERE transaction_type IN ('CAPTURE', 'SETTLEMENT')
                  AND status = 'COMPLETED'
                  AND intent_id IN (SELECT id FROM payment_intents WHERE {where_clause})
                """,
                *params,
            )
            total_refunded = await conn.fetchval(
                f"""
                SELECT COALESCE(SUM(amount), 0)
                FROM payment_transactions
                WHERE transaction_type = 'REFUND'
                  AND status = 'COMPLETED'
                  AND intent_id IN (SELECT id FROM payment_intents WHERE {where_clause})
                """,
                *params,
            )
            pending_count = await conn.fetchval(
                f"""
                SELECT COUNT(*)
                FROM payment_intents
                WHERE status IN ('CREATED', 'CHECKOUT_INITIATED', 'AUTHORIZED')
                  AND {where_clause}
                """,
                *params,
            )

        return {
            "success": True,
            "stats": {
                "total_collected": float(total_collected or 0),
                "total_refunded": float(total_refunded or 0),
                "pending_payments": int(pending_count or 0),
            },
        }

    async def expire_stale_payment_intents(self) -> Dict[str, Any]:
        expired_ids: List[UUID] = []

        async with self.db.acquire() as conn:
            stale = await conn.fetch(
                """
                SELECT *
                FROM payment_intents
                WHERE status = 'CREATED'
                  AND expires_at < NOW()
                """
            )
            if not stale:
                return {"success": True, "expired_count": 0}

            async with conn.transaction():
                for intent in stale:
                    updated = await self._transition_intent(
                        conn,
                        intent,
                        "EXPIRED",
                        actor_id=None,
                        actor_type="SYSTEM",
                        metadata={"reason": "expiry_job"},
                    )
                    if updated:
                        expired_ids.append(intent["id"])

        for intent_id in expired_ids:
            await self._run_expiry_hooks(intent_id)

        return {"success": True, "expired_count": len(expired_ids)}

    async def process_mock_checkout_form(
        self,
        intent_id: UUID,
        card_number: str,
        expiry: str,
        cvv: str,
        otp: Optional[str] = None,
    ) -> Dict[str, Any]:
        del expiry, cvv
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return {"success": False, "error": "Payment intent not found"}
            if intent["provider"] != "MOCK":
                return {"success": False, "error": "Mock checkout is only available for MOCK provider"}

        if intent["status"] == "CREATED":
            init_result = await self.initiate_checkout(intent_id, ip_address="mock-checkout")
            if not init_result.get("success"):
                return init_result

        _, provider, _ = await self.provider_factory.get_provider("MOCK")
        assert isinstance(provider, MockPaymentProvider)

        scenario = provider.resolve_scenario_for_card(card_number)
        if scenario == "3DS_REQUIRED":
            if not otp:
                return {"success": False, "otp_required": True, "scenario": scenario}
            if not provider.validate_otp(otp):
                scenario = "ALWAYS_FAIL"

        if scenario == "3DS_REQUIRED":
            scenario = "SUCCESS"

        if scenario == "PARTIAL_CAPTURE":
            provider_payment_id = provider.build_provider_payment_id("PARTIAL_CAPTURE", intent["amount"])
            webhook_status = "captured"
            result_status = "success"
            message = "Payment captured partially in test scenario."
        elif scenario in SUCCESS_SCENARIOS:
            provider_payment_id = provider.build_provider_payment_id(scenario, intent["amount"])
            webhook_status = "captured"
            result_status = "success"
            message = "Payment captured successfully."
        elif scenario in TIMEOUT_SCENARIOS:
            provider_payment_id = provider.build_provider_payment_id(scenario, intent["amount"])
            webhook_status = "timed_out"
            result_status = "timeout"
            message = "Payment timed out in mock gateway."
        elif scenario in FAIL_SCENARIOS:
            provider_payment_id = provider.build_provider_payment_id(scenario, intent["amount"])
            webhook_status = "failed"
            result_status = "failed"
            message = "Payment was declined in mock gateway."
        else:
            provider_payment_id = provider.build_provider_payment_id("SUCCESS", intent["amount"])
            webhook_status = "captured"
            result_status = "success"
            message = "Payment captured successfully."

        payload = {
            "event_type": f"payment.{webhook_status}",
            "payment_id": provider_payment_id,
            "order_id": intent["provider_order_id"],
            "intent_id": str(intent_id),
            "status": webhook_status,
            "amount": str(intent["amount"]),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "idempotency_key": f"{intent_id}:{provider_payment_id}:{webhook_status}",
        }
        signature = provider.sign_webhook_payload(payload, provider.get_webhook_secret())

        first_delay_ms = 10000 if scenario == "DELAYED_WEBHOOK" else 0
        asyncio.create_task(self._dispatch_mock_webhook(payload, signature, first_delay_ms=first_delay_ms))

        return {
            "success": True,
            "result_status": result_status,
            "message": message,
            "provider_payment_id": provider_payment_id,
            "redirect_url": f"/payments/mock-checkout/{intent_id}?result={result_status}",
        }
    async def render_mock_checkout_html(self, intent_id: UUID, result: Optional[str] = None) -> str:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return "<h1>Payment intent not found</h1>"

        amount = f"{Decimal(str(intent['amount'])):,.2f}"
        context_label = f"{intent['intent_type'].title()} Payment"
        reference_label = f"{intent['reference_type']}:{intent['reference_id']}"
        result_message = ""
        if result == "success":
            result_message = "<div class='banner ok'>Payment successful. Webhook update in progress.</div>"
        elif result == "failed":
            result_message = "<div class='banner err'>Payment failed. Try another test card.</div>"
        elif result == "timeout":
            result_message = "<div class='banner warn'>Payment timed out. Please retry.</div>"

        return f"""
<!doctype html>
<html>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>NestFind Test Payment</title>
  <style>
    :root {{
      --bg: #f4f7fb;
      --surface: #ffffff;
      --text: #10203a;
      --muted: #5f6f86;
      --accent: #0d9488;
      --accent-dark: #0b766d;
      --danger: #b91c1c;
      --warning: #92400e;
      --ring: rgba(13, 148, 136, 0.2);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Segoe UI", Tahoma, sans-serif;
      color: var(--text);
      background: radial-gradient(circle at top, #dff6f4 0%, var(--bg) 45%, #eef2f7 100%);
      padding: 24px;
    }}
    .card {{
      width: min(540px, 100%);
      background: var(--surface);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(16, 32, 58, 0.16);
      border: 1px solid #d9e5f2;
    }}
    h1 {{ margin: 0; font-size: 1.35rem; }}
    .sub {{ color: var(--muted); margin: 8px 0 20px; }}
    .meta {{ background: #f7fafc; border: 1px solid #e4edf5; border-radius: 12px; padding: 12px; margin-bottom: 18px; line-height: 1.7; }}
    label {{ display: block; font-weight: 600; margin-bottom: 6px; }}
    input {{ width: 100%; border: 1px solid #c5d5e7; border-radius: 10px; padding: 12px; font-size: 0.98rem; margin-bottom: 12px; outline: none; transition: border .2s, box-shadow .2s; }}
    input:focus {{ border-color: var(--accent); box-shadow: 0 0 0 4px var(--ring); }}
    .row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .pay {{ width: 100%; border: 0; border-radius: 12px; padding: 13px; font-weight: 700; color: #fff; background: linear-gradient(120deg, var(--accent), var(--accent-dark)); cursor: pointer; margin-top: 4px; }}
    .testmode {{ margin-top: 14px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: 10px; padding: 10px; font-size: 0.9rem; }}
    .cards {{ margin-top: 16px; font-size: 0.89rem; color: var(--muted); line-height: 1.65; }}
    .cards code {{ font-family: Consolas, monospace; color: #1f3a68; }}
    .banner {{ border-radius: 10px; padding: 10px; margin-bottom: 14px; font-size: 0.92rem; }}
    .ok {{ background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }}
    .err {{ background: #fef2f2; color: var(--danger); border: 1px solid #fecaca; }}
    .warn {{ background: #fffbeb; color: var(--warning); border: 1px solid #fde68a; }}
  </style>
</head>
<body>
  <main class='card'>
    <h1>NestFind Test Payment</h1>
    <p class='sub'>Secure Demo Checkout</p>
    {result_message}
    <section class='meta'>
      <div><strong>Amount:</strong> INR {amount}</div>
      <div><strong>For:</strong> {context_label}</div>
      <div><strong>Reference:</strong> {reference_label}</div>
      <div><strong>Intent:</strong> {intent_id}</div>
    </section>

    <form method='post' action='/payments/mock-checkout/{intent_id}/process'>
      <label>Card Number</label>
      <input type='text' name='card_number' value='4111 1111 1111 1111' required />

      <div class='row'>
        <div>
          <label>MM/YY</label>
          <input type='text' name='expiry' value='12/30' required />
        </div>
        <div>
          <label>CVV</label>
          <input type='password' name='cvv' value='123' required />
        </div>
      </div>

      <label>OTP (only for 3DS test card)</label>
      <input type='text' name='otp' placeholder='123456' />

      <button class='pay' type='submit'>PAY INR {amount}</button>
    </form>

    <div class='testmode'>TEST MODE only. Never use real card or bank details.</div>

    <div class='cards'>
      <div>Success: <code>4111 1111 1111 1111</code></div>
      <div>Decline: <code>4000 0000 0000 0002</code></div>
      <div>3DS/OTP: <code>4000 0000 0000 3220</code> (OTP: <code>123456</code>)</div>
      <div>Network Error: <code>4000 0000 0000 9995</code></div>
      <div>Fraud Blocked: <code>4100 0000 0000 0019</code></div>
    </div>
  </main>
</body>
</html>
"""

    async def _dispatch_mock_webhook(self, payload: Dict[str, Any], signature: str, first_delay_ms: int = 0) -> None:
        if first_delay_ms > 0:
            await asyncio.sleep(first_delay_ms / 1000)

        _, provider, _ = await self.provider_factory.get_provider("MOCK")
        assert isinstance(provider, MockPaymentProvider)
        max_retries = provider.get_webhook_retry_count()
        delays = provider.get_webhook_retry_delays_ms()

        for attempt in range(max_retries):
            try:
                result = await self.process_webhook("MOCK", payload, signature)
                if result.get("success"):
                    return
            except Exception:
                pass

            if attempt < max_retries - 1:
                delay_ms = delays[attempt] if attempt < len(delays) else delays[-1]
                await asyncio.sleep(delay_ms / 1000)

    async def _transition_intent(
        self,
        conn: asyncpg.Connection,
        intent: asyncpg.Record,
        to_status: str,
        actor_id: Optional[UUID],
        actor_type: str,
        metadata: Optional[Dict[str, Any]],
    ) -> Optional[asyncpg.Record]:
        from_status = intent["status"]
        if to_status == from_status:
            return intent

        allowed = INTENT_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            return None

        update_fields = ["status = $2::payment_intent_status"]
        params: List[Any] = [intent["id"], to_status]
        idx = 3

        if to_status == "CHECKOUT_INITIATED":
            update_fields.append(f"checkout_initiated_at = COALESCE(checkout_initiated_at, ${idx})")
            params.append(datetime.now(timezone.utc))
            idx += 1
        elif to_status == "AUTHORIZED":
            update_fields.append(f"authorized_at = COALESCE(authorized_at, ${idx})")
            params.append(datetime.now(timezone.utc))
            idx += 1
        elif to_status == "CAPTURED":
            update_fields.append(f"captured_at = COALESCE(captured_at, ${idx})")
            params.append(datetime.now(timezone.utc))
            idx += 1
        elif to_status == "SETTLED":
            update_fields.append(f"settled_at = COALESCE(settled_at, ${idx})")
            params.append(datetime.now(timezone.utc))
            idx += 1
        elif to_status == "FAILED":
            now = datetime.now(timezone.utc)
            update_fields.append(f"failed_at = COALESCE(failed_at, ${idx})")
            params.append(now)
            idx += 1
            failure_code = (metadata or {}).get("failure_code")
            failure_message = (metadata or {}).get("failure_message")
            update_fields.append(f"failure_code = COALESCE(${idx}, failure_code)")
            params.append(failure_code)
            idx += 1
            update_fields.append(f"failure_message = COALESCE(${idx}, failure_message)")
            params.append(failure_message)
            idx += 1
        elif to_status in {"TIMED_OUT", "EXPIRED", "AUTHORIZATION_EXPIRED"}:
            now = datetime.now(timezone.utc)
            update_fields.append(f"expired_at = COALESCE(expired_at, ${idx})")
            params.append(now)
            idx += 1

        set_clause = ", ".join(update_fields)
        params.append(intent["id"])
        updated = await conn.fetchrow(
            f"""
            UPDATE payment_intents
            SET {set_clause}
            WHERE id = ${idx}
            RETURNING *
            """,
            *params,
        )

        await self.events.log_event(
            intent_id=intent["id"],
            event_type="PAYMENT_STATE_CHANGED",
            from_status=from_status,
            to_status=to_status,
            actor_id=actor_id,
            actor_type=actor_type,
            metadata=metadata or {},
            conn=conn,
        )
        return updated
    async def _insert_payment_transaction(
        self,
        conn: asyncpg.Connection,
        intent_id: UUID,
        transaction_type: str,
        amount: Decimal,
        direction: str,
        provider_txn_id: Optional[str],
        status: str,
        provider_response: Dict[str, Any],
    ) -> None:
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
            VALUES ($1, $2::payment_transaction_type, $3, $4::payment_direction, $5, $6::jsonb, $7::payment_txn_status)
            """,
            intent_id,
            transaction_type,
            amount,
            direction,
            provider_txn_id,
            json.dumps(provider_response or {}),
            status,
        )

    async def _run_post_capture_hooks(self, intent_id: UUID) -> None:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return

        try:
            if intent["intent_type"] == "RESERVATION" and intent["reference_type"] == "reservation":
                from ..reservation_service import ReservationService

                reservation_service = ReservationService(self.db)
                await reservation_service.activate_reservation_after_payment(
                    reservation_id=intent["reference_id"],
                    payment_intent_id=intent["id"],
                    payment_reference=intent["provider_payment_id"],
                    payment_method=intent["provider"],
                )
            elif intent["intent_type"] == "COMMISSION" and intent["reference_type"] == "transaction":
                from ..transaction_service import TransactionService

                transaction_service = TransactionService(self.db)
                await transaction_service.mark_commission_paid_from_intent(
                    transaction_id=intent["reference_id"],
                    payment_intent_id=intent["id"],
                    provider_payment_id=intent["provider_payment_id"],
                )
            elif intent["intent_type"] == "ESCROW" and intent["reference_type"] == "escrow_disbursement":
                from ..title_escrow_engine import EscrowService

                escrow_svc = EscrowService(self.db)
                await escrow_svc.mark_disbursed(
                    disbursement_id=intent["reference_id"],
                    payment_intent_id=intent["id"],
                )
        except Exception:
            return

    async def _run_expiry_hooks(self, intent_id: UUID) -> None:
        async with self.db.acquire() as conn:
            intent = await conn.fetchrow("SELECT * FROM payment_intents WHERE id = $1", intent_id)
            if not intent:
                return

        try:
            if intent["intent_type"] == "RESERVATION" and intent["reference_type"] == "reservation":
                from ..reservation_service import ReservationService

                reservation_service = ReservationService(self.db)
                await reservation_service.expire_reservation_for_payment_timeout(intent["reference_id"])
        except Exception:
            return

    def _merge_provider_response(self, current: Any, incoming: Dict[str, Any]) -> Dict[str, Any]:
        existing: Dict[str, Any]
        if isinstance(current, str):
            try:
                existing = json.loads(current)
            except json.JSONDecodeError:
                existing = {}
        else:
            existing = current or {}
        merged = dict(existing)
        merged.update(incoming or {})
        return merged

    def _to_aware(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    def _format_intent(self, row: asyncpg.Record) -> Dict[str, Any]:
        provider_response = row["provider_response"]
        if isinstance(provider_response, str):
            try:
                provider_response = json.loads(provider_response)
            except json.JSONDecodeError:
                provider_response = {}
        return {
            "id": str(row["id"]),
            "intent_type": row["intent_type"],
            "reference_id": str(row["reference_id"]),
            "reference_type": row["reference_type"],
            "amount": float(row["amount"]),
            "currency": row["currency"],
            "payer_id": str(row["payer_id"]),
            "provider": row["provider"],
            "provider_order_id": row["provider_order_id"],
            "provider_payment_id": row["provider_payment_id"],
            "checkout_url": row["checkout_url"],
            "status": row["status"],
            "expires_at": row["expires_at"].isoformat() if row["expires_at"] else None,
            "checkout_initiated_at": row["checkout_initiated_at"].isoformat() if row["checkout_initiated_at"] else None,
            "authorized_at": row["authorized_at"].isoformat() if row["authorized_at"] else None,
            "captured_at": row["captured_at"].isoformat() if row["captured_at"] else None,
            "settled_at": row["settled_at"].isoformat() if row["settled_at"] else None,
            "failed_at": row["failed_at"].isoformat() if row["failed_at"] else None,
            "expired_at": row["expired_at"].isoformat() if row["expired_at"] else None,
            "failure_code": row["failure_code"],
            "failure_message": row["failure_message"],
            "provider_response": provider_response or {},
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }

    def _format_refund(self, row: asyncpg.Record) -> Dict[str, Any]:
        provider_response = row["provider_response"]
        if isinstance(provider_response, str):
            try:
                provider_response = json.loads(provider_response)
            except json.JSONDecodeError:
                provider_response = {}
        return {
            "id": str(row["id"]),
            "intent_id": str(row["intent_id"]),
            "amount": float(row["amount"]),
            "reason": row["reason"],
            "status": row["status"],
            "provider_refund_id": row["provider_refund_id"],
            "provider_response": provider_response or {},
            "requested_by": str(row["requested_by"]),
            "approved_by": str(row["approved_by"]) if row["approved_by"] else None,
            "requested_at": row["requested_at"].isoformat() if row["requested_at"] else None,
            "processed_at": row["processed_at"].isoformat() if row["processed_at"] else None,
            "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            "failed_at": row["failed_at"].isoformat() if row["failed_at"] else None,
        }
