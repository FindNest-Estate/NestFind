"""Developer Leads, Agents, Documents, Analytics Routers."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from uuid import UUID

from ..core.database import get_db_pool
from ..middleware.auth_middleware import require_role, get_current_user, AuthenticatedUser
from ..schemas.developer_schemas import (
    LeadCreate, LeadUpdate,
    DevAgentCreate, DevAgentUpdate,
    DeveloperSettings, CompanySettings
)
from ..services.developer_lead_service import DeveloperLeadService
from ..services.developer_agent_service import DeveloperAgentService
from ..services.developer_document_service import DeveloperDocumentService
from ..services.developer_analytics_service import DeveloperAnalyticsService

# ============================================================================
# LEADS
# ============================================================================

leads_router = APIRouter(prefix="/developer/leads", tags=["Developer Leads"])


@leads_router.post("")
async def create_lead(
    data: LeadCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Capture a buyer lead. Called from buyer-facing project pages."""
    pool = get_db_pool()
    # Determine developer from project/unit
    if not data.project_id and not data.unit_id:
        raise HTTPException(status_code=400, detail="project_id or unit_id required")

    async with pool.acquire() as conn:
        if data.project_id:
            dev_row = await conn.fetchrow(
                "SELECT developer_id FROM dev_projects WHERE id = $1", data.project_id
            )
        else:
            dev_row = await conn.fetchrow(
                "SELECT p.developer_id FROM dev_units u JOIN dev_projects p ON p.id=u.project_id WHERE u.id=$1",
                data.unit_id
            )
        if not dev_row:
            raise HTTPException(status_code=404, detail="Project not found")
        developer_id = dev_row["developer_id"]

    service = DeveloperLeadService(pool)
    result = await service.create_lead(developer_id, current_user.user_id, data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@leads_router.get("")
async def list_leads(
    project_id: Optional[UUID] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List leads for the developer."""
    pool = get_db_pool()
    service = DeveloperLeadService(pool)
    result = await service.list_leads(
        developer_id=current_user.user_id,
        project_id=project_id,
        status=status,
        page=page,
        per_page=per_page,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@leads_router.put("/{lead_id}")
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Update lead status, visit date, or agent assignment."""
    pool = get_db_pool()
    service = DeveloperLeadService(pool)
    result = await service.update_lead(lead_id, current_user.user_id, data.model_dump(exclude_none=True))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ============================================================================
# AGENTS
# ============================================================================

agents_router = APIRouter(prefix="/developer/agents", tags=["Developer Agents"])


@agents_router.post("")
async def create_agent(
    data: DevAgentCreate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Assign or register an agent."""
    pool = get_db_pool()
    service = DeveloperAgentService(pool)
    result = await service.create_agent(current_user.user_id, data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@agents_router.get("")
async def list_agents(
    page: int = 1,
    per_page: int = 20,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """List all agents with deal statistics."""
    pool = get_db_pool()
    service = DeveloperAgentService(pool)
    result = await service.list_agents(current_user.user_id, page=page, per_page=per_page)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@agents_router.put("/{agent_id}")
async def update_agent(
    agent_id: UUID,
    data: DevAgentUpdate,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperAgentService(pool)
    result = await service.update_agent(agent_id, current_user.user_id, data.model_dump(exclude_none=True))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@agents_router.delete("/{agent_id}")
async def remove_agent(
    agent_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperAgentService(pool)
    result = await service.remove_agent(agent_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ============================================================================
# DOCUMENTS
# ============================================================================

docs_router = APIRouter(prefix="/developer/documents", tags=["Developer Documents"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@docs_router.post("")
async def upload_document(
    doc_type: str = Form(...),
    doc_name: str = Form(...),
    project_id: Optional[UUID] = Form(None),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Upload a project document (RERA, DTCP, brochure, etc.)."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX"
        )
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20MB
        raise HTTPException(status_code=400, detail="File too large. Maximum 20MB.")

    pool = get_db_pool()
    service = DeveloperDocumentService(pool)
    result = await service.save_document(
        developer_id=current_user.user_id,
        project_id=project_id,
        doc_type=doc_type,
        doc_name=doc_name,
        file_content=content,
        mime_type=file.content_type,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@docs_router.get("")
async def list_documents(
    project_id: Optional[UUID] = None,
    doc_type: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperDocumentService(pool)
    result = await service.list_documents(
        developer_id=current_user.user_id,
        project_id=project_id,
        doc_type=doc_type,
        page=page,
        per_page=per_page,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@docs_router.delete("/{doc_id}")
async def delete_document(
    doc_id: UUID,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperDocumentService(pool)
    result = await service.delete_document(doc_id, current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ============================================================================
# ANALYTICS
# ============================================================================

analytics_router = APIRouter(prefix="/developer/analytics", tags=["Developer Analytics"])


@analytics_router.get("/summary")
async def get_analytics_summary(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Dashboard KPI summary."""
    pool = get_db_pool()
    service = DeveloperAnalyticsService(pool)
    result = await service.get_summary(current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@analytics_router.get("/leads-per-project")
async def get_leads_per_project(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperAnalyticsService(pool)
    result = await service.get_leads_per_project(current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@analytics_router.get("/offers-per-unit")
async def get_offers_per_unit(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperAnalyticsService(pool)
    result = await service.get_offers_per_unit(current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@analytics_router.get("/conversion-rate")
async def get_conversion_rate(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperAnalyticsService(pool)
    result = await service.get_conversion_rate(current_user.user_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@analytics_router.get("/revenue-timeline")
async def get_revenue_timeline(
    months: int = 12,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    pool = get_db_pool()
    service = DeveloperAnalyticsService(pool)
    result = await service.get_revenue_timeline(current_user.user_id, months=months)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ============================================================================
# SETTINGS
# ============================================================================

settings_router = APIRouter(prefix="/developer/settings", tags=["Developer Settings"])


@settings_router.get("")
async def get_settings(
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Get developer profile + settings."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            "SELECT * FROM developer_profiles WHERE user_id = $1",
            current_user.user_id
        )
    if not profile:
        raise HTTPException(status_code=404, detail="Developer profile not found")
    return {"success": True, "data": dict(profile)}


@settings_router.put("/deal")
async def update_deal_settings(
    data: DeveloperSettings,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Update deal and notification settings."""
    import json
    pool = get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE developer_profiles
            SET settings = settings || $2::jsonb, updated_at = NOW()
            WHERE user_id = $1
            """,
            current_user.user_id,
            json.dumps(data.model_dump())
        )
    return {"success": True, "message": "Settings updated"}


@settings_router.put("/company")
async def update_company_settings(
    data: CompanySettings,
    current_user: AuthenticatedUser = Depends(require_role("DEVELOPER"))
):
    """Update developer company information."""
    pool = get_db_pool()
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    column_map = {
        "company_name": "company_name",
        "office_address": "office_address",
        "city": "city",
        "state": "state",
        "pincode": "pincode",
        "rera_registration_number": "rera_registration_number",
        "company_registration_number": "company_registration_number",
        "gst_number": "gst_number",
        "projects_handled_before": "projects_handled_before",
        "years_of_experience": "years_of_experience",
        "about_company": "about_company",
        "website": "website",
        "support_phone": "support_phone",
        "support_email": "support_email",
    }

    set_clauses = []
    params = [current_user.user_id]
    idx = 2

    for field, value in updates.items():
        if field in column_map:
            set_clauses.append(f"{column_map[field]} = ${idx}")
            params.append(value)
            idx += 1

    if set_clauses:
        async with pool.acquire() as conn:
            # If the user was rejected, update to PENDING automatically on profile update
            query = f"UPDATE developer_profiles SET {', '.join(set_clauses)}, updated_at = NOW()"
            
            # Check if we should reset status
            profile = await conn.fetchrow("SELECT status FROM developer_profiles WHERE user_id = $1", current_user.user_id)
            if profile and profile["status"] == 'REJECTED':
                query += ", status = 'PENDING'::dev_account_status"
                
            query += " WHERE user_id = $1"
            
            await conn.execute(query, *params)
            
    return {"success": True, "message": "Company profile updated successfully"}
