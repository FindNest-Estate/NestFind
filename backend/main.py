# Trigger reload 5
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine
import app.models as models
from app.routers import auth, properties, bookings, dashboard, users, offers, messages, transactions, notifications, payments, admin, ai, agents, loans
from app.tasks import start_scheduler
from app.core.logger import logger
import os
import time

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="NestFind API")

# Start Scheduler
@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    log_data = {
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "duration": round(process_time, 4),
        "client": request.client.host if request.client else None
    }
    
    if response.status_code >= 400:
        logger.error("Request failed", extra=log_data)
    else:
        logger.info("Request processed", extra=log_data)
        
    return response

@app.get("/health")
def health_check():
    return {"status": "ok"}

# CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(bookings.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(offers.router)
app.include_router(messages.router)
app.include_router(transactions.router)
app.include_router(notifications.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(agents.router)
app.include_router(loans.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to NestFind API"}
