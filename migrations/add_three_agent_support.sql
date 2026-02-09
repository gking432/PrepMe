-- Migration: Add Three-Agent Architecture Support
-- Run this in Supabase SQL Editor
-- Date: 2025-01-XX

-- Step 1: Add new columns to existing tables
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS observer_notes JSONB,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.interview_feedback 
ADD COLUMN IF NOT EXISTS full_rubric JSONB,
ADD COLUMN IF NOT EXISTS hr_screen_six_areas JSONB;

-- Step 2: Create observer_prompts table
CREATE TABLE IF NOT EXISTS public.observer_prompts (
  stage TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  evaluation_criteria JSONB,
  red_flag_keywords TEXT[],
  quality_indicators JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS for observer_prompts
ALTER TABLE public.observer_prompts ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies for observer_prompts
-- Drop policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Admins can view observer prompts" ON public.observer_prompts;
DROP POLICY IF EXISTS "Admins can update observer prompts" ON public.observer_prompts;
DROP POLICY IF EXISTS "Admins can insert observer prompts" ON public.observer_prompts;
DROP POLICY IF EXISTS "Admins can delete observer prompts" ON public.observer_prompts;

-- Create policies
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

-- Step 5: Insert default HR screen observer prompt
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

-- Verification queries (run these after migration to verify)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'interview_sessions' AND column_name IN ('observer_notes', 'duration_seconds');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'interview_feedback' AND column_name = 'full_rubric';
-- SELECT * FROM observer_prompts WHERE stage = 'hr_screen';

