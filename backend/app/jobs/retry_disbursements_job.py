"""
Background job: Retry failed escrow disbursements.
Finds FAILED disbursements with retry_count < 3 → triggers retry via EscrowService.
Schedule: Every 6 hours
"""
import logging
from uuid import UUID

import asyncpg

logger = logging.getLogger(__name__)


async def retry_failed_disbursements(db_pool: asyncpg.Pool) -> None:
    """Auto-retry FAILED disbursements (max 3 attempts)."""
    try:
        async with db_pool.acquire() as conn:
            candidates = await conn.fetch(
                """
                SELECT id FROM escrow_disbursements
                WHERE status = 'FAILED'
                  AND retry_count < 3
                ORDER BY created_at ASC
                """
            )

        if not candidates:
            logger.debug("[retry_disbursements] No failed disbursements eligible for retry.")
            return

        from app.services.title_escrow_engine import EscrowService

        # Use a system admin UUID for retry — in production this would be a service account
        # For now we pass None and handle it in the service
        svc = EscrowService(db_pool)

        retried = 0
        failed = 0
        for row in candidates:
            disbursement_id = row["id"]
            try:
                # Re-process directly (retry_count already < 3, just process again)
                async with db_pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE escrow_disbursements SET retry_count = retry_count + 1 WHERE id = $1",
                        disbursement_id,
                    )
                    # Transition FAILED → APPROVED first for process_disbursement
                    await conn.execute(
                        "UPDATE escrow_disbursements SET status = 'APPROVED' WHERE id = $1 AND status = 'FAILED'",
                        disbursement_id,
                    )

                result = await svc.process_disbursement(disbursement_id)
                if result.get("success"):
                    retried += 1
                    logger.info(
                        f"[retry_disbursements] Retried disbursement {disbursement_id} successfully."
                    )
                else:
                    failed += 1
                    logger.warning(
                        f"[retry_disbursements] Retry failed for {disbursement_id}: {result.get('error')}"
                    )
            except Exception as e:
                failed += 1
                logger.error(f"[retry_disbursements] Error retrying {disbursement_id}: {e}")

        logger.info(
            f"[retry_disbursements] Retry run complete. Retried: {retried}, Failed: {failed}"
        )

    except Exception as e:
        logger.error(f"[retry_disbursements] Job failed: {e}")
