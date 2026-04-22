"""
Developer Agent Service — Assign and manage agents for developer projects.
"""
import json
from uuid import UUID
from typing import Optional


class DeveloperAgentService:
    def __init__(self, pool):
        self.pool = pool

    async def create_agent(self, developer_id: UUID, data: dict) -> dict:
        """Assign or create an agent for the developer."""
        try:
            async with self.pool.acquire() as conn:
                agent = await conn.fetchrow(
                    """
                    INSERT INTO dev_agents (
                        developer_id, agent_user_id, name, phone, email,
                        commission_percentage, is_external
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
                    RETURNING *
                    """,
                    developer_id,
                    data.get("agent_user_id"),
                    data["name"],
                    data.get("phone"),
                    data.get("email"),
                    data.get("commission_percentage", 2.0),
                    data.get("is_external", False),
                )
                return {"success": True, "data": dict(agent)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_agents(
        self,
        developer_id: UUID,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """List developer's agents with deal stats."""
        try:
            offset = (page - 1) * per_page
            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    "SELECT COUNT(*) FROM dev_agents WHERE developer_id = $1 AND is_active = TRUE",
                    developer_id
                )
                rows = await conn.fetch(
                    """
                    SELECT a.*,
                        COUNT(d.id) AS deals_closed,
                        COALESCE(SUM(d.commission_amount) FILTER (WHERE d.commission_released = TRUE), 0) AS total_commission_earned
                    FROM dev_agents a
                    LEFT JOIN dev_deals d ON d.agent_id = a.agent_user_id AND d.developer_id = a.developer_id
                    WHERE a.developer_id = $1 AND a.is_active = TRUE
                    GROUP BY a.id
                    ORDER BY a.created_at DESC
                    LIMIT $2 OFFSET $3
                    """,
                    developer_id, per_page, offset
                )
            return {
                "success": True,
                "data": [dict(r) for r in rows],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_agent(
        self, agent_id: UUID, developer_id: UUID, data: dict
    ) -> dict:
        """Update agent info."""
        try:
            allowed = ["name", "phone", "email", "commission_percentage", "is_active"]
            updates = {k: v for k, v in data.items() if k in allowed and v is not None}
            if not updates:
                return {"success": False, "error": "No fields to update"}

            set_clauses = []
            params = [agent_id, developer_id]
            idx = 3
            for key, val in updates.items():
                set_clauses.append(f"{key} = ${idx}")
                params.append(val)
                idx += 1

            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE dev_agents
                    SET {', '.join(set_clauses)}, updated_at = NOW()
                    WHERE id = $1 AND developer_id = $2
                    RETURNING *
                    """,
                    *params
                )
                if not row:
                    return {"success": False, "error": "Agent not found or access denied"}
                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def remove_agent(self, agent_id: UUID, developer_id: UUID) -> dict:
        """Soft-deactivate an agent."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "UPDATE dev_agents SET is_active = FALSE WHERE id = $1 AND developer_id = $2 RETURNING id",
                    agent_id, developer_id
                )
                if not row:
                    return {"success": False, "error": "Agent not found or access denied"}
                return {"success": True, "message": "Agent removed"}
        except Exception as e:
            return {"success": False, "error": str(e)}
