"""
Notifications Service - Manages in-app notifications.
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import asyncpg
from ..core.sse_manager import sse_manager


class NotificationsService:
    """
    Service for managing user notifications.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def create_notification(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        body: Optional[str] = None,
        link: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new notification for a user."""
        async with self.db.acquire() as conn:
            notif_id = await conn.fetchval(
                """
                INSERT INTO notifications (user_id, type, title, body, link)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
                """,
                user_id,
                notification_type,
                title,
                body,
                link
            )
            
            
            # Broadcast real-time event
            notification_data = {
                "id": str(notif_id),
                "type": notification_type,
                "title": title,
                "body": body,
                "link": link,
                "created_at": datetime.utcnow().isoformat()
            }
            await sse_manager.broadcast(user_id, "NOTIFICATION_NEW", notification_data)

            return {"success": True, "notification_id": str(notif_id)}
    
    async def get_notifications(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 20,
        unread_only: bool = False
    ) -> Dict[str, Any]:
        """Get notifications for a user."""
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build query
            where_clause = "user_id = $1"
            if unread_only:
                where_clause += " AND read_at IS NULL"
            
            # Count
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM notifications WHERE {where_clause}",
                user_id
            )
            
            # Get notifications
            rows = await conn.fetch(
                f"""
                SELECT id, type, title, body, link, read_at, created_at
                FROM notifications
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                user_id,
                per_page,
                offset
            )
            
            notifications = [
                {
                    "id": str(row["id"]),
                    "type": row["type"],
                    "title": row["title"],
                    "body": row["body"],
                    "link": row["link"],
                    "is_read": row["read_at"] is not None,
                    "created_at": row["created_at"].isoformat()
                }
                for row in rows
            ]
            
            return {
                "success": True,
                "notifications": notifications,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "has_more": (page * per_page) < total
                }
            }
    
    async def get_unread_count(self, user_id: UUID) -> int:
        """Get count of unread notifications."""
        async with self.db.acquire() as conn:
            return await conn.fetchval(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL",
                user_id
            )
    
    async def mark_read(
        self,
        notification_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Mark a single notification as read."""
        async with self.db.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE notifications SET read_at = NOW()
                WHERE id = $1 AND user_id = $2 AND read_at IS NULL
                """,
                notification_id,
                user_id
            )
            
            return {"success": True}
    
    async def mark_all_read(self, user_id: UUID) -> Dict[str, Any]:
        """Mark all notifications as read for a user."""
        async with self.db.acquire() as conn:
            await conn.execute(
                """
                UPDATE notifications SET read_at = NOW()
                WHERE user_id = $1 AND read_at IS NULL
                """,
                user_id
            )
            
            return {"success": True}
