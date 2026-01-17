from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import uuid
import asyncio

class PaymentProvider(ABC):
    """Abstract Base Class for Payment Providers (e.g., Stripe, Razorpay)."""

    @abstractmethod
    async def create_payment_intent(self, amount: float, currency: str = "INR", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Creates a payment intent/order at the provider."""
        pass

    @abstractmethod
    async def verify_payment(self, payment_id: str, signature: Optional[str] = None) -> bool:
        """Verifies a payment was successful."""
        pass

    @abstractmethod
    async def refund_payment(self, payment_id: str, reason: Optional[str] = None) -> bool:
        """Refunds a payment."""
        pass


class MockPaymentProvider(PaymentProvider):
    """
    Mock implementation for development/testing.
    Simulates network latency and always returns success unless amount is 0.
    """

    async def create_payment_intent(self, amount: float, currency: str = "INR", metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        await asyncio.sleep(0.5)  # Simulate API latency
        
        if amount <= 0:
             raise ValueError("Amount must be positive")

        return {
            "success": True,
            "id": f"pay_{uuid.uuid4().hex[:12]}",
            "amount": amount,
            "currency": currency,
            "status": "created",
            "client_secret": f"mock_secret_{uuid.uuid4().hex[:8]}",
            "provider": "mock"
        }

    async def verify_payment(self, payment_id: str, signature: Optional[str] = None) -> bool:
        await asyncio.sleep(0.3)
        # In mock mode, any payment_id starting with 'pay_' is considered valid
        if payment_id and payment_id.startswith("pay_"):
            return True
        return False

    async def refund_payment(self, payment_id: str, reason: Optional[str] = None) -> bool:
        await asyncio.sleep(0.5)
        return True

def get_payment_provider() -> PaymentProvider:
    """Factory to get the configured payment provider."""
    # In future, read from env to switch between Mock, Stripe, etc.
    return MockPaymentProvider()
