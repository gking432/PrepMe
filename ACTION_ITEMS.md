# Action Items - Three-Agent Implementation

## Current Status

✅ **Phase 1**: Database Extensions - Code complete, needs migration  
✅ **Phase 2**: Session State Helper - Complete  
✅ **Phase 3**: Claude Grader - Code complete, needs setup  

---

## Action Items

### 1. Database Migration (Phase 1)

**What to do:**
Run the updated `supabase/schema.sql` in your Supabase SQL Editor.

**Steps:**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Click "New query"
4. Copy the following sections from `supabase/schema.sql`:

**Option A: Run just the new additions (recommended)**
```sql
-- Add new columns to existing tables
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS observer_notes JSONB,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.interview_feedback 
ADD COLUMN IF NOT EXISTS full_rubric JSONB;

-- Create observer_prompts table
CREATE TABLE IF NOT EXISTS public.observer_prompts (
  stage TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  evaluation_criteria JSONB,
  red_flag_keywords TEXT[],
  quality_indicators JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.observer_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for observer_prompts
CREATE POLICY "Admins can view observer prompts"
  ON public.observer_prompts FOR SELECT
  USING (true);

CREATE POLICY "Admins can update observer prompts"
  ON public.observer_prompts FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert observer prompts"
  ON public.observer_prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete observer prompts"
  ON public.observer_prompts FOR DELETE
  USING (true);

-- Insert default HR screen observer prompt
INSERT INTO public.observer_prompts (stage, system_prompt, red_flag_keywords, quality_indicators)
VALUES (
  'hr_screen',
  'You are observing an HR phone screen interview. Take detailed notes.

For EVERY question the interviewer asks, document:
1. Question ID, timestamp, full text
2. What areas it''s testing (answer_structure, specific_examples, etc.)
3. Candidate''s response: start/end time, duration, word count estimate
4. Quality flag: strong 🟢 / okay 🟡 / weak 🔴
5. Specific observations: Did they use metrics? Give examples? Stay on topic?
6. Notable quotes (for evidence)
7. Should this be flagged for practice? Priority level?

Flag as STRONG if: specific metrics, STAR method, clear timeframes, concrete examples
Flag as WEAK if: vague, generic, rambling, no examples, evasive

Red flags to watch for:
- Badmouthing previous employers
- Inconsistencies
- Inappropriate comments
- Defensive behavior
- Obvious exaggeration/lies

Output format: JSON with question-by-question notes + summary stats',
  ARRAY['badmouthing', 'inconsistent', 'defensive', 'inappropriate', 'exaggeration', 'lies'],
  '{
    "strong": ["specific metrics", "STAR method", "clear timeframes", "concrete examples", "quantifiable results"],
    "okay": ["adequate examples", "some structure", "relevant experience"],
    "weak": ["vague", "generic", "rambling", "no examples", "evasive", "off-topic"]
  }'::jsonb
)
ON CONFLICT (stage) DO NOTHING;
```

**Option B: Run entire updated schema.sql** (if you prefer to start fresh)

**Verification:**
After running, verify:
- [ ] `interview_sessions` has `observer_notes` and `duration_seconds` columns
- [ ] `interview_feedback` has `full_rubric` column
- [ ] `observer_prompts` table exists
- [ ] HR screen observer prompt is inserted

---

### 2. Install Anthropic SDK (Phase 3)

**What to do:**
Install the `@anthropic-ai/sdk` package.

**Command:**
```bash
npm install @anthropic-ai/sdk
```

**Verification:**
After installation, check `package.json` should include:
```json
"dependencies": {
  "@anthropic-ai/sdk": "^x.x.x"
}
```

---

### 3. Add Anthropic API Key (Phase 3)

**What to do:**
Add your Anthropic API key to environment variables.

**Steps:**
1. Get your Anthropic API key from: https://console.anthropic.com/
2. Create or update `.env.local` file in project root:

```bash
# Add this line to .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Important:**
- `.env.local` is already in `.gitignore` (should be)
- Never commit API keys to git
- Restart your dev server after adding the key

**Verification:**
After adding, verify the key is loaded:
```bash
# In your terminal (don't run this in production!)
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.ANTHROPIC_API_KEY ? 'Key loaded' : 'Key missing')"
```

Or just check that your app doesn't throw "ANTHROPIC_API_KEY not set" errors.

---

## Quick Checklist

- [ ] **Database Migration**: Run SQL in Supabase
  - [ ] Added columns to `interview_sessions`
  - [ ] Added column to `interview_feedback`
  - [ ] Created `observer_prompts` table
  - [ ] Inserted HR screen observer prompt
  
- [ ] **Package Installation**: `npm install @anthropic-ai/sdk`
  
- [ ] **API Key**: Added `ANTHROPIC_API_KEY` to `.env.local`

---

## Testing After Setup

Once all action items are complete, you can test:

1. **Database**: Query `observer_prompts` table - should return HR screen prompt
2. **Claude Client**: The code is ready, will work once API key is set
3. **Full Flow**: Run an HR screen interview → should use Claude for grading

---

## Need Help?

If you run into issues:
- **Database errors**: Check Supabase logs in dashboard
- **Package install errors**: Try `npm install` in project root
- **API key issues**: Verify key is correct and has proper permissions

Let me know when you've completed these and we can continue with Phase 4!

