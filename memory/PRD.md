# Hidden Monkey Stays - Volunteer Screening CRM

## Original Problem Statement
User reported: "revealuate and ai analysis not working correctly, also /apply is not loading. Connected github"

## Solution Applied
Pulled the complete codebase from GitHub repository (https://github.com/HMS-Dev-SS/VolunteerApp) and:
1. Replaced direct google-genai integration with emergentintegrations library using Emergent LLM key
2. Configured environment variables properly
3. Ensured all backend services and frontend pages work correctly

## Deployment Status (Feb 23, 2026)
- **Emergent Preview** (https://reveal-ai-fix.preview.emergentagent.com): ✅ All features working
- **Render Instance 1** (https://volunteerapp-1.onrender.com): ✅ All features working
- **Render Instance 2** (https://volunteerapp-nfbu.onrender.com): ⚠️ Backend-only (no frontend)

## Architecture

### Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React.js with Tailwind CSS
- **Database**: MongoDB
- **AI Integration**: Gemini 2.5 Flash via emergentintegrations library

### Core Features
1. **Public Application Portal** (`/apply`)
   - Access code verification
   - Multi-field application form
   - Creator/influencer detection

2. **Admin Dashboard**
   - Login/Registration with JWT auth
   - Statistics overview
   - Access code management

3. **AI-Powered Candidate Screening**
   - 4-vector scoring: Stability, Skills, Psychometrics, Logistics
   - AI Analysis using Gemini 2.5 Flash
   - Re-evaluate with updated context
   - Algorithmic score calculation

4. **Smart Parse**
   - Extract candidate data from WhatsApp/DM text dumps
   - AI-powered data extraction

5. **Email Generation**
   - Template-based emails (A/B/C) based on score
   - Copy-to-clipboard functionality

## User Personas
1. **Admin/Volunteer Coordinator**: Manages applications, runs AI analysis, makes decisions
2. **Applicant**: Submits volunteer applications through public portal

## Core Requirements (Static)
- Secure admin authentication
- Public application submission with access codes
- AI-powered candidate scoring
- Re-evaluation capability
- Email template generation

## What's Been Implemented
- [x] /apply page with access code verification (Feb 23, 2026)
- [x] AI Analysis endpoint with Gemini integration (Feb 23, 2026)
- [x] Re-evaluate functionality (Feb 23, 2026)
- [x] Calculate Score endpoint (Feb 23, 2026)
- [x] Generate Email endpoint (Feb 23, 2026)
- [x] Dashboard with statistics (Feb 23, 2026)
- [x] Candidate list with filters (Feb 23, 2026)
- [x] Settings page for weight configuration (Feb 23, 2026)
- [x] Smart Parse functionality (Feb 23, 2026)
- [x] Admin Notes Save button with visual feedback (Feb 23, 2026)

## API Endpoints
- `POST /api/public/verify-code` - Verify access code
- `POST /api/public/apply` - Submit application
- `POST /api/auth/register` - Register admin
- `POST /api/auth/login` - Login admin
- `GET /api/candidates` - List all candidates
- `POST /api/evaluations/analyze/{id}` - AI Analysis
- `POST /api/candidates/{id}/re-evaluate` - Re-evaluate
- `POST /api/candidates/{id}/score` - Calculate algorithmic score
- `POST /api/candidates/{id}/generate-email-v2` - Generate email
- `GET /api/settings/weights` - Get scoring weights
- `PUT /api/settings/weights` - Update scoring weights

## Prioritized Backlog
### P0 (Critical) - Completed
- [x] Fix /apply page loading
- [x] Fix AI Analysis
- [x] Fix Re-evaluate

### P1 (Important) - Future
- [ ] Add bulk candidate import
- [ ] Add email sending integration (SendGrid/Resend)
- [ ] Add Instagram API integration for follower verification

### P2 (Nice to have) - Future
- [ ] Add calendar integration for scheduling interviews
- [ ] Add multi-property support with property-specific dashboards
- [ ] Add analytics dashboard with trends

## Next Tasks
1. Consider adding email sending capability (currently generates but doesn't send)
2. Add Instagram API integration to auto-verify creator claims
3. Implement bulk candidate actions (analyze all, export)
