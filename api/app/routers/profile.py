from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.models.user import User
from app.models.profile import (
    UserProfile, WorkExperience,
    UserProfileCreate, UserProfileUpdate, UserProfileResponse,
    WorkExperienceCreate, WorkExperienceUpdate, WorkExperienceResponse,
    ProfileCompletionStatus
)
from app.utils.auth import get_current_user
from app.utils.profile import calculate_profile_completion, check_agent_profile_requirements
from app.database import get_database
from app.constants.profile import (
    GPA_SCALES, TARGET_DEGREES, TARGET_FIELDS, PREFERRED_COUNTRIES,
    BUDGET_RANGES, APPLICATION_TIMELINES, TEST_SCORE_RANGES
)

router = APIRouter(prefix="/profile", tags=["profile"])

# --- Helper Functions ---

async def get_user_profile_with_experiences(user_id: int, db: AsyncSession) -> UserProfile | None:
    result = await db.execute(
        select(UserProfile)
        .options(selectinload(UserProfile.work_experiences))
        .where(UserProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()

async def get_or_create_user_profile(user: User, db: AsyncSession) -> UserProfile:
    profile = await get_user_profile_with_experiences(user.id, db)
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile

async def update_profile_completion(profile_id: int, db: AsyncSession):
    result = await db.execute(
        select(UserProfile)
        .options(selectinload(UserProfile.work_experiences))
        .where(UserProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        work_experiences = profile.work_experiences or []
        completion_data = calculate_profile_completion(profile, work_experiences)
        profile.completion_percentage = completion_data['completion_percentage']
        profile.is_complete = completion_data['is_complete']
        await db.commit()

# --- Constants ---

@router.get("/constants")
async def get_profile_constants():
    return {
        "gpa_scales": GPA_SCALES,
        "target_degrees": TARGET_DEGREES,
        "target_fields": TARGET_FIELDS,
        "preferred_countries": PREFERRED_COUNTRIES,
        "budget_ranges": BUDGET_RANGES,
        "application_timelines": APPLICATION_TIMELINES,
        "test_score_ranges": TEST_SCORE_RANGES,
    }

# --- Profile Endpoints ---

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    profile = await get_or_create_user_profile(current_user, db)
    return UserProfileResponse.from_orm(profile)

@router.post("/setup", response_model=UserProfileResponse)
async def create_or_update_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    profile = await get_user_profile_with_experiences(current_user.id, db)
    if profile:
        for field, value in profile_data.dict(exclude_unset=True).items():
            setattr(profile, field, value)
    else:
        profile = UserProfile(user_id=current_user.id, **profile_data.dict(exclude_unset=True))
        db.add(profile)

    await db.flush()
    work_experiences = profile.work_experiences or []
    completion_data = calculate_profile_completion(profile, work_experiences)
    profile.completion_percentage = completion_data['completion_percentage']
    profile.is_complete = completion_data['is_complete']

    await db.commit()
    await db.refresh(profile)
    return UserProfileResponse.from_orm(profile)

@router.get("/completion", response_model=ProfileCompletionStatus)
async def get_profile_completion_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    profile = await get_user_profile_with_experiences(current_user.id, db)
    if not profile:
        return ProfileCompletionStatus(
            completion_percentage=0,
            is_complete=False,
            missing_fields=[
                'Undergraduate College', 'Major', 'GPA', 'GPA Scale', 'Graduation Year',
                'At least one test score (GRE/TOEFL/IELTS)',
                'At least one work experience',
                'Target Degree', 'Preferred Countries', 'Target Field', 'Budget Range', 'Application Timeline'
            ],
            completed_sections=[]
        )
    completion_data = calculate_profile_completion(profile, profile.work_experiences or [])
    return ProfileCompletionStatus(**completion_data)

@router.get("/agent-requirements/{agent_type}")
async def check_agent_requirements(
    agent_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    valid_agents = ['university_matcher', 'document_helper', 'exam_planner', 'finance_planner', 'visa_assistant']
    if agent_type not in valid_agents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid agent type. Must be one of: {', '.join(valid_agents)}")
    
    profile = await get_user_profile_with_experiences(current_user.id, db)
    if not profile:
        return {
            'requirements_met': False,
            'missing_requirements': ['Profile not created'],
            'agent_type': agent_type
        }

    requirements_check = check_agent_profile_requirements(profile, profile.work_experiences or [], agent_type)
    return {**requirements_check, 'agent_type': agent_type}

# --- Work Experience Endpoints ---

@router.post("/work-experience", response_model=WorkExperienceResponse)
async def create_work_experience(
    work_experience_data: WorkExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    profile = await get_or_create_user_profile(current_user, db)
    work_experience = WorkExperience(
        user_id=current_user.id,
        profile_id=profile.id,
        **work_experience_data.dict()
    )
    db.add(work_experience)
    await db.commit()
    await db.refresh(work_experience)
    await update_profile_completion(profile.id, db)
    return WorkExperienceResponse.from_orm(work_experience)

@router.get("/work-experience", response_model=List[WorkExperienceResponse])
async def get_work_experiences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    result = await db.execute(
        select(WorkExperience)
        .where(WorkExperience.user_id == current_user.id)
        .order_by(WorkExperience.start_date.desc())
    )
    return [WorkExperienceResponse.from_orm(exp) for exp in result.scalars().all()]

@router.put("/work-experience/{experience_id}", response_model=WorkExperienceResponse)
async def update_work_experience(
    experience_id: int,
    work_experience_data: WorkExperienceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    result = await db.execute(
        select(WorkExperience)
        .where(WorkExperience.id == experience_id)
        .where(WorkExperience.user_id == current_user.id)
    )
    work_experience = result.scalar_one_or_none()
    if not work_experience:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work experience not found")

    for field, value in work_experience_data.dict(exclude_unset=True).items():
        setattr(work_experience, field, value)
    await db.commit()
    await db.refresh(work_experience)
    await update_profile_completion(work_experience.profile_id, db)
    return WorkExperienceResponse.from_orm(work_experience)

@router.delete("/work-experience/{experience_id}")
async def delete_work_experience(
    experience_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    result = await db.execute(
        select(WorkExperience)
        .where(WorkExperience.id == experience_id)
        .where(WorkExperience.user_id == current_user.id)
    )
    work_experience = result.scalar_one_or_none()
    if not work_experience:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work experience not found")

    profile_id = work_experience.profile_id
    await db.delete(work_experience)
    await db.commit()
    await update_profile_completion(profile_id, db)
    return {"message": "Work experience deleted successfully"}
