from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class CorporateInventoryStatus(str, Enum):
    EVALUATING = "EVALUATING"
    PURCHASED = "PURCHASED"
    UNDER_RENOVATION = "UNDER_RENOVATION"
    LISTED_FOR_RESALE = "LISTED_FOR_RESALE"
    SOLD = "SOLD"

class RenovationStatus(str, Enum):
    ESTIMATED = "ESTIMATED"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    PAID = "PAID"

# -----------------------------------------------------
# CORPORATE INVENTORY
# -----------------------------------------------------

class CorporateInventoryCreate(BaseModel):
    property_id: UUID
    purchase_deal_id: Optional[UUID] = None
    purchase_price: float = Field(gt=0)
    estimated_renovation_budget: Optional[float] = None
    target_resale_price: Optional[float] = None

class CorporateInventoryUpdate(BaseModel):
    status: Optional[CorporateInventoryStatus] = None
    actual_renovation_cost: Optional[float] = None
    actual_resale_price: Optional[float] = None
    purchased_at: Optional[datetime] = None
    listed_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None

class CorporateInventoryResponse(CorporateInventoryCreate):
    id: UUID
    actual_renovation_cost: float
    actual_resale_price: Optional[float] = None
    status: CorporateInventoryStatus
    purchased_at: Optional[datetime] = None
    listed_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# -----------------------------------------------------
# RENOVATION LEDGERS
# -----------------------------------------------------

class RenovationLedgerCreate(BaseModel):
    inventory_id: UUID
    contractor_id: Optional[UUID] = None
    amount: float = Field(gt=0)
    description: str

class RenovationLedgerUpdate(BaseModel):
    status: Optional[RenovationStatus] = None
    estimated_start: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    actual_completion: Optional[datetime] = None

class RenovationLedgerResponse(RenovationLedgerCreate):
    id: UUID
    status: RenovationStatus
    estimated_start: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    actual_completion: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
