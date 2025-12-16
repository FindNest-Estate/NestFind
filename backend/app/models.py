from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text, JSON, CheckConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime, timedelta
import uuid
from enum import Enum as PyEnum

class VisitStatusEnum(PyEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COUNTER_PROPOSED = "COUNTER_PROPOSED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"

class AgentClientStatus(PyEnum):
    REQUESTED = "REQUESTED"
    OFFER_SENT = "OFFER_SENT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

class AgentClientServiceType(PyEnum):
    BUYING = "BUYING"
    SELLING = "SELLING"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String)
    phone = Column(String, nullable=False)
    role = Column(String, nullable=False, default='buyer') # 'buyer', 'seller', 'agent', 'admin'
    avatar_url = Column(String)
    bio = Column(Text)
    agency_name = Column(String)
    license_number = Column(String)
    experience_years = Column(Integer, default=0)
    social_links = Column(JSON, default={}) # {"linkedin": "", "twitter": "", "instagram": ""}
    notification_preferences = Column(JSON, default={"email_marketing": True, "email_security": True, "push_new_leads": True, "push_messages": True})
    is_active = Column(Boolean, default=True)
    
    # Find Agent / Uber-style fields
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    service_radius = Column(Integer, default=50) # km
    service_areas = Column(String, default="") # Comma-separated list of areas
    commission_rate = Column(Float, default=2.0) # %
    is_available = Column(Boolean, default=True) # Online/Offline
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    properties = relationship("Property", back_populates="owner")
    bookings = relationship("Booking", foreign_keys="[Booking.user_id]", back_populates="user")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    favorites = relationship("Favorite", back_populates="user")
    recently_viewed = relationship("RecentlyViewed", back_populates="user", order_by="desc(RecentlyViewed.viewed_at)")
    favorites = relationship("Favorite", back_populates="user")
    recently_viewed = relationship("RecentlyViewed", back_populates="user", order_by="desc(RecentlyViewed.viewed_at)")
    offers = relationship("Offer", back_populates="buyer")

    # Agent Relations
    agent_clients = relationship("AgentClient", foreign_keys="[AgentClient.agent_id]", back_populates="agent")
    my_agents = relationship("AgentClient", foreign_keys="[AgentClient.client_id]", back_populates="client")

    # Agent Relations
    agent_clients = relationship("AgentClient", foreign_keys="[AgentClient.agent_id]", back_populates="agent")
    my_agents = relationship("AgentClient", foreign_keys="[AgentClient.client_id]", back_populates="client")


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    property_type = Column(String, nullable=False) # 'apartment', 'villa', 'plot', etc.
    listing_type = Column(String, nullable=False) # 'sell', 'rent', 'lease'
    status = Column(String, default='pending') # 'pending', 'approved', 'sold'
    sold_at = Column(DateTime, nullable=True)
    
    # Location
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Seller Info (for specific listing contact if different from agent profile)
    seller_name = Column(String, nullable=True)
    seller_phone = Column(String, nullable=True)

    # Dynamic Data
    specifications = Column(JSON, nullable=True) # Stores bedrooms, area, dimensions, etc.
    amenities = Column(JSON, nullable=True) # List of features ["Pool", "Gym"]

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="properties")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete")
    bookings = relationship("Booking", back_populates="property")
    favorites = relationship("Favorite", back_populates="property")
    offers = relationship("Offer", back_populates="property")


class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    image_path = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False)

    property = relationship("Property", back_populates="images")


