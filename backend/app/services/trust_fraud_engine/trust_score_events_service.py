"""
Trust Score Events Service — Immutable audit logging for score changes and fraud signals.
"""
import json
import logging
from typing import Optional, Dict, Any
from uuid import UUID
import asyncpg

logger = logging.getLogger(__name__)


class TrustScoreEventsService:
    """Logs every trust score change and fraud signal event for auditing."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def log_score_computed(
        self,
        entity_type: str,        # 'PROPERTY' or 'AGENT'
        entity_id: UUID,
        old_score: Optional[int],
        new_score: int,
        trigger_source: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """Log a score computation event."""
        await self._log(
            entity_type=entity_type,
            entity_id=entity_id,
            event_type="SCORE_COMPUTED",
            old_score=old_score,
            new_score=new_score,
            trigger_source=trigger_source,
            metadata=metadata or {},
            conn=conn,
        )

    async def log_signal_created(
        self,
        property_id: UUID,
        signal_type: str,
        severity: str,
        trigger_source: Optional[str] = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """Log a fraud signal creation event."""
        await self._log(
            entity_type="PROPERTY",
            entity_id=property_id,
            event_type="SIGNAL_CREATED",
            old_score=None,
            new_score=None,
            trigger_source=trigger_source,
            metadata={"signal_type": signal_type, "severity": severity},
            conn=conn,
        )

    async def log_signal_resolved(
        self,
        property_id: UUID,
        signal_id: UUID,
        resolved_by: UUID,
        conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """Log a fraud signal resolution event."""
        await self._log(
            entity_type="PROPERTY",
            entity_id=property_id,
            event_type="SIGNAL_RESOLVED",
            old_score=None,
            new_score=None,
            trigger_source="ADMIN_RESOLVE",
            metadata={"signal_id": str(signal_id), "resolved_by": str(resolved_by)},
            conn=conn,
        )

    async def _log(
        self,
        entity_type: str,
        entity_id: UUID,
        event_type: str,
        old_score: Optional[int],
        new_score: Optional[int],
        trigger_source: Optional[str],
        metadata: Dict[str, Any],
        conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """Internal logging helper."""
        try:
            sql = """
                INSERT INTO trust_score_events
                    (entity_type, entity_id, event_type, old_score, new_score, trigger_source, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            """
            params = (
                entity_type,
                entity_id,
                event_type,
                old_score,
                new_score,
                trigger_source,
                json.dumps(metadata),
            )
            if conn:
                await conn.execute(sql, *params)
            else:
                async with self.db.acquire() as c:
                    await c.execute(sql, *params)
        except Exception as e:
            # Audit logging must never block anything
            logger.warning(f"[TrustScoreEvents] Failed to log event: {e}")
