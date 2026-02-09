-- Quick fix: Make user_id nullable in user_interview_data for anonymous interviews
-- Run this in Supabase SQL Editor

ALTER TABLE public.user_interview_data ALTER COLUMN user_id DROP NOT NULL;

-- Verify it worked
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_interview_data' AND column_name = 'user_id';

