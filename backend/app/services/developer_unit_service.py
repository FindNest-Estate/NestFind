"""
Developer Unit Service — Unit CRUD + CSV/Excel bulk upload.

Architecture:
- Units belong to a project, developer must own the project
- Status machine enforced (can't manually set SOLD without a deal)
- Bulk upload parses CSV rows into units
"""
import csv
import io
import json
from uuid import UUID
from typing import Optional, List


ALLOWED_STATUSES = {"AVAILABLE", "BLOCKED"}
# These statuses are managed by the system (offer/deal events), not manually
SYSTEM_MANAGED_STATUSES = {"NEGOTIATION", "RESERVED", "BOOKED", "SOLD"}


class DeveloperUnitService:
    def __init__(self, pool):
        self.pool = pool

    async def _verify_project_ownership(self, conn, project_id: UUID, developer_id: UUID) -> bool:
        """Ensure the developer owns this project."""
        row = await conn.fetchrow(
            "SELECT id FROM dev_projects WHERE id = $1 AND developer_id = $2 AND is_deleted = FALSE",
            project_id, developer_id
        )
        return row is not None

    async def create_unit(self, developer_id: UUID, data: dict) -> dict:
        """Create a single unit."""
        try:
            async with self.pool.acquire() as conn:
                if not await self._verify_project_ownership(conn, data["project_id"], developer_id):
                    return {"success": False, "error": "Project not found or access denied"}

                unit = await conn.fetchrow(
                    """
                    INSERT INTO dev_units (
                        project_id, unit_number, unit_type, area_sqft, price,
                        facing, floor, bedrooms, bathrooms, parking, status,
                        corner_plot, land_area, built_up_area, garden_area
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                    RETURNING *
                    """,
                    data["project_id"],
                    data["unit_number"],
                    data["unit_type"],
                    data.get("area_sqft"),
                    data["price"],
                    data.get("facing"),
                    data.get("floor"),
                    data.get("bedrooms"),
                    data.get("bathrooms"),
                    data.get("parking", 0),
                    data.get("status", "AVAILABLE"),
                    data.get("corner_plot", False),
                    data.get("land_area"),
                    data.get("built_up_area"),
                    data.get("garden_area"),
                )

                await self._audit(conn, developer_id, "UNIT_CREATED", "dev_units", unit["id"])

                return {"success": True, "data": dict(unit)}
        except Exception as e:
            if "unique" in str(e).lower():
                return {"success": False, "error": f"Unit number '{data.get('unit_number')}' already exists in this project"}
            return {"success": False, "error": str(e)}

    async def list_units(
        self,
        developer_id: UUID,
        project_id: Optional[UUID] = None,
        status: Optional[str] = None,
        unit_type: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """List units with filters."""
        try:
            offset = (page - 1) * per_page
            filters = ["p.developer_id = $1", "u.is_deleted = FALSE", "p.is_deleted = FALSE"]
            params = [developer_id]
            idx = 2

            if project_id:
                filters.append(f"u.project_id = ${idx}")
                params.append(project_id)
                idx += 1
            if status:
                filters.append(f"u.status = ${idx}")
                params.append(status)
                idx += 1
            if unit_type:
                filters.append(f"u.unit_type = ${idx}")
                params.append(unit_type)
                idx += 1

            where = " AND ".join(filters)

            async with self.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"""
                    SELECT COUNT(*) FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE {where}
                    """,
                    *params
                )
                rows = await conn.fetch(
                    f"""
                    SELECT u.*, p.project_name,
                        COUNT(o.id) FILTER (WHERE o.status IN ('PENDING','UNDER_REVIEW','COUNTERED')) AS active_offer_count
                    FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN dev_offers o ON o.unit_id = u.id
                    WHERE {where}
                    GROUP BY u.id, p.project_name
                    ORDER BY u.unit_number ASC
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

    async def get_unit(self, unit_id: UUID, developer_id: UUID) -> dict:
        """Get unit detail."""
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT u.*, p.project_name, p.developer_id
                    FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE u.id = $1 AND u.is_deleted = FALSE
                    """,
                    unit_id
                )
                if not row:
                    return {"success": False, "error": "Unit not found"}
                if row["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}
                return {"success": True, "data": dict(row)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_unit(self, unit_id: UUID, developer_id: UUID, data: dict) -> dict:
        """Update unit. System-managed statuses cannot be set manually."""
        try:
            # Block manual setting of system-managed statuses
            requested_status = data.get("status")
            if requested_status and requested_status in SYSTEM_MANAGED_STATUSES:
                return {
                    "success": False,
                    "error": f"Status '{requested_status}' is managed by the system. It changes automatically via offers and deals."
                }

            allowed = ["unit_number", "unit_type", "area_sqft", "price",
                       "facing", "floor", "bedrooms", "bathrooms", "parking", "status",
                       "corner_plot", "land_area", "built_up_area", "garden_area"]
            updates = {k: v for k, v in data.items() if k in allowed and v is not None}
            if not updates:
                return {"success": False, "error": "No fields to update"}

            set_clauses = []
            params = [unit_id]
            idx = 2
            for key, val in updates.items():
                set_clauses.append(f"{key} = ${idx}")
                params.append(val)
                idx += 1

            async with self.pool.acquire() as conn:
                # Verify ownership
                existing = await conn.fetchrow(
                    """
                    SELECT u.id, p.developer_id FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE u.id = $1 AND u.is_deleted = FALSE
                    """,
                    unit_id
                )
                if not existing:
                    return {"success": False, "error": "Unit not found"}
                if existing["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}

                row = await conn.fetchrow(
                    f"""
                    UPDATE dev_units
                    SET {', '.join(set_clauses)}, updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                    """,
                    *params
                )
                await self._audit(conn, developer_id, "UNIT_UPDATED", "dev_units", unit_id,
                                  {"updated_fields": list(updates.keys())})
                return {"success": True, "data": dict(row)}
        except Exception as e:
            if "unique" in str(e).lower():
                return {"success": False, "error": "Unit number already exists in this project"}
            return {"success": False, "error": str(e)}

    async def delete_unit(self, unit_id: UUID, developer_id: UUID) -> dict:
        """Soft-delete a unit (only if AVAILABLE or BLOCKED)."""
        try:
            async with self.pool.acquire() as conn:
                existing = await conn.fetchrow(
                    """
                    SELECT u.id, u.status, p.developer_id FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE u.id = $1 AND u.is_deleted = FALSE
                    """,
                    unit_id
                )
                if not existing:
                    return {"success": False, "error": "Unit not found"}
                if existing["developer_id"] != developer_id:
                    return {"success": False, "error": "Access denied"}
                if existing["status"] not in ("AVAILABLE", "BLOCKED"):
                    return {"success": False, "error": f"Cannot delete unit with status '{existing['status']}'"}

                await conn.execute(
                    "UPDATE dev_units SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
                    unit_id
                )
                return {"success": True, "message": "Unit deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def bulk_upload_csv(
        self, developer_id: UUID, project_id: UUID, csv_content: bytes
    ) -> dict:
        """
        Parse CSV and bulk-insert units.

        Expected CSV columns (header row required):
        unit_number, unit_type, area_sqft, price, facing, floor, bedrooms, bathrooms, parking
        """
        try:
            async with self.pool.acquire() as conn:
                if not await self._verify_project_ownership(conn, project_id, developer_id):
                    return {"success": False, "error": "Project not found or access denied"}

                # Parse CSV
                text = csv_content.decode("utf-8-sig")  # Handle BOM
                reader = csv.DictReader(io.StringIO(text))

                REQUIRED = {"unit_number", "unit_type", "price"}
                # Optional: area_sqft, facing, floor, bedrooms, bathrooms, parking, 
                # corner_plot, land_area, built_up_area, garden_area
                if not reader.fieldnames or not REQUIRED.issubset(set(reader.fieldnames)):
                    return {
                        "success": False,
                        "error": f"CSV must have columns: {', '.join(REQUIRED)}. "
                                  f"Optional: area_sqft, facing, floor, bedrooms, bathrooms, parking"
                    }

                rows = []
                errors = []
                for i, row in enumerate(reader, start=2):  # line 1 = header
                    try:
                        rows.append({
                            "project_id": project_id,
                            "unit_number": row["unit_number"].strip(),
                            "unit_type": row["unit_type"].strip(),
                            "area_sqft": float(row["area_sqft"]) if row.get("area_sqft") else None,
                            "price": float(row["price"]),
                            "facing": row.get("facing", "").strip() or None,
                            "floor": int(row["floor"]) if row.get("floor") else None,
                            "bedrooms": int(row["bedrooms"]) if row.get("bedrooms") else None,
                            "bathrooms": int(row["bathrooms"]) if row.get("bathrooms") else None,
                            "parking": int(row.get("parking", 0) or 0),
                            "corner_plot": row.get("corner_plot", "").lower() == "true",
                            "land_area": float(row["land_area"]) if row.get("land_area") else None,
                            "built_up_area": float(row["built_up_area"]) if row.get("built_up_area") else None,
                            "garden_area": float(row["garden_area"]) if row.get("garden_area") else None,
                        })
                    except (ValueError, KeyError) as e:
                        errors.append(f"Row {i}: {str(e)}")

                if errors:
                    return {"success": False, "error": "Validation errors", "row_errors": errors}

                if not rows:
                    return {"success": False, "error": "No valid rows found in CSV"}

                # Bulk insert using COPY-style executemany
                inserted = 0
                skipped = 0
                for r in rows:
                    try:
                        await conn.execute(
                            """
                            INSERT INTO dev_units (
                                project_id, unit_number, unit_type, area_sqft, price,
                                facing, floor, bedrooms, bathrooms, parking, status,
                                corner_plot, land_area, built_up_area, garden_area
                            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                            ON CONFLICT (project_id, unit_number) DO NOTHING
                            """,
                            r["project_id"], r["unit_number"], r["unit_type"],
                            r["area_sqft"], r["price"], r["facing"], r["floor"],
                            r["bedrooms"], r["bathrooms"], r["parking"], 'AVAILABLE',
                            r["corner_plot"], r["land_area"], r["built_up_area"], r["garden_area"]
                        )
                        inserted += 1
                    except Exception:
                        skipped += 1

                await self._audit(
                    conn, developer_id, "UNIT_BULK_UPLOAD", "dev_projects", project_id,
                    {"total_rows": len(rows), "inserted": inserted, "skipped": skipped}
                )

                return {
                    "success": True,
                    "message": f"Upload complete",
                    "inserted": inserted,
                    "skipped": skipped,
                    "total_rows": len(rows),
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _audit(self, conn, developer_id, action, entity_type, entity_id, details=None):
        await conn.execute(
            """
            INSERT INTO dev_audit_logs (developer_id, actor_id, action, entity_type, entity_id, details)
            VALUES ($1,$1,$2,$3,$4,$5::jsonb)
            """,
            developer_id, action, entity_type, entity_id, json.dumps(details or {})
        )
