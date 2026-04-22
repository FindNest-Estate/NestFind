"""
Developer Building Service — CRUD for buildings and floors.
"""
import json
from uuid import UUID
from typing import List, Optional


class DeveloperBuildingService:
    def __init__(self, pool):
        self.pool = pool

    # -----------------------------------------------------------------------
    # BUILDINGS
    # -----------------------------------------------------------------------

    async def create_building(self, developer_id: UUID, data: dict) -> dict:
        """Create a building/tower within a project."""
        try:
            async with self.pool.acquire() as conn:
                # Verify project ownership
                project = await conn.fetchrow(
                    "SELECT id FROM dev_projects WHERE id = $1 AND developer_id = $2 AND is_deleted = FALSE",
                    data["project_id"], developer_id
                )
                if not project:
                    return {"success": False, "error": "Project not found or access denied"}

                row = await conn.fetchrow(
                    """
                    INSERT INTO dev_buildings (
                        project_id, building_name, building_code,
                        position_x, position_y,
                        total_floors, units_per_floor, ground_floor_label,
                        facing, model_url, facade_image, description
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                    """,
                    data["project_id"],
                    data["building_name"],
                    data.get("building_code"),
                    data.get("position_x", 0.5),
                    data.get("position_y", 0.5),
                    data.get("total_floors", 1),
                    data.get("units_per_floor", 4),
                    data.get("ground_floor_label", "Ground"),
                    data.get("facing", "NORTH"),
                    data.get("model_url"),
                    data.get("facade_image"),
                    data.get("description"),
                )
                return {"success": True, "data": dict(row)}
        except Exception as e:
            if "unique" in str(e).lower():
                return {"success": False, "error": f"Building '{data['building_name']}' already exists in this project"}
            return {"success": False, "error": str(e)}

    async def list_buildings(self, developer_id: UUID, project_id: UUID) -> dict:
        """List all buildings for a project."""
        try:
            async with self.pool.acquire() as conn:
                # Verify ownership
                project = await conn.fetchrow(
                    "SELECT id FROM dev_projects WHERE id = $1 AND developer_id = $2 AND is_deleted = FALSE",
                    project_id, developer_id
                )
                if not project:
                    return {"success": False, "error": "Project not found or access denied"}

                rows = await conn.fetch(
                    """
                    SELECT b.*,
                        COALESCE((SELECT COUNT(*) FROM dev_units u WHERE u.building_id = b.id AND u.is_deleted = FALSE), 0) as total_units,
                        COALESCE((SELECT COUNT(*) FROM dev_units u WHERE u.building_id = b.id AND u.status = 'AVAILABLE' AND u.is_deleted = FALSE), 0) as available_units,
                        COALESCE((SELECT COUNT(*) FROM dev_units u WHERE u.building_id = b.id AND u.status = 'SOLD' AND u.is_deleted = FALSE), 0) as sold_units
                    FROM dev_buildings b
                    WHERE b.project_id = $1 AND b.is_deleted = FALSE
                    ORDER BY b.building_name
                    """,
                    project_id
                )
                return {"success": True, "data": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_building(self, building_id: UUID, developer_id: UUID) -> dict:
        """Get a building with its floors."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT b.*, p.developer_id
                    FROM dev_buildings b
                    JOIN dev_projects p ON p.id = b.project_id
                    WHERE b.id = $1 AND b.is_deleted = FALSE
                    """,
                    building_id
                )
                if not row:
                    return {"success": False, "error": "Building not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                # Fetch floors
                floors = await conn.fetch(
                    """
                    SELECT f.*,
                        (SELECT json_agg(json_build_object(
                            'id', u.id, 'unit_number', u.unit_number, 'status', u.status,
                            'unit_type', u.unit_type, 'price', u.price, 'area_sqft', u.area_sqft,
                            'facing', u.facing, 'bedrooms', u.bedrooms, 'coordinates', u.coordinates
                        ))
                        FROM dev_units u WHERE u.floor_id = f.id AND u.is_deleted = FALSE
                        ) as units
                    FROM dev_floors f
                    WHERE f.building_id = $1 AND f.is_active = TRUE
                    ORDER BY f.floor_number
                    """,
                    building_id
                )

                building = dict(row)
                building.pop("developer_id", None)
                building["floors"] = [dict(f) for f in floors]

                return {"success": True, "data": building}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_building(self, building_id: UUID, developer_id: UUID, data: dict) -> dict:
        """Update a building."""
        try:
            async with self.pool.acquire() as conn:
                # Verify ownership
                row = await conn.fetchrow(
                    """
                    SELECT b.id, p.developer_id
                    FROM dev_buildings b JOIN dev_projects p ON p.id = b.project_id
                    WHERE b.id = $1 AND b.is_deleted = FALSE
                    """,
                    building_id
                )
                if not row:
                    return {"success": False, "error": "Building not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                # Dynamic update
                set_clauses = []
                values = []
                idx = 2  # $1 is building_id
                for key, val in data.items():
                    set_clauses.append(f"{key} = ${idx}")
                    values.append(val)
                    idx += 1

                if not set_clauses:
                    return {"success": False, "error": "No fields to update"}

                set_clauses.append(f"updated_at = NOW()")
                query = f"UPDATE dev_buildings SET {', '.join(set_clauses)} WHERE id = $1 RETURNING *"
                updated = await conn.fetchrow(query, building_id, *values)
                return {"success": True, "data": dict(updated)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def delete_building(self, building_id: UUID, developer_id: UUID) -> dict:
        """Soft-delete a building."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT b.id, p.developer_id
                    FROM dev_buildings b JOIN dev_projects p ON p.id = b.project_id
                    WHERE b.id = $1 AND b.is_deleted = FALSE
                    """,
                    building_id
                )
                if not row:
                    return {"success": False, "error": "Building not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                await conn.execute(
                    "UPDATE dev_buildings SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
                    building_id
                )
                return {"success": True, "message": "Building deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # -----------------------------------------------------------------------
    # FLOORS
    # -----------------------------------------------------------------------

    async def create_floor(self, developer_id: UUID, data: dict) -> dict:
        """Create a floor within a building."""
        try:
            async with self.pool.acquire() as conn:
                # Verify ownership
                building = await conn.fetchrow(
                    """
                    SELECT b.id FROM dev_buildings b
                    JOIN dev_projects p ON p.id = b.project_id
                    WHERE b.id = $1 AND p.developer_id = $2 AND b.is_deleted = FALSE
                    """,
                    data["building_id"], developer_id
                )
                if not building:
                    return {"success": False, "error": "Building not found or access denied"}

                row = await conn.fetchrow(
                    """
                    INSERT INTO dev_floors (
                        building_id, floor_number, floor_label, layout_image, total_units
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                    """,
                    data["building_id"],
                    data["floor_number"],
                    data.get("floor_label", f"Floor {data['floor_number']}"),
                    data.get("layout_image"),
                    data.get("total_units", 0),
                )
                return {"success": True, "data": dict(row)}
        except Exception as e:
            if "unique" in str(e).lower():
                return {"success": False, "error": f"Floor {data['floor_number']} already exists in this building"}
            return {"success": False, "error": str(e)}

    async def list_floors(self, building_id: UUID) -> dict:
        """List all floors for a building."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT f.*,
                        (SELECT json_agg(json_build_object(
                            'id', u.id, 'unit_number', u.unit_number, 'status', u.status,
                            'unit_type', u.unit_type, 'price', u.price, 'area_sqft', u.area_sqft,
                            'facing', u.facing, 'bedrooms', u.bedrooms
                        ))
                        FROM dev_units u WHERE u.floor_id = f.id AND u.is_deleted = FALSE
                        ) as units
                    FROM dev_floors f
                    WHERE f.building_id = $1 AND f.is_active = TRUE
                    ORDER BY f.floor_number
                    """,
                    building_id
                )
                return {"success": True, "data": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def auto_generate_floors(self, developer_id: UUID, building_id: UUID) -> dict:
        """Auto-generate floors based on building's total_floors setting."""
        try:
            async with self.pool.acquire() as conn:
                building = await conn.fetchrow(
                    """
                    SELECT b.*, p.developer_id FROM dev_buildings b
                    JOIN dev_projects p ON p.id = b.project_id
                    WHERE b.id = $1 AND b.is_deleted = FALSE
                    """,
                    building_id
                )
                if not building:
                    return {"success": False, "error": "Building not found"}
                if building["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                created = []
                for i in range(building["total_floors"]):
                    label = building.get("ground_floor_label", "Ground") if i == 0 else f"Floor {i}"
                    try:
                        row = await conn.fetchrow(
                            """
                            INSERT INTO dev_floors (building_id, floor_number, floor_label, total_units)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (building_id, floor_number) DO NOTHING
                            RETURNING *
                            """,
                            building_id, i, label, building.get("units_per_floor", 4)
                        )
                        if row:
                            created.append(dict(row))
                    except Exception:
                        pass

                return {"success": True, "data": created, "count": len(created)}
        except Exception as e:
            return {"success": False, "error": str(e)}
