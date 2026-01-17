"""
Seller Properties Router - /sell backend endpoints.

Implements SELLER_PROPERTY_LISTING workflow:
- GET /seller/properties - List seller's properties
- POST /properties - Create property (DRAFT)
- GET /properties/{id} - Get property details
- PUT /properties/{id} - Update property (DRAFT only)
- DELETE /properties/{id} - Soft-delete property (DRAFT only)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from uuid import UUID

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool
from ..services.property_service import PropertyService
from ..schemas.property_schemas import (
    CreatePropertyRequest,
    UpdatePropertyRequest,
    CreatePropertyResponse,
    UpdatePropertyResponse,
    DeletePropertyResponse,
    PropertyResponse,
    PropertyListResponse
)


router = APIRouter(tags=["Seller Properties"])


# ============================================================================
# LIST PROPERTIES
# ============================================================================

@router.get("/seller/properties", response_model=PropertyListResponse)
async def get_seller_properties(
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get list of current seller's properties.
    
    Returns paginated list with:
    - Property summary (id, title, status, price, thumbnail)
    - allowed_actions based on current state
    - visibility flags for UI
    - Agent info if assigned
    
    Auth: Requires ACTIVE user session.
    """
    # Validate pagination
    if page < 1:
        page = 1
    if per_page < 1 or per_page > 100:
        per_page = 20
    
    service = PropertyService(db_pool)
    result = await service.get_seller_properties(
        seller_id=current_user.user_id,
        page=page,
        per_page=per_page
    )
    
    return result


# ============================================================================
# CREATE PROPERTY
# ============================================================================

@router.post("/properties", response_model=CreatePropertyResponse, status_code=201)
async def create_property(
    request_body: CreatePropertyRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Create a new property in DRAFT state.
    
    Only title and type are optional initially.
    Returns the new property ID with allowed_actions.
    
    Auth: Requires ACTIVE user session.
    """
    # Get client IP for audit
    ip_address = request.client.host if request.client else None
    
    service = PropertyService(db_pool)
    result = await service.create_property(
        seller_id=current_user.user_id,
        title=request_body.title,
        property_type=request_body.type,
        ip_address=ip_address
    )
    
    if not result["success"]:
        # If draft already exists, return 409 Conflict with the existing draft ID
        if "existing_draft_id" in result:
            raise HTTPException(
                status_code=409, 
                detail={
                    "message": result.get("error"),
                    "existing_draft_id": result.get("existing_draft_id")
                }
            )
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to create property"))
    
    return result["property"]


# ============================================================================
# GET PROPERTY
# ============================================================================

@router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get property details by ID.
    
    Returns full property with:
    - All fields
    - allowed_actions based on state
    - visibility flags
    - Media attachments
    - Agent info if assigned
    
    Auth: Requires owner or admin.
    """
    service = PropertyService(db_pool)
    result = await service.get_property_by_id(
        property_id=property_id,
        user_id=current_user.user_id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=result.get("code", 500),
            detail=result.get("error", "Failed to get property")
        )
    
    return result["property"]


# ============================================================================
# UPDATE PROPERTY
# ============================================================================

@router.put("/properties/{property_id}", response_model=UpdatePropertyResponse)
async def update_property(
    property_id: UUID,
    request_body: UpdatePropertyRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Update property details.
    
    Only allowed in DRAFT state.
    Returns updated status with completeness percentage.
    
    Auth: Requires owner.
    
    State validation:
    - Returns 400 if property is not in DRAFT state
    - Returns 403 if user is not the owner
    - Returns 404 if property not found
    """
    ip_address = request.client.host if request.client else None
    
    # Convert request to dict, excluding None values
    updates = request_body.dict(exclude_unset=True)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    
    service = PropertyService(db_pool)
    result = await service.update_property(
        property_id=property_id,
        user_id=current_user.user_id,
        updates=updates,
        ip_address=ip_address
    )
    
    if not result["success"]:
        error = result.get("error")
        code = result.get("code", 500)
        
        if isinstance(error, dict):
            raise HTTPException(status_code=code, detail=error)
        else:
            raise HTTPException(status_code=code, detail=error)
    
    return result["property"]


# ============================================================================
# DELETE PROPERTY
# ============================================================================

@router.delete("/properties/{property_id}", response_model=DeletePropertyResponse)
async def delete_property(
    property_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Soft-delete a property.
    
    Only allowed in DRAFT state.
    Properties with agent assignments or beyond cannot be deleted.
    
    Auth: Requires owner.
    
    State validation:
    - Returns 400 if property is not in DRAFT state
    - Returns 403 if user is not the owner
    - Returns 404 if property not found
    """
    ip_address = request.client.host if request.client else None
    
    service = PropertyService(db_pool)
    result = await service.delete_property(
        property_id=property_id,
        user_id=current_user.user_id,
        ip_address=ip_address
    )
    
    if not result["success"]:
        error = result.get("error")
        code = result.get("code", 500)
        
        if isinstance(error, dict):
            raise HTTPException(status_code=code, detail=error)
        else:
            raise HTTPException(status_code=code, detail=error)
    
    return result
