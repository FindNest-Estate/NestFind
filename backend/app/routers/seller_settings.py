"""
Seller Settings Router - Seller preferences and notification settings.

Implements:
- GET /seller/settings - Get seller preferences
- PUT /seller/settings - Update preferences
- PUT /seller/settings/notifications - Notification preferences
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/seller", tags=["Seller Settings"])


# ============================================================================
# MODELS
# ============================================================================

class NotificationPreferences(BaseModel):
    email_offers: bool = True
    email_visits: bool = True
    email_messages: bool = True
    email_marketing: bool = False
    push_offers: bool = True
    push_visits: bool = True
    push_messages: bool = True


class DisplayPreferences(BaseModel):
    default_currency: str = "INR"
    default_view: str = "grid"  # 'grid' or 'list'
    timezone: str = "Asia/Kolkata"


class SellerSettings(BaseModel):
    notifications: NotificationPreferences
    display: DisplayPreferences
    contact_phone_visible: bool = False
    auto_respond_inquiries: bool = False


class SettingsResponse(BaseModel):
    success: bool = True
    settings: SellerSettings


class UpdateSettingsRequest(BaseModel):
    notifications: Optional[NotificationPreferences] = None
    display: Optional[DisplayPreferences] = None
    contact_phone_visible: Optional[bool] = None
    auto_respond_inquiries: Optional[bool] = None


class UpdateNotificationsRequest(BaseModel):
    email_offers: Optional[bool] = None
    email_visits: Optional[bool] = None
    email_messages: Optional[bool] = None
    email_marketing: Optional[bool] = None
    push_offers: Optional[bool] = None
    push_visits: Optional[bool] = None
    push_messages: Optional[bool] = None


# ============================================================================
# GET SETTINGS
# ============================================================================

@router.get("/settings", response_model=SettingsResponse)
async def get_seller_settings(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get seller's settings and preferences.
    
    Returns notification preferences, display preferences, and other settings.
    If no settings exist, returns defaults.
    """
    async with db_pool.acquire() as conn:
        # Try to get existing settings
        row = await conn.fetchrow("""
            SELECT *
            FROM seller_settings
            WHERE user_id = $1
        """, current_user.user_id)
        
        if row:
            notifications = NotificationPreferences(
                email_offers=row['email_offers'],
                email_visits=row['email_visits'],
                email_messages=row['email_messages'],
                email_marketing=row['email_marketing'],
                push_offers=row['push_offers'],
                push_visits=row['push_visits'],
                push_messages=row['push_messages']
            )
            display = DisplayPreferences(
                default_currency=row['default_currency'],
                default_view=row['default_view'],
                timezone=row['timezone']
            )
            
            return SettingsResponse(
                success=True,
                settings=SellerSettings(
                    notifications=notifications,
                    display=display,
                    contact_phone_visible=row['contact_phone_visible'],
                    auto_respond_inquiries=row['auto_respond_inquiries']
                )
            )
        
        # Return defaults if no settings exist
        return SettingsResponse(
            success=True,
            settings=SellerSettings(
                notifications=NotificationPreferences(),
                display=DisplayPreferences(),
                contact_phone_visible=False,
                auto_respond_inquiries=False
            )
        )


# ============================================================================
# UPDATE SETTINGS
# ============================================================================

