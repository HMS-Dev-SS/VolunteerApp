"""
Hidden Monkey Stays - Algorithmic Scoring Engine
Scientific Fit Score Calculator (0-100)
"""
import re
import logging
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ============= DICTIONARIES =============

TAKER_WORDS = ["free food", "save money", "broke", "budget", "cheap stay", "free stay", "no cost", "free accommodation"]
GIVER_WORDS = ["contribute", "build", "organize", "help", "teach", "share", "create", "support", "grow", "improve"]

CONTENT_CREATOR_GEAR = ["sony", "drone", "gimbal", "premiere", "premier pro", "final cut", "davinci", "camera", "lens", "lightroom", "photoshop"]
COMMUNITY_MANAGER_KEYWORDS = ["host", "events", "guest", "social", "hospitality", "reception", "welcome", "coordinate"]
COMMUNITY_MANAGER_EXPERIENCE = ["zostel", "hostel", "cafe", "hotel", "airbnb", "managed", "coordinated", "organized events"]
KITCHEN_KEYWORDS = ["bulk", "menu", "inventory", "vegetarian", "costing", "recipes", "commercial", "restaurant", "catering"]
INTROVERSION_FLAGS = ["shy", "introverted", "peace", "silent", "quiet", "alone", "solitude"]
INFLATED_EGO_WORDS = ["expert", "guru", "best", "top", "master", "genius", "professional"]

@dataclass
class ScoreBreakdown:
    """Detailed score breakdown for transparency"""
    total_score: int
    stability_score: int
    stability_reason: str
    skill_score: int
    skill_reason: str
    psychometric_score: int
    psychometric_reason: str
    logistics_score: int
    logistics_reason: str
    role_bonus: int
    role_reason: str
    penalties: int
    penalty_reasons: list
    validation_status: str
    ai_commentary: str
    recommended_action: str
    email_template: str  # A, B, or C


