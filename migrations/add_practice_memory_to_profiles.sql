-- Add profile-level practice memory for saved workshop drafts.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS practice_memory JSONB DEFAULT '{}';
