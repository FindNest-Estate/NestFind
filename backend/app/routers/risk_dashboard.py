"""
Risk Dashboard Router — Admin endpoints for Trust, Fraud & Risk monitoring.

Endpoints:
  GET  /admin/risk/dashboard                        — Aggregated risk stats
  GET  /admin/risk/properties                       — Paginated properties with scores
  GET  /admin/risk/properties/{id}/breakdown        — Full 6-component breakdown
  POST /admin/risk/properties/{id}/recompute        — Force score recomputation
  GET  /admin/risk/agents                           — Paginated agents with scores
  GET  /admin/risk/agents/{id}/breakdown            — Full 4-component breakdown
  GET  /admin/risk/agents/leaderboard               — Ranked agent list
  GET  /admin/risk/signals                          — Paginated fraud signals
  POST /admin/risk/signals/{id}/resolve             — Resolve a signal
  POST /admin/risk/batch-recompute                  — Batch recompute PROPERTY|AGENT
  GET  /properties/{id}/trust-score                 — PUBLIC score endpoint
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.trust_fraud_engine import TrustScoreService, AgentScoreService, FraudDetectionService


router = APIRouter(tags=["Risk Dashboard"])


# ─── Admin guard ──────────────────────────────────────────────────────────────

def require_admin(user: AuthenticatedUser) -> AuthenticatedUser:
    if not any(r in (user.roles or []) for r in ["ADMIN", "CEO"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ─── Request bodies ───────────────────────────────────────────────────────────

class ResolveSignalBody(BaseModel):
    resolution_notes: str

class BatchRecomputeBody(BaseModel):
    entity_type: str   # "PROPERTY" or "AGENT"


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/risk/dashboard")
async def get_risk_dashboard(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Aggregated risk stats across all properties and agents."""
    require_admin(current_user)
    pool = get_db_pool()

    async with pool.acquire() as conn:
        stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*)                                            AS total_properties_scored,
                ROUND(AVG(trust_score))                            AS avg_trust_score,
                COUNT(*) FILTER (WHERE trust_score < 30)           AS high_risk_count,
                COUNT(*) FILTER (WHERE trust_score < 50)           AS caution_count
            FROM property_trust_scores pts
            JOIN properties p ON p.id = pts.property_id
            WHERE p.deleted_at IS NULL
            """
        )
        signal_stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*) FILTER (WHERE resolved = FALSE)           AS unresolved_signals,
                COUNT(*) FILTER (WHERE severity = 'CRITICAL'
                                   AND resolved = FALSE)           AS critical_signals
            FROM property_fraud_signals
            """
        )
        agents_on_probation = await conn.fetchval(
            """
            SELECT COUNT(*) FROM agent_verification_scores
            WHERE trust_score < 30
            """
        )

    return {
        "total_properties_scored": int(stats["total_properties_scored"] or 0),
        "avg_trust_score": int(stats["avg_trust_score"] or 0),
        "high_risk_count": int(stats["high_risk_count"] or 0),
        "caution_count": int(stats["caution_count"] or 0),
        "unresolved_signals_count": int(signal_stats["unresolved_signals"] or 0),
        "critical_signals_count": int(signal_stats["critical_signals"] or 0),
        "agents_on_probation_count": int(agents_on_probation or 0),
    }


