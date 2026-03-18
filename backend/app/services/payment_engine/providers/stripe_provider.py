from __future__ import annotations

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


class StripePaymentProvider(PaymentProvider):
    """Future production provider placeholder."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    @property
    def name(self) -> str:
        return "STRIPE"

    async def create_order(self, amount: Decimal, currency: str, metadata: Optional[Dict[str, Any]] = None) -> OrderResult:
        raise NotImplementedError("Stripe provider is not implemented yet")

    async def verify_payment(self, provider_payment_id: str, provider_order_id: Optional[str] = None) -> VerificationResult:
        raise NotImplementedError("Stripe provider is not implemented yet")

    async def process_refund(self, provider_payment_id: str, amount: Decimal, reason: str) -> RefundResult:
        raise NotImplementedError("Stripe provider is not implemented yet")

    async def get_payment_status(self, provider_payment_id: str) -> StatusResult:
        raise NotImplementedError("Stripe provider is not implemented yet")

    def verify_webhook_signature(self, payload: Dict[str, Any], signature: Optional[str], secret: str) -> bool:
        raise NotImplementedError("Stripe provider is not implemented yet")

    def parse_webhook_event(self, payload: Dict[str, Any]) -> WebhookEvent:
        raise NotImplementedError("Stripe provider is not implemented yet")
