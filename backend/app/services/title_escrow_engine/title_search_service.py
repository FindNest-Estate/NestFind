"""
TitleSearchService — Full state machine for title search lifecycle.

States:
  PENDING_SEARCH → IN_PROGRESS → CLEAR (terminal)
                                → ENCUMBRANCES_FOUND → RESOLUTION_IN_PROGRESS → CLEAR
                                                                               → REJECTED
                               → REJECTED (terminal)
                → EXPIRED (terminal, set by background job)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

import asyncpg

from .title_escrow_events_service import TitleEscrowEventsService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State machine definition
# ---------------------------------------------------------------------------

VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "PENDING_SEARCH":          {"IN_PROGRESS", "EXPIRED"},
    "IN_PROGRESS":             {"CLEAR", "ENCUMBRANCES_FOUND", "REJECTED"},
    "ENCUMBRANCES_FOUND":      {"RESOLUTION_IN_PROGRESS", "REJECTED"},
    "RESOLUTION_IN_PROGRESS":  {"CLEAR", "REJECTED"},
}

TERMINAL_STATUSES: Set[str] = {"CLEAR", "REJECTED", "EXPIRED"}

# (from_status, to_status) → set of allowed actor roles
ACTOR_PERMISSIONS: Dict[tuple, Set[str]] = {
    ("PENDING_SEARCH",         "IN_PROGRESS"):             {"AGENT", "ADMIN"},
    ("PENDING_SEARCH",         "EXPIRED"):                 {"SYSTEM", "ADMIN"},
    ("IN_PROGRESS",            "CLEAR"):                   {"AGENT", "ADMIN"},
    ("IN_PROGRESS",            "ENCUMBRANCES_FOUND"):      {"AGENT", "ADMIN"},
    ("IN_PROGRESS",            "REJECTED"):                {"ADMIN"},
    ("ENCUMBRANCES_FOUND",     "RESOLUTION_IN_PROGRESS"):  {"ADMIN"},
    ("ENCUMBRANCES_FOUND",     "REJECTED"):                {"ADMIN"},
    ("RESOLUTION_IN_PROGRESS", "CLEAR"):                   {"ADMIN"},
    ("RESOLUTION_IN_PROGRESS", "REJECTED"):                {"ADMIN"},
}


class TitleSearchService:
    """Title search lifecycle with state machine and deal gate."""

    def __init__(self, db: asyncpg.Pool):
        self.db = db
        self.events = TitleEscrowEventsService(db)

    # -----------------------------------------------------------------------
    # CREATION
    # -----------------------------------------------------------------------

    async def initiate_title_search(
        self,
        deal_id: UUID,
        agency_name: str,
        checker_name: Optional[str],
        initiated_by: UUID,
        transaction_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Create a new title search record (PENDING_SEARCH)."""
        async with self.db.acquire() as conn:
            # Deal must exist and not be terminal / cancelled
            deal = await conn.fetchrow(
                "SELECT id, status FROM deals WHERE id = $1", deal_id
            )
            if not deal:
                return {"success": False, "error": "Deal not found"}

            terminal_deal_statuses = {"COMPLETED", "COMMISSION_RELEASED", "CANCELLED", "EXPIRED"}
            if deal["status"] in terminal_deal_statuses:
                return {
                    "success": False,
                    "error": f"Cannot initiate title search on a deal in status: {deal['status']}",
                }

            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO title_searches (
                        deal_id, transaction_id,
                        agency_name, checker_name,
                        initiated_by, status,
                        started_at
                    )
                    VALUES ($1, $2, $3, $4, $5, 'PENDING_SEARCH', NULL)
                    RETURNING *
                    """,
                    deal_id,
                    transaction_id,
                    agency_name,
                    checker_name,
                    initiated_by,
                )

                await self.events.log_event(
                    entity_type="TITLE_SEARCH",
                    entity_id=row["id"],
                    event_type="TITLE_SEARCH_CREATED",
                    actor_id=initiated_by,
                    actor_type="AGENT",
                    to_status="PENDING_SEARCH",
                    metadata={"deal_id": str(deal_id), "agency_name": agency_name},
                    conn=conn,
                )

        return {"success": True, "title_search": self._format_search(row)}

    # -----------------------------------------------------------------------
    # STATE MACHINE TRANSITION
    # -----------------------------------------------------------------------

    async def transition_title_search(
        self,
        search_id: UUID,
        to_status: str,
        actor_id: UUID,
        actor_role: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Advance a title search through its state machine.
        Validates the transition, actor permission, and required fields.
        """
        async with self.db.acquire() as conn:
            search = await conn.fetchrow(
                "SELECT * FROM title_searches WHERE id = $1", search_id
            )
            if not search:
                return {"success": False, "error": "Title search not found"}

            current = search["status"]
            to_upper = to_status.upper()

            if current in TERMINAL_STATUSES:
                return {
                    "success": False,
                    "error": f"Title search is in terminal state: {current}",
                }

            # Guard 1: valid transition
            if to_upper not in VALID_TRANSITIONS.get(current, set()):
                valid = list(VALID_TRANSITIONS.get(current, set()))
                return {
                    "success": False,
                    "error": f"Invalid transition {current} → {to_upper}. Valid: {valid}",
                }

            # Guard 2: actor permission
            allowed_roles = ACTOR_PERMISSIONS.get((current, to_upper), set())
            if actor_role not in allowed_roles:
                return {
                    "success": False,
                    "error": (
                        f"Role '{actor_role}' cannot perform {current} → {to_upper}. "
                        f"Allowed: {sorted(allowed_roles)}"
                    ),
                }

            # Guard 3: field guards per target state
            meta = metadata or {}
            guard_error = self._check_field_guards(to_upper, meta, search)
            if guard_error:
                return {"success": False, "error": guard_error}

            # Build update fields
            update_fields: Dict[str, Any] = {"status": to_upper}
            now = datetime.now(timezone.utc)

            if to_upper == "IN_PROGRESS":
                update_fields["started_at"] = now

            elif to_upper in ("CLEAR", "REJECTED"):
                update_fields["completed_at"] = now
                if to_upper == "REJECTED" and meta.get("rejection_reason"):
                    update_fields["rejection_reason"] = meta["rejection_reason"]
                if to_upper == "CLEAR" and meta.get("report_url"):
                    update_fields["report_url"] = meta["report_url"]

            elif to_upper == "ENCUMBRANCES_FOUND":
                if meta.get("encumbrance_notes"):
                    update_fields["encumbrance_notes"] = meta["encumbrance_notes"]
                if meta.get("encumbrance_details"):
                    update_fields["encumbrance_details"] = json.dumps(
                        meta["encumbrance_details"]
                    )

            elif to_upper == "RESOLUTION_IN_PROGRESS":
                if meta.get("resolution_plan"):
                    update_fields["resolution_plan"] = meta["resolution_plan"]

            # For RESOLUTION_IN_PROGRESS → CLEAR
            if to_upper == "CLEAR" and meta.get("resolution_notes"):
                update_fields["resolution_notes"] = meta["resolution_notes"]
                update_fields["resolved_by"] = actor_id
                update_fields["resolved_at"] = now
            if to_upper == "CLEAR" and meta.get("clearance_docs"):
                update_fields["clearance_docs"] = json.dumps(meta["clearance_docs"])

            # Build dynamic SQL
            set_clauses = []
            params: List[Any] = [search_id]
            idx = 2
            for field, value in update_fields.items():
                set_clauses.append(f"{field} = ${idx}")
                params.append(value)
                idx += 1

            async with conn.transaction():
                updated = await conn.fetchrow(
                    f"""
                    UPDATE title_searches
                    SET {', '.join(set_clauses)}
                    WHERE id = $1
                    RETURNING *
                    """,
                    *params,
                )

                await self.events.log_event(
                    entity_type="TITLE_SEARCH",
                    entity_id=search_id,
                    event_type="STATUS_CHANGED",
                    actor_id=actor_id,
                    actor_type=actor_role,
                    from_status=current,
                    to_status=to_upper,
                    metadata=meta,
                    conn=conn,
                )

        return {
            "success": True,
            "title_search": self._format_search(updated),
            "transition": {"from": current, "to": to_upper},
        }

    # -----------------------------------------------------------------------
    # DEAL GATE
    # -----------------------------------------------------------------------

    async def check_title_clear(self, deal_id: UUID) -> bool:
        """Returns True if at least one title search for this deal has status = CLEAR."""
        async with self.db.acquire() as conn:
            exists = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1 FROM title_searches
                    WHERE deal_id = $1 AND status = 'CLEAR'
                )
                """,
                deal_id,
            )
        return bool(exists)

    # -----------------------------------------------------------------------
    # BATCH EXPIRY (called by background job)
    # -----------------------------------------------------------------------

    async def expire_stale_searches(self) -> Dict[str, Any]:
        """
        Transition PENDING_SEARCH → EXPIRED for searches not started within 30 days.
        Called by daily background job.
        """
        expired_ids: List[UUID] = []

        async with self.db.acquire() as conn:
            stale = await conn.fetch(
                """
                SELECT id FROM title_searches
                WHERE status = 'PENDING_SEARCH'
                  AND created_at < NOW() - INTERVAL '30 days'
                """
            )
            if not stale:
                return {"success": True, "expired_count": 0}

            for row in stale:
                sid = row["id"]
                async with conn.transaction():
                    await conn.execute(
                        """
                        UPDATE title_searches SET status = 'EXPIRED' WHERE id = $1
                        """,
                        sid,
                    )
                    await self.events.log_event(
                        entity_type="TITLE_SEARCH",
                        entity_id=sid,
                        event_type="STATUS_CHANGED",
                        actor_type="SYSTEM",
                        from_status="PENDING_SEARCH",
                        to_status="EXPIRED",
                        metadata={"reason": "30_day_inactivity"},
                        conn=conn,
                    )
                expired_ids.append(sid)

        return {"success": True, "expired_count": len(expired_ids)}

    # -----------------------------------------------------------------------
    # QUERIES
    # -----------------------------------------------------------------------

    async def get_searches_for_deal(self, deal_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT ts.*, u.full_name AS initiated_by_name
                FROM title_searches ts
                LEFT JOIN users u ON u.id = ts.initiated_by
                WHERE ts.deal_id = $1
                ORDER BY ts.created_at DESC
                """,
                deal_id,
            )
        return {
            "success": True,
            "searches": [self._format_search(r) for r in rows],
            "title_clear": any(r["status"] == "CLEAR" for r in rows),
        }

    async def get_search_detail(self, search_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT ts.*, u.full_name AS initiated_by_name
                FROM title_searches ts
                LEFT JOIN users u ON u.id = ts.initiated_by
                WHERE ts.id = $1
                """,
                search_id,
            )
        if not row:
            return {"success": False, "error": "Title search not found"}

        events = await self.events.get_events("TITLE_SEARCH", search_id)
        return {
            "success": True,
            "title_search": self._format_search(row),
            "timeline": events,
        }

    # -----------------------------------------------------------------------
    # HELPERS
    # -----------------------------------------------------------------------

    def _check_field_guards(
        self,
        to_status: str,
        meta: Dict[str, Any],
        search: asyncpg.Record,
    ) -> Optional[str]:
        if to_status == "CLEAR":
            if not meta.get("report_url") and not search.get("report_url"):
                return "report_url is required to mark a title search as CLEAR"
        elif to_status == "ENCUMBRANCES_FOUND":
            if not meta.get("encumbrance_notes") and not search.get("encumbrance_notes"):
                return "encumbrance_notes is required when ENCUMBRANCES_FOUND"
        elif to_status == "REJECTED":
            if not meta.get("rejection_reason"):
                return "rejection_reason is required to REJECT a title search"
        elif to_status == "RESOLUTION_IN_PROGRESS":
            if not meta.get("resolution_plan"):
                return "resolution_plan is required to start RESOLUTION_IN_PROGRESS"
        return None

    def _format_search(self, row: asyncpg.Record) -> Dict[str, Any]:
        def _parse_jsonb(val: Any) -> Any:
            if val is None:
                return None
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return val
            return val

        return {
            "id": str(row["id"]),
            "deal_id": str(row["deal_id"]) if row["deal_id"] else None,
            "transaction_id": str(row["transaction_id"]) if row.get("transaction_id") else None,
            "agency_name": row["agency_name"],
            "checker_name": row["checker_name"],
            "status": row["status"],
            "initiated_by": str(row["initiated_by"]) if row.get("initiated_by") else None,
            "initiated_by_name": row.get("initiated_by_name"),
            "report_url": row.get("report_url"),
            "encumbrance_notes": row.get("encumbrance_notes"),
            "encumbrance_details": _parse_jsonb(row.get("encumbrance_details")),
            "rejection_reason": row.get("rejection_reason"),
            "resolution_plan": row.get("resolution_plan"),
            "resolution_notes": row.get("resolution_notes"),
            "clearance_docs": _parse_jsonb(row.get("clearance_docs")),
            "resolved_by": str(row["resolved_by"]) if row.get("resolved_by") else None,
            "resolved_at": row["resolved_at"].isoformat() if row.get("resolved_at") else None,
            "started_at": row["started_at"].isoformat() if row.get("started_at") else None,
            "completed_at": row["completed_at"].isoformat() if row.get("completed_at") else None,
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
