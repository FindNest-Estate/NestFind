"""
Developer Analytics Service — KPI aggregations and chart data.
"""
from uuid import UUID


class DeveloperAnalyticsService:
    def __init__(self, pool):
        self.pool = pool

    async def get_summary(self, developer_id: UUID) -> dict:
        """Dashboard KPI summary."""
        try:
            async with self.pool.acquire() as conn:
                # Unit counts by status
                unit_stats = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(u.id) AS total_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'AVAILABLE') AS available_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'NEGOTIATION') AS negotiation_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'RESERVED') AS reserved_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'BOOKED') AS booked_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'SOLD') AS sold_units,
                        COUNT(u.id) FILTER (WHERE u.status = 'BLOCKED') AS blocked_units
                    FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE p.developer_id = $1
                      AND u.is_deleted = FALSE AND p.is_deleted = FALSE
                    """,
                    developer_id
                )

                # Project count
                project_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM dev_projects WHERE developer_id = $1 AND is_deleted = FALSE",
                    developer_id
                )

                # Active negotiations
                active_negotiations = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM dev_offers o
                    JOIN dev_units u ON u.id = o.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE p.developer_id = $1 AND o.status IN ('PENDING','UNDER_REVIEW','COUNTERED')
                    """,
                    developer_id
                )

                # Lead stats
                lead_stats = await conn.fetchrow(
                    """
                    SELECT COUNT(*) AS total_leads,
                           COUNT(*) FILTER (WHERE lead_status = 'NEW') AS new_leads
                    FROM dev_leads WHERE developer_id = $1
                    """,
                    developer_id
                )

                # Deal stats
                deal_stats = await conn.fetchrow(
                    """
                    SELECT COUNT(*) AS total_deals,
                           COUNT(*) FILTER (WHERE deal_stage NOT IN ('COMPLETED','CANCELLED','COMMISSION_RELEASED')) AS active_deals,
                           COUNT(*) FILTER (WHERE deal_stage IN ('COMPLETED','COMMISSION_RELEASED')) AS completed_deals,
                           COALESCE(SUM(final_price) FILTER (WHERE deal_stage IN ('COMPLETED','COMMISSION_RELEASED')), 0) AS revenue_generated,
                           COALESCE(SUM(commission_amount) FILTER (WHERE commission_released = TRUE), 0) AS total_commission_paid
                    FROM dev_deals WHERE developer_id = $1 AND cancelled_at IS NULL
                    """,
                    developer_id
                )

                return {
                    "success": True,
                    "data": {
                        "total_projects": project_count,
                        "total_units": unit_stats["total_units"] or 0,
                        "available_units": unit_stats["available_units"] or 0,
                        "negotiation_units": unit_stats["negotiation_units"] or 0,
                        "reserved_units": unit_stats["reserved_units"] or 0,
                        "booked_units": unit_stats["booked_units"] or 0,
                        "sold_units": unit_stats["sold_units"] or 0,
                        "blocked_units": unit_stats["blocked_units"] or 0,
                        "active_negotiations": active_negotiations or 0,
                        "total_leads": lead_stats["total_leads"] or 0,
                        "new_leads": lead_stats["new_leads"] or 0,
                        "total_deals": deal_stats["total_deals"] or 0,
                        "active_deals": deal_stats["active_deals"] or 0,
                        "completed_deals": deal_stats["completed_deals"] or 0,
                        "revenue_generated": float(deal_stats["revenue_generated"] or 0),
                        "total_commission_paid": float(deal_stats["total_commission_paid"] or 0),
                    }
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_leads_per_project(self, developer_id: UUID) -> dict:
        """Leads grouped by project for chart."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT p.id AS project_id, p.project_name,
                           COUNT(l.id) AS lead_count
                    FROM dev_projects p
                    LEFT JOIN dev_leads l ON l.project_id = p.id
                    WHERE p.developer_id = $1 AND p.is_deleted = FALSE
                    GROUP BY p.id, p.project_name
                    ORDER BY lead_count DESC
                    LIMIT 20
                    """,
                    developer_id
                )
            return {"success": True, "data": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_offers_per_unit(self, developer_id: UUID) -> dict:
        """Top units by offer count for chart."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT u.id AS unit_id, u.unit_number, p.project_name,
                           COUNT(o.id) AS offer_count,
                           MAX(o.offer_price) AS highest_offer
                    FROM dev_units u
                    JOIN dev_projects p ON p.id = u.project_id
                    LEFT JOIN dev_offers o ON o.unit_id = u.id
                    WHERE p.developer_id = $1
                      AND u.is_deleted = FALSE AND p.is_deleted = FALSE
                    GROUP BY u.id, u.unit_number, p.project_name
                    ORDER BY offer_count DESC
                    LIMIT 20
                    """,
                    developer_id
                )
            return {"success": True, "data": [dict(r) for r in rows]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_conversion_rate(self, developer_id: UUID) -> dict:
        """Lead-to-deal conversion funnel data."""
        try:
            async with self.pool.acquire() as conn:
                leads = await conn.fetchval(
                    "SELECT COUNT(*) FROM dev_leads WHERE developer_id = $1", developer_id
                )
                offers = await conn.fetchval(
                    """
                    SELECT COUNT(DISTINCT o.id)
                    FROM dev_offers o
                    JOIN dev_units u ON u.id = o.unit_id
                    JOIN dev_projects p ON p.id = u.project_id
                    WHERE p.developer_id = $1
                    """,
                    developer_id
                )
                deals_started = await conn.fetchval(
                    "SELECT COUNT(*) FROM dev_deals WHERE developer_id = $1", developer_id
                )
                deals_completed = await conn.fetchval(
                    "SELECT COUNT(*) FROM dev_deals WHERE developer_id = $1 AND deal_stage IN ('COMPLETED','COMMISSION_RELEASED')",
                    developer_id
                )

                total = max(leads or 1, 1)
                funnel = [
                    {"stage": "Leads", "count": leads or 0, "percentage": 100.0},
                    {"stage": "Offers Submitted", "count": offers or 0, "percentage": round((offers or 0) / total * 100, 1)},
                    {"stage": "Deals Started", "count": deals_started or 0, "percentage": round((deals_started or 0) / total * 100, 1)},
                    {"stage": "Deals Completed", "count": deals_completed or 0, "percentage": round((deals_completed or 0) / total * 100, 1)},
                ]

            return {"success": True, "data": funnel}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_revenue_timeline(self, developer_id: UUID, months: int = 12) -> dict:
        """Monthly revenue for the last N months."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT
                        DATE_TRUNC('month', created_at) AS month,
                        COUNT(*) AS deals_count,
                        COALESCE(SUM(final_price), 0) AS revenue
                    FROM dev_deals
                    WHERE developer_id = $1
                      AND deal_stage IN ('COMPLETED', 'COMMISSION_RELEASED')
                      AND created_at >= NOW() - INTERVAL '1 month' * $2
                    GROUP BY month
                    ORDER BY month ASC
                    """,
                    developer_id, months
                )
            return {
                "success": True,
                "data": [
                    {
                        "month": r["month"].strftime("%Y-%m"),
                        "deals_count": r["deals_count"],
                        "revenue": float(r["revenue"])
                    }
                    for r in rows
                ]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
