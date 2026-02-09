-- Fix RLS policy for interview_feedback to allow anonymous users to view their feedback
-- Anonymous sessions have user_id = NULL, so we need to allow access when user_id IS NULL

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view own feedback" ON public.interview_feedback;

-- Create updated policy that allows:
-- 1. Logged-in users to view their own feedback (user_id = auth.uid())
-- 2. Anonymous users to view feedback for sessions with NULL user_id
CREATE POLICY "Users can view own feedback"
  ON public.interview_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_feedback.interview_session_id
      AND (
        -- Logged-in users: session user_id matches auth.uid()
        (interview_sessions.user_id = auth.uid())
        OR
        -- Anonymous users: session user_id is NULL (anonymous sessions)
        (interview_sessions.user_id IS NULL)
      )
    )
  );

