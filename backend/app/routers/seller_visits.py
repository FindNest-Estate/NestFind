"""
Seller Visits Router - Track visits on seller's properties.

Implements:
- GET /seller/visits - List all visits on seller's properties
- GET /seller/visits/{id} - Get visit details
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/seller", tags=["Seller Visits"])


# ============================================================================
# MODELS
# ============================================================================

class BuyerInfo(BaseModel):
    id: str
    name: str
    email: str


class AgentInfo(BaseModel):
    id: str
    name: str


class PropertyInfo(BaseModel):
    id: str
    title: str
    thumbnail_url: Optional[str] = None
    city: Optional[str] = None


class VisitItem(BaseModel):
    id: str
    property: PropertyInfo
    buyer: BuyerInfo
    agent: Optional[AgentInfo] = None
    visit_date: str
    requested_at: str
    status: str
    status_display: str
    notes: Optional[str] = None


class VisitsListResponse(BaseModel):
    success: bool = True
    visits: List[VisitItem]
    total: int
    page: int
    per_page: int
    has_more: bool
    summary: dict


class VisitDetailResponse(BaseModel):
    success: bool = True
    visit: VisitItem


# ============================================================================
# HELPERS
# ============================================================================

STATUS_DISPLAY = {
    'REQUESTED': 'Pending',
    'APPROVED': 'Approved',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'RESCHEDULED': 'Rescheduled',
    'NO_SHOW': 'No Show'
}


# ============================================================================
# LIST VISITS
# ============================================================================

@router.get("/visits", response_model=VisitsListResponse)
async def get_seller_visits(
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get all visits on seller's properties.
    
    Optionally filter by status:
    - REQUESTED (pending)
    - APPROVED (upcoming)
    - COMPLETED
    - CANCELLED
    """
    offset = (page - 1) * per_page
    
    async with db_pool.acquire() as conn:
        # Base query
        base_query = """
            SELECT 
                vr.id,
                vr.property_id,
                vr.buyer_id,
                vr.agent_id,
                vr.preferred_date as visit_date,
                vr.created_at as requested_at,
                vr.status,
                vr.buyer_message as notes,
                p.title as property_title,
                p.city,
                (SELECT file_url FROM property_media WHERE property_id = p.id AND is_primary = true LIMIT 1) as thumbnail_url,
                u.full_name as buyer_name,
                u.email as buyer_email,
                a.full_name as agent_name
            FROM visit_requests vr
            JOIN properties p ON vr.property_id = p.id
            JOIN users u ON vr.buyer_id = u.id
            LEFT JOIN users a ON vr.agent_id = a.id
            WHERE p.seller_id = $1 AND p.deleted_at IS NULL
        """
        
        params = [current_user.user_id]
        
        if status:
            base_query += f" AND vr.status = ${len(params) + 1}"
            params.append(status.upper())
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) sub"
        total = await conn.fetchval(count_query, *params)
        
        # Get summary counts
        summary = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE vr.status = 'REQUESTED') as pending,
                COUNT(*) FILTER (WHERE vr.status = 'APPROVED') as upcoming,
                COUNT(*) FILTER (WHERE vr.status = 'COMPLETED') as completed,
                COUNT(*) as total
            FROM visit_requests vr
            JOIN properties p ON vr.property_id = p.id
            WHERE p.seller_id = $1 AND p.deleted_at IS NULL
        """, current_user.user_id)
        
        # Get paginated results
        data_query = f"{base_query} ORDER BY vr.preferred_date DESC, vr.created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([per_page, offset])
        
        rows = await conn.fetch(data_query, *params)
        
        visits = []
        for row in rows:
            agent = None
            if row['agent_id']:
                agent = AgentInfo(
                    id=str(row['agent_id']),
                    name=row['agent_name'] or 'Agent'
                )
            
            visits.append(VisitItem(
                id=str(row['id']),
                property=PropertyInfo(
                    id=str(row['property_id']),
                    title=row['property_title'] or 'Untitled',
                    thumbnail_url=row['thumbnail_url'],
                    city=row['city']
                ),
                buyer=BuyerInfo(
                    id=str(row['buyer_id']),
                    name=row['buyer_name'],
                    email=row['buyer_email']
                ),
                agent=agent,
                visit_date=row['visit_date'].isoformat() if row['visit_date'] else '',
                requested_at=row['requested_at'].isoformat() if row['requested_at'] else '',
                status=row['status'],
                status_display=STATUS_DISPLAY.get(row['status'], row['status']),
                notes=row['notes']
            ))
        
        return VisitsListResponse(
            success=True,
            visits=visits,
            total=total,
            page=page,
            per_page=per_page,
            has_more=offset + len(visits) < total,
            summary={
                'pending': summary['pending'] or 0,
                'upcoming': summary['upcoming'] or 0,
                'completed': summary['completed'] or 0,
                'total': summary['total'] or 0
            }
        )


# ============================================================================
# GET VISIT DETAILS
# ============================================================================

@router.get("/visits/{visit_id}", response_model=VisitDetailResponse)
async def get_visit_detail(
    visit_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get detailed information about a specific visit."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT 
                vr.id,
                vr.property_id,
                vr.buyer_id,
                vr.agent_id,
                vr.visit_date,
                vr.requested_at,
                vr.status,
                vr.notes,
                p.title as property_title,
                p.city,
                p.seller_id,
                pm.file_url as thumbnail_url,
                u.full_name as buyer_name,
                u.email as buyer_email,
                a.full_name as agent_name
            FROM visit_requests vr
            JOIN properties p ON vr.property_id = p.id
            LEFT JOIN property_media pm ON p.id = pm.property_id AND pm.is_primary = true
            JOIN users u ON vr.buyer_id = u.id
            LEFT JOIN users a ON vr.agent_id = a.id
            WHERE vr.id = $1
        """, visit_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Visit not found")
        
        # Check ownership
        if row['seller_id'] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this visit")
        
        agent = None
        if row['agent_id']:
            agent = AgentInfo(
                id=str(row['agent_id']),
                name=row['agent_name'] or 'Agent'
            )
        
        visit = VisitItem(
            id=str(row['id']),
            property=PropertyInfo(
                id=str(row['property_id']),
                title=row['property_title'] or 'Untitled',
                thumbnail_url=row['thumbnail_url'],
                city=row['city']
            ),
            buyer=BuyerInfo(
                id=str(row['buyer_id']),
                name=row['buyer_name'],
                email=row['buyer_email']
            ),
            agent=agent,
            visit_date=row['visit_date'].isoformat() if row['visit_date'] else '',
            requested_at=row['requested_at'].isoformat() if row['requested_at'] else '',
            status=row['status'],
            status_display=STATUS_DISPLAY.get(row['status'], row['status']),
            notes=row['notes']
        )
        
        return VisitDetailResponse(success=True, visit=visit)