# ══════════════════════════════════════════════════════════════════════════════
# PROPERTY TRUST SCORES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/risk/properties")
async def list_risky_properties(
    score_below: Optional[int] = Query(None, ge=0, le=100),
    score_above: Optional[int] = Query(None, ge=0, le=100),
    label: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Paginated property list with trust scores and labels. Supports filtering."""
    require_admin(current_user)
    pool = get_db_pool()
    offset = (page - 1) * limit

    conditions = ["p.deleted_at IS NULL"]
    params: list = []    # type: list (Any elements — pgsql params)
    idx = 1

    if score_below is not None:
        conditions.append(f"pts.trust_score < ${idx}")
        params.append(score_below); idx += 1
    if score_above is not None:
        conditions.append(f"pts.trust_score > ${idx}")
        params.append(score_above); idx += 1
    if label:
        conditions.append(f"pts.score_label = ${idx}")
        params.append(label.upper()); idx += 1

    where = "WHERE " + " AND ".join(conditions)

    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f"""
            SELECT COUNT(*) FROM property_trust_scores pts
            JOIN properties p ON p.id = pts.property_id
            {where}
            """, *params
        )
        rows = await conn.fetch(
            f"""
            SELECT
                p.id, p.title, p.city, p.status::text,
                pts.trust_score, pts.score_label,
                pts.owner_score, pts.document_score, pts.agent_score,
                pts.history_score, pts.fraud_penalty, pts.community_score,
                pts.last_computed_at
            FROM property_trust_scores pts
            JOIN properties p ON p.id = pts.property_id
            {where}
            ORDER BY pts.trust_score ASC
            LIMIT ${idx} OFFSET ${idx + 1}
            """, *params, limit, offset
        )

    return {
        "properties": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "city": r["city"],
                "status": r["status"],
                "trust_score": r["trust_score"],
                "score_label": r["score_label"],
                "last_computed_at": r["last_computed_at"].isoformat() if r["last_computed_at"] else None,
            }
            for r in rows
        ],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": (total + limit - 1) // limit},
    }


@router.get("/admin/risk/properties/{property_id}/breakdown")
async def get_property_breakdown(
    property_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Full 6-component trust score breakdown for a property."""
    require_admin(current_user)
    pool = get_db_pool()
    svc = TrustScoreService(pool)
    result = await svc.get_breakdown(property_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Not found"))
    return result


@router.post("/admin/risk/properties/{property_id}/recompute")
async def recompute_property_score(
    property_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Force recomputation of trust score for a property."""
    require_admin(current_user)
    pool = get_db_pool()
    svc = TrustScoreService(pool)
    result = await svc.compute_property_score(property_id, trigger_source="ADMIN_MANUAL")
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Recompute failed"))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# AGENT REPUTATION SCORES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/risk/agents")
async def list_agents_by_score(
    score_below: Optional[int] = Query(None, ge=0, le=100),
    label: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Paginated agent list with reputation scores."""
    require_admin(current_user)
    pool = get_db_pool()
    offset = (page - 1) * limit

    conditions = ["u.status != 'DELETED'"]
    params: list = []    # type: list (Any elements — pgsql params)
    idx = 1

    if score_below is not None:
        conditions.append(f"avs.trust_score < ${idx}")
        params.append(score_below); idx += 1
    if label:
        conditions.append(f"avs.score_label = ${idx}")
        params.append(label.upper()); idx += 1

    where = "WHERE " + " AND ".join(conditions)

    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f"""
            SELECT COUNT(*) FROM agent_verification_scores avs
            JOIN users u ON u.id = avs.agent_id
            {where}
            """, *params
        )
        rows = await conn.fetch(
            f"""
            SELECT
                avs.agent_id, u.full_name, u.email,
                avs.trust_score, avs.score_label,
                avs.verification_quality_score, avs.deal_performance_score,
                avs.buyer_satisfaction_score, avs.compliance_score,
                avs.last_computed_at
            FROM agent_verification_scores avs
            JOIN users u ON u.id = avs.agent_id
            {where}
            ORDER BY avs.trust_score ASC
            LIMIT ${idx} OFFSET ${idx + 1}
            """, *params, limit, offset
        )

    return {
        "agents": [
            {
                "agent_id": str(r["agent_id"]),
                "name": r["full_name"],
                "email": r["email"],
                "score": r["trust_score"],
                "label": r["score_label"],
                "last_computed_at": r["last_computed_at"].isoformat() if r["last_computed_at"] else None,
            }
            for r in rows
        ],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": (total + limit - 1) // limit},
    }


@router.get("/admin/risk/agents/leaderboard")
async def get_agent_leaderboard(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Ranked agent leaderboard (top to bottom by score)."""
    require_admin(current_user)
    pool = get_db_pool()
    svc = AgentScoreService(pool)
    return await svc.get_leaderboard(page=page, limit=limit)


@router.get("/admin/risk/agents/{agent_id}/breakdown")
async def get_agent_breakdown(
    agent_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Full 4-component agent reputation score breakdown."""
    require_admin(current_user)
    pool = get_db_pool()
    svc = AgentScoreService(pool)
    result = await svc.compute_agent_score(agent_id, trigger_source="ADMIN_BREAKDOWN")
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Not found"))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# FRAUD SIGNALS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/admin/risk/signals")
async def list_fraud_signals(
    severity: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    signal_type: Optional[str] = Query(None),
    property_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Paginated fraud signals with optional filters."""
    require_admin(current_user)
    pool = get_db_pool()
    svc = FraudDetectionService(pool)
    return await svc.get_signals(
        property_id=property_id,
        severity=severity,
        resolved=resolved,
        signal_type=signal_type,
        page=page,
        limit=limit,
    )


@router.post("/admin/risk/signals/{signal_id}/resolve")
async def resolve_fraud_signal(
    signal_id: UUID,
    body: ResolveSignalBody,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Admin resolves a fraud signal. Triggers trust score recomputation."""
    require_admin(current_user)
    pool = get_db_pool()
    svc = FraudDetectionService(pool)
    result = await svc.resolve_signal(
        signal_id=signal_id,
        resolved_by=current_user.user_id,
        resolution_notes=body.resolution_notes,
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Signal not found"))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# BATCH RECOMPUTE
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/admin/risk/batch-recompute")
async def batch_recompute(
    body: BatchRecomputeBody,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Admin triggers batch recomputation for all properties or agents."""
    require_admin(current_user)
    pool = get_db_pool()

    entity_type = body.entity_type.upper()
    if entity_type == "PROPERTY":
        svc = TrustScoreService(pool)
        result = await svc.recompute_all()
        return {"entity_type": "PROPERTY", **result}
    elif entity_type == "AGENT":
        svc = AgentScoreService(pool)
        result = await svc.recompute_all()
        return {"entity_type": "AGENT", **result}
    else:
        raise HTTPException(status_code=400, detail="entity_type must be PROPERTY or AGENT")


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC TRUST SCORE (no auth required)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/properties/{property_id}/trust-score")
async def get_public_trust_score(property_id: UUID):
    """
    Public endpoint — returns score, label, and badge color only.
    Does NOT expose component breakdown.
    """
    pool = get_db_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT pts.trust_score, pts.score_label
            FROM property_trust_scores pts
            JOIN properties p ON p.id = pts.property_id
            WHERE pts.property_id = $1 AND p.deleted_at IS NULL
            """,
            property_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Property score not found")

    score = row["trust_score"] or 0
    label = row["score_label"] or "MODERATE"

    badge_colors = {
        "EXCELLENT": "#3b82f6",
        "TRUSTED":   "#22c55e",
        "MODERATE":  "#eab308",
        "CAUTION":   "#f97316",
        "HIGH_RISK": "#ef4444",
    }

    return {
        "property_id": str(property_id),
        "score": score,
        "label": label,
        "badge_color": badge_colors.get(label, "#eab308"),
    }
