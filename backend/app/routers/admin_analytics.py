from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from ..services.analytics_service import AnalyticsService
from ..middleware.auth_middleware import AuthenticatedUser, require_role
from ..core.database import get_db_pool

router = APIRouter(prefix="/admin/analytics", tags=["Admin - Analytics"])

@router.get("/overview")
async def get_platform_overview(
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """Get high-level platform KPI metrics."""
    service = AnalyticsService(db_pool)
    try:
        data = await service.get_platform_overview()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/revenue-trends")
async def get_revenue_trends(
    days: int = 30,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """Get daily revenue trends."""
    service = AnalyticsService(db_pool)
    try:
        data = await service.get_revenue_trends(days)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-growth")
async def get_user_growth(
    days: int = 30,
    current_user: AuthenticatedUser = Depends(require_role("ADMIN")),
    db_pool = Depends(get_db_pool)
):
    """Get user growth stats."""
    service = AnalyticsService(db_pool)
    try:
        data = await service.get_user_growth(days)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
