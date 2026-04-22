"""
Developer Project Service — CRUD for real estate projects.

Architecture:
- All methods return {success: bool, error?: str, data?: ...}
- Ownership enforced: developer can only touch their own projects
- Soft delete only (is_deleted flag)
"""
import json
from uuid import UUID
from typing import Optional


class DeveloperProjectService:
    def __init__(self, pool):
        self.pool = pool

    async def create_project(self, developer_id: UUID, data: dict) -> dict:
        """Create a new real estate project."""
        try:
            async with self.pool.acquire() as conn:
                project = await conn.fetchrow(
                    """
                    INSERT INTO dev_projects (
                        developer_id, project_name, project_type, status,
                        location, city, state, pincode,
                        latitude, longitude, total_land_area, total_units,
                        launch_date, possession_date, rera_number,
                        description, amenities, brochure_pdf, master_layout,
                        pricing_rules, auction_settings, current_step
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8,
                        $9, $10, $11, $12, $13, $14, $15,
                        $16, $17::jsonb, $18, $19,
                        $20::jsonb, $21::jsonb, $22
                    ) RETURNING *
                    """,
                    developer_id,
                    data["project_name"],
                    data["project_type"],
                    data.get("status", "UPCOMING"),
                    data["location"],
                    data.get("city"),
                    data.get("state"),
                    data.get("pincode"),
                    data.get("latitude"),
                    data.get("longitude"),
                    data.get("total_land_area"),
                    data.get("total_units", 0),
                    data.get("launch_date"),
                    data.get("possession_date"),
                    data.get("rera_number"),
                    data.get("description"),
                    json.dumps(data.get("amenities", [])),
                    data.get("brochure_pdf"),
                    data.get("master_layout"),
                    json.dumps(data.get("pricing_rules", {
                        "base_price": 0, "floor_rise": 0, "corner_plot_premium": 0,
                        "east_facing_premium": 0, "west_facing_premium": 0,
                        "north_facing_premium": 0, "south_facing_premium": 0,
                        "parking_charges": 0, "amenity_charges": 0
                    })),
                    json.dumps(data.get("auction_settings", {
                        "is_auction_mode": False, "deadline_hours": 24,
                        "min_bid_increment": 1000, "auto_accept_threshold_pct": 100
                    })),
                    data.get("current_step", 1)
                )

                await self._audit(
                    conn, developer_id, developer_id, "PROJECT_CREATED",
                    "dev_projects", project["id"]
                )

                return {"success": True, "data": dict(project)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_projects(
        self,
        developer_id: UUID,
        status: Optional[str] = None,
        project_type: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """List developer's projects with pagination and filters."""
        try:
            offset = (page - 1) * per_page
            filters = ["p.developer_id = $1", "p.is_deleted = FALSE"]
            params = [developer_id]
            idx = 2

            if status:
                filters.append(f"p.status = ${idx}")
                params.append(status)
                idx += 1
            if project_type:
                filters.append(f"p.project_type = ${idx}")
                params.append(project_type)
                idx += 1

            where = " AND ".join(filters)

            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"SELECT COUNT(*) FROM dev_projects p WHERE {where}", *params
                )
                rows = await conn.fetch(
                    f"""
                    SELECT p.*,
                        COUNT(u.id) FILTER (WHERE u.status = 'AVAILABLE' AND u.is_deleted = FALSE) AS available_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'SOLD' AND u.is_deleted = FALSE) AS sold_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'BOOKED' AND u.is_deleted = FALSE) AS booked_units
                    FROM dev_projects p
                    LEFT JOIN dev_units u ON u.project_id = p.id
                    WHERE {where}
                    GROUP BY p.id
                    ORDER BY p.created_at DESC
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

    async def get_project(self, project_id: UUID, developer_id: UUID) -> dict:
        """Get a single project with unit summary."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT p.*,
                        COUNT(u.id) FILTER (WHERE u.status = 'AVAILABLE' AND u.is_deleted = FALSE) AS available_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'SOLD' AND u.is_deleted = FALSE) AS sold_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'BOOKED' AND u.is_deleted = FALSE) AS booked_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'NEGOTIATION' AND u.is_deleted = FALSE) AS negotiation_units
                    FROM dev_projects p
                    LEFT JOIN dev_units u ON u.project_id = p.id
                    WHERE p.id = $1 AND p.is_deleted = FALSE
                    GROUP BY p.id
                    """,
                    project_id
                )

                if not row:
                    return {"success": False, "error": "Project not found"}

                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_project(
        self, project_id: UUID, developer_id: UUID, data: dict
    ) -> dict:
        """Update project fields."""
        try:
            # Build SET clause dynamically
            allowed = [
                "project_name", "project_type", "status", "location", "city",
                "state", "pincode", "latitude", "longitude", "total_land_area",
                "total_units", "launch_date", "possession_date", "rera_number",
                "description", "amenities", "brochure_pdf", "master_layout",
                "pricing_rules", "auction_settings", "current_step"
            ]
            updates = {k: v for k, v in data.items() if k in allowed and v is not None}
            if not updates:
                return {"success": False, "error": "No fields to update"}

            set_clauses = []
            params = [project_id, developer_id]
            idx = 3
            for key, val in updates.items():
                if key in ["amenities", "pricing_rules", "auction_settings"]:
                    set_clauses.append(f"{key} = ${idx}::jsonb")
                    params.append(json.dumps(val))
                else:
                    set_clauses.append(f"{key} = ${idx}")
                    params.append(val)
                idx += 1

            set_sql = ", ".join(set_clauses)

            async with self.pool.acquire() as conn:
                existing = await conn.fetchrow(
                    "SELECT id, developer_id FROM dev_projects WHERE id = $1 AND is_deleted = FALSE",
                    project_id
                )
                if not existing:
                    return {"success": False, "error": "Project not found"}
                if existing["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                row = await conn.fetchrow(
                    f"""
                    UPDATE dev_projects
                    SET {set_sql}, updated_at = NOW()
                    WHERE id = $1 AND developer_id = $2
                    RETURNING *
                    """,
                    *params
                )

                await self._audit(
                    conn, developer_id, developer_id, "PROJECT_UPDATED",
                    "dev_projects", project_id,
                    {"updated_fields": list(updates.keys())}
                )

                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_project(self, project_id: UUID, developer_id: UUID) -> dict:
        """Soft-delete a project."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT id, developer_id FROM dev_projects WHERE id = $1 AND is_deleted = FALSE",
                    project_id
                )
                if not row:
                    return {"success": False, "error": "Project not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                await conn.execute(
                    "UPDATE dev_projects SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
                    project_id
                )

                await self._audit(
                    conn, developer_id, developer_id, "PROJECT_DELETED",
                    "dev_projects", project_id
                )

                return {"success": True, "message": "Project deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def add_project_image(
        self, project_id: UUID, developer_id: UUID, image_url: str
    ) -> dict:
        """Append an image URL to project_images array."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT developer_id FROM dev_projects WHERE id = $1 AND is_deleted = FALSE",
                    project_id
                )
                if not row:
                    return {"success": False, "error": "Project not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                updated = await conn.fetchrow(
                    """
                    UPDATE dev_projects
                    SET project_images = project_images || $2::jsonb,
                        updated_at = NOW()
                    WHERE id = $1
                    RETURNING project_images
                    """,
                    project_id,
                    json.dumps([image_url])
                )

                return {"success": True, "project_images": updated["project_images"]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    async def _audit(
        self, conn, developer_id, actor_id, action, entity_type, entity_id,
        details: dict = None
    ):
        await conn.execute(
            """
            INSERT INTO dev_audit_logs
                (developer_id, actor_id, action, entity_type, entity_id, details)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            """,
            developer_id, actor_id, action, entity_type, entity_id,
            json.dumps(details or {})
        )
