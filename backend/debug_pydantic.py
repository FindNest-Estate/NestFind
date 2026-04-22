from pydantic import ValidationError
from datetime import date
import sys
import os

# Mock the schemas for local testing
# (I'll copy the relevant parts from developer_schemas.py)
from enum import Enum
from typing import Optional, List, Any
from pydantic import BaseModel, Field

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
    pricing_rules: Optional[dict] = None
    auction_settings: Optional[dict] = None
    current_step: int = 1

# TEST PAYLOAD (Based on what I think the frontend sends)
payload = {
    "project_name": "Test project",
    "project_type": "APARTMENT",
    "status": "UPCOMING",
    "location": None,
    "city": None,
    "state": None,
    "pincode": None,
    "description": None,
    "amenities": [],
    "current_step": 2,
    "pricing_rules": {
        "base_price": 0,
        "floor_rise": 0,
        "corner_plot_premium": 0,
        "east_facing_premium": 0,
        "west_facing_premium": 0,
        "north_facing_premium": 0,
        "south_facing_premium": 0,
        "parking_charges": 0,
        "amenity_charges": 0
    }
}

try:
    ProjectCreate(**payload)
    print("SUCCESS: Payload is valid!")
except ValidationError as e:
    print("FAILURE: Validation error mapping:")
    for error in e.errors():
        print(f"  Field: {error['loc']} - Message: {error['msg']}")

# Case 2: Test with empty strings for dates
payload["launch_date"] = ""
try:
    ProjectCreate(**payload)
    print("SUCCESS: Empty string date valid!")
except ValidationError as e:
    print("FAILURE: Empty string date validation failed!")
    for error in e.errors():
        print(f"  Field: {error['loc']} - Message: {error['msg']}")
