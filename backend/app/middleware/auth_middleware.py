from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
from typing import Optional

from ..core.jwt import decode_access_token
from ..core.database import get_db_pool
from ..services.session_service import SessionService


security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Authenticated user context."""
    def __init__(self, user_id: UUID, session_id: UUID, status: str, roles: list):
        self.user_id = user_id
        self.session_id = session_id
        self.status = status
        self.roles = roles


async def _get_token_from_request(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None
) -> Optional[str]:
    """Extract token from Authorization header or cookies."""
    # Try Authorization header first
    if credentials and credentials.credentials:
        return credentials.credentials
    
    # Fall back to cookies
    if request:
        token = request.cookies.get("access_token")
        if token:
            return token
    
    return None


async def get_current_user_any_status(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
    db_pool = Depends(get_db_pool)
) -> dict:
    """
    JWT verification for any authenticated user (any status).
    
    Use this for endpoints where users need to check their own status,
    like /user/me. Does NOT enforce ACTIVE status.
    """
    # Get token from header or cookie
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request:
        token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Decode JWT
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Validate required fields exist
    sub = payload.get("sub")
    session_id_str = payload.get("session_id")
    
    if not sub or not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    try:
        user_id = UUID(sub)
        session_id = UUID(session_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    # Verify session is not revoked
    session_service = SessionService(db_pool)
    session = await session_service.verify_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked or expired"
        )
    
    # Return minimal user context (status NOT checked)
    return {
        "user_id": user_id,
        "session_id": session_id
    }


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
    db_pool = Depends(get_db_pool)
) -> AuthenticatedUser:
    """
    JWT verification middleware for ACTIVE users only.
    
    Enforces AUTH_SECURITY_RULES.md Rule 3 and Rule 4:
    - Verifies JWT signature
    - Checks session revocation
    - Re-verifies user status from database
    - Re-verifies user roles from database
    - NEVER trusts role/status from JWT
    - Requires ACTIVE status
    """
    # Get token from header or cookie
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request:
        token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Decode JWT
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Validate required fields exist
    sub = payload.get("sub")
    session_id_str = payload.get("session_id")
    
    if not sub or not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    try:
        user_id = UUID(sub)
        session_id = UUID(session_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    # Verify session is not revoked
    session_service = SessionService(db_pool)
    session = await session_service.verify_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked or expired"
        )
    
    # Re-verify user status and roles from database (NEVER trust JWT)
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, status
            FROM users
            WHERE id = $1
            """,
            user_id
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check user status (ACTIVE required for protected resources)
        if user['status'] != 'ACTIVE':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not active"
            )
        
        # Load user roles from database
        roles = await conn.fetch(
            """
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            """,
            user_id
        )
        
        role_names = [role['name'] for role in roles]
    
    return AuthenticatedUser(
        user_id=user_id,
        session_id=session_id,
        status=user['status'],
        roles=role_names
    )


def require_role(required_role: str):
    """
    Dependency factory to require specific role.
    
    Usage: current_user: AuthenticatedUser = Depends(require_role("ADMIN"))
    
    Note: This is a sync factory that returns an async dependency.
    The outer function MUST be sync so FastAPI receives a callable, not a coroutine.
    """
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if required_role not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role} required"
            )
        return current_user
    
    return role_checker

