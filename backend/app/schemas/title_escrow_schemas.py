from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class TitleSearchStatus(str, Enum):
    PENDING_SEARCH = "PENDING_SEARCH"
    CLEAR = "CLEAR"
    ENCUMBRANCES_FOUND = "ENCUMBRANCES_FOUND"
    REJECTED = "REJECTED"

class EscrowDisbursementStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    DISBURSED = "DISBURSED"
    FAILED = "FAILED"

# -----------------------------------------------------
# TITLE SEARCHES
# -----------------------------------------------------

class TitleSearchCreate(BaseModel):
    transaction_id: UUID
    agency_name: str
    checker_name: Optional[str] = None

class TitleSearchUpdate(BaseModel):
    status: Optional[TitleSearchStatus] = None
    report_url: Optional[str] = None
    encumbrance_notes: Optional[str] = None
    completed_at: Optional[datetime] = None

class TitleSearchResponse(TitleSearchCreate):
    id: UUID
    status: TitleSearchStatus
    report_url: Optional[str] = None
    encumbrance_notes: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# -----------------------------------------------------
# ESCROW DISBURSEMENTS
# -----------------------------------------------------

class EscrowDisbursementCreate(BaseModel):
    transaction_id: UUID
    payee_id: UUID
    payee_role: str
    amount: float = Field(gt=0)
    purpose: str

class EscrowDisbursementUpdate(BaseModel):
    status: Optional[EscrowDisbursementStatus] = None
    payment_reference: Optional[str] = None
    bank_account_last4: Optional[str] = Field(None, max_length=4)
    disbursed_at: Optional[datetime] = None

class EscrowDisbursementResponse(EscrowDisbursementCreate):
    id: UUID
    status: EscrowDisbursementStatus
    payment_reference: Optional[str] = None
    bank_account_last4: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
