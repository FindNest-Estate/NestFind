"""
Admin Operations Router — Read-only operational dashboards + SLA management.

Endpoints:
- GET /admin/operations/deal-pipeline - Deal status breakdown
- GET /admin/operations/stuck-deals - Deals stuck > threshold
- GET /admin/operations/disputed-deals - Currently disputed deals
- GET /admin/operations/awaiting-agreements - Deals needing agreements
- GET /admin/operations/agent-metrics - Per-agent performance
- GET /admin/operations/financial-summary - GMV, fees, commission
- GET /admin/operations/compliance/agreements - Agreement delays
- GET /admin/operations/compliance/disputes - Dispute aging
- GET /admin/operations/compliance/cancellations - Cancellation report
- GET /admin/operations/compliance/admin-actions - Admin action log
- GET /admin/operations/export/{report_type} - Export as CSV/JSON
- GET /admin/operations/sla/configs - SLA configurations
- PUT /admin/operations/sla/configs/{state} - Update SLA thresholds
- GET /admin/operations/sla/breaches - Active SLA breaches
- POST /admin/operations/sla/breaches/{id}/resolve - Resolve breach
- GET /admin/operations/sla/agent-compliance - Agent SLA metrics
"""
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
import io
import csv
import json

from ..core.database import get_db_pool
from ..middleware.auth_middleware import get_current_user, AuthenticatedUser
from ..services.operations_service import OperationsService
from ..services.sla_service import SLAService
from pydantic import BaseModel, Field


router = APIRouter(prefix="/admin/operations", tags=["Admin - Operations"])


# ============================================================================
# HELPER: Admin Check
# ============================================================================

def require_admin(current_user: AuthenticatedUser):
    """Ensure user has admin role."""
    if not any(role in (current_user.roles or []) for role in ['ADMIN', 'CEO']):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============================================================================
# PART 1: DEAL PIPELINE
# ============================================================================

