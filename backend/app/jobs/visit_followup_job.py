"""
Post-Visit Follow-Up Notification Job

Sends automated reminders to buyers and agents after visit completion:
- 2h after: Feedback reminders
- 24h after: Offer nudges for high-interest buyers

Runs every hour via APScheduler.
"""
import logging
from ..services.visit_followup_service import VisitFollowUpService

logger = logging.getLogger(__name__)


async def send_post_visit_followups(db_pool):
    """Background job to send post-visit follow-up notifications."""
    try:
        service = VisitFollowUpService(db_pool)
        result = await service.send_post_visit_reminders()
        
        if result['notifications_sent'] > 0:
            logger.info(
                f"[FOLLOWUP JOB] Sent {result['notifications_sent']} post-visit notifications"
            )
    except Exception as e:
        logger.error(f"[FOLLOWUP JOB] Error: {str(e)}")