class Booking(Base):
    __tablename__ = "bookings"
    
    # PRIMARY KEY - Using Integer to match existing User/Property IDs if they are Integers. 
    # However, the user provided code uses UUID strings. 
    # Given existing User/Property use Integer, I will adapt Booking to use Integer for IDs to avoid foreign key type mismatch,
    # BUT I will use the fields requested.
    # WAIT, User and Property models use Integer primary keys. The user provided code uses String(36) for FKs.
    # This will cause a mismatch. I MUST stick to Integer for FKs to User/Property.
    # But for Booking ID itself, I can use Integer or String. Existing was Integer.
    # I will keep Integer for consistency with existing codebase unless instructed otherwise.
    # The user's code was "SQLite Adaptations". I should adapt it to FIT the existing schema (Integer IDs).
    
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Buyer
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Agent (Owner of property)
    
    # STATUS & TIMELINE
    status = Column(String(20), default=VisitStatusEnum.PENDING.value, nullable=False)
    
    # Original fields mapped to new structure or kept
    visit_date = Column(String, nullable=True) # Keeping for backward compatibility or migration
    visit_time = Column(String, nullable=True) # Keeping for backward compatibility
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=7), nullable=False)
    
    # TIME SLOTS (SQLite JSON)
    preferred_time_slots = Column(JSON, nullable=False, default=[])  # ['2025-12-05 10:00', '2025-12-05 14:00']
    agent_suggested_slot = Column(String, nullable=True)
    approved_slot = Column(String, nullable=True)

    # OTP VERIFICATION
    visit_otp = Column(String, nullable=True) # 4 digits
    visit_otp_expires_at = Column(DateTime, nullable=True)

    # VISIT WORKFLOW FIELDS
    visit_start_time = Column(DateTime, nullable=True)
    visit_end_time = Column(DateTime, nullable=True)
    check_in_location = Column(String, nullable=True) # "Lat,Lng"
    visit_images = Column(JSON, default=[]) # List of image URLs
    
    # NOTES & FEEDBACK
    buyer_message = Column(String(500), nullable=True)
    agent_notes = Column(String(500), nullable=True) # Was 'notes'
    cancellation_reason = Column(String(500), nullable=True)
    cancelled_by = Column(String(20), nullable=True)  # 'AGENT' or 'BUYER'
    
    # RATINGS (1-5 stars)
    buyer_rating = Column(Integer, nullable=True)  # 1-5
    buyer_feedback = Column(String(500), nullable=True)
    agent_rating = Column(Integer, nullable=True)
    agent_feedback = Column(String(500), nullable=True)
    
    # ENHANCED FEEDBACK (Agent reporting on Buyer)
    buyer_interest = Column(String(50), nullable=True) # 'HIGH', 'MEDIUM', 'LOW', 'NO_INTEREST'
    buyer_timeline = Column(String(50), nullable=True) # 'IMMEDIATE', '1_MONTH', '3_MONTHS', 'JUST_BROWSING'
    buyer_budget_feedback = Column(String(50), nullable=True) # 'WITHIN_BUDGET', 'OVER_BUDGET', 'UNDER_BUDGET'
    location_check_result = Column(String(50), nullable=True) # 'MATCH', 'MISMATCH', 'NOT_VERIFIED'
    
    # TRACKING
    reminder_sent_at = Column(DateTime, nullable=True)
    last_status_changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    version = Column(Integer, default=1)  # Optimistic locking
    
    property = relationship("Property", back_populates="bookings")
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings")
    # agent = relationship("User", foreign_keys=[agent_id]) # Optional, if needed
    reviews = relationship("Review", back_populates="booking")

    # Constraints for SQLite
    __table_args__ = (
        CheckConstraint("status IN ('PENDING', 'APPROVED', 'REJECTED', 'COUNTER_PROPOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED')", name='ck_valid_status'),
        CheckConstraint("buyer_rating IS NULL OR (buyer_rating >= 1 AND buyer_rating <= 5)", name='ck_valid_buyer_rating'),
        CheckConstraint("agent_rating IS NULL OR (agent_rating >= 1 AND agent_rating <= 5)", name='ck_valid_agent_rating'),
        Index('idx_booking_agent_status', 'agent_id', 'status'),
        Index('idx_booking_property_buyer', 'property_id', 'user_id'), # Changed buyer_id to user_id to match existing
        Index('idx_booking_expiry', 'expiry_date'),
    )


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # RECIPIENTS & TRIGGERS
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    triggered_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # CONTENT
    title = Column(String(200), nullable=False)
    message = Column(String(1000), nullable=False)
    action_url = Column(String(500), nullable=True)
    
    # TYPE & PRIORITY
    notification_type = Column(String(50), nullable=False)  # VISIT_APPROVED, VISIT_REJECTED, etc.
    priority = Column(String(20), default='MEDIUM')  # LOW, MEDIUM, HIGH, URGENT
    
    # DELIVERY CHANNELS (SQLite JSON)
    channels = Column(JSON, default=['IN_APP'])  # ['IN_APP', 'EMAIL', 'SMS']
    email_sent = Column(Boolean, default=False)
    email_status = Column(String(50), nullable=True)  # SENT, FAILED, PENDING
    sms_sent = Column(Boolean, default=False)
    sms_status = Column(String(50), nullable=True)
    
    # STATUS
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)
    
    # RELATED ENTITY
    related_entity_id = Column(Integer, nullable=False)
    related_entity_type = Column(String(50), nullable=False)  # VISIT, OFFER, PROPERTY
    
    # TIMESTAMPS
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=30), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_notifications_user_read', 'user_id', 'is_read'),
        Index('idx_notifications_user_type', 'user_id', 'notification_type'),
    )


