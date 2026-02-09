# Comprehensive Testing Guide - Three-Agent Architecture

Run this **after** all code implementation is complete. One full interview test will verify most items.

---

## Pre-Test Setup

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Verify environment:**
   - [ ] `ANTHROPIC_API_KEY` is set in `.env.local`
   - [ ] `OPENAI_API_KEY` is set (for observer)
   - [ ] Supabase connection works

3. **Have test data ready:**
   - [ ] Resume text (can be simple)
   - [ ] Job description text (can be simple)
   - [ ] Company website (optional)

---

## Single Comprehensive Test: Full HR Screen Interview

**This one test will verify:**
- ✅ Session helper works
- ✅ Transcript structured correctly
- ✅ Observer takes notes
- ✅ Observer notes accumulate
- ✅ Claude grader works
- ✅ Full rubric stored
- ✅ Derived fields stored
- ✅ Error handling (if issues occur)

### Test Steps:

**1. Start Interview**
- Go to interview page
- Select HR screen stage
- Upload resume + job description (or use existing)
- Click "Begin Interview"

**2. Answer 3-5 Questions**
- Answer naturally (doesn't need to be perfect)
- Let interview complete (or click "End Interview" after a few questions)

**3. Check Database During Interview (Optional)**
Open Supabase SQL Editor and run:
```sql
-- Check transcript is being structured
SELECT 
  id,
  transcript_structured->'questions_asked' as questions,
  transcript_structured->'messages' as messages
FROM interview_sessions 
WHERE status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;

-- Check observer notes are accumulating
SELECT 
  observer_notes->'questions' as observer_questions,
  observer_notes->'summary' as observer_summary
FROM interview_sessions 
WHERE status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;
```

**4. After Interview Completes**
Wait for feedback to generate (should redirect to feedback page), then check:

```sql
-- Check full rubric is stored
SELECT 
  overall_score,
  hr_screen_six_areas,
  full_rubric->'overall_assessment' as overall_assessment,
  full_rubric->'question_analysis' as question_analysis,
  full_rubric->'next_steps_preparation'->'practice_recommendations' as practice_queue
FROM interview_feedback 
ORDER BY created_at DESC
LIMIT 1;

-- Check observer notes final state
SELECT 
  observer_notes->'summary' as final_summary,
  jsonb_object_keys(observer_notes->'questions') as question_ids
FROM interview_sessions 
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
```

**5. Verify Feedback Page**
- [ ] Page loads without errors
- [ ] Shows overall score
- [ ] Shows 6-area assessment (if implemented in UI)
- [ ] Shows strengths/weaknesses

---

## What to Check:

### ✅ Session Helper Working:
- `transcript_structured.questions_asked` has question objects
- `transcript_structured.messages` has message objects
- Questions have: `id`, `question`, `timestamp`, `assessment_areas`
- Messages have: `speaker`, `text`, `timestamp`, `question_id` (when applicable)

### ✅ Observer Working:
- `observer_notes.questions` has entries (one per question answered)
- Each question note has: `quality_flag`, `observations`, `flag_for_practice`
- `observer_notes.summary` has: `total_questions`, `strong_answers`, `weak_answers`
- Notes accumulate as you answer more questions

### ✅ Claude Grader Working:
- `full_rubric` JSONB is populated
- `full_rubric.overall_assessment.overall_score` exists
- `full_rubric.hr_screen_six_areas` exists
- Derived fields match: `overall_score`, `hr_screen_six_areas`, `strengths`, `weaknesses` all populated

### ✅ Error Handling:
- Check server logs (terminal) for any errors
- Observer errors should be logged but not break interview
- If Claude fails, should fallback to OpenAI (check logs)

---

## Expected Results:

**If everything works:**
- Interview completes normally
- Feedback page shows results
- Database has:
  - `transcript_structured` with proper format
  - `observer_notes` with question-by-question analysis
  - `full_rubric` with complete Claude output
  - All derived fields populated

**If something fails:**
- Check browser console for errors
- Check server terminal logs
- Check Supabase logs
- Report what you see and we'll debug

---

## Quick Verification Queries:

**After test interview, run these:**

```sql
-- 1. Verify transcript structure
SELECT 
  jsonb_array_length(transcript_structured->'questions_asked') as question_count,
  jsonb_array_length(transcript_structured->'messages') as message_count
FROM interview_sessions 
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;

-- 2. Verify observer notes
SELECT 
  jsonb_object_keys(observer_notes->'questions') as question_ids,
  observer_notes->'summary'->'total_questions' as total_questions,
  observer_notes->'summary'->'strong_answers' as strong_count
FROM interview_sessions 
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;

-- 3. Verify Claude rubric
SELECT 
  overall_score,
  full_rubric->'overall_assessment'->>'overall_score' as rubric_score,
  full_rubric->'hr_screen_six_areas'->'what_went_well' as went_well,
  full_rubric->'hr_screen_six_areas'->'what_needs_improve' as needs_improve
FROM interview_feedback 
ORDER BY created_at DESC
LIMIT 1;
```

---

## What to Report:

After running the test, tell me:
1. Did the interview complete successfully?
2. Did feedback generate?
3. What do the SQL queries return?
4. Any errors in console/logs?
5. Does the feedback page display correctly?

Based on results, we'll either:
- Mark everything complete ✅
- Debug any issues 🔧
- Move to Phase 5 (Frontend enhancements) 🎨

