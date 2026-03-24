from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import Base

# SQLAlchemy Models

class Program(Base):
    __tablename__ = "programs"
    
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(String(255), unique=True, index=True, nullable=False)
    uni_name = Column(String(255), nullable=False)
    uni_name_clean = Column(String(255), nullable=True)
    type_of_degree = Column(String(255), nullable=True)
    degree_norm = Column(String(50), nullable=True)
    course_name = Column(String(255), nullable=True)
    course_norm = Column(String(255), nullable=True)
    global_rank_uni = Column(Float, nullable=True)
    tuition_fee_usd = Column(Float, nullable=True)
    living_expense = Column(Float, nullable=True)
    scholarship_amount = Column(Text, nullable=True)
    uni_financial_information = Column(Text, nullable=True)
    uni_website_url = Column(Text, nullable=True)
    course_specific_website_info = Column(Text, nullable=True)
    application_form = Column(Text, nullable=True)
    admissions_form = Column(Text, nullable=True)
    intake_semester = Column(String(50), nullable=True)
    intake_year = Column(String(50), nullable=True)
    
    # Relationships
    stats = relationship("ProgramStats", back_populates="program", uselist=False, cascade="all, delete-orphan")


class ProgramStats(Base):
    __tablename__ = "program_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(String(255), ForeignKey("programs.program_id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    n_total = Column(Integer, default=0)
    n_admit = Column(Integer, default=0)
    n_reject = Column(Integer, default=0)
    admit_rate_smoothed = Column(Float, default=0.0)
    
    # Relationships
    program = relationship("Program", back_populates="stats")


class MatchRun(Base):
    __tablename__ = "match_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Store snapshot of features
    undergrad_gpa_mod = Column(Float, nullable=True)
    work_exp_months = Column(Float, nullable=True)
    has_prestigious_experience = Column(Integer, default=0)
    gre_total = Column(Float, nullable=True)
    quant = Column(Float, nullable=True)
    verbal = Column(Float, nullable=True)
    awa = Column(Float, nullable=True)
    total_ielts_score = Column(Float, nullable=True)
    total_toefl_score = Column(Float, nullable=True)
    target_degree = Column(String(50), nullable=True)
    target_course_keywords = Column(String(255), nullable=True)
    max_total_cost = Column(Float, nullable=True)
    
    # Relationships
    results = relationship("MatchResult", back_populates="run", cascade="all, delete-orphan")


class MatchResult(Base):
    __tablename__ = "match_results"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("match_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    program_id = Column(String(255), ForeignKey("programs.program_id", ondelete="CASCADE"), nullable=False)
    
    probability_score = Column(Float, nullable=False)
    match_category = Column(String(50), nullable=False)  # 'Reach', 'Target', 'Safe'
    rank_position = Column(Integer, nullable=False)
    
    # Relationships
    run = relationship("MatchRun", back_populates="results")
    program = relationship("Program")


# Pydantic Schemas

class ProgramStatsBase(BaseModel):
    n_total: int
    admit_rate_smoothed: float
    
    class Config:
        from_attributes = True

class ProgramBase(BaseModel):
    program_id: str
    uni_name: str
    course_name: Optional[str] = None
    degree_norm: Optional[str] = None
    global_rank_uni: Optional[float] = None
    tuition_fee_usd: Optional[float] = None
    living_expense: Optional[float] = None
    uni_website_url: Optional[str] = None
    
    stats: Optional[ProgramStatsBase] = None

    class Config:
        from_attributes = True


class MatchRequest(BaseModel):
    # Academic profile (used for feature engineering in the service)
    undergrad_gpa_mod: Optional[float] = None     # 4.0-scale GPA (pre-converted)
    undergrad_college: Optional[str] = None        # Used for prestige modifier lookup
    work_exp_months: Optional[float] = None
    has_prestigious_experience: bool = False
    gre_total: Optional[float] = None              # None = not taken (NaN in model)
    quant: Optional[float] = None
    verbal: Optional[float] = None
    awa: Optional[float] = None
    total_ielts_score: Optional[float] = None      # None = not taken
    total_toefl_score: Optional[float] = None      # None = not taken

    # Filtering preferences
    target_degree: str = "MS"
    target_course_keywords: Optional[str] = None
    max_total_cost: Optional[float] = None
    top_k: int = 20


class ProfileFeaturesResponse(BaseModel):
    """Pre-computed feature values derived server-side from the user's profile.
    Returned by GET /matching/profile-features and merged into MatchRequest before submission.
    """
    undergrad_gpa_mod: Optional[float] = None
    undergrad_college: Optional[str] = None
    work_exp_months: Optional[float] = None
    has_prestigious_experience: bool = False
    gre_total: Optional[float] = None
    quant: Optional[float] = None
    verbal: Optional[float] = None
    awa: Optional[float] = None
    total_ielts_score: Optional[float] = None
    total_toefl_score: Optional[float] = None
    # Suggested filter defaults from profile
    suggested_degree: Optional[str] = None
    suggested_course_keywords: Optional[str] = None


class MatchResultResponse(BaseModel):
    program: ProgramBase
    probability_score: float
    match_category: str
    rank_position: int
    # Agent 1 enrichment (populated after validator node)
    verdict: Optional[str] = None          # 'Qualified' | 'Borderline' | 'Unlikely'
    verdict_reason: Optional[str] = None

    class Config:
        from_attributes = True


class ShortlistItem(BaseModel):
    """One strategic recommendation from the Shortlist Advisor agent."""
    program_id: str
    uni_name: str
    category: str                          # Reach / Target / Safe
    justification: str

class MatchRunResponse(BaseModel):
    id: int
    created_at: datetime
    results: List[MatchResultResponse]

    # Agent-enriched fields (None when agents are disabled or errored)
    shortlist: Optional[List[ShortlistItem]] = None
    profile_gaps: Optional[List[str]] = None
    fallback_triggered: bool = False
    fallback_suggestions: Optional[List[str]] = None

    class Config:
        from_attributes = True
