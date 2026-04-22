"""
Visualization Service — Assembles master plan data for the public viewer.
All public (unauthenticated) endpoints for project exploration.
"""
import json
from uuid import UUID
from typing import Optional


class VisualizationService:
    def __init__(self, pool):
        self.pool = pool

    async def get_master_plan(self, project_id: UUID) -> dict:
        """
        Assemble the complete master plan data for a project.
        Returns all polygons, buildings, amenities, roads, and unit summary.
        Used by the public interactive viewer.
        """
        try:
            async with self.pool.acquire() as conn:
                # 1. Get project info
                project = await conn.fetchrow(
                    """
                    SELECT id, project_name, project_type, status, location, city, state,
                           latitude, longitude, total_land_area, total_units,
                           description, amenities as amenity_list,
                           master_layout, master_plan_type, viewport_config,
                           visualization_enabled, master_plan_svg,
                           launch_date, possession_date, rera_number
                    FROM dev_projects
                    WHERE id = $1 AND is_deleted = FALSE
                    """,
                    project_id
                )
                if not project:
                    return {"success": False, "error": "Project not found"}

                if not project["visualization_enabled"]:
                    return {"success": False, "error": "Visualization not enabled for this project"}

                project_data = dict(project)
                # Parse JSONB fields
                for field in ["amenity_list", "viewport_config"]:
                    if isinstance(project_data.get(field), str):
                        project_data[field] = json.loads(project_data[field])

                viewport = project_data.get("viewport_config") or {"width": 1, "height": 1, "background_color": "#f0f4f0"}

                # 2. Get all polygons with linked entity data
                polygon_rows = await conn.fetch(
                    """
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
                    ORDER BY p.z_order, p.polygon_type, p.label
                    """,
                    project_id
                )

                polygons = []
                for r in polygon_rows:
                    d = dict(r)
                    for f in ["coordinates", "style", "metadata"]:
                        if isinstance(d.get(f), str):
                            d[f] = json.loads(d[f])
                    polygons.append(d)

                # 3. Get buildings
                building_rows = await conn.fetch(
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
                buildings = [dict(r) for r in building_rows]

                # 4. Get amenities
                amenity_rows = await conn.fetch(
                    """
                    SELECT * FROM dev_amenities
                    WHERE project_id = $1 AND is_active = TRUE
                    ORDER BY amenity_type, name
                    """,
                    project_id
                )
                amenities = [dict(r) for r in amenity_rows]

                # 5. Get roads
                road_rows = await conn.fetch(
                    """
                    SELECT * FROM dev_roads
                    WHERE project_id = $1 AND is_active = TRUE
                    ORDER BY road_type, road_name
                    """,
                    project_id
                )
                roads = []
                for r in road_rows:
                    d = dict(r)
                    for f in ["path_points", "style", "metadata"]:
                        if isinstance(d.get(f), str):
                            d[f] = json.loads(d[f])
                    roads.append(d)

                # 6. Unit summary
                summary = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available,
                        COUNT(*) FILTER (WHERE status = 'RESERVED') as reserved,
                        COUNT(*) FILTER (WHERE status IN ('SOLD', 'BOOKED')) as sold,
                        COUNT(*) FILTER (WHERE status = 'NEGOTIATION') as negotiation,
                        COUNT(*) as total
                    FROM dev_units
                    WHERE project_id = $1 AND is_deleted = FALSE
                    """,
                    project_id
                )

                return {
                    "success": True,
                    "data": {
                        "project": {
                            "id": str(project_data["id"]),
                            "name": project_data["project_name"],
                            "type": project_data["project_type"],
                            "status": project_data["status"],
                            "location": project_data["location"],
                            "city": project_data.get("city"),
                            "total_units": project_data["total_units"],
                            "description": project_data.get("description"),
                            "rera_number": project_data.get("rera_number"),
                        },
                        "viewport": viewport,
                        "polygons": polygons,
                        "buildings": buildings,
                        "amenities": amenities,
                        "roads": roads,
                        "units_summary": dict(summary) if summary else {},
                        "master_plan_image": project_data.get("master_layout"),
                        "master_plan_svg": project_data.get("master_plan_svg"),
                    }
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_building_detail(self, project_id: UUID, building_id: UUID) -> dict:
        """Get building detail with floors and units for the 3D/floor viewer."""
        try:
            async with self.pool.acquire() as conn:
                building = await conn.fetchrow(
                    """
                    SELECT b.* FROM dev_buildings b
                    WHERE b.id = $1 AND b.project_id = $2 AND b.is_deleted = FALSE
                    """,
                    building_id, project_id
                )
                if not building:
                    return {"success": False, "error": "Building not found"}

                floors = await conn.fetch(
                    """
                    SELECT f.*,
                        (SELECT json_agg(json_build_object(
                            'id', u.id, 'unit_number', u.unit_number, 'status', u.status,
                            'unit_type', u.unit_type, 'price', u.price, 'area_sqft', u.area_sqft,
                            'facing', u.facing, 'bedrooms', u.bedrooms, 'bathrooms', u.bathrooms,
                            'coordinates', u.coordinates
                        ) ORDER BY u.unit_number)
                        FROM dev_units u WHERE u.floor_id = f.id AND u.is_deleted = FALSE
                        ) as units
                    FROM dev_floors f
                    WHERE f.building_id = $1 AND f.is_active = TRUE
                    ORDER BY f.floor_number
                    """,
                    building_id
                )

                building_data = dict(building)
                building_data["floors"] = []
                for f in floors:
                    fd = dict(f)
                    if isinstance(fd.get("units"), str):
                        fd["units"] = json.loads(fd["units"])
                    building_data["floors"].append(fd)

                return {"success": True, "data": building_data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_unit_detail(self, project_id: UUID, unit_id: UUID) -> dict:
        """Get full unit detail for the detail panel."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT u.*,
                        p.project_name, p.location as project_location, p.city as project_city,
                        b.building_name, b.facing as building_facing,
                        f.floor_label
                    FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN dev_buildings b ON b.id = u.building_id
                    LEFT JOIN dev_floors f ON f.id = u.floor_id
                    WHERE u.id = $1 AND u.project_id = $2 AND u.is_deleted = FALSE
                    """,
                    unit_id, project_id
                )
                if not row:
                    return {"success": False, "error": "Unit not found"}

                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_public_projects(self, city: Optional[str] = None, project_type: Optional[str] = None, page: int = 1, per_page: int = 20) -> dict:
        """List projects that have visualization enabled, for public browsing."""
        try:
            async with self.pool.acquire() as conn:
                query = """
                    SELECT p.id, p.project_name, p.project_type, p.status,
                           p.location, p.city, p.state, p.latitude, p.longitude,
                           p.total_land_area, p.total_units, p.description,
                           p.project_images, p.master_layout, p.visualization_enabled,
                           p.launch_date, p.possession_date, p.rera_number,
                           dp.company_name as developer_name, dp.logo_url as developer_logo,
                           COALESCE(
                               (SELECT COUNT(*) FROM dev_units u WHERE u.project_id = p.id AND u.status = 'AVAILABLE' AND u.is_deleted = FALSE), 0
                           ) as available_units,
                           COALESCE(
                               (SELECT COUNT(*) FROM dev_buildings b WHERE b.project_id = p.id AND b.is_deleted = FALSE), 0
                           ) as building_count
                    FROM dev_projects p
                    LEFT JOIN developer_profiles dp ON dp.user_id = p.developer_id AND dp.status = 'APPROVED'
                    WHERE p.is_deleted = FALSE AND p.visualization_enabled = TRUE
                """
                params = []
                idx = 1

                if city:
                    query += f" AND LOWER(p.city) = LOWER(${idx})"
                    params.append(city)
                    idx += 1
                if project_type:
                    query += f" AND p.project_type = ${idx}"
                    params.append(project_type)
                    idx += 1

                # Count total
                count_query = f"SELECT COUNT(*) FROM ({query}) sq"
                total = await conn.fetchval(count_query, *params)

                # Paginate
                offset = (page - 1) * per_page
                query += f" ORDER BY p.created_at DESC LIMIT ${idx} OFFSET ${idx + 1}"
                params.extend([per_page, offset])

                rows = await conn.fetch(query, *params)

                projects = []
                for r in rows:
                    d = dict(r)
                    if isinstance(d.get("project_images"), str):
                        d["project_images"] = json.loads(d["project_images"])
                    projects.append(d)

                return {
                    "success": True,
                    "data": projects,
                    "total": total,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": (total + per_page - 1) // per_page if total else 0
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
