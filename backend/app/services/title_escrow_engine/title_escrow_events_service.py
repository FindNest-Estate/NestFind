"""
TitleEscrowEventsService — Immutable audit trail for title search and escrow events.
"""
from typing import Any, Dict, List, Optional
from uuid import UUID
import json
import asyncpg


class TitleEscrowEventsService:
    """INSERT-only audit trail; UPDATE/DELETE blocked at DB trigger level."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def log_event(
        self,
        entity_type: str,          # 'TITLE_SEARCH' or 'ESCROW_DISBURSEMENT'
        entity_id: UUID,
        event_type: str,
        actor_type: str,           # 'AGENT', 'ADMIN', 'SYSTEM'
        actor_id: Optional[UUID] = None,
        from_status: Optional[str] = None,
        to_status: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """Append an immutable event record."""
        payload = json.dumps(metadata or {})

        async def _insert(c: asyncpg.Connection) -> None:
            await c.execute(
                """
                INSERT INTO title_escrow_events (
                    entity_type, entity_id, event_type,
                    from_status, to_status,
                    actor_id, actor_type, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
                """,
                entity_type,
                entity_id,
                event_type,
                from_status,
                to_status,
                actor_id,
                actor_type,
                payload,
            )

        if conn:
            await _insert(conn)
        else:
            async with self.db.acquire() as c:
                await _insert(c)

    async def get_events(
        self,
        entity_type: str,
        entity_id: UUID,
    ) -> List[Dict[str, Any]]:
        """Return chronological event timeline for a given entity."""
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT tee.*,
                       u.full_name AS actor_name
                FROM title_escrow_events tee
                LEFT JOIN users u ON u.id = tee.actor_id
                WHERE tee.entity_type = $1
                  AND tee.entity_id   = $2
                ORDER BY tee.created_at ASC
                """,
                entity_type,
                entity_id,
            )
        return [self._format_event(r) for r in rows]

    # ------------------------------------------------------------------
    def _format_event(self, row: asyncpg.Record) -> Dict[str, Any]:
        return {
            "id": str(row["id"]),
            "entity_type": row["entity_type"],
            "entity_id": str(row["entity_id"]),
            "event_type": row["event_type"],
            "from_status": row["from_status"],
            "to_status": row["to_status"],
            "actor_id": str(row["actor_id"]) if row["actor_id"] else None,
            "actor_name": row["actor_name"],
            "actor_type": row["actor_type"],
            "metadata": (
                json.loads(row["metadata"]) if isinstance(row["metadata"], str)
                else (row["metadata"] or {})
            ),
            "created_at": row["created_at"].isoformat(),
        }
