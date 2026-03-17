from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
from typing import Optional, List

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


def _extract_tokens(
    credentials: Optional[HTTPAuthorizationCredentials],
    request: Optional[Request],
) -> List[str]:
    """Extract candidate tokens from header, cookie, and query string."""
    candidates: List[str] = []

    if credentials and credentials.credentials:
        candidates.append(credentials.credentials)

    if request:
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            candidates.append(cookie_token)

        # SSE fallback
        query_token = request.query_params.get("token")
        if query_token:
            candidates.append(query_token)

    # Preserve order while removing duplicates
    seen = set()
    tokens: List[str] = []
    for token in candidates:
        if token and token not in seen:
            seen.add(token)
            tokens.append(token)

    return tokens


async def _build_user_context(
    token: str,
    db_pool,
) -> Optional[AuthenticatedUser]:
    """Decode token and load canonical status/roles from DB. Returns None if invalid."""
    payload = decode_access_token(token)
    if not payload:
        return None

    sub = payload.get("sub")
    session_id_str = payload.get("session_id")
    if not sub or not session_id_str:
        return None

    try:
        user_id = UUID(sub)
        session_id = UUID(session_id_str)
    except (ValueError, TypeError):
        return None

    session_service = SessionService(db_pool)
    session = await session_service.verify_session(session_id)
    if not session:
        return None

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, status
            FROM users
            WHERE id = $1
            """,
            user_id,
        )
        if not user:
            return None

        roles = await conn.fetch(
            """
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            """,
            user_id,
        )
        role_names = [role["name"] for role in roles]

    return AuthenticatedUser(
        user_id=user_id,
        session_id=session_id,
        status=user["status"],
        roles=role_names,
    )


async def get_current_user_any_status(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
    db_pool=Depends(get_db_pool),
) -> dict:
    """
    JWT verification for any authenticated user (any status).

    Use this for endpoints where users need to check their own status,
    like /user/me. Does NOT enforce ACTIVE status.
    """
    tokens = _extract_tokens(credentials, request)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    for token in tokens:
        context = await _build_user_context(token, db_pool)
        if context:
            return {
                "user_id": context.user_id,
                "session_id": context.session_id,
            }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
    db_pool=Depends(get_db_pool),
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
    tokens = _extract_tokens(credentials, request)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    inactive_context: Optional[AuthenticatedUser] = None
    for token in tokens:
        context = await _build_user_context(token, db_pool)
        if not context:
            continue

        if context.status != "ACTIVE":
            inactive_context = context
            continue

        return context

    if inactive_context:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not active",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
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
                detail=f"Role {required_role} required",
            )
        return current_user

    return role_checker


def require_any_role(*allowed_roles: str):
    """
    Dependency factory: requires user to have at least ONE of the listed roles.

    Usage: current_user: AuthenticatedUser = Depends(require_any_role("BUYER", "SELLER"))
    """

    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if not any(role in current_user.roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of roles {list(allowed_roles)} required",
            )
        return current_user

    return role_checker


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
    db_pool=Depends(get_db_pool),
) -> Optional[AuthenticatedUser]:
    """
    Optional authentication - returns user if authenticated, None otherwise.

    Use for endpoints that work for both authenticated and unauthenticated users,
    but may return additional data when authenticated (e.g., viewer context).

    Does NOT raise exceptions for missing/invalid tokens.
    """
    tokens = _extract_tokens(credentials, request)
    if not tokens:
        return None

    for token in tokens:
        context = await _build_user_context(token, db_pool)
        if context and context.status == "ACTIVE":
            return context

    return None

async def get_current_user_ws(
    websocket: Request, # Works for WebSocket scope as well
    token: Optional[str] = None,
    db_pool=Depends(get_db_pool)
) -> str:
    """
    WebSocket specific authenticaton.
    Extracts token from query parameters.
    Returns user_id as string.
    """
    if not token:
        # Try to get from query params directly if not injected
        token = websocket.query_params.get("token")
        
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    context = await _build_user_context(token, db_pool)
    if not context or context.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return str(context.user_id)
