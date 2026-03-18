from __future__ import annotations

import json
from typing import Any, Dict, Tuple

import asyncpg

from .providers.base import PaymentProvider
from .providers.mock_provider import MockPaymentProvider
from .providers.razorpay_provider import RazorpayPaymentProvider
from .providers.stripe_provider import StripePaymentProvider


class ProviderFactory:
    """Resolves payment provider instances from DB-backed configuration."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    def _build_provider(self, provider_name: str, config: Dict[str, Any]) -> PaymentProvider:
        provider_upper = (provider_name or "MOCK").upper()
        if provider_upper == "MOCK":
            return MockPaymentProvider(config)
        if provider_upper == "RAZORPAY":
            return RazorpayPaymentProvider(config)
        if provider_upper == "STRIPE":
            return StripePaymentProvider(config)
        return MockPaymentProvider(config)

    async def get_default_provider(self) -> Tuple[str, PaymentProvider, Dict[str, Any]]:
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT provider, config
                FROM provider_configurations
                WHERE is_default = TRUE
                LIMIT 1
                """
            )

        if not row:
            fallback_config: Dict[str, Any] = {
                "default_scenario": "SUCCESS",
                "processing_delay_ms": 2000,
                "webhook_secret": "nestfind_mock_webhook_secret_do_not_use_in_production",
            }
            return "MOCK", MockPaymentProvider(fallback_config), fallback_config

        provider = str(row["provider"]).upper()
        config = row["config"]
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except json.JSONDecodeError:
                config = {}

        provider_instance = self._build_provider(provider, config or {})
        return provider, provider_instance, config or {}

    async def get_provider(self, provider: str) -> Tuple[str, PaymentProvider, Dict[str, Any]]:
        provider_upper = (provider or "").upper()

        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT provider, config
                FROM provider_configurations
                WHERE provider = $1
                LIMIT 1
                """,
                provider_upper,
            )

        if not row:
            if provider_upper == "MOCK":
                config = {
                    "default_scenario": "SUCCESS",
                    "processing_delay_ms": 2000,
                    "webhook_secret": "nestfind_mock_webhook_secret_do_not_use_in_production",
                }
                return "MOCK", MockPaymentProvider(config), config
            raise ValueError(f"Provider configuration not found for {provider_upper}")

        config = row["config"]
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except json.JSONDecodeError:
                config = {}

        provider_name = str(row["provider"]).upper()
        return provider_name, self._build_provider(provider_name, config or {}), config or {}
