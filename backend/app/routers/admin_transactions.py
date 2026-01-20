"""
Admin Transaction Router for document verification and transaction approval.

Endpoints:
- GET /admin/transactions - List transactions for admin review
- GET /admin/transactions/{id} - Get transaction details
- POST /admin/documents/{id}/verify - Verify a document
- POST /admin/transactions/{id}/approve - Approve transaction
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.transaction_service import TransactionService
from ..services.transaction_document_service import TransactionDocumentService


router = APIRouter(prefix="/admin", tags=["Admin Transactions"])


class DocumentVerify(BaseModel):
    approved: bool
    notes: Optional[str] = None


class TransactionApproval(BaseModel):
    notes: Optional[str] = None


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def require_admin(current_user: AuthenticatedUser):
    """Verify user is admin."""
    if "ADMIN" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/transactions")
async def list_admin_transactions(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """List all transactions for admin review."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    
    async with pool.acquire() as conn:
        # Build query
        where_clause = ""
        params = []
        
        if status:
            where_clause = "WHERE t.status::text = $1"
            params.append(status)
        
        offset = (page - 1) * per_page
        
        # Get transactions
        query = f"""
            SELECT 
                t.id, t.property_id, t.buyer_id, t.seller_id, t.agent_id,
                t.total_price, t.commission_amount, t.agent_commission, t.platform_fee,
                t.status, t.created_at, t.completed_at,
                p.title as property_title, p.city as property_city,
                buyer.full_name as buyer_name,
                seller.full_name as seller_name,
                agent.full_name as agent_name
            FROM transactions t
            JOIN properties p ON p.id = t.property_id
            JOIN users buyer ON buyer.id = t.buyer_id
            JOIN users seller ON seller.id = t.seller_id
            JOIN users agent ON agent.id = t.agent_id
            {where_clause}
            ORDER BY 
                CASE WHEN t.status::text = 'ADMIN_REVIEW' THEN 0 ELSE 1 END,
                t.created_at DESC
            LIMIT {per_page} OFFSET {offset}
        """
        
        transactions = await conn.fetch(query, *params) if params else await conn.fetch(query)
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM transactions t {where_clause}"
        total = await conn.fetchval(count_query, *params) if params else await conn.fetchval(count_query)
        
        return {
            "success": True,
            "transactions": [
                {
                    "id": str(t['id']),
                    "property_id": str(t['property_id']),
                    "property_title": t['property_title'],
                    "property_city": t['property_city'],
                    "buyer_name": t['buyer_name'],
                    "seller_name": t['seller_name'],
                    "agent_name": t['agent_name'],
                    "total_price": float(t['total_price']),
                    "agent_commission": float(t['agent_commission']) if t['agent_commission'] else 0,
                    "status": t['status'],
                    "display_status": _get_display_status(t['status']),
                    "created_at": t['created_at'].isoformat()
                }
                for t in transactions
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total
            }
        }


def _get_display_status(status: str) -> str:
    labels = {
        'INITIATED': 'Pending Slot Booking',
        'SLOT_BOOKED': 'Registration Scheduled',
        'BUYER_VERIFIED': 'Buyer Verified',
        'SELLER_VERIFIED': 'Seller Verified',
        'ALL_VERIFIED': 'All Parties Verified',
        'SELLER_PAID': 'Commission Paid',
        'DOCUMENTS_PENDING': 'Awaiting Documents',
        'ADMIN_REVIEW': 'Under Admin Review',
        'COMPLETED': 'Completed',
        'CANCELLED': 'Cancelled',
        'FAILED': 'Failed'
    }
    return labels.get(status, status)


@router.post("/documents/{document_id}/verify")
async def verify_document(
    document_id: UUID,
    data: DocumentVerify,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Admin verifies or rejects a document."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = TransactionDocumentService(pool)
    
    result = await service.admin_verify_document(
        document_id=document_id,
        admin_id=current_user.user_id,
        approved=data.approved,
        notes=data.notes
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/transactions/{transaction_id}/approve")
async def approve_transaction(
    transaction_id: UUID,
    data: TransactionApproval,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Admin approves the transaction after document verification."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    service = TransactionService(pool)
    
    result = await service.admin_approve_transaction(
        transaction_id=transaction_id,
        admin_id=current_user.user_id,
        notes=data.notes,
        ip_address=get_client_ip(request)
    )
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
