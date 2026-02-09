# Three-Agent HR Screen Architecture Integration Plan (Updated)

## Overview

We will evolve the existing single-agent OpenAI-based HR interview flow into the full **three-agent architecture (Interviewer, Real-Time Observer, Post-Interview Grader)** while reusing your current Supabase schema, interview routes, and realtime/text+voice plumbing. The implementation will focus first on the HR screen stage but be designed so the same patterns can be reused for other stages.

---

## High-Level Architecture

### Components & Responsibilities

- **Interviewer Agent (existing, to be formalized)**
  - Use current interviewer logic in `app/api/interview/realtime/route.ts` and `app/api/interview/voice/route.ts` as the **AI Interviewer**.
  - Standardize its interface into an `InterviewerAgent` helper (server-side) that:
    - Accepts `conversationHistory`, `stage`, and `interviewData` (resume, JD, company info).
    - Returns next question/message (text + optional audio) and flow control signals (e.g., `complete`, `conversationPhase`).

- **Observer Agent (new)**
  - A separate server-side module that consumes **live transcript events** (per Q/A turn) and builds structured JSON notes.
  - Runs on **GPT-4o-mini** via OpenAI (same provider, different prompt + schema) to keep cost low.
  - Writes its notes into a new `observer_notes` JSONB field on `interview_sessions`.
  - **CRITICAL**: Observer calls must be **async/fire-and-forget** to not block interview flow.

- **Post-Interview Grader (Claude Sonnet 4)**
  - New provider layer for Anthropic, used in a dedicated grading module and/or `app/api/interview/feedback/route.ts`.
  - Consumes: `transcript_structured`, `observer_notes`, resume, JD, company website, and rubric schema.
  - Produces: **full HR Screen Rubric JSON**; we then map it into the existing `interview_feedback` shape and store the full rubric JSON (either in a new `full_rubric` JSONB column or a strongly typed subset across columns).

### Data Flow (HR Screen)

```
User → InterviewPage → Interviewer routes → Session State (transcript_structured)
                                                      ↓
                                              Observer Agent (async, non-blocking)
                                                      ↓
                                              observer_notes JSONB
                                                      ↓
                                    End Interview → Feedback route
                                                      ↓
                                              Claude Grader
                                                      ↓
                                              full_rubric JSONB
                                                      ↓
                                              Dashboard & Feedback UI
```

---

## Backend Plan

### 1) Database Extensions

- **Extend `interview_sessions`** (in `supabase/schema.sql`):
  - Add `observer_notes JSONB` to store per-question observer output and summary stats.
  - Add `duration_seconds INTEGER` for easy reporting.
  
- **Extend `interview_feedback`**:
  - Add `full_rubric JSONB` to store the full Claude rubric output (including question-level analysis and practice queue).

- **Create `observer_prompts` table** (NEW - for Observer Agent prompts):
  - Structure: `stage TEXT PRIMARY KEY`, `system_prompt TEXT NOT NULL`, `evaluation_criteria JSONB`, `red_flag_keywords TEXT[]`, `quality_indicators JSONB`
  - One row per stage (`hr_screen`, `hiring_manager`, `team_interview`, etc.)
  - Populate with default HR screen observer prompt (from architecture doc)
  - Add RLS policies (admin-only editing, readable by authenticated users)

### 2) Session State & Transcript Structuring

- **Centralize session state updates** in a small server-side helper (e.g. `lib/interview-session.ts`):
  - Methods like `appendMessage({ sessionId, speaker, text, questionId, timestamp })` that:
    - Update `transcript_structured` (add message entries + question tracking) in `interview_sessions`.
    - Optionally compute and store simple stats (per-answer durations using timestamps from frontend).
  - Use this helper in:
    - `app/api/interview/voice/route.ts` (traditional flow).
    - Any new text-only routes (if added).

- **Standardize structured transcript shape**:
  - Confirm/align with existing usage in `app/api/interview/practice/route.ts` where it expects `questions_asked` and `messages`.
  - Ensure your session update helper maintains that structure consistently.

### 3) Post-Interview Grader (Claude Sonnet 4) - **IMPLEMENT FIRST**