@router.get("/deal-pipeline")
async def get_deal_pipeline(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Deal status breakdown with counts and average age per state.
    
    Excludes terminal states (COMPLETED, CANCELLED, EXPIRED).
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_deal_pipeline()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/stuck-deals")
async def get_stuck_deals(
    request: Request,
    threshold_days: int = Query(7, ge=1, description="Days stuck threshold"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get deals stuck in current state > threshold days.
    
    Useful for identifying bottlenecks and nudging agents.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_stuck_deals(threshold_days=threshold_days)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/disputed-deals")
async def get_disputed_deals(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get all deals currently in DISPUTED status with dispute details.
    
    Shows deal context, dispute category, amount, and age.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_disputed_deals()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/awaiting-agreements")
async def get_deals_awaiting_agreements(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Get deals at advanced states without required signed agreements.
    
    Compliance check: identifies deals that bypassed agreement requirements.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_deals_awaiting_agreements()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


# ============================================================================
# PART 2: AGENT PERFORMANCE
# ============================================================================

@router.get("/agent-metrics")
async def get_agent_metrics(
    request: Request,
    agent_id: Optional[UUID] = Query(None, description="Filter by specific agent"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Per-agent performance metrics derived from deal data.
    
    Shows: deals assigned, completed, dispute rate, commission earned.
    No manual scoring — all computed facts.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_agent_metrics(agent_id=agent_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


# ============================================================================
# PART 3: FINANCIAL VISIBILITY
# ============================================================================

@router.get("/financial-summary")
async def get_financial_summary(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Platform financial overview.
    
    - Total GMV (completed deals)
    - Platform fees earned
    - Commission released vs pending
    - Token money locked in disputes
    
    Read-only. No edits.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_financial_summary()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


# ============================================================================
# PART 4: COMPLIANCE & AUDIT
# ============================================================================

@router.get("/compliance/agreements")
async def get_agreement_compliance(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Agreement signing delay report.
    
    Shows DRAFT agreements > 3 days old without signatures.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_agreement_compliance()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/compliance/disputes")
async def get_dispute_aging(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Dispute aging report by status and age bucket.
    
    Groups open/under_review disputes:
    - < 7 days
    - 7-14 days
    - 14-30 days
    - > 30 days
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_dispute_aging()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/compliance/cancellations")
async def get_cancellation_report(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Cancellation reasons report with counts by state.
    
    Shows which states have most cancellations and why.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_cancellation_report()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/compliance/admin-actions")
async def get_admin_action_log(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Recent admin actions log for compliance.
    
    Includes: VOID_AGREEMENT, RESOLVE_DISPUTE, unfreeze, etc.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    result = await service.get_admin_action_log(limit=limit)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


# ============================================================================
# PART 5: EXPORT
# ============================================================================

@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    format: str = Query("csv", description="Export format: csv or json"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Export operational reports as CSV or JSON.
    
    Available report types:
    - deal-pipeline
    - stuck-deals
    - disputed-deals
    - agent-metrics
    - financial-summary
    - agreement-compliance
    - dispute-aging
    - cancellations
    - admin-actions
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = OperationsService(pool)
    
    # Map report type to service method
    report_methods = {
        "deal-pipeline": service.get_deal_pipeline,
        "stuck-deals": lambda: service.get_stuck_deals(threshold_days=7),
        "disputed-deals": service.get_disputed_deals,
        "agent-metrics": lambda: service.get_agent_metrics(agent_id=None),
        "financial-summary": service.get_financial_summary,
        "agreement-compliance": service.get_agreement_compliance,
        "dispute-aging": service.get_dispute_aging,
        "cancellations": service.get_cancellation_report,
        "admin-actions": lambda: service.get_admin_action_log(limit=100)
    }
    
    if report_type not in report_methods:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")
    
    result = await report_methods[report_type]()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    # Extract data key (varies by report)
    data_key = [k for k in result.keys() if k not in ('success',)][0]
    data = result[data_key]
    
    if format == "json":
        # JSON export
        output = io.StringIO()
        json.dump(data, output, indent=2, default=str)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={report_type}.json"}
        )
    
    elif format == "csv":
        # CSV export
        if not data:
            raise HTTPException(status_code=400, detail="No data to export")
        
        output = io.StringIO()
        
        # Flatten nested dicts for CSV
        if isinstance(data, list) and len(data) > 0:
            def flatten_dict(d, parent_key='', sep='_'):
                items = []
                for k, v in d.items():
                    new_key = f"{parent_key}{sep}{k}" if parent_key else k
                    if isinstance(v, dict):
                        items.extend(flatten_dict(v, new_key, sep=sep).items())
                    else:
                        items.append((new_key, v))
                return dict(items)
            
            flattened = [flatten_dict(row) for row in data]
            fieldnames = list(flattened[0].keys())
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(flattened)
        else:
            # For non-list data (e.g., financial summary), write key-value pairs
            writer = csv.writer(output)
            def write_nested(d, prefix=''):
                for k, v in d.items():
                    if isinstance(v, dict):
                        write_nested(v, f"{prefix}{k}.")
                    else:
                        writer.writerow([f"{prefix}{k}", v])
            write_nested(data if isinstance(data, dict) else {"value": data})
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}.csv"}
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ============================================================================
# PART 6: SLA MANAGEMENT (PHASE 5)
# ============================================================================

class SLAConfigUpdate(BaseModel):
    max_days: Optional[int] = Field(None, ge=1)
    notify_after_days: Optional[int] = Field(None, ge=1)
    escalate_after_days: Optional[int] = Field(None, ge=1)
    responsible_role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/sla/configs")
async def get_sla_configs(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """View all SLA configurations."""
    require_admin(current_user)
    
    pool = get_db_pool()
    service = SLAService(pool)
    
    result = await service.get_sla_configs()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.put("/sla/configs/{deal_state}")
async def update_sla_config(
    deal_state: str,
    data: SLAConfigUpdate,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Admin updates SLA thresholds for a deal state."""
    require_admin(current_user)
    
    pool = get_db_pool()
    service = SLAService(pool)
    
    result = await service.update_sla_config(
        deal_state=deal_state.upper(),
        admin_id=current_user.user_id,
        max_days=data.max_days,
        notify_after_days=data.notify_after_days,
        escalate_after_days=data.escalate_after_days,
        responsible_role=data.responsible_role,
        is_active=data.is_active
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.get("/sla/breaches")
async def get_sla_breaches(
    request: Request,
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    breach_type: Optional[str] = Query(None, description="WARNING or ESCALATION"),
    limit: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Get SLA breaches. Filter by resolved status and breach type."""
    require_admin(current_user)
    
    pool = get_db_pool()
    service = SLAService(pool)
    
    result = await service.get_breaches(
        resolved=resolved,
        breach_type=breach_type.upper() if breach_type else None,
        limit=limit
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result


@router.post("/sla/breaches/{breach_id}/resolve")
async def resolve_sla_breach(
    breach_id: UUID,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Admin manually resolves an SLA breach."""
    require_admin(current_user)
    
    pool = get_db_pool()
    service = SLAService(pool)
    
    result = await service.resolve_breach(
        breach_id=breach_id,
        admin_id=current_user.user_id
    )
    
    if not result["success"]:
        error_msg = result["error"].lower()
        if "not found" in error_msg:
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/sla/agent-compliance")
async def get_agent_sla_compliance(
    request: Request,
    agent_id: Optional[UUID] = Query(None, description="Filter by specific agent"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Per-agent SLA compliance metrics.
    
    Shows warnings, escalations, breach rate, and risk flags.
    All derived from breach records — no manual scoring.
    """
    require_admin(current_user)
    
    pool = get_db_pool()
    service = SLAService(pool)
    
    result = await service.get_agent_sla_metrics(agent_id=agent_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))
    
    return result