class ScoringEngine:
    """
    Algorithmic scoring engine for volunteer applications.
    Calculates Scientific Fit Score (0-100) based on weighted vectors.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_score(self, candidate: Dict[str, Any]) -> ScoreBreakdown:
        """
        Main scoring function. Returns detailed breakdown.
        """
        # Initialize scores
        stability_score = 0
        stability_reason = ""
        skill_score = 0
        skill_reason = ""
        psychometric_score = 0
        psychometric_reason = ""
        logistics_score = 0
        logistics_reason = ""
        role_bonus = 0
        role_reason = ""
        penalties = 0
        penalty_reasons = []
        validation_status = "Valid"
        
        # Get candidate data
        duration_days = candidate.get('duration_days', 0) or 0
        is_creator = candidate.get('is_creator', False)
        instagram_followers = candidate.get('instagram_followers', 0) or 0
        instagram_engagement = candidate.get('instagram_engagement', 0) or 0
        instagram = candidate.get('instagram', '')
        portfolio_link = candidate.get('portfolio_link', '')
        role_applied = (candidate.get('role_applied', '') or '').lower()
        age = candidate.get('age', 25) or 25
        gender = (candidate.get('gender', '') or '').lower()
        why_volunteer = candidate.get('why_volunteer', '') or ''
        skills_text = ' '.join(candidate.get('skills', [])) if isinstance(candidate.get('skills'), list) else str(candidate.get('skills', ''))
        admin_notes = candidate.get('admin_notes', '') or ''
        name = candidate.get('name', '')
        
        # Combine all text for analysis
        all_text = f"{why_volunteer} {skills_text} {admin_notes}".lower()
        
        # ============= VECTOR A: STABILITY (Duration Logic) =============
        stability_score, stability_reason = self._calculate_stability(
            duration_days, is_creator, instagram_followers
        )
        
        # ============= VECTOR B: ROLE-SPECIFIC COMPETENCE =============
        skill_score, skill_reason, role_penalty = self._calculate_skill_score(
            role_applied, all_text, is_creator, instagram, portfolio_link, instagram_followers, instagram_engagement
        )
        if role_penalty:
            penalties += role_penalty[0]
            penalty_reasons.append(role_penalty[1])
        
        # ============= VECTOR C: PSYCHOMETRIC SENTIMENT =============
        psychometric_score, psychometric_reason = self._calculate_psychometric(all_text)
        
        # ============= VECTOR D: LOGISTICS (Age & Gender) =============
        logistics_score, logistics_reason = self._calculate_logistics(age, gender, role_applied)
        
        # ============= ROLE BONUS =============
        role_bonus, role_reason = self._calculate_role_bonus(role_applied, all_text, skills_text)
        
        # ============= VALIDATION GATES =============
        validation_cap, validation_msg, val_penalty = self._run_validation_gates(
            candidate, all_text, portfolio_link, instagram
        )
        if val_penalty > 0:
            penalties += val_penalty
            penalty_reasons.append(validation_msg)
        if validation_cap is not None:
            validation_status = f"CAPPED: {validation_msg}"
        
        # ============= CALCULATE TOTAL =============
        raw_total = stability_score + skill_score + psychometric_score + logistics_score + role_bonus - penalties
        
        # Apply validation cap if needed
        if validation_cap is not None:
            total_score = min(raw_total, validation_cap)
        else:
            total_score = raw_total
        
        # Clamp to 0-100
        total_score = max(0, min(100, total_score))
        
        # ============= GENERATE COMMENTARY & RECOMMENDATION =============
        ai_commentary = self._generate_commentary(
            total_score, candidate, stability_score, skill_score, 
            psychometric_score, logistics_score, penalties, penalty_reasons
        )
        
        recommended_action, email_template = self._get_recommendation(total_score, penalties, portfolio_link, instagram)
        
        return ScoreBreakdown(
            total_score=total_score,
            stability_score=stability_score,
            stability_reason=stability_reason,
            skill_score=skill_score,
            skill_reason=skill_reason,
            psychometric_score=psychometric_score,
            psychometric_reason=psychometric_reason,
            logistics_score=logistics_score,
            logistics_reason=logistics_reason,
            role_bonus=role_bonus,
            role_reason=role_reason,
            penalties=penalties,
            penalty_reasons=penalty_reasons,
            validation_status=validation_status,
            ai_commentary=ai_commentary,
            recommended_action=recommended_action,
            email_template=email_template
        )
    
    def _calculate_stability(self, duration_days: int, is_creator: bool, followers: int) -> Tuple[int, str]:
        """VECTOR A: Duration Logic"""
        if duration_days > 30:
            score = 25
            reason = f"{duration_days} days = High Stability (+25)"
        elif duration_days >= 15:
            score = 15
            reason = f"{duration_days} days = Medium Stability (+15)"
        elif duration_days >= 7:
            score = 5
            reason = f"{duration_days} days = Short Stay (+5)"
        else:
            # Short stay penalty
            if is_creator and followers > 10000:
                score = 0  # Reset penalty for high-impact creators
                reason = f"{duration_days} days but High-Impact Creator ({followers:,} followers) - Penalty Reset"
            else:
                score = -20
                reason = f"{duration_days} days = Very Short Stay (-20 Penalty)"
        
        return score, reason
    
    def _calculate_skill_score(self, role: str, text: str, is_creator: bool, 
                               instagram: str, portfolio: str, followers: int, engagement: float) -> Tuple[int, str, Optional[Tuple[int, str]]]:
        """VECTOR B: Role-Specific Competence"""
        score = 0
        reasons = []
        penalty = None
        
        if 'content' in role or 'creator' in role or is_creator:
            # Content Creator scoring
            
            # Instagram link provided (required for creators)
            if instagram and instagram.strip():
                score += 10
                reasons.append("Instagram link provided (+10)")
            
            # Portfolio link (bonus)
            if portfolio and portfolio.strip():
                score += 10
                reasons.append("Portfolio link provided (+10)")
            
            # Follower-based scoring (if follower count is provided)
            # <1k: -10, 1k-2k: -5, 2k-4k: 0, 4k+: +1 per 2k
            if followers and followers > 0:
                if followers < 1000:
                    # Under 1k = Low reach
                    follower_score = -10
                    reasons.append(f"Low reach ({followers:,} followers) (-10)")
                elif followers < 2000:
                    # 1k-2k = Very small audience
                    follower_score = -5
                    reasons.append(f"Small audience ({followers:,} followers) (-5)")
                elif followers < 4000:
                    # 2k-4k = Neutral
                    follower_score = 0
                    reasons.append(f"Modest audience ({followers:,} followers) (0)")
                else:
                    # 4k+: +1 point per 2k followers
                    follower_score = (followers - 4000) // 2000 + 1
                    reasons.append(f"Creator with {followers:,} followers (+{follower_score})")
                score += follower_score
            
            # Engagement-based adjustments
            if followers and followers > 0 and engagement and engagement > 0:
                if engagement >= 5.0:
                    score += 10
                    reasons.append(f"Excellent engagement ({engagement}%) (+10)")
                elif engagement >= 3.0:
                    score += 5
                    reasons.append(f"Good engagement ({engagement}%) (+5)")
                elif engagement < 1.0 and followers > 10000:
                    # The Vanity Trap - high followers but very low engagement
                    score -= 15
                    reasons.append(f"Vanity Trap: {followers:,} followers but only {engagement}% engagement (-15)")
            
            # Gear/tools mentioned in skills/why_volunteer
            gear_found = [g for g in CONTENT_CREATOR_GEAR if g in text]
            if gear_found:
                score += 10
                reasons.append(f"Gear mentioned: {', '.join(gear_found)} (+10)")
            
            # Creator-specific skills detection
            creator_skills = ["video", "photo", "edit", "content", "reel", "youtube", "vlog", "design", "graphic"]
            skills_found = [s for s in creator_skills if s in text]
            if skills_found:
                score += 5
                reasons.append(f"Creator skills: {', '.join(skills_found[:3])} (+5)")
            
            # The Delusion Filter - claims creator but no proof at all
            if is_creator and not instagram and not portfolio:
                penalty = (50, "Creator with no proof - Delusion Filter (-50)")
        
        elif 'community' in role or 'manager' in role:
            # Community Manager scoring
            keywords_found = [k for k in COMMUNITY_MANAGER_KEYWORDS if k in text]
            if keywords_found:
                score += 10
                reasons.append(f"CM keywords: {', '.join(keywords_found[:3])} (+10)")
            
            exp_found = [e for e in COMMUNITY_MANAGER_EXPERIENCE if e in text]
            if exp_found:
                score += 20
                reasons.append(f"Relevant experience: {', '.join(exp_found[:2])} (+20)")
            
            # Introversion flag
            intro_flags = [f for f in INTROVERSION_FLAGS if f in text]
            if intro_flags:
                score -= 15
                reasons.append(f"Introversion flags detected: {', '.join(intro_flags)} (-15)")
        
        elif 'kitchen' in role or 'chef' in role or 'cook' in role:
            # Kitchen/Chef scoring
            keywords_found = [k for k in KITCHEN_KEYWORDS if k in text]
            if keywords_found:
                score += 15
                reasons.append(f"Kitchen keywords: {', '.join(keywords_found[:3])} (+15)")
            
            # Commercial scale detection
            commercial_patterns = ['cooked for', 'served', 'prepared for', 'catering', 'restaurant']
            if any(p in text for p in commercial_patterns):
                # Look for numbers
                numbers = re.findall(r'(\d+)\s*(?:people|guests|persons)', text)
                if numbers and int(numbers[0]) >= 20:
                    score += 20
                    reasons.append(f"Commercial scale experience (+20)")
        
        reason_str = "; ".join(reasons) if reasons else "No role-specific skills detected"
        return score, reason_str, penalty
    
    def _calculate_psychometric(self, text: str) -> Tuple[int, str]:
        """VECTOR C: Giver vs Taker Analysis"""
        score = 0
        reasons = []
        
        # Count taker words
        taker_count = sum(1 for word in TAKER_WORDS if word in text)
        if taker_count >= 2:
            score -= 15
            reasons.append(f"Taker language detected ({taker_count} matches) (-15)")
        elif taker_count == 1:
            score -= 5
            reasons.append(f"Minor taker language ({taker_count} match) (-5)")
        
        # Count giver words
        giver_count = sum(1 for word in GIVER_WORDS if word in text)
        if giver_count >= 2:
            score += 15
            reasons.append(f"Giver language detected ({giver_count} matches) (+15)")
        elif giver_count == 1:
            score += 5
            reasons.append(f"Some giver language ({giver_count} match) (+5)")
        
        reason_str = "; ".join(reasons) if reasons else "Neutral sentiment"
        return score, reason_str
    
    def _calculate_logistics(self, age: int, gender: str, role: str) -> Tuple[int, str]:
        """VECTOR D: Age & Gender Optimization"""
        score = 0
        reasons = []
        
        # Age scoring
        if 18 <= age <= 20:
            score -= 5
            reasons.append(f"Age {age}: Maturity risk (-5)")
        elif 21 <= age <= 32:
            score += 5
            reasons.append(f"Age {age}: Prime demographic (+5)")
        elif age > 32:
            reasons.append(f"Age {age}: Neutral")
        
        # Gender scoring for community roles
        if ('community' in role or 'manager' in role) and gender == 'female':
            score += 5
            reasons.append("Female CM: Historical ROI bonus (+5)")
        
        reason_str = "; ".join(reasons) if reasons else "Standard logistics"
        return score, reason_str
    
    def _calculate_role_bonus(self, role: str, text: str, skills: str) -> Tuple[int, str]:
        """Additional role-match bonus"""
        score = 0
        reasons = []
        
        # Strong role match indicators
        if 'content' in role or 'creator' in role:
            creator_skills = ['video', 'photo', 'edit', 'social media', 'youtube', 'instagram', 'tiktok', 'reel']
            matches = [s for s in creator_skills if s in text or s in skills.lower()]
            if len(matches) >= 2:
                score += 15
                reasons.append(f"Strong creator match: {', '.join(matches[:3])} (+15)")
        
        elif 'community' in role:
            if 'people' in text or 'communication' in text or 'team' in text:
                score += 10
                reasons.append("People-oriented language (+10)")
        
        elif 'kitchen' in role or 'chef' in role:
            if 'passion' in text and ('cook' in text or 'food' in text):
                score += 10
                reasons.append("Passionate about cooking (+10)")
        
        reason_str = "; ".join(reasons) if reasons else "No additional role bonus"
        return score, reason_str
    
    def _run_validation_gates(self, candidate: Dict, text: str, portfolio: str, instagram: str) -> Tuple[Optional[int], str, int]:
        """
        Binary validation checks.
        Returns: (cap_score, message, penalty_points)
        """
        name = candidate.get('name', '')
        why_volunteer = candidate.get('why_volunteer', '')
        skills = candidate.get('skills', [])
        
        # The "Ghost" Check
        if name and not why_volunteer and not skills:
            return 20, "Incomplete Data - Ghost Profile", 0
        
        # The "Inflated Ego" Check
        ego_words = [w for w in INFLATED_EGO_WORDS if w in text]
        if ego_words and not portfolio and not instagram:
            return None, f"Unverified confidence: {', '.join(ego_words)}", 20
        
        return None, "Passed validation", 0
    
    def _generate_commentary(self, total: int, candidate: Dict, stability: int, skill: int, 
                            psychometric: int, logistics: int, penalties: int, penalty_reasons: list) -> str:
        """Generate the FOMO check / AI commentary"""
        name = candidate.get('name', 'This candidate')
        followers = candidate.get('instagram_followers', 0) or 0
        duration = candidate.get('duration_days', 0) or 0
        is_creator = candidate.get('is_creator', False)
        
        comments = []
        
        # Follower warning
        if followers > 10000 and duration < 7:
            comments.append(f"Admin, do not be swayed by their {followers:,} followers. They are only staying {duration} days. The onboarding effort may exceed output value.")
        
        # Low stability warning
        if stability < 0:
            comments.append(f"Short stay ({duration} days) significantly impacts ROI. Consider requesting extended commitment.")
        
        # Psychometric warning
        if psychometric < 0:
            comments.append("Detected 'taker' language patterns. May prioritize personal benefit over contribution.")
        
        # Skill gap warning
        if skill < 10 and is_creator:
            comments.append("Creator claims lack supporting evidence. Request portfolio before proceeding.")
        
        # Penalties
        if penalties > 0:
            comments.append(f"Penalties applied: {'; '.join(penalty_reasons)}")
        
        # Positive notes
        if total > 75:
            comments.append("Strong candidate profile. High ROI potential.")
        elif total > 50:
            comments.append("Moderate fit. May need additional verification.")
        else:
            comments.append("Below threshold. Recommend careful evaluation or rejection.")
        
        return " | ".join(comments) if comments else "Standard profile, no specific flags."
    
    def _get_recommendation(self, score: int, penalties: int, portfolio: str, instagram: str) -> Tuple[str, str]:
        """Get recommended action and email template"""
        if score > 75:
            return "APPROVE - High ROI Candidate", "A"
        elif score >= 40:
            if not portfolio and not instagram:
                return "REQUEST PROOF - Missing portfolio/social", "B"
            return "MANUAL REVIEW - Medium fit", "B"
        else:
            return "REJECT - Low score or high penalties", "C"


# Email template generator
def generate_email_template(template_type: str, candidate: Dict, score_breakdown: ScoreBreakdown) -> Dict[str, str]:
    """Generate email based on template type"""
    name = candidate.get('name', 'there')
    role = candidate.get('role_applied', 'volunteer') or 'volunteer'
    is_creator = candidate.get('is_creator', False)
    
    if template_type == "A":
        # High ROI Offer (Score > 75)
        subject = f"Welcome to Hidden Monkey Stays, {name}! 🐵"
        body = f"""Hi {name},

