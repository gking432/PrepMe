# Phase 1-5 Testing Guide

Systematic testing for all implemented phases. Run these tests in order.

---

## Phase 1: Database Extensions ✅ (Already Verified)

**Status:** ✅ Complete - You already verified this

**What was tested:**
- [x] `observer_notes` column exists in `interview_sessions`
- [x] `duration_seconds` column exists in `interview_sessions`
- [x] `full_rubric` column exists in `interview_feedback`
- [x] `observer_prompts` table exists with HR screen prompt
- [x] RLS policies are in place

**No action needed** - Already verified.

---

## Phase 2: Session State Helper Testing

### Test 2.1: Verify Session Helper Functions Work

**What to test:** Session helper creates proper `transcript_structured` format

**Steps:**
1. Start a short HR screen interview (answer 2-3 questions)
2. Check database during interview:

```sql
SELECT 
  id,
  transcript_structured->'questions_asked' as questions,
  transcript_structured->'messages' as messages,
  transcript_structured->'start_time' as start_time
FROM interview_sessions 
WHERE status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `questions` is a JSON array with question objects
- [ ] Each question has: `id`, `question`, `timestamp`, `assessment_areas`
- [ ] `messages` is a JSON array with message objects
- [ ] Each message has: `speaker`, `text`, `timestamp`
- [ ] Messages with `question_id` link to questions
- [ ] `start_time` is a valid timestamp

**If fails:** Check `app/api/interview/voice/route.ts` - session helper calls

---

### Test 2.2: Verify Transcript Format Matches Practice Route

**What to test:** Practice route can read `transcript_structured`

**Steps:**
1. After interview, check structure matches what practice route expects:

```sql
SELECT 
  jsonb_array_length(transcript_structured->'questions_asked') as question_count,
  jsonb_array_length(transcript_structured->'messages') as message_count,
  transcript_structured->'questions_asked'->0 as first_question,
  transcript_structured->'messages'->0 as first_message
FROM interview_sessions 
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `question_count` > 0
- [ ] `message_count` > 0
- [ ] First question has: `id`, `question`, `timestamp`
- [ ] First message has: `speaker`, `text`, `timestamp`

**If fails:** Check session helper format matches practice route expectations

---

## Phase 3: Claude Grader Testing

### Test 3.1: Verify Claude Grader is Called

**What to test:** Claude grader is invoked for HR screen interviews

**Steps:**
1. Complete an HR screen interview (3-5 questions minimum)
2. Check server logs (terminal running `npm run dev`) for:
   - `🎯 Using Claude Sonnet 4 for HR screen grading`
   - `✅ Claude grading successful, rubric validated`

**Expected Results:**
- [ ] Logs show Claude grader being called
- [ ] No errors about missing API key
- [ ] Rubric validation passes

**If fails:** Check `ANTHROPIC_API_KEY` is set in `.env.local`

---

### Test 3.2: Verify Full Rubric is Stored

**What to test:** `full_rubric` JSONB contains complete Claude output

**Steps:**
1. After interview completes, check database:

```sql
SELECT 
  id,
  overall_score,
  full_rubric->'overall_assessment'->>'overall_score' as rubric_score,
  full_rubric->'overall_assessment'->>'summary' as summary,
  full_rubric->'hr_screen_six_areas'->'what_went_well' as went_well,
  full_rubric->'hr_screen_six_areas'->'what_needs_improve' as needs_improve,
  full_rubric->'next_steps_preparation'->'practice_recommendations'->'immediate_focus_areas' as practice_queue
FROM interview_feedback 
WHERE interview_session_id = '<your-session-id>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `full_rubric` is not null
- [ ] `overall_assessment` exists with `overall_score` and `summary`
- [ ] `hr_screen_six_areas` exists with `what_went_well` and `what_needs_improve` arrays
- [ ] `practice_recommendations.immediate_focus_areas` exists (array)
- [ ] `rubric_score` matches `overall_score` (derived field)

**If fails:** Check Claude API response format, validator might be rejecting

---

### Test 3.3: Verify Derived Fields are Stored

**What to test:** Derived fields match `full_rubric` content

**Steps:**
1. Check derived fields:

```sql
SELECT 
  overall_score,
  hr_screen_six_areas,
  strengths,
  weaknesses,
  suggestions,
  full_rubric->'overall_assessment'->'key_strengths' as rubric_strengths,
  full_rubric->'overall_assessment'->'key_weaknesses' as rubric_weaknesses
