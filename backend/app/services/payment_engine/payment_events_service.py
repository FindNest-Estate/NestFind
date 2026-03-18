from __future__ import annotations

import json
from typing import Any, Dict, Optional
from uuid import UUID

import asyncpg


class PaymentEventsService:
    """Append-only payment event timeline service."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def log_event(
        self,
        intent_id: UUID,
        event_type: str,
        from_status: Optional[str],
        to_status: Optional[str],
        actor_id: Optional[UUID],
        actor_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Dict[str, Any]:
        payload = json.dumps(metadata or {})
        query = """
            INSERT INTO payment_events (
                intent_id,
                event_type,
                from_status,
                to_status,
                actor_id,
                actor_type,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            RETURNING id, intent_id, event_type, from_status, to_status, actor_id, actor_type, metadata, created_at
        """

        if conn:
            event = await conn.fetchrow(
                query,
                intent_id,
                event_type,
                from_status,
                to_status,
                actor_id,
                actor_type,
                payload,
            )
        else:
            async with self.db.acquire() as local_conn:
                event = await local_conn.fetchrow(
                    query,
                    intent_id,
                    event_type,
                    from_status,
                    to_status,
                    actor_id,
                    actor_type,
                    payload,
                )

        return self._format_event(event)

    async def get_timeline(self, intent_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            events = await conn.fetch(
                """
                SELECT pe.*, u.full_name AS actor_name
                FROM payment_events pe
                LEFT JOIN users u ON pe.actor_id = u.id
                WHERE pe.intent_id = $1
                ORDER BY pe.created_at ASC
                """,
                intent_id,
            )

        return {
            "success": True,
            "events": [self._format_event(event, include_actor_name=True) for event in events],
        }

    def _format_event(self, row: asyncpg.Record, include_actor_name: bool = False) -> Dict[str, Any]:
        metadata_raw = row.get("metadata")
        if isinstance(metadata_raw, str):
            try:
                metadata = json.loads(metadata_raw)
            except json.JSONDecodeError:
                metadata = {}
        else:
            metadata = metadata_raw or {}

        payload = {
            "id": str(row["id"]),
            "intent_id": str(row["intent_id"]),
            "event_type": row["event_type"],
            "from_status": row["from_status"],
            "to_status": row["to_status"],
            "actor_id": str(row["actor_id"]) if row["actor_id"] else None,
            "actor_type": row["actor_type"],
            "metadata": metadata,
            "created_at": row["created_at"].isoformat(),
        }

        if include_actor_name and "actor_name" in row.keys():
            payload["actor_name"] = row["actor_name"]

        return payload