Your profile stood out! We'd love to host you at Hidden Monkey Stays.

Confirming: Free Stay + Meals in exchange for 4-5 hrs/day of meaningful contribution.
{" We're excited for this content collaboration!" if is_creator else ""}

Let us know your preferred dates and we'll get you set up.

Cheers,
Hidden Monkey Team"""
    
    elif template_type == "B":
        # Proof Request (Score 40-74)
        missing = []
        if not candidate.get('portfolio_link'):
            missing.append("portfolio/work samples")
        if not candidate.get('instagram') and is_creator:
            missing.append("Instagram profile")
        missing_str = " and ".join(missing) if missing else "examples of your work"
        
        subject = f"Quick follow-up on your Hidden Monkey application"
        body = f"""Hi {name},

Thanks for applying to Hidden Monkey Stays! We like your energy.

Before we can confirm, we need to see your {missing_str} for the {role} role.

Can you reply with links to your previous work?

Best,
Hidden Monkey Team"""
    
    else:
        # Hard Rejection (Score < 40)
        subject = f"Regarding your Hidden Monkey application"
        body = f"""Hi {name},

Thanks for your interest in Hidden Monkey Stays.

After reviewing applications, we're looking for:
- Longer-term commitments (2+ weeks ideal)
- Specific expertise in {role} with demonstrated experience

We encourage you to apply again when your availability aligns better with our needs.

Best wishes,
Hidden Monkey Team"""
    
    return {"subject": subject, "body": body, "template_type": template_type}
