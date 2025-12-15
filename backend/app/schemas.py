from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    phone: str
    role: str = 'buyer'
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    agency_name: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = 0
    social_links: Optional[Dict[str, str]] = {}
    notification_preferences: Optional[Dict[str, bool]] = {"email_marketing": True, "email_security": True, "push_new_leads": True, "push_messages": True}
    
    # Find Agent fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius: Optional[int] = 50
    commission_rate: Optional[float] = 2.0
    is_available: bool = True

class UserCreate(UserBase):
    password: str
    agency_name: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    agency_name: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    social_links: Optional[Dict[str, str]] = None
    notification_preferences: Optional[Dict[str, bool]] = None
    
    # Find Agent fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius: Optional[int] = None
    commission_rate: Optional[float] = None
    is_available: Optional[bool] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Property Image Schemas ---
class PropertyImageBase(BaseModel):
    image_path: str
    is_primary: bool = False

class PropertyImageCreate(PropertyImageBase):
    pass

class PropertyImage(PropertyImageBase):
    id: int
    property_id: int

    class Config:
        from_attributes = True

# --- Property Schemas ---
class PropertyBase(BaseModel):
    title: str
    description: str
    price: float
    property_type: str
    listing_type: str
    address: str
    city: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    amenities: Optional[List[str]] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyOut(PropertyBase):
    id: int
    user_id: int
    status: str
    sold_at: Optional[datetime] = None
    created_at: datetime
    images: List[PropertyImage] = []

    class Config:
        from_attributes = True

# --- Review Schemas ---
class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None
    visit_outcome: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class ReviewOut(ReviewBase):
    id: int
    booking_id: int
    reviewer_id: int
    reviewee_id: int
    created_at: datetime
    reviewer: Optional[UserOut] = None
    reviewee: Optional[UserOut] = None

    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingBase(BaseModel):
    property_id: int
    visit_date: Optional[str] = None # Deprecated but kept for compatibility
    visit_time: Optional[str] = None # Deprecated
    preferred_time_slots: List[str] = [] # New: List of ISO datetime strings
    buyer_message: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingUpdateStatus(BaseModel):
    action: str # 'APPROVE', 'REJECT', 'COUNTER', 'CANCEL', 'COMPLETE'
    slot: Optional[str] = None # For APPROVE or COUNTER
    reason: Optional[str] = None # For REJECT or CANCEL
    notes: Optional[str] = None # Agent notes
    expected_version: Optional[int] = None # Optimistic locking

class VisitReport(BaseModel):
    check_in_location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    agent_notes: str
    visit_images: List[str] = []
    
    # Enhanced Fields
    buyer_interest: Optional[str] = None
    buyer_timeline: Optional[str] = None
    buyer_budget_feedback: Optional[str] = None
    location_check_result: Optional[str] = None

class BookingRate(BaseModel):
    rating: int
    feedback: Optional[str] = None

class BookingOut(BookingBase):
    id: int
    user_id: int
    agent_id: int
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    expiry_date: datetime
    
    agent_suggested_slot: Optional[str] = None
    approved_slot: Optional[str] = None
    
    visit_otp: Optional[str] = None # Visible to buyer only normally, but simple for now
    
    visit_start_time: Optional[datetime] = None
    visit_end_time: Optional[datetime] = None
    check_in_location: Optional[str] = None
    visit_images: Optional[List[str]] = []
    
    agent_notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    
    buyer_rating: Optional[int] = None
    buyer_feedback: Optional[str] = None
    agent_rating: Optional[int] = None
    agent_feedback: Optional[str] = None
    
    # ENHANCED FEEDBACK
    buyer_interest: Optional[str] = None
    buyer_timeline: Optional[str] = None
    buyer_budget_feedback: Optional[str] = None
    location_check_result: Optional[str] = None
    
    version: int

    property: PropertyOut
    user: UserOut
    # reviews: List[ReviewOut] = [] # Using embedded fields instead

    class Config:
        from_attributes = True

class AgentSchedule(BaseModel):
    requests: List[BookingOut]
    upcoming: List[BookingOut]
    past: List[BookingOut]

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    action_url: Optional[str] = None
    notification_type: str
    priority: str
    is_read: bool
    created_at: datetime
    related_entity_id: int
    related_entity_type: str

    class Config:
        from_attributes = True

# --- Visit Audit Log Schemas ---
class VisitAuditLogOut(BaseModel):
    id: int
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    performed_by_id: int

    class Config:
        from_attributes = True

# --- Favorite Schemas ---
class FavoriteBase(BaseModel):
    property_id: int

class FavoriteCreate(FavoriteBase):
    pass

