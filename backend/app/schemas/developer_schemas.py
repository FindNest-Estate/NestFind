"""
Developer Portal Schemas — All Pydantic request/response models.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


# ---------------------------------------------------------------------------
# ENUMS
# ---------------------------------------------------------------------------

class ProjectType(str, Enum):
    APARTMENT = "APARTMENT"
    PLOT_VENTURE = "PLOT_VENTURE"
    VILLA_PROJECT = "VILLA_PROJECT"
    GATED_COMMUNITY = "GATED_COMMUNITY"
    COMMERCIAL = "COMMERCIAL"


class ProjectStatus(str, Enum):
    UPCOMING = "UPCOMING"
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION"
    READY_TO_MOVE = "READY_TO_MOVE"
    SOLD_OUT = "SOLD_OUT"


class UnitStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    NEGOTIATION = "NEGOTIATION"
    RESERVED = "RESERVED"
    BOOKED = "BOOKED"
    SOLD = "SOLD"
    BLOCKED = "BLOCKED"


class OfferStatus(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    COUNTERED = "COUNTERED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class DealStage(str, Enum):
    DEAL_STARTED = "DEAL_STARTED"
    VISIT_SCHEDULED = "VISIT_SCHEDULED"
    OFFER_SUBMITTED = "OFFER_SUBMITTED"
    IN_NEGOTIATION = "IN_NEGOTIATION"
    PRICE_AGREED = "PRICE_AGREED"
    AWAITING_TOKEN = "AWAITING_TOKEN"
    TOKEN_PAID = "TOKEN_PAID"
    AGREEMENT_SIGNED = "AGREEMENT_SIGNED"
    AT_REGISTRATION = "AT_REGISTRATION"
    COMPLETED = "COMPLETED"
    COMMISSION_RELEASED = "COMMISSION_RELEASED"
    CANCELLED = "CANCELLED"


class LeadStatus(str, Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    VISIT_SCHEDULED = "VISIT_SCHEDULED"
    NEGOTIATION = "NEGOTIATION"
    CLOSED = "CLOSED"


class DocumentType(str, Enum):
    RERA_CERTIFICATE = "RERA_CERTIFICATE"
    DTCP_APPROVAL = "DTCP_APPROVAL"
    BUILDING_PLAN = "BUILDING_PLAN"
    LEGAL_DOCUMENT = "LEGAL_DOCUMENT"
    BROCHURE = "BROCHURE"
    OTHER = "OTHER"


class DevAccountStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


# ---------------------------------------------------------------------------
# DEVELOPER REGISTRATION
# ---------------------------------------------------------------------------

class DeveloperRegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=200)
    developer_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8)
    office_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    rera_registration_number: Optional[str] = Field(None, max_length=50)
    company_registration_number: Optional[str] = Field(None, max_length=50)
    gst_number: Optional[str] = Field(None, max_length=20)
    projects_handled_before: Optional[int] = Field(0, ge=0)
    years_of_experience: Optional[int] = Field(0, ge=0)
    about_company: Optional[str] = Field(None, max_length=2000)


class DeveloperProfileResponse(BaseModel):
    id: str
    user_id: str
    company_name: str
    developer_name: str
    phone: str
    office_address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    rera_registration_number: Optional[str]
    company_registration_number: Optional[str]
    gst_number: Optional[str]
    projects_handled_before: int
    years_of_experience: int
    about_company: Optional[str]
    status: str
    rejection_reason: Optional[str]
    logo_url: Optional[str]
    settings: Optional[dict]
    created_at: datetime


# ---------------------------------------------------------------------------
# PROJECTS
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    project_name: str = Field(..., min_length=2, max_length=200)
    project_type: ProjectType
    status: ProjectStatus = ProjectStatus.UPCOMING
    location: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_land_area: Optional[float] = Field(None, gt=0)
    total_units: int = Field(0, ge=0)
    launch_date: Optional[date] = None
    possession_date: Optional[date] = None
    rera_number: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=5000)
    amenities: Optional[List[str]] = []
    brochure_pdf: Optional[str] = None
    master_layout: Optional[str] = None
    
    # New Fields
    pricing_rules: Optional[dict] = Field(default_factory=lambda: {
        "base_price": 0,
        "floor_rise": 0,
        "corner_plot_premium": 0,
        "east_facing_premium": 0,
        "west_facing_premium": 0,
        "north_facing_premium": 0,
        "south_facing_premium": 0,
        "parking_charges": 0,
        "amenity_charges": 0
    })
    auction_settings: Optional[dict] = Field(default_factory=lambda: {
        "is_auction_mode": False,
        "deadline_hours": 24,
        "min_bid_increment": 1000,
        "auto_accept_threshold_pct": 100
    })
    current_step: int = 1


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = Field(None, min_length=2, max_length=200)
    project_type: Optional[ProjectType] = None
    status: Optional[ProjectStatus] = None
    location: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_land_area: Optional[float] = Field(None, gt=0)
    total_units: Optional[int] = Field(None, ge=0)
    launch_date: Optional[date] = None
    possession_date: Optional[date] = None
    rera_number: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=5000)
    amenities: Optional[List[str]] = None
    brochure_pdf: Optional[str] = None
    master_layout: Optional[str] = None
    
    # New Fields
    pricing_rules: Optional[dict] = None
    auction_settings: Optional[dict] = None
    current_step: Optional[int] = None


class ProjectResponse(BaseModel):
    id: str
    developer_id: str
    project_name: str
    project_type: str
    status: str
    location: str
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    total_land_area: Optional[float]
    total_units: int
    launch_date: Optional[date]
    possession_date: Optional[date]
    rera_number: Optional[str]
    description: Optional[str]
    amenities: List[str]
    project_images: List[str]
    brochure_pdf: Optional[str]
    master_layout: Optional[str]
    
    # New Fields
    pricing_rules: Optional[dict]
    auction_settings: Optional[dict]
    current_step: int
    
    created_at: datetime
    updated_at: datetime
    # Computed
    available_units: Optional[int] = 0
    sold_units: Optional[int] = 0
    booked_units: Optional[int] = 0


# ---------------------------------------------------------------------------
# UNITS
# ---------------------------------------------------------------------------

class UnitCreate(BaseModel):
    project_id: UUID
    unit_number: str = Field(..., min_length=1, max_length=50)
    unit_type: str = Field(..., max_length=50)
    area_sqft: Optional[float] = Field(None, gt=0)
    price: float = Field(..., gt=0)
    facing: Optional[str] = Field(None, max_length=20)
    floor: Optional[int] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    parking: int = Field(0, ge=0)
    status: UnitStatus = UnitStatus.AVAILABLE
    
    # New Fields
    corner_plot: bool = False
    land_area: Optional[float] = None
    built_up_area: Optional[float] = None
    garden_area: Optional[float] = None


class UnitUpdate(BaseModel):
    unit_number: Optional[str] = Field(None, max_length=50)
    unit_type: Optional[str] = Field(None, max_length=50)
    area_sqft: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    facing: Optional[str] = Field(None, max_length=20)
    floor: Optional[int] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    parking: Optional[int] = Field(None, ge=0)
    status: Optional[UnitStatus] = None
    
    # New Fields
    corner_plot: Optional[bool] = None
    land_area: Optional[float] = None
    built_up_area: Optional[float] = None
    garden_area: Optional[float] = None


class UnitResponse(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str]
    unit_number: str
    unit_type: str
    area_sqft: Optional[float]
    price: float
    facing: Optional[str]
    floor: Optional[int]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    parking: int
    status: str
    
    # New Fields
    corner_plot: bool
    land_area: Optional[float]
    built_up_area: Optional[float]
    garden_area: Optional[float]
    
    created_at: datetime
    updated_at: datetime
    # Computed
    active_offer_count: Optional[int] = 0


# ---------------------------------------------------------------------------
# OFFERS
# ---------------------------------------------------------------------------

class DevOfferCreate(BaseModel):
    unit_id: UUID
    offer_price: float = Field(..., gt=0)
    buyer_message: Optional[str] = Field(None, max_length=500)
    expiry_hours: int = Field(48, ge=1, le=168)


class DevOfferCounter(BaseModel):
    counter_price: float = Field(..., gt=0)
    seller_message: Optional[str] = Field(None, max_length=500)
    expiry_hours: int = Field(48, ge=1, le=168)


class DevOfferReject(BaseModel):
    rejection_reason: Optional[str] = Field(None, max_length=500)


class OfferHistoryItem(BaseModel):
    id: str
    action: str
    actor_role: str
    amount: Optional[float]
    message: Optional[str]
    created_at: datetime


class OfferResponse(BaseModel):
    id: str
    unit_id: str
    unit_number: Optional[str]
    project_name: Optional[str]
    buyer_id: str
    buyer_name: Optional[str]
    offer_price: float
    counter_price: Optional[float]
    status: str
    rejection_reason: Optional[str]
    buyer_message: Optional[str]
    seller_message: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    history: Optional[List[OfferHistoryItem]] = []


# ---------------------------------------------------------------------------
# DEALS
# ---------------------------------------------------------------------------

class DealStageUpdate(BaseModel):
    deal_stage: DealStage
    notes: Optional[str] = Field(None, max_length=1000)
    token_amount: Optional[float] = Field(None, gt=0)
    agreement_date: Optional[date] = None
    registration_date: Optional[date] = None


class DealResponse(BaseModel):
    id: str
    offer_id: str
    unit_id: str
    unit_number: Optional[str]
    project_name: Optional[str]
    buyer_id: str
    buyer_name: Optional[str]
    developer_id: str
    agent_id: Optional[str]
    agent_name: Optional[str]
    final_price: float
    token_amount: Optional[float]
    commission_amount: Optional[float]
    commission_released: bool
    deal_stage: str
    agreement_date: Optional[date]
    registration_date: Optional[date]
    token_deadline: Optional[datetime]
    notes: Optional[str]
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    history: Optional[List[dict]] = []


# ---------------------------------------------------------------------------
# LEADS
# ---------------------------------------------------------------------------

class LeadCreate(BaseModel):
    project_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    email: Optional[str] = Field(None, max_length=255)
    source: str = Field("INTEREST_CLICK", max_length=50)


class LeadUpdate(BaseModel):
    lead_status: Optional[LeadStatus] = None
    visit_date: Optional[datetime] = None
    visit_notes: Optional[str] = Field(None, max_length=1000)
    assigned_agent_id: Optional[UUID] = None


class LeadResponse(BaseModel):
    id: str
    developer_id: str
    buyer_id: Optional[str]
    project_id: Optional[str]
    project_name: Optional[str]
    unit_id: Optional[str]
    unit_number: Optional[str]
    name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    source: str
    lead_status: str
    visit_date: Optional[datetime]
    visit_notes: Optional[str]
    assigned_agent_id: Optional[str]
    assigned_agent_name: Optional[str]
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# AGENTS
# ---------------------------------------------------------------------------

class DevAgentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    email: Optional[str] = Field(None, max_length=255)
    commission_percentage: float = Field(2.0, ge=0, le=20)
    agent_user_id: Optional[UUID] = None
    is_external: bool = False


class DevAgentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    email: Optional[str] = Field(None, max_length=255)
    commission_percentage: Optional[float] = Field(None, ge=0, le=20)
    is_active: Optional[bool] = None


class DevAgentResponse(BaseModel):
    id: str
    developer_id: str
    agent_user_id: Optional[str]
    name: str
    phone: Optional[str]
    email: Optional[str]
    commission_percentage: float
    is_active: bool
    is_external: bool
    created_at: datetime
    # Computed
    deals_closed: Optional[int] = 0
    total_commission_earned: Optional[float] = 0.0


# ---------------------------------------------------------------------------
# DOCUMENTS
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: str
    developer_id: str
    project_id: Optional[str]
    project_name: Optional[str]
    doc_type: str
    doc_name: str
    file_url: str
    file_size_bytes: Optional[int]
    mime_type: Optional[str]
    uploaded_at: datetime


# ---------------------------------------------------------------------------
# ANALYTICS
# ---------------------------------------------------------------------------

class AnalyticsSummary(BaseModel):
    total_projects: int
    total_units: int
    available_units: int
    negotiation_units: int
    reserved_units: int
    booked_units: int
    sold_units: int
    blocked_units: int
    active_negotiations: int
    total_leads: int
    new_leads: int
    total_deals: int
    active_deals: int
    completed_deals: int
    revenue_generated: float
    total_commission_paid: float


class LeadsPerProject(BaseModel):
    project_id: str
    project_name: str
    lead_count: int


class OffersPerUnit(BaseModel):
    unit_id: str
    unit_number: str
    project_name: str
    offer_count: int
    highest_offer: Optional[float]


class ConversionRate(BaseModel):
    stage: str
    count: int
    percentage: float


# ---------------------------------------------------------------------------
# SETTINGS
# ---------------------------------------------------------------------------

class DeveloperSettings(BaseModel):
    token_deadline_hours: int = Field(48, ge=1, le=168)
    min_offer_percentage: float = Field(90.0, ge=50, le=100)
    auto_reject_low_offers: bool = False
    allow_multiple_negotiations: bool = True
    default_agent_commission_pct: float = Field(2.0, ge=0, le=20)
    allow_external_agents: bool = True
    notify_new_lead: bool = True
    notify_new_offer: bool = True
    notify_offer_accepted: bool = True
    notify_token_deadline: bool = True
    notify_deal_stage_change: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False


class CompanySettings(BaseModel):
    company_name: Optional[str] = Field(None, max_length=200)
    office_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)

    # Verification Fields
    rera_registration_number: Optional[str] = Field(None, max_length=50)
    company_registration_number: Optional[str] = Field(None, max_length=50)
    gst_number: Optional[str] = Field(None, max_length=20)

    # Experience & Profile
    projects_handled_before: Optional[int] = Field(None, ge=0)
    years_of_experience: Optional[int] = Field(None, ge=0)
    about_company: Optional[str] = Field(None, max_length=2000)
    website: Optional[str] = Field(None, max_length=255)

    # Public Contact
    support_phone: Optional[str] = Field(None, max_length=15)
    support_email: Optional[str] = Field(None, max_length=255)


# ---------------------------------------------------------------------------
# PHASES & LAYOUT
# ---------------------------------------------------------------------------

class PhaseCreate(BaseModel):
    project_id: UUID
    phase_name: str = Field(..., min_length=1, max_length=100)
    total_units: int = Field(0, ge=0)
    status: str = "PLANNED"


class PhaseResponse(BaseModel):
    id: str
    project_id: str
    phase_name: str
    total_units: int
    status: str
    created_at: datetime


class LayoutUnitMapping(BaseModel):
    project_id: UUID
    unit_id: UUID
    x: int
    y: int
    width: int
    height: int
    shape_type: str = "rect"


class LayoutUnitResponse(BaseModel):
    id: str
    project_id: str
    unit_id: str
    unit_number: Optional[str]
    status: Optional[str]
    x: int
    y: int
    width: int
    height: int
    shape_type: str


# ---------------------------------------------------------------------------
# BUILDINGS & FLOORS (Visualization Engine)
# ---------------------------------------------------------------------------

class BuildingCreate(BaseModel):
    project_id: UUID
    building_name: str = Field(..., min_length=1, max_length=100)
    building_code: Optional[str] = Field(None, max_length=10)
    position_x: float = Field(0.5, ge=0, le=1)
    position_y: float = Field(0.5, ge=0, le=1)
    total_floors: int = Field(1, ge=1, le=200)
    units_per_floor: int = Field(4, ge=1, le=50)
    ground_floor_label: str = "Ground"
    facing: Optional[str] = Field("NORTH", max_length=20)
    model_url: Optional[str] = None
    facade_image: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)


class BuildingUpdate(BaseModel):
    building_name: Optional[str] = Field(None, max_length=100)
    building_code: Optional[str] = Field(None, max_length=10)
    position_x: Optional[float] = Field(None, ge=0, le=1)
    position_y: Optional[float] = Field(None, ge=0, le=1)
    total_floors: Optional[int] = Field(None, ge=1, le=200)
    units_per_floor: Optional[int] = Field(None, ge=1, le=50)
    ground_floor_label: Optional[str] = None
    facing: Optional[str] = Field(None, max_length=20)
    model_url: Optional[str] = None
    facade_image: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = None


class BuildingResponse(BaseModel):
    id: str
    project_id: str
    building_name: str
    building_code: Optional[str]
    position_x: float
    position_y: float
    total_floors: int
    units_per_floor: int
    ground_floor_label: Optional[str]
    facing: Optional[str]
    model_url: Optional[str]
    facade_image: Optional[str]
    status: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Computed
    available_units: Optional[int] = 0
    sold_units: Optional[int] = 0
    total_units: Optional[int] = 0


class FloorCreate(BaseModel):
    building_id: UUID
    floor_number: int = Field(..., ge=0, le=200)
    floor_label: Optional[str] = Field(None, max_length=50)
    layout_image: Optional[str] = None
    total_units: int = Field(0, ge=0)


class FloorUpdate(BaseModel):
    floor_label: Optional[str] = Field(None, max_length=50)
    layout_image: Optional[str] = None
    total_units: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class FloorResponse(BaseModel):
    id: str
    building_id: str
    floor_number: int
    floor_label: Optional[str]
    layout_image: Optional[str]
    total_units: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Computed
    units: Optional[List[dict]] = []


# ---------------------------------------------------------------------------
# LAYOUT POLYGONS (Visualization Engine)
# ---------------------------------------------------------------------------

class PolygonCreate(BaseModel):
    project_id: UUID
    polygon_type: str = Field(..., max_length=30)  # PLOT, ROAD, PARK, etc.
    label: Optional[str] = Field(None, max_length=100)
    layer_name: Optional[str] = Field(None, max_length=100)
    coordinates: List[List[float]]  # [[x, y], [x, y], ...]
    style: Optional[dict] = None
    area_sqft: Optional[float] = None
    area_label: Optional[str] = None
    linked_unit_id: Optional[UUID] = None
    linked_building_id: Optional[UUID] = None
    z_order: int = 0
    metadata: Optional[dict] = None


class PolygonBulkCreate(BaseModel):
    project_id: UUID
    polygons: List[PolygonCreate]


class PolygonUpdate(BaseModel):
    polygon_type: Optional[str] = Field(None, max_length=30)
    label: Optional[str] = Field(None, max_length=100)
    coordinates: Optional[List[List[float]]] = None
    style: Optional[dict] = None
    area_sqft: Optional[float] = None
    area_label: Optional[str] = None
    linked_unit_id: Optional[UUID] = None
    linked_building_id: Optional[UUID] = None
    z_order: Optional[int] = None
    metadata: Optional[dict] = None


class PolygonResponse(BaseModel):
    id: str
    project_id: str
    polygon_type: str
    label: Optional[str]
    layer_name: Optional[str]
    coordinates: List[List[float]]
    style: Optional[dict]
    area_sqft: Optional[float]
    area_label: Optional[str]
    linked_unit_id: Optional[str]
    linked_building_id: Optional[str]
    z_order: int
    metadata: Optional[dict]
    # Joined data from linked entities
    unit_status: Optional[str] = None
    unit_number: Optional[str] = None
    unit_price: Optional[float] = None
    building_name: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# AMENITIES & ROADS
# ---------------------------------------------------------------------------

class AmenityCreate(BaseModel):
    project_id: UUID
    amenity_type: str = Field(..., max_length=30)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    position_x: Optional[float] = Field(None, ge=0, le=1)
    position_y: Optional[float] = Field(None, ge=0, le=1)
    polygon_id: Optional[UUID] = None
    icon: str = "MapPin"


class AmenityResponse(BaseModel):
    id: str
    project_id: str
    amenity_type: str
    name: str
    description: Optional[str]
    position_x: Optional[float]
    position_y: Optional[float]
    polygon_id: Optional[str]
    icon: str
    is_active: bool
    created_at: datetime


class RoadCreate(BaseModel):
    project_id: UUID
    road_name: Optional[str] = Field(None, max_length=100)
    road_type: str = "INTERNAL"
    path_points: List[List[float]]  # [[x, y], [x, y], ...]
    width: float = Field(0.02, ge=0.001, le=0.2)
    polygon_id: Optional[UUID] = None
    style: Optional[dict] = None


class RoadResponse(BaseModel):
    id: str
    project_id: str
    road_name: Optional[str]
    road_type: str
    path_points: List[List[float]]
    width: float
    polygon_id: Optional[str]
    style: Optional[dict]
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# MASTER PLAN AGGREGATE RESPONSE (Public Viewer)
# ---------------------------------------------------------------------------

class MasterPlanResponse(BaseModel):
    """Complete master plan data for the public visualization viewer."""
    project: dict                           # Project basic info
    viewport: dict                          # {width, height, background_color}
    polygons: List[PolygonResponse]         # All layout polygons
    buildings: List[BuildingResponse]       # All buildings/towers
    amenities: List[AmenityResponse]        # Named amenities
    roads: List[RoadResponse]              # Road paths
    units_summary: dict                     # {available, reserved, sold, total}
    master_plan_image: Optional[str] = None # Background image URL
    master_plan_svg: Optional[str] = None   # SVG content
