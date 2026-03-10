import secrets
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import asyncpg

from ..core.jwt import get_refresh_token_duration


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

    async def _resolve_primary_role(self, conn: asyncpg.Connection, user_id: UUID) -> str:
        roles = await conn.fetch(
            """
            SELECT r.name::text AS name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            """,
            user_id,
        )
        role_names = [r["name"] for r in roles]

        if "ADMIN" in role_names:
            return "ADMIN"
        if "AGENT" in role_names:
            return "AGENT"
        if "SELLER" in role_names:
            return "SELLER"
        if "BUYER" in role_names:
            return "BUYER"
        return role_names[0] if role_names else "USER"

    async def issue_refresh_token(
        self,
        session_id: UUID,
        ip_address: str,
        expiry_minutes: Optional[int] = None,
    ) -> str:
        """
        Issue refresh token for a session.

        Returns plaintext refresh token (client stores this).
        """
        refresh_token = self._generate_refresh_token()
        refresh_token_hash = self._hash_token(refresh_token)

        if expiry_minutes is not None:
            expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        else:
            expires_at = datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRY_DAYS)

        async with self.db.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    UPDATE sessions
                    SET refresh_token_hash = $1, expires_at = $2
                    WHERE session_id = $3
                    """,
                    refresh_token_hash,
                    expires_at,
                    session_id,
                )

        return refresh_token

    async def rotate_refresh_token(
        self,
        refresh_token: str,
        ip_address: str,
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
                session = await conn.fetchrow(
                    """
                    SELECT session_id, user_id, token_family_id, refresh_token_hash,
                           parent_token_hash, revoked_at, expires_at
                    FROM sessions
                    WHERE refresh_token_hash = $1
                    FOR UPDATE
                    """,
                    refresh_token_hash,
                )

                if not session:
                    reused_session = await conn.fetchrow(
                        """
                        SELECT session_id, user_id, token_family_id
                        FROM sessions
                        WHERE parent_token_hash = $1
                        """,
                        refresh_token_hash,
                    )

                    if reused_session:
                        await conn.execute(
                            """
                            UPDATE sessions
                            SET revoked_at = NOW()
                            WHERE token_family_id = $1 AND revoked_at IS NULL
                            """,
                            reused_session["token_family_id"],
                        )

                        await conn.execute(
                            """
                            INSERT INTO audit_logs
                            (user_id, action, entity_type, entity_id, ip_address, details)
                            VALUES ($1, 'TOKEN_REVOKED', 'sessions', $2, $3, $4)
                            """,
                            reused_session["user_id"],
                            reused_session["session_id"],
                            ip_address,
                            json.dumps(
                                {
                                    "reason": "refresh_token_reuse_detected",
                                    "token_family_id": str(reused_session["token_family_id"]),
                                }
                            ),
                        )

                        return {
                            "success": False,
                            "error": "Token reuse detected. All sessions revoked.",
                        }

                    return {
                        "success": False,
                        "error": "Invalid refresh token",
                    }

                if session["revoked_at"]:
                    return {
                        "success": False,
                        "error": "Session revoked",
                    }

                if session["expires_at"] < datetime.utcnow():
                    return {
                        "success": False,
                        "error": "Refresh token expired",
                    }

                primary_role = await self._resolve_primary_role(conn, session["user_id"])
                refresh_minutes = get_refresh_token_duration(primary_role)

                new_refresh_token = self._generate_refresh_token()
                new_refresh_token_hash = self._hash_token(new_refresh_token)
                new_expires_at = datetime.utcnow() + timedelta(minutes=refresh_minutes)

                await conn.execute(
                    """
                    UPDATE sessions
                    SET refresh_token_hash = $1,
                        parent_token_hash = $2,
                        expires_at = $3
                    WHERE session_id = $4
                    """,
                    new_refresh_token_hash,
                    refresh_token_hash,
                    new_expires_at,
                    session["session_id"],
                )

                await conn.execute(
                    """
                    INSERT INTO audit_logs
                    (user_id, action, entity_type, entity_id, ip_address, details)
                    VALUES ($1, 'TOKEN_REFRESHED', 'sessions', $2, $3, $4)
                    """,
                    session["user_id"],
                    session["session_id"],
                    ip_address,
                    json.dumps({"session_id": str(session["session_id"])}),
                )

                return {
                    "success": True,
                    "new_refresh_token": new_refresh_token,
                    "session_id": session["session_id"],
                    "user_id": session["user_id"],
                }

    async def revoke_token_family(
        self,
        token_family_id: UUID,
        ip_address: str,
        user_id: UUID,
        reason: str,
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
                    token_family_id,
                )

                if not sessions:
                    return 0

                await conn.execute(
                    """
                    UPDATE sessions
                    SET revoked_at = NOW()
                    WHERE token_family_id = $1 AND revoked_at IS NULL
                    """,
                    token_family_id,
                )

                for session in sessions:
                    await conn.execute(
                        """
                        INSERT INTO audit_logs
                        (user_id, action, entity_type, entity_id, ip_address, details)
                        VALUES ($1, 'TOKEN_REVOKED', 'sessions', $2, $3, $4)
                        """,
                        user_id,
                        session["session_id"],
                        ip_address,
                        json.dumps(
                            {
                                "reason": reason,
                                "token_family_id": str(token_family_id),
                            }
                        ),
                    )

                return len(sessions)
