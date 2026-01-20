from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()


from app.routers import otp, login, session, refresh, register_user, register_agent, admin_agent_approval, user, seller_properties, property_media, public_properties, public_agents, saved_properties, agent_assignments, messaging, notifications, admin_analytics, admin_transactions, admin_users, admin_properties, admin_audit_logs, buyer, collections


from app.routers import visits, offers, reservations, transactions, disputes, property_stats
from app.routers import seller_analytics, seller_offers, seller_visits, seller_transactions, seller_settings
from app.core.database import init_db_pool, close_db_pool
from app.jobs.scheduler import init_scheduler, start_scheduler, shutdown_scheduler
from pathlib import Path

app = FastAPI(
    title="NestFind API",
    version="2.0.0",
    description="Real Estate Platform - Minimal Baseline"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database and scheduler lifecycle
@app.on_event("startup")
async def startup():
    await init_db_pool()
    # Initialize and start scheduled jobs
    db_pool = app.state.db_pool if hasattr(app.state, 'db_pool') else None
    if db_pool:
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
app.include_router(admin_transactions.router)
app.include_router(admin_users.router)
app.include_router(admin_properties.router)
app.include_router(admin_audit_logs.router)
app.include_router(user.router)

# PUBLIC routes MUST come before authenticated routes with /properties prefix
# to avoid route conflicts (e.g. /properties/browse vs /properties/{id}/media)
app.include_router(public_properties.router)
app.include_router(public_agents.router)
app.include_router(property_stats.router)  # View tracking and analytics

# Authenticated property routes
app.include_router(seller_properties.router)
app.include_router(property_media.router)
app.include_router(saved_properties.router)
app.include_router(collections.router)

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

# Seller dashboard routers
app.include_router(seller_analytics.router)
app.include_router(seller_offers.router)
app.include_router(seller_visits.router)
app.include_router(seller_transactions.router)
app.include_router(seller_settings.router)

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
