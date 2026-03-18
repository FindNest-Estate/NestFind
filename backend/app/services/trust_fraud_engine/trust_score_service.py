"""
Trust Score Service — Property Trust Score Computation (0-100).

Computes weighted trust scores for properties across 6 categories:
  ① Owner Verification    (0-20)
  ② Document Verification (0-25)
  ③ Agent Verification    (0-20)
  ④ Platform History      (0-20)
  ⑤ Fraud Penalties       (negative, can bring total to 0)
  ⑥ Community Signals     (0-15)

Final score = clamp(sum of components, 0, 100)
"""
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
import asyncpg

from .trust_score_events_service import TrustScoreEventsService

logger = logging.getLogger(__name__)

# ─── Score label thresholds ───────────────────────────────────────────────────
SCORE_LABELS = [
    (90, "EXCELLENT",  "#3b82f6"),   # blue
    (70, "TRUSTED",    "#22c55e"),   # green
    (40, "MODERATE",   "#eab308"),   # yellow
    (20, "CAUTION",    "#f97316"),   # orange
    (0,  "HIGH_RISK",  "#ef4444"),   # red
]

# ─── Fraud signal penalty map ─────────────────────────────────────────────────
FRAUD_PENALTIES: Dict[str, int] = {
    "DUPLICATE_ADDRESS":  -15,
    "GPS_MISMATCH":       -20,
    "PRICE_ANOMALY":      -10,
    "DOCUMENT_TAMPERING": -30,
    "OWNER_MISMATCH":     -25,
    "VELOCITY_ABUSE":     -10,
    "SERIAL_CANCELLATION": -5,
}


def _label(score: int) -> tuple:
    """Return (label, badge_color) for a given score."""
    for threshold, label, color in SCORE_LABELS:
        if score >= threshold:
            return label, color
    return "HIGH_RISK", "#ef4444"


