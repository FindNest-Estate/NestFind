from typing import Dict, Any, Optional, List
from uuid import UUID
import asyncpg
import json


class DisputeService:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool

    async def raise_dispute(
        self,
        deal_id: UUID,
        raised_by_id: UUID,
        dispute_type: str,
        description: str,
        evidence_urls: Optional[List[str]] = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Dict[str, Any]:
        """
        Creates a new dispute and AUTOMATICALLY FREEZES the deal.
        Phase 5A: Also freezes commission if in an active lifecycle state.
        """
        valid_types = [
            "BOOKING_PROOF_DISPUTED",
            "AMOUNT_MISMATCH",
            "COMMISSION_DISPUTE",
            "DOCUMENT_INCOMPLETE",
            "OTHER",
            # Phase 5A additions
            "AGENT_MISCONDUCT",
            "PAYMENT_NOT_RECEIVED",
            "FORFEITURE_DISPUTE",
        ]
        if dispute_type not in valid_types:
            return {"success": False, "error": f"Invalid dispute type. Must be one of {valid_types}"}

        evidence = evidence_urls or []

        async def _execute(connection: asyncpg.Connection) -> Dict[str, Any]:
            deal = await connection.fetchrow(
                """
                SELECT id, buyer_id, seller_id, agent_id
                FROM deals
                WHERE id = $1
                """,
                deal_id,
            )
            if not deal:
                return {"success": False, "error": "Deal not found"}

            is_participant = raised_by_id in (deal["buyer_id"], deal["seller_id"], deal["agent_id"])
            if not is_participant:
                return {"success": False, "error": "Only deal participants can raise disputes"}

            dispute = await connection.fetchrow(
                """
                INSERT INTO disputes (
                    deal_id, raised_by_id, dispute_type, status,
                    description, evidence_urls_jsonb
                )
                VALUES ($1, $2, $3, 'OPEN', $4, $5)
                RETURNING id
                """,
                deal_id,
                raised_by_id,
                dispute_type,
                description,
                json.dumps(evidence),
            )

            await connection.execute(
                """
                UPDATE deals
                SET is_frozen = TRUE,
                    freeze_reason = $2
                WHERE id = $1
                """,
                deal_id,
                f"Auto-frozen due to Open Dispute ({dispute_type})",
            )

            return {
                "success": True,
                "dispute_id": dispute["id"],
                "message": "Dispute raised and deal frozen.",
            }

        if conn:
            result = await _execute(conn)
        else:
            async with self.db.acquire() as acquired_conn:
                async with acquired_conn.transaction():
                    result = await _execute(acquired_conn)

        # Phase 5A: Freeze commission if in active lifecycle state
        if result.get("success"):
            try:
                from .commission_service import CommissionService

                commission_svc = CommissionService(self.db)
                await commission_svc.handle_dispute_raised(deal_id)
            except Exception:
                pass  # Non-blocking hook

        return result

    async def resolve_dispute(
        self,
        dispute_id: UUID,
        resolution_status: str,  # RESOLVED, REJECTED
        admin_notes: str,
        resolution_entry_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Admin resolves a dispute.
        If ALL disputes for the deal are closed, unfreezes the deal.
        Phase 5A: Also unfreezes commission and resets cooling-off.
        """
        if resolution_status not in ["RESOLVED", "REJECTED"]:
            return {"success": False, "error": "Invalid resolution status"}

        async with self.db.acquire() as conn:
            async with conn.transaction():
                dispute = await conn.fetchrow(
                    """
                    UPDATE disputes
                    SET status = $2,
                        admin_notes = $3,
                        resolution_entry_id = $4,
                        resolved_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                    RETURNING deal_id
                    """,
                    dispute_id,
                    resolution_status,
                    admin_notes,
                    resolution_entry_id,
                )

                if not dispute:
                    return {"success": False, "error": "Dispute not found"}

                deal_id = dispute["deal_id"]

                open_count = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM disputes
                    WHERE deal_id = $1 AND status IN ('OPEN', 'UNDER_REVIEW')
                    """,
                    deal_id,
                )

                if open_count == 0:
                    await conn.execute(
                        """
                        UPDATE deals
                        SET is_frozen = FALSE,
                            freeze_reason = NULL
                        WHERE id = $1
                        """,
                        deal_id,
                    )

                    try:
                        from .commission_service import CommissionService

                        commission_svc = CommissionService(self.db)
                        await commission_svc.handle_dispute_resolved(deal_id)
                    except Exception:
                        pass  # Non-blocking hook

                    return {
                        "success": True,
                        "status": resolution_status,
                        "deal_unfrozen": True,
                    }

                return {
                    "success": True,
                    "status": resolution_status,
                    "deal_unfrozen": False,
                }

    async def update_status(
        self,
        dispute_id: UUID,
        status: str,
        admin_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update dispute status to OPEN/UNDER_REVIEW/RESOLVED/REJECTED."""
        valid_statuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]
        if status not in valid_statuses:
            return {"success": False, "error": "Invalid status"}

        async with self.db.acquire() as conn:
            if admin_notes is None:
                current_notes = await conn.fetchval(
                    "SELECT admin_notes FROM disputes WHERE id = $1", dispute_id
                )
                if current_notes is None:
                    exists = await conn.fetchval("SELECT 1 FROM disputes WHERE id = $1", dispute_id)
                    if not exists:
                        return {"success": False, "error": "Dispute not found"}
                admin_notes = current_notes

            row = await conn.fetchrow(
                """
                UPDATE disputes
                SET status = $2,
                    admin_notes = $3,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING id
                """,
                dispute_id,
                status,
                admin_notes,
            )

            if not row:
                return {"success": False, "error": "Dispute not found"}

            return {"success": True, "status": status}

    async def toggle_freeze(self, deal_id: UUID, freeze: bool, reason: Optional[str] = None) -> Dict[str, Any]:
        """Manual Admin Override to freeze/unfreeze actions."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE deals
                SET is_frozen = $2,
                    freeze_reason = $3
                WHERE id = $1
                RETURNING id
                """,
                deal_id,
                freeze,
                reason if freeze else None,
            )

            if not row:
                return {"success": False, "error": "Deal not found"}

            return {"success": True, "is_frozen": freeze}

    async def get_disputes_for_deal(self, deal_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT d.id, d.dispute_type, d.status, d.description,
                       d.created_at, d.admin_notes, d.evidence_urls_jsonb,
                       u.full_name as raised_by_name, u.role as raised_by_role
                FROM disputes d
                JOIN users u ON u.id = d.raised_by_id
                WHERE d.deal_id = $1
                ORDER BY d.created_at DESC
                """,
                deal_id,
            )

            return {
                "success": True,
                "disputes": [
                    {
                        "id": str(r["id"]),
                        "type": r["dispute_type"],
                        "status": r["status"],
                        "description": r["description"],
                        "raised_by_name": r["raised_by_name"],
                        "raised_by_role": r["raised_by_role"],
                        "created_at": r["created_at"].isoformat(),
                        "admin_notes": r["admin_notes"],
                        "evidence_urls": json.loads(r["evidence_urls_jsonb"]) if r["evidence_urls_jsonb"] else [],
                    }
                    for r in rows
                ],
            }

    async def get_all_disputes(self) -> Dict[str, Any]:
        """Admin: Get all disputes across all deals."""
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT d.id, d.deal_id, d.dispute_type, d.status, d.description,
                       d.created_at, d.evidence_urls_jsonb,
                       u.full_name as raised_by_name, u.role as raised_by_role
                FROM disputes d
                JOIN users u ON u.id = d.raised_by_id
                WHERE d.deal_id IS NOT NULL
                ORDER BY d.created_at DESC
                """
            )

            return {
                "success": True,
                "disputes": [
                    {
                        "id": str(r["id"]),
                        "deal_id": str(r["deal_id"]),
                        "type": r["dispute_type"],
                        "status": r["status"],
                        "description": r["description"],
                        "raised_by_name": r["raised_by_name"],
                        "raised_by_role": r["raised_by_role"],
                        "created_at": r["created_at"].isoformat(),
                        "evidence_urls": json.loads(r["evidence_urls_jsonb"]) if r["evidence_urls_jsonb"] else [],
                    }
                    for r in rows
                ],
            }

    async def get_dispute_by_id(self, dispute_id: UUID) -> Dict[str, Any]:
        """Get single dispute details."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT d.id, d.deal_id, d.dispute_type, d.status, d.description,
                       d.admin_notes, d.created_at, d.resolved_at, d.evidence_urls_jsonb,
                       u.full_name as raised_by_name, u.role as raised_by_role,
                       deal.buyer_id, deal.seller_id, deal.agent_id,
                       deal.is_frozen, deal.freeze_reason
                FROM disputes d
                JOIN users u ON u.id = d.raised_by_id
                JOIN deals deal ON deal.id = d.deal_id
                WHERE d.id = $1
                """,
                dispute_id,
            )

            if not row:
                return {"success": False, "error": "Dispute not found"}

            return {
                "success": True,
                "dispute": {
                    "id": str(row["id"]),
                    "deal_id": str(row["deal_id"]),
                    "type": row["dispute_type"],
                    "status": row["status"],
                    "description": row["description"],
                    "admin_notes": row["admin_notes"],
                    "created_at": row["created_at"].isoformat(),
                    "resolved_at": row["resolved_at"].isoformat() if row["resolved_at"] else None,
                    "raised_by_name": row["raised_by_name"],
                    "raised_by_role": row["raised_by_role"],
                    "evidence_urls": json.loads(row["evidence_urls_jsonb"]) if row["evidence_urls_jsonb"] else [],
                    "deal_info": {
                        "is_frozen": row["is_frozen"],
                        "freeze_reason": row["freeze_reason"],
                    },
                },
            }
