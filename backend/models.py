from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone, date
import uuid

# ============= USER & AUTH MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordReset(BaseModel):
    username: str
    new_password: str
    secret_code: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ============= ACCESS CODE MODELS (NEW) =============

class AccessCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # The actual access code
    is_active: bool = True
    created_by: str  # Admin username
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    usage_count: int = 0

class AccessCodeCreate(BaseModel):
    code: str
    expires_at: Optional[datetime] = None

class AccessCodeVerify(BaseModel):
    code: str

# ============= PROPERTY MODELS (NEW) =============

class Property(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Varanasi, Darjeeling, etc.
    location: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyCreate(BaseModel):
    name: str
    location: str

# ============= ENHANCED CANDIDATE MODELS =============

class CandidatePublic(BaseModel):
    """Public-facing candidate submission (no login required)"""
    name: str
    email: str
    phone: str
    city: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, other
    role_applied: Optional[str] = None  # content_creator, community_manager, kitchen
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_creator: bool = False
    instagram: Optional[str] = None  # Mandatory if is_creator=True
    portfolio_link: Optional[str] = None  # For proof of work
    skills: Optional[str] = None  # Comma-separated or text
    why_volunteer: Optional[str] = None
    access_code: str  # Required for submission

class Candidate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Basic Info
    name: str
    email: str
    phone: str
    city: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, other
    
    # Dates
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    
    # Creator Status
    is_creator: bool = False
    instagram: Optional[str] = None
    instagram_followers: Optional[int] = None
    instagram_engagement: Optional[str] = None  # bad, average, good, great
    portfolio_link: Optional[str] = None
    
    # Skills & Role
    skills: List[str] = []  # ['Yoga', 'Video', 'Kitchen']
    role_applied: Optional[str] = None  # content_creator, community_manager, kitchen
    
    # Content
    why_volunteer: Optional[str] = None
    
    # Files
    resume_path: Optional[str] = None
    application_screenshot_path: Optional[str] = None
    
    # Property Assignment
    property_assigned: Optional[str] = None  # Varanasi, Darjeeling, etc.
    
    # Admin Management
    manual_tags: List[str] = []  # ['Backup Option', 'Varanasi-Urgent', 'Friend of Founder']
    admin_notes: str = ""  # Long text for re-evaluation
    
    # AI Scores
    ai_score: Optional[int] = None  # 0-100
    ai_reasoning: Optional[str] = None  # AI summary
    
    # Status
    status: str = "new"  # new, shortlisted, rejected, investigate, emailed
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "public_form"  # public_form, smart_parse, manual_entry

class CandidateUpdate(BaseModel):
    """For updating candidate info"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    role_applied: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    instagram: Optional[str] = None
    instagram_followers: Optional[int] = None
    instagram_engagement: Optional[str] = None  # bad, average, good, great
    portfolio_link: Optional[str] = None
    property_assigned: Optional[str] = None
    manual_tags: Optional[List[str]] = None
    admin_notes: Optional[str] = None
    status: Optional[str] = None

class SmartParseRequest(BaseModel):
    """For WhatsApp/DM text dump"""
    raw_text: str
    property_name: Optional[str] = None  # Assign to property

# ============= EVALUATION MODELS =============

class Evaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    candidate_name: str
    role_applied: Optional[str] = None
    
    # Scores
    vibe_score: int  # 0-100
    skill_score: int  # 0-100
    stability_score: int  # 0-100
    total_score: int  # 0-100
    
    # ROI Analysis (NEW - optional for backward compatibility)
    marginal_utility: str = "Medium"  # High/Medium/Low
    roi_logic: str = ""  # Explanation
    is_high_impact: bool = False
    is_collab: bool = False  # Barter/Collaboration flag
    
    # Analysis
    psychological_profile: str
    social_resume_check: str
    decision: str  # REJECT, INVESTIGATE, SHORTLIST
    
    # Email
    email_subject: str
    email_body: str
    
    # Metadata
    weights_used: Dict[str, int]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    iteration: int = 1  # Re-evaluation counter

class EvaluationResponse(BaseModel):
    evaluation: Evaluation
    candidate: Candidate

class ReEvaluationRequest(BaseModel):
    """Trigger re-evaluation with new context"""
    candidate_id: str
    additional_context: Optional[str] = None  # New info learned

# ============= SETTINGS MODELS =============

class WeightSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vibe_psychology: int = 40
    skill_competency: int = 30
    stability_duration: int = 30
    is_custom: bool = False  # True when user explicitly changes weights
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeightSettingsUpdate(BaseModel):
    vibe_psychology: int
    skill_competency: int
    stability_duration: int

# ============= FILTER & SEARCH MODELS =============

class CandidateFilter(BaseModel):
    """Advanced filtering"""
    search_query: Optional[str] = None  # Fuzzy search
    skill: Optional[str] = None  # Filter by skill
    property: Optional[str] = None  # Filter by property
    status: Optional[str] = None  # Filter by status
    high_utility_only: bool = False  # Score > 80
    is_creator: Optional[bool] = None
    tags: Optional[List[str]] = None  # Filter by tags
    start_date_from: Optional[date] = None
    start_date_to: Optional[date] = None