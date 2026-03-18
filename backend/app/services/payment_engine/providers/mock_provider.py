from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

from .base import (
    OrderResult,
    PaymentProvider,
    RefundResult,
    StatusResult,
    VerificationResult,
    WebhookEvent,
)


class MockPaymentProvider(PaymentProvider):
    """Offline, deterministic payment simulator for demos and local development."""

    DEFAULT_WEBHOOK_SECRET = "nestfind_mock_webhook_secret_do_not_use_in_production"
    DEFAULT_OTP = "123456"

    TEST_CARD_SCENARIOS: Dict[str, str] = {
        "4111111111111111": "SUCCESS",
        "4000000000000002": "INSUFFICIENT",
        "4000000000003220": "3DS_REQUIRED",
        "4000000000009995": "NETWORK_ERROR",
        "4100000000000019": "FRAUD_BLOCKED",
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    @property
    def name(self) -> str:
        return "MOCK"

    def get_processing_delay_ms(self) -> int:
        return int(self.config.get("processing_delay_ms", 2000))

    def get_webhook_secret(self) -> str:
        return str(self.config.get("webhook_secret") or self.DEFAULT_WEBHOOK_SECRET)

    def get_webhook_retry_count(self) -> int:
        return int(self.config.get("webhook_retry_count", 3))

    def get_webhook_retry_delays_ms(self) -> list[int]:
        delays = self.config.get("webhook_retry_delay_ms") or [1000, 4000, 16000]
        return [int(delay) for delay in delays]

    def get_test_otp(self) -> str:
        return str(self.config.get("test_otp") or self.DEFAULT_OTP)

    def _normalize_card(self, card_number: str) -> str:
        return "".join(ch for ch in (card_number or "") if ch.isdigit())

    def resolve_scenario_for_card(self, card_number: str) -> str:
        normalized = self._normalize_card(card_number)
        configured_cards = self.config.get("test_cards") or {}
        if normalized in configured_cards:
            return str(configured_cards[normalized]).upper()
        if normalized in self.TEST_CARD_SCENARIOS:
            return self.TEST_CARD_SCENARIOS[normalized]
        return str(self.config.get("default_scenario", "SUCCESS")).upper()

    def requires_otp(self, scenario: str) -> bool:
        return scenario.upper() == "3DS_REQUIRED"

    def validate_otp(self, otp: Optional[str]) -> bool:
        return str(otp or "") == self.get_test_otp()

    async def create_order(
        self,
        amount: Decimal,
        currency: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderResult:
        if amount <= Decimal("0"):
            raise ValueError("Amount must be greater than zero")

        delay_seconds = self.get_processing_delay_ms() / 1000
        if delay_seconds > 0:
            await asyncio.sleep(min(delay_seconds, 2))

        order_id = f"intent_{uuid.uuid4().hex}"
        provider_order_id = f"mock_order_{uuid.uuid4().hex[:14]}"

        return OrderResult(
            order_id=order_id,
            provider_order_id=provider_order_id,
            checkout_url="",
            status="created",
            raw_response={
                "provider": self.name,
                "amount": str(amount),
                "currency": currency,
                "metadata": metadata or {},
            },
        )

    def build_provider_payment_id(self, scenario: str, amount: Decimal) -> str:
        minor_units = int((amount * Decimal("100")).quantize(Decimal("1")))
        return f"mockpay_{scenario.lower()}_{minor_units}_{uuid.uuid4().hex[:10]}"

    def scenario_from_payment_id(self, provider_payment_id: str) -> str:
        parts = (provider_payment_id or "").split("_")
        if len(parts) >= 2 and parts[0] == "mockpay":
            return parts[1].upper()
        return str(self.config.get("default_scenario", "SUCCESS")).upper()

    def amount_from_payment_id(self, provider_payment_id: str) -> Decimal:
        parts = (provider_payment_id or "").split("_")
        if len(parts) >= 3 and parts[2].isdigit():
            return (Decimal(parts[2]) / Decimal("100")).quantize(Decimal("0.01"))
        return Decimal("0.00")

    async def verify_payment(
        self,
        provider_payment_id: str,
        provider_order_id: Optional[str] = None,
    ) -> VerificationResult:
        scenario = self.scenario_from_payment_id(provider_payment_id)
        amount = self.amount_from_payment_id(provider_payment_id)

        if scenario in {"ALWAYS", "ALWAYS_FAIL", "FAILED", "INSUFFICIENT", "FRAUD", "FRAUD_BLOCKED"}:
            return VerificationResult(
                verified=False,
                amount=amount,
                currency="INR",
                status="failed",
                provider_payment_id=provider_payment_id,
                raw_response={"scenario": scenario, "failure_code": "payment_declined"},
            )

        if scenario in {"NETWORK", "NETWORK_ERROR", "TIMEOUT"}:
            return VerificationResult(
                verified=False,
                amount=amount,
                currency="INR",
                status="timed_out",
                provider_payment_id=provider_payment_id,
                raw_response={"scenario": scenario, "failure_code": "gateway_timeout"},
            )

        if scenario in {"PARTIAL", "PARTIAL_CAPTURE"}:
            captured = (amount * Decimal("0.80")).quantize(Decimal("0.01"))
            return VerificationResult(
                verified=True,
                amount=captured,
                currency="INR",
                status="captured",
                provider_payment_id=provider_payment_id,
                raw_response={"scenario": "PARTIAL_CAPTURE", "captured_percent": 80},
            )

        return VerificationResult(
            verified=True,
            amount=amount,
            currency="INR",
            status="captured",
            provider_payment_id=provider_payment_id,
            raw_response={"scenario": scenario or "SUCCESS"},
        )

    async def process_refund(
        self,
        provider_payment_id: str,
        amount: Decimal,
        reason: str,
    ) -> RefundResult:
        default_scenario = str(self.config.get("default_scenario", "SUCCESS")).upper()
        payment_scenario = self.scenario_from_payment_id(provider_payment_id)

        if default_scenario == "REFUND_FAIL" or payment_scenario == "REFUND_FAIL":
            return RefundResult(
                refund_id=None,
                status="failed",
                amount_refunded=Decimal("0.00"),
                raw_response={"error": "refund_failed", "reason": reason},
            )

        return RefundResult(
            refund_id=f"mock_refund_{uuid.uuid4().hex[:12]}",
            status="completed",
            amount_refunded=amount.quantize(Decimal("0.01")),
            raw_response={"reason": reason},
        )

    async def get_payment_status(self, provider_payment_id: str) -> StatusResult:
        scenario = self.scenario_from_payment_id(provider_payment_id)
        if scenario in {"ALWAYS_FAIL", "INSUFFICIENT", "FRAUD_BLOCKED"}:
            status = "failed"
        elif scenario in {"NETWORK_ERROR", "TIMEOUT"}:
            status = "timed_out"
        else:
            status = "captured"

        return StatusResult(
            status=status,
            amount=self.amount_from_payment_id(provider_payment_id),
            captured_at=None,
            metadata={"scenario": scenario},
        )

    def sign_webhook_payload(self, payload: Dict[str, Any], secret: Optional[str] = None) -> str:
        material = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        digest = hmac.new((secret or self.get_webhook_secret()).encode("utf-8"), material, hashlib.sha256).hexdigest()
        return f"sha256={digest}"

    def verify_webhook_signature(
        self,
        payload: Dict[str, Any],
        signature: Optional[str],
        secret: str,
    ) -> bool:
        if not signature:
            return False

        expected = self.sign_webhook_payload(payload, secret)
        given = signature if signature.startswith("sha256=") else f"sha256={signature}"
        return hmac.compare_digest(expected, given)

    def parse_webhook_event(self, payload: Dict[str, Any]) -> WebhookEvent:
        amount = Decimal(str(payload.get("amount", "0"))).quantize(Decimal("0.01"))
        return WebhookEvent(
            event_type=str(payload.get("event_type") or "payment.unknown"),
            payment_id=payload.get("payment_id"),
            order_id=payload.get("order_id"),
            status=str(payload.get("status") or "failed").lower(),
            amount=amount,
            raw=payload,
        )
