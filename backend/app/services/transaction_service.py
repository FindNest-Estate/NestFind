"""
Transaction Service implementing AGENT_REGISTRATION_DAY workflow.

State Machine:
    INITIATED → BUYER_VERIFIED → SELLER_VERIFIED → COMPLETED
"""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import asyncpg
import secrets
import hashlib

from ..services.notifications_service import NotificationsService
from ..services.email_service import EmailService


# Commission configuration (from seller's 0.9%)
SELLER_COMMISSION_PERCENT = Decimal("0.009")  # 0.9% from seller
AGENT_SHARE_FROM_SELLER = Decimal("0.007")  # 0.7% to agent
PLATFORM_SHARE_FROM_SELLER = Decimal("0.002")  # 0.2% to NestFind
BUYER_RESERVATION_PERCENT = Decimal("0.001")  # 0.1% from buyer
# Total NestFind revenue = 0.1% (buyer) + 0.2% (from seller) = 0.3%

# OTP configuration
OTP_EXPIRY_MINUTES = 10


class TransactionService:
    """
    Service for managing property transactions.
    
    Implements registration day workflow with multi-party
    OTP verification and commission calculation.
    """
    
    # Valid state transitions (extended for full workflow)
    VALID_TRANSITIONS = {
        'INITIATED': ['SLOT_BOOKED', 'CANCELLED', 'FAILED'],
        'SLOT_BOOKED': ['BUYER_VERIFIED', 'CANCELLED', 'FAILED'],
        'BUYER_VERIFIED': ['SELLER_VERIFIED', 'CANCELLED', 'FAILED'],
        'SELLER_VERIFIED': ['ALL_VERIFIED', 'FAILED'],
        'ALL_VERIFIED': ['SELLER_PAID', 'FAILED'],
        'SELLER_PAID': ['DOCUMENTS_PENDING', 'FAILED'],
        'DOCUMENTS_PENDING': ['ADMIN_REVIEW', 'FAILED'],
        'ADMIN_REVIEW': ['COMPLETED', 'FAILED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'FAILED': []
    }
    
    # Display status labels
    DISPLAY_STATUS = {
        'INITIATED': 'Pending Slot Booking',
        'SLOT_BOOKED': 'Registration Scheduled',
        'BUYER_VERIFIED': 'Buyer Verified',
        'SELLER_VERIFIED': 'Seller Verified',
        'ALL_VERIFIED': 'All Parties Verified',
        'SELLER_PAID': 'Commission Paid',
        'DOCUMENTS_PENDING': 'Awaiting Documents',
        'ADMIN_REVIEW': 'Under Admin Review',
        'COMPLETED': 'Completed',
        'CANCELLED': 'Cancelled',
        'FAILED': 'Failed'
    }
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    def _can_transition(self, current_status: str, new_status: str) -> bool:
        """Check if state transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(current_status, [])
    
    def _get_display_status(self, status: str) -> str:
        """Get human-readable status label."""
        return self.DISPLAY_STATUS.get(status, status)
    
    def _generate_otp(self) -> str:
        """Generate 6-digit OTP."""
        return ''.join(secrets.choice('0123456789') for _ in range(6))
    
    def _hash_otp(self, otp: str) -> str:
        """Hash OTP for storage."""
        return hashlib.sha256(otp.encode()).hexdigest()
    
    def _compute_allowed_actions(
        self, 
        status: str, 
        is_buyer: bool = False, 
        is_seller: bool = False,
        is_agent: bool = False
    ) -> list:
        """Compute allowed actions based on status and role."""
        actions = []
        
        if status == 'INITIATED':
            if is_buyer:
                actions.append('verify_otp')
            if is_agent:
                actions.extend(['send_buyer_otp', 'cancel'])
        elif status == 'BUYER_VERIFIED':
            if is_seller:
                actions.append('verify_otp')
            if is_agent:
                actions.extend(['send_seller_otp', 'cancel'])
        elif status == 'SELLER_VERIFIED':
            if is_agent:
                actions.append('complete')
        
        return actions
    
    async def schedule_registration(
        self,
        reservation_id: UUID,
        agent_id: UUID,
        registration_date: datetime,
        registration_location: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent schedules registration for a reserved property.
        
        Requirements:
        - Reservation must be ACTIVE
        - Agent must be assigned to the property
        - Registration date must be before reservation expires
        """
        async with self.db.acquire() as conn:
            # Get reservation with property and agent info
            reservation = await conn.fetchrow("""
                SELECT r.*, 
                       p.seller_id, p.title as property_title,
                       aa.agent_id as assigned_agent_id
                FROM reservations r
                JOIN properties p ON p.id = r.property_id
                LEFT JOIN agent_assignments aa ON aa.property_id = p.id 
                    AND aa.status IN ('ACCEPTED', 'COMPLETED')
                WHERE r.id = $1
            """, reservation_id)
            
            if not reservation:
                return {"success": False, "error": "Reservation not found"}
            
            if reservation['status'] != 'ACTIVE':
                return {
                    "success": False,
                    "error": f"Reservation is not active (status: {reservation['status']})"
                }
            
            if reservation['assigned_agent_id'] != agent_id:
                return {"success": False, "error": "Only the assigned agent can schedule registration"}
            
            # Check registration date is valid
            now = datetime.now(timezone.utc)
            if registration_date.tzinfo is None:
                registration_date = registration_date.replace(tzinfo=timezone.utc)
            
            if registration_date <= now:
                return {"success": False, "error": "Registration date must be in the future"}
            
            end_date = reservation['end_date']
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            
            if registration_date > end_date:
                return {
                    "success": False,
                    "error": "Registration date must be before reservation expires"
                }
            
            # Check for existing transaction
            existing = await conn.fetchrow("""
                SELECT id FROM transactions WHERE reservation_id = $1
            """, reservation_id)
            
            if existing:
                return {
                    "success": False,
                    "error": "Transaction already exists for this reservation"
                }
            
            # Calculate commission amounts (corrected split)
            total_price = Decimal(str(reservation['property_price']))
            reservation_amount = Decimal(str(reservation['amount']))  # Already paid 0.1% (buyer)
            seller_commission = total_price * SELLER_COMMISSION_PERCENT  # 0.9% from seller
            agent_commission = total_price * AGENT_SHARE_FROM_SELLER  # 0.7% to agent
            platform_fee = (total_price * PLATFORM_SHARE_FROM_SELLER) + reservation_amount  # 0.2% + 0.1% = 0.3% total to NestFind
            
            # Create transaction
            transaction = await conn.fetchrow("""
                INSERT INTO transactions (
                    property_id, reservation_id,
                    buyer_id, seller_id, agent_id,
                    total_price, reservation_amount, commission_amount,
                    platform_fee, agent_commission,
                    registration_date, registration_location,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'INITIATED')
                RETURNING id, created_at
            """, reservation['property_id'], reservation_id,
                reservation['buyer_id'], reservation['seller_id'], agent_id,
                total_price, reservation_amount, seller_commission,
                platform_fee, agent_commission,
                registration_date, registration_location)
            
            # Notify buyer and seller
            try:
                notifications_service = NotificationsService(self.db)
                await notifications_service.create_notification(
                    user_id=reservation['buyer_id'],
                    notification_type='REGISTRATION_SCHEDULED',
                    title='Registration Scheduled',
                    message=f'Registration for {reservation["property_title"]} is scheduled for {registration_date.strftime("%Y-%m-%d %H:%M")}',
                    related_entity_type='transaction',
                    related_entity_id=transaction['id']
                )
                await notifications_service.create_notification(
                    user_id=reservation['seller_id'],
                    notification_type='REGISTRATION_SCHEDULED',
                    title='Registration Scheduled',
                    message=f'Registration for {reservation["property_title"]} is scheduled for {registration_date.strftime("%Y-%m-%d %H:%M")}',
                    related_entity_type='transaction',
                    related_entity_id=transaction['id']
                )
            except Exception:
                pass
            
            return {
                "success": True,
                "transaction": {
                    "id": str(transaction['id']),
                    "reservation_id": str(reservation_id),
                    "property_id": str(reservation['property_id']),
                    "property_title": reservation['property_title'],
                    "total_price": float(total_price),
                    "commission_breakdown": {
                        "total_commission": float(total_commission),
                        "already_paid": float(reservation_amount),
                        "remaining_commission": float(commission_remaining),
                        "agent_share": float(agent_commission),
                        "platform_share": float(platform_fee)
                    },
                    "registration_date": registration_date.isoformat(),
                    "registration_location": registration_location,
                    "status": "INITIATED",
                    "display_status": "Pending Verification",
                    "created_at": transaction['created_at'].isoformat()
                },
                "next_step": "On registration day, verify buyer OTP first, then seller OTP"
            }
    
    async def send_buyer_otp(
        self,
        transaction_id: UUID,
        agent_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent triggers sending OTP to buyer."""
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT t.*, u.email as buyer_email, u.full_name as buyer_name
                FROM transactions t
                JOIN users u ON u.id = t.buyer_id
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if transaction['status'] != 'INITIATED':
                return {
                    "success": False,
                    "error": f"Cannot send buyer OTP in {transaction['status']} status"
                }
            
            # Generate and store OTP
            otp = self._generate_otp()
            otp_hash = self._hash_otp(otp)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
            
            await conn.execute("""
                UPDATE transactions 
                SET buyer_otp_hash = $2, buyer_otp_expires_at = $3
                WHERE id = $1
            """, transaction_id, otp_hash, expires_at)
            
            # Send OTP via email
            try:
                email_service = EmailService()
                await email_service.send_otp_email(
                    to_email=transaction['buyer_email'],
                    otp=otp,
                    name=transaction['buyer_name'],
                    purpose="property registration verification"
                )
            except Exception as e:
                return {"success": False, "error": f"Failed to send OTP email: {str(e)}"}
            
            return {
                "success": True,
                "message": f"OTP sent to buyer at {transaction['buyer_email'][:3]}***",
                "expires_in_minutes": OTP_EXPIRY_MINUTES
            }
    
    async def verify_buyer_otp(
        self,
        transaction_id: UUID,
        otp_code: str,
        buyer_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Buyer verifies their OTP."""
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT * FROM transactions WHERE id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['buyer_id'] != buyer_id:
                return {"success": False, "error": "Access denied"}
            
            if transaction['status'] != 'INITIATED':
                return {
                    "success": False,
                    "error": f"Cannot verify buyer OTP in {transaction['status']} status"
                }
            
            # Check OTP
            if not transaction['buyer_otp_hash']:
                return {"success": False, "error": "No OTP has been sent yet"}
            
            now = datetime.now(timezone.utc)
            expires_at = transaction['buyer_otp_expires_at']
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if now > expires_at:
                return {"success": False, "error": "OTP has expired"}
            
            if self._hash_otp(otp_code) != transaction['buyer_otp_hash']:
                return {"success": False, "error": "Invalid OTP"}
            
            # Update transaction
            await conn.execute("""
                UPDATE transactions 
                SET status = 'BUYER_VERIFIED', 
                    buyer_otp_verified_at = NOW()
                WHERE id = $1
            """, transaction_id)
            
            return {
                "success": True,
                "message": "Buyer verification successful",
                "transaction": {
                    "id": str(transaction_id),
                    "status": "BUYER_VERIFIED",
                    "display_status": "Buyer Verified"
                },
                "next_step": "Now verify seller OTP"
            }
    
    async def send_seller_otp(
        self,
        transaction_id: UUID,
        agent_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Agent triggers sending OTP to seller."""
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT t.*, u.email as seller_email, u.full_name as seller_name
                FROM transactions t
                JOIN users u ON u.id = t.seller_id
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if transaction['status'] != 'BUYER_VERIFIED':
                return {
                    "success": False,
                    "error": f"Cannot send seller OTP in {transaction['status']} status. Buyer must verify first."
                }
            
            # Generate and store OTP
            otp = self._generate_otp()
            otp_hash = self._hash_otp(otp)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
            
            await conn.execute("""
                UPDATE transactions 
                SET seller_otp_hash = $2, seller_otp_expires_at = $3
                WHERE id = $1
            """, transaction_id, otp_hash, expires_at)
            
            # Send OTP via email
            try:
                email_service = EmailService()
                await email_service.send_otp_email(
                    to_email=transaction['seller_email'],
                    otp=otp,
                    name=transaction['seller_name'],
                    purpose="property registration verification"
                )
            except Exception as e:
                return {"success": False, "error": f"Failed to send OTP email: {str(e)}"}
            
            return {
                "success": True,
                "message": f"OTP sent to seller at {transaction['seller_email'][:3]}***",
                "expires_in_minutes": OTP_EXPIRY_MINUTES
            }
    
    async def verify_seller_otp(
        self,
        transaction_id: UUID,
        otp_code: str,
        seller_id: UUID,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Seller verifies their OTP."""
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT * FROM transactions WHERE id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['seller_id'] != seller_id:
                return {"success": False, "error": "Access denied"}
            
            if transaction['status'] != 'BUYER_VERIFIED':
                return {
                    "success": False,
                    "error": f"Cannot verify seller OTP in {transaction['status']} status"
                }
            
            # Check OTP
            if not transaction['seller_otp_hash']:
                return {"success": False, "error": "No OTP has been sent yet"}
            
            now = datetime.now(timezone.utc)
            expires_at = transaction['seller_otp_expires_at']
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if now > expires_at:
                return {"success": False, "error": "OTP has expired"}
            
            if self._hash_otp(otp_code) != transaction['seller_otp_hash']:
                return {"success": False, "error": "Invalid OTP"}
            
            # Update transaction
            await conn.execute("""
                UPDATE transactions 
                SET status = 'SELLER_VERIFIED', 
                    seller_otp_verified_at = NOW()
                WHERE id = $1
            """, transaction_id)
            
            return {
                "success": True,
                "message": "Seller verification successful",
                "transaction": {
                    "id": str(transaction_id),
                    "status": "SELLER_VERIFIED",
                    "display_status": "All Parties Verified"
                },
                "next_step": "Agent can now complete the transaction"
            }
    
    async def complete_transaction(
        self,
        transaction_id: UUID,
        agent_id: UUID,
        gps_lat: Optional[float] = None,
        gps_lng: Optional[float] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent completes the transaction.
        
        This marks the property as SOLD and the reservation as COMPLETED.
        """
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT t.*, p.title as property_title
                FROM transactions t
                JOIN properties p ON p.id = t.property_id
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['agent_id'] != agent_id:
                return {"success": False, "error": "Access denied"}
            
            if transaction['status'] != 'SELLER_VERIFIED':
                return {
                    "success": False,
                    "error": f"Cannot complete transaction in {transaction['status']} status. Both parties must verify first."
                }
            
            async with conn.transaction():
                # Update transaction
                await conn.execute("""
                    UPDATE transactions 
                    SET status = 'COMPLETED', 
                        completed_at = NOW(),
                        agent_gps_lat = $2,
                        agent_gps_lng = $3,
                        agent_gps_verified_at = NOW()
                    WHERE id = $1
                """, transaction_id, gps_lat, gps_lng)
                
                # Update reservation
                await conn.execute("""
                    UPDATE reservations SET status = 'COMPLETED' 
                    WHERE id = $1
                """, transaction['reservation_id'])
                
                # Update property to SOLD
                await conn.execute("""
                    UPDATE properties 
                    SET status = 'SOLD', sold_at = NOW() 
                    WHERE id = $1
                """, transaction['property_id'])
            
            # Notify all parties
            try:
                notifications_service = NotificationsService(self.db)
                for user_id in [transaction['buyer_id'], transaction['seller_id']]:
                    await notifications_service.create_notification(
                        user_id=user_id,
                        notification_type='TRANSACTION_COMPLETED',
                        title='Transaction Completed',
                        message=f'The transaction for {transaction["property_title"]} has been completed successfully!',
                        related_entity_type='transaction',
                        related_entity_id=transaction_id
                    )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Transaction completed successfully!",
                "transaction": {
                    "id": str(transaction_id),
                    "property_id": str(transaction['property_id']),
                    "property_title": transaction['property_title'],
                    "status": "COMPLETED",
                    "display_status": "Completed",
                    "total_price": float(transaction['total_price']),
                    "agent_commission": float(transaction['agent_commission']),
                    "platform_fee": float(transaction['platform_fee']),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            }
    
    async def process_seller_payment(
        self,
        transaction_id: UUID,
        seller_id: UUID,
        payment_reference: str,
        payment_method: str = 'BANK_TRANSFER',
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process seller's 0.9% commission payment.
        
        After both parties are verified and agreements signed,
        seller pays the 0.9% commission.
        """
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT t.*, p.title as property_title
                FROM transactions t
                JOIN properties p ON p.id = t.property_id
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['seller_id'] != seller_id:
                return {"success": False, "error": "Only the seller can make this payment"}
            
            if transaction['status'] != 'ALL_VERIFIED':
                return {
                    "success": False,
                    "error": f"Payment cannot be made in {transaction['status']} status. All verifications must be complete first."
                }
            
            # Record payment
            await conn.execute("""
                UPDATE transactions 
                SET status = 'SELLER_PAID',
                    seller_payment_reference = $2,
                    seller_payment_method = $3,
                    seller_paid_at = NOW()
                WHERE id = $1
            """, transaction_id, payment_reference, payment_method)
            
            # Log payment
            await conn.execute("""
                INSERT INTO payment_logs (
                    transaction_id, payer_id, amount, payment_type, status,
                    payment_reference, payment_method
                )
                VALUES ($1, $2, $3, 'COMMISSION', 'COMPLETED', $4, $5)
            """, transaction_id, seller_id, transaction['commission_amount'],
                payment_reference, payment_method)
            
            # Move to documents pending
            await conn.execute("""
                UPDATE transactions SET status = 'DOCUMENTS_PENDING'
                WHERE id = $1
            """, transaction_id)
            
            return {
                "success": True,
                "message": "Commission payment recorded successfully",
                "transaction": {
                    "id": str(transaction_id),
                    "status": "DOCUMENTS_PENDING",
                    "display_status": "Awaiting Documents",
                    "amount_paid": float(transaction['commission_amount'])
                },
                "next_step": "All parties must now upload required documents"
            }
    
    async def admin_approve_transaction(
        self,
        transaction_id: UUID,
        admin_id: UUID,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Admin approves transaction after document verification.
        
        This triggers:
        - Property marked as SOLD
        - Agent commission marked for disbursement
        - Transaction completed
        """
        async with self.db.acquire() as conn:
            # Verify admin
            is_admin = await conn.fetchval("""
                SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND role = 'admin')
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            transaction = await conn.fetchrow("""
                SELECT t.*, p.title as property_title
                FROM transactions t
                JOIN properties p ON p.id = t.property_id
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            if transaction['status'] != 'ADMIN_REVIEW':
                return {
                    "success": False,
                    "error": f"Transaction is not ready for approval (status: {transaction['status']})"
                }
            
            async with conn.transaction():
                # Complete transaction
                await conn.execute("""
                    UPDATE transactions 
                    SET status = 'COMPLETED',
                        completed_at = NOW(),
                        admin_approved_by = $2,
                        admin_approved_at = NOW(),
                        admin_notes = $3,
                        agent_disbursed_at = NOW()
                    WHERE id = $1
                """, transaction_id, admin_id, notes)
                
                # Complete reservation
                await conn.execute("""
                    UPDATE reservations SET status = 'COMPLETED' 
                    WHERE id = $1
                """, transaction['reservation_id'])
                
                # Mark property SOLD
                await conn.execute("""
                    UPDATE properties 
                    SET status = 'SOLD', sold_at = NOW() 
                    WHERE id = $1
                """, transaction['property_id'])
            
            # Notify all parties
            try:
                notifications_service = NotificationsService(self.db)
                for user_id in [transaction['buyer_id'], transaction['seller_id'], transaction['agent_id']]:
                    await notifications_service.create_notification(
                        user_id=user_id,
                        notification_type='TRANSACTION_COMPLETED',
                        title='Transaction Completed!',
                        message=f'The sale of {transaction["property_title"]} has been completed and verified.',
                        related_entity_type='transaction',
                        related_entity_id=transaction_id
                    )
            except Exception:
                pass
            
            return {
                "success": True,
                "message": "Transaction approved and completed!",
                "transaction": {
                    "id": str(transaction_id),
                    "property_id": str(transaction['property_id']),
                    "property_title": transaction['property_title'],
                    "status": "COMPLETED",
                    "agent_commission": float(transaction['agent_commission']),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            }
    
    async def get_transaction_by_id(
        self,
        transaction_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get transaction details. Must be buyer, seller, or agent."""
        async with self.db.acquire() as conn:
            transaction = await conn.fetchrow("""
                SELECT 
                    t.*,
                    p.title as property_title, p.city as property_city,
                    p.address as property_address,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    agent.full_name as agent_name
                FROM transactions t
                JOIN properties p ON p.id = t.property_id
                JOIN users buyer ON buyer.id = t.buyer_id
                JOIN users seller ON seller.id = t.seller_id
                JOIN users agent ON agent.id = t.agent_id
                WHERE t.id = $1
            """, transaction_id)
            
            if not transaction:
                return {"success": False, "error": "Transaction not found"}
            
            # Check access
            is_buyer = transaction['buyer_id'] == user_id
            is_seller = transaction['seller_id'] == user_id
            is_agent = transaction['agent_id'] == user_id
            
            if not is_buyer and not is_seller and not is_agent:
                return {"success": False, "error": "Access denied"}
            
            return {
                "success": True,
                "transaction": {
                    "id": str(transaction['id']),
                    "property": {
                        "id": str(transaction['property_id']),
                        "title": transaction['property_title'],
                        "city": transaction['property_city'],
                        "address": transaction['property_address']
                    },
                    "buyer": {
                        "id": str(transaction['buyer_id']),
                        "name": transaction['buyer_name'],
                        "verified": transaction['buyer_otp_verified_at'] is not None
                    },
                    "seller": {
                        "id": str(transaction['seller_id']),
                        "name": transaction['seller_name'],
                        "verified": transaction['seller_otp_verified_at'] is not None
                    },
                    "agent": {
                        "id": str(transaction['agent_id']),
                        "name": transaction['agent_name']
                    },
                    "total_price": float(transaction['total_price']),
                    "commission": {
                        "total": float(transaction['commission_amount']),
                        "agent_share": float(transaction['agent_commission']),
                        "platform_share": float(transaction['platform_fee'])
                    },
                    "registration_date": transaction['registration_date'].isoformat() if transaction['registration_date'] else None,
                    "registration_location": transaction['registration_location'],
                    "status": transaction['status'],
                    "display_status": self._get_display_status(transaction['status']),
                    "created_at": transaction['created_at'].isoformat(),
                    "completed_at": transaction['completed_at'].isoformat() if transaction['completed_at'] else None,
                    "allowed_actions": self._compute_allowed_actions(
                        transaction['status'], 
                        is_buyer=is_buyer, 
                        is_seller=is_seller, 
                        is_agent=is_agent
                    )
                }
            }
    
    async def get_transactions(
        self,
        user_id: UUID,
        role: str,  # 'buyer', 'seller', or 'agent'
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get list of transactions for a user.
        
        - Buyer sees transactions where they are the buyer
        - Seller sees transactions where they are the seller
        - Agent sees transactions assigned to them
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Build query based on role
            if role == 'buyer':
                base_query = "t.buyer_id = $1"
            elif role == 'seller':
                base_query = "t.seller_id = $1"
            elif role == 'agent':
                base_query = "t.agent_id = $1"
            else:
                return {"success": False, "error": "Invalid role"}
            
            # Add status filter
            params = [user_id]
            if status_filter:
                base_query += f" AND t.status = ${len(params) + 1}"
                params.append(status_filter)
            
            # Get total count
            count_row = await conn.fetchrow(f"""
                SELECT COUNT(*) as total FROM transactions t
                WHERE {base_query}
            """, *params)
            
            # Get transactions with details
            params.extend([per_page, offset])
            transactions = await conn.fetch(f"""
                SELECT 
                    t.id, t.property_id, t.reservation_id,
                    t.buyer_id, t.seller_id, t.agent_id,
                    t.total_price, t.commission_amount, t.platform_fee, t.agent_commission,
                    t.registration_date, t.registration_location,
                    t.status, t.created_at, t.completed_at,
                    p.title as property_title, p.city as property_city,
                    buyer.full_name as buyer_name,
                    seller.full_name as seller_name,
                    agent.full_name as agent_name
                FROM transactions t
                JOIN properties p ON p.id = t.property_id
                JOIN users buyer ON buyer.id = t.buyer_id
                JOIN users seller ON seller.id = t.seller_id
                JOIN users agent ON agent.id = t.agent_id
                WHERE {base_query}
                ORDER BY t.registration_date ASC NULLS LAST, t.created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
            """, *params)
            
            is_agent = role == 'agent'
            is_buyer = role == 'buyer'
            is_seller = role == 'seller'
            
            return {
                "success": True,
                "transactions": [
                    {
                        "id": str(t['id']),
                        "property_id": str(t['property_id']),
                        "property_title": t['property_title'],
                        "property_city": t['property_city'],
                        "buyer_id": str(t['buyer_id']),
                        "buyer_name": t['buyer_name'],
                        "seller_id": str(t['seller_id']),
                        "seller_name": t['seller_name'],
                        "agent_id": str(t['agent_id']),
                        "agent_name": t['agent_name'],
                        "total_price": float(t['total_price']),
                        "commission": float(t['commission_amount']) if t['commission_amount'] else None,
                        "registration_date": t['registration_date'].isoformat() if t['registration_date'] else None,
                        "registration_location": t['registration_location'],
                        "status": t['status'],
                        "display_status": self._get_display_status(t['status']),
                        "created_at": t['created_at'].isoformat(),
                        "completed_at": t['completed_at'].isoformat() if t['completed_at'] else None,
                        "allowed_actions": self._compute_allowed_actions(
                            t['status'], is_agent=is_agent, is_buyer=is_buyer, is_seller=is_seller
                        )
                    }
                    for t in transactions
                ],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": count_row['total'],
                    "total_pages": (count_row['total'] + per_page - 1) // per_page
                }
            }

