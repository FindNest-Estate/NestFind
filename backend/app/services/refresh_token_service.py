import secrets
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from uuid import UUID
import asyncpg


class RefreshTokenService:
    """
    Refresh token service implementing AUTH_SECURITY_RULES.md Rule 7.
    
    Enforces:
    - Refresh token rotation
    - Family tracking
    - Reuse detection
    - Family-wide revocation on theft
    """
    
    REFRESH_TOKEN_LENGTH = 64
    REFRESH_TOKEN_EXPIRY_DAYS = 7
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    def _generate_refresh_token(self) -> str:
        """Generate cryptographically secure refresh token."""
        return secrets.token_urlsafe(self.REFRESH_TOKEN_LENGTH)
    
    def _hash_token(self, token: str) -> str:
        """Hash refresh token using SHA-256."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def issue_refresh_token(
        self,
        session_id: UUID,
        ip_address: str
    ) -> str:
        """
        Issue refresh token for a session.
        
        Returns plaintext refresh token (client stores this).
        """
        refresh_token = self._generate_refresh_token()
        refresh_token_hash = self._hash_token(refresh_token)
        # Use naive UTC datetime for DB TIMESTAMP columns
        expires_at = datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRY_DAYS)
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    UPDATE sessions
                    SET refresh_token_hash = $1, expires_at = $2
                    WHERE session_id = $3
                    """,
                    refresh_token_hash, expires_at, session_id
                )
        
        return refresh_token
    
    async def rotate_refresh_token(
        self,
        refresh_token: str,
        ip_address: str
    ) -> dict:
        """
        Rotate refresh token with reuse detection.
        
        Returns:
        {
            "success": bool,
            "new_refresh_token": Optional[str],
            "session_id": Optional[UUID],
            "user_id": Optional[UUID],
            "error": Optional[str]
        }
        """
        refresh_token_hash = self._hash_token(refresh_token)
        
        async with self.db.acquire() as conn:
            async with conn.transaction():
                # Lock session row for update
                session = await conn.fetchrow(
                    """
                    SELECT session_id, user_id, token_family_id, refresh_token_hash, 
                           parent_token_hash, revoked_at, expires_at
                    FROM sessions
                    WHERE refresh_token_hash = $1
                    FOR UPDATE
                    """,
                    refresh_token_hash
                )
                
                if not session:
                    # Token not found - check for reuse
                    reused_session = await conn.fetchrow(
                        """
                        SELECT session_id, user_id, token_family_id
                        FROM sessions
                        WHERE parent_token_hash = $1
                        """,
                        refresh_token_hash
                    )
                    
                    if reused_session:
                        # REUSE DETECTED - revoke entire family
                        await conn.execute(
                            """
                            UPDATE sessions
                            SET revoked_at = NOW()
                            WHERE token_family_id = $1 AND revoked_at IS NULL
                            """,
                            reused_session['token_family_id']
                        )
                        
                        await conn.execute(
                            """
                            INSERT INTO audit_logs 
                            (user_id, action, entity_type, entity_id, ip_address, details)
                            VALUES ($1, 'TOKEN_REVOKED', 'sessions', $2, $3, $4)
                            """,
                            reused_session['user_id'], reused_session['session_id'], ip_address, json.dumps({
                                'reason': 'refresh_token_reuse_detected',
                                'token_family_id': str(reused_session['token_family_id'])
                            })
                        )
                        
                        return {
                            "success": False,
                            "error": "Token reuse detected. All sessions revoked."
                        }
                    
                    return {
                        "success": False,
                        "error": "Invalid refresh token"
                    }
                
                # Check if session is revoked
                if session['revoked_at']:
                    return {
                        "success": False,
                        "error": "Session revoked"
                    }
                
                # Check if token is expired
                if session['expires_at'] < datetime.utcnow():
                    return {
                        "success": False,
                        "error": "Refresh token expired"
                    }
                
                # Generate new refresh token
                new_refresh_token = self._generate_refresh_token()
                new_refresh_token_hash = self._hash_token(new_refresh_token)
                # Use naive UTC datetime for DB TIMESTAMP columns
                new_expires_at = datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRY_DAYS)
                
                # Rotate: update session with new token and set parent
                await conn.execute(
                    """
                    UPDATE sessions
                    SET refresh_token_hash = $1,
                        parent_token_hash = $2,
                        expires_at = $3
                    WHERE session_id = $4
                    """,
                    new_refresh_token_hash, refresh_token_hash, new_expires_at, session['session_id']
                )
                
                await conn.execute(
                    """
                    INSERT INTO audit_logs 
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'TOKEN_REFRESHED', 'sessions', $2, $3, $4)
                    """,
                    session['user_id'], session['session_id'], ip_address, json.dumps({
                        'session_id': str(session['session_id'])
                    })
                )
                
                return {
                    "success": True,
                    "new_refresh_token": new_refresh_token,
                    "session_id": session['session_id'],
                    "user_id": session['user_id']
                }
    
    async def revoke_token_family(
        self,
        token_family_id: UUID,
        ip_address: str,
        user_id: UUID,
        reason: str
    ) -> int:
        """
        Revoke all sessions in a token family.
        
        Returns count of revoked sessions.
        """
        async with self.db.acquire() as conn:
            async with conn.transaction():
                sessions = await conn.fetch(
                    """
                    SELECT session_id
                    FROM sessions
                    WHERE token_family_id = $1 AND revoked_at IS NULL
                    FOR UPDATE
                    """,
                    token_family_id
                )
                
                if not sessions:
                    return 0
                
                await conn.execute(
                    """
                    UPDATE sessions
                    SET revoked_at = NOW()
                    WHERE token_family_id = $1 AND revoked_at IS NULL
                    """,
                    token_family_id
                )
                
                for session in sessions:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs 
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'TOKEN_REVOKED', 'sessions', $2, $3, $4)
                        """,
                        user_id, session['session_id'], ip_address, json.dumps({
                            'reason': reason,
                            'token_family_id': str(token_family_id)
                        })
                    )
                
                return len(sessions)
