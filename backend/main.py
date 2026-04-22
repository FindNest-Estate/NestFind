from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
from dotenv import load_dotenv # type: ignore
import os

# Load environment variables
load_dotenv()


from app.routers import otp, login, session, refresh, register_user, register_agent, admin_agent_approval, user, seller_properties, property_media, public_properties, public_agents, saved_properties, agent_assignments, messaging, notifications, admin_analytics, admin_transactions, admin_users, admin_properties, admin_audit_logs, buyer, collections, admin_operations # type: ignore


from app.routers import visits, offers, reservations, transactions, disputes, property_stats, deals, agreements, finance, settlement, payments, webhooks # type: ignore
from app.routers import seller_analytics, seller_offers, seller_visits, seller_transactions, seller_settings # type: ignore
from app.routers import activate_seller, corporate_inventory, websocket_messaging # type: ignore
from app.routers import risk_dashboard  # type: ignore
from app.routers import title_searches, escrow, legal_fees  # Phase 6: Title & Escrow Engine  # type: ignore
# Developer Portal routers
from app.routers import (
    developer_registration,
    developer_projects,
    developer_units,
    developer_offers,
    developer_deals,
    developer_layout,
    developer_misc,
    developer_buildings,
    developer_polygons,
)  # type: ignore
# Public Visualization Explorer
from app.routers import visualization_router  # type: ignore
from app.core.database import init_db_pool, close_db_pool, get_db_pool # type: ignore
from app.jobs.scheduler import init_scheduler, start_scheduler, shutdown_scheduler # type: ignore
from pathlib import Path

app = FastAPI(
    title="NestFind API",
    version="2.0.0",
    description="Real Estate Platform - Minimal Baseline"
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"422 ERROR: {exc.errors()}")
    # Body might not be serializable (e.g. FormData). Convert to string for safety.
    body_str = str(exc.body) if exc.body else None
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body_summary": body_str},
    )

# Database and scheduler lifecycle
@app.on_event("startup")
async def startup():
    await init_db_pool()
    # Initialize and start scheduled jobs
    db_pool = get_db_pool()
    app.state.db_pool = db_pool
    init_scheduler(db_pool)
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    shutdown_scheduler()
    await close_db_pool()

# Include routers
app.include_router(otp.router)
app.include_router(login.router)
app.include_router(session.router)
app.include_router(refresh.router)
app.include_router(register_user.router)
app.include_router(register_agent.router)
app.include_router(admin_agent_approval.router)
app.include_router(admin_analytics.router)
app.include_router(admin_operations.router)
app.include_router(admin_transactions.router)
app.include_router(admin_users.router)
app.include_router(admin_properties.router)
app.include_router(admin_audit_logs.router)
app.include_router(user.router)
app.include_router(activate_seller.router)

# PUBLIC routes MUST come before authenticated routes with /properties prefix
# to avoid route conflicts (e.g. /properties/browse vs /properties/{id}/media)
app.include_router(public_properties.router)
app.include_router(public_agents.router)
app.include_router(risk_dashboard.router)  # includes public /properties/{id}/trust-score
app.include_router(property_stats.router)  # View tracking and analytics

# Exact match authenticated routes MUST come before parameterized routes
app.include_router(saved_properties.router)
app.include_router(collections.router)

# Authenticated property routes with /properties/{id}
app.include_router(seller_properties.router)
app.include_router(property_media.router)

app.include_router(agent_assignments.router)
app.include_router(messaging.router)
app.include_router(notifications.router)
app.include_router(buyer.router)

# Transaction lifecycle routers
app.include_router(visits.router)
app.include_router(offers.router)
app.include_router(reservations.router)
app.include_router(transactions.router)
app.include_router(disputes.router)
app.include_router(deals.router)
app.include_router(agreements.router)
app.include_router(finance.router)
app.include_router(settlement.router)  # Phase 5A: Commission lifecycle & settlement
app.include_router(title_searches.router)    # Phase 6: Title search lifecycle
app.include_router(escrow.router)            # Phase 6: Escrow disbursement engine
app.include_router(legal_fees.router)        # Phase 6: Legal compliance engine
app.include_router(payments.router)
app.include_router(webhooks.router)

# Seller dashboard routers
app.include_router(seller_analytics.router)
app.include_router(seller_offers.router)
app.include_router(seller_visits.router)
app.include_router(seller_transactions.router)
app.include_router(seller_settings.router)

# Corporate and iBuyer Platform routers
app.include_router(corporate_inventory.router)

# ---------------------------------------------------------------------------
# PUBLIC VISUALIZATION EXPLORER (no auth required)
# ---------------------------------------------------------------------------
app.include_router(visualization_router.router)

# ---------------------------------------------------------------------------
# DEVELOPER PORTAL ROUTERS
# ---------------------------------------------------------------------------
app.include_router(developer_registration.router)
app.include_router(developer_projects.router)
app.include_router(developer_units.router)
app.include_router(developer_deals.router)
app.include_router(developer_layout.router)
app.include_router(developer_buildings.router)
app.include_router(developer_polygons.router)
# Misc sub-routers (leads, agents, docs, analytics, settings)
app.include_router(developer_misc.leads_router)
app.include_router(developer_misc.agents_router)
app.include_router(developer_misc.docs_router)
app.include_router(developer_misc.analytics_router)
app.include_router(developer_misc.settings_router)

# Static file serving for uploads
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {
        "message": "NestFind API v2.0",
        "status": "ready for features"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}


