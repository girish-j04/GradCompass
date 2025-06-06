from typing import List, Dict, Any
from app.models.profile import UserProfile, WorkExperience

def calculate_profile_completion(profile: UserProfile, work_experiences: List[WorkExperience]) -> Dict[str, Any]:
    """
    Calculate profile completion percentage and identify missing fields
    """
    total_sections = 4
    completed_sections = []
    missing_fields = []
    
    # Section 1: Academic Background (25%)
    academic_fields = ['undergraduate_college', 'major', 'gpa', 'gpa_scale', 'graduation_year']
    academic_complete = all(getattr(profile, field) is not None for field in academic_fields)
    
    if academic_complete:
        completed_sections.append('Academic Background')
    else:
        missing_academic = [field.replace('_', ' ').title() for field in academic_fields 
                          if getattr(profile, field) is None]
        missing_fields.extend(missing_academic)
    
    # Section 2: Test Scores (25%) - At least one test score required
    has_gre = profile.gre_score is not None
    has_toefl = profile.toefl_score is not None
    has_ielts = profile.ielts_score is not None
    test_scores_complete = has_gre or has_toefl or has_ielts
    
    if test_scores_complete:
        completed_sections.append('Test Scores')
    else:
        missing_fields.append('At least one test score (GRE/TOEFL/IELTS)')
    
    # Section 3: Work Experience (25%) - At least one experience required
    work_experience_complete = len(work_experiences) > 0
    
    if work_experience_complete:
        completed_sections.append('Work Experience')
    else:
        missing_fields.append('At least one work experience')
    
    # Section 4: Goals & Preferences (25%)
    goals_fields = ['target_degree', 'preferred_countries', 'target_field', 'budget_range', 'application_timeline']
    goals_complete = all(getattr(profile, field) is not None for field in goals_fields)
    
    if goals_complete:
        completed_sections.append('Goals & Preferences')
    else:
        missing_goals = [field.replace('_', ' ').title() for field in goals_fields 
                        if getattr(profile, field) is None]
        missing_fields.extend(missing_goals)
    
    # Calculate completion percentage
    completion_percentage = (len(completed_sections) / total_sections) * 100
    is_complete = completion_percentage == 100
    
    return {
        'completion_percentage': int(completion_percentage),
        'is_complete': is_complete,
        'completed_sections': completed_sections,
        'missing_fields': missing_fields
    }

def get_profile_requirements_for_agent(agent_type: str) -> List[str]:
    """
    Get required profile fields for specific AI agents
    """
    requirements = {
        'university_matcher': ['gpa', 'target_field', 'preferred_countries', 'target_degree'],
        'document_helper': ['work_experiences', 'target_field', 'target_degree'],
        'exam_planner': ['gre_score', 'toefl_score', 'ielts_score'],  # At least one
        'finance_planner': ['budget_range', 'preferred_countries'],
        'visa_assistant': ['preferred_countries', 'target_degree']
    }
    
    return requirements.get(agent_type, [])

def check_agent_profile_requirements(profile: UserProfile, work_experiences: List[WorkExperience], agent_type: str) -> Dict[str, Any]:
    """
    Check if profile meets requirements for a specific agent
    """
    required_fields = get_profile_requirements_for_agent(agent_type)
    missing_requirements = []
    
    for field in required_fields:
        if field == 'work_experiences':
            if len(work_experiences) == 0:
                missing_requirements.append('At least one work experience')
        elif field in ['gre_score', 'toefl_score', 'ielts_score']:
            # For exam planner, check if at least one test score exists
            if agent_type == 'exam_planner':
                if not (profile.gre_score or profile.toefl_score or profile.ielts_score):
                    missing_requirements.append('At least one test score')
                break  # Only check once for exam planner
        else:
            if getattr(profile, field) is None:
                missing_requirements.append(field.replace('_', ' ').title())
    
    return {
        'requirements_met': len(missing_requirements) == 0,
        'missing_requirements': missing_requirements
    }