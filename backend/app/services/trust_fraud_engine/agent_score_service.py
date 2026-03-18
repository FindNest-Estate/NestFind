"""
Agent Score Service — Agent Reputation Score Computation (0-100).

Computes weighted reputation scores for agents across 4 categories:
  ① Verification Quality  (0-40)
  ② Deal Performance      (0-30)
  ③ Buyer Satisfaction    (0-20)
  ④ Compliance            (0-10)

Final score = clamp(sum of components, 0, 100)
"""
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
import asyncpg

from .trust_score_events_service import TrustScoreEventsService

logger = logging.getLogger(__name__)

# ─── Score label thresholds ───────────────────────────────────────────────────
AGENT_SCORE_LABELS = [
    (90, "STAR_AGENT"),
    (70, "RELIABLE"),
    (50, "AVERAGE"),
    (30, "NEEDS_IMPROVEMENT"),
    (0,  "PROBATION"),
]


def _label(score: int) -> str:
    for threshold, label in AGENT_SCORE_LABELS:
        if score >= threshold:
            return label
    return "PROBATION"


class AgentScoreService:
    """Computes and caches agent reputation scores."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self._events = TrustScoreEventsService(db)

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC API
    # ═══════════════════════════════════════════════════════════════════════════

    async def compute_agent_score(
        self,
        agent_id: UUID,
        trigger_source: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full score recalculation for one agent.

        Returns: { score, label, breakdown }
        """
        try:
            async with self.db.acquire() as conn:
                old_score = await conn.fetchval(
                    "SELECT trust_score FROM agent_verification_scores WHERE agent_id = $1",
                    agent_id,
                )

                verif_pts  = await self._calc_verification_quality(conn, agent_id)
                deal_pts   = await self._calc_deal_performance(conn, agent_id)
                sat_pts    = await self._calc_buyer_satisfaction(conn, agent_id)
                comp_pts   = await self._calc_compliance(conn, agent_id)

                raw_total = verif_pts + deal_pts + sat_pts + comp_pts
                final_score = max(0, min(100, raw_total))
                label = _label(final_score)

                await conn.execute(
                    """
                    UPDATE agent_verification_scores
                    SET trust_score                = $2,
                        score_label                = $3,
                        verification_quality_score = $4,
                        deal_performance_score     = $5,
                        buyer_satisfaction_score   = $6,
                        compliance_score           = $7,
                        last_computed_at           = NOW(),
                        updated_at                 = NOW()
                    WHERE agent_id = $1
                    """,
                    agent_id,
                    final_score,
                    label,
                    verif_pts,
                    deal_pts,
                    sat_pts,
                    comp_pts,
                )

            # Audit log
            await self._events.log_score_computed(
                entity_type="AGENT",
                entity_id=agent_id,
                old_score=old_score,
                new_score=final_score,
                trigger_source=trigger_source,
                metadata={
                    "breakdown": {
                        "verification_quality": verif_pts,
                        "deal_performance": deal_pts,
                        "buyer_satisfaction": sat_pts,
                        "compliance": comp_pts,
                    }
                },
            )

            return {
                "success": True,
                "agent_id": str(agent_id),
                "score": final_score,
                "label": label,
                "breakdown": {
                    "verification_quality": verif_pts,
                    "deal_performance": deal_pts,
                    "buyer_satisfaction": sat_pts,
                    "compliance": comp_pts,
                },
            }
        except Exception as e:
            logger.error(f"[AgentScore] Failed to compute score for {agent_id}: {e}")
            return {"success": False, "error": str(e)}

    async def batch_recompute(self, agent_ids: List[UUID]) -> Dict[str, Any]:
        """Recompute scores for multiple agents."""
        results = {"total": len(agent_ids), "success": 0, "failed": 0, "errors": []}
        for aid in agent_ids:
            r = await self.compute_agent_score(aid, trigger_source="BATCH_RECOMPUTE")
            if r.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"agent_id": str(aid), "error": r.get("error")})
        return results

    async def recompute_all(self) -> Dict[str, Any]:
        """Full recalculation of every agent score (nightly job)."""
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT avs.agent_id
                FROM agent_verification_scores avs
                JOIN users u ON u.id = avs.agent_id
                WHERE u.status = 'ACTIVE'
                """
            )
        agent_ids = [r["agent_id"] for r in rows]
        logger.info(f"[AgentScore] Recomputing {len(agent_ids)} agents...")
        return await self.batch_recompute(agent_ids)

    async def get_score(self, agent_id: UUID) -> Dict[str, Any]:
        """Fetch cached score + label."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT trust_score, score_label, last_computed_at
                FROM agent_verification_scores
                WHERE agent_id = $1
                """,
                agent_id,
            )
        if not row:
            return {"success": False, "error": "Agent score record not found"}
        score = row["trust_score"] or 0
        return {
            "success": True,
            "score": score,
            "label": row["score_label"] or _label(score),
            "last_computed_at": row["last_computed_at"].isoformat() if row["last_computed_at"] else None,
        }

    async def get_leaderboard(self, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Ranked list of agents by score (top→bottom)."""
        offset = (page - 1) * limit
        async with self.db.acquire() as conn:
            total = await conn.fetchval(
                "SELECT COUNT(*) FROM agent_verification_scores"
            )
            rows = await conn.fetch(
                """
                SELECT
                    avs.agent_id,
                    u.full_name, u.email,
                    avs.trust_score, avs.score_label,
                    avs.verification_quality_score,
                    avs.deal_performance_score,
                    avs.buyer_satisfaction_score,
                    avs.compliance_score,
                    avs.last_computed_at,
                    RANK() OVER (ORDER BY avs.trust_score DESC) AS rank
                FROM agent_verification_scores avs
                JOIN users u ON u.id = avs.agent_id
                ORDER BY avs.trust_score DESC
                LIMIT $1 OFFSET $2
                """,
                limit, offset,
            )
        agents = [
            {
                "rank": int(r["rank"]),
                "agent_id": str(r["agent_id"]),
                "name": r["full_name"],
                "email": r["email"],
                "score": r["trust_score"],
                "label": r["score_label"],
                "breakdown": {
                    "verification_quality": r["verification_quality_score"],
                    "deal_performance": r["deal_performance_score"],
                    "buyer_satisfaction": r["buyer_satisfaction_score"],
                    "compliance": r["compliance_score"],
                },
                "last_computed_at": r["last_computed_at"].isoformat() if r["last_computed_at"] else None,
            }
            for r in rows
        ]
        return {
            "success": True,
            "agents": agents,
            "pagination": {
                "page": page, "limit": limit, "total": total,
                "total_pages": (total + limit - 1) // limit,
            },
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # COMPONENT CALCULATORS
    # ═══════════════════════════════════════════════════════════════════════════

    async def _calc_verification_quality(self, conn: asyncpg.Connection, agent_id: UUID) -> int:
        """
        ① Verification Quality — max 40 points
          +2 per clean property verified (max 30)
          -10 per property with later fraud signals
        """
        try:
            # Properties agent has verified (completed verifications)
            rows = await conn.fetch(
                """
                SELECT DISTINCT pv.property_id,
                    COUNT(pfs.id) FILTER (WHERE pfs.resolved = FALSE) AS active_signals
                FROM property_verifications pv
                LEFT JOIN property_fraud_signals pfs
                    ON pfs.property_id = pv.property_id
                WHERE pv.agent_id = $1 AND pv.completed_at IS NOT NULL
                GROUP BY pv.property_id
                """,
                agent_id,
            )
            clean = sum(1 for r in rows if r["active_signals"] == 0)
            fraud  = sum(1 for r in rows if r["active_signals"] > 0)

            pts = min(clean * 2, 30) - (fraud * 10)
            return max(0, min(40, pts))
        except Exception as e:
            logger.warning(f"[AgentScore] verification_quality failed: {e}")
            return 0

    async def _calc_deal_performance(self, conn: asyncpg.Connection, agent_id: UUID) -> int:
        """
        ② Deal Performance — max 30 points
          +3/completed deal (max 18)
          -2/cancelled deal
          +0-12 completion time bonus
        """
        try:
            row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
                    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
                        FILTER (WHERE status = 'COMPLETED') AS avg_days
                FROM deals
                WHERE agent_id = $1
                """,
                agent_id,
            )
            if not row:
                return 0

            completed = row["completed"] or 0
            cancelled = row["cancelled"] or 0
            avg_days = float(row["avg_days"]) if row["avg_days"] else 999

            pts = min(int(completed) * 3, 18) - (int(cancelled) * 2)

            # Time bonus (max 12 pts)
            if avg_days < 30:
                pts += 12
            elif avg_days < 60:
                pts += 8
            elif avg_days < 90:
                pts += 4

            return max(0, min(30, pts))
        except Exception as e:
            logger.warning(f"[AgentScore] deal_performance failed: {e}")
            return 0

    async def _calc_buyer_satisfaction(self, conn: asyncpg.Connection, agent_id: UUID) -> int:
        """
        ③ Buyer Satisfaction — max 20 points
          Rating tiers (0-15) based on avg visit rating
          Dispute rate tiers (0-5)
        """
        try:
            sat_row = await conn.fetchrow(
                """
                SELECT AVG(vr.feedback_rating) AS avg_rating
                FROM visit_requests vr
                WHERE vr.agent_id = $1
                  AND vr.status = 'COMPLETED'
                  AND vr.feedback_rating IS NOT NULL
                """,
                agent_id,
            )
            avg_rating = float(sat_row["avg_rating"]) if sat_row and sat_row["avg_rating"] else 0.0

            if avg_rating >= 4.5:
                rating_pts = 15
            elif avg_rating >= 4.0:
                rating_pts = 10
            elif avg_rating >= 3.0:
                rating_pts = 5
            else:
                rating_pts = 0

            disp_row = await conn.fetchrow(
                """
                SELECT
                    COUNT(DISTINCT d.id) AS total_deals,
                    COUNT(DISTINCT disp.id) FILTER (WHERE disp.id IS NOT NULL) AS total_disputes
                FROM deals d
                LEFT JOIN disputes disp ON disp.deal_id = d.id
                WHERE d.agent_id = $1
                """,
                agent_id,
            )
            total_deals = int(disp_row["total_deals"] or 0)
            total_disputes = int(disp_row["total_disputes"] or 0)

            if total_deals == 0 or total_disputes == 0:
                dispute_pts = 5
            else:
                rate = total_disputes / total_deals
                if rate < 0.10:
                    dispute_pts = 3
                else:
                    dispute_pts = 0

            return max(0, min(20, rating_pts + dispute_pts))
        except Exception as e:
            logger.warning(f"[AgentScore] buyer_satisfaction failed: {e}")
            return 0

    async def _calc_compliance(self, conn: asyncpg.Connection, agent_id: UUID) -> int:
        """
        ④ Compliance — max 10 points
          SLA adherence rate (0-5)
          Avg response time (0-5)
        """
        try:
            sla_row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE breached = FALSE) AS on_time
                FROM sla_tracking
                WHERE agent_id = $1
                """,
                agent_id,
            )

            sla_pts = 0
            if sla_row and sla_row["total"] and int(sla_row["total"]) > 0:
                adherence = int(sla_row["on_time"]) / int(sla_row["total"])
                if adherence >= 0.95:
                    sla_pts = 5
                elif adherence >= 0.80:
                    sla_pts = 3

            # Response time (avg hours to first response)
            resp_row = await conn.fetchrow(
                """
                SELECT AVG(
                    EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600
                ) AS avg_response_hours
                FROM sla_tracking
                WHERE agent_id = $1 AND first_response_at IS NOT NULL
                """,
                agent_id,
            )
            avg_hours = float(resp_row["avg_response_hours"]) if resp_row and resp_row["avg_response_hours"] else 24.0

            if avg_hours < 2:
                resp_pts = 5
            elif avg_hours < 8:
                resp_pts = 3
            else:
                resp_pts = 0

            return max(0, min(10, sla_pts + resp_pts))
        except Exception as e:
            logger.warning(f"[AgentScore] compliance failed: {e}")
            return 0
