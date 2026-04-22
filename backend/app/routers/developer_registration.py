"""
Developer Registration Router — Self-registration with admin approval flow.

Workflow:
  POST /developer/register     → Create user + developer profile (status=PENDING)
  GET  /developer/register/status → Check approval status
  POST /developer/register/admin/approve/{id} → Admin approves
  POST /developer/register/admin/reject/{id}  → Admin rejects
"""
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
import json
import hashlib
import secrets

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser, require_role
from ..schemas.developer_schemas import DeveloperRegisterRequest

router = APIRouter(prefix="/developer/register", tags=["Developer Registration"])


# ============================================================================
# SELF REGISTRATION
# ============================================================================

@router.post("")
async def register_developer(data: DeveloperRegisterRequest):
    """
    Developer self-registration.
    Creates a user account + developer profile with PENDING status.
    Admin must approve before the developer portal is accessible.
    """
    pool = get_db_pool()
    try:
        async with pool.acquire() as conn:
            # Check email uniqueness
            existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", data.email)
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered. Please sign in or use a different email.")

            # Hash password
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            password_hash = pwd_context.hash(data.password)

            async with conn.transaction():
                # Create user
                user = await conn.fetchrow(
                    """
                    INSERT INTO users (full_name, email, mobile_number, password_hash, status)
                    VALUES ($1, $2, $3, $4, 'PENDING_VERIFICATION'::user_status)
                    RETURNING id, full_name, email, status, created_at
                    """,
                    data.developer_name, data.email, data.phone, password_hash
                )

                # Create developer profile
                profile = await conn.fetchrow(
                    """
                    INSERT INTO developer_profiles (
                        user_id, company_name, developer_name, phone, office_address,
                        city, state, pincode, rera_registration_number,
                        company_registration_number, gst_number,
                        projects_handled_before, years_of_experience, about_company,
                        status
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PENDING'::dev_account_status)
                    RETURNING id, status, company_name
                    """,
                    user["id"],
                    data.company_name, data.developer_name, data.phone,
                    data.office_address, data.city, data.state, data.pincode,
                    data.rera_registration_number, data.company_registration_number,
                    data.gst_number, data.projects_handled_before or 0,
                    data.years_of_experience or 0, data.about_company
                )

                # Assign DEVELOPER role immediately—user stays PENDING status until approved.
                dev_role = await conn.fetchrow("SELECT id FROM roles WHERE name = 'DEVELOPER'")
                if dev_role:
                    await conn.execute(
                        """
                        INSERT INTO user_roles (user_id, role_id)
                        VALUES ($1, $2) ON CONFLICT DO NOTHING
                        """,
                        user["id"], dev_role["id"]
                    )

            return {
                "success": True,
                "message": "Registration submitted. Admin will review your application.",
                "user_id": str(user["id"]),
                "profile_id": str(profile["id"]),
                "status": "PENDING",
            }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[developer/register] ERROR: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.get("/status")
async def get_registration_status(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Check the developer registration/approval status."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            """
            SELECT id, company_name, status, rejection_reason, created_at, reviewed_at
            FROM developer_profiles WHERE user_id = $1
            """,
            current_user.user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="No developer registration found")

        return {
            "success": True,
            "data": {
                "profile_id": str(profile["id"]),
                "company_name": profile["company_name"],
                "status": profile["status"],
                "rejection_reason": profile["rejection_reason"],
                "submitted_at": profile["created_at"],
                "reviewed_at": profile["reviewed_at"],
            }
        }


# ============================================================================
# ADMIN ACTIONS
# ============================================================================

@router.get("/admin/pending")
async def list_pending_developers(
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN"))
):
    """Admin: list all pending developer registrations."""
    pool = get_db_pool()
    offset = (page - 1) * per_page
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM developer_profiles WHERE status = 'PENDING'"
        )
        rows = await conn.fetch(
            """
            SELECT dp.*, u.email, u.created_at AS user_created_at
            FROM developer_profiles dp
            JOIN users u ON u.id = dp.user_id
            WHERE dp.status = 'PENDING'
            ORDER BY dp.created_at DESC
            LIMIT $1 OFFSET $2
            """,
            per_page, offset
        )
    return {
        "success": True,
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


class AdminReview(BaseModel):
    rejection_reason: Optional[str] = Field(None, max_length=500)


@router.post("/admin/approve/{profile_id}")
async def approve_developer(
    profile_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN"))
):
    """Admin: approve a developer registration."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            "SELECT * FROM developer_profiles WHERE id = $1 AND status = 'PENDING'",
            profile_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Pending registration not found")

        # Approve profile
        await conn.execute(
            """
            UPDATE developer_profiles
            SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW()
            WHERE id = $1
            """,
            profile_id, current_user.user_id
        )

        # Activate user account
        await conn.execute(
            "UPDATE users SET status = 'ACTIVE' WHERE id = $1",
            profile["user_id"]
        )

        # Assign DEVELOPER role
        dev_role = await conn.fetchrow("SELECT id FROM roles WHERE name = 'DEVELOPER'")
        if dev_role:
            await conn.execute(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2) ON CONFLICT DO NOTHING
                """,
                profile["user_id"], dev_role["id"]
            )

        return {"success": True, "message": "Developer approved successfully"}


@router.post("/admin/reject/{profile_id}")
async def reject_developer(
    profile_id: UUID,
    data: AdminReview,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN"))
):
    """Admin: reject a developer registration."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            "SELECT * FROM developer_profiles WHERE id = $1 AND status = 'PENDING'",
            profile_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Pending registration not found")

        await conn.execute(
            """
            UPDATE developer_profiles
            SET status = 'REJECTED', rejection_reason = $2,
                reviewed_by = $3, reviewed_at = NOW()
            WHERE id = $1
            """,
            profile_id,
            data.rejection_reason or "Application does not meet requirements",
            current_user.user_id
        )

        return {"success": True, "message": "Developer registration rejected"}


@router.post("/admin/suspend/{profile_id}")
async def suspend_developer(
    profile_id: UUID,
    data: AdminReview,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN"))
):
    """Admin: suspend an approved developer."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            "SELECT * FROM developer_profiles WHERE id = $1", profile_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Developer not found")

        await conn.execute(
            "UPDATE developer_profiles SET status = 'SUSPENDED' WHERE id = $1",
            profile_id
        )
        await conn.execute(
            "UPDATE users SET status = 'SUSPENDED' WHERE id = $1",
            profile["user_id"]
        )

        return {"success": True, "message": "Developer suspended"}
