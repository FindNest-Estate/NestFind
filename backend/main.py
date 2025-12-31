from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

from app.routers import otp, login, session, refresh, register_user, register_agent, admin_agent_approval, user, seller_properties, property_media
from app.core.database import init_db_pool, close_db_pool
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

# Database lifecycle
@app.on_event("startup")
async def startup():
    await init_db_pool()

@app.on_event("shutdown")
async def shutdown():
    await close_db_pool()

# Include routers
app.include_router(otp.router)
app.include_router(login.router)
app.include_router(session.router)
app.include_router(refresh.router)
app.include_router(register_user.router)
app.include_router(register_agent.router)
app.include_router(admin_agent_approval.router)
app.include_router(user.router)
app.include_router(seller_properties.router)
app.include_router(property_media.router)

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