**Why Claude first?** (Per Claude's recommendation)
- You can test it with mock observer notes
- Easier to debug one new provider at a time
- Observer needs grading to be working to show value

- **Claude client abstraction**:
  - Add a small client wrapper, e.g. `lib/claude-client.ts`, that:
    - Reads `ANTHROPIC_API_KEY` from env.
    - Exposes a `gradeHrScreen(gradingMaterials)` function calling Claude Sonnet 4 with the long rubric prompt and JSON schema.

- **Refactor `app/api/interview/feedback/route.ts`** into two paths:
  - **A) HR screen (new Claude path)**
    - For `stage === 'hr_screen'`:
      - Fetch from Supabase:
        - `interview_sessions.transcript_structured`, `observer_notes` (can be empty/mock for initial testing), `transcript` (fallback), `user_interview_data` (resume, JD, company_website).
        - `feedback_stage_instructions` and `feedback_evaluation_criteria` as needed to build the rubric prompt.
      - Construct `gradingMaterials` object as in your architecture:
        - Transcript (prefer `transcript_structured` with question IDs and timestamps).
        - Observer notes JSON (can be empty object `{}` for initial testing).
        - Resume, JD, company info, and the 6-area HR rubric.
      - Call `gradeHrScreen(...)` (Claude Sonnet 4).
      - **Validate rubric** using `lib/rubric-validator.ts` (see below).
      - Validate JSON and map into DB:
        - **Store BOTH full rubric AND derived fields** (for performance + backwards compatibility):
          ```typescript
          // 1. Store full rubric
          await supabase.from('interview_feedback').update({
            full_rubric: rubric // Complete JSON from Claude
          });
          
          // 2. ALSO derive key fields for fast queries
          await supabase.from('interview_feedback').update({
            overall_score: rubric.overall_assessment.overall_score,
            hr_screen_six_areas: deriveSixAreas(rubric), // Transform to existing format
            strengths: rubric.overall_assessment.key_strengths,
            weaknesses: rubric.overall_assessment.key_weaknesses,
            area_scores: rubric.traditional_hr_criteria.scores,
            area_feedback: rubric.traditional_hr_criteria.feedback,
            suggestions: rubric.next_steps_preparation.improvement_suggestions,
            detailed_feedback: rubric.overall_assessment.summary
          });
          ```
        - **Why both?**
          - ✅ Fast queries on `overall_score` without parsing JSON
          - ✅ Backwards compatibility with existing feedback display
          - ✅ Can always re-derive if schema changes
          - ✅ Full rubric available for detailed report
  - **B) Non-HR stages (keep OpenAI path for now)**
    - For other stages, keep the existing GPT-4o-mini-based grading path as-is (or lightly refactor later).