class VisitAuditLog(Base):
    __tablename__ = "visit_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey('bookings.id'), nullable=False)
    
    action = Column(String(100), nullable=False)  # APPROVED, REJECTED, CANCELLED, etc.
    performed_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=True)
    
    details = Column(JSON, nullable=True)  # Extra JSON data
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_audit_visit', 'visit_id'),
    )


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)

    user = relationship("User", back_populates="favorites")
    property = relationship("Property", back_populates="favorites")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer)
    message_text = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


class RecentlyViewed(Base):
    __tablename__ = "recently_viewed"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="recently_viewed")
    property = relationship("Property")


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default='pending') # 'pending', 'accepted', 'rejected', 'countered', 'token_paid'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property", back_populates="offers")
    buyer = relationship("User", back_populates="offers")
    
    # New columns for documents
    acceptance_letter_url = Column(String, nullable=True)
    reservation_pdf_url = Column(String, nullable=True)  # NEW: Booking reservation certificate
    receipt_url = Column(String, nullable=True)
    sale_deed_url = Column(String, nullable=True)
    registration_date = Column(DateTime, nullable=True)
    
    # Registration Workflow Fields
    registration_slot_proposed = Column(DateTime, nullable=True) # Agent proposes slot
    registration_slot_accepted = Column(Boolean, default=False)  # Buyer accepts
    registration_slot_final = Column(DateTime, nullable=True)    # Final confirmed slot
    registration_otp = Column(String, nullable=True)             # OTP for physical verification
    registration_verified_at = Column(DateTime, nullable=True)   # When OTP + Location verified
    registration_location_lat = Column(Float, nullable=True)     # Verified Latitude
    registration_location_lng = Column(Float, nullable=True)     # Verified Longitude
    final_registration_doc_url = Column(String, nullable=True)   # Final Deed uploaded by Agent/Buyer
    admin_doc_verified = Column(Boolean, default=False)          # Admin check

    deal_payments = relationship("DealPayment", back_populates="offer")
    commission = relationship("Commission", uselist=False, back_populates="offer")
    commission_payout = relationship("CommissionPayout", uselist=False, back_populates="offer")


