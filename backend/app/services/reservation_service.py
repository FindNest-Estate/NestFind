"""
Reservation Service implementing BUYER_RESERVATION workflow.

State Machine:
    [Offer ACCEPTED] → ACTIVE → COMPLETED/EXPIRED/CANCELLED
"""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import asyncpg

from ..services.notifications_service import NotificationsService


# Reservation configuration
RESERVATION_DEPOSIT_PERCENT = Decimal("0.001")  # 0.1%
RESERVATION_VALIDITY_DAYS = 30


class ReservationService:
    """
    Service for managing property reservations.
    
    Implements buyer reservation workflow with 0.1% deposit
    and 30-day validity period.
    """
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        'ACTIVE': ['COMPLETED', 'EXPIRED', 'CANCELLED'],
        'COMPLETED': [],
        'EXPIRED': [],
        'CANCELLED': []
    }
    
    # Display status labels
    DISPLAY_STATUS = {
        'ACTIVE': 'Active',
        'COMPLETED': 'Completed',
        'EXPIRED': 'Expired',
        'CANCELLED': 'Cancelled'
    }
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    def _can_transition(self, current_status: str, new_status: str) -> bool:
        """Check if state transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(current_status, [])
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return self.DISPLAY_STATUS.get(status, status)
    
    def _compute_allowed_actions(self, status: str, is_buyer: bool = False) -> list:
        """Compute allowed actions based on status."""
        actions = []
        
        if status == 'ACTIVE' and is_buyer:
            actions.append('cancel')
            actions.append('proceed_to_registration')
        
        return actions
    
    async def create_reservation(
        self,
        offer_id: UUID,
        buyer_id: UUID,
        payment_reference: Optional[str] = None,
        payment_method: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a reservation for an accepted offer.
        
        Requirements:
        - Offer must be ACCEPTED
        - Buyer must be the offer buyer
        - Property must not already have an active reservation
        - 0.1% deposit is calculated automatically
        """
        async with self.db.acquire() as conn:
            # Get offer details
            offer = await conn.fetchrow("""
                SELECT o.*, p.seller_id, p.title as property_title, 
                       p.status as property_status
                FROM offers o
                JOIN properties p ON p.id = o.property_id
                WHERE o.id = $1
            """, offer_id)
            
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            if offer['buyer_id'] != buyer_id:
                return {"success": False, "error": "Only the offer buyer can create a reservation"}
            
            if offer['status'] != 'ACCEPTED':
                return {
                    "success": False, 
                    "error": f"Cannot create reservation. Offer status is {offer['status']}, must be ACCEPTED"
                }
            
            if offer['property_status'] != 'ACTIVE':
                return {
                    "success": False,
                    "error": f"Property is not available (status: {offer['property_status']})"
                }
            
            # Check for existing active reservation on property
            existing = await conn.fetchrow("""
                SELECT id FROM reservations
                WHERE property_id = $1 AND status = 'ACTIVE'
            """, offer['property_id'])
            
            if existing:
                return {
                    "success": False,
                    "error": "This property already has an active reservation"
                }
            
            # Calculate amounts
            agreed_price = Decimal(str(offer['counter_price'] or offer['offered_price']))
            deposit_amount = agreed_price * RESERVATION_DEPOSIT_PERCENT
            
            # Calculate validity period
            now = datetime.now(timezone.utc)
            end_date = now + timedelta(days=RESERVATION_VALIDITY_DAYS)
            
            # Create reservation in a transaction
            async with conn.transaction():
                # Create reservation
                reservation = await conn.fetchrow("""
                    INSERT INTO reservations (
                        property_id, buyer_id, offer_id,
                        amount, property_price,
                        start_date, end_date,
                        status, payment_reference, payment_method
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9)
                    RETURNING id, property_id, buyer_id, offer_id,
                              amount, property_price, start_date, end_date,
                              status, created_at
                """, offer['property_id'], buyer_id, offer_id,
                    deposit_amount, agreed_price, now, end_date,
                    payment_reference, payment_method)
                
                # Update property status to RESERVED
                await conn.execute("""
                    UPDATE properties SET status = 'RESERVED' WHERE id = $1
                """, offer['property_id'])
            
            # Notify seller
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=offer['seller_id'],
                    notification_type='PROPERTY_RESERVED',
                    title='Property Reserved',
                    message=f'Your property {offer["property_title"]} has been reserved. Deposit: ₹{deposit_amount:,.0f}',
                    related_entity_type='reservation',
                    related_entity_id=reservation['id']
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "reservation": {
                    "id": str(reservation['id']),
                    "property_id": str(reservation['property_id']),
                    "property_title": offer['property_title'],
                    "buyer_id": str(reservation['buyer_id']),
                    "offer_id": str(reservation['offer_id']),
                    "amount": float(reservation['amount']),
                    "deposit_percent": float(RESERVATION_DEPOSIT_PERCENT * 100),
                    "property_price": float(reservation['property_price']),
                    "start_date": reservation['start_date'].isoformat(),
                    "end_date": reservation['end_date'].isoformat(),
                    "validity_days": RESERVATION_VALIDITY_DAYS,
                    "status": reservation['status'],
                    "display_status": self._get_display_status(reservation['status']),
                    "created_at": reservation['created_at'].isoformat(),
                    "allowed_actions": self._compute_allowed_actions(
                        reservation['status'], is_buyer=True
                    )
                },
                "next_step": "Schedule property registration to complete the transaction"
            }
    
    async def get_reservations(
        self,
        user_id: UUID,
        role: str,  # 'buyer' or 'seller'
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Get list of reservations for a user."""
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build query based on role
            if role == 'buyer':
                base_query = "r.buyer_id = $1"
            elif role == 'seller':
                base_query = "p.seller_id = $1"
            else:
                return {"success": False, "error": "Invalid role"}
            
            params = [user_id]
            if status_filter:
                base_query += f" AND r.status = ${len(params) + 1}"
                params.append(status_filter)
            
            # Get total count
            count_row = await conn.fetchrow(f"""
                SELECT COUNT(*) as total 
                FROM reservations r
                JOIN properties p ON p.id = r.property_id
                WHERE {base_query}
            """, *params)
            
            # Get reservations
            params.extend([per_page, offset])
            reservations = await conn.fetch(f"""
                SELECT 
                    r.*,
                    p.title as property_title, p.city as property_city,
                    p.seller_id,
                    buyer.full_name as buyer_name
                FROM reservations r
                JOIN properties p ON p.id = r.property_id
                JOIN users buyer ON buyer.id = r.buyer_id
                WHERE {base_query}
                ORDER BY r.created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """, *params)
            
            is_buyer = role == 'buyer'
            
            return {
                "success": True,
                "reservations": [
                    {
                        "id": str(r['id']),
                        "property_id": str(r['property_id']),
                        "property_title": r['property_title'],
                        "property_city": r['property_city'],
                        "buyer_id": str(r['buyer_id']),
                        "buyer_name": r['buyer_name'] if not is_buyer else None,
                        "amount": float(r['amount']),
                        "property_price": float(r['property_price']),
                        "start_date": r['start_date'].isoformat(),
                        "end_date": r['end_date'].isoformat(),
                        "status": r['status'],
                        "display_status": self._get_display_status(r['status']),
                        "created_at": r['created_at'].isoformat(),
                        "days_remaining": self._calculate_days_remaining(r['end_date'], r['status']),
                        "allowed_actions": self._compute_allowed_actions(
                            r['status'], is_buyer=is_buyer
                        )
                    }
                    for r in reservations
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": count_row['total'],
                    "total_pages": (count_row['total'] + per_page - 1) // per_page
                }
            }
    
    def _calculate_days_remaining(self, end_date: datetime, status: str) -> Optional[int]:
        """Calculate days remaining for active reservations."""
        if status != 'ACTIVE':
            return None
        now = datetime.now(timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        delta = end_date - now
        return max(0, delta.days)
    
    async def get_reservation_by_id(
        self,
        reservation_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get reservation details."""
        async with self.db.acquire() as conn:
            reservation = await conn.fetchrow("""
                SELECT 
                    r.*,
                    p.title as property_title, p.city as property_city,
                    p.address as property_address, p.seller_id,
                    buyer.full_name as buyer_name, buyer.email as buyer_email,
                    seller.full_name as seller_name,
                    o.offered_price, o.counter_price
                FROM reservations r
                JOIN properties p ON p.id = r.property_id
                JOIN users buyer ON buyer.id = r.buyer_id
                JOIN users seller ON seller.id = p.seller_id
                JOIN offers o ON o.id = r.offer_id
                WHERE r.id = $1
            """, reservation_id)
            
            if not reservation:
                return {"success": False, "error": "Reservation not found"}
            
            # Check access
            is_buyer = reservation['buyer_id'] == user_id
            is_seller = reservation['seller_id'] == user_id
            
            if not is_buyer and not is_seller:
                return {"success": False, "error": "Access denied"}
            
            # Check if there's a transaction for this reservation
            transaction = await conn.fetchrow("""
                SELECT id, status FROM transactions WHERE reservation_id = $1
            """, reservation_id)
            
            return {
                "success": True,
                "reservation": {
                    "id": str(reservation['id']),
                    "property": {
                        "id": str(reservation['property_id']),
                        "title": reservation['property_title'],
                        "city": reservation['property_city'],
                        "address": reservation['property_address'] if is_buyer or is_seller else None
                    },
                    "buyer": {
                        "id": str(reservation['buyer_id']),
                        "name": reservation['buyer_name'],
                        "email": reservation['buyer_email'] if is_seller else None
                    },
                    "seller": {
                        "id": str(reservation['seller_id']),
                        "name": reservation['seller_name']
                    },
                    "amount": float(reservation['amount']),
                    "property_price": float(reservation['property_price']),
                    "start_date": reservation['start_date'].isoformat(),
                    "end_date": reservation['end_date'].isoformat(),
                    "status": reservation['status'],
                    "display_status": self._get_display_status(reservation['status']),
                    "days_remaining": self._calculate_days_remaining(
                        reservation['end_date'], reservation['status']
                    ),
                    "created_at": reservation['created_at'].isoformat(),
                    "allowed_actions": self._compute_allowed_actions(
                        reservation['status'], is_buyer=is_buyer
                    ),
                    "transaction": {
                        "id": str(transaction['id']),
                        "status": transaction['status']
                    } if transaction else None
                }
            }
    
    async def cancel_reservation(
        self,
        reservation_id: UUID,
        buyer_id: UUID,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Buyer cancels a reservation.
        
        Note: Deposit is forfeited (no refund) per business rules.
        """
        async with self.db.acquire() as conn:
            reservation = await conn.fetchrow("""
                SELECT r.*, p.seller_id, p.title as property_title
                FROM reservations r
                JOIN properties p ON p.id = r.property_id
                WHERE r.id = $1
            """, reservation_id)
            
            if not reservation:
                return {"success": False, "error": "Reservation not found"}
            
            if reservation['buyer_id'] != buyer_id:
                return {"success": False, "error": "Only the buyer can cancel this reservation"}
            
            if not self._can_transition(reservation['status'], 'CANCELLED'):
                return {
                    "success": False,
                    "error": f"Cannot cancel reservation in {reservation['status']} status"
                }
            
            async with conn.transaction():
                # Cancel reservation
                await conn.execute("""
                    UPDATE reservations 
                    SET status = 'CANCELLED',
                        cancelled_at = NOW(),
                        cancellation_reason = $2,
                        refund_amount = 0  -- Deposit forfeited
                    WHERE id = $1
                """, reservation_id, reason)
                
                # Return property to ACTIVE
                await conn.execute("""
                    UPDATE properties SET status = 'ACTIVE' WHERE id = $1
                """, reservation['property_id'])
            
            # Notify seller
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=reservation['seller_id'],
                    notification_type='RESERVATION_CANCELLED',
                    title='Reservation Cancelled',
                    message=f'The reservation for {reservation["property_title"]} has been cancelled. Property is now available again.',
                    related_entity_type='reservation',
                    related_entity_id=reservation_id
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Reservation cancelled. Deposit has been forfeited.",
                "reservation": {
                    "id": str(reservation_id),
                    "status": "CANCELLED",
                    "display_status": "Cancelled",
                    "deposit_refunded": False
                }
            }
    
    async def expire_reservations(self) -> Dict[str, Any]:
        """
        System job to expire overdue reservations.
        
        This should be called by a CRON job.
        """
        async with self.db.acquire() as conn:
            now = datetime.now(timezone.utc)
            
            # Find and expire overdue reservations
            expired = await conn.fetch("""
                UPDATE reservations 
                SET status = 'EXPIRED'
                WHERE status = 'ACTIVE' AND end_date < $1
                RETURNING id, property_id, buyer_id
            """, now)
            
            # Return properties to ACTIVE
            for r in expired:
                await conn.execute("""
                    UPDATE properties SET status = 'ACTIVE' WHERE id = $1
                """, r['property_id'])
                
                # Notify buyer
                try:
                    notifications_service = NotificationsService(self.db)
                    await notifications_service.create_notification(
                        user_id=r['buyer_id'],
                        notification_type='RESERVATION_EXPIRED',
                        title='Reservation Expired',
                        message='Your reservation has expired. The property is now available to other buyers.',
                        related_entity_type='reservation',
                        related_entity_id=r['id']
                    )
                except Exception:
                    pass
            
            return {
                "success": True,
                "expired_count": len(expired)
            }
