"""
Developer Polygon Service — CRUD for layout polygons + SVG/DXF import.
"""
import json
from uuid import UUID
from typing import List, Optional


class DeveloperPolygonService:
    def __init__(self, pool):
        self.pool = pool

    async def _verify_project(self, conn, project_id: UUID, developer_id: UUID):
        """Verify project ownership."""
        return await conn.fetchrow(
            "SELECT id FROM dev_projects WHERE id = $1 AND developer_id = $2 AND is_deleted = FALSE",
            project_id, developer_id
        )

    # -----------------------------------------------------------------------
    # POLYGONS
    # -----------------------------------------------------------------------

    async def create_polygon(self, developer_id: UUID, data: dict) -> dict:
        """Create a single layout polygon."""
        try:
            async with self.pool.acquire() as conn:
                if not await self._verify_project(conn, data["project_id"], developer_id):
                    return {"success": False, "error": "Project not found or access denied"}

                row = await conn.fetchrow(
                    """
                    INSERT INTO dev_layout_polygons (
                        project_id, polygon_type, label, layer_name,
                        coordinates, style, area_sqft, area_label,
                        linked_unit_id, linked_building_id, z_order, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                    """,
                    data["project_id"],
                    data["polygon_type"],
                    data.get("label"),
                    data.get("layer_name"),
                    json.dumps(data["coordinates"]),
                    json.dumps(data.get("style") or {}),
                    data.get("area_sqft"),
                    data.get("area_label"),
                    data.get("linked_unit_id"),
                    data.get("linked_building_id"),
                    data.get("z_order", 0),
                    json.dumps(data.get("metadata") or {}),
                )
                result = dict(row)
                # Parse JSONB fields
                if isinstance(result.get("coordinates"), str):
                    result["coordinates"] = json.loads(result["coordinates"])
                if isinstance(result.get("style"), str):
                    result["style"] = json.loads(result["style"])
                return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def bulk_create_polygons(self, developer_id: UUID, project_id: UUID, polygons: List[dict]) -> dict:
        """Create multiple layout polygons at once (for import)."""
        try:
            async with self.pool.acquire() as conn:
                if not await self._verify_project(conn, project_id, developer_id):
                    return {"success": False, "error": "Project not found or access denied"}

                created = []
                async with conn.transaction():
                    for p in polygons:
                        row = await conn.fetchrow(
                            """
                            INSERT INTO dev_layout_polygons (
                                project_id, polygon_type, label, layer_name,
                                coordinates, style, area_sqft, area_label,
                                linked_unit_id, linked_building_id, z_order, metadata
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                            RETURNING id, polygon_type, label
                            """,
                            project_id,
                            p.get("polygon_type", "PLOT"),
                            p.get("label"),
                            p.get("layer_name"),
                            json.dumps(p["coordinates"]),
                            json.dumps(p.get("style") or {}),
                            p.get("area_sqft"),
                            p.get("area_label"),
                            p.get("linked_unit_id"),
                            p.get("linked_building_id"),
                            p.get("z_order", 0),
                            json.dumps(p.get("metadata") or {}),
                        )
                        created.append(dict(row))

                    # Enable visualization on the project
                    await conn.execute(
                        "UPDATE dev_projects SET visualization_enabled = TRUE, updated_at = NOW() WHERE id = $1",
                        project_id
                    )

                return {"success": True, "data": created, "count": len(created)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_polygons(self, project_id: UUID, polygon_type: Optional[str] = None) -> dict:
        """List all polygons for a project, with linked entity data."""
        try:
            async with self.pool.acquire() as conn:
                query = """
                    SELECT
                        p.id, p.project_id, p.polygon_type::TEXT, p.label, p.layer_name,
                        p.coordinates, p.style, p.area_sqft, p.area_label,
                        p.linked_unit_id, p.linked_building_id,
                        p.z_order, p.metadata, p.created_at,
                        u.status as unit_status, u.unit_number, u.price as unit_price,
                        b.building_name
                    FROM dev_layout_polygons p
                    LEFT JOIN dev_units u ON u.id = p.linked_unit_id AND u.is_deleted = FALSE
                    LEFT JOIN dev_buildings b ON b.id = p.linked_building_id AND b.is_deleted = FALSE
                    WHERE p.project_id = $1 AND p.is_deleted = FALSE
                """
                params = [project_id]

                if polygon_type:
                    query += " AND p.polygon_type = $2"
                    params.append(polygon_type)

                query += " ORDER BY p.z_order, p.polygon_type, p.label"
                rows = await conn.fetch(query, *params)

                data = []
                for r in rows:
                    d = dict(r)
                    # Parse JSONB
                    if isinstance(d.get("coordinates"), str):
                        d["coordinates"] = json.loads(d["coordinates"])
                    if isinstance(d.get("style"), str):
                        d["style"] = json.loads(d["style"])
                    if isinstance(d.get("metadata"), str):
                        d["metadata"] = json.loads(d["metadata"])
                    data.append(d)

                return {"success": True, "data": data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_polygon(self, polygon_id: UUID, developer_id: UUID, data: dict) -> dict:
        """Update a single polygon."""
        try:
            async with self.pool.acquire() as conn:
                # Verify ownership
                row = await conn.fetchrow(
                    """
                    SELECT p.id, pr.developer_id
                    FROM dev_layout_polygons p
                    JOIN dev_projects pr ON pr.id = p.project_id
                    WHERE p.id = $1 AND p.is_deleted = FALSE
                    """,
                    polygon_id
                )
                if not row:
                    return {"success": False, "error": "Polygon not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                set_clauses = []
                values = []
                idx = 2
                for key, val in data.items():
                    if key in ("coordinates", "style", "metadata") and isinstance(val, (list, dict)):
                        val = json.dumps(val)
                    set_clauses.append(f"{key} = ${idx}")
                    values.append(val)
                    idx += 1

                if not set_clauses:
                    return {"success": False, "error": "No fields to update"}

                set_clauses.append("updated_at = NOW()")
                query = f"UPDATE dev_layout_polygons SET {', '.join(set_clauses)} WHERE id = $1 RETURNING *"
                updated = await conn.fetchrow(query, polygon_id, *values)
                result = dict(updated)
                if isinstance(result.get("coordinates"), str):
                    result["coordinates"] = json.loads(result["coordinates"])
                return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_polygon(self, polygon_id: UUID, developer_id: UUID) -> dict:
        """Soft-delete a polygon."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT p.id, pr.developer_id
                    FROM dev_layout_polygons p
                    JOIN dev_projects pr ON pr.id = p.project_id
                    WHERE p.id = $1 AND p.is_deleted = FALSE
                    """,
                    polygon_id
                )
                if not row:
                    return {"success": False, "error": "Polygon not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                await conn.execute(
                    "UPDATE dev_layout_polygons SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
                    polygon_id
                )
                return {"success": True, "message": "Polygon deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def clear_project_polygons(self, project_id: UUID, developer_id: UUID, polygon_type: Optional[str] = None) -> dict:
        """Clear all polygons of a given type (or all) for reimport."""
        try:
            async with self.pool.acquire() as conn:
                if not await self._verify_project(conn, project_id, developer_id):
                    return {"success": False, "error": "Project not found or access denied"}

                query = "UPDATE dev_layout_polygons SET is_deleted = TRUE, deleted_at = NOW() WHERE project_id = $1"
                params = [project_id]
                if polygon_type:
                    query += " AND polygon_type = $2"
                    params.append(polygon_type)

                result = await conn.execute(query, *params)
                count = int(result.split()[-1])
                return {"success": True, "deleted": count}
        except Exception as e:
            return {"success": False, "error": str(e)}
