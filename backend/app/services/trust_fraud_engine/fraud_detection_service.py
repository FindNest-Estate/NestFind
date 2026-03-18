"""
Fraud Detection Service — Orchestrates all fraud detectors.

Manages:
- Running detector pipelines by trigger type
- Persisting fraud signals to property_fraud_signals
- Signal resolution (admin action)
- Triggering trust score recomputation after signal events
"""
import json
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
import asyncpg

from .detectors import (
    DuplicateAddressDetector,
    PriceAnomalyDetector,
    GPSMismatchDetector,
    DocumentConsistencyDetector,
    VelocityDetector,
    SerialCancellationDetector,
)
from .detectors.base import FraudSignal
from .trust_score_events_service import TrustScoreEventsService

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """
    Orchestrates fraud detection across all detectors.

    Detector registry maps trigger names to detector instances.
    All detectors are independent — one failure doesn't affect others.
    """

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self._events = TrustScoreEventsService(db)

        self._detectors = {
            "PROPERTY_SUBMISSION": [
                DuplicateAddressDetector(),
                PriceAnomalyDetector(),
            ],
            "AGENT_VERIFICATION": [
                GPSMismatchDetector(),
                DocumentConsistencyDetector(),
            ],
            "DEAL_CREATION": [
                VelocityDetector(),
            ],
            "DEAL_CANCELLATION": [
                SerialCancellationDetector(),
            ],
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # DETECTION PIPELINE
    # ═══════════════════════════════════════════════════════════════════════════

    async def run_detectors(
        self,
        trigger: str,
        context: Dict[str, Any],
        actor_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Run all detectors registered for this trigger.

        Creates fraud signal records for each detection.
        Triggers trust score recomputation if any signals found.

        Returns: { signals_created: int, signals: [...] }
        """
        detectors = self._detectors.get(trigger, [])
        if not detectors:
            return {"signals_created": 0, "signals": []}

        all_signals: List[Dict[str, Any]] = []

        async with self.db.acquire() as conn:
            for detector in detectors:
                try:
                    raw_signals = await detector.detect(conn, context)
                    for signal in raw_signals:
                        try:
                            persisted = await self._persist_signal(conn, signal, trigger)
                            if persisted:
                                all_signals.append(persisted)
                        except Exception as e:
                            logger.error(f"[FraudDetection] Failed to persist signal {signal.signal_type}: {e}")
                except Exception as e:
                    logger.error(
                        f"[FraudDetection] Detector {detector.__class__.__name__} "
                        f"failed for trigger={trigger}: {e}"
                    )

        # Trigger trust score recomputation if signals were found
        if all_signals:
            property_id = context.get("property_id")
            if property_id:
                await self._trigger_trust_recompute(property_id, trigger)

        return {
            "signals_created": len(all_signals),
            "signals": all_signals,
        }

    async def _persist_signal(
        self,
        conn: asyncpg.Connection,
        signal: FraudSignal,
        trigger_source: str,
    ) -> Optional[Dict[str, Any]]:
        """Insert a fraud signal into property_fraud_signals."""
        row = await conn.fetchrow(
            """
            INSERT INTO property_fraud_signals
                (property_id, signal_type, severity, description, detected_by,
                 detector_name, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            RETURNING id, property_id, signal_type, severity, description,
                      detected_by, detector_name, metadata, resolved, created_at
            """,
            signal.property_id,
            signal.signal_type,
            signal.severity,
            signal.description,
            signal.detected_by,
            signal.detector_name,
            json.dumps(signal.metadata),
        )
        if not row:
            return None

        # Audit log
        await self._events.log_signal_created(
            property_id=signal.property_id,
            signal_type=signal.signal_type,
            severity=signal.severity,
            trigger_source=trigger_source,
            conn=conn,
        )

        return {
            "id": str(row["id"]),
            "property_id": str(row["property_id"]),
            "signal_type": row["signal_type"],
            "severity": row["severity"],
            "description": row["description"],
            "detected_by": row["detected_by"],
            "detector_name": row["detector_name"],
            "resolved": row["resolved"],
            "created_at": row["created_at"].isoformat(),
        }

    async def _trigger_trust_recompute(self, property_id: UUID, trigger_source: str) -> None:
        """Best-effort trust score recomputation after signal creation."""
        try:
            from .trust_score_service import TrustScoreService
            svc = TrustScoreService(self.db)
            await svc.compute_property_score(property_id, trigger_source=trigger_source)
        except Exception as e:
            logger.warning(f"[FraudDetection] Trust recompute failed after signal: {e}")

    # ═══════════════════════════════════════════════════════════════════════════
    # SIGNAL MANAGEMENT (Admin Operations)
    # ═══════════════════════════════════════════════════════════════════════════

    async def create_signal(
        self,
        property_id: UUID,
        signal_type: str,
        severity: str,
        description: str,
        detected_by: str = "ADMIN",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Manually create a fraud signal (admin-initiated or external system).
        Triggers trust score recomputation.
        """
        try:
            async with self.db.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO property_fraud_signals
                        (property_id, signal_type, severity, description,
                         detected_by, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                    RETURNING id, created_at
                    """,
                    property_id, signal_type, severity, description,
                    detected_by, json.dumps(metadata or {}),
                )
                await self._events.log_signal_created(
                    property_id=property_id,
                    signal_type=signal_type,
                    severity=severity,
                    trigger_source="MANUAL",
                    conn=conn,
                )

            await self._trigger_trust_recompute(property_id, "MANUAL_SIGNAL")

            return {
                "success": True,
                "signal_id": str(row["id"]),
                "created_at": row["created_at"].isoformat(),
            }
        except Exception as e:
            logger.error(f"[FraudDetection] create_signal failed: {e}")
            return {"success": False, "error": str(e)}

    async def resolve_signal(
        self,
        signal_id: UUID,
        resolved_by: UUID,
        resolution_notes: str,
    ) -> Dict[str, Any]:
        """
        Admin resolves a fraud signal.
        Triggers trust score recomputation (penalty removed).
        """
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE property_fraud_signals
                SET resolved = TRUE,
                    resolved_at = NOW(),
                    resolved_by = $2,
                    resolution_notes = $3
                WHERE id = $1 AND resolved = FALSE
                RETURNING id, property_id, signal_type
                """,
                signal_id, resolved_by, resolution_notes,
            )
            if not row:
                return {"success": False, "error": "Signal not found or already resolved"}

            property_id = row["property_id"]

            await self._events.log_signal_resolved(
                property_id=property_id,
                signal_id=signal_id,
                resolved_by=resolved_by,
                conn=conn,
            )

        # Recompute trust score (penalty is now lifted)
        await self._trigger_trust_recompute(property_id, "SIGNAL_RESOLVED")

        return {
            "success": True,
            "signal_id": str(signal_id),
            "property_id": str(property_id),
            "signal_type": row["signal_type"],
            "message": "Signal resolved. Trust score will be recomputed.",
        }

    async def get_signals(
        self,
        property_id: Optional[UUID] = None,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None,
        signal_type: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """List fraud signals with optional filters and pagination."""
        offset = (page - 1) * limit

        conditions = []
        params: List[Any] = []
        param_idx = 1

        if property_id:
            conditions.append(f"pfs.property_id = ${param_idx}")
            params.append(property_id)
            param_idx += 1

        if severity:
            conditions.append(f"pfs.severity = ${param_idx}")
            params.append(severity.upper())
            param_idx += 1

        if resolved is not None:
            conditions.append(f"pfs.resolved = ${param_idx}")
            params.append(resolved)
            param_idx += 1

        if signal_type:
            conditions.append(f"pfs.signal_type = ${param_idx}")
            params.append(signal_type.upper())
            param_idx += 1

        where = "WHERE " + " AND ".join(conditions) if conditions else ""

        async with self.db.acquire() as conn:
            total = await conn.fetchval(
                f"""
                SELECT COUNT(*)
                FROM property_fraud_signals pfs
                {where}
                """,
                *params,
            )

            params_page = params + [limit, offset]
            rows = await conn.fetch(
                f"""
                SELECT
                    pfs.id, pfs.property_id, pfs.signal_type, pfs.severity,
                    pfs.description, pfs.detected_by, pfs.detector_name,
                    pfs.metadata, pfs.resolved, pfs.resolved_at,
                    pfs.resolution_notes, pfs.created_at,
                    p.title as property_title, p.city
                FROM property_fraud_signals pfs
                JOIN properties p ON p.id = pfs.property_id
                {where}
                ORDER BY pfs.created_at DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
                """,
                *params_page,
            )

        signals = [
            {
                "id": str(r["id"]),
                "property_id": str(r["property_id"]),
                "property_title": r["property_title"],
                "property_city": r["city"],
                "signal_type": r["signal_type"],
                "severity": r["severity"],
                "description": r["description"],
                "detected_by": r["detected_by"],
                "detector_name": r["detector_name"],
                "metadata": dict(r["metadata"]) if r["metadata"] else {},
                "resolved": r["resolved"],
                "resolved_at": r["resolved_at"].isoformat() if r["resolved_at"] else None,
                "resolution_notes": r["resolution_notes"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

        return {
            "success": True,
            "signals": signals,
            "pagination": {
                "page": page, "limit": limit, "total": total,
                "total_pages": (total + limit - 1) // limit,
            },
        }
