"""
Analytics Service - Aggregates platform-wide metrics.
"""
from typing import Dict, Any, List
import asyncpg
from datetime import datetime, timedelta

class AnalyticsService:
    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def get_platform_overview(self) -> Dict[str, Any]:
        """
        Get high-level platform KPI metrics.
        """
        async with self.db.acquire() as conn:
            # 1. Total Revenue (Commission + Platform Fees)
            revenue = await conn.fetchrow("""
                SELECT 
                    COALESCE(SUM(platform_fee), 0) as total_revenue,
                    COALESCE(SUM(total_price), 0) as total_volume
                FROM transactions 
                WHERE status = 'COMPLETED'
            """)

            # 2. User Stats (join with user_roles and roles tables)
            users_count = await conn.fetchrow("""
                SELECT 
                    COUNT(*) FILTER (WHERE r.name = 'USER') as total_buyers,
                    COUNT(*) FILTER (WHERE r.name = 'AGENT') as total_agents
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
            """)

            # 3. Active Listings (properties that are ACTIVE or have accepted assignment)
            active_properties = await conn.fetchval("""
                SELECT COUNT(*) FROM properties WHERE status::text = 'ACTIVE'
            """)

            # 4. Pending Verifications (properties waiting for agent verification)
            pending_verifications = await conn.fetchval("""
                SELECT COUNT(*) FROM properties WHERE status::text IN ('PENDING_ASSIGNMENT', 'ASSIGNED', 'VERIFICATION_IN_PROGRESS')
            """)

            return {
                "total_revenue": float(revenue['total_revenue']) if revenue['total_revenue'] else 0.0,
                "transaction_volume": float(revenue['total_volume']) if revenue['total_volume'] else 0.0,
                "total_users": users_count['total_buyers'] if users_count['total_buyers'] else 0,
                "total_agents": users_count['total_agents'] if users_count['total_agents'] else 0,
                "active_listings": active_properties or 0,
                "pending_verifications": pending_verifications or 0
            }

    async def get_revenue_trends(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get daily revenue breakdown for the last N days.
        """
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    DATE(completed_at) as date,
                    SUM(platform_fee) as daily_revenue,
                    COUNT(*) as deal_count
                FROM transactions
                WHERE status = 'COMPLETED' 
                AND completed_at >= NOW() - INTERVAL '1 day' * $1
                GROUP BY DATE(completed_at)
                ORDER BY DATE(completed_at) ASC
            """, days)

            return [
                {
                    "date": row['date'].isoformat(),
                    "revenue": float(row['daily_revenue']) if row['daily_revenue'] else 0.0,
                    "deals": row['deal_count']
                }
                for row in rows
            ]

    async def get_user_growth(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get daily new user signups.
        """
        async with self.db.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    DATE(u.created_at) as date,
                    r.name as role,
                    COUNT(*) as count
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.created_at >= NOW() - INTERVAL '1 day' * $1
                GROUP BY DATE(u.created_at), r.name
                ORDER BY DATE(u.created_at) ASC
            """, days)

            return [
                {
                    "date": row['date'].isoformat(),
                    "role": row['role'],
                    "count": row['count']
                }
                for row in rows
            ]
