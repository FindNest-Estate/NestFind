"""
Admin Audit Logs Router.

Endpoints:
- GET /admin/audit-logs - List audit logs with filters
"""
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/admin/audit-logs", tags=["Admin Audit Logs"])

class AuditLogItem(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    user_name: Optional[str]
    user_email: Optional[str]
    user_role: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

class AuditLogResponse(BaseModel):
    items: List[AuditLogItem]
    total: int
    page: int
    per_page: int
    pages: int

async def require_admin(current_user: AuthenticatedUser):
    if "ADMIN" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("", response_model=AuditLogResponse)
async def list_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None, description="Filter by action type"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """List audit logs with pagination and filters."""
    await require_admin(current_user)
    
    pool = get_db_pool()
    
    # Base query
    where_clauses = ["1=1"]
    params = []
    param_idx = 1
    
    if action:
        where_clauses.append(f"a.action = ${param_idx}")
        params.append(action)
        param_idx += 1
        
    if user_id:
        where_clauses.append(f"a.user_id = ${param_idx}")
        params.append(user_id)
        param_idx += 1
        
    if entity_type:
        where_clauses.append(f"a.entity_type = ${param_idx}")
        params.append(entity_type)
        param_idx += 1
        
    where_stmt = " AND ".join(where_clauses)
    
    async with pool.acquire() as conn:
        # Get total count
        count_query = f"SELECT COUNT(*) FROM audit_logs a WHERE {where_stmt}"
        total = await conn.fetchval(count_query, *params)
        
        # Get logs
        query = f"""
            SELECT 
                a.id, 
                a.user_id, 
                u.full_name as user_name,
                u.email as user_email,
                -- Role isn't directly on users pending complexity, skipping for now or joining user_roles
                -- Simplifying to just name/email for now
                a.action, 
                a.entity_type, 
                a.entity_id, 
                a.details, 
                a.ip_address, 
                a.timestamp
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE {where_stmt}
            ORDER BY a.timestamp DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        
        offset = (page - 1) * per_page
        rows = await conn.fetch(query, *params, per_page, offset)
        
        items = [
            AuditLogItem(
                id=row["id"],
                user_id=row["user_id"],
                user_name=row["user_name"] or "System",
                user_email=row["user_email"],
                user_role=None, # Placeholder
                action=row["action"],
                entity_type=row["entity_type"],
                entity_id=str(row["entity_id"]) if row["entity_id"] else None,
                details=row["details"],
                ip_address=row["ip_address"],
                timestamp=row["timestamp"]
            )
            for row in rows
        ]
        
        import math
        return AuditLogResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if per_page > 0 else 0
        )
