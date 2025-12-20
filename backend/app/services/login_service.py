import bcrypt
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from uuid import UUID
import asyncpg


class LoginService:
    """
    Password login service implementing AUTH_SECURITY_RULES.md Rule 2.
    
    Enforces:
    - Bcrypt password verification
    - 5-attempt login lockout
    - 15-minute lockout duration
    """
    
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_MINUTES = 15
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password using bcrypt."""
        # Handle both string and bytes password_hash
        if isinstance(password_hash, str):
            password_hash = password_hash.encode()
        return bcrypt.checkpw(password.encode(), password_hash)
    
    async def authenticate(
        self,
        email: str,
        password: str,
        ip_address: str
    ) -> dict:
        """
        Authenticate user with password and lockout enforcement.
        
        Returns:
        {
            "success": bool,
            "user_id": Optional[UUID],
            "error": Optional[str],
            "locked_until": Optional[datetime]
        }
        """
        # Use naive UTC datetime for comparison with DB TIMESTAMP columns
        now = datetime.utcnow()
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Lock user row for update
                user = await conn.fetchrow(
                    """
                    SELECT id, password_hash, status, login_attempts, login_locked_until
                    FROM users
                    WHERE email = $1
                    FOR UPDATE
                    """,
                    email
                )
                
                # Generic error if user not found (don't leak email existence)
                if not user:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES (NULL, 'LOGIN_FAILED', 'users', NULL, $1, $2)
                        """,
                        ip_address, json.dumps({'reason': 'invalid_credentials', 'email': email})
                    )
                    return {
                        "success": False,
                        "error": "Invalid credentials"
                    }
                
                # Check if account is locked
                if user['login_locked_until'] and user['login_locked_until'] > now:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'LOGIN_BLOCKED', 'users', $1, $2, $3)
                        """,
                        user['id'], ip_address, json.dumps({
                            'locked_until': user['login_locked_until'].isoformat(),
                            'reason': 'account_locked'
                        })
                    )
                    return {
                        "success": False,
                        "error": "Invalid credentials",
                        "locked_until": user['login_locked_until']
                    }
                
                # Check if user status allows login
                if user['status'] == 'SUSPENDED':
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'LOGIN_BLOCKED', 'users', $1, $2, $3)
                        """,
                        user['id'], ip_address, json.dumps({'reason': 'suspended'})
                    )
                    return {
                        "success": False,
                        "error": "Invalid credentials"
                    }
                
                # Verify password
                if not self._verify_password(password, user['password_hash']):
                    # Increment login attempts
                    new_attempts = user['login_attempts'] + 1
                    
                    # Check if lockout threshold reached
                    if new_attempts >= self.MAX_LOGIN_ATTEMPTS:
                        lockout_until = now + timedelta(minutes=self.LOCKOUT_MINUTES)
                        lockout_until_naive = lockout_until.replace(tzinfo=None)
                        await conn.execute(
                            """
                            UPDATE users
                            SET login_attempts = $1, login_locked_until = $2
                            WHERE id = $3
                            """,
                            new_attempts, lockout_until_naive, user['id']
                        )
                        
                        await conn.execute(
                            """
                            INSERT INTO audit_logs 
                            (user_id, action, entity_type, entity_id, ip_address, details)
                            VALUES ($1, 'LOGIN_BLOCKED', 'users', $1, $2, $3)
                            """,
                            user['id'], ip_address, json.dumps({
                                'locked_until': lockout_until.isoformat(),
                                'reason': 'max_login_attempts',
                                'attempts': new_attempts
                            })
                        )
                        
                        return {
                            "success": False,
                            "error": "Invalid credentials",
                            "locked_until": lockout_until
                        }
                    else:
                        # Increment attempts but don't lock yet
                        await conn.execute(
                            """
                            UPDATE users
                            SET login_attempts = $1
                            WHERE id = $2
                            """,
                            new_attempts, user['id']
                        )
                        
                        await conn.execute(
                            """
                            INSERT INTO audit_logs 
                            (user_id, action, entity_type, entity_id, ip_address, details)
                            VALUES ($1, 'LOGIN_FAILED', 'users', $1, $2, $3)
                            """,
                            user['id'], ip_address, json.dumps({
                                'attempts': new_attempts,
                                'remaining': self.MAX_LOGIN_ATTEMPTS - new_attempts
                            })
                        )
                        
                        return {
                            "success": False,
                            "error": "Invalid credentials"
                        }
                
                # Password is valid - reset lockout and attempts
                await conn.execute(
                    """
                    UPDATE users
                    SET login_attempts = 0, login_locked_until = NULL
                    WHERE id = $1
                    """,
                    user['id']
                )
                
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'LOGIN_SUCCESS', 'users', $1, $2, $3)
                    """,
                    user['id'], ip_address, json.dumps({'status': user['status']})
                )
                
                return {
                    "success": True,
                    "user_id": user['id']
                }
