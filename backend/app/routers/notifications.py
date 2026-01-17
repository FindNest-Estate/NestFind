"""
Notifications Router - API endpoints for in-app notifications.

Endpoints:
- GET /notifications - List notifications
- GET /notifications/unread-count - Get unread count
- PUT /notifications/{id}/read - Mark notification read
- PUT /notifications/read-all - Mark all read
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from ..services.notifications_service import NotificationsService
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool
from ..core.sse_manager import sse_manager
from fastapi.responses import StreamingResponse
import asyncio


router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ============================================================================
# SCHEMAS
# ============================================================================

class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    pagination: dict


class UnreadCountResponse(BaseModel):
    count: int


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get notifications for current user."""
    service = NotificationsService(db_pool)
    result = await service.get_notifications(
        user_id=current_user.user_id,
        page=page,
        per_page=per_page,
        unread_only=unread_only
    )
    
    return NotificationListResponse(
        notifications=[NotificationItem(**n) for n in result["notifications"]],
        pagination=result["pagination"]
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get count of unread notifications."""
    service = NotificationsService(db_pool)
    count = await service.get_unread_count(user_id=current_user.user_id)
    return UnreadCountResponse(count=count)


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Mark a notification as read."""
    service = NotificationsService(db_pool)
    result = await service.mark_read(
        notification_id=notification_id,
        user_id=current_user.user_id
    )
    return {"success": True}


@router.put("/read-all")
async def mark_all_read(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Mark all notifications as read."""
    service = NotificationsService(db_pool)
    result = await service.mark_all_read(user_id=current_user.user_id)
    return {"success": True}


@router.get("/stream")
async def stream_notifications(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Server-Sent Events stream for real-time notifications.
    Client should connect to this endpoint to receive updates.
    """
    queue = await sse_manager.connect(current_user.user_id)
    
    async def event_generator():
        try:
            while True:
                # Wait for message
                msg = await queue.get()
                # SSE format: data: <payload>\n\n
                yield f"data: {msg}\n\n"
        except asyncio.CancelledError:
             await sse_manager.disconnect(current_user.user_id, queue)
        except Exception:
             await sse_manager.disconnect(current_user.user_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
