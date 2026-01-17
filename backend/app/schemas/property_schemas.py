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
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    type: Optional[PropertyType] = None
    price: Optional[Decimal] = Field(None, gt=0)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    bedrooms: Optional[int] = Field(None, ge=0, le=50)
    bathrooms: Optional[int] = Field(None, ge=0, le=50)
    area_sqft: Optional[Decimal] = Field(None, gt=0)

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
    price: Optional[Decimal]
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[Decimal]
    
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
