import bcrypt
import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
import asyncpg


class RegisterAgentService:
    """
    Agent registration service implementing AUTH_SIGNUP_AGENT workflow.
    
    Creates agent user in PENDING_VERIFICATION state and triggers OTP.
    After OTP verification, agent transitions to IN_REVIEW.
    
    Agent-specific data (PAN, Aadhaar, service_radius) stored in agent_profiles table.
    """
    
    MAX_SERVICE_RADIUS_KM = 100
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    def _validate_password(self, password: str) -> bool:
        """Validate password meets requirements: min 8 chars, 1 letter, 1 number."""
        if len(password) < 8:
            return False
        has_letter = any(c.isalpha() for c in password)
        has_number = any(c.isdigit() for c in password)
        return has_letter and has_number
    
    async def register(
        self,
        full_name: str,
        email: str,
        password: str,
        mobile_number: str,
        latitude: float,
        longitude: float,
        address: Optional[str],
        pan_number: str,
        aadhaar_number: str,
        service_radius_km: int,
        ip_address: str
    ) -> dict:
        """
        Register new agent.
        
        Creates user record and agent_profiles record.
        
        Returns:
        {
            "success": bool,
            "user_id": Optional[UUID],
            "error": Optional[str]
        }
        """
        # Validate password
        if not self._validate_password(password):
            return {
                "success": False,
                "error": "Password must be at least 8 characters with 1 letter and 1 number"
            }
        
        # Validate service radius
        if service_radius_km > self.MAX_SERVICE_RADIUS_KM:
            return {
                "success": False,
                "error": f"Service radius cannot exceed {self.MAX_SERVICE_RADIUS_KM}km"
            }
        
        password_hash = self._hash_password(password)
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Check if email already exists
                email_exists = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
                    email
                )
                
                if email_exists:
                    # Generic error - don't leak email existence
                    return {
                        "success": False,
                        "error": "Registration failed"
                    }
                
                # Create user with AGENT role
                user_id = await conn.fetchval(
                    """
                    INSERT INTO users 
                    (full_name, email, mobile_number, password_hash, status,
                     latitude, longitude, address, created_at)
                    VALUES ($1, $2, $3, $4, 'PENDING_VERIFICATION', $5, $6, $7, NOW())
                    RETURNING id
                    """,
                    full_name, email, mobile_number, password_hash,
                    latitude, longitude, address
                )
                
                # Assign AGENT role
                agent_role_id = await conn.fetchval(
                    "SELECT id FROM roles WHERE name = 'AGENT'"
                )
                
                await conn.execute(
                    """
                    INSERT INTO user_roles (user_id, role_id, assigned_at)
                    VALUES ($1, $2, NOW())
                    """,
                    user_id, agent_role_id
                )
                
                # Create agent profile with PAN/Aadhaar
                await conn.execute(
                    """
                    INSERT INTO agent_profiles 
                    (user_id, pan_number, aadhaar_number, service_radius_km, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    """,
                    user_id, pan_number, aadhaar_number, service_radius_km
                )
                
                # Audit: AGENT_SIGNUP
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_SIGNUP', 'users', $1, $2, $3)
                    """,
                    user_id, ip_address, json.dumps({
                        'email': email,
                        'pan_number_masked': pan_number[:5] + '****' + pan_number[-1],
                        'aadhaar_masked': '****' + aadhaar_number[-4:],
                        'service_radius_km': service_radius_km
                    })
                )
                
                return {
                    "success": True,
                    "user_id": user_id
                }

    async def get_latest_rejection_reason(self, user_id: UUID) -> Optional[str]:
        """Fetch the latest rejection reason from audit logs."""
        async with self.db.acquire() as conn:
            details = await conn.fetchval(
                """
                SELECT details
                FROM audit_logs
                WHERE entity_id = $1 AND action = 'AGENT_DECLINED'
                ORDER BY timestamp DESC
                LIMIT 1
                """,
                user_id
            )
            
            if details:
                # details is already a dict if JSONB is handled, or string if not.
                # asyncpg returns JSONB as string usually if no codec?
                # Actually earlier I used json.dumps to insert.
                # Here we need to parse it if it's a string.
                if isinstance(details, str):
                    try:
                        data = json.loads(details)
                        return data.get('decision_reason')
                    except:
                        return None
                elif isinstance(details, dict):
                     return details.get('decision_reason')
            
            return None

    async def resubmit_agent(self, user_id: UUID, ip_address: str) -> dict:
        """
        Transition DECLINED -> IN_REVIEW.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Check current status
                status_val = await conn.fetchval(
                    "SELECT status::text FROM users WHERE id = $1",
                    user_id
                )
                
                if status_val != 'DECLINED':
                    return {
                        "success": False,
                        "error": f"Cannot resubmit from {status_val} state"
                    }
                
                # Update status
                await conn.execute(
                    """
                    UPDATE users
                    SET status = 'IN_REVIEW', created_at = NOW()
                    WHERE id = $1
                    """,
                    user_id
                )
                
                # Audit
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_RESUBMITTED', 'users', $1, $2, '{}')
                    """,
                    user_id, ip_address
                )
                
                return {"success": True}

    async def get_application_details(self, user_id: UUID) -> dict:
        """Fetch full application details."""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT u.full_name, u.email, u.mobile_number, u.address, u.latitude, u.longitude,
                       ap.pan_number, ap.aadhaar_number, ap.service_radius_km
                FROM users u
                LEFT JOIN agent_profiles ap ON u.id = ap.user_id
                WHERE u.id = $1
                """,
                user_id
            )
            
            if not row:
                raise Exception("User not found")
                
            return dict(row)

    async def update_application(self, user_id: UUID, data: dict, ip_address: str) -> dict:
        """Update application details."""
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Check status
                status = await conn.fetchval("SELECT status FROM users WHERE id = $1", user_id)
                if status not in ('DECLINED', 'IN_REVIEW'):
                     return {"success": False, "error": "Cannot edit application in current state"}

                # Update users table
                await conn.execute(
                    """
                    UPDATE users
                    SET full_name = $1, mobile_number = $2, address = $3, latitude = $4, longitude = $5
                    WHERE id = $6
                    """,
                    data['full_name'], data['mobile_number'], data['address'], 
                    data['latitude'], data['longitude'], user_id
                )
                
                # Update agent_profiles table
                await conn.execute(
                    """
                    UPDATE agent_profiles
                    SET pan_number = $1, aadhaar_number = $2, service_radius_km = $3
                    WHERE user_id = $4
                    """,
                    data['pan_number'], data['aadhaar_number'], data['service_radius_km'], user_id
                )
                
                # Audit
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'AGENT_APPLICATION_UPDATED', 'users', $1, $2, '{}')
                    """,
                    user_id, ip_address
                )
                
                return {"success": True}
