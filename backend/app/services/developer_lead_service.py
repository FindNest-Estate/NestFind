"""
Developer Lead Service — Capture and manage buyer leads.
"""
import json
from uuid import UUID
from typing import Optional


class DeveloperLeadService:
    def __init__(self, pool):
        self.pool = pool

    async def create_lead(self, developer_id: UUID, buyer_id: Optional[UUID], data: dict) -> dict:
        """Capture a new lead."""
        try:
            async with self.pool.acquire() as conn:
                lead = await conn.fetchrow(
                    """
                    INSERT INTO dev_leads (
                        developer_id, buyer_id, project_id, unit_id,
                        name, phone, email, source, lead_status
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'NEW')
                    RETURNING *
                    """,
                    developer_id,
                    buyer_id,
                    data.get("project_id"),
                    data.get("unit_id"),
                    data.get("name"),
                    data.get("phone"),
                    data.get("email"),
                    data.get("source", "INTEREST_CLICK"),
                )
                return {"success": True, "data": dict(lead)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_leads(
        self,
        developer_id: UUID,
        project_id: Optional[UUID] = None,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """List leads with optional filters."""
        try:
            offset = (page - 1) * per_page
            filters = ["l.developer_id = $1"]
            params = [developer_id]
            idx = 2

            if project_id:
                filters.append(f"l.project_id = ${idx}")
                params.append(project_id)
                idx += 1
            if status:
                filters.append(f"l.lead_status = ${idx}")
                params.append(status)
                idx += 1

            where = " AND ".join(filters)

            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"SELECT COUNT(*) FROM dev_leads l WHERE {where}", *params
                )
                rows = await conn.fetch(
                    f"""
                    SELECT l.*,
                        p.project_name,
                        u.unit_number,
                        a.name AS assigned_agent_name
                    FROM dev_leads l
                    LEFT JOIN dev_projects p ON p.id = l.project_id
                    LEFT JOIN dev_units u ON u.id = l.unit_id
                    LEFT JOIN dev_agents a ON a.id = l.assigned_agent_id
                    WHERE {where}
                    ORDER BY l.created_at DESC
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

    async def update_lead(
        self, lead_id: UUID, developer_id: UUID, data: dict
    ) -> dict:
        """Update lead status, visit date, or assignment."""
        try:
            allowed = ["lead_status", "visit_date", "visit_notes", "assigned_agent_id"]
            updates = {k: v for k, v in data.items() if k in allowed and v is not None}
            if not updates:
                return {"success": False, "error": "No fields to update"}

            set_clauses = []
            params = [lead_id, developer_id]
            idx = 3
            for key, val in updates.items():
                set_clauses.append(f"{key} = ${idx}")
                params.append(val)
                idx += 1

            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE dev_leads
                    SET {', '.join(set_clauses)}, updated_at = NOW()
                    WHERE id = $1 AND developer_id = $2
                    RETURNING *
                    """,
                    *params
                )
                if not row:
                    return {"success": False, "error": "Lead not found or access denied"}
                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_lead(self, lead_id: UUID, developer_id: UUID) -> dict:
        """Get a single lead."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT l.*, p.project_name, u.unit_number
                    FROM dev_leads l
                    LEFT JOIN dev_projects p ON p.id = l.project_id
                    LEFT JOIN dev_units u ON u.id = l.unit_id
                    WHERE l.id = $1 AND l.developer_id = $2
                    """,
                    lead_id, developer_id
                )
                if not row:
                    return {"success": False, "error": "Lead not found"}
                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}