class TrustScoreService:
    """Computes and caches property trust scores."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self._events = TrustScoreEventsService(db)

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC API
    # ═══════════════════════════════════════════════════════════════════════════

    async def compute_property_score(
        self,
        property_id: UUID,
        trigger_source: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full score recalculation for one property.

        Queries all 6 component categories, sums their contributions,
        clamps to 0-100, writes to property_trust_scores.

        Returns: { score, label, badge_color, breakdown }
        """
        try:
            async with self.db.acquire() as conn:
                # Get old score for event logging
                old_score = await conn.fetchval(
                    "SELECT trust_score FROM property_trust_scores WHERE property_id = $1",
                    property_id,
                )

                # Get seller_id for platform history
                seller_id = await conn.fetchval(
                    "SELECT seller_id FROM properties WHERE id = $1",
                    property_id,
                )
                if not seller_id:
                    return {"success": False, "error": "Property not found"}

                # Compute all 6 components concurrently-style (sequential in one conn)
                owner_pts = await self._calc_owner_verification(conn, property_id)
                doc_pts   = await self._calc_document_verification(conn, property_id)
                agent_pts = await self._calc_agent_verification(conn, property_id)
                hist_pts  = await self._calc_platform_history(conn, seller_id)
                fraud_pts = await self._calc_fraud_penalties(conn, property_id)
                comm_pts  = await self._calc_community_signals(conn, property_id)

                raw_total = owner_pts + doc_pts + agent_pts + hist_pts + fraud_pts + comm_pts
                final_score = max(0, min(100, raw_total))
                label, badge_color = _label(final_score)

                # Upsert into property_trust_scores
                await conn.execute(
                    """
                    UPDATE property_trust_scores
                    SET trust_score       = $2,
                        score_label       = $3,
                        owner_score       = $4,
                        document_score    = $5,
                        agent_score       = $6,
                        history_score     = $7,
                        fraud_penalty     = $8,
                        community_score   = $9,
                        last_computed_at  = NOW(),
                        updated_at        = NOW()
                    WHERE property_id = $1
                    """,
                    property_id,
                    final_score,
                    label,
                    owner_pts,
                    doc_pts,
                    agent_pts,
                    hist_pts,
                    fraud_pts,
                    comm_pts,
                )

            # Audit log (best-effort, outside transaction)
            await self._events.log_score_computed(
                entity_type="PROPERTY",
                entity_id=property_id,
                old_score=old_score,
                new_score=final_score,
                trigger_source=trigger_source,
                metadata={
                    "breakdown": {
                        "owner": owner_pts, "document": doc_pts,
                        "agent": agent_pts, "history": hist_pts,
                        "fraud_penalty": fraud_pts, "community": comm_pts,
                    }
                },
            )

            return {
                "success": True,
                "property_id": str(property_id),
                "score": final_score,
                "label": label,
                "badge_color": badge_color,
                "breakdown": {
                    "owner_verification": owner_pts,
                    "document_verification": doc_pts,
                    "agent_verification": agent_pts,
                    "platform_history": hist_pts,
                    "fraud_penalty": fraud_pts,
                    "community_signals": comm_pts,
                },
            }
        except Exception as e:
            logger.error(f"[TrustScore] Failed to compute score for {property_id}: {e}")
            return {"success": False, "error": str(e)}

    async def batch_recompute(self, property_ids: List[UUID]) -> Dict[str, Any]:
        """Recompute scores for multiple properties."""
        results = {"total": len(property_ids), "success": 0, "failed": 0, "errors": []}
        for pid in property_ids:
            r = await self.compute_property_score(pid, trigger_source="BATCH_RECOMPUTE")
            if r.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"property_id": str(pid), "error": r.get("error")})
        return results

    async def recompute_all(self) -> Dict[str, Any]:
        """Full recalculation of every active property score (nightly job)."""
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id FROM properties WHERE status != 'DELETED' AND deleted_at IS NULL"
            )
        property_ids = [r["id"] for r in rows]
        logger.info(f"[TrustScore] Recomputing {len(property_ids)} properties...")
        return await self.batch_recompute(property_ids)

    async def get_score(self, property_id: UUID) -> Dict[str, Any]:
        """Fetch cached score + label from property_trust_scores."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT trust_score, score_label, last_computed_at
                FROM property_trust_scores
                WHERE property_id = $1
                """,
                property_id,
            )
        if not row:
            return {"success": False, "error": "Score record not found"}
        score = row["trust_score"] or 0
        label, badge_color = _label(score)
        return {
            "success": True,
            "score": score,
            "label": row["score_label"] or label,
            "badge_color": badge_color,
            "last_computed_at": row["last_computed_at"].isoformat() if row["last_computed_at"] else None,
        }

    async def get_breakdown(self, property_id: UUID) -> Dict[str, Any]:
        """Compute and return full breakdown without caching."""
        return await self.compute_property_score(property_id, trigger_source="BREAKDOWN_REQUEST")

    # ═══════════════════════════════════════════════════════════════════════════
    # COMPONENT CALCULATORS
    # ═══════════════════════════════════════════════════════════════════════════

    async def _calc_owner_verification(self, conn: asyncpg.Connection, property_id: UUID) -> int:
        """
        ① Owner Verification — max 20 points
          KYC verified:     +10
          Aadhaar verified: +5
          PAN verified:     +5
        """
        try:
            row = await conn.fetchrow(
                """
                SELECT
                    CASE WHEN COALESCE(u.kyc_verified, FALSE) THEN 10 ELSE 0 END +
                    CASE WHEN COALESCE(u.aadhaar_verified, FALSE) THEN 5 ELSE 0 END +
                    CASE WHEN COALESCE(u.pan_verified, FALSE) THEN 5 ELSE 0 END AS owner_score
                FROM properties p
                JOIN users u ON p.seller_id = u.id
                WHERE p.id = $1
                """,
                property_id,
            )
            return int(row["owner_score"]) if row else 0
        except Exception as e:
            logger.warning(f"[TrustScore] owner_verification failed: {e}")
            return 0

    async def _calc_document_verification(self, conn: asyncpg.Connection, property_id: UUID) -> int:
        """
        ② Document Verification — max 25 points
          verified_docs / required_docs × 20 (max 20)
          +5 bonus if ALL required docs verified
        """
        try:
            row = await conn.fetchrow(
                """
                WITH req AS (
                    SELECT COUNT(*) AS total_required
                    FROM property_document_requirements pdr
                    WHERE pdr.property_type = (
                        SELECT type FROM properties WHERE id = $1
                    )
                    AND pdr.required = TRUE
                ),
                verified AS (
                    SELECT COUNT(*) AS total_verified
                    FROM property_document_verifications pdv
                    JOIN property_verifications pv ON pdv.verification_id = pv.id
                    WHERE pv.property_id = $1 AND pdv.verified = TRUE
                )
                SELECT
                    CASE WHEN req.total_required = 0 THEN 0
                         ELSE LEAST(ROUND((verified.total_verified::FLOAT / req.total_required) * 20), 20)
                    END +
                    CASE WHEN verified.total_verified >= req.total_required
                              AND req.total_required > 0 THEN 5 ELSE 0
                    END AS doc_score
                FROM req, verified
                """,
                property_id,
            )
            return int(row["doc_score"]) if row else 0
        except Exception as e:
            logger.warning(f"[TrustScore] document_verification failed: {e}")
            return 0

    async def _calc_agent_verification(self, conn: asyncpg.Connection, property_id: UUID) -> int:
        """
        ③ Agent Verification — max 20 points
          GPS verified:         +10
          OTP verified:         +5
          All checklist passed: +5
        """
        try:
            row = await conn.fetchrow(
                """
                SELECT
                    CASE WHEN pv.gps_verified THEN 10 ELSE 0 END +
                    CASE WHEN pv.otp_verified THEN 5 ELSE 0 END +
                    CASE
                        WHEN (
                            SELECT COUNT(*) FROM verification_checklist_results vcr
                            WHERE vcr.verification_id = pv.id AND vcr.result = TRUE
                        ) = (
                            SELECT COUNT(*) FROM verification_checklist_results vcr
                            WHERE vcr.verification_id = pv.id
                        )
                        AND (
                            SELECT COUNT(*) FROM verification_checklist_results vcr
                            WHERE vcr.verification_id = pv.id
                        ) > 0
                        THEN 5 ELSE 0
                    END AS agent_score
                FROM property_verifications pv
                WHERE pv.property_id = $1
                ORDER BY pv.created_at DESC
                LIMIT 1
                """,
                property_id,
            )
            if not row:
                return 0
            # Check if the columns exist (gps_verified / otp_verified)
            score = row["agent_score"]
            return int(score) if score is not None else 0
        except Exception as e:
            logger.warning(f"[TrustScore] agent_verification failed: {e}")
            return 0

    async def _calc_platform_history(self, conn: asyncpg.Connection, seller_id: UUID) -> int:
        """
        ④ Platform History — max 20 points
          Completed deals: +5/deal, max 15
          No open disputes: +5
        """
        try:
            row = await conn.fetchrow(
                """
                SELECT
                    LEAST(COUNT(*) * 5, 15) +
                    CASE WHEN NOT EXISTS (
                        SELECT 1 FROM disputes d
                        JOIN deals dl ON d.deal_id = dl.id
                        WHERE dl.seller_id = $1
                          AND d.status NOT IN ('RESOLVED', 'REJECTED')
                    ) THEN 5 ELSE 0 END AS history_score
                FROM deals
                WHERE seller_id = $1 AND status = 'COMPLETED'
                """,
                seller_id,
            )
            return int(row["history_score"]) if row else 0
        except Exception as e:
            logger.warning(f"[TrustScore] platform_history failed: {e}")
            return 0

    async def _calc_fraud_penalties(self, conn: asyncpg.Connection, property_id: UUID) -> int:
        """
        ⑤ Fraud Penalties — negative, sum of all unresolved signals
        """
        try:
            row = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(
                    CASE signal_type
                        WHEN 'DUPLICATE_ADDRESS'   THEN -15
                        WHEN 'GPS_MISMATCH'        THEN -20
                        WHEN 'PRICE_ANOMALY'       THEN -10
                        WHEN 'DOCUMENT_TAMPERING'  THEN -30
                        WHEN 'OWNER_MISMATCH'      THEN -25
                        WHEN 'VELOCITY_ABUSE'      THEN -10
                        WHEN 'SERIAL_CANCELLATION' THEN  -5
                        ELSE -5
                    END
                ), 0) AS fraud_penalty
                FROM property_fraud_signals
                WHERE property_id = $1 AND resolved = FALSE
                """,
                property_id,
            )
            return int(row["fraud_penalty"]) if row else 0
        except Exception as e:
            logger.warning(f"[TrustScore] fraud_penalties failed: {e}")
            return 0

    async def _calc_community_signals(self, conn: asyncpg.Connection, property_id: UUID) -> int:
        """
        ⑥ Community Signals — max 15 points
          Visit avg rating ≥ 4.0:      +5
          ≥ 3 completed visits:         +5
          Agent recommendation flag:    +5
        """
        try:
            row = await conn.fetchrow(
                """
                WITH visit_stats AS (
                    SELECT
                        AVG(vr.feedback_rating) AS avg_rating,
                        COUNT(*) AS completed_visits
                    FROM visit_requests vr
                    WHERE vr.property_id = $1
                      AND vr.status = 'COMPLETED'
                      AND vr.feedback_rating IS NOT NULL
                )
                SELECT
                    CASE WHEN avg_rating >= 4.0 THEN 5 ELSE 0 END +
                    CASE WHEN completed_visits >= 3 THEN 5 ELSE 0 END +
                    CASE WHEN EXISTS (
                        SELECT 1 FROM agent_assignments aa
                        WHERE aa.property_id = $1
                          AND aa.status = 'ACCEPTED'
                          AND (
                              aa.notes ILIKE '%recommend%'
                              OR aa.metadata->>'agent_recommended' = 'true'
                          )
                    ) THEN 5 ELSE 0 END AS community_score
                FROM visit_stats
                """,
                property_id,
            )
            return int(row["community_score"]) if row and row["community_score"] is not None else 0
        except Exception as e:
            logger.warning(f"[TrustScore] community_signals failed: {e}")
            return 0
