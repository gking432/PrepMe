-- Migration: Add transcript_structured column to interview_sessions
-- Run this in Supabase SQL Editor
-- Date: 2025-01-30

-- Add transcript_structured column if it doesn't exist
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS transcript_structured JSONB;

-- Add comment to document the column
COMMENT ON COLUMN public.interview_sessions.transcript_structured IS 'Structured transcript with question tracking (for HR screen) - contains messages array and questions_asked array';

-- Verification query (run this after migration to verify)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'interview_sessions' 
-- AND column_name = 'transcript_structured';

