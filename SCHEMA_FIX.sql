-- Fix for missing area_feedback column in interview_feedback table
-- Run this in Supabase SQL Editor if you get the error:
-- "Could not find the 'area_feedback' column of 'interview_feedback' in the schema cache"

-- Add area_feedback column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'interview_feedback' 
    AND column_name = 'area_feedback'
  ) THEN
    ALTER TABLE public.interview_feedback 
    ADD COLUMN area_feedback JSONB;
    
    RAISE NOTICE 'Added area_feedback column to interview_feedback table';
  ELSE
    RAISE NOTICE 'area_feedback column already exists';
  END IF;
END $$;

-- Add area_scores column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'interview_feedback' 
    AND column_name = 'area_scores'
  ) THEN
    ALTER TABLE public.interview_feedback 
    ADD COLUMN area_scores JSONB;
    
    RAISE NOTICE 'Added area_scores column to interview_feedback table';
  ELSE
    RAISE NOTICE 'area_scores column already exists';
  END IF;
END $$;