@router.put("/settings", response_model=SettingsResponse)
async def update_seller_settings(
    request: UpdateSettingsRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Update seller's settings and preferences.
    """
    async with db_pool.acquire() as conn:
        # Get existing settings or create if not exists
        row = await conn.fetchrow("SELECT * FROM seller_settings WHERE user_id = $1", current_user.user_id)
        
        # Build update values
        update_cols = []
        params = [current_user.user_id]
        
        # Check current values or defaults
        current_email_offers = row['email_offers'] if row else True
        current_email_visits = row['email_visits'] if row else True
        # ... logic to merge fields ...
        
        # Simplification: just upsert with COALESCE or insert default row first
        if not row:
             await conn.execute("INSERT INTO seller_settings (user_id) VALUES ($1)", current_user.user_id)
             row = await conn.fetchrow("SELECT * FROM seller_settings WHERE user_id = $1", current_user.user_id)
        
        # Now update specifically
        updates = []
        idx = 2
        
        if request.notifications:
            n = request.notifications
            updates.extend([
                f"email_offers = ${idx}", f"email_visits = ${idx+1}", 
                f"email_messages = ${idx+2}", f"email_marketing = ${idx+3}",
                f"push_offers = ${idx+4}", f"push_visits = ${idx+5}", f"push_messages = ${idx+6}"
            ])
            params.extend([
                n.email_offers, n.email_visits, n.email_messages, n.email_marketing,
                n.push_offers, n.push_visits, n.push_messages
            ])
            idx += 7
            
        if request.display:
            d = request.display
            updates.extend([
                f"default_currency = ${idx}", f"default_view = ${idx+1}", f"timezone = ${idx+2}"
            ])
            params.extend([d.default_currency, d.default_view, d.timezone])
            idx += 3
            
        if request.contact_phone_visible is not None:
            updates.append(f"contact_phone_visible = ${idx}")
            params.append(request.contact_phone_visible)
            idx += 1
            
        if request.auto_respond_inquiries is not None:
            updates.append(f"auto_respond_inquiries = ${idx}")
            params.append(request.auto_respond_inquiries)
            idx += 1
            
        if updates:
            sql = f"UPDATE seller_settings SET {', '.join(updates)}, updated_at = NOW() WHERE user_id = $1"
            await conn.execute(sql, *params)
        
        # Fetch updated
        row = await conn.fetchrow("SELECT * FROM seller_settings WHERE user_id = $1", current_user.user_id)
        
        notifications = NotificationPreferences(
            email_offers=row['email_offers'],
            email_visits=row['email_visits'],
            email_messages=row['email_messages'],
            email_marketing=row['email_marketing'],
            push_offers=row['push_offers'],
            push_visits=row['push_visits'],
            push_messages=row['push_messages']
        )
        display = DisplayPreferences(
            default_currency=row['default_currency'],
            default_view=row['default_view'],
            timezone=row['timezone']
        )
        
        return SettingsResponse(
            success=True,
            settings=SellerSettings(
                notifications=notifications,
                display=display,
                contact_phone_visible=row['contact_phone_visible'],
                auto_respond_inquiries=row['auto_respond_inquiries']
            )
        )


# ============================================================================
# UPDATE NOTIFICATION PREFERENCES
# ============================================================================

@router.put("/settings/notifications", response_model=SettingsResponse)
async def update_notification_preferences(
    request: UpdateNotificationsRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Update only notification preferences.
    """
    import json
    
    async with db_pool.acquire() as conn:
        # Get existing settings
        row = await conn.fetchrow("""
            SELECT preferences
            FROM user_preferences
            WHERE user_id = $1
        """, current_user.user_id)
        
        existing = row['preferences'] if row and row['preferences'] else {}
        notifications = existing.get('notifications', {})
        
        # Update only provided fields
        update_dict = request.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                notifications[key] = value
        
        existing['notifications'] = notifications
        
        # Upsert preferences
        await conn.execute("""
            INSERT INTO user_preferences (user_id, preferences, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET preferences = $2, updated_at = NOW()
        """, current_user.user_id, json.dumps(existing))
        
        # Return updated settings
        return SettingsResponse(
            success=True,
            settings=SellerSettings(
                notifications=NotificationPreferences(**notifications),
                display=DisplayPreferences(**existing.get('display', {})),
                contact_phone_visible=existing.get('contact_phone_visible', False),
                auto_respond_inquiries=existing.get('auto_respond_inquiries', False)
            )
        )
