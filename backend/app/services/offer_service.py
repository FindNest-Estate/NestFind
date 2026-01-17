"""
Offer Service implementing BUYER_OFFER_FLOW and SELLER_OFFER_HANDLING workflows.

State Machine:
    PENDING → ACCEPTED/REJECTED/COUNTERED/EXPIRED/WITHDRAWN
    COUNTERED → ACCEPTED/REJECTED/COUNTERED
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
import asyncpg

from ..services.notifications_service import NotificationsService


# Default offer expiry time (48 hours)
DEFAULT_OFFER_EXPIRY_HOURS = 48


class OfferService:
    """
    Service for managing property offers and negotiations.
    
    Implements buyer offer flow and seller offer handling workflows
    with state machine enforcement.
    """
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        'PENDING': ['ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'WITHDRAWN'],
        'COUNTERED': ['ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'WITHDRAWN'],
        'ACCEPTED': [],
        'REJECTED': [],
        'EXPIRED': [],
        'WITHDRAWN': []
    }
    
    # Display status labels
    DISPLAY_STATUS = {
        'PENDING': 'Pending Response',
        'ACCEPTED': 'Accepted',
        'REJECTED': 'Rejected',
        'COUNTERED': 'Counter Offer',
        'EXPIRED': 'Expired',
        'WITHDRAWN': 'Withdrawn'
    }
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    def _can_transition(self, current_status: str, new_status: str) -> bool:
        """Check if state transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(current_status, [])
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return self.DISPLAY_STATUS.get(status, status)
    
    def _compute_allowed_actions(self, status: str, is_seller: bool = False, is_buyer: bool = False) -> List[str]:
        """Compute allowed actions based on status and role."""
        actions = []
        
        if status == 'PENDING':
            if is_seller:
                actions.extend(['accept', 'reject', 'counter'])
            if is_buyer:
                actions.append('withdraw')
        elif status == 'COUNTERED':
            if is_buyer:
                actions.extend(['accept', 'reject', 'counter'])
            if is_seller:
                actions.append('withdraw')
        
        return actions
    
    async def create_offer(
        self,
        property_id: UUID,
        buyer_id: UUID,
        offered_price: float,
        buyer_message: Optional[str] = None,
        expiry_hours: int = DEFAULT_OFFER_EXPIRY_HOURS,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Buyer creates an offer for a property.
        
        Requirements:
        - Property must be ACTIVE
        - Buyer cannot be the seller
        - No existing pending offer from same buyer
        - Price must be positive
        """
        if offered_price <= 0:
            return {"success": False, "error": "Offered price must be positive"}
        
        async with self.db.acquire() as conn:
            # Verify property exists and is ACTIVE
            property_row = await conn.fetchrow("""
                SELECT p.id, p.seller_id, p.title, p.status, p.price
                FROM properties p
                WHERE p.id = $1 AND p.deleted_at IS NULL
            """, property_id)
            
            if not property_row:
                return {"success": False, "error": "Property not found"}
            
            if property_row['status'] != 'ACTIVE':
                return {
                    "success": False, 
                    "error": f"Cannot make offer on property with status: {property_row['status']}"
                }
            
            # Buyer cannot offer on their own property
            if property_row['seller_id'] == buyer_id:
                return {"success": False, "error": "You cannot make an offer on your own property"}
            
            # Check for existing pending offer
            existing = await conn.fetchrow("""
                SELECT id FROM offers
                WHERE property_id = $1 AND buyer_id = $2 AND status = 'PENDING'
            """, property_id, buyer_id)
            
            if existing:
                return {
                    "success": False, 
                    "error": "You already have a pending offer for this property"
                }
            
            # Calculate expiry
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(hours=expiry_hours)
            
            # Create offer
            try:
                offer_row = await conn.fetchrow("""
                    INSERT INTO offers (
                        property_id, buyer_id, offered_price, 
                        buyer_message, status, expires_at
                    )
                    VALUES ($1, $2, $3, $4, 'PENDING', $5)
                    RETURNING id, property_id, buyer_id, offered_price, 
                              status, expires_at, created_at
                """, property_id, buyer_id, offered_price, buyer_message, expires_at)
                
                # Notify seller
                try:
                    notifications_service = NotificationsService(self.db)
                    await notifications_service.create_notification(
                        user_id=property_row['seller_id'],
                        notification_type='OFFER_RECEIVED',
                        title='New Offer Received',
                        message=f'You received an offer of ₹{offered_price:,.0f} for {property_row["title"]}',
                        related_entity_type='offer',
                        related_entity_id=offer_row['id']
                    )
                except Exception:
                    pass
                
                return {
                    "success": True,
                    "offer": {
                        "id": str(offer_row['id']),
                        "property_id": str(offer_row['property_id']),
                        "buyer_id": str(offer_row['buyer_id']),
                        "offered_price": float(offer_row['offered_price']),
                        "status": offer_row['status'],
                        "display_status": self._get_display_status(offer_row['status']),
                        "expires_at": offer_row['expires_at'].isoformat(),
                        "created_at": offer_row['created_at'].isoformat(),
                        "allowed_actions": self._compute_allowed_actions(
                            offer_row['status'], is_buyer=True
                        )
                    }
                }
                
            except asyncpg.UniqueViolationError:
                return {
                    "success": False,
                    "error": "You already have a pending offer for this property"
                }
    
    async def get_offers(
        self,
        user_id: UUID,
        role: str,  # 'buyer' or 'seller'
        property_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get list of offers for a user.
        
        - Buyer sees their offers
        - Seller sees offers on their properties
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build query based on role
            if role == 'buyer':
                base_query = "o.buyer_id = $1"
            elif role == 'seller':
                base_query = "p.seller_id = $1"
            else:
                return {"success": False, "error": "Invalid role"}
            
            # Add property filter
            params = [user_id]
            if property_id:
                base_query += f" AND o.property_id = ${len(params) + 1}"
                params.append(property_id)
            
            # Add status filter
            if status_filter:
                base_query += f" AND o.status = ${len(params) + 1}"
                params.append(status_filter)
            
            # Get total count
            count_row = await conn.fetchrow(f"""
                SELECT COUNT(*) as total 
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                WHERE {base_query}
            """, *params)
            
            # Get offers with property info
            params.extend([per_page, offset])
            offers = await conn.fetch(f"""
                SELECT 
                    o.id, o.property_id, o.buyer_id, o.offered_price,
                    o.counter_price, o.parent_offer_id, o.status,
                    o.expires_at, o.buyer_message, o.seller_message,
                    o.rejection_reason, o.created_at, o.responded_at,
                    p.title as property_title, p.city as property_city,
                    p.price as asking_price, p.seller_id,
                    buyer.full_name as buyer_name
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                JOIN users buyer ON buyer.id = o.buyer_id
                WHERE {base_query}
                ORDER BY o.created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """, *params)
            
            is_seller = role == 'seller'
            is_buyer = role == 'buyer'
            
            return {
                "success": True,
                "offers": [
                    {
                        "id": str(o['id']),
                        "property_id": str(o['property_id']),
                        "property_title": o['property_title'],
                        "property_city": o['property_city'],
                        "asking_price": float(o['asking_price']) if o['asking_price'] else None,
                        "buyer_id": str(o['buyer_id']),
                        "buyer_name": o['buyer_name'] if is_seller else None,
                        "offered_price": float(o['offered_price']),
                        "counter_price": float(o['counter_price']) if o['counter_price'] else None,
                        "status": o['status'],
                        "display_status": self._get_display_status(o['status']),
                        "expires_at": o['expires_at'].isoformat() if o['expires_at'] else None,
                        "buyer_message": o['buyer_message'],
                        "seller_message": o['seller_message'],
                        "rejection_reason": o['rejection_reason'],
                        "created_at": o['created_at'].isoformat(),
                        "responded_at": o['responded_at'].isoformat() if o['responded_at'] else None,
                        "allowed_actions": self._compute_allowed_actions(
                            o['status'], is_seller=is_seller, is_buyer=is_buyer
                        )
                    }
                    for o in offers
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": count_row['total'],
                    "total_pages": (count_row['total'] + per_page - 1) // per_page
                }
            }
    
    async def get_offer_by_id(
        self,
        offer_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get offer details. User must be buyer or seller."""
        async with self.db.acquire() as conn:
            offer = await conn.fetchrow("""
                SELECT 
                    o.*,
                    p.title as property_title, p.city as property_city,
                    p.address as property_address, p.price as asking_price,
                    p.seller_id,
                    buyer.full_name as buyer_name, buyer.email as buyer_email,
                    seller.full_name as seller_name
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                JOIN users buyer ON buyer.id = o.buyer_id
                JOIN users seller ON seller.id = p.seller_id
                WHERE o.id = $1
            """, offer_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            # Check access
            is_buyer = offer['buyer_id'] == user_id
            is_seller = offer['seller_id'] == user_id
            
            if not is_buyer and not is_seller:
                return {"success": False, "error": "Access denied"}
            
            return {
                "success": True,
                "offer": {
                    "id": str(offer['id']),
                    "property": {
                        "id": str(offer['property_id']),
                        "title": offer['property_title'],
                        "city": offer['property_city'],
                        "asking_price": float(offer['asking_price']) if offer['asking_price'] else None
                    },
                    "buyer": {
                        "id": str(offer['buyer_id']),
                        "name": offer['buyer_name'],
                        "email": offer['buyer_email'] if is_seller else None
                    },
                    "seller": {
                        "id": str(offer['seller_id']),
                        "name": offer['seller_name']
                    },
                    "offered_price": float(offer['offered_price']),
                    "counter_price": float(offer['counter_price']) if offer['counter_price'] else None,
                    "status": offer['status'],
                    "display_status": self._get_display_status(offer['status']),
                    "expires_at": offer['expires_at'].isoformat() if offer['expires_at'] else None,
                    "buyer_message": offer['buyer_message'],
                    "seller_message": offer['seller_message'],
                    "rejection_reason": offer['rejection_reason'],
                    "created_at": offer['created_at'].isoformat(),
                    "responded_at": offer['responded_at'].isoformat() if offer['responded_at'] else None,
                    "allowed_actions": self._compute_allowed_actions(
                        offer['status'], is_seller=is_seller, is_buyer=is_buyer
                    )
                }
            }
    
    async def accept_offer(
        self,
        offer_id: UUID,
        user_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Accept an offer.
        - Seller accepts PENDING offer
        - Buyer accepts COUNTERED offer
        """
        async with self.db.acquire() as conn:
            offer = await conn.fetchrow("""
                SELECT o.*, p.seller_id, p.title as property_title
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                WHERE o.id = $1
            """, offer_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            is_buyer = offer['buyer_id'] == user_id
            is_seller = offer['seller_id'] == user_id
            
            if not is_buyer and not is_seller:
                return {"success": False, "error": "Access denied"}
            
            # Validate transition
            if offer['status'] == 'PENDING' and not is_seller:
                return {"success": False, "error": "Only seller can accept pending offers"}
            
            if offer['status'] == 'COUNTERED' and not is_buyer:
                return {"success": False, "error": "Only buyer can accept counter offers"}
            
            if not self._can_transition(offer['status'], 'ACCEPTED'):
                return {
                    "success": False,
                    "error": f"Cannot accept offer in {offer['status']} status"
                }
            
            # Check if offer expired
            now = datetime.now(timezone.utc)
            if offer['expires_at'] and offer['expires_at'].replace(tzinfo=timezone.utc) < now:
                await conn.execute("""
                    UPDATE offers SET status = 'EXPIRED' WHERE id = $1
                """, offer_id)
                return {"success": False, "error": "Offer has expired"}
            
            # Accept offer
            await conn.execute("""
                UPDATE offers 
                SET status = 'ACCEPTED', responded_at = NOW()
                WHERE id = $1
            """, offer_id)
            
            # Reject other pending offers for this property
            await conn.execute("""
                UPDATE offers 
                SET status = 'REJECTED', 
                    rejection_reason = 'Another offer was accepted',
                    responded_at = NOW()
                WHERE property_id = $1 AND id != $2 AND status = 'PENDING'
            """, offer['property_id'], offer_id)
            
            # Notify the other party
            notify_user = offer['buyer_id'] if is_seller else offer['seller_id']
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=notify_user,
                    notification_type='OFFER_ACCEPTED',
                    title='Offer Accepted',
                    message=f'Your offer for {offer["property_title"]} has been accepted!',
                    related_entity_type='offer',
                    related_entity_id=offer_id
                )
            except Exception:
                pass
            
            agreed_price = float(offer['counter_price'] or offer['offered_price'])
            
            return {
                "success": True,
                "message": "Offer accepted successfully",
                "offer": {
                    "id": str(offer_id),
                    "status": "ACCEPTED",
                    "display_status": "Accepted",
                    "agreed_price": agreed_price
                },
                "next_step": "Create reservation to secure this property"
            }
    
    async def reject_offer(
        self,
        offer_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reject an offer."""
        async with self.db.acquire() as conn:
            offer = await conn.fetchrow("""
                SELECT o.*, p.seller_id, p.title as property_title
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                WHERE o.id = $1
            """, offer_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            is_buyer = offer['buyer_id'] == user_id
            is_seller = offer['seller_id'] == user_id
            
            if not is_buyer and not is_seller:
                return {"success": False, "error": "Access denied"}
            
            # Validate who can reject based on status
            if offer['status'] == 'PENDING' and not is_seller:
                return {"success": False, "error": "Only seller can reject pending offers"}
            
            if offer['status'] == 'COUNTERED' and not is_buyer:
                return {"success": False, "error": "Only buyer can reject counter offers"}
            
            if not self._can_transition(offer['status'], 'REJECTED'):
                return {
                    "success": False,
                    "error": f"Cannot reject offer in {offer['status']} status"
                }
            
            await conn.execute("""
                UPDATE offers 
                SET status = 'REJECTED', 
                    rejection_reason = $2,
                    responded_at = NOW()
                WHERE id = $1
            """, offer_id, reason)
            
            # Notify
            notify_user = offer['buyer_id'] if is_seller else offer['seller_id']
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=notify_user,
                    notification_type='OFFER_REJECTED',
                    title='Offer Rejected',
                    message=f'Your offer for {offer["property_title"]} has been rejected',
                    related_entity_type='offer',
                    related_entity_id=offer_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Offer rejected",
                "offer": {
                    "id": str(offer_id),
                    "status": "REJECTED",
                    "display_status": "Rejected"
                }
            }
    
    async def counter_offer(
        self,
        offer_id: UUID,
        user_id: UUID,
        counter_price: float,
        seller_message: Optional[str] = None,
        expiry_hours: int = DEFAULT_OFFER_EXPIRY_HOURS,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Seller or buyer makes a counter offer."""
        if counter_price <= 0:
            return {"success": False, "error": "Counter price must be positive"}
        
        async with self.db.acquire() as conn:
            offer = await conn.fetchrow("""
                SELECT o.*, p.seller_id, p.title as property_title
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                WHERE o.id = $1
            """, offer_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            is_buyer = offer['buyer_id'] == user_id
            is_seller = offer['seller_id'] == user_id
            
            if not is_buyer and not is_seller:
                return {"success": False, "error": "Access denied"}
            
            # Validate who can counter based on status
            if offer['status'] == 'PENDING' and not is_seller:
                return {"success": False, "error": "Only seller can counter pending offers"}
            
            if offer['status'] == 'COUNTERED' and not is_buyer:
                return {"success": False, "error": "Only buyer can counter seller's counter offer"}
            
            if not self._can_transition(offer['status'], 'COUNTERED'):
                return {
                    "success": False,
                    "error": f"Cannot counter offer in {offer['status']} status"
                }
            
            # Update offer with counter
            now = datetime.now(timezone.utc)
            new_expires = now + timedelta(hours=expiry_hours)
            
            await conn.execute("""
                UPDATE offers 
                SET status = 'COUNTERED', 
                    counter_price = $2,
                    seller_message = $3,
                    expires_at = $4,
                    responded_at = NOW()
                WHERE id = $1
            """, offer_id, counter_price, seller_message, new_expires)
            
            # Notify
            notify_user = offer['buyer_id'] if is_seller else offer['seller_id']
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=notify_user,
                    notification_type='OFFER_COUNTERED',
                    title='Counter Offer Received',
                    message=f'A counter offer of ₹{counter_price:,.0f} was made for {offer["property_title"]}',
                    related_entity_type='offer',
                    related_entity_id=offer_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Counter offer sent",
                "offer": {
                    "id": str(offer_id),
                    "status": "COUNTERED",
                    "display_status": "Counter Offer",
                    "counter_price": counter_price,
                    "expires_at": new_expires.isoformat()
                }
            }
    
    async def withdraw_offer(
        self,
        offer_id: UUID,
        user_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Buyer withdraws their offer."""
        async with self.db.acquire() as conn:
            offer = await conn.fetchrow("""
                SELECT o.*, p.seller_id
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                WHERE o.id = $1
            """, offer_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            # Buyer can withdraw PENDING/COUNTERED offers
            if offer['buyer_id'] != user_id:
                return {"success": False, "error": "Only the buyer can withdraw this offer"}
            
            if not self._can_transition(offer['status'], 'WITHDRAWN'):
                return {
                    "success": False,
                    "error": f"Cannot withdraw offer in {offer['status']} status"
                }
            
            await conn.execute("""
                UPDATE offers SET status = 'WITHDRAWN' WHERE id = $1
            """, offer_id)
            
            return {
                "success": True,
                "message": "Offer withdrawn",
                "offer": {
                    "id": str(offer_id),
                    "status": "WITHDRAWN",
                    "display_status": "Withdrawn"
                }
            }
