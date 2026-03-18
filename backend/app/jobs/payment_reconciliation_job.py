"""Daily payment reconciliation scheduler job."""

import asyncpg
import logging
from datetime import date

from ..services.payment_engine.reconciliation_service import ReconciliationService

logger = logging.getLogger(__name__)


async def run_daily_payment_reconciliation(db_pool: asyncpg.Pool):
    try:
        service = ReconciliationService(db_pool)
        target_date = date.today()
        result = await service.run_daily_reconciliation(target_date=target_date)
        logger.info("Daily reconciliation job executed for %s", result.get("report_date"))
    except Exception as exc:
        logger.error("Daily reconciliation job failed: %s", exc)