class Favorite(FavoriteBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Recently Viewed Schemas ---
class RecentlyViewedBase(BaseModel):
    property_id: int

class RecentlyViewedCreate(RecentlyViewedBase):
    pass

class RecentlyViewed(RecentlyViewedBase):
    id: int
    user_id: int
    viewed_at: datetime
    property: Optional[PropertyOut] = None

    class Config:
        from_attributes = True

# --- Offer Schemas ---
class OfferBase(BaseModel):
    property_id: int
    amount: float

class OfferCreate(OfferBase):
    pass

class OfferOut(OfferBase):
    id: int
    buyer_id: int
    status: str
    created_at: datetime
    acceptance_letter_url: Optional[str] = None
    reservation_pdf_url: Optional[str] = None # Added missing field
    receipt_url: Optional[str] = None
    sale_deed_url: Optional[str] = None
    registration_date: Optional[datetime] = None
    
    # Registration Workflow
    registration_slot_proposed: Optional[datetime] = None
    registration_slot_accepted: bool = False
    registration_slot_final: Optional[datetime] = None
    registration_otp: Optional[str] = None
    registration_verified_at: Optional[datetime] = None
    registration_location_lat: Optional[float] = None
    registration_location_lng: Optional[float] = None
    final_registration_doc_url: Optional[str] = None
    admin_doc_verified: bool = False

    property: Optional[PropertyOut] = None
    buyer: Optional[UserOut] = None

    class Config:
        from_attributes = True

class ScheduleRegistration(BaseModel):
    registration_date: datetime

# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    offer_id: int
    amount: float

class TransactionOut(BaseModel):
    id: int
    offer_id: int
    buyer_id: int
    amount: float
    status: str
    method: str
    receipt_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Deal Payment Schemas ---
class DealPaymentCreate(BaseModel):
    offer_id: int
    payment_type: str # 'TOKEN', 'REGISTRATION_GOVT', 'PLATFORM_COMMISSION'
    amount: float
    payment_method: str # 'ONLINE', 'OFFLINE_BANK_TRANSFER', 'UPI'
    transaction_reference: Optional[str] = None
    payment_metadata: Optional[Dict[str, Any]] = None
    proof_file_url: Optional[str] = None

class DealPaymentOut(BaseModel):
    id: int
    offer_id: int
    payment_type: str
    amount: float
    payment_method: str
    transaction_reference: Optional[str] = None
    payment_metadata: Optional[Dict[str, Any]] = None
    proof_file_url: Optional[str] = None
    uploaded_by_id: Optional[int] = None
    status: str
    created_at: datetime
    verified_at: Optional[datetime] = None
    verified_by_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Commission Schemas ---
class CommissionOut(BaseModel):
    id: int
    offer_id: int
    total_commission_amount: float
    platform_share: float
    agent_share: float
    payout_status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Message Schemas ---
class MessageBase(BaseModel):
    receiver_id: int
    property_id: Optional[int] = None
    message_text: str

class MessageCreate(MessageBase):
    pass

class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    property_id: Optional[int] = None
    message_text: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserOut] = None
    receiver: Optional[UserOut] = None

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    partner: UserOut
    last_message: MessageOut


# --- Admin Schemas ---
class AdminUserOut(BaseModel):
    id: int
    user_id: int
    role: str
    permissions: List[str]
    is_active: bool
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    admin_id: int
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    admin: Optional[AdminUserOut] = None

    class Config:
        from_attributes = True

class CompanyRevenueOut(BaseModel):
    id: int
    offer_id: int
    amount: float
    revenue_type: str
    payer_id: int
    transaction_reference: Optional[str] = None
    status: str
    created_at: datetime
    offer: Optional[OfferOut] = None
    payer: Optional[UserOut] = None

    class Config:
        from_attributes = True

class SupportTicketOut(BaseModel):
    id: int
    ticket_number: str
    user_id: int
    category: str
    priority: str
    subject: str
    description: Optional[str] = None
    status: str
    assigned_to_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    user: Optional[UserOut] = None
    assigned_to: Optional[AdminUserOut] = None

    class Config:
        from_attributes = True
class FinancialSummary(BaseModel):
    total_revenue: float
    total_commission_paid: float
    net_profit: float
    total_transaction_volume: float

class PropertyRevenue(BaseModel):
    property_id: int
    property_title: str
    total_collected: float
    platform_share: float
    agent_share: float
class DealOfferSettlement(BaseModel):
    offer_id: int
    buyer_name: str
    amount: float
    status: str
    token_payment: Optional[DealPaymentOut] = None
    sale_deed_url: Optional[str] = None
    registration_doc_url: Optional[str] = None # New single registration doc
    registration_doc_verified: bool = False    # New single verification status
    buyer_deed_payment: Optional[DealPaymentOut] = None
    seller_deed_payment: Optional[DealPaymentOut] = None
    commission_payment: Optional[DealPaymentOut] = None
    commission_record: Optional[CommissionOut] = None
    agent_payout_status: str # 'PENDING', 'READY_TO_DISBURSE', 'PAID'

class DealSettlementOut(BaseModel):
    property_id: int
    property_title: str
    property_address: str
    property_image: Optional[str] = None
    agent_name: str
    agent_email: str
    offers: List[DealOfferSettlement] = []
