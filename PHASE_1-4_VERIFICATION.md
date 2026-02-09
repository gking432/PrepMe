# Phase 1-4 Verification Guide

This guide helps you verify and complete the remaining unchecked items from Phases 1-4.

---

## Phase 1: Database Extensions

### ✅ Already Done:
- Migration SQL run successfully
- All columns and tables created

### 🔍 Remaining Tasks:

#### 1. Test Database Migrations in Development

**What to do:**
1. Open Supabase dashboard → Table Editor
2. Check these tables/columns exist:

**For `interview_sessions` table:**
- [ ] Column `observer_notes` exists (type: jsonb)
- [ ] Column `duration_seconds` exists (type: integer)

**For `interview_feedback` table:**
- [ ] Column `full_rubric` exists (type: jsonb)

**For `observer_prompts` table:**
- [ ] Table exists
- [ ] Has row with `stage = 'hr_screen'`
- [ ] `system_prompt` field has content

**Quick SQL to verify:**
```sql
-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interview_sessions' 
AND column_name IN ('observer_notes', 'duration_seconds');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interview_feedback' 
AND column_name = 'full_rubric';

-- Check observer_prompts table
SELECT stage, LENGTH(system_prompt) as prompt_length 
FROM observer_prompts 
WHERE stage = 'hr_screen';
```

**Expected results: Should see both columns for `interview_sessions`, `full_rubric` for `interview_feedback`, and one row in `observer_prompts`.

---

#### 2. Verify RLS Policies Work Correctly

**What to do:**
1. In Supabase dashboard → Authentication → Users
2. Note a test user's ID (or use your own)
3. Run these queries in SQL Editor:

**Test 1: Authenticated user can read observer prompts**
```sql
-- This should work (assuming you're authenticated in Supabase dashboard)
SELECT * FROM observer_prompts WHERE stage = 'hr_screen';
```

**Test 2: Try to insert (should work, but app logic restricts to admins)**
```sql
-- This should work from SQL editor (admin context)
-- But in app, only admins should be able to do this
INSERT INTO observer_prompts (stage, system_prompt) 
VALUES ('test_stage', 'Test prompt')
ON CONFLICT (stage) DO NOTHING;
```

**Expected:** Policies allow reads, but app-level checks restrict writes to admins.

---

## Phase 2: Session State Helper

### ✅ Already Done:
- Helper functions created
- Voice route refactored

### 🔍 Remaining Tasks:

#### 1. Refactor `app/api/interview/realtime/route.ts` (if using)

**Question:** Are you using the realtime route, or just the voice route?

**If using realtime:**
- [ ] Need to add session helper calls to realtime route
- [ ] Add observer calls to realtime route

**If NOT using realtime:**
- [x] Can skip this (mark as N/A)

**How to check:** Look at `app/interview/page.tsx` - does it call `/api/interview/realtime`?

---

#### 2. Test Session Helper with Sample Data

**What to do:**
1. Create a test script or use Supabase SQL to verify:

**Test in Supabase SQL Editor:**
```sql
-- Create a test session
INSERT INTO interview_sessions (user_id, stage, status)
VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Use your user ID
  'hr_screen',
  'in_progress'
)
RETURNING id;

-- Note the returned session ID, then check transcript_structured:
SELECT transcript_structured 
FROM interview_sessions 
WHERE id = '<session-id-from-above>';
```

**Or test via API:**
- Start a test interview
- Check that `transcript_structured` is being populated
- Verify structure matches expected format

---

#### 3. Verify `transcript_structured` Format Matches Practice Route

**What to do:**
1. Look at `app/api/interview/practice/route.ts` (lines 107-147)
2. It expects:
   - `transcript_structured.questions_asked` (array)
   - `transcript_structured.messages` (array)
   - Each question has `id`, `question`, `timestamp`
   - Each message has `speaker`, `text`, `timestamp`, optional `question_id`

