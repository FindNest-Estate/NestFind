import bcrypt
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
import asyncpg


class RegisterUserService:
    """
    User registration service implementing AUTH_SIGNUP_USER workflow.
    
    Creates user in PENDING_VERIFICATION state and triggers OTP.
    """
    
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
        mobile_number: Optional[str],
        ip_address: str
    ) -> dict:
        """
        Register new user.
        
        Returns:
        {
            "success": bool,
            "error": Optional[str]
        }
        """
        # Validate password
        if not self._validate_password(password):
            return {
                "success": False,
                "error": "Password must be at least 8 characters with 1 letter and 1 number"
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
                
                # Create user
                user_id = await conn.fetchval(
                    """
                    INSERT INTO users 
                    (full_name, email, mobile_number, password_hash, status, created_at)
                    VALUES ($1, $2, $3, $4, 'PENDING_VERIFICATION', NOW())
                    RETURNING id
                    """,
                    full_name, email, mobile_number, password_hash
                )
                
                # Assign USER role
                user_role_id = await conn.fetchval(
                    "SELECT id FROM roles WHERE name = 'USER'"
                )
                
                await conn.execute(
                    """
                    INSERT INTO user_roles (user_id, role_id, assigned_at)
                    VALUES ($1, $2, NOW())
                    """,
                    user_id, user_role_id
                )
                
                # Audit: SIGNUP_INITIATED
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'SIGNUP_INITIATED', 'users', $1, $2, $3)
                    """,
                    user_id, ip_address, {'email': email}
                )
                
                return {
                    "success": True,
                    "user_id": user_id
                }
