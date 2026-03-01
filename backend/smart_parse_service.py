from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import json
from typing import Dict, Any
import logging
import re
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class SmartParseService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            logger.warning("No EMERGENT_LLM_KEY found - Smart Parse will not work")
    
    async def parse_unstructured_text(self, raw_text: str) -> Dict[str, Any]:
        """Extract structured candidate data from WhatsApp/DM dump"""
        
        if not self.api_key:
            return self._default_response(raw_text, "No AI model configured")
        
        prompt = f"""You are a data extraction specialist. Extract candidate information from this text:

{raw_text}

EXTRACTION RULES:
- "property_name": Hostel location where volunteering (Varanasi, Darjeeling, etc.)
- "city": Their HOME city (where they are FROM), not where they are volunteering
- Phone: Include country code (+91 for India)
- Dates: Use YYYY-MM-DD format. If month mentioned like "April", use current/next year
- is_creator: TRUE only if mentions "creator", "influencer", has Instagram with high followers
- Extract skills from what they say they can help with (cleaning, check-ins, tours, maintenance, etc.)
- why_volunteer: Their motivation/reason for wanting to volunteer

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "name": "<full name or null>",
  "email": "<email or null>",
  "phone": "<phone with country code or null>",
  "city": "<home city or null>",
  "property_name": "<hostel location or null>",
  "start_date": "<YYYY-MM-DD or null>",
  "end_date": "<YYYY-MM-DD or null>",
  "duration_days": <number or null>,
  "is_creator": <true/false>,
  "instagram": "<handle/URL or null>",
  "skills": ["<skill1>", "<skill2>"],
  "why_volunteer": "<motivation or null>",
  "extracted_text": "<key info found>",
  "confidence": <0-100>
}}"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"smart-parse-{hash(raw_text[:50])}",
                system_message="You are a precise data extraction AI. You MUST respond with valid JSON only, no markdown or code blocks."
            ).with_model("gemini", "gemini-2.5-flash")
            
            user_message = UserMessage(text=prompt)
            response_text = await chat.send_message(user_message)
            
            # Clean up response
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            parsed_data = json.loads(response_text.strip())
            
            # Phone number cleaning
            if parsed_data.get('phone'):
                phone = re.sub(r'[\s\-\(\)]', '', parsed_data['phone'])
                if phone and not phone.startswith('+') and len(phone) == 10:
                    phone = '+91' + phone
                parsed_data['phone'] = phone
            
            logger.info(f"Smart Parse successful - Confidence: {parsed_data.get('confidence', 0)}%")
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Smart Parse JSON error: {str(e)} - Response: {response_text[:200] if response_text else 'N/A'}")
            return self._default_response(raw_text, f"JSON parsing error: {str(e)}")
        except Exception as e:
            logger.error(f"Smart Parse error: {str(e)}")
            return self._default_response(raw_text, str(e))
    
    def _default_response(self, raw_text: str, error: str) -> Dict[str, Any]:
        return {
            "error": error,
            "name": None,
            "email": None,
            "phone": None,
            "city": None,
            "property_name": None,
            "start_date": None,
            "end_date": None,
            "duration_days": None,
            "is_creator": False,
            "instagram": None,
            "skills": [],
            "why_volunteer": None,
            "extracted_text": raw_text[:200] if raw_text else "",
            "confidence": 0
        }
