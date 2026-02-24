"""
Hidden Monkey Stays - AI Volunteer Screening CRM
Backend API Server

Features:
- Public application portal with access codes
- AI-powered candidate scoring (4 vectors: Stability, Skills, Psychometrics, Logistics)
- Smart Parse: Extract candidate data from unstructured text
- Email template generation (A/B/C based on score)
- JWT authentication for admin access

Author: Hidden Monkey Team
"""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import timedelta, datetime, date, timezone
import shutil
import secrets

from models import (
    User, UserCreate, UserLogin, Token, PasswordReset,
    AccessCode, AccessCodeCreate, AccessCodeVerify,
    CandidatePublic, Candidate, CandidateUpdate, SmartParseRequest,
    Evaluation, EvaluationResponse, ReEvaluationRequest,
    WeightSettings, WeightSettingsUpdate
)
from auth import verify_password, get_password_hash, create_access_token, verify_token
from ai_service import AIAnalysisService
from smart_parse_service import SmartParseService
from scoring_engine import ScoringEngine, generate_email_template

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']

# Determine if connecting to MongoDB Atlas (requires SSL) or local MongoDB
is_atlas = 'mongodb+srv' in mongo_url or 'mongodb.net' in mongo_url

if is_atlas:
    # Remove any existing TLS options from URL to avoid conflicts
    import re
    clean_url = re.sub(r'[&?](tls|ssl)[^&]*', '', mongo_url)
    # Fix for SSL handshake issues with MongoDB Atlas on Render/Python 3.13
    client = AsyncIOMotorClient(
        clean_url,
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=60000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
        retryWrites=True,
        w='majority'
    )
else:
    # Local MongoDB (no SSL required)
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ['DB_NAME']]

FILE_STORAGE_TYPE = os.environ.get('FILE_STORAGE_TYPE', 'local')
LOCAL_STORAGE_PATH = Path(os.environ.get('LOCAL_STORAGE_PATH', Path(__file__).parent / 'uploads'))
LOCAL_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")
public_router = APIRouter(prefix="/api/public")

ai_service = AIAnalysisService()
smart_parse_service = SmartParseService()
scoring_engine = ScoringEngine()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Secret reset code for password recovery
ADMIN_RESET_CODE = os.environ.get('ADMIN_RESET_CODE', 'monkey-reset-2026')

# ============= PUBLIC ROUTES (NO AUTH) =============

@public_router.post("/verify-code")
async def verify_access_code(code_data: AccessCodeVerify):
    """Verify access code before showing form"""
    access_code = await db.access_codes.find_one({"code": code_data.code, "is_active": True}, {"_id": 0})
    
    if not access_code:
        raise HTTPException(status_code=401, detail="Invalid or expired access code")
    
    # Check expiry
    if access_code.get('expires_at'):
        expires_at = datetime.fromisoformat(access_code['expires_at']) if isinstance(access_code['expires_at'], str) else access_code['expires_at']
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Access code has expired")
    
    # Increment usage
    await db.access_codes.update_one(
        {"code": code_data.code},
        {"$inc": {"usage_count": 1}}
    )
    
    return {"valid": True, "message": "Access code verified"}

@public_router.post("/apply")
async def public_apply(candidate_data: CandidatePublic):
    """Public application submission (no login required)"""
    
    # Verify access code
    access_code = await db.access_codes.find_one({"code": candidate_data.access_code, "is_active": True})
    if not access_code:
        raise HTTPException(status_code=401, detail="Invalid access code")
    
    # Validate creator logic
    if candidate_data.is_creator and not candidate_data.instagram:
        raise HTTPException(status_code=400, detail="Instagram link is required for creators")
    
    # Calculate duration
    duration_days = None
    if candidate_data.start_date and candidate_data.end_date:
        duration_days = (candidate_data.end_date - candidate_data.start_date).days
    
    # Parse skills
    skills = []
    if candidate_data.skills:
        skills = [s.strip() for s in candidate_data.skills.split(',')]
    
    # Create candidate with new fields
    candidate = Candidate(
        name=candidate_data.name,
        email=candidate_data.email,
        phone=candidate_data.phone,
        city=candidate_data.city,
        age=candidate_data.age,
        gender=candidate_data.gender,
        role_applied=candidate_data.role_applied,
        start_date=candidate_data.start_date,
        end_date=candidate_data.end_date,
        duration_days=duration_days,
        is_creator=candidate_data.is_creator,
        instagram=candidate_data.instagram,
        portfolio_link=candidate_data.portfolio_link,
        skills=skills,
        why_volunteer=candidate_data.why_volunteer,
        status="new",
        source="public_form"
    )
    
    candidate_dict = candidate.model_dump()
    candidate_dict['created_at'] = candidate_dict['created_at'].isoformat()
    candidate_dict['updated_at'] = candidate_dict['updated_at'].isoformat()
    if candidate_dict.get('start_date'):
        candidate_dict['start_date'] = candidate_dict['start_date'].isoformat()
    if candidate_dict.get('end_date'):
        candidate_dict['end_date'] = candidate_dict['end_date'].isoformat()
    
    await db.candidates.insert_one(candidate_dict)
    logger.info(f"Public application received: {candidate.name}")
    
    return {"success": True, "message": "Application submitted successfully", "candidate_id": candidate.id}