class CommissionPayout(Base):
    __tablename__ = "commission_payouts"
    
    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    
    total_commission_received = Column(Float, nullable=False)   # The 0.9% amount received
    agent_payout_amount = Column(Float, nullable=False)         # 80% of total
    platform_revenue_amount = Column(Float, nullable=False)     # 20% of total
    
    status = Column(String, default='PENDING')                  # 'PENDING', 'DISBURSED'
    transaction_reference = Column(String, nullable=True)       # Bank ref for agent payout
    disbursed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    offer = relationship("Offer", back_populates="commission_payout")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default='success')
    method = Column(String, default='offline/mock')
    type = Column(String, default='token') # 'token' or 'final'
    receipt_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    offer = relationship("Offer")
    buyer = relationship("User")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Agent
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Buyer
    rating = Column(Integer, nullable=False) # 1-5
    comment = Column(Text, nullable=True)
    visit_outcome = Column(String, nullable=True) # 'interested', 'not_interested', 'thinking', 'buying'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    booking = relationship("Booking", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewee = relationship("User", foreign_keys=[reviewee_id])


class DealPayment(Base):
    __tablename__ = "deal_payments"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    payment_type = Column(String, nullable=False) # 'TOKEN', 'REGISTRATION_GOVT', 'PLATFORM_COMMISSION'
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False) # 'ONLINE', 'OFFLINE_BANK_TRANSFER', 'UPI'
    transaction_reference = Column(String, nullable=True)
    payment_metadata = Column(JSON, nullable=True) # Stores 'account_number', 'ifsc', 'bank_name', 'upi_id' etc.
    proof_file_url = Column(String, nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default='PENDING') # 'PENDING', 'VERIFIED', 'REJECTED'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime, nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    offer = relationship("Offer", back_populates="deal_payments")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    total_commission_amount = Column(Float, nullable=False)
    platform_share = Column(Float, nullable=False) # 20%
    agent_share = Column(Float, nullable=False) # 80%
    payout_status = Column(String, default='PENDING') # 'PENDING', 'PROCESSED'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    offer = relationship("Offer", back_populates="commission")



class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    role = Column(String, nullable=False) # 'super_admin', 'admin', 'manager', 'support'
    permissions = Column(JSON, default=[]) # List of permission strings
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=False)
    action = Column(String, nullable=False) # 'user_created', 'property_approved', etc.
    resource_type = Column(String, nullable=True) # 'user', 'property', 'booking'
    resource_id = Column(Integer, nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    admin = relationship("AdminUser")


class CompanyRevenue(Base):
    __tablename__ = "company_revenue"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    revenue_type = Column(String, nullable=False) # 'BOOKING_TOKEN', 'PLATFORM_COMMISSION'
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_reference = Column(String, nullable=True)
    status = Column(String, default='COMPLETED')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    offer = relationship("Offer")
    payer = relationship("User")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, index=True) # e.g., 'SUP-12345'
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False) # 'technical', 'billing', 'complaint', 'other'
    priority = Column(String, default='medium') # 'critical', 'high', 'medium', 'low'
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default='open') # 'open', 'in_progress', 'resolved', 'closed'
    assigned_to_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    assigned_to = relationship("AdminUser")


class BankOffer(Base):
    __tablename__ = "bank_offers"

    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String, nullable=False)
    bank_logo_icon = Column(String, nullable=False) # Ionicon name e.g., 'logo-bitcoin'
    interest_rate = Column(String, nullable=False) # e.g. '8.35%'
    processing_fee = Column(String, nullable=False) # e.g. '0.5%'
    max_tenure_years = Column(Integer, default=20)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentClient(Base):
    __tablename__ = "agent_clients"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    service_type = Column(String, nullable=False) # 'BUYING', 'SELLING'
    status = Column(String, default="REQUESTED", nullable=False) # REQUESTED, OFFER_SENT, ACTIVE, COMPLETED, REJECTED
    
    commission_rate = Column(Float, nullable=True) # Proposed/Agreed commission %
    contract_url = Column(String, nullable=True) # Signed digital agreement
    
    property_preferences = Column(JSON, nullable=True) # Buy criteria or Sell property details
    initial_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    agent = relationship("User", foreign_keys=[agent_id], back_populates="agent_clients")
    client = relationship("User", foreign_keys=[client_id], back_populates="my_agents")

