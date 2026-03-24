from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_database
from app.models.matching import MatchRequest, MatchRunResponse, ProfileFeaturesResponse
from app.models.user import User
from app.routers.auth import get_current_active_user
from app.services.matching_service import matching_service_instance

router = APIRouter(
    prefix="/matching",
    tags=["University Matching"],
    responses={404: {"description": "Not found"}},
)

@router.post("/run", response_model=MatchRunResponse, status_code=status.HTTP_200_OK)
async def run_university_match(
    request: MatchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_database)
):
    """
    Execute the underlying ML matching pipeline to rank graduate programs based on candidate profile.
    Automatically assigns Reach / Target / Safe categories using predicted probability scores.
    """
    try:
        match_run, results, shortlist, extras = await matching_service_instance.generate_matches(
            db=db,
            user=current_user,
            request=request
        )
        profile_gaps, fallback_triggered, fallback_suggestions, fallback_results, _ = extras

        response = MatchRunResponse(
            id=match_run.id,
            created_at=match_run.created_at,
            results=results,
            shortlist=shortlist or None,
            profile_gaps=profile_gaps or None,
            fallback_triggered=fallback_triggered,
            fallback_suggestions=fallback_suggestions or None,
        )
        return response
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during matching: {str(e)}"
        )


@router.get("/profile-features", response_model=ProfileFeaturesResponse)
async def get_profile_features(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_database)
):
    """
    Compute and return ML feature values derived from the authenticated user's
    stored profile (GPA normalised to 4.0, work_exp_months, test scores,
    has_prestigious_experience, and suggested filter defaults).
    The frontend merges these into the MatchRequest payload before submission.
    """
    return await matching_service_instance.compute_profile_features(db, current_user)
