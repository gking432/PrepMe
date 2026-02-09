# Quick Feedback Diagnostic

Run these checks to identify why feedback isn't generating.

## Step 1: Check Server Logs

When you end an interview, check your **server terminal** (where `npm run dev` is running) for:

### Expected Logs (Good):
```
📥 Feedback API called with sessionId: [uuid]
📥 Fetched transcript from database, length: [number]
📥 Using transcript length: [number]
🎯 Using Claude Sonnet 4 for HR screen grading
✅ Claude grading successful, rubric validated
✅ Feedback saved successfully with full rubric: [uuid]
```

### Error Logs to Look For:
- `❌ Missing sessionId` → Frontend not sending sessionId
- `❌ No transcript found in database` → Transcript not being saved
- `❌ Interview session not found` → Session not in database
- `❌ Claude grading failed` → Claude API issue (check API key)
- `❌ Error: supabaseKey is required` → Missing Supabase service role key

---

## Step 2: Quick Database Checks

Run these SQL queries in Supabase SQL Editor:

### Check 1: Is transcript being saved?
```sql
SELECT 
  id,
  status,
  transcript IS NOT NULL as has_transcript,
  LENGTH(transcript) as transcript_length,
  transcript_structured IS NOT NULL as has_structured,
  created_at,
  completed_at
FROM interview_sessions 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** `has_transcript = true`, `transcript_length > 0`

### Check 2: Is feedback being created?
```sql
SELECT 
  id,
  interview_session_id,
  overall_score,
  full_rubric IS NOT NULL as has_full_rubric,
  created_at
FROM interview_feedback 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** Row exists with `has_full_rubric = true`

### Check 3: Does session have required data?
```sql
SELECT 
  s.id,
  s.stage,
  s.user_interview_data_id,
  d.resume_text IS NOT NULL as has_resume,
  d.job_description_text IS NOT NULL as has_job_desc,
  d.company_website IS NOT NULL as has_website
FROM interview_sessions s
LEFT JOIN user_interview_data d ON s.user_interview_data_id = d.id
ORDER BY s.created_at DESC 
LIMIT 1;
```

**Expected:** `has_resume = true`, `has_job_desc = true`

---

## Step 3: Check Environment Variables

Verify these are set in `.env.local`:

```bash
# Required for feedback
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Critical for feedback route
```

**Check:** Run `grep -E "ANTHROPIC|SERVICE_ROLE" .env.local` in terminal

---

## Step 4: Check Browser Console

When you end the interview, check browser console for:

### Expected:
```
🚀 GENERATING FEEDBACK FOR SESSION: [uuid]
📥 Feedback API response status: 200
✅ Feedback generated successfully!
```

### Errors:
- `❌ Error generating feedback: [error text]` → Check the error message
- `❌ CRITICAL ERROR calling feedback API` → Network/API route issue
- `404 (Not Found)` → Route doesn't exist

---

## Common Issues & Fixes

### Issue 1: "No transcript found"
**Fix:** Check that `transcript` is being saved in `endInterview()` function
- Look for: `transcript: transcript.join('\n')` in session update

### Issue 2: "Claude grading failed"
**Fix:** 
- Check `ANTHROPIC_API_KEY` is set
- Check API key is valid (not expired)
- Check Claude API status

### Issue 3: "supabaseKey is required"
**Fix:** 
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Restart dev server after adding key

### Issue 4: Feedback route returns 404
**Fix:** 
- Verify file exists: `app/api/interview/feedback/route.ts`
- Restart dev server

---

## Next Steps

After running diagnostics:

1. **If transcript is missing** → Follow Phase 2 testing guide
2. **If Claude API fails** → Follow Phase 3 testing guide  
3. **If observer notes missing** → Follow Phase 4 testing guide
4. **If everything passes but no feedback** → Check Phase 5 (frontend display)

