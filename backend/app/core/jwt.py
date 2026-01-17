from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID, uuid4
from jose import JWTError, jwt


SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Session durations by role
TOKEN_DURATION = {
    "ADMIN": 15,          # 15 minutes for admin (strict security)
    "AGENT": 43200,       # 30 days for agents (30 * 24 * 60)
    "USER": 43200,        # 30 days for users (30 * 24 * 60)
    "DEFAULT": 15         # Default fallback
}

REFRESH_TOKEN_DURATION = {
    "ADMIN": 60,          # 1 hour for admin
    "AGENT": 43200,       # 30 days for agents
    "USER": 43200,        # 30 days for users
    "DEFAULT": 10080      # 7 days fallback
}


def create_access_token(
    user_id: UUID,
    session_id: UUID,
    role: str = "USER"
) -> str:
    """
    Create JWT access token with role-based expiration.
    
    JWT payload includes:
    - sub: user_id
    - session_id: session_id
    - role: user role
    - jti: unique token ID
    - iat: issued at (Unix timestamp)
    - exp: expires at (Unix timestamp)
    """
    now = datetime.now(timezone.utc)
    expire_minutes = TOKEN_DURATION.get(role, TOKEN_DURATION["DEFAULT"])
    expires_at = now + timedelta(minutes=expire_minutes)
    
    payload = {
        "sub": str(user_id),
        "session_id": str(session_id),
        "role": role,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp())
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify JWT token.
    
    Returns payload if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_refresh_token_duration(role: str) -> int:
    """Get refresh token duration in minutes based on role."""
    return REFRESH_TOKEN_DURATION.get(role, REFRESH_TOKEN_DURATION["DEFAULT"])
