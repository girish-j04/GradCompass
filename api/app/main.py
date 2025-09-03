from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
from app.config import settings
from app.database import create_tables, close_database
from app.routers import auth, profile, interview, cost_research  # Added cost_research import

# Import models to register them with SQLAlchemy
from app.models import user, profile as profile_models, interview as interview_models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="GradCompass API",
    description="AI-powered graduate application assistant with comprehensive cost research",
    version="1.1.0"  # Updated version
)

# Add CORS middleware with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {exc}")
    logger.error(f"Request: {request.method} {request.url}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error occurred",
            "error": str(exc) if settings.ENVIRONMENT == "development" else "Internal server error"
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(interview.router)
app.include_router(cost_research.router)  # Added cost research router

# Startup and shutdown events
@app.on_event("startup")
async def startup_db():
    try:
        await create_tables()
        logger.info("Database tables created successfully")
        logger.info("Cost research service initialized")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_db():
    await close_database()

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "GradCompass API is running!",
        "version": "1.1.0",
        "features": [
            "Profile Management",
            "Mock Visa Interviews", 
            "University Matching",
            "Cost Research & Financial Planning"  # Added new feature
        ]
    }

# API status endpoint
@app.get("/status")
async def get_api_status():
    return {
        "status": "healthy",
        "services": {
            "auth": "active",
            "profile": "active", 
            "interview": "active",
            "cost_research": "active"  # Added cost research service status
        },
        "endpoints": {
            "auth": "/auth/*",
            "profile": "/profile/*",
            "interview": "/interview/*", 
            "cost_research": "/cost-research/*"  # Added cost research endpoints
        }
    }