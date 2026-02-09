-- Quick fix: Add hr_screen_six_areas column if it doesn't exist
-- Run this in Supabase SQL Editor

ALTER TABLE public.interview_feedback 
ADD COLUMN IF NOT EXISTS hr_screen_six_areas JSONB;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interview_feedback' 
AND column_name = 'hr_screen_six_areas';

