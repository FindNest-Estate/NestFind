"""
Scheduled Jobs Scheduler Configuration

Manages background jobs using APScheduler.
Jobs run on a schedule to maintain data integrity.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from .offer_expiry_job import expire_stale_offers
from .otp_cleanup_job import cleanup_expired_otps
from .reservation_expiry_job import release_expired_reservations

logger = logging.getLogger(__name__)

# Create scheduler instance
scheduler = AsyncIOScheduler()


def init_scheduler(db_pool):
    """
    Initialize and configure all scheduled jobs.
    
    Jobs:
    - Offer Expiry: Every hour
    - OTP Cleanup: Every 5 minutes
    - Reservation Expiry: Every hour
    """
    
    # Job 1: Expire stale offers (every hour)
    scheduler.add_job(
        func=lambda: expire_stale_offers(db_pool),
        trigger=IntervalTrigger(hours=1),
        id='expire_offers',
        name='Expire Stale Offers',
        replace_existing=True
    )
    logger.info("Scheduled job: expire_offers (every 1 hour)")
    
    # Job 2: Cleanup expired OTPs (every 5 minutes)
    scheduler.add_job(
        func=lambda: cleanup_expired_otps(db_pool),
        trigger=IntervalTrigger(minutes=5),
        id='cleanup_otps',
        name='Cleanup Expired OTPs',
        replace_existing=True
    )
    logger.info("Scheduled job: cleanup_otps (every 5 minutes)")
    
    # Job 3: Release expired reservations (every hour)
    scheduler.add_job(
        func=lambda: release_expired_reservations(db_pool),
        trigger=IntervalTrigger(hours=1),
        id='release_reservations',
        name='Release Expired Reservations',
        replace_existing=True
    )
    logger.info("Scheduled job: release_reservations (every 1 hour)")
    
    logger.info("All scheduled jobs configured successfully")


def start_scheduler():
    """Start the scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down")