- **Rubric Validator** (NEW - per Claude's suggestion):
  - Create `lib/rubric-validator.ts`:
    ```typescript
    export function validateRubric(rubric: any): boolean {
      const required = [
        'overall_assessment',
        'traditional_hr_criteria', 
        'time_management_analysis',
        'question_analysis',
        'next_steps_preparation',
        'comparative_analysis'
      ];
      
      return required.every(field => 
        rubric[field] && Object.keys(rubric[field]).length > 0
      );
    }
    ```
  - Use this before saving to DB to ensure Claude returns complete rubrics.

- **Triggering grading**:
  - Continue to call `/api/interview/feedback` from `endInterview` in `app/interview/page.tsx` (automatic when user clicks "End Interview").
  - The feedback route can now rely more on what's in the DB (`transcript_structured`, `observer_notes`) and use the passed `transcript` only as a backup.

### 4) Real-Time Observer Agent (Full Streaming Behavior) - **IMPLEMENT SECOND**

- **New module** `lib/observer-agent.ts`:
  - Export `recordTurn` and `compileNotes`-style functions:
    - `recordTurn({ sessionId, question, answer, timestamps, stage })`:
      - Fetch or accept the current `observer_notes` JSON for the session.
      - Call OpenAI (GPT-4o-mini) with the real-time observer prompt you specified (adapted into system+user messages) and the partial transcript for this question.
      - Merge returned notes into `observer_notes` (keyed by question ID) and store in `interview_sessions.observer_notes`.
      - **CRITICAL**: This must be **async/fire-and-forget** - don't block the interview flow:
        ```typescript
        // Don't await - let it run in background
        ObserverAgent.recordTurn(...).catch(err => 
          console.error('Observer failed:', err)
        );
        ```
    - `compileNotes({ sessionId })`:
      - Optionally add a final summary pass at the end of the interview to compute aggregate stats and red-flag lists.

- **Where to call the observer**:
  - **Realtime path**: in `app/api/interview/realtime/route.ts` or a new small route that the frontend can call each time a user response is finalized:
    - When a `candidate` answer is transcribed and appended to `transcript_structured`, call `ObserverAgent.recordTurn(...)` in the background (fire-and-forget).
  - **Traditional `/voice` path**: inside `/api/interview/voice` handling after we:
    - Store the user transcript.
    - Know the question ID that was just asked.
    - Call `ObserverAgent.recordTurn` with that Q/A pair (fire-and-forget).

- **Observer Prompt & Schema**:
  - **Fetch observer prompt from database**: Query `observer_prompts` table by `stage` to get the system prompt and evaluation criteria.
  - Implement the JSON schema described in your spec (question id, areas, quality flag, quotes, practice flag, etc.).
  - Persist the raw observer JSON under `observer_notes`, with the following structure:

### Observer Notes JSON Structure

```json
{
  "questions": {
    "q1": {
      "question_id": "q1",
      "question_text": "Tell me about yourself",
      "timestamp_asked": "2:30",
      "quality_flag": "strong",
      "observations": {
        "used_star_method": true,
        "provided_metrics": true,
        "gave_timeframes": true
      },
      "notable_quote": "I increased engagement by 30% in Q2",
      "flag_for_practice": false,
      "practice_priority": null
    },
    "q3": {
      "question_id": "q3",
      "question_text": "Digital marketing experience?",
      "timestamp_asked": "6:45",
      "quality_flag": "weak",
      "observations": {
        "used_star_method": false,
        "provided_metrics": false,
        "gave_timeframes": false
      },
      "notable_quote": "I have experience with digital marketing",
      "flag_for_practice": true,
      "practice_priority": "high"
    }
  },
  "summary": {
    "total_questions": 8,
    "strong_answers": 3,
    "weak_answers": 2,
    "red_flags": [],
    "best_moment": "q1",
    "weakest_moment": "q3",
    "overall_impression": "Professional and prepared, but lacks specific examples"
  }
}
```

### 5) Question Bank Generation (Pre-Interview)

- **Question generation function** (optional for v1):
  - Add `lib/question-bank.ts` with `generateQuestions({ resume, jobDescription, stage })` using OpenAI.
  - For HR screen, you can:
    - Either pre-generate and store a `question_bank` on `interview_sessions`.
    - Or rely on your current `interview_prompts.system_prompt` + free-form question generation (which you already mostly do).
  - In v1 we can simply design the `question_bank` type and keep generation logic minimal, since your Interviewer is already question-driven via prompt.

---

## Frontend Plan

### 6) Interview Page Enhancements (`app/interview/page.tsx`)

- **Leverage existing HR flow**:
  - You already handle:
    - Stage selection (`hr_screen`, etc.).
    - Realtime vs. traditional `/voice` fallback.
    - Session creation and completion.
    - Redirection to `/interview/feedback`.

- **Add structured event hooks for observer**:
  - When a user answer is finalized and sent to `/api/interview/voice` or Realtime, ensure the server routes:
    - Capture timestamps (start/end) or at least approximate duration (you already track `interviewStartTimeRef` and can compute per-turn durations client-side and send them in the request body or form data).
  - The main required frontend change is to **include per-answer timing metadata** so the observer can track durations.

- **No major UI changes required for three-agent architecture in v1**:
  - Keep the existing microphone visual, current speaker message display, and text-input alternative.

### 7) Feedback UI & Dashboard

- **`app/interview/feedback/page.tsx`** (not inspected but assumed):
  - Extend to consume extra fields:
    - 6-area assessment (`hr_screen_six_areas`) you already added in the backend.
    - Optionally, show structured strengths/weaknesses, and later per-question analysis from `full_rubric`.
  - Add a simple **"Practice queue"** section using the question IDs and flags derived in the Claude rubric and/or observer notes (for now, can be a list of question texts with links into `app/interview/practice`).

- **Dashboard (`app/dashboard/page.tsx`)**:
  - Later, use `interview_sessions` + `interview_feedback` (`overall_score`, `duration_seconds`) to show aggregated metrics.

### 8) Practice Mode Integration (`app/api/interview/practice/route.ts` & `app/interview/practice`)

- **Connect with observer + grader outputs**:
  - Use `assessmentArea` already returned by the practice API and cross-reference with:
    - Observer's `should_practice` flags per question.
    - Claude's rubric `practice_queue` (to be included in `full_rubric`).
  - This linkage is mostly **data-model & UI**; the core practice route already exists.

---

## Third-Party & Configuration

### 9) Anthropic Integration

- **Env & config**:
  - Add `ANTHROPIC_API_KEY` to your environment and README (`SETUP_INSTRUCTIONS.md`).
  - Introduce a simple provider abstraction (e.g. `lib/llm-providers.ts`) with a `ModelProvider` type to keep Claude-specific code in one place.

- **Security & cost controls**:
  - Ensure HR grading route is only callable when a session is completed and belongs to the current user (you already check session ownership via Supabase RLS + explicit checks).
  - Optionally cap transcript lengths and observer-notes size before sending to Claude to keep costs predictable.

---

## Incremental Rollout Steps (UPDATED ORDER)

1. **Schema Updates**
   - Add `observer_notes JSONB`, `full_rubric JSONB`, and `duration_seconds INTEGER` to Supabase.

2. **Session State Helper**
   - Implement `InterviewSessionState` helper in `lib` and refactor `/api/interview/voice` and realtime route to use it to keep `transcript_structured` consistent.

3. **Claude Grader FIRST** ⭐ (Reordered per Claude's recommendation)
   - Implement `claude-client.ts` and `rubric-validator.ts`.
   - Refactor `/api/interview/feedback` HR-screen path to use Sonnet 4 with rubric+observer notes (can use empty `{}` for observer notes initially for testing).
   - Store `full_rubric` and validate before saving.

4. **Observer Agent SECOND** ⭐ (Reordered per Claude's recommendation)
   - Implement `ObserverAgent` module with async/fire-and-forget `recordTurn` calls.
   - Wire `recordTurn` calls from `/api/interview/voice` (and optionally realtime callbacks) for HR screen.
   - Ensure observer calls don't block interview flow.

5. **Frontend Wiring**
   - Ensure `endInterview` still calls `/api/interview/feedback` (automatic trigger confirmed).
   - Update `feedback` page to surface 6-area HR assessment and any new summary fields.
   - Add practice queue UI linking to practice mode.

6. **Extend to Other Stages (Later)**
   - Reuse the same pattern (observer + Claude grading) for `hiring_manager` and `team_interview` once HR flow is solid.

---

## Implementation Todos

- `db-extend`
  - Add `observer_notes`, `full_rubric` (and `duration_seconds`) to Supabase schema, plus any necessary RLS updates.
  - **Create `observer_prompts` table** with structure: `stage`, `system_prompt`, `evaluation_criteria`, `red_flag_keywords`, `quality_indicators`.
  - Insert default HR screen observer prompt (from architecture doc `observer_prompt.md`).
  - Add RLS policies for `observer_prompts` (admin-only editing, readable by authenticated).

- `session-helper`
  - Create a `lib/interview-session` helper that centralizes transcript and structured state management and integrates timestamps.

- `claude-grader` ⭐ **FIRST**
  - Integrate Anthropic Sonnet 4 via a small client wrapper.
  - Create `lib/rubric-validator.ts` with validation function.
  - Refactor HR-screen grading in `/api/interview/feedback` to use the three-agent materials (transcript, observer notes, resume/JD).
  - Test with mock/empty observer notes initially.

- `observer-agent` ⭐ **SECOND**
  - Implement `ObserverAgent` with GPT-4o-mini.
  - **Fetch observer prompt from `observer_prompts` table** by stage (e.g., `hr_screen`).
  - Ensure all `recordTurn` calls are async/fire-and-forget (don't block interview flow).
  - Wire it into the per-turn server routes to update `interview_sessions.observer_notes`.

- `frontend-wireup`
  - Pass timing metadata from `InterviewPage` to the backend.
  - Update the feedback UI to display 6-area HR assessment and selected rubric highlights.
  - Add practice queue section.

---

## Key Implementation Notes

### Observer Timing (Critical)
- **All observer calls must be async/fire-and-forget**:
  ```typescript
  // Don't await - let it run in background
  ObserverAgent.recordTurn({
    sessionId,
    question: currentQuestion,
    answer: userResponse,
    timestamps: { start, end },
    stage: 'hr_screen'
  }).catch(err => 
    console.error('Observer failed (non-blocking):', err)
  );
  ```

### Grading Trigger
- **Automatic**: When user clicks "End Interview" in `app/interview/page.tsx`, `endInterview()` calls `/api/interview/feedback` automatically. No manual trigger needed.

### Frontend Integration
- **No major UI changes required** for three-agent architecture in v1. The system is backend-only. Frontend just:
  1. Conducts interview (existing)
  2. Calls grading endpoint (existing)
  3. Displays richer feedback (enhanced with new rubric fields)

### Practice Queue Connection
- Observer flags `should_practice: true` per question.
- Grader populates `practice_recommendations.immediate_focus_areas` in `full_rubric`.
- Dashboard shows "Master These Questions" cards linking to practice mode.

---

## Error Handling & Fallbacks

### Observer Failures (Non-Critical)
- Observer errors are logged but don't fail the interview
- If observer fails, grading proceeds with empty `observer_notes: {}`
- Add monitoring/alerts for observer failure rate > 5%
- Observer calls are async/fire-and-forget, so failures don't block interview flow

### Grader Failures (Critical)
- **Retry logic**: 3 attempts with exponential backoff
- **Fallback**: If Claude fails after 3 attempts, use GPT-4o grading (existing path)
- **User notification**: "Feedback delayed - processing in background"
- **Background job**: Retry grading every 5 minutes for up to 1 hour
- Keep session in "grading" status until successfully saved

### Database Failures
- Transaction rollbacks if rubric storage fails
- Keep session in "grading" status until successfully saved
- Admin dashboard to view stuck sessions (future enhancement)

---

## Testing Strategy

1. **Claude Grader (Test First)**:
   - Test with mock transcript and empty observer notes.
   - Verify rubric validation passes.
   - Check that `full_rubric` is stored correctly.

2. **Observer Agent (Test Second)**:
   - Test with a single Q/A turn.
   - Verify notes are stored in `observer_notes`.
   - Ensure async calls don't block interview flow.

3. **Full Integration**:
   - Run a complete HR screen interview.
   - Verify observer notes accumulate during interview.
   - Verify Claude grader uses observer notes in final rubric.
   - Check feedback UI displays all new fields.

---

## Cost Estimates (Per Interview)

- **Interviewer**: GPT-4o (existing) - ~$0.10-0.20
- **Observer**: GPT-4o-mini - ~$0.02-0.05
- **Grader**: Claude Sonnet 4 - ~$0.30-0.50
- **Total**: ~$0.42-0.75 per HR screen interview

---

## Summary

This plan implements the three-agent architecture while:
1. **Reusing existing code** (Interviewer, practice, feedback routes)
2. **Extending schema minimally** (just 2 JSONB columns + duration)
3. **Adding two new agents** (Observer + Grader) without disrupting current flow
4. **Maintaining cost efficiency** (GPT-4o-mini for observation, Claude for deep analysis)
5. **Incrementally rollable** (can test each agent separately, Claude first, then Observer)

The key changes from the original plan:
- ✅ **Reordered implementation**: Claude grader first, Observer second
- ✅ **Added rubric validator**: Ensures complete rubrics before saving
- ✅ **Async observer calls**: Fire-and-forget to not block interview flow
- ✅ **Confirmed automatic grading**: No manual trigger needed

**Ready to build!** 🚀

---

## Pre-Launch Checklist

### Database
- [ ] Run migration: Add `observer_notes`, `full_rubric`, `duration_seconds` columns
- [ ] Create `observer_prompts` table
- [ ] Seed `observer_prompts` with HR screen prompt
- [ ] Update `feedback_stage_instructions` with grading prompt for HR screen
- [ ] Test RLS policies for new tables

### Environment
- [ ] Add `ANTHROPIC_API_KEY` to `.env.local`
- [ ] Add `ANTHROPIC_API_KEY` to production environment (Vercel/hosting)
- [ ] Update `SETUP_INSTRUCTIONS.md` with Anthropic setup
- [ ] Set cost alert thresholds in Anthropic dashboard

### Code
- [ ] Implement `lib/claude-client.ts`
- [ ] Implement `lib/rubric-validator.ts`
- [ ] Implement `lib/observer-agent.ts`
- [ ] Implement `lib/interview-session.ts` helper
- [ ] Update `/api/interview/feedback/route.ts` with Claude path
- [ ] Add async observer calls to `/api/interview/voice/route.ts`
- [ ] Add observer calls to `/api/interview/realtime/route.ts` (if using)

### Frontend
- [ ] Update feedback page to display `full_rubric` fields
- [ ] Add practice queue UI
- [ ] Add detailed rubric report component (`DetailedRubricReport.tsx`)
- [ ] Test on multiple devices (voice recording timing)

### Testing
- [ ] Unit test: `rubric-validator.ts`
- [ ] Unit test: Observer JSON parsing
- [ ] Integration test: Claude grader with mock data
- [ ] Integration test: Observer with single Q/A
- [ ] E2E test: Complete HR interview → grading → feedback display
- [ ] Load test: 10 concurrent interviews (check observer doesn't block)
- [ ] Cost test: Run 5 interviews, verify cost < $4.00
- [ ] Error test: Kill Claude API mid-request, verify fallback works

### Documentation
- [ ] Update README with three-agent architecture diagram
- [ ] Document observer notes schema
- [ ] Document full rubric schema
- [ ] Add troubleshooting guide for common issues

