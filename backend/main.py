from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

@app.get("/")
def read_root():
    return {
        "message": "NestFind API v2.0",
        "status": "ready for features"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
