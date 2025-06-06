# Profile form constants for frontend dropdowns

# Academic constants
GPA_SCALES = [
    {"value": "4.0", "label": "4.0 Scale"},
    {"value": "10.0", "label": "10.0 Scale"},
]

TARGET_DEGREES = [
    {"value": "MS", "label": "Master of Science (MS)"},
    {"value": "MEng", "label": "Master of Engineering (MEng)"},
    {"value": "MBA", "label": "Master of Business Administration (MBA)"},
    {"value": "MA", "label": "Master of Arts (MA)"},
    {"value": "PhD", "label": "Doctor of Philosophy (PhD)"},
    {"value": "Other", "label": "Other"},
]

# Popular target fields
TARGET_FIELDS = [
    {"value": "Computer Science", "label": "Computer Science"},
    {"value": "Data Science", "label": "Data Science"},
    {"value": "Software Engineering", "label": "Software Engineering"},
    {"value": "Artificial Intelligence", "label": "Artificial Intelligence"},
    {"value": "Mechanical Engineering", "label": "Mechanical Engineering"},
    {"value": "Electrical Engineering", "label": "Electrical Engineering"},
    {"value": "Civil Engineering", "label": "Civil Engineering"},
    {"value": "Chemical Engineering", "label": "Chemical Engineering"},
    {"value": "Business Administration", "label": "Business Administration"},
    {"value": "Finance", "label": "Finance"},
    {"value": "Marketing", "label": "Marketing"},
    {"value": "Economics", "label": "Economics"},
    {"value": "Psychology", "label": "Psychology"},
    {"value": "Biology", "label": "Biology"},
    {"value": "Chemistry", "label": "Chemistry"},
    {"value": "Physics", "label": "Physics"},
    {"value": "Mathematics", "label": "Mathematics"},
    {"value": "Statistics", "label": "Statistics"},
    {"value": "Other", "label": "Other"},
]

# Countries
PREFERRED_COUNTRIES = [
    {"value": "USA", "label": "United States"},
    {"value": "Canada", "label": "Canada"},
    {"value": "UK", "label": "United Kingdom"},
    {"value": "Germany", "label": "Germany"},
    {"value": "Australia", "label": "Australia"},
    {"value": "Netherlands", "label": "Netherlands"},
    {"value": "Sweden", "label": "Sweden"},
    {"value": "France", "label": "France"},
    {"value": "Switzerland", "label": "Switzerland"},
    {"value": "Norway", "label": "Norway"},
    {"value": "Denmark", "label": "Denmark"},
    {"value": "Finland", "label": "Finland"},
    {"value": "Ireland", "label": "Ireland"},
    {"value": "New Zealand", "label": "New Zealand"},
    {"value": "Singapore", "label": "Singapore"},
    {"value": "South Korea", "label": "South Korea"},
    {"value": "Japan", "label": "Japan"},
]

# Budget ranges
BUDGET_RANGES = [
    {"value": "Under $25k", "label": "Under $25,000"},
    {"value": "$25k-$50k", "label": "$25,000 - $50,000"},
    {"value": "$50k-$75k", "label": "$50,000 - $75,000"},
    {"value": "$75k-$100k", "label": "$75,000 - $100,000"},
    {"value": "$100k-$150k", "label": "$100,000 - $150,000"},
    {"value": "Above $150k", "label": "Above $150,000"},
    {"value": "Scholarship Required", "label": "Need Full Scholarship"},
]

# Application timelines
APPLICATION_TIMELINES = [
    {"value": "Fall 2025", "label": "Fall 2025"},
    {"value": "Spring 2026", "label": "Spring 2026"},
    {"value": "Fall 2026", "label": "Fall 2026"},
    {"value": "Spring 2027", "label": "Spring 2027"},
    {"value": "Fall 2027", "label": "Fall 2027"},
    {"value": "Flexible", "label": "Flexible Timeline"},
]

# Test score ranges for validation hints
TEST_SCORE_RANGES = {
    "gre": {"min": 260, "max": 340, "good": 320},
    "toefl": {"min": 0, "max": 120, "good": 100},
    "ielts": {"min": 0, "max": 9, "good": 7.5},
}