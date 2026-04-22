"""
Developer Deal Service — Pipeline management with automation rules.

Pipeline stages:
  DEAL_STARTED → VISIT_SCHEDULED → OFFER_SUBMITTED → IN_NEGOTIATION
  → PRICE_AGREED → AWAITING_TOKEN → TOKEN_PAID → AGREEMENT_SIGNED
  → AT_REGISTRATION → COMPLETED → COMMISSION_RELEASED | CANCELLED

Automation rules:
  - Offer accepted → RESERVED, deal created with 48h token deadline
  - Token paid → BOOKED
  - Registration complete → SOLD, deal = COMPLETED
  - Completed → release agent commission
  - Token deadline expired → cancel deal, revert to AVAILABLE
"""
import json
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional


# Valid forward transitions for the deal pipeline
VALID_TRANSITIONS = {
    "DEAL_STARTED": ["VISIT_SCHEDULED", "OFFER_SUBMITTED", "CANCELLED"],
    "VISIT_SCHEDULED": ["OFFER_SUBMITTED", "IN_NEGOTIATION", "CANCELLED"],
    "OFFER_SUBMITTED": ["IN_NEGOTIATION", "CANCELLED"],
    "IN_NEGOTIATION": ["PRICE_AGREED", "CANCELLED"],
    "PRICE_AGREED": ["AWAITING_TOKEN", "CANCELLED"],
    "AWAITING_TOKEN": ["TOKEN_PAID", "CANCELLED"],
    "TOKEN_PAID": ["AGREEMENT_SIGNED", "CANCELLED"],
    "AGREEMENT_SIGNED": ["AT_REGISTRATION", "CANCELLED"],
    "AT_REGISTRATION": ["COMPLETED", "CANCELLED"],
    "COMPLETED": ["COMMISSION_RELEASED"],
    "COMMISSION_RELEASED": [],
    "CANCELLED": [],
}


