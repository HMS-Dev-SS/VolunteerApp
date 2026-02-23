from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import json
from typing import Dict, Any
import logging
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class AIAnalysisService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            logger.warning("No EMERGENT_LLM_KEY found - AI features will not work")
    
    def calculate_dynamic_weights(self, duration_days: int) -> Dict[str, int]:
        """Calculate dynamic weights based on stay duration"""
        if duration_days >= 20:
            return {"vibe_psychology": 50, "skill_competency": 20, "stability_duration": 30}
        elif duration_days < 7:
            return {"vibe_psychology": 10, "skill_competency": 80, "stability_duration": 10}
        else:
            return {"vibe_psychology": 40, "skill_competency": 30, "stability_duration": 30}
    
    async def analyze_candidate(self, candidate_data: Dict[str, Any], weights: Dict[str, int]) -> Dict[str, Any]:
        """Analyze candidate using Gemini with ROI-based economic analysis"""
        
        if not self.api_key:
            return self._default_analysis("No AI model configured")
        
        prompt = f"""You are the autonomous Volunteer Coordinator AI for Hidden Monkey Stays.
Your role is to filter applicants on skills, psychological fit AND economic ROI.

COMPENSATION: Free Dorm Stay + 2 Staff Meals. THE ASK: 4-5 Hours of dedicated work daily.

Analyze this volunteer application:
NAME: {candidate_data.get('name', 'Unknown')}
ROLE APPLIED: {candidate_data.get('role_applied', 'General')}
DURATION: {candidate_data.get('duration_days', 'Unknown')} days
WHY VOLUNTEER: {candidate_data.get('why_volunteer', 'Not provided')}
INSTAGRAM: {candidate_data.get('instagram', 'Not provided')}
SKILLS: {candidate_data.get('skills', [])}

WEIGHTING: Vibe: {weights['vibe_psychology']}%, Skill: {weights['skill_competency']}%, Stability: {weights['stability_duration']}%

Respond ONLY with valid JSON:
{{
  "vibe_score": <0-100>,
  "skill_score": <0-100>,
  "stability_score": <0-100>,
  "marginal_utility": "<High/Medium/Low>",
  "roi_logic": "<explain ROI assessment>",
  "psychological_profile": "<3-4 sentences on giver vs taker>",
  "social_resume_check": "<portfolio quality assessment>",
  "red_flags": ["<list of concerns>"],
  "green_flags": ["<list of positives>"],
  "is_high_impact": <true/false>
}}"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"candidate-analysis-{candidate_data.get('id', 'unknown')}",
                system_message="You are an AI assistant that analyzes volunteer applications. Always respond with valid JSON only."
            ).with_model("gemini", "gemini-2.5-flash")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
        except Exception as e:
            logger.error(f"AI Analysis error: {str(e)}")
            return self._default_analysis(str(e))
    
    async def generate_email(self, candidate_data: Dict[str, Any], evaluation: Dict[str, Any], decision: str, total_score: int, is_high_impact: bool = False) -> Dict[str, str]:
        """Generate role-specific email based on decision"""
        
        if not self.api_key:
            return {"subject": f"Your Application - {candidate_data.get('name', 'Candidate')}", "body": "Thank you for your application. We will review it shortly."}
        
        prompt = f"""Generate an email for volunteer application:
CANDIDATE: {candidate_data.get('name', 'Unknown')}
ROLE: {candidate_data.get('role_applied', 'General')}
DURATION: {candidate_data.get('duration_days', 'Unknown')} days
DECISION: {decision}
SCORE: {total_score}/100

Email type based on decision:
- REJECT: Polite decline, brief
- INVESTIGATE: Ask clarifying questions about their skills
- SHORTLIST: Welcome, confirm dates, remind about Free Stay + 2 Meals terms

Respond ONLY with valid JSON:
{{"subject": "<email subject>", "body": "<full email body>"}}"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"email-gen-{candidate_data.get('id', 'unknown')}",
                system_message="You are an AI assistant that generates professional emails. Always respond with valid JSON only."
            ).with_model("gemini", "gemini-2.5-flash")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
        except Exception as e:
            logger.error(f"Email generation error: {str(e)}")
            return {"subject": f"Your Application at Hidden Monkey", "body": f"Dear {candidate_data.get('name', 'Candidate')},\n\nThank you for your application.\n\nBest regards,\nHidden Monkey Team"}

    async def re_evaluate_candidate(self, candidate_data: Dict[str, Any], previous_evaluation: Dict[str, Any], new_context: str, weights: Dict[str, int]) -> Dict[str, Any]:
        """Re-evaluate candidate with new information"""
        
        if not self.api_key:
            return self._default_analysis("No AI model configured")
        
        prompt = f"""Re-evaluate this volunteer candidate with NEW INFORMATION:

CANDIDATE: {candidate_data.get('name', 'Unknown')}
ROLE: {candidate_data.get('role_applied', 'General')}
DURATION: {candidate_data.get('duration_days', 'Unknown')} days

PREVIOUS SCORES: Vibe: {previous_evaluation.get('vibe_score', 'N/A')}, Skill: {previous_evaluation.get('skill_score', 'N/A')}, Total: {previous_evaluation.get('total_score', 'N/A')}

NEW INFORMATION: {new_context}

Update scores based on new info. Respond ONLY with valid JSON:
{{
  "vibe_score": <0-100>,
  "skill_score": <0-100>,
  "stability_score": <0-100>,
  "marginal_utility": "<High/Medium/Low>",
  "roi_logic": "<updated reasoning>",
  "psychological_profile": "<updated assessment>",
  "social_resume_check": "<updated notes>",
  "red_flags": [],
  "green_flags": [],
  "is_high_impact": <true/false>,
  "changes_from_previous": "<what changed>"
}}"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"re-eval-{candidate_data.get('id', 'unknown')}",
                system_message="You are an AI assistant that re-evaluates volunteer applications. Always respond with valid JSON only."
            ).with_model("gemini", "gemini-2.5-flash")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
        except Exception as e:
            logger.error(f"Re-evaluation error: {str(e)}")
            return self._default_analysis(str(e))
    
    def _default_analysis(self, error_msg: str) -> Dict[str, Any]:
        return {
            "vibe_score": 50,
            "skill_score": 50,
            "stability_score": 50,
            "marginal_utility": "Medium",
            "roi_logic": f"Default scores - {error_msg}",
            "psychological_profile": "Analysis unavailable",
            "social_resume_check": "Analysis unavailable",
            "red_flags": ["Analysis error"],
            "green_flags": [],
            "is_high_impact": False,
            "changes_from_previous": ""
        }
