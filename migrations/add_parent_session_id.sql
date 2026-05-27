-- Link retake sessions back to the source interview.
ALTER TABLE public.interview_sessions
ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS interview_sessions_parent_session_id_idx
ON public.interview_sessions(parent_session_id);
