"""
Seller Offers Router - Manage offers on seller's properties.

Implements:
- GET /seller/offers - List all offers on seller's properties
- GET /seller/offers/{id} - Get offer details
- PUT /seller/offers/{id}/respond - Accept/Reject/Counter offer
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from enum import Enum

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/seller", tags=["Seller Offers"])


# ============================================================================
# MODELS
# ============================================================================

class OfferStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COUNTERED = "COUNTERED"
    EXPIRED = "EXPIRED"
    WITHDRAWN = "WITHDRAWN"


class OfferResponseAction(str, Enum):
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"
    COUNTER = "COUNTER"


class BuyerInfo(BaseModel):
    id: str
    name: str
    email: str


class PropertyInfo(BaseModel):
    id: str
    title: str
    price: Optional[float] = None
    thumbnail_url: Optional[str] = None


class OfferItem(BaseModel):
    id: str
    property: PropertyInfo
    buyer: BuyerInfo
    offered_price: float
    status: str
    created_at: str
    expires_at: Optional[str] = None
    counter_price: Optional[float] = None
    notes: Optional[str] = None


class OffersListResponse(BaseModel):
    success: bool = True
    offers: List[OfferItem]
    total: int
    page: int
    per_page: int
    has_more: bool


class OfferDetailResponse(BaseModel):
    success: bool = True
    offer: OfferItem


class RespondToOfferRequest(BaseModel):
    action: OfferResponseAction
    counter_price: Optional[float] = None
    message: Optional[str] = None


class RespondToOfferResponse(BaseModel):
    success: bool = True
    new_status: str
    message: str


# ============================================================================
# LIST OFFERS
# ============================================================================

@router.get("/offers", response_model=OffersListResponse)
async def get_seller_offers(
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get all offers on seller's properties.
    
    Optionally filter by status:
    - PENDING
    - ACCEPTED
    - REJECTED
    - COUNTERED
    - EXPIRED
    """
    offset = (page - 1) * per_page
    
    async with db_pool.acquire() as conn:
        # Base query
        base_query = """
            SELECT 
                o.id,
                o.property_id,
                o.buyer_id,
                o.offered_price,
                o.status,
                o.created_at,
                o.expires_at,
                o.counter_price,
                o.buyer_message as notes,
                p.title as property_title,
                p.price as property_price,
                pm.file_url as thumbnail_url,
                u.full_name as buyer_name,
                u.email as buyer_email
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            LEFT JOIN property_media pm ON p.id = pm.property_id AND pm.is_primary = true
            JOIN users u ON o.buyer_id = u.id
            WHERE p.seller_id = $1 AND p.deleted_at IS NULL
        """
        
        params = [current_user.user_id]
        
        if status:
            base_query += f" AND o.status = ${len(params) + 1}"
            params.append(status.upper())
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) sub"
        total = await conn.fetchval(count_query, *params)
        
        # Get paginated results
        data_query = f"{base_query} ORDER BY o.created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([per_page, offset])
        
        rows = await conn.fetch(data_query, *params)
        
        offers = []
        for row in rows:
            offers.append(OfferItem(
                id=str(row['id']),
                property=PropertyInfo(
                    id=str(row['property_id']),
                    title=row['property_title'] or 'Untitled',
                    price=float(row['property_price']) if row['property_price'] else None,
                    thumbnail_url=row['thumbnail_url']
                ),
                buyer=BuyerInfo(
                    id=str(row['buyer_id']),
                    name=row['buyer_name'],
                    email=row['buyer_email']
                ),
                offered_price=float(row['offered_price']),
                status=row['status'],
                created_at=row['created_at'].isoformat() if row['created_at'] else '',
                expires_at=row['expires_at'].isoformat() if row['expires_at'] else None,
                counter_price=float(row['counter_price']) if row['counter_price'] else None,
                notes=row['notes']
            ))
        
        return OffersListResponse(
            success=True,
            offers=offers,
            total=total,
            page=page,
            per_page=per_page,
            has_more=offset + len(offers) < total
        )


# ============================================================================
# GET OFFER DETAILS
# ============================================================================

@router.get("/offers/{offer_id}", response_model=OfferDetailResponse)
async def get_offer_detail(
    offer_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get detailed information about a specific offer."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT 
                o.id,
                o.property_id,
                o.buyer_id,
                o.offered_price,
                o.status,
                o.created_at,
                o.expires_at,
                o.counter_price,
                o.notes,
                p.title as property_title,
                p.price as property_price,
                p.seller_id,
                pm.file_url as thumbnail_url,
                u.full_name as buyer_name,
                u.email as buyer_email
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            LEFT JOIN property_media pm ON p.id = pm.property_id AND pm.is_primary = true
            JOIN users u ON o.buyer_id = u.id
            WHERE o.id = $1
        """, offer_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        # Check ownership
        if row['seller_id'] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this offer")
        
        offer = OfferItem(
            id=str(row['id']),
            property=PropertyInfo(
                id=str(row['property_id']),
                title=row['property_title'] or 'Untitled',
                price=float(row['property_price']) if row['property_price'] else None,
                thumbnail_url=row['thumbnail_url']
            ),
            buyer=BuyerInfo(
                id=str(row['buyer_id']),
                name=row['buyer_name'],
                email=row['buyer_email']
            ),
            offered_price=float(row['offered_price']),
            status=row['status'],
            created_at=row['created_at'].isoformat() if row['created_at'] else '',
            expires_at=row['expires_at'].isoformat() if row['expires_at'] else None,
            counter_price=float(row['counter_price']) if row['counter_price'] else None,
            notes=row['notes']
        )
        
        return OfferDetailResponse(success=True, offer=offer)


# ============================================================================
# RESPOND TO OFFER
# ============================================================================

@router.put("/offers/{offer_id}/respond", response_model=RespondToOfferResponse)
async def respond_to_offer(
    offer_id: UUID,
    request: RespondToOfferRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Respond to an offer.
    
    Actions:
    - ACCEPT: Accept the offer
    - REJECT: Reject the offer
    - COUNTER: Counter with a new price
    """
    async with db_pool.acquire() as conn:
        # Verify offer exists and belongs to seller's property
        offer = await conn.fetchrow("""
            SELECT o.id, o.status, p.seller_id
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            WHERE o.id = $1
        """, offer_id)
        
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        if offer['seller_id'] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if offer['status'] not in ['PENDING', 'COUNTERED']:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot respond to offer with status: {offer['status']}"
            )
        
        # Process action
        new_status = None
        message = ""
        
        if request.action == OfferResponseAction.ACCEPT:
            new_status = "ACCEPTED"
            message = "Offer accepted successfully"
            
        elif request.action == OfferResponseAction.REJECT:
            new_status = "REJECTED"
            message = "Offer rejected"
            
        elif request.action == OfferResponseAction.COUNTER:
            if not request.counter_price:
                raise HTTPException(status_code=400, detail="Counter price is required")
            new_status = "COUNTERED"
            message = f"Counter offer sent with price ₹{request.counter_price:,.0f}"
            
            # Update counter price
            await conn.execute("""
                UPDATE offers SET counter_price = $1 WHERE id = $2
            """, request.counter_price, offer_id)
        
        # Update offer status
        await conn.execute("""
            UPDATE offers 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        """, new_status, offer_id)
        
        return RespondToOfferResponse(
            success=True,
            new_status=new_status,
            message=message
        )
