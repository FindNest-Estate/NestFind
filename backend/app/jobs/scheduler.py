"""
Scheduled Jobs Scheduler Configuration.

Manages background jobs using APScheduler.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

from .offer_expiry_job import expire_stale_offers
from .otp_cleanup_job import cleanup_expired_otps
from .reservation_expiry_job import release_expired_reservations
from .sla_checker_job import check_deal_slas
from .visit_followup_job import send_post_visit_followups
from .payment_expiry_job import expire_stale_payment_intents
from .payment_webhook_retry_job import retry_failed_webhooks
from .payment_reconciliation_job import run_daily_payment_reconciliation
from .trust_score_job import recompute_all_trust_scores
from .price_anomaly_sweep_job import sweep_price_anomalies
from .expire_title_searches_job import expire_stale_title_searches
from .retry_disbursements_job import retry_failed_disbursements

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def init_scheduler(db_pool):
    """Initialize and configure all scheduled jobs."""

    scheduler.add_job(
        func=expire_stale_offers,
        args=[db_pool],
        trigger=IntervalTrigger(hours=1),
        id="expire_offers",
        name="Expire Stale Offers",
        replace_existing=True,
    )
    logger.info("Scheduled job: expire_offers (every 1 hour)")

    scheduler.add_job(
        func=cleanup_expired_otps,
        args=[db_pool],
        trigger=IntervalTrigger(minutes=5),
        id="cleanup_otps",
        name="Cleanup Expired OTPs",
        replace_existing=True,
    )
    logger.info("Scheduled job: cleanup_otps (every 5 minutes)")

    scheduler.add_job(
        func=release_expired_reservations,
        args=[db_pool],
        trigger=IntervalTrigger(hours=1),
        id="release_reservations",
        name="Release Expired Reservations",
        replace_existing=True,
    )
    logger.info("Scheduled job: release_reservations (every 1 hour)")

    scheduler.add_job(
        func=check_deal_slas,
        args=[db_pool],
        trigger=IntervalTrigger(hours=2),
        id="check_sla_breaches",
        name="Check Deal SLA Breaches",
        replace_existing=True,
    )
    logger.info("Scheduled job: check_sla_breaches (every 2 hours)")

    scheduler.add_job(
        func=send_post_visit_followups,
        args=[db_pool],
        trigger=IntervalTrigger(hours=1),
        id="visit_followups",
        name="Post-Visit Follow-Up Notifications",
        replace_existing=True,
    )
    logger.info("Scheduled job: visit_followups (every 1 hour)")

    scheduler.add_job(
        func=expire_stale_payment_intents,
        args=[db_pool],
        trigger=IntervalTrigger(minutes=5),
        id="expire_payment_intents",
        name="Expire Stale Payment Intents",
        replace_existing=True,
    )
    logger.info("Scheduled job: expire_payment_intents (every 5 minutes)")

    scheduler.add_job(
        func=retry_failed_webhooks,
        args=[db_pool],
        trigger=IntervalTrigger(minutes=1),
        id="retry_payment_webhooks",
        name="Retry Failed Payment Webhooks",
        replace_existing=True,
    )
    logger.info("Scheduled job: retry_payment_webhooks (every 1 minute)")

    scheduler.add_job(
        func=run_daily_payment_reconciliation,
        args=[db_pool],
        trigger=CronTrigger(hour=2, minute=0),
        id="daily_payment_reconciliation",
        name="Daily Payment Reconciliation",
        replace_existing=True,
    )
    logger.info("Scheduled job: daily_payment_reconciliation (daily at 02:00)")

    scheduler.add_job(
        func=recompute_all_trust_scores,
        args=[db_pool],
        trigger=CronTrigger(hour=3, minute=0),
        id="trust_score_recompute",
        name="Nightly Trust Score Recomputation",
        replace_existing=True,
    )
    logger.info("Scheduled job: trust_score_recompute (daily at 03:00)")

    scheduler.add_job(
        func=sweep_price_anomalies,
        args=[db_pool],
        trigger=CronTrigger(day_of_week="sun", hour=4, minute=0),
        id="price_anomaly_sweep",
        name="Weekly Price Anomaly Sweep",
        replace_existing=True,
    )
    logger.info("Scheduled job: price_anomaly_sweep (Sundays at 04:00)")

    scheduler.add_job(
        func=expire_stale_title_searches,
        args=[db_pool],
        trigger=CronTrigger(hour=2, minute=30),
        id="expire_title_searches",
        name="Expire Stale Title Searches (30-day)",
        replace_existing=True,
    )
    logger.info("Scheduled job: expire_title_searches (daily at 02:30)")

    scheduler.add_job(
        func=retry_failed_disbursements,
        args=[db_pool],
        trigger=IntervalTrigger(hours=6),
        id="retry_failed_disbursements",
        name="Retry Failed Escrow Disbursements",
        replace_existing=True,
    )
    logger.info("Scheduled job: retry_failed_disbursements (every 6 hours)")

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
