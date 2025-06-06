from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, Date, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date, datetime
from app.database import Base

# SQLAlchemy Models
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Academic Background
    undergraduate_college = Column(String(255), nullable=True)
    major = Column(String(255), nullable=True)
    gpa = Column(Float, nullable=True)
    gpa_scale = Column(String(10), nullable=True)  # "4.0" or "10.0"
    graduation_year = Column(Integer, nullable=True)
    
    # Test Scores
    gre_score = Column(Integer, nullable=True)
    gre_date = Column(Date, nullable=True)
    toefl_score = Column(Integer, nullable=True)
    toefl_date = Column(Date, nullable=True)
    ielts_score = Column(Float, nullable=True)
    ielts_date = Column(Date, nullable=True)
    
    # Goals & Preferences
    target_degree = Column(String(100), nullable=True)  # "MS", "PhD", etc.
    preferred_countries = Column(JSON, nullable=True)  # ["USA", "Canada"]
    target_field = Column(String(255), nullable=True)  # "Computer Science"
    budget_range = Column(String(100), nullable=True)  # "Under $50k", "$50k-$100k"
    application_timeline = Column(String(100), nullable=True)  # "Fall 2024"
    
    # Profile Metadata
    completion_percentage = Column(Integer, default=0)
    is_complete = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="profile")
    work_experiences = relationship("WorkExperience", back_populates="user_profile", cascade="all, delete-orphan")

class WorkExperience(Base):
    __tablename__ = "work_experiences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    
    company_name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # Null for current positions
    is_current = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user_profile = relationship("UserProfile", back_populates="work_experiences")

# Pydantic Models for API
class WorkExperienceBase(BaseModel):
    company_name: str
    role: str
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None

class WorkExperienceCreate(WorkExperienceBase):
    pass

class WorkExperienceUpdate(WorkExperienceBase):
    company_name: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[date] = None

class WorkExperienceResponse(WorkExperienceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserProfileBase(BaseModel):
    # Academic Background
    undergraduate_college: Optional[str] = None
    major: Optional[str] = None
    gpa: Optional[float] = None
    gpa_scale: Optional[str] = None
    graduation_year: Optional[int] = None
    
    # Test Scores
    gre_score: Optional[int] = None
    gre_date: Optional[date] = None
    toefl_score: Optional[int] = None
    toefl_date: Optional[date] = None
    ielts_score: Optional[float] = None
    ielts_date: Optional[date] = None
    
    # Goals & Preferences
    target_degree: Optional[str] = None
    preferred_countries: Optional[List[str]] = None
    target_field: Optional[str] = None
    budget_range: Optional[str] = None
    application_timeline: Optional[str] = None

    @validator('gpa')
    def validate_gpa(cls, v, values):
        if v is not None:
            gpa_scale = values.get('gpa_scale')
            if gpa_scale == '4.0' and (v < 0 or v > 4.0):
                raise ValueError('GPA must be between 0 and 4.0 for 4.0 scale')
            elif gpa_scale == '10.0' and (v < 0 or v > 10.0):
                raise ValueError('GPA must be between 0 and 10.0 for 10.0 scale')
        return v

    @validator('gre_score')
    def validate_gre_score(cls, v):
        if v is not None and (v < 260 or v > 340):
            raise ValueError('GRE score must be between 260 and 340')
        return v

    @validator('toefl_score')
    def validate_toefl_score(cls, v):
        if v is not None and (v < 0 or v > 120):
            raise ValueError('TOEFL score must be between 0 and 120')
        return v

    @validator('ielts_score')
    def validate_ielts_score(cls, v):
        if v is not None and (v < 0 or v > 9.0):
            raise ValueError('IELTS score must be between 0 and 9.0')
        return v

    @validator('graduation_year')
    def validate_graduation_year(cls, v):
        if v is not None:
            current_year = datetime.now().year
            if v < 1950 or v > current_year + 10:
                raise ValueError(f'Graduation year must be between 1950 and {current_year + 10}')
        return v

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    completion_percentage: int
    is_complete: bool
    created_at: datetime
    updated_at: datetime
    work_experiences: List[WorkExperienceResponse] = []
    
    class Config:
        from_attributes = True

class ProfileCompletionStatus(BaseModel):
    completion_percentage: int
    is_complete: bool
    missing_fields: List[str]
    completed_sections: List[str]