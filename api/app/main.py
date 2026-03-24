from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
from app.config import settings
from app.database import create_tables, close_database
from app.routers import auth, profile, interview, cost_research, matching

# Import models to register them with SQLAlchemy
from app.models import user, profile as profile_models, interview as interview_models, matching as matching_models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="GradCompass API",
    description="AI-powered graduate application assistant with comprehensive cost research",
    version="1.1.0"  # Updated version
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {exc}")
    logger.error(f"Request: {request.method} {request.url}")
    logger.error(f"Origin: {request.headers.get('origin')}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error occurred",
            "error": str(exc) if settings.ENVIRONMENT == "development" else "Internal server error"
        }
    )

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(interview.router)
app.include_router(cost_research.router)
app.include_router(matching.router)

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
            "cost_research": "active",
            "matching": "active"
        },
        "endpoints": {
            "auth": "/auth/*",
            "profile": "/profile/*",
            "interview": "/interview/*", 
            "cost_research": "/cost-research/*",
            "matching": "/matching/*"
        }
    }