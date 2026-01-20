"""
Seller Transactions Router - Transaction history for sellers.

Implements:
- GET /seller/transactions - List seller's transactions
- GET /seller/transactions/{id} - Get transaction details
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/seller", tags=["Seller Transactions"])


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


class TransactionItem(BaseModel):
    id: str
    property: PropertyInfo
    buyer: BuyerInfo
    agent: Optional[AgentInfo] = None
    total_price: float
    platform_fee: float
    agent_commission: float
    seller_receives: float
    status: str
    status_display: str
    created_at: str
    completed_at: Optional[str] = None


class TransactionsListResponse(BaseModel):
    success: bool = True
    transactions: List[TransactionItem]
    total: int
    page: int
    per_page: int
    has_more: bool
    summary: dict


class TransactionDetailResponse(BaseModel):
    success: bool = True
    transaction: TransactionItem


# ============================================================================
# HELPERS
# ============================================================================

STATUS_DISPLAY = {
    'INITIATED': 'Initiated',
    'BUYER_VERIFIED': 'Buyer Verified',
    'SELLER_VERIFIED': 'Seller Verified',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'FAILED': 'Failed'
}


# ============================================================================
# LIST TRANSACTIONS
# ============================================================================

@router.get("/transactions", response_model=TransactionsListResponse)
async def get_seller_transactions(
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """
    Get seller's transaction history.
    
    Optionally filter by status:
    - INITIATED
    - PENDING_VERIFICATION
    - VERIFIED
    - COMPLETED
    - CANCELLED
    """
    offset = (page - 1) * per_page
    
    async with db_pool.acquire() as conn:
        # Base query
        base_query = """
            SELECT 
                t.id,
                t.property_id,
                t.buyer_id,
                t.agent_id,
                t.total_price,
                t.platform_fee,
                t.agent_commission,
                t.status,
                t.created_at,
                t.completed_at,
                p.title as property_title,
                pm.file_url as thumbnail_url,
                bu.full_name as buyer_name,
                bu.email as buyer_email,
                au.full_name as agent_name
            FROM transactions t
            JOIN properties p ON t.property_id = p.id
            LEFT JOIN property_media pm ON p.id = pm.property_id AND pm.is_primary = true
            JOIN users bu ON t.buyer_id = bu.id
            LEFT JOIN users au ON t.agent_id = au.id
            WHERE t.seller_id = $1
        """
        
        params = [current_user.user_id]
        
        if status:
            base_query += f" AND t.status = ${len(params) + 1}"
            params.append(status.upper())
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({base_query}) sub"
        total = await conn.fetchval(count_query, *params)
        
        # Get summary
        summary = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
                COUNT(*) FILTER (WHERE status IN ('INITIATED', 'BUYER_VERIFIED', 'SELLER_VERIFIED')) as active,
                COALESCE(SUM(total_price) FILTER (WHERE status = 'COMPLETED'), 0) as total_revenue,
                COALESCE(SUM(platform_fee + agent_commission) FILTER (WHERE status = 'COMPLETED'), 0) as total_fees
            FROM transactions
            WHERE seller_id = $1
        """, current_user.user_id)
        
        # Get paginated results
        data_query = f"{base_query} ORDER BY t.created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        params.extend([per_page, offset])
        
        rows = await conn.fetch(data_query, *params)
        
        transactions = []
        for row in rows:
            total_price = float(row['total_price'] or 0)
            platform_fee = float(row['platform_fee'] or 0)
            agent_commission = float(row['agent_commission'] or 0)
            
            agent = None
            if row['agent_id']:
                agent = AgentInfo(
                    id=str(row['agent_id']),
                    name=row['agent_name'] or 'Agent'
                )
            
            transactions.append(TransactionItem(
                id=str(row['id']),
                property=PropertyInfo(
                    id=str(row['property_id']),
                    title=row['property_title'] or 'Untitled',
                    thumbnail_url=row['thumbnail_url']
                ),
                buyer=BuyerInfo(
                    id=str(row['buyer_id']),
                    name=row['buyer_name'],
                    email=row['buyer_email']
                ),
                agent=agent,
                total_price=total_price,
                platform_fee=platform_fee,
                agent_commission=agent_commission,
                seller_receives=total_price - platform_fee - agent_commission,
                status=row['status'],
                status_display=STATUS_DISPLAY.get(row['status'], row['status']),
                created_at=row['created_at'].isoformat() if row['created_at'] else '',
                completed_at=row['completed_at'].isoformat() if row['completed_at'] else None
            ))
        
        return TransactionsListResponse(
            success=True,
            transactions=transactions,
            total=total,
            page=page,
            per_page=per_page,
            has_more=offset + len(transactions) < total,
            summary={
                'completed': summary['completed'] or 0,
                'active': summary['active'] or 0,
                'total_revenue': float(summary['total_revenue'] or 0),
                'total_fees': float(summary['total_fees'] or 0),
                'net_earnings': float((summary['total_revenue'] or 0) - (summary['total_fees'] or 0))
            }
        )


# ============================================================================
# GET TRANSACTION DETAILS
# ============================================================================

@router.get("/transactions/{transaction_id}", response_model=TransactionDetailResponse)
async def get_transaction_detail(
    transaction_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool = Depends(get_db_pool)
):
    """Get detailed information about a specific transaction."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT 
                t.id,
                t.property_id,
                t.buyer_id,
                t.seller_id,
                t.agent_id,
                t.total_price,
                t.platform_fee,
                t.agent_commission,
                t.status,
                t.created_at,
                t.completed_at,
                p.title as property_title,
                pm.file_url as thumbnail_url,
                bu.full_name as buyer_name,
                bu.email as buyer_email,
                au.full_name as agent_name
            FROM transactions t
            JOIN properties p ON t.property_id = p.id
            LEFT JOIN property_media pm ON p.id = pm.property_id AND pm.is_primary = true
            JOIN users bu ON t.buyer_id = bu.id
            LEFT JOIN users au ON t.agent_id = au.id
            WHERE t.id = $1
        """, transaction_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Check ownership
        if row['seller_id'] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this transaction")
        
        total_price = float(row['total_price'] or 0)
        platform_fee = float(row['platform_fee'] or 0)
        agent_commission = float(row['agent_commission'] or 0)
        
        agent = None
        if row['agent_id']:
            agent = AgentInfo(
                id=str(row['agent_id']),
                name=row['agent_name'] or 'Agent'
            )
        
        transaction = TransactionItem(
            id=str(row['id']),
            property=PropertyInfo(
                id=str(row['property_id']),
                title=row['property_title'] or 'Untitled',
                thumbnail_url=row['thumbnail_url']
            ),
            buyer=BuyerInfo(
                id=str(row['buyer_id']),
                name=row['buyer_name'],
                email=row['buyer_email']
            ),
            agent=agent,
            total_price=total_price,
            platform_fee=platform_fee,
            agent_commission=agent_commission,
            seller_receives=total_price - platform_fee - agent_commission,
            status=row['status'],
            status_display=STATUS_DISPLAY.get(row['status'], row['status']),
            created_at=row['created_at'].isoformat() if row['created_at'] else '',
            completed_at=row['completed_at'].isoformat() if row['completed_at'] else None
        )
        
        return TransactionDetailResponse(success=True, transaction=transaction)
