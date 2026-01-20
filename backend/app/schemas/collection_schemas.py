from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class CollectionBase(BaseModel):
    name: str
    color: str = 'rose'

class CollectionCreate(CollectionBase):
    pass

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class CollectionResponse(CollectionBase):
    id: UUID
    user_id: UUID
    property_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CollectionItemCreate(BaseModel):
    property_id: UUID

class AddToCollectionRequest(BaseModel):
    collection_id: UUID
