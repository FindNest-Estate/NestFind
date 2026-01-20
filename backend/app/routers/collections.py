from fastapi import APIRouter, Depends, Query, Path
from typing import List
from uuid import UUID

from app.schemas.collection_schemas import CollectionCreate, CollectionUpdate, CollectionResponse, AddToCollectionRequest
from app.services.collections_service import CollectionsService
from app.middleware.auth_middleware import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/collections", tags=["Collections"])

@router.get("/", response_model=List[CollectionResponse])
async def get_collections(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get all collections for the current user."""
    return await CollectionsService.get_user_collections(current_user.user_id)

@router.post("/", response_model=CollectionResponse, status_code=201)
async def create_collection(
    collection: CollectionCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Create a new collection."""
    return await CollectionsService.create_collection(current_user.user_id, collection)

@router.put("/{id}", response_model=CollectionResponse)
async def update_collection(
    update_data: CollectionUpdate,
    id: UUID = Path(..., title="Collection ID"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Update a collection's name or color."""
    return await CollectionsService.update_collection(current_user.user_id, id, update_data)

@router.delete("/{id}")
async def delete_collection(
    id: UUID = Path(..., title="Collection ID"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Delete a collection and all its items (does not unsave properties)."""
    return await CollectionsService.delete_collection(current_user.user_id, id)

@router.post("/{id}/items/{property_id}")
async def add_property_to_collection(
    id: UUID = Path(..., title="Collection ID"),
    property_id: UUID = Path(..., title="Property ID"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Add a property to a collection. Auto-saves the property if not already saved."""
    return await CollectionsService.add_property_to_collection(current_user.user_id, id, property_id)

@router.delete("/{id}/items/{property_id}")
async def remove_property_from_collection(
    id: UUID = Path(..., title="Collection ID"),
    property_id: UUID = Path(..., title="Property ID"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Remove a property from a collection."""
    return await CollectionsService.remove_property_from_collection(current_user.user_id, id, property_id)
