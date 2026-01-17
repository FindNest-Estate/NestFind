from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
import asyncpg


class AdminAgentApprovalService:
    """
    Admin agent approval service implementing AGENT_APPROVAL workflow.
    
    Enforces state transitions: IN_REVIEW → ACTIVE | DECLINED
    """
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    async def approve_agent(
        self,
        agent_id: UUID,
        admin_id: UUID,
        decision_reason: Optional[str],
        ip_address: str
    ) -> dict:
        """
        Approve agent: IN_REVIEW → ACTIVE.
        
        Returns:
        {
            "success": bool,
            "status": Optional[str],
            "error": Optional[str]
        }
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Lock and load agent
                agent = await conn.fetchrow(
                    """
                    SELECT u.id, u.status, ur.role_id, r.name as role_name
                    FROM users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE u.id = $1
                    FOR UPDATE
                    """,
                    agent_id
                )
                
                if not agent:
                    return {
                        "success": False,
                        "error": "Agent not found"
                    }
                
                # Verify agent has AGENT role
                if agent['role_name'] != 'AGENT':
                    return {
                        "success": False,
                        "error": "User is not an agent"
                    }
                
                # Enforce state transition: IN_REVIEW → ACTIVE
                if agent['status'] != 'IN_REVIEW':
                    return {
                        "success": False,
                        "error": "Invalid state transition"
                    }
                
                # Update status to ACTIVE
                await conn.execute(
                    """
                    UPDATE users
                    SET status = 'ACTIVE'
                    WHERE id = $1
                    """,
                    agent_id
                )
                
                # Audit: AGENT_APPROVED
                import json
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_APPROVED', 'users', $2, $3, $4)
                    """,
                    admin_id, agent_id, ip_address, json.dumps({
                        'approved_by': str(admin_id),
                        'decision_reason': decision_reason
                    })
                )
                
                return {
                    "success": True,
                    "status": "ACTIVE"
                }
    
    async def decline_agent(
        self,
        agent_id: UUID,
        admin_id: UUID,
        decision_reason: Optional[str],
        ip_address: str
    ) -> dict:
        """
        Decline agent: IN_REVIEW → DECLINED.
        
        Returns:
        {
            "success": bool,
            "status": Optional[str],
            "error": Optional[str]
        }
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Lock and load agent
                agent = await conn.fetchrow(
                    """
                    SELECT u.id, u.status, ur.role_id, r.name as role_name
                    FROM users u
                    JOIN user_roles ur ON u.id = ur.user_id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE u.id = $1
                    FOR UPDATE
                    """,
                    agent_id
                )
                
                if not agent:
                    return {
                        "success": False,
                        "error": "Agent not found"
                    }
                
                # Verify agent has AGENT role
                if agent['role_name'] != 'AGENT':
                    return {
                        "success": False,
                        "error": "User is not an agent"
                    }
                
                # Enforce state transition: IN_REVIEW → DECLINED
                if agent['status'] != 'IN_REVIEW':
                    return {
                        "success": False,
                        "error": "Invalid state transition"
                    }
                
                # Update status to DECLINED
                await conn.execute(
                    """
                    UPDATE users
                    SET status = 'DECLINED'
                    WHERE id = $1
                    """,
                    agent_id
                )
                
                # Audit: AGENT_DECLINED
                import json
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_DECLINED', 'users', $2, $3, $4)
                    """,
                    admin_id, agent_id, ip_address, json.dumps({
                        'declined_by': str(admin_id),
                        'decision_reason': decision_reason
                    })
                )
                
                return {
                    "success": True,
                    "status": "DECLINED"
                }
    
    async def get_pending_agents(
        self,
        page: int = 1,
        per_page: int = 20
    ) -> dict:
        """
        Get list of agents pending approval (status=IN_REVIEW).
        
        Returns:
        {
            "success": bool,
            "agents": [...],
            "pagination": {...}
        }
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Get total count
            total = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'AGENT' AND u.status = 'IN_REVIEW'
                """
            )
            
            # Get pending agents
            rows = await conn.fetch(
                """
                SELECT 
                    u.id, u.full_name, u.email, u.mobile_number,
                    u.created_at, u.status::text,
                    ap.pan_number, ap.aadhaar_number, ap.service_radius_km
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                LEFT JOIN agent_profiles ap ON u.id = ap.user_id
                WHERE r.name = 'AGENT' AND u.status = 'IN_REVIEW'
                ORDER BY u.created_at ASC
                LIMIT $1 OFFSET $2
                """,
                per_page, offset
            )
            
            agents = []
            for row in rows:
                agents.append({
                    "id": str(row["id"]),
                    "full_name": row["full_name"],
                    "email": row["email"],
                    "phone_number": row["mobile_number"],
                    "status": row["status"],
                    "pan_number": row["pan_number"],
                    "aadhaar_number": row["aadhaar_number"],
                    "service_radius": row["service_radius_km"],
                    "submitted_at": row["created_at"].isoformat()
                })
            
            return {
                "success": True,
                "agents": agents,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": (total + per_page - 1) // per_page if total > 0 else 0,
                    "has_more": (page * per_page) < total
                }
            }

