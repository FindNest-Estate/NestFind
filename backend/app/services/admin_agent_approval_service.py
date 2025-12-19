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
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_APPROVED', 'users', $1, $2, $3)
                    """,
                    agent_id, ip_address, {
                        'approved_by': str(admin_id),
                        'decision_reason': decision_reason
                    }
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
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_DECLINED', 'users', $1, $2, $3)
                    """,
                    agent_id, ip_address, {
                        'declined_by': str(admin_id),
                        'decision_reason': decision_reason
                    }
                )
                
                return {
                    "success": True,
                    "status": "DECLINED"
                }
