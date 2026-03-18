from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, Optional


@dataclass
class OrderResult:
    order_id: str
    provider_order_id: str
    checkout_url: str
    status: str
    raw_response: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VerificationResult:
    verified: bool
    amount: Decimal
    currency: str
    status: str
    provider_payment_id: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RefundResult:
    refund_id: Optional[str]
    status: str
    amount_refunded: Decimal
    raw_response: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StatusResult:
    status: str
    amount: Decimal
    captured_at: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookEvent:
    event_type: str
    payment_id: Optional[str]
    order_id: Optional[str]
    status: str
    amount: Decimal
    raw: Dict[str, Any] = field(default_factory=dict)


class PaymentProvider(ABC):
    """Provider contract for all payment backends."""

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    async def create_order(
        self,
        amount: Decimal,
        currency: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrderResult:
        raise NotImplementedError

    @abstractmethod
    async def verify_payment(
        self,
        provider_payment_id: str,
        provider_order_id: Optional[str] = None,
    ) -> VerificationResult:
        raise NotImplementedError

    @abstractmethod
    async def process_refund(
        self,
        provider_payment_id: str,
        amount: Decimal,
        reason: str,
    ) -> RefundResult:
        raise NotImplementedError

    @abstractmethod
    async def get_payment_status(self, provider_payment_id: str) -> StatusResult:
        raise NotImplementedError

    @abstractmethod
    def verify_webhook_signature(
        self,
        payload: Dict[str, Any],
        signature: Optional[str],
        secret: str,
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    def parse_webhook_event(self, payload: Dict[str, Any]) -> WebhookEvent:
        raise NotImplementedError