FROM interview_feedback 
WHERE interview_session_id = '<your-session-id>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `overall_score` matches `full_rubric.overall_assessment.overall_score`
- [ ] `hr_screen_six_areas` matches `full_rubric.hr_screen_six_areas`
- [ ] `strengths` matches `full_rubric.overall_assessment.key_strengths`
- [ ] `weaknesses` matches `full_rubric.overall_assessment.key_weaknesses`

**If fails:** Check feedback route derivation logic

---

### Test 3.4: Test Error Handling (Claude Fallback)

**What to test:** If Claude fails, falls back to OpenAI

**Steps:**
1. Temporarily break Anthropic API key in `.env.local`:
   ```
   ANTHROPIC_API_KEY=invalid_key
   ```
2. Restart dev server
3. Complete an interview
4. Check logs for fallback message
5. Check database - should still have feedback (from OpenAI)

**Expected Results:**
- [ ] Logs show: `⚠️ Falling back to OpenAI grader`
- [ ] Feedback is still generated (from OpenAI)
- [ ] `full_rubric` might be null (if OpenAI path doesn't populate it)

**If fails:** Check error handling in feedback route

**After test:** Restore correct `ANTHROPIC_API_KEY`

---

## Phase 4: Observer Agent Testing

### Test 4.1: Verify Observer Notes Accumulate

**What to test:** Observer takes notes during interview

**Steps:**
1. Start an HR screen interview
2. Answer 3-5 questions
3. Check database during interview (before it ends):

```sql
SELECT 
  observer_notes->'questions' as observer_questions,
  observer_notes->'summary'->>'total_questions' as total_questions,
  observer_notes->'summary'->>'strong_answers' as strong_count,
  observer_notes->'summary'->>'weak_answers' as weak_count
FROM interview_sessions 
WHERE status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `observer_questions` is a JSON object (not null)
- [ ] Has entries keyed by question ID (e.g., `q1`, `q2`, etc.)
- [ ] Each question note has: `quality_flag`, `observations`, `flag_for_practice`
- [ ] `total_questions` increases as you answer more questions
- [ ] `strong_count` or `weak_count` > 0

**If fails:** Check observer agent is being called in voice route

---

### Test 4.2: Verify Observer Notes Structure

**What to test:** Observer notes have correct structure per question

**Steps:**
1. After answering a few questions, check specific question note:

```sql
SELECT 
  observer_notes->'questions'->'q1' as first_question_note
FROM interview_sessions 
WHERE status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Note has `question_id`, `question_text`, `quality_flag`
- [ ] `quality_flag` is one of: `"strong"`, `"okay"`, `"weak"`
- [ ] `observations` object exists with fields like `used_star_method`, `provided_metrics`, etc.
- [ ] `flag_for_practice` is boolean
- [ ] `practice_priority` is `"high"`, `"medium"`, `"low"`, or `null`

**If fails:** Check observer agent JSON parsing

---

### Test 4.3: Verify Observer Doesn't Block Interview

**What to test:** Interview continues even if observer is slow/fails

**Steps:**
1. Start interview
2. Answer questions quickly (don't wait)
3. Verify interview flow is smooth (no delays)
4. Check logs for observer errors (should not block)

**Expected Results:**
- [ ] Interview continues smoothly
- [ ] No noticeable delays between Q/A
- [ ] Observer errors (if any) are logged but don't stop interview
- [ ] Interview completes successfully

**If fails:** Check observer calls are fire-and-forget (not awaited)

---

### Test 4.4: Verify Observer Compilation on Interview End

**What to test:** Final summary is compiled when interview ends

**Steps:**
1. Complete an interview
2. Check final observer notes:

```sql
SELECT 
  observer_notes->'summary' as final_summary,
  observer_notes->'summary'->>'best_moment' as best_moment,
  observer_notes->'summary'->>'weakest_moment' as weakest_moment,
  observer_notes->'summary'->>'overall_impression' as overall_impression
FROM interview_sessions 
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `final_summary` exists
- [ ] `best_moment` and `weakest_moment` are question IDs (e.g., `"q2"`)
- [ ] `overall_impression` is a string describing performance
- [ ] Summary stats are accurate (total_questions, strong_answers, weak_answers)

**If fails:** Check `compileNotes` is called via API route

---

### Test 4.5: Test Observer Failure Handling

**What to test:** Interview continues if observer fails

**Steps:**
1. Temporarily break OpenAI API key (or observer prompt)
2. Complete an interview
3. Verify interview still completes
4. Check logs for observer errors

**Expected Results:**
- [ ] Interview completes successfully
- [ ] Observer errors are logged but don't crash
- [ ] `observer_notes` might be empty or partial (acceptable)
- [ ] Feedback still generates (even without observer notes)

**After test:** Restore correct API key

---

## Phase 5: Frontend Wiring Testing

### Test 5.1: Verify Duration is Calculated

**What to test:** `duration_seconds` is stored when interview ends

**Steps:**
1. Complete an interview
2. Check database:

```sql
SELECT 
  id,
  duration_seconds,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as calculated_duration
FROM interview_sessions 
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `duration_seconds` is not null
- [ ] `duration_seconds` approximately matches `calculated_duration` (within 5 seconds)

**If fails:** Check duration calculation in `endInterview()`

---

### Test 5.2: Verify Feedback Page Displays Full Rubric Data

**What to test:** Feedback page shows data from `full_rubric`

**Steps:**
1. Complete an interview
2. Navigate to feedback page
3. Check browser console for errors
4. Verify UI shows:
   - Overall score
   - 6-area assessment (what went well / needs improve)
   - Practice queue section (if items exist)

**Expected Results:**
- [ ] No console errors
- [ ] 6-area assessment displays correctly
- [ ] Practice queue section appears (if `immediate_focus_areas` exists)
- [ ] Strengths/weaknesses display from `full_rubric`

**If fails:** Check feedback page data loading logic

---

### Test 5.3: Verify Practice Queue Links Work

**What to test:** Practice queue links to practice mode

**Steps:**
1. On feedback page, find practice queue section
2. Click "Practice" button for an area
3. Verify it navigates to practice mode
4. Verify practice mode loads correctly

**Expected Results:**
- [ ] Practice buttons are clickable
- [ ] Navigation works
- [ ] Practice mode loads with correct question/context

**If fails:** Check practice queue link generation

---

## Quick Verification Checklist

After running all tests, verify:

- [ ] **Phase 1:** Database structure correct ✅ (already done)
- [ ] **Phase 2:** Session helper creates proper transcript structure
- [ ] **Phase 3:** Claude grader generates and stores full rubric
- [ ] **Phase 4:** Observer takes notes and compiles summary
- [ ] **Phase 5:** Frontend displays all new data correctly

---

## Test Results Template

Copy this and fill in as you test:

```
## Test Results - [Date]

### Phase 2: Session Helper
- [ ] Test 2.1: Session helper functions
- [ ] Test 2.2: Transcript format matches practice route

### Phase 3: Claude Grader
- [ ] Test 3.1: Claude grader is called
- [ ] Test 3.2: Full rubric is stored
- [ ] Test 3.3: Derived fields match rubric
- [ ] Test 3.4: Error handling (fallback)

### Phase 4: Observer Agent
- [ ] Test 4.1: Observer notes accumulate
- [ ] Test 4.2: Observer notes structure
- [ ] Test 4.3: Observer doesn't block interview
- [ ] Test 4.4: Observer compilation on end
- [ ] Test 4.5: Observer failure handling

### Phase 5: Frontend Wiring
- [ ] Test 5.1: Duration calculated
- [ ] Test 5.2: Feedback page displays data
- [ ] Test 5.3: Practice queue links work

### Issues Found:
[List any issues here]

### Next Steps:
[What needs to be fixed]
```

---

## Need Help?

If a test fails:
1. Check the relevant code file mentioned
2. Check server logs (terminal)
3. Check browser console
4. Check Supabase logs (dashboard)
5. Report the specific test and error message

Let's go through these systematically!

