"""
Developer Portal: Token Deadline Expiry Job.

Runs every 15 minutes. Finds deals in AWAITING_TOKEN stage
past their 48-hour token deadline and automatically cancels them.
Unit reverts to AVAILABLE.
"""
import logging

logger = logging.getLogger(__name__)


async def expire_developer_token_deadlines(db_pool):
    """Cancel dev portal deals where token payment deadline has expired."""
    try:
        from ..services.developer_deal_service import DeveloperDealService
        service = DeveloperDealService(db_pool)
        result = await service.expire_token_deadlines()
        if result["success"] and result["expired_count"] > 0:
            logger.info(
                f"[dev_token_deadline_job] Expired {result['expired_count']} deal(s) — units reverted to AVAILABLE"
            )
    except Exception as e:
        logger.error(f"[dev_token_deadline_job] Error: {e}")
