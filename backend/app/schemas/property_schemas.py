"""
Pydantic schemas for property management.

These schemas define the request/response models for the /sell feature.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from enum import Enum


# ============================================================================
# ENUMS (must match database enums)
# ============================================================================

class PropertyType(str, Enum):
    LAND = "LAND"
    HOUSE = "HOUSE"
    APARTMENT = "APARTMENT"
    COMMERCIAL = "COMMERCIAL"


class PropertySubType(str, Enum):
    # Apartment sub-types
    FLAT = "FLAT"
    STUDIO = "STUDIO"
    PENTHOUSE = "PENTHOUSE"
    DUPLEX = "DUPLEX"
    # House sub-types
    INDEPENDENT_HOUSE = "INDEPENDENT_HOUSE"
    VILLA = "VILLA"
    BUNGALOW = "BUNGALOW"
    ROW_HOUSE = "ROW_HOUSE"
    # Land sub-types
    PLOT = "PLOT"
    FARMLAND = "FARMLAND"
    PLANTATION = "PLANTATION"
    INDUSTRIAL_PLOT = "INDUSTRIAL_PLOT"
    # Commercial sub-types
    OFFICE = "OFFICE"
    SHOP = "SHOP"
    WAREHOUSE = "WAREHOUSE"
    CO_WORKING = "CO_WORKING"


class FurnishingStatus(str, Enum):
    UNFURNISHED = "UNFURNISHED"
    SEMI_FURNISHED = "SEMI_FURNISHED"
    FULLY_FURNISHED = "FULLY_FURNISHED"


class FacingDirection(str, Enum):
    NORTH = "NORTH"
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"
    NE = "NE"
    NW = "NW"
    SE = "SE"
    SW = "SW"


class OwnershipType(str, Enum):
    SINGLE = "SINGLE"
    JOINT = "JOINT"
    COMPANY = "COMPANY"


class AvailabilityStatus(str, Enum):
    READY_TO_MOVE = "READY_TO_MOVE"
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION"
    IMMEDIATE = "IMMEDIATE"


class LandType(str, Enum):
    RESIDENTIAL = "RESIDENTIAL"
    COMMERCIAL = "COMMERCIAL"
    AGRICULTURAL = "AGRICULTURAL"
    INDUSTRIAL = "INDUSTRIAL"


class PropertyStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_ASSIGNMENT = "PENDING_ASSIGNMENT"
    ASSIGNED = "ASSIGNED"
    VERIFICATION_IN_PROGRESS = "VERIFICATION_IN_PROGRESS"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class CreatePropertyRequest(BaseModel):
    """Request to create a new property (starts as DRAFT)."""
    title: Optional[str] = Field(None, max_length=200)
    type: Optional[PropertyType] = None

    class Config:
        use_enum_values = True


class UpdatePropertyRequest(BaseModel):
    """Request to update a DRAFT property."""
    # Basic fields
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    type: Optional[PropertyType] = None
    property_sub_type: Optional[PropertySubType] = None

    # Pricing
    price: Optional[Decimal] = Field(None, gt=0)
    price_negotiable: Optional[bool] = None
    maintenance_charges: Optional[Decimal] = Field(None, ge=0)

    # Location
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)

    # Property dimensions
    bedrooms: Optional[int] = Field(None, ge=0, le=50)
    bathrooms: Optional[int] = Field(None, ge=0, le=50)
    area_sqft: Optional[Decimal] = Field(None, gt=0)
    floor_number: Optional[int] = Field(None, ge=0)
    total_floors: Optional[int] = Field(None, ge=1)
    balconies: Optional[int] = Field(None, ge=0)

    # Property features
    furnishing_status: Optional[FurnishingStatus] = None
    facing_direction: Optional[FacingDirection] = None
    parking_available: Optional[bool] = None
    parking_count: Optional[int] = Field(None, ge=0)

    # Land-specific
    road_access: Optional[bool] = None
    land_type: Optional[LandType] = None

    # Listing details
    listing_type: Optional[str] = Field(None, max_length=50)  # SALE / RENT
    availability_status: Optional[AvailabilityStatus] = None
    property_age_years: Optional[int] = Field(None, ge=0)
    ownership_type: Optional[OwnershipType] = None

    # Amenities (list of strings)
    amenities: Optional[List[str]] = None

    class Config:
        use_enum_values = True


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class VisibilityFlags(BaseModel):
    """Visibility flags controlling what UI can show."""
    show_analytics: bool = False
    show_offers: bool = False
    show_visits: bool = False
    show_agent: bool = False


class AgentSummary(BaseModel):
    """Minimal agent info shown on property card."""
    id: UUID
    name: str
    status: str  # PENDING, ASSIGNED
    requested_at: Optional[datetime] = None


class PropertyStats(BaseModel):
    """Analytics for ACTIVE properties."""
    views: int = 0
    visits_requested: int = 0
    offers_pending: int = 0


class PropertyMediaResponse(BaseModel):
    """Media item attached to property."""
    id: UUID
    media_type: str
    file_url: str
    display_order: int
    is_primary: bool


class PropertyResponse(BaseModel):
    """Full property response with state-driven fields."""
    id: UUID
    title: Optional[str]
    description: Optional[str]
    type: Optional[str]
    property_sub_type: Optional[str] = None

    # Pricing
    price: Optional[Decimal]
    price_negotiable: Optional[bool] = None
    maintenance_charges: Optional[Decimal] = None

    # Location
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]

    # Property dimensions
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[Decimal]
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    balconies: Optional[int] = None

    # Features
    furnishing_status: Optional[str] = None
    facing_direction: Optional[str] = None
    parking_available: Optional[bool] = None
    parking_count: Optional[int] = None

    # Land-specific
    road_access: Optional[bool] = None
    land_type: Optional[str] = None

    # Listing details
    listing_type: Optional[str] = None
    availability_status: Optional[str] = None
    property_age_years: Optional[int] = None
    ownership_type: Optional[str] = None

    # Amenities
    amenities: Optional[List[str]] = None

    # State
    status: str
    display_status: str

    # Actions
    allowed_actions: List[str]

    # Visibility
    visibility: VisibilityFlags

    # Optional relations (shown based on state)
    agent: Optional[AgentSummary] = None
    stats: Optional[PropertyStats] = None
    media: List[PropertyMediaResponse] = []

    # Completeness (computed dynamically)
    completeness: Optional[dict] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime


class PropertyListItem(BaseModel):
    """Minimal property info for list view."""
    id: UUID
    title: Optional[str]
    status: str
    display_status: str
    address_preview: Optional[str]
    price: Optional[Decimal]
    thumbnail_url: Optional[str]
    created_at: datetime
    allowed_actions: List[str]
    visibility: VisibilityFlags
    agent: Optional[AgentSummary] = None
    stats: Optional[PropertyStats] = None


class PropertyListResponse(BaseModel):
    """Paginated list of seller's properties."""
    properties: List[PropertyListItem]
    pagination: dict


class CreatePropertyResponse(BaseModel):
    """Response after creating a property."""
    id: UUID
    status: str
    display_status: str
    allowed_actions: List[str]
    next_action: dict


class UpdatePropertyResponse(BaseModel):
    """Response after updating a property."""
    id: UUID
    status: str
    display_status: str
    allowed_actions: List[str]
    completeness: dict


class DeletePropertyResponse(BaseModel):
    """Response after deleting a property."""
    success: bool
    message: str


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class PropertyErrorResponse(BaseModel):
    """Error response for property operations."""
    success: bool = False
    error: dict
