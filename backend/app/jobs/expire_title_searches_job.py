"""
Background job: Expire stale title searches.
Finds PENDING_SEARCH records older than 30 days → transitions to EXPIRED.
Schedule: Daily at 02:30 AM
"""
import logging

import asyncpg

from app.services.title_escrow_engine import TitleSearchService

logger = logging.getLogger(__name__)


async def expire_stale_title_searches(db_pool: asyncpg.Pool) -> None:
    """Transition PENDING_SEARCH → EXPIRED for searches not started within 30 days."""
    try:
        svc = TitleSearchService(db_pool)
        result = await svc.expire_stale_searches()
        expired = result.get("expired_count", 0)
        if expired:
            logger.info(f"[expire_title_searches] Expired {expired} stale title search(es).")
        else:
            logger.debug("[expire_title_searches] No stale title searches to expire.")
    except Exception as e:
        logger.error(f"[expire_title_searches] Job failed: {e}")
