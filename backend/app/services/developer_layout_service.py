"""
Developer Layout Service — Manages interactive map mapping.
"""
import json
from uuid import UUID
from typing import List, Optional


class DeveloperLayoutService:
    def __init__(self, pool):
        self.pool = pool

    async def save_mappings(self, developer_id: UUID, project_id: UUID, mappings: List[dict]) -> dict:
        """
        Save or update unit mappings for a project layout.
        Mappings: List of {unit_id, x, y, width, height, shape_type}
        """
        try:
            async with self.pool.acquire() as conn:
                # Verify project ownership
                project = await conn.fetchrow(
                    "SELECT id FROM dev_projects WHERE id = $1 AND developer_id = $2 AND is_deleted = FALSE",
                    project_id, developer_id
                )
                if not project:
                    return {"success": False, "error": "Project not found or access denied"}

                async with conn.transaction():
                    # Clear existing mappings for this project? 
                    # Actually, better to do an upsert per unit or clear all for project.
                    # User said: "Each clickable area corresponds to a unit in the database."
                    # We'll do an upsert style logic.
                    
                    results = []
                    for m in mappings:
                        unit_id = UUID(str(m["unit_id"]))
                        row = await conn.fetchrow(
                            """
                            INSERT INTO dev_layout_units (
                                project_id, unit_id, x, y, width, height, shape_type, updated_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                            ON CONFLICT (unit_id) DO UPDATE SET
                                x = EXCLUDED.x,
                                y = EXCLUDED.y,
                                width = EXCLUDED.width,
                                height = EXCLUDED.height,
                                shape_type = EXCLUDED.shape_type,
                                updated_at = NOW()
                            RETURNING *
                            """,
                            project_id, unit_id, m["x"], m["y"], m["width"], m["height"], m.get("shape_type", "rect")
                        )
                        results.append(dict(row))

                return {"success": True, "count": len(results), "data": results}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_layout_inventory(self, project_id: UUID) -> dict:
        """Get all unit mappings for a project layout, including current status."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT 
                        l.id, l.unit_id, l.x, l.y, l.width, l.height, l.shape_type,
                        u.unit_number, u.status, u.unit_type, u.price
                    FROM dev_layout_units l
                    JOIN dev_units u ON u.id = l.unit_id
                    WHERE l.project_id = $1 AND u.is_deleted = FALSE
                    """,
                    project_id
                )
                return {"success": True, "data": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_mapping(self, developer_id: UUID, mapping_id: UUID) -> dict:
        """Delete a specific unit mapping."""
        try:
            async with self.pool.acquire() as conn:
                # Verify ownership
                row = await conn.fetchrow(
                    """
                    SELECT l.id, p.developer_id 
                    FROM dev_layout_units l
                    JOIN dev_projects p ON p.id = l.project_id
                    WHERE l.id = $1
                    """,
                    mapping_id
                )
                if not row:
                    return {"success": False, "error": "Mapping not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                await conn.execute("DELETE FROM dev_layout_units WHERE id = $1", mapping_id)
                return {"success": True, "message": "Mapping deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}
