from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from datetime import datetime
import app.models as models
import app.schemas as schemas
import app.routers.auth as auth

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

@router.get("/", response_model=List[schemas.NotificationOut])
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(models.Notification.is_read == False)
        
    notifications = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@router.put("/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification

@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    db.commit()
    return {"message": "All notifications marked as read"}
