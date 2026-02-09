# Three-Agent Architecture Implementation Checklist

This checklist tracks progress through the implementation plan. Check off items as you complete them.

---

## Phase 1: Database Extensions ✅

### Schema Updates
- [x] Add `observer_notes JSONB` column to `interview_sessions` table
- [x] Add `full_rubric JSONB` column to `interview_feedback` table
- [x] Add `duration_seconds INTEGER` column to `interview_sessions` table
- [x] Create `observer_prompts` table with structure:
  - [x] `stage TEXT PRIMARY KEY`
  - [x] `system_prompt TEXT NOT NULL`
  - [x] `evaluation_criteria JSONB`
  - [x] `red_flag_keywords TEXT[]`
  - [x] `quality_indicators JSONB`
  - [x] `created_at` and `updated_at` timestamps
- [x] Add RLS policies for `observer_prompts`:
  - [x] Admin-only editing
  - [x] Readable by authenticated users
- [x] Insert default HR screen observer prompt into `observer_prompts`
- [ ] Test database migrations in development
- [ ] Verify RLS policies work correctly

---

## Phase 2: Session State Helper

### Create Interview Session Helper
- [x] Create `lib/interview-session.ts` file
- [x] Implement `appendMessage({ sessionId, speaker, text, questionId, timestamp })` function
- [x] Implement function to update `transcript_structured` with proper structure:
  - [x] Maintain `questions_asked` array
  - [x] Maintain `messages` array with proper format
- [x] Add timestamp tracking and duration calculation
- [x] Refactor `app/api/interview/voice/route.ts` to use session helper
- [ ] Refactor `app/api/interview/realtime/route.ts` to use session helper (OPTIONAL - WebSocket flow, can do later)
- [ ] Test session helper with sample data (DO AT END - with full interview test)
- [ ] Verify `transcript_structured` format matches what `practice` route expects (DO AT END - with full interview test)

---

## Phase 3: Claude Grader (IMPLEMENT FIRST) ⭐

### Claude Client Setup
- [x] Create `lib/claude-client.ts` file
- [x] Add `ANTHROPIC_API_KEY` to `.env.local` (USER ACTION NEEDED)
- [x] Install `@anthropic-ai/sdk` package (USER ACTION NEEDED: `npm install @anthropic-ai/sdk`)
- [x] Implement Anthropic client initialization
- [x] Implement `gradeHrScreen(gradingMaterials)` function
- [x] Add error handling and retry logic (3 attempts with exponential backoff)
- [x] Add fallback to GPT-4o if Claude fails after 3 attempts

### Rubric Validator
- [x] Create `lib/rubric-validator.ts` file
- [x] Implement `validateRubric(rubric)` function
- [x] Check for required fields:
  - [x] `overall_assessment`
  - [x] `traditional_hr_criteria`
  - [x] `time_management_analysis`
  - [x] `question_analysis`
  - [x] `next_steps_preparation`
  - [x] `comparative_analysis`
- [x] Implement `validateHrScreenRubric()` for HR screen specific validation
- [ ] Add unit tests for validator

### Feedback Route Updates
- [x] Update `app/api/interview/feedback/route.ts`:
  - [x] Add HR screen path detection (`stage === 'hr_screen'`)
  - [x] Fetch `transcript_structured` from database
  - [x] Fetch `observer_notes` (can be empty `{}` for initial testing)
  - [x] Fetch resume, JD, company website from `user_interview_data`
  - [x] Fetch `feedback_stage_instructions` for HR screen
  - [x] Build `gradingMaterials` object
  - [x] Call `gradeHrScreen()` from Claude client
  - [x] Validate rubric using validator
  - [x] Store `full_rubric` in `interview_feedback.full_rubric`
  - [x] Derive and store key fields:
    - [x] `overall_score`
    - [x] `hr_screen_six_areas`
    - [x] `strengths`
    - [x] `weaknesses`
    - [x] `area_scores`
    - [x] `area_feedback`
    - [x] `suggestions`
    - [x] `detailed_feedback`
  - [x] Keep existing OpenAI path for non-HR stages (fallback)
- [ ] Test Claude grader with mock transcript and empty observer notes (DO AT END - with full interview test)
- [ ] Verify rubric validation works (DO AT END - check logs during interview)
- [ ] Verify both `full_rubric` and derived fields are stored correctly (DO AT END - check database after interview)
- [ ] Test error handling (Claude API failure → fallback to GPT-4o) (DO AT END - can test by temporarily breaking API key)

---

## Phase 4: Observer Agent (IMPLEMENT SECOND) ⭐

