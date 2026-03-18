"""Payment webhook retry scheduler job."""

import asyncpg
import logging

from ..services.payment_engine.webhook_service import WebhookService

logger = logging.getLogger(__name__)


async def retry_failed_webhooks(db_pool: asyncpg.Pool):
    try:
        service = WebhookService(db_pool)
        result = await service.retry_failed_webhooks()
        logger.info(
            "Webhook retry job executed: retried=%s, succeeded=%s, failed=%s",
            result.get("retried", 0),
            result.get("succeeded", 0),
            result.get("failed", 0),
        )
    except Exception as exc:
        logger.error("Webhook retry job failed: %s", exc)
