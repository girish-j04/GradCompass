from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from app.services.cost_research_service import CostResearchService
from app.routers.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cost-research", tags=["cost-research"])

# Pydantic models for request/response
class TuitionResearchRequest(BaseModel):
    city: str = Field(..., description="City where the university is located")
    year: Optional[str] = Field(default=None, description="Academic year (defaults to current year)")
    university_name: Optional[str] = Field(default=None, description="Specific university name")
    destination_country: str = Field(default="USA", description="Destination country")

class CostOfLivingRequest(BaseModel):
    city: str = Field(..., description="City to research cost of living")
    year: Optional[str] = Field(default=None, description="Year for research (defaults to current year)")

class FundingResearchRequest(BaseModel):
    total_estimated_cost: float = Field(..., description="Total estimated cost in USD", gt=0)
    year: Optional[str] = Field(default=None, description="Academic year")
    destination_country: str = Field(default="USA", description="Destination country")

class ComprehensiveResearchRequest(BaseModel):
    city: str = Field(..., description="City where the university is located")
    year: Optional[str] = Field(default=None, description="Academic year (defaults to current year)")
    university_name: Optional[str] = Field(default=None, description="Specific university name")  
    destination_country: str = Field(default="USA", description="Destination country")

class ResearchResponse(BaseModel):
    status: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = {}

# Initialize service
cost_research_service = CostResearchService()

def get_current_year() -> str:
    """Get current academic year as string"""
    return str(datetime.now().year)

@router.post("/tuition", response_model=ResearchResponse)
async def research_tuition_costs(
    request: TuitionResearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Research tuition costs for universities in a specific city.
    Provides comprehensive information about tuition fees, international student costs,
    and financial aid options.
    """
    try:
        year = request.year or get_current_year()
        
        logger.info(f"User {current_user.email} requesting tuition research for {request.city}")
        
        result = await cost_research_service.research_tuition_costs(
            city=request.city,
            year=year,
            university_name=request.university_name
        )
        
        return ResearchResponse(
            status=result["status"],
            data=result.get("data"),
            error=result.get("error"),
            metadata={
                "city": request.city,
                "year": year,
                "university": request.university_name,
                "destination_country": request.destination_country,
                "research_type": "tuition"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in tuition research endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to research tuition costs: {str(e)}")

@router.post("/cost-of-living", response_model=ResearchResponse)
async def research_cost_of_living(
    request: CostOfLivingRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Research cost of living for international graduate students.
    Includes housing, food, transportation, and other living expenses
    with specific guidance for F1 visa students.
    """
    try:
        year = request.year or get_current_year()
        
        logger.info(f"User {current_user.email} requesting cost of living research for {request.city}")
        
        result = await cost_research_service.research_cost_of_living(
            city=request.city,
            year=year
        )
        
        return ResearchResponse(
            status=result["status"],
            data=result.get("data"),
            error=result.get("error"),
            metadata={
                "city": request.city,
                "year": year,
                "research_type": "cost_of_living"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in cost of living research endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to research cost of living: {str(e)}")

@router.post("/funding", response_model=ResearchResponse)
async def research_funding_options(
    request: FundingResearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Research funding options from Indian financial institutions.
    Provides comprehensive information about education loans, interest rates,
    eligibility criteria, and application strategies.
    """
    try:
        year = request.year or get_current_year()
        
        logger.info(f"User {current_user.email} requesting funding research for ${request.total_estimated_cost:,.2f}")
        
        result = await cost_research_service.research_funding_options(
            total_estimated_cost=request.total_estimated_cost,
            year=year,
            destination_country=request.destination_country
        )
        
        return ResearchResponse(
            status=result["status"],
            data=result.get("data"),
            error=result.get("error"),
            metadata={
                "total_cost": request.total_estimated_cost,
                "year": year,
                "destination_country": request.destination_country,
                "research_type": "funding"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in funding research endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to research funding options: {str(e)}")

@router.post("/comprehensive", response_model=ResearchResponse)
async def research_comprehensive_costs(
    request: ComprehensiveResearchRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Comprehensive cost research including tuition, living costs, and funding options.
    This is the most complete endpoint that provides an integrated financial plan
    for studying in the specified city.
    """
    try:
        year = request.year or get_current_year()
        
        logger.info(f"User {current_user.email} requesting comprehensive research for {request.city}")
        
        # This is a long-running operation, so we'll return immediately and process in background
        result = await cost_research_service.research_comprehensive_costs(
            city=request.city,
            year=year,
            university_name=request.university_name,
            destination_country=request.destination_country
        )
        
        return ResearchResponse(
            status=result["status"],
            data=result,
            error=result.get("error"),
            metadata={
                "city": request.city,
                "year": year,
                "university": request.university_name,
                "destination_country": request.destination_country,
                "research_type": "comprehensive"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in comprehensive research endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to complete comprehensive research: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for the cost research service"""
    try:
        # Simple check to ensure service is responsive
        return {
            "status": "healthy",
            "service": "cost_research",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

# Additional utility endpoints

@router.get("/supported-countries")
async def get_supported_countries(current_user: User = Depends(get_current_user)):
    """Get list of supported destination countries for cost research"""
    return {
        "countries": [
            {"code": "USA", "name": "United States", "supported": True},
            {"code": "CAN", "name": "Canada", "supported": True},
            {"code": "GBR", "name": "United Kingdom", "supported": True},
            {"code": "AUS", "name": "Australia", "supported": True},
            {"code": "DEU", "name": "Germany", "supported": True},
            {"code": "FRA", "name": "France", "supported": False},
            {"code": "NLD", "name": "Netherlands", "supported": False},
            {"code": "SWE", "name": "Sweden", "supported": False},
        ]
    }

@router.get("/popular-cities")
async def get_popular_cities(
    country: str = "USA",
    current_user: User = Depends(get_current_user)
):
    """Get popular cities for the specified country"""
    city_data = {
        "USA": [
            "New York", "Boston", "San Francisco", "Los Angeles", 
            "Chicago", "Austin", "Seattle", "Philadelphia", 
            "Atlanta", "San Diego", "Pittsburgh", "Ann Arbor"
        ],
        "CAN": [
            "Toronto", "Vancouver", "Montreal", "Calgary", 
            "Ottawa", "Edmonton", "Winnipeg", "Halifax"
        ],
        "GBR": [
            "London", "Manchester", "Birmingham", "Edinburgh", 
            "Glasgow", "Liverpool", "Bristol", "Leeds"
        ],
        "AUS": [
            "Sydney", "Melbourne", "Brisbane", "Perth", 
            "Adelaide", "Canberra", "Gold Coast", "Newcastle"
        ]
    }
    
    return {
        "country": country,
        "cities": city_data.get(country, [])
    }