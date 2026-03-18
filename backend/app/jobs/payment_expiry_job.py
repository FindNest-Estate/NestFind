"""Payment intent expiry scheduler job."""

import asyncpg
import logging

from ..services.payment_engine.payment_service import PaymentService

logger = logging.getLogger(__name__)


async def expire_stale_payment_intents(db_pool: asyncpg.Pool):
    try:
        service = PaymentService(db_pool)
        result = await service.expire_stale_payment_intents()
        logger.info(
            "Payment expiry job executed: expired_count=%s",
            result.get("expired_count", 0),
        )
    except Exception as exc:
        logger.error("Payment expiry job failed: %s", exc)
