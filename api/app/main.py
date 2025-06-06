from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables, close_database
from app.routers import auth, profile

# Import models to register them with SQLAlchemy
from app.models import user, profile as profile_models

# Create FastAPI app
app = FastAPI(
    title="GradPath API",
    description="AI-powered graduate application assistant",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)

# Startup and shutdown events
@app.on_event("startup")
async def startup_db():
    await create_tables()

@app.on_event("shutdown")
async def shutdown_db():
    await close_database()

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "GradPath API is running!", "environment": settings.ENVIRONMENT}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}