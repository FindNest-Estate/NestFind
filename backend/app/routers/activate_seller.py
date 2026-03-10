"""
Seller Activation Router — "Become a Seller" flow.

Allows authenticated BUYER users to activate SELLER capability.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from uuid import UUID

from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..core.database import get_db_pool


router = APIRouter(prefix="/user", tags=["User Roles"])


@router.post("/activate-seller")
async def activate_seller(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db_pool=Depends(get_db_pool)
):
    """
    Activate SELLER role for the current user.
    
    - Idempotent: returns existing roles if already a seller
    - Adds SELLER role to user_roles junction table
    - Audit logged
    """
    # Idempotency: if already SELLER, return current roles
    if "SELLER" in (current_user.roles or []):
        return {
            "success": True,
            "message": "User already has SELLER role",
            "roles": current_user.roles
        }

    async with db_pool.acquire() as conn:
        # 1. Look up the SELLER role ID — cast name to text to avoid enum type issues
        #    (works even if the client hasn't applied migration 026 yet)
        seller_role = await conn.fetchrow(
            "SELECT id FROM roles WHERE name::text = $1",
            "SELLER"
        )
        if not seller_role:
            raise HTTPException(
                status_code=500,
                detail="SELLER role not found in database"
            )

        # 2. Insert into user_roles
        await conn.execute(
            """
            INSERT INTO user_roles (user_id, role_id, assigned_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id, role_id) DO NOTHING
            """,
            current_user.user_id,
            seller_role["id"]
        )

        # 3. Audit log
        forwarded = request.headers.get("X-Forwarded-For")
        ip_address = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )

        try:
            await conn.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details)
                VALUES ($1, 'ROLE_ACTIVATED', 'USER', $1, $2, $3::jsonb)
                """,
                current_user.user_id,
                ip_address,
                '{"role": "SELLER"}'
            )
        except Exception:
            # Audit log is non-critical — don't fail the request if it errors
            pass

        # 4. Fetch updated roles using explicit enum cast in join
        updated_roles = await conn.fetch(
            """
            SELECT r.name::text FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            """,
            current_user.user_id
        )

        roles = [row["name"] for row in updated_roles]

    return {
        "success": True,
        "message": "SELLER role activated successfully",
        "roles": roles
    }
