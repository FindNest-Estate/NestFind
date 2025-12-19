from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID, uuid4
from jose import JWTError, jwt


SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15


def create_access_token(
    user_id: UUID,
    session_id: UUID
) -> str:
    """
    Create JWT access token.
    
    JWT payload includes:
    - sub: user_id
    - session_id: session_id
    - jti: unique token ID
    - iat: issued at (Unix timestamp)
    - exp: expires at (Unix timestamp)
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": str(user_id),
        "session_id": str(session_id),
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