**Verify:**
- [ ] Run a test interview
- [ ] Check `transcript_structured` in database
- [ ] Verify it has `questions_asked` and `messages` arrays
- [ ] Verify structure matches what practice route expects

**Quick check SQL:**
```sql
SELECT 
  transcript_structured->'questions_asked' as questions,
  transcript_structured->'messages' as messages
FROM interview_sessions 
WHERE stage = 'hr_screen' 
AND transcript_structured IS NOT NULL
LIMIT 1;
```

---

## Phase 3: Claude Grader

### ✅ Already Done:
- Code implemented
- API key added

### 🔍 Remaining Tasks:

#### 1. Add Unit Tests for Validator (Optional for now)

**Can skip for MVP** - unit tests can be added later. The validator is simple and will be tested during integration.

**If you want to add:**
- [ ] Create `lib/__tests__/rubric-validator.test.ts`
- [ ] Test valid rubric
- [ ] Test invalid rubric (missing fields)

---

#### 2. Test Claude Grader with Mock Data

**What to do:**
1. Create a test script or use Postman/curl to test the feedback endpoint

**Test via API call:**
```bash
# In your terminal (after starting dev server)
curl -X POST http://localhost:3000/api/interview/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<a-completed-session-id>",
    "transcript": "Interviewer: Tell me about yourself.\nYou: I am a software engineer..."
  }'
```

**Or test manually:**
- [ ] Complete an HR screen interview
- [ ] Check that feedback is generated
- [ ] Verify `full_rubric` is stored in database
- [ ] Verify derived fields are also stored

**Check in database:**
```sql
SELECT 
  overall_score,
  hr_screen_six_areas,
  full_rubric->'overall_assessment' as overall_assessment,
  full_rubric->'question_analysis' as question_analysis
FROM interview_feedback 
WHERE interview_session_id = '<session-id>'
ORDER BY created_at DESC
LIMIT 1;
```

---

#### 3-5. Verify Rubric Validation, Storage, Error Handling

**All can be tested together:**
- [ ] Run a test interview
- [ ] Check logs for validation messages
- [ ] Verify `full_rubric` JSONB is populated
- [ ] Verify derived fields match `full_rubric` content
- [ ] Test error: Temporarily break API key → should fallback to OpenAI

---

## Phase 4: Observer Agent

### ✅ Already Done:
- Code implemented
- Wired into voice route

### 🔍 Remaining Tasks:

#### 1. Update Realtime Route (if using)

**Same as Phase 2** - check if you're using realtime route.

---

#### 2-5. Test Observer Functionality

**All can be tested together with one interview:**

**Test Steps:**
1. [ ] Start an HR screen interview
2. [ ] Answer a few questions
3. [ ] Check database during interview:
   ```sql
   SELECT observer_notes 
   FROM interview_sessions 
   WHERE id = '<current-session-id>';
   ```
4. [ ] Verify `observer_notes.questions` has entries
5. [ ] Verify notes accumulate as you answer more questions
6. [ ] Complete interview
7. [ ] Check that `observer_notes.summary` is populated
8. [ ] Verify interview didn't hang or block (observer is async)

**Check observer notes structure:**
```sql
SELECT 
  observer_notes->'questions' as questions,
  observer_notes->'summary' as summary
FROM interview_sessions 
WHERE id = '<session-id>';
```

**Expected:** Should see question IDs as keys, each with quality_flag, observations, etc.

---

## Quick Verification Checklist

**Run this after completing above:**

- [ ] Database has all new columns/tables
- [ ] Can query `observer_prompts` table
- [ ] `transcript_structured` is populated during interviews
- [ ] `observer_notes` accumulates during interviews
- [ ] `full_rubric` is stored after interview completes
- [ ] Feedback page loads without errors
- [ ] No console errors during interview flow

---

## Need Help?

If you run into issues:
1. Check browser console for errors
2. Check server logs (terminal running `npm run dev`)
3. Check Supabase logs (dashboard → Logs)
4. Verify environment variables are set

Let me know which items you want to tackle first!