class DeveloperDealService:
    def __init__(self, pool):
        self.pool = pool

    async def list_deals(
        self,
        developer_id: UUID,
        stage: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """List deals for developer with optional stage filter."""
        try:
            offset = (page - 1) * per_page
            filters = ["d.developer_id = $1"]
            params = [developer_id]
            idx = 2

            if stage:
                filters.append(f"d.deal_stage = ${idx}")
                params.append(stage)
                idx += 1

            where = " AND ".join(filters)

            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"SELECT COUNT(*) FROM dev_deals d WHERE {where}", *params
                )
                rows = await conn.fetch(
                    f"""
                    SELECT d.*,
                        u.unit_number, p.project_name,
                        buyer.full_name AS buyer_name,
                        ag.name AS agent_name
                    FROM dev_deals d
                    JOIN dev_units u ON u.id = d.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN users buyer ON buyer.id = d.buyer_id
                    LEFT JOIN dev_agents ag ON ag.agent_user_id = d.agent_id
                    WHERE {where}
                    ORDER BY d.created_at DESC
                    LIMIT ${idx} OFFSET ${idx+1}
                    """,
                    *params, per_page, offset
                )

            return {
                "success": True,
                "data": [dict(r) for r in rows],
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_deal(self, deal_id: UUID, developer_id: UUID) -> dict:
        """Get deal with history."""
        try:
            async with self.pool.acquire() as conn:
                deal = await conn.fetchrow(
                    """
                    SELECT d.*,
                        u.unit_number, p.project_name,
                        buyer.full_name AS buyer_name,
                        ag.name AS agent_name
                    FROM dev_deals d
                    JOIN dev_units u ON u.id = d.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN users buyer ON buyer.id = d.buyer_id
                    LEFT JOIN dev_agents ag ON ag.agent_user_id = d.agent_id
                    WHERE d.id = $1 AND d.developer_id = $2
                    """,
                    deal_id, developer_id
                )
                if not deal:
                    return {"success": False, "error": "Deal not found or access denied"}

                history = await conn.fetch(
                    "SELECT * FROM dev_deal_history WHERE deal_id = $1 ORDER BY created_at ASC",
                    deal_id
                )

                data = dict(deal)
                data["history"] = [dict(h) for h in history]
                return {"success": True, "data": data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_stage(
        self,
        deal_id: UUID,
        developer_id: UUID,
        new_stage: str,
        actor_id: UUID,
        notes: Optional[str] = None,
        token_amount: Optional[float] = None,
        agreement_date=None,
        registration_date=None,
    ) -> dict:
        """Advance deal to next stage with automation rules."""
        try:
            async with self.pool.acquire() as conn:
                deal = await conn.fetchrow(
                    "SELECT * FROM dev_deals WHERE id = $1 AND developer_id = $2",
                    deal_id, developer_id
                )
                if not deal:
                    return {"success": False, "error": "Deal not found or access denied"}

                current_stage = deal["deal_stage"]

                # Validate transition
                allowed_next = VALID_TRANSITIONS.get(current_stage, [])
                if new_stage not in allowed_next:
                    return {
                        "success": False,
                        "error": f"Cannot transition from '{current_stage}' to '{new_stage}'. "
                                  f"Allowed: {allowed_next}"
                    }

                # Build update
                updates = {"deal_stage": new_stage, "updated_at": "NOW()"}
                extra_sets = ["deal_stage = $3", "updated_at = NOW()"]
                params = [deal_id, developer_id, new_stage]
                idx = 4

                # Stage-specific automation
                unit_status_update = None
                commission_action = None

                if new_stage == "AWAITING_TOKEN":
                    # Start 48hr token deadline
                    dev_settings = await conn.fetchrow(
                        "SELECT settings FROM developer_profiles WHERE user_id = $1",
                        developer_id
                    )
                    deadline_hours = 48
                    if dev_settings and dev_settings["settings"]:
                        settings = dev_settings["settings"]
                        deadline_hours = settings.get("token_deadline_hours", 48)

                    deadline = datetime.now(timezone.utc) + timedelta(hours=deadline_hours)
                    extra_sets.append(f"token_deadline = ${idx}")
                    params.append(deadline)
                    idx += 1

                elif new_stage == "TOKEN_PAID":
                    # Unit → BOOKED
                    unit_status_update = "BOOKED"
                    if token_amount:
                        extra_sets.append(f"token_amount = ${idx}")
                        params.append(token_amount)
                        idx += 1

                elif new_stage == "AGREEMENT_SIGNED":
                    if agreement_date:
                        extra_sets.append(f"agreement_date = ${idx}")
                        params.append(agreement_date)
                        idx += 1

                elif new_stage == "COMPLETED":
                    # Unit → SOLD
                    unit_status_update = "SOLD"
                    if registration_date:
                        extra_sets.append(f"registration_date = ${idx}")
                        params.append(registration_date)
                        idx += 1

                elif new_stage == "COMMISSION_RELEASED":
                    commission_action = True

                elif new_stage == "CANCELLED":
                    extra_sets.append(f"cancelled_at = NOW()")
                    if notes:
                        extra_sets.append(f"cancellation_reason = ${idx}")
                        params.append(notes)
                        idx += 1

                # Execute update
                set_clause = ", ".join(extra_sets)
                await conn.execute(
                    f"UPDATE dev_deals SET {set_clause} WHERE id = $1 AND developer_id = $2",
                    *params
                )

                # Apply unit status update
                if unit_status_update:
                    await conn.execute(
                        "UPDATE dev_units SET status = $1, updated_at = NOW() WHERE id = $2",
                        unit_status_update, deal["unit_id"]
                    )

                # Release commission
                if commission_action and deal["agent_id"] and deal["commission_amount"]:
                    await conn.execute(
                        "UPDATE dev_deals SET commission_released = TRUE WHERE id = $1",
                        deal_id
                    )

                # If cancelled — revert unit to AVAILABLE
                if new_stage == "CANCELLED":
                    await conn.execute(
                        """
                        UPDATE dev_units
                        SET status = 'AVAILABLE', updated_at = NOW()
                        WHERE id = $1 AND status IN ('RESERVED','NEGOTIATION')
                        """,
                        deal["unit_id"]
                    )

                # Record history
                await conn.execute(
                    """
                    INSERT INTO dev_deal_history (deal_id, from_stage, to_stage, actor_id, notes)
                    VALUES ($1,$2,$3,$4,$5)
                    """,
                    deal_id, current_stage, new_stage, actor_id, notes
                )

                await self._audit(
                    conn, developer_id, actor_id, f"DEAL_STAGE_{new_stage}",
                    "dev_deals", deal_id,
                    {"from_stage": current_stage, "to_stage": new_stage}
                )

                return {
                    "success": True,
                    "message": f"Deal advanced to {new_stage}",
                    "from_stage": current_stage,
                    "to_stage": new_stage,
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def expire_token_deadlines(self) -> dict:
        """
        Scheduled job: expire deals where token_deadline has passed
        and stage is still AWAITING_TOKEN.
        """
        try:
            async with self.pool.acquire() as conn:
                expired_deals = await conn.fetch(
                    """
                    SELECT id, unit_id, developer_id FROM dev_deals
                    WHERE deal_stage = 'AWAITING_TOKEN'
                      AND token_deadline < NOW()
                      AND cancelled_at IS NULL
                    """
                )

                count = 0
                for deal in expired_deals:
                    # Cancel the deal
                    await conn.execute(
                        """
                        UPDATE dev_deals
                        SET deal_stage = 'CANCELLED',
                            cancelled_at = NOW(),
                            cancellation_reason = 'Token payment deadline expired (48 hours)',
                            updated_at = NOW()
                        WHERE id = $1
                        """,
                        deal["id"]
                    )

                    # Revert unit to AVAILABLE
                    await conn.execute(
                        """
                        UPDATE dev_units
                        SET status = 'AVAILABLE', updated_at = NOW()
                        WHERE id = $1
                        """,
                        deal["unit_id"]
                    )

                    # Log history
                    await conn.execute(
                        """
                        INSERT INTO dev_deal_history
                            (deal_id, from_stage, to_stage, actor_id, notes)
                        VALUES ($1,'AWAITING_TOKEN','CANCELLED',NULL,'Token payment deadline expired')
                        """,
                        deal["id"]
                    )

                    count += 1

                return {"success": True, "expired_count": count}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_pipeline_counts(self, developer_id: UUID) -> dict:
        """Get deal count per stage for the Kanban board."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT deal_stage, COUNT(*) AS count
                    FROM dev_deals
                    WHERE developer_id = $1 AND cancelled_at IS NULL
                    GROUP BY deal_stage
                    """,
                    developer_id
                )
            return {
                "success": True,
                "data": {r["deal_stage"]: r["count"] for r in rows}
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def assign_agent(
        self,
        deal_id: UUID,
        developer_id: UUID,
        agent_id: UUID,
        commission_amount: Optional[float] = None,
    ) -> dict:
        """Assign an agent to a deal and optionally set commission."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    UPDATE dev_deals
                    SET agent_id = $3, commission_amount = $4, updated_at = NOW()
                    WHERE id = $1 AND developer_id = $2
                    RETURNING id
                    """,
                    deal_id, developer_id, agent_id, commission_amount
                )
                if not row:
                    return {"success": False, "error": "Deal not found or access denied"}
                return {"success": True, "message": "Agent assigned to deal"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _audit(self, conn, developer_id, actor_id, action, entity_type, entity_id, details=None):
        await conn.execute(
            """
            INSERT INTO dev_audit_logs (developer_id, actor_id, action, entity_type, entity_id, details)
            VALUES ($1,$2,$3,$4,$5,$6::jsonb)
            """,
            developer_id, actor_id, action, entity_type, entity_id,
            json.dumps(details or {})
        )
