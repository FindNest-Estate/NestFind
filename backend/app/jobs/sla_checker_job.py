"""
SLA Checker Background Job

Runs every 2 hours via APScheduler.
Scans all active deals against SLA thresholds and records breaches.

NEVER mutates deal state. Read + Insert only.
"""
import asyncpg
import logging

logger = logging.getLogger(__name__)


async def check_deal_slas(db_pool: asyncpg.Pool):
    """
    Periodic SLA check for all active deals.
    
    Called by APScheduler every 2 hours.
    """
    try:
        from app.services.sla_service import SLAService
        
        service = SLAService(db_pool)
        result = await service.check_deal_slas()
        
        if result['success']:
            total = (
                result.get('warnings_created', 0) +
                result.get('escalations_created', 0)
            )
            if total > 0:
                logger.info(
                    f"SLA check: {result['warnings_created']} warnings, "
                    f"{result['escalations_created']} escalations, "
                    f"{result['intents_created']} intents, "
                    f"{result['auto_resolved']} auto-resolved"
                )
            else:
                logger.debug("SLA check: no new breaches detected")
        else:
            logger.warning(f"SLA check returned non-success: {result}")
            
    except Exception as e:
        logger.error(f"Error in SLA checker job: {e}")
        # Don't re-raise - allow scheduler to continue
