import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID, uuid4
import asyncpg


class SessionService:
    """
    Session management service implementing AUTH_SECURITY_RULES.md Rule 3.
    
    Enforces:
    - Session-bound JWT tokens
    - Session revocation
    - Device fingerprinting
    """
    
    SESSION_EXPIRY_MINUTES = 15
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    def _hash_user_agent(self, user_agent: str) -> str:
        """Hash User-Agent for device fingerprinting."""
        return hashlib.sha256(user_agent.encode()).hexdigest()
    
    async def create_session(
        self,
        user_id: UUID,
        ip_address: str,
        user_agent: str
    ) -> dict:
        """
        Create new session after successful login.
        
        Returns:
        {
            "session_id": UUID,
            "token_family_id": UUID,
            "expires_at": datetime
        }
        """
        session_id = uuid4()
        token_family_id = uuid4()
        device_fingerprint = self._hash_user_agent(user_agent)
        # Use naive UTC datetime for DB TIMESTAMP columns
        expires_at = datetime.utcnow() + timedelta(minutes=self.SESSION_EXPIRY_MINUTES)
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO sessions 
                    (session_id, user_id, refresh_token_hash, token_family_id, 
                     expires_at, device_fingerprint, last_ip, created_at)
                    VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())
                    """,
                    session_id, user_id, token_family_id, expires_at,
                    device_fingerprint, ip_address
                )
        
        return {
            "session_id": session_id,
            "token_family_id": token_family_id,
            "expires_at": expires_at
        }
    
    async def verify_session(self, session_id: UUID) -> Optional[dict]:
        """
        Verify session is valid and not revoked.
        
        Returns session data or None if invalid.
        """
        async with self.db.acquire() as conn:
            session = await conn.fetchrow(
                """
                SELECT session_id, user_id, revoked_at, expires_at
                FROM sessions
                WHERE session_id = $1
                """,
                session_id
            )
            
            if not session:
                return None
            
            # Check if revoked
            if session['revoked_at']:
                return None
            
            # Check if expired
            if session['expires_at'] < datetime.utcnow():
                return None
            
            return {
                "session_id": session['session_id'],
                "user_id": session['user_id']
            }
    
    async def revoke_session(
        self,
        session_id: UUID,
        ip_address: str,
        revoked_by_user_id: Optional[UUID] = None
    ) -> bool:
        """
        Revoke a single session (logout).
        
        Returns True if session was revoked, False if not found.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                session = await conn.fetchrow(
                    """
                    SELECT session_id, user_id
                    FROM sessions
                    WHERE session_id = $1
                    FOR UPDATE
                    """,
                    session_id
                )
                
                if not session:
                    return False
                
                await conn.execute(
                    """
                    UPDATE sessions
                    SET revoked_at = NOW()
                    WHERE session_id = $1
                    """,
                    session_id
                )
                
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'TOKEN_REVOKED', 'sessions', $2, $3, $4)
                    """,
                    session['user_id'], session_id, ip_address, json.dumps({
                        'session_id': str(session_id),
                        'revoked_by': str(revoked_by_user_id) if revoked_by_user_id else 'self'
                    })
                )
                
                return True
    
    async def revoke_all_user_sessions(
        self,
        user_id: UUID,
        ip_address: str,
        revoked_by_admin_id: UUID
    ) -> int:
        """
        Revoke all sessions for a user (admin action).
        
        Returns count of revoked sessions.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                sessions = await conn.fetch(
                    """
                    SELECT session_id
                    FROM sessions
                    WHERE user_id = $1 AND revoked_at IS NULL
                    FOR UPDATE
                    """,
                    user_id
                )
                
                if not sessions:
                    return 0
                
                await conn.execute(
                    """
                    UPDATE sessions
                    SET revoked_at = NOW()
                    WHERE user_id = $1 AND revoked_at IS NULL
                    """,
                    user_id
                )
                
                for session in sessions:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'TOKEN_REVOKED', 'sessions', $2, $3, $4)
                        """,
                        user_id, session['session_id'], ip_address, json.dumps({
                            'session_id': str(session['session_id']),
                            'revoked_by_admin': str(revoked_by_admin_id),
                            'reason': 'admin_revoke_all'
                        })
                    )
                
                return len(sessions)
