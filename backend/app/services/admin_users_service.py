"""
Admin Users Service for user management.

Provides:
- List all users with filters
- Suspend/activate users
- User statistics
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timezone
import asyncpg


class AdminUsersService:
    """Service for admin user management."""
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def get_users(
        self,
        search: Optional[str] = None,
        role_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get all users with optional filters.
        
        Filters:
        - search: Search by name or email
        - role_filter: 'USER', 'AGENT', 'ADMIN' (uppercase)
        - status_filter: 'ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'
        """
        async with self.db.acquire() as conn:
            # Build query conditions
            conditions = []
            params = []
            param_count = 0
            
            if search:
                param_count += 1
                conditions.append(f"(u.full_name ILIKE ${param_count} OR u.email ILIKE ${param_count})")
                params.append(f"%{search}%")
            
            if role_filter:
                param_count += 1
                conditions.append(f"r.name::text = ${param_count}")
                params.append(role_filter.upper())
            
            if status_filter:
                param_count += 1
                conditions.append(f"u.status::text = ${param_count}")
                params.append(status_filter)
            
            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            
            offset = (page - 1) * per_page
            
            # Get users with roles
            query = f"""
                SELECT 
                    u.id, u.email, u.full_name, u.mobile_number,
                    r.name::text as role, u.status::text as status, u.created_at,
                    (SELECT COUNT(*) FROM properties p WHERE p.seller_id = u.id) as property_count,
                    (SELECT COUNT(*) FROM transactions t WHERE t.buyer_id = u.id) as purchase_count
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                {where_clause}
                ORDER BY u.created_at DESC
                LIMIT {per_page} OFFSET {offset}
            """
            
            users = await conn.fetch(query, *params)
            
            # Get total count with same joins
            count_query = f"""
                SELECT COUNT(*) FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                {where_clause}
            """
            total = await conn.fetchval(count_query, *params)
            
            # Get stats
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) FILTER (WHERE u.status = 'ACTIVE') as active_count,
                    COUNT(*) FILTER (WHERE u.status = 'SUSPENDED') as suspended_count,
                    COUNT(*) FILTER (WHERE r.name::text = 'USER') as user_count,
                    COUNT(*) FILTER (WHERE r.name::text = 'AGENT') as agent_count,
                    COUNT(*) FILTER (WHERE r.name::text = 'ADMIN') as admin_count
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
            """)
            
            return {
                "success": True,
                "users": [
                    {
                        "id": str(u['id']),
                        "email": u['email'],
                        "full_name": u['full_name'],
                        "phone": u['mobile_number'],
                        "role": u['role'] or 'USER',
                        "status": u['status'],
                        "created_at": u['created_at'].isoformat() if u['created_at'] else None,
                        "last_login_at": None,  # Not tracked in current schema
                        "property_count": u['property_count'] or 0,
                        "purchase_count": u['purchase_count'] or 0
                    }
                    for u in users
                ],
                "stats": {
                    "active": stats['active_count'] or 0,
                    "suspended": stats['suspended_count'] or 0,
                    "users": stats['user_count'] or 0,
                    "agents": stats['agent_count'] or 0,
                    "admins": stats['admin_count'] or 0
                },
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page
                }
            }
    
    async def suspend_user(
        self,
        user_id: UUID,
        admin_id: UUID,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Suspend a user account."""
        async with self.db.acquire() as conn:
            # Verify admin via user_roles
            is_admin = await conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1 AND r.name::text = 'ADMIN'
                )
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            # Get user with role
            user = await conn.fetchrow("""
                SELECT u.id, u.full_name, u.status::text as status, r.name::text as role
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                WHERE u.id = $1
            """, user_id)
            
            if not user:
                return {"success": False, "error": "User not found"}
            
            if user['role'] == 'ADMIN':
                return {"success": False, "error": "Cannot suspend admin users"}
            
            if user['status'] == 'SUSPENDED':
                return {"success": False, "error": "User is already suspended"}
            
            # Suspend
            await conn.execute("""
                UPDATE users SET status = 'SUSPENDED' WHERE id = $1
            """, user_id)
            
            return {
                "success": True,
                "message": f"{user['full_name']} has been suspended"
            }
    
    async def activate_user(
        self,
        user_id: UUID,
        admin_id: UUID
    ) -> Dict[str, Any]:
        """Activate a suspended user."""
        async with self.db.acquire() as conn:
            # Verify admin via user_roles
            is_admin = await conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1 AND r.name::text = 'ADMIN'
                )
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            # Get user
            user = await conn.fetchrow("""
                SELECT id, full_name, status::text as status FROM users WHERE id = $1
            """, user_id)
            
            if not user:
                return {"success": False, "error": "User not found"}
            
            if user['status'] == 'ACTIVE':
                return {"success": False, "error": "User is already active"}
            
            # Activate
            await conn.execute("""
                UPDATE users SET status = 'ACTIVE' WHERE id = $1
            """, user_id)
            
            return {
                "success": True,
                "message": f"{user['full_name']} has been activated"
            }
    
    async def get_user_detail(
        self,
        user_id: UUID,
        admin_id: UUID
    ) -> Dict[str, Any]:
        """Get detailed user information for admin."""
        async with self.db.acquire() as conn:
            # Verify admin via user_roles
            is_admin = await conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1 AND r.name::text = 'ADMIN'
                )
            """, admin_id)
            
            if not is_admin:
                return {"success": False, "error": "Admin access required"}
            
            user = await conn.fetchrow("""
                SELECT 
                    u.id, u.email, u.full_name, u.mobile_number, u.status::text as status, u.created_at,
                    r.name::text as role,
                    (SELECT COUNT(*) FROM properties WHERE seller_id = u.id) as property_count,
                    (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id) as purchase_count,
                    (SELECT COUNT(*) FROM visit_requests WHERE buyer_id = u.id) as visit_count
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                WHERE u.id = $1
            """, user_id)
            
            if not user:
                return {"success": False, "error": "User not found"}
            
            return {
                "success": True,
                "user": {
                    "id": str(user['id']),
                    "email": user['email'],
                    "full_name": user['full_name'],
                    "phone": user['mobile_number'],
                    "role": user['role'] or 'USER',
                    "status": user['status'],
                    "created_at": user['created_at'].isoformat() if user['created_at'] else None,
                    "last_login_at": None,
                    "property_count": user['property_count'] or 0,
                    "purchase_count": user['purchase_count'] or 0,
                    "visit_count": user['visit_count'] or 0
                }
            }
