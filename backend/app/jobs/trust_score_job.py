"""
Trust Score Recomputation Job — Nightly batch recomputation.

Runs daily at 03:00 AM to recompute all property and agent trust scores.
"""
import logging
import asyncpg

logger = logging.getLogger(__name__)


async def recompute_all_trust_scores(db_pool: asyncpg.Pool) -> None:
    """
    Nightly job: recompute all property trust scores and all agent scores.

    Batch size of 50 to avoid memory spikes on large datasets.
    Errors are caught per-entity so one failure doesn't stop the batch.
    """
    logger.info("[TrustScoreJob] Starting nightly trust score recomputation...")

    from ..services.trust_fraud_engine import TrustScoreService, AgentScoreService

    trust_svc = TrustScoreService(db_pool)
    agent_svc = AgentScoreService(db_pool)

    # ─── Properties ──────────────────────────────────────────────────────────
    try:
        async with db_pool.acquire() as conn:
            property_ids = [
                r["id"] for r in await conn.fetch(
                    """
                    SELECT id FROM properties
                    WHERE status NOT IN ('DELETED')
                      AND deleted_at IS NULL
                    ORDER BY id
                    """
                )
            ]

        BATCH_SIZE = 50
        total_props = len(property_ids)
        prop_success = 0
        prop_failed = 0

        for i in range(0, total_props, BATCH_SIZE):
            batch = property_ids[i: i + BATCH_SIZE]
            results = await trust_svc.batch_recompute(batch)
            prop_success += results.get("success", 0)
            prop_failed  += results.get("failed", 0)

        logger.info(
            f"[TrustScoreJob] Properties: {prop_success}/{total_props} recomputed "
            f"({prop_failed} failed)"
        )
    except Exception as e:
        logger.error(f"[TrustScoreJob] Property recomputation batch failed: {e}")

    # ─── Agents ──────────────────────────────────────────────────────────────
    try:
        async with db_pool.acquire() as conn:
            agent_ids = [
                r["agent_id"] for r in await conn.fetch(
                    """
                    SELECT avs.agent_id
                    FROM agent_verification_scores avs
                    JOIN users u ON u.id = avs.agent_id
                    WHERE u.status = 'ACTIVE'
                    ORDER BY avs.agent_id
                    """
                )
            ]

        total_agents = len(agent_ids)
        agent_success = 0
        agent_failed = 0

        for i in range(0, total_agents, BATCH_SIZE):
            batch = agent_ids[i: i + BATCH_SIZE]
            results = await agent_svc.batch_recompute(batch)
            agent_success += results.get("success", 0)
            agent_failed  += results.get("failed", 0)

        logger.info(
            f"[TrustScoreJob] Agents: {agent_success}/{total_agents} recomputed "
            f"({agent_failed} failed)"
        )
    except Exception as e:
        logger.error(f"[TrustScoreJob] Agent recomputation batch failed: {e}")

    logger.info("[TrustScoreJob] Nightly recomputation complete.")