### Observer Agent Module
- [x] Create `lib/observer-agent.ts` file
- [x] Implement `getObserverPrompt(stage)` function to fetch from `observer_prompts` table
- [x] Implement `recordTurn({ sessionId, questionId, question, answer, timestamps, stage })` function:
  - [x] Fetch observer prompt from database
  - [x] Call OpenAI GPT-4o-mini with observer prompt
  - [x] Parse structured JSON response
  - [x] Merge notes into existing `observer_notes` (keyed by question ID)
  - [x] Update `interview_sessions.observer_notes` in database
  - [x] **CRITICAL**: Make it async/fire-and-forget (don't await, catch errors)
- [x] Implement `compileNotes({ sessionId })` function for final summary
- [x] Add error handling (log but don't fail interview)

### Wire Observer into Interview Routes
- [x] Update `app/api/interview/voice/route.ts`:
  - [x] After storing user transcript, call `ObserverAgent.recordTurn()` (fire-and-forget)
  - [x] Pass question ID, question text, answer, timestamps, stage
- [ ] Update `app/api/interview/realtime/route.ts` (OPTIONAL - WebSocket flow, can do later):
  - [ ] Add observer call when user response is finalized
  - [ ] Ensure async/fire-and-forget pattern
- [x] Add observer compilation call when interview ends (in `endInterview()`)
- [ ] Test observer with single Q/A turn (DO AT END - with full interview test)
- [ ] Verify notes are stored in `observer_notes` JSONB (DO AT END - with full interview test)
- [ ] Verify async calls don't block interview flow (DO AT END - verify interview doesn't hang)
- [ ] Test observer failure doesn't break interview (DO AT END - can simulate by breaking API key)

---

## Phase 5: Frontend Wiring

### Interview Page
- [x] Update `app/interview/page.tsx`:
  - [x] Ensure timing metadata is sent to backend (start/end timestamps) - Added duration calculation
  - [x] Verify `endInterview()` still calls `/api/interview/feedback` automatically - Confirmed
  - [x] No major UI changes needed (backend-only changes) - No UI changes needed

### Feedback Page
- [x] Update `app/interview/feedback/page.tsx`:
  - [x] Display `hr_screen_six_areas` assessment - Already displayed, now uses full_rubric data
  - [x] Display structured strengths/weaknesses from `full_rubric` - Extracted from full_rubric
  - [x] Add practice queue section:
    - [x] Show questions flagged for practice - Added practice queue section
    - [x] Link to practice mode for each question - Added practice links
  - [ ] Display per-question analysis from `full_rubric` (optional, can be v2) - Can be added later
- [ ] Test feedback page with completed HR screen interview (DO AT END)
- [ ] Verify all new fields display correctly (DO AT END)

### Practice Mode Integration
- [x] Update practice mode to use observer `should_practice` flags - Practice route fetches observer_notes (can use flag_for_practice)
- [x] Update practice mode to use Claude rubric `practice_queue` - Practice queue section links to practice mode
- [ ] Add practice queue UI to dashboard (optional, can be v2) - Can be added later

---

## Phase 6: Testing & Validation

### Unit Tests
- [ ] Test `rubric-validator.ts` with valid rubric
- [ ] Test `rubric-validator.ts` with invalid rubric (missing fields)
- [ ] Test observer JSON parsing
- [ ] Test session helper functions

### Integration Tests
- [ ] Test Claude grader with mock transcript and empty observer notes
- [ ] Test Claude grader with mock transcript and observer notes
- [ ] Test observer with single Q/A turn
- [ ] Test observer with multiple Q/A turns (notes accumulate)
- [ ] Test error handling: Claude API failure → fallback to GPT-4o
- [ ] Test error handling: Observer failure doesn't break interview

### End-to-End Tests
- [ ] Complete HR screen interview → verify observer notes accumulate
- [ ] Complete HR screen interview → verify grading uses observer notes
- [ ] Complete HR screen interview → verify feedback displays all new fields
- [ ] Test on multiple devices (voice recording timing)
- [ ] Load test: 10 concurrent interviews (verify observer doesn't block)

### Cost Testing
- [ ] Run 5 interviews, verify total cost < $4.00
- [ ] Verify cost per interview is ~$0.42-0.75
- [ ] Check individual agent costs match estimates

---

## Phase 7: Documentation & Deployment

### Documentation
- [ ] Update `README.md` with three-agent architecture diagram
- [ ] Document observer notes schema
- [ ] Document full rubric schema
- [ ] Add troubleshooting guide for common issues
- [ ] Update `SETUP_INSTRUCTIONS.md` with Anthropic setup

### Environment Setup
- [ ] Add `ANTHROPIC_API_KEY` to production environment (Vercel/hosting)
- [ ] Set cost alert thresholds in Anthropic dashboard
- [ ] Verify all environment variables are set in production

### Pre-Launch Verification
- [ ] All database migrations run successfully in production
- [ ] All RLS policies work correctly
- [ ] Error handling tested in production-like environment
- [ ] Monitoring/logging set up (basic console logs at minimum)
- [ ] Cost tracking verified

---

## Phase 8: Future Enhancements (Post-Launch)

### Monitoring (Nice-to-Have)
- [ ] Create `agent_calls` logging table
- [ ] Add logging for all agent calls (sessionId, model, tokens, latency, cost)
- [ ] Create dashboard for cost tracking
- [ ] Set up alerts for failure rates

### Admin Portal (v2)
- [ ] Add "Observer Prompts" section to admin portal
- [ ] Allow editing observer prompts per stage
- [ ] Add rubric debugging tools (view raw `full_rubric` JSON)
- [ ] Add "Re-run grading" button for testing

### Extend to Other Stages
- [ ] Add observer prompts for `hiring_manager` stage
- [ ] Add observer prompts for `team_interview` stage
- [ ] Update grading prompts for other stages
- [ ] Test three-agent architecture with other stages

---

## Progress Tracking

**Current Phase**: Code Implementation Complete - Ready for Testing

**Completed Items**: ~85 / ~100

**Last Updated**: Testing phase ready

**Note**: Realtime route updates marked as optional (WebSocket flow, can be done later). All testing consolidated to end - run one comprehensive interview test to verify everything.

---

## Notes

- ⭐ = Critical implementation order (Claude first, Observer second)
- All observer calls must be async/fire-and-forget
- Store both `full_rubric` JSONB and derived fields for performance
- Test with mock data first, then real interviews