# ============= AUTHENTICATION =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = get_password_hash(user_data.password)
    user = User(username=user_data.username, email=user_data.email, hashed_password=hashed_password)
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user['username']})
    return Token(access_token=access_token, token_type="bearer")

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset):
    """Reset password using secret admin code"""
    if reset_data.secret_code != ADMIN_RESET_CODE:
        raise HTTPException(status_code=401, detail="Invalid secret code")
    
    user = await db.users.find_one({"username": reset_data.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = get_password_hash(reset_data.new_password)
    await db.users.update_one({"username": reset_data.username}, {"$set": {"hashed_password": new_hash}})
    
    return {"success": True, "message": "Password reset successfully"}

@api_router.get("/auth/me")
async def get_current_user(username: str = Depends(verify_token)):
    user = await db.users.find_one({"username": username}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============= ACCESS CODE MANAGEMENT =============

@api_router.post("/access-codes")
async def create_access_code(code_data: AccessCodeCreate, username: str = Depends(verify_token)):
    """Create new access code"""
    access_code = AccessCode(
        code=code_data.code,
        created_by=username,
        expires_at=code_data.expires_at
    )
    
    code_dict = access_code.model_dump()
    code_dict['created_at'] = code_dict['created_at'].isoformat()
    if code_dict.get('expires_at'):
        code_dict['expires_at'] = code_dict['expires_at'].isoformat()
    
    await db.access_codes.insert_one(code_dict)
    return access_code

@api_router.get("/access-codes")
async def get_access_codes(username: str = Depends(verify_token)):
    """Get all access codes"""
    codes = await db.access_codes.find({}, {"_id": 0}).to_list(100)
    for code in codes:
        if isinstance(code.get('created_at'), str):
            code['created_at'] = datetime.fromisoformat(code['created_at'])
        if code.get('expires_at') and isinstance(code['expires_at'], str):
            code['expires_at'] = datetime.fromisoformat(code['expires_at'])
    return codes

@api_router.delete("/access-codes/{code_id}")
async def deactivate_access_code(code_id: str, username: str = Depends(verify_token)):
    """Deactivate access code"""
    result = await db.access_codes.update_one({"id": code_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Access code not found")
    return {"success": True}

@api_router.post("/access-codes/generate")
async def generate_access_code(username: str = Depends(verify_token)):
    """Generate random access code"""
    code = secrets.token_urlsafe(8)
    access_code = AccessCode(code=code, created_by=username)
    
    code_dict = access_code.model_dump()
    code_dict['created_at'] = code_dict['created_at'].isoformat()
    
    await db.access_codes.insert_one(code_dict)
    return access_code

# ============= SMART PARSE =============

@api_router.post("/smart-parse")
async def smart_parse(parse_data: SmartParseRequest, username: str = Depends(verify_token)):
    """AI extract candidate data from WhatsApp/DM text"""
    logger.info(f"Smart parse requested by {username}")
    
    extracted = await smart_parse_service.parse_unstructured_text(parse_data.raw_text)
    
    # Return extracted data for preview (not created yet)
    return {
        "extracted_data": extracted,
        "property_name": parse_data.property_name,
        "confidence": extracted.get('confidence', 0)
    }

@api_router.post("/smart-parse/confirm")
async def confirm_smart_parse(candidate_data: dict, username: str = Depends(verify_token)):
    """Create candidate from smart parse preview"""
    
    # Calculate duration
    duration_days = candidate_data.get('duration_days')
    if not duration_days and candidate_data.get('start_date') and candidate_data.get('end_date'):
        start = date.fromisoformat(candidate_data['start_date'])
        end = date.fromisoformat(candidate_data['end_date'])
        duration_days = (end - start).days
    
    candidate = Candidate(
        name=candidate_data.get('name', 'Unknown'),
        email=candidate_data.get('email', ''),
        phone=candidate_data.get('phone') or '',  # Handle None
        city=candidate_data.get('city') or None,
        start_date=date.fromisoformat(candidate_data['start_date']) if candidate_data.get('start_date') else None,
        end_date=date.fromisoformat(candidate_data['end_date']) if candidate_data.get('end_date') else None,
        duration_days=duration_days,
        is_creator=candidate_data.get('is_creator', False),
        instagram=candidate_data.get('instagram') or None,
        skills=candidate_data.get('skills', []),
        why_volunteer=candidate_data.get('why_volunteer'),
        property_assigned=candidate_data.get('property_name'),
        status="new",
        source="smart_parse",
        admin_notes=f"Smart parsed by {username}. Original text: {candidate_data.get('extracted_text', '')[:200]}"
    )
    
    candidate_dict = candidate.model_dump()
    candidate_dict['created_at'] = candidate_dict['created_at'].isoformat()
    candidate_dict['updated_at'] = candidate_dict['updated_at'].isoformat()
    if candidate_dict.get('start_date'):
        candidate_dict['start_date'] = candidate_dict['start_date'].isoformat()
    if candidate_dict.get('end_date'):
        candidate_dict['end_date'] = candidate_dict['end_date'].isoformat()
    
    await db.candidates.insert_one(candidate_dict)
    logger.info(f"Smart parse candidate created: {candidate.name}")
    
    return candidate

# ============= CANDIDATE MANAGEMENT =============

@api_router.get("/candidates")
async def get_candidates(username: str = Depends(verify_token)):
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    for c in candidates:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        if c.get('start_date') and isinstance(c['start_date'], str):
            c['start_date'] = date.fromisoformat(c['start_date'])
        if c.get('end_date') and isinstance(c['end_date'], str):
            c['end_date'] = date.fromisoformat(c['end_date'])
    return candidates

@api_router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, username: str = Depends(verify_token)):
    """Delete a candidate and their evaluations"""
    result = await db.candidates.delete_one({"id": candidate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    # Also delete related evaluations
    await db.evaluations.delete_many({"candidate_id": candidate_id})
    return {"success": True, "message": "Candidate deleted"}

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, username: str = Depends(verify_token)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if isinstance(candidate.get('created_at'), str):
        candidate['created_at'] = datetime.fromisoformat(candidate['created_at'])
    if isinstance(candidate.get('updated_at'), str):
        candidate['updated_at'] = datetime.fromisoformat(candidate['updated_at'])
    if candidate.get('start_date') and isinstance(candidate['start_date'], str):
        candidate['start_date'] = date.fromisoformat(candidate['start_date'])
    if candidate.get('end_date') and isinstance(candidate['end_date'], str):
        candidate['end_date'] = date.fromisoformat(candidate['end_date'])
    
    return candidate

@api_router.put("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, update_data: CandidateUpdate, username: str = Depends(verify_token)):
    """Update candidate details"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_dict.get('start_date'):
        update_dict['start_date'] = update_dict['start_date'].isoformat()
    if update_dict.get('end_date'):
        update_dict['end_date'] = update_dict['end_date'].isoformat()
    
    result = await db.candidates.update_one({"id": candidate_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {"success": True}

# ============= RE-EVALUATION =============

@api_router.post("/candidates/{candidate_id}/re-evaluate")
async def re_evaluate_candidate(candidate_id: str, username: str = Depends(verify_token)):
    """Re-evaluate candidate with updated admin notes"""
    
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get previous evaluation
    prev_eval = await db.evaluations.find_one({"candidate_id": candidate_id}, {"_id": 0}, sort=[("created_at", -1)])
    
    if not prev_eval:
        raise HTTPException(status_code=404, detail="No previous evaluation found. Run initial analysis first.")
    
    # Get weights
    settings = await db.weight_settings.find_one({}, {"_id": 0})
    if not settings:
        settings = WeightSettings().model_dump()
    
    weights = {
        "vibe_psychology": settings['vibe_psychology'],
        "skill_competency": settings['skill_competency'],
        "stability_duration": settings['stability_duration']
    }
    
    # Run re-evaluation
    new_context = candidate.get('admin_notes', 'No new notes')
    logger.info(f"Re-evaluating {candidate['name']} with context: {new_context[:100]}...")
    
    analysis = await ai_service.re_evaluate_candidate(candidate, prev_eval, new_context, weights)
    
    # Calculate scores
    actual_weights = ai_service.calculate_dynamic_weights(candidate.get('duration_days', 14))
    total_score = int(
        (analysis['vibe_score'] * actual_weights['vibe_psychology'] / 100) +
        (analysis['skill_score'] * actual_weights['skill_competency'] / 100) +
        (analysis['stability_score'] * actual_weights['stability_duration'] / 100)
    )
    
    # Determine decision
    is_high_impact = analysis.get('is_high_impact', False)
    if candidate.get('duration_days', 14) < 7 and not is_high_impact:
        decision = "REJECT"
    elif total_score < 60:
        decision = "REJECT"
    elif total_score < 80:
        decision = "INVESTIGATE"
    else:
        decision = "SHORTLIST"
    
    # Generate new email
    email_data = await ai_service.generate_email(candidate, analysis, decision, total_score, is_high_impact)
    
    # Create new evaluation
    iteration = prev_eval.get('iteration', 1) + 1
    evaluation = Evaluation(
        candidate_id=candidate_id,
        candidate_name=candidate['name'],
        role_applied=candidate.get('role_applied'),
        vibe_score=analysis['vibe_score'],
        skill_score=analysis['skill_score'],
        stability_score=analysis['stability_score'],
        total_score=total_score,
        marginal_utility=analysis.get('marginal_utility', 'Medium'),
        roi_logic=analysis.get('roi_logic', '') + f" | RE-EVAL #{iteration}: {analysis.get('changes_from_previous', '')}",
        is_high_impact=is_high_impact,
        is_collab=is_high_impact and candidate.get('duration_days', 14) < 7,
        psychological_profile=analysis['psychological_profile'],
        social_resume_check=analysis['social_resume_check'],
        decision=decision,
        email_subject=email_data['subject'],
        email_body=email_data['body'],
        weights_used=actual_weights,
        iteration=iteration
    )
    
    eval_dict = evaluation.model_dump()
    eval_dict['created_at'] = eval_dict['created_at'].isoformat()
    await db.evaluations.insert_one(eval_dict)
    
    # Update candidate AI scores and status
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {
            "ai_score": total_score,
            "ai_reasoning": analysis.get('roi_logic', ''),
            "status": decision.lower(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Re-evaluation #{iteration} complete: {decision} ({total_score}/100)")
    
    return evaluation

# ============= EMAIL GENERATION =============

@api_router.post("/candidates/{candidate_id}/generate-email")
async def generate_candidate_email(candidate_id: str, username: str = Depends(verify_token)):
    """Generate conditional email based on status"""
    
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get latest evaluation
    evaluation = await db.evaluations.find_one({"candidate_id": candidate_id}, {"_id": 0}, sort=[("created_at", -1)])
    
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found. Analyze candidate first.")
    
    # Email already generated in evaluation
    return {
        "subject": evaluation['email_subject'],
        "body": evaluation['email_body'],
        "status": candidate.get('status', 'unknown'),
        "decision": evaluation['decision'],
        "is_collab": evaluation.get('is_collab', False)
    }

# ============= INITIAL ANALYSIS (EXISTING) =============

@api_router.post("/evaluations/analyze/{candidate_id}", response_model=EvaluationResponse)
async def analyze_candidate(candidate_id: str, username: str = Depends(verify_token)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    settings = await db.weight_settings.find_one({}, {"_id": 0})
    
    # Check if user has customized weights, else use dynamic weights based on duration
    if settings and settings.get('is_custom', False):
        # User explicitly set custom weights - use them
        weights = {
            "vibe_psychology": settings['vibe_psychology'],
            "skill_competency": settings['skill_competency'],
            "stability_duration": settings['stability_duration']
        }
        logger.info(f"Using CUSTOM weights: {weights}")
    else:
        # Use dynamic weights based on stay duration
        weights = ai_service.calculate_dynamic_weights(candidate.get('duration_days', 14))
        logger.info(f"Using DYNAMIC weights for {candidate.get('duration_days', 14)} days: {weights}")
    
    logger.info(f"Analyzing: {candidate['name']} (Duration: {candidate.get('duration_days', 'Unknown')} days)")
    analysis = await ai_service.analyze_candidate(candidate, weights)
    
    # Use user-configured weights for final score calculation
    total_score = int(
        (analysis['vibe_score'] * weights['vibe_psychology'] / 100) +
        (analysis['skill_score'] * weights['skill_competency'] / 100) +
        (analysis['stability_score'] * weights['stability_duration'] / 100)
    )
    
    is_high_impact = analysis.get('is_high_impact', False)
    if candidate.get('duration_days', 14) < 7 and not is_high_impact:
        decision = "REJECT"
    elif total_score < 60:
        decision = "REJECT"
    elif total_score < 80:
        decision = "INVESTIGATE"
    else:
        decision = "SHORTLIST"
    
    email_data = await ai_service.generate_email(candidate, analysis, decision, total_score, is_high_impact)
    
    evaluation = Evaluation(
        candidate_id=candidate_id,
        candidate_name=candidate['name'],
        role_applied=candidate.get('role_applied'),
        vibe_score=analysis['vibe_score'],
        skill_score=analysis['skill_score'],
        stability_score=analysis['stability_score'],
        total_score=total_score,
        marginal_utility=analysis.get('marginal_utility', 'Medium'),
        roi_logic=analysis.get('roi_logic', ''),
        is_high_impact=is_high_impact,
        is_collab=is_high_impact and candidate.get('duration_days', 14) < 7,
        psychological_profile=analysis['psychological_profile'],
        social_resume_check=analysis['social_resume_check'],
        decision=decision,
        email_subject=email_data['subject'],
        email_body=email_data['body'],
        weights_used=weights
    )
    
    eval_dict = evaluation.model_dump()
    eval_dict['created_at'] = eval_dict['created_at'].isoformat()
    await db.evaluations.insert_one(eval_dict)
    
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {
            "status": "analyzed",
            "ai_score": total_score,
            "ai_reasoning": analysis.get('roi_logic', ''),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Parse dates
    if isinstance(candidate.get('created_at'), str):
        candidate['created_at'] = datetime.fromisoformat(candidate['created_at'])
    if isinstance(candidate.get('updated_at'), str):
        candidate['updated_at'] = datetime.fromisoformat(candidate['updated_at'])
    if candidate.get('start_date') and isinstance(candidate['start_date'], str):
        candidate['start_date'] = date.fromisoformat(candidate['start_date'])
    if candidate.get('end_date') and isinstance(candidate['end_date'], str):
        candidate['end_date'] = date.fromisoformat(candidate['end_date'])
    
    return EvaluationResponse(evaluation=evaluation, candidate=Candidate(**candidate))

@api_router.get("/evaluations", response_model=List[Evaluation])
async def get_evaluations(username: str = Depends(verify_token)):
    """Get all evaluations"""
    evaluations = await db.evaluations.find({}, {"_id": 0}).to_list(1000)
    
    for evaluation in evaluations:
        if isinstance(evaluation.get('created_at'), str):
            evaluation['created_at'] = datetime.fromisoformat(evaluation['created_at'])
    
    return evaluations

@api_router.get("/evaluations/candidate/{candidate_id}", response_model=Evaluation)
async def get_evaluation_by_candidate(candidate_id: str, username: str = Depends(verify_token)):
    """Get evaluation for a specific candidate"""
    evaluation = await db.evaluations.find_one({"candidate_id": candidate_id}, {"_id": 0})
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    if isinstance(evaluation.get('created_at'), str):
        evaluation['created_at'] = datetime.fromisoformat(evaluation['created_at'])
    
    return Evaluation(**evaluation)

# ============= ALGORITHMIC SCORING =============

@api_router.post("/candidates/{candidate_id}/score")
async def calculate_candidate_score(candidate_id: str, username: str = Depends(verify_token)):
    """Calculate algorithmic score for a candidate using the Scientific Fit Score engine"""
    
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Calculate score using the scoring engine
    score_breakdown = scoring_engine.calculate_score(candidate)
    
    # Update candidate with score
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {
            "ai_score": score_breakdown.total_score,
            "ai_reasoning": score_breakdown.ai_commentary,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "candidate_id": candidate_id,
        "total_score": score_breakdown.total_score,
        "breakdown": {
            "stability": {"score": score_breakdown.stability_score, "reason": score_breakdown.stability_reason},
            "skill": {"score": score_breakdown.skill_score, "reason": score_breakdown.skill_reason},
            "psychometric": {"score": score_breakdown.psychometric_score, "reason": score_breakdown.psychometric_reason},
            "logistics": {"score": score_breakdown.logistics_score, "reason": score_breakdown.logistics_reason},
            "role_bonus": {"score": score_breakdown.role_bonus, "reason": score_breakdown.role_reason},
            "penalties": {"score": -score_breakdown.penalties, "reasons": score_breakdown.penalty_reasons}
        },
        "validation_status": score_breakdown.validation_status,
        "ai_commentary": score_breakdown.ai_commentary,
        "recommended_action": score_breakdown.recommended_action,
        "email_template": score_breakdown.email_template,
        "score_category": "green" if score_breakdown.total_score > 75 else "yellow" if score_breakdown.total_score >= 40 else "red"
    }

@api_router.post("/candidates/{candidate_id}/generate-email-v2")
async def generate_email_v2(candidate_id: str, username: str = Depends(verify_token)):
    """Generate email based on algorithmic score"""
    
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Calculate score to determine template
    score_breakdown = scoring_engine.calculate_score(candidate)
    
    # Generate email
    email = generate_email_template(score_breakdown.email_template, candidate, score_breakdown)
    
    return {
        "template_type": email["template_type"],
        "subject": email["subject"],
        "body": email["body"],
        "score": score_breakdown.total_score,
        "recommendation": score_breakdown.recommended_action
    }

@api_router.get("/stats")
async def get_stats(username: str = Depends(verify_token)):
    total_candidates = await db.candidates.count_documents({})
    total_analyzed = await db.evaluations.count_documents({})
    
    evaluations = await db.evaluations.find({}, {"_id": 0}).to_list(1000)
    
    shortlisted = sum(1 for e in evaluations if e['decision'] == 'SHORTLIST')
    investigate = sum(1 for e in evaluations if e['decision'] == 'INVESTIGATE')
    rejected = sum(1 for e in evaluations if e['decision'] == 'REJECT')
    avg_score = sum(e['total_score'] for e in evaluations) / len(evaluations) if evaluations else 0
    
    return {
        "total_candidates": total_candidates,
        "total_analyzed": total_analyzed,
        "shortlisted": shortlisted,
        "investigate": investigate,
        "rejected": rejected,
        "average_score": round(avg_score, 1),
        "pending_analysis": total_candidates - total_analyzed
    }

# ============= SETTINGS =============

@api_router.get("/settings/weights")
async def get_weight_settings(username: str = Depends(verify_token)):
    """Get current weight settings"""
    settings = await db.weight_settings.find_one({}, {"_id": 0})
    if not settings:
        # Return defaults with is_custom = False
        return {
            "vibe_psychology": 40,
            "skill_competency": 30,
            "stability_duration": 30,
            "is_custom": False
        }
    return settings

@api_router.put("/settings/weights")
async def update_weight_settings(weights: WeightSettingsUpdate, username: str = Depends(verify_token)):
    """Update weight settings"""
    # Validate total = 100
    total = (weights.vibe_psychology or 0) + (weights.skill_competency or 0) + (weights.stability_duration or 0)
    if total != 100:
        raise HTTPException(status_code=400, detail=f"Weights must sum to 100. Current: {total}")
    
    update_dict = {k: v for k, v in weights.model_dump().items() if v is not None}
    update_dict['is_custom'] = True  # Mark as user-customized
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Upsert settings
    await db.weight_settings.update_one(
        {},
        {"$set": update_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Settings updated"}

@api_router.post("/settings/weights/reset")
async def reset_weight_settings(username: str = Depends(verify_token)):
    """Reset weights to use dynamic/default behavior"""
    await db.weight_settings.update_one(
        {},
        {"$set": {
            "vibe_psychology": 40,
            "skill_competency": 30,
            "stability_duration": 30,
            "is_custom": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "message": "Weights reset to dynamic defaults"}

app.include_router(public_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

if LOCAL_STORAGE_PATH.exists():
    app.mount("/uploads", StaticFiles(directory=str(LOCAL_STORAGE_PATH)), name="uploads")

# ============= Instagram Scraper =============
import httpx
import re as regex

@app.post("/api/instagram/fetch")
async def fetch_instagram_data(data: dict = Body(...), username: str = Depends(verify_token)):
    """Fetch public Instagram profile data (followers, posts)"""
    instagram_url = data.get("instagram_url", "")
    
    if not instagram_url:
        raise HTTPException(status_code=400, detail="Instagram URL required")
    
    # Extract username from URL
    # Handles: instagram.com/username, instagram.com/username/, @username
    match = regex.search(r'(?:instagram\.com/|@)([a-zA-Z0-9_.]+)', instagram_url)
    if not match:
        # Try if it's just a username
        match = regex.match(r'^([a-zA-Z0-9_.]+)$', instagram_url.strip())
    
    if not match:
        raise HTTPException(status_code=400, detail="Could not extract Instagram username")
    
    ig_username = match.group(1).rstrip('/')
    
    try:
        # Try to fetch Instagram profile page
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
            response = await client.get(f"https://www.instagram.com/{ig_username}/", headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                return {"success": False, "error": "Profile not accessible", "manual_required": True}
            
            html = response.text
            
            # Try to extract follower count from meta tags or embedded JSON
            followers = None
            
            # Method 1: Look for meta description with follower count
            meta_match = regex.search(r'(\d+(?:,\d+)*(?:\.\d+)?[KkMm]?)\s*Followers', html)
            if meta_match:
                followers_str = meta_match.group(1).replace(',', '')
                # Convert K/M to numbers
                if 'K' in followers_str.upper():
                    followers = int(float(followers_str.upper().replace('K', '')) * 1000)
                elif 'M' in followers_str.upper():
                    followers = int(float(followers_str.upper().replace('M', '')) * 1000000)
                else:
                    followers = int(float(followers_str))
            
            # Method 2: Try to find in JSON-LD or embedded data
            if not followers:
                json_match = regex.search(r'"edge_followed_by":\s*{\s*"count":\s*(\d+)', html)
                if json_match:
                    followers = int(json_match.group(1))
            
            # Method 3: Try og:description meta tag
            if not followers:
                og_match = regex.search(r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']*)["\']', html)
                if og_match:
                    desc = og_match.group(1)
                    num_match = regex.search(r'(\d+(?:,\d+)*(?:\.\d+)?[KkMm]?)\s*Followers', desc)
                    if num_match:
                        followers_str = num_match.group(1).replace(',', '')
                        if 'K' in followers_str.upper():
                            followers = int(float(followers_str.upper().replace('K', '')) * 1000)
                        elif 'M' in followers_str.upper():
                            followers = int(float(followers_str.upper().replace('M', '')) * 1000000)
                        else:
                            followers = int(float(followers_str))
            
            if followers:
                return {
                    "success": True,
                    "username": ig_username,
                    "followers": followers,
                    "manual_required": False
                }
            else:
                return {
                    "success": False,
                    "error": "Could not extract follower count (profile may be private)",
                    "manual_required": True
                }
                
    except httpx.TimeoutException:
        return {"success": False, "error": "Request timed out", "manual_required": True}
    except Exception as e:
        logger.error(f"Instagram fetch error: {str(e)}")
        return {"success": False, "error": "Failed to fetch profile", "manual_required": True}

# Serve React frontend static files (for Render Web Service deployment)
FRONTEND_BUILD_PATH = Path(__file__).parent.parent / 'frontend' / 'build'
if FRONTEND_BUILD_PATH.exists():
    # Serve static assets (js, css, images)
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_PATH / "static")), name="static")
    
    # Catch-all route for React Router - serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for client-side routing"""
        # Don't serve for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        # Check if it's a static file request
        file_path = FRONTEND_BUILD_PATH / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # For all other routes, serve index.html (React Router will handle it)
        index_path = FRONTEND_BUILD_PATH / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Not Found")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()