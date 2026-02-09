-- Database schema for PrepMe interview simulation app
-- Run this in your Supabase SQL editor

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interview data (resume, job description, etc.)
CREATE TABLE IF NOT EXISTS public.user_interview_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for anonymous HR screen interviews
  resume_text TEXT,
  resume_file_url TEXT,
  job_description_text TEXT,
  job_description_file_url TEXT,
  company_website TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make user_id nullable for anonymous interviews (HR screen free tier)
ALTER TABLE public.user_interview_data ALTER COLUMN user_id DROP NOT NULL;

-- Interview sessions
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for anonymous HR screen interviews
  user_interview_data_id UUID REFERENCES public.user_interview_data(id) ON DELETE SET NULL,
  stage TEXT NOT NULL, -- 'hr_screen', 'hiring_manager', 'team_interview'
  transcript TEXT,
  transcript_structured JSONB, -- Structured transcript with question tracking (for HR screen)
  observer_notes JSONB, -- Real-time observer agent notes (per-question analysis and summary)
  duration_seconds INTEGER, -- Total interview duration in seconds
  audio_recording_url TEXT,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Make user_id nullable for anonymous interviews (HR screen free tier)
ALTER TABLE public.interview_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Interview feedback
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  overall_score INTEGER, -- 1-10
  strengths TEXT[],
  weaknesses TEXT[],
  suggestions TEXT[],
  detailed_feedback TEXT,
  area_scores JSONB, -- JSON object with scores per assessment area: {"technical_skills": 7, "communication": 6, ...}
  area_feedback JSONB, -- JSON object with detailed feedback per area
  hr_screen_six_areas JSONB, -- HR screen specific 6-area assessment (what_went_well, what_needs_improve)
  full_rubric JSONB, -- Complete Claude grader rubric output (includes question-level analysis, practice queue, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback evaluation criteria (admin-configurable)
CREATE TABLE IF NOT EXISTS public.feedback_evaluation_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_area TEXT NOT NULL UNIQUE, -- e.g., 'technical_skills', 'communication', 'problem_solving'
  area_name TEXT NOT NULL, -- Display name: 'Technical Skills', 'Communication', etc.
  description TEXT, -- Description of what this area assesses
  evaluation_guidelines TEXT NOT NULL, -- Detailed guidelines on how to evaluate this area
  rubric TEXT, -- Scoring rubric for this area (what constitutes 1-10)
  weight DECIMAL DEFAULT 1.0, -- Weight of this area in overall score (default 1.0)
  is_active BOOLEAN DEFAULT true, -- Whether this area is currently being evaluated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback evaluation settings (global settings for feedback generation)
CREATE TABLE IF NOT EXISTS public.feedback_evaluation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  honesty_level TEXT DEFAULT 'tough', -- 'lenient', 'fair', 'tough', 'very_tough'
  evaluation_instructions TEXT NOT NULL, -- Overall instructions for the AI evaluator
  require_job_alignment BOOLEAN DEFAULT true, -- Whether to strictly evaluate against job requirements
  require_specific_examples BOOLEAN DEFAULT true, -- Whether to require specific examples from transcript
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage-specific grading instructions (one per interview stage)
CREATE TABLE IF NOT EXISTS public.feedback_stage_instructions (
  stage TEXT PRIMARY KEY, -- 'hr_screen', 'hiring_manager', 'team_interview'
  evaluation_instructions TEXT, -- Stage-specific grading instructions (optional, falls back to global if null)
  focus_areas TEXT[], -- Areas to focus on for this stage
  excluded_areas TEXT[], -- Areas to exclude or de-emphasize for this stage
  weight_overrides JSONB, -- Override criteria weights for this stage: {"technical_skills": 0.5, "job_alignment": 1.3}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin prompts configuration (for interviewer AI behavior)
CREATE TABLE IF NOT EXISTS public.interview_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage TEXT NOT NULL UNIQUE, -- 'hr_screen', 'hiring_manager', 'team_interview'
  system_prompt TEXT NOT NULL,
  question_set TEXT[], -- Array of suggested questions
  tone TEXT DEFAULT 'professional', -- 'professional', 'friendly', 'challenging'
  depth_level TEXT DEFAULT 'medium', -- 'basic', 'medium', 'deep'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Observer prompts (for real-time note-taking agent)
CREATE TABLE IF NOT EXISTS public.observer_prompts (
  stage TEXT PRIMARY KEY, -- 'hr_screen', 'hiring_manager', 'team_interview'
  system_prompt TEXT NOT NULL, -- Full observer agent instructions
  evaluation_criteria JSONB, -- JSON schema for structured notes (optional, for validation)
  red_flag_keywords TEXT[], -- Keywords to watch for red flags
  quality_indicators JSONB, -- What constitutes strong/weak/okay answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interview_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_evaluation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_stage_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observer_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_interview_data
CREATE POLICY "Users can view own interview data"
  ON public.user_interview_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview data"
  ON public.user_interview_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview data"
  ON public.user_interview_data FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for interview_sessions
CREATE POLICY "Users can view own sessions"
  ON public.interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for interview_feedback
CREATE POLICY "Users can view own feedback"
  ON public.interview_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_feedback.interview_session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for interview_prompts (admin only - will be handled in application code)
CREATE POLICY "Admins can view prompts"
  ON public.interview_prompts FOR SELECT
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update prompts"
  ON public.interview_prompts FOR UPDATE
  USING (true); -- Will be restricted by application logic

-- RLS Policies for feedback_evaluation_criteria (admin only)
CREATE POLICY "Admins can view evaluation criteria"
  ON public.feedback_evaluation_criteria FOR SELECT
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update evaluation criteria"
  ON public.feedback_evaluation_criteria FOR UPDATE
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can insert evaluation criteria"
  ON public.feedback_evaluation_criteria FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

CREATE POLICY "Admins can delete evaluation criteria"
  ON public.feedback_evaluation_criteria FOR DELETE
  USING (true); -- Will be restricted by application logic

-- RLS Policies for feedback_evaluation_settings (admin only)
CREATE POLICY "Admins can view evaluation settings"
  ON public.feedback_evaluation_settings FOR SELECT
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update evaluation settings"
  ON public.feedback_evaluation_settings FOR UPDATE
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can insert evaluation settings"
  ON public.feedback_evaluation_settings FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

-- RLS Policies for feedback_stage_instructions (admin only)
CREATE POLICY "Admins can view stage instructions"
  ON public.feedback_stage_instructions FOR SELECT
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update stage instructions"
  ON public.feedback_stage_instructions FOR UPDATE
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can insert stage instructions"
  ON public.feedback_stage_instructions FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

CREATE POLICY "Admins can delete stage instructions"
  ON public.feedback_stage_instructions FOR DELETE
  USING (true); -- Will be restricted by application logic

-- RLS Policies for observer_prompts (admin only)
CREATE POLICY "Admins can view observer prompts"
  ON public.observer_prompts FOR SELECT
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update observer prompts"
  ON public.observer_prompts FOR UPDATE
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can insert observer prompts"
  ON public.observer_prompts FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

CREATE POLICY "Admins can delete observer prompts"
  ON public.observer_prompts FOR DELETE
  USING (true); -- Will be restricted by application logic

-- Insert default prompts
INSERT INTO public.interview_prompts (stage, system_prompt, question_set, tone, depth_level)
VALUES
  (
    'hr_screen',
    'You are an HR representative conducting an initial phone screen. Your goal is to verify the candidate is who they say they are on their resume and understand their motivations for the role. This is a brief 5-10 minute screening call. Keep questions brief and focused on: 1) Verifying resume details and experience, 2) Understanding motivations and interest in the position, 3) Basic qualifications check. Be friendly and professional. After you have verified their identity and confirmed their motivations (typically 4-6 exchanges), naturally conclude by saying something like "Perfect, I have your availability and I''ll get something scheduled with the hiring manager" or similar. Do NOT continue asking questions after you have the information you need - end the call naturally.',
    ARRAY[
      'Tell me about yourself.',
      'Why are you interested in this position?',
      'What do you know about our company?',
      'What are your salary expectations?',
      'Do you have any questions for me?'
    ],
    'friendly',
    'basic'
  ),
  (
    'hiring_manager',
    'You are a hiring manager conducting a technical interview. Ask deeper questions about the candidate''s experience, problem-solving abilities, and how they would handle specific scenarios. Be professional but more probing than the HR screen.',
    ARRAY[
      'Walk me through a challenging project you worked on.',
      'How do you handle tight deadlines?',
      'Describe a time you had to learn something new quickly.',
      'What are your greatest strengths and weaknesses?',
      'Where do you see yourself in 5 years?'
    ],
    'professional',
    'medium'
  ),
  (
    'team_interview',
    'You are a team member conducting a collaborative interview. Ask questions about teamwork, communication, and how the candidate would fit with the team. Be conversational and assess cultural fit.',
    ARRAY[
      'How do you prefer to communicate with team members?',
      'Describe your ideal work environment.',
      'Tell me about a time you disagreed with a team member.',
      'How do you handle feedback?',
      'What motivates you in your work?'
    ],
    'friendly',
    'medium'
  )
ON CONFLICT (stage) DO NOTHING;

-- Insert default feedback evaluation criteria
INSERT INTO public.feedback_evaluation_criteria (assessment_area, area_name, description, evaluation_guidelines, rubric, weight, is_active)
VALUES
  (
    'technical_skills',
    'Technical Skills',
    'Assesses the candidate''s technical knowledge, expertise, and ability to perform job-specific technical tasks.',
    'Evaluate based on: depth of technical knowledge demonstrated, accuracy of technical explanations, ability to discuss technical concepts clearly, relevance of technical experience to job requirements, and evidence of staying current with technology.',
    '10: Expert-level knowledge, demonstrates mastery of all required skills with specific examples. 7-9: Strong technical skills, solid understanding with minor gaps. 4-6: Adequate skills but lacks depth or has significant gaps. 1-3: Insufficient technical knowledge for the role.',
    1.2,
    true
  ),
  (
    'communication',
    'Communication',
    'Evaluates clarity, articulation, listening skills, and ability to convey ideas effectively.',
    'Evaluate based on: clarity of expression, ability to explain complex ideas simply, listening and responding appropriately, professional tone and language, and non-verbal communication cues (if applicable).',
    '10: Exceptional communicator, clear, articulate, excellent listener. 7-9: Good communication skills with minor areas for improvement. 4-6: Adequate but sometimes unclear or struggles to express ideas. 1-3: Poor communication, difficult to understand, poor listening skills.',
    1.0,
    true
  ),
  (
    'problem_solving',
    'Problem Solving',
    'Assesses analytical thinking, creativity, and ability to approach and solve problems effectively.',
    'Evaluate based on: approach to problem-solving questions, logical reasoning, creativity in solutions, ability to break down complex problems, and evidence of successful problem-solving in past experiences.',
    '10: Exceptional problem solver, demonstrates systematic approach and innovative thinking. 7-9: Strong problem-solving skills with good methodology. 4-6: Adequate but lacks depth or systematic approach. 1-3: Weak problem-solving abilities, struggles with complex issues.',
    1.1,
    true
  ),
  (
    'job_alignment',
    'Job Alignment',
    'Measures how well the candidate''s experience, skills, and responses align with the specific job requirements.',
    'Evaluate based on: match between candidate experience and job requirements, understanding of role responsibilities, relevant examples provided, and alignment of career goals with position.',
    '10: Perfect alignment, exceeds requirements. 7-9: Good alignment with most requirements met. 4-6: Partial alignment, some gaps in requirements. 1-3: Poor alignment, significant gaps or mismatch.',
    1.3,
    true
  ),
  (
    'cultural_fit',
    'Cultural Fit',
    'Evaluates how well the candidate would fit with the company culture and team dynamics.',
    'Evaluate based on: alignment with company values (if discussed), teamwork examples, work style compatibility, adaptability, and interpersonal skills demonstrated.',
    '10: Excellent cultural fit, would integrate seamlessly. 7-9: Good fit with minor concerns. 4-6: Adequate fit but some potential concerns. 1-3: Poor cultural fit, significant concerns.',
    0.8,
    true
  ),
  (
    'experience_relevance',
    'Experience Relevance',
    'Assesses the relevance and quality of the candidate''s past experience to the role.',
    'Evaluate based on: relevance of past roles to current position, quality and depth of experience, progression in career, and transferable skills demonstrated.',
    '10: Highly relevant experience with strong track record. 7-9: Relevant experience with good track record. 4-6: Some relevant experience but gaps exist. 1-3: Limited or irrelevant experience.',
    1.0,
    true
  )
ON CONFLICT (assessment_area) DO NOTHING;

-- Insert default feedback evaluation settings
INSERT INTO public.feedback_evaluation_settings (honesty_level, evaluation_instructions, require_job_alignment, require_specific_examples)
VALUES
  (
    'tough',
    'You are a rigorous, honest interview evaluator. Your role is to provide candid, constructive feedback that helps candidates understand their true performance relative to job requirements. Be direct and specific. Do not sugarcoat weaknesses. When evaluating:

1. Compare responses directly against the job description requirements
2. Reference specific examples from the transcript to support your assessments
3. Be honest about gaps between candidate qualifications and job requirements
4. Provide actionable, specific feedback for improvement
5. Use the evaluation criteria and rubrics provided to ensure consistent, fair assessment
6. If a candidate performed poorly in an area, state it clearly with evidence
7. Balance honesty with constructive guidance - be tough but fair

Remember: Honest feedback is more valuable than false encouragement. Help candidates understand where they truly stand.',
    true,
    true
  )
ON CONFLICT DO NOTHING;

-- Insert HR screen specific grading instructions (coaching/sales tool approach)
INSERT INTO public.feedback_stage_instructions (stage, evaluation_instructions, focus_areas, excluded_areas, weight_overrides)
VALUES
  (
    'hr_screen',
    'You are evaluating an HR phone screen interview. This is a brief 5-10 minute screening call. Your goal is to provide encouraging, actionable feedback that helps the candidate improve. This is a coaching tool, not a harsh evaluation.

INTERVIEW CONTEXT:
- Stage: HR Phone Screen
- Purpose: Initial screening and basic fit assessment
- Tone: Encouraging but honest (this is a sales/coaching tool)

YOUR EVALUATION APPROACH:

1. OVERALL ASSESSMENT:
   - Be encouraging: Start with "Based on your qualifications and conversation, we think you''re likely to move onto the formal interview process, but here are some tips to strengthen your performance even further."
   - Be honest but supportive
   - Frame feedback as "tips to strengthen" not "you failed"

2. WHAT THEY DID WELL (Strengths):
   - Identify specific examples they mentioned that align with job requirements
   - Quote what they said: "You mentioned [quote] which directly connects to [job requirement]"
   - Highlight good connections they made between their experience and the role
   - Be specific: "You mentioned your experience managing a team of 8 developers, which directly aligns with the ''team leadership'' requirement."

3. WHAT THEY COULD IMPROVE (Areas for Growth):
   - Identify experience from their resume they SHOULD HAVE mentioned but didn''t
   - Point out job requirements they didn''t address
   - Show missed connections: "Your resume shows [experience] which aligns with [job requirement], but you didn''t mention it. Consider saying: [specific suggestion]"
   - This is the KEY value-add: Show them what they should have said but didn''t

4. ACTIONABLE TIPS:
   - Specific suggestions: "When discussing [topic], prepare a story like: [example]"
   - Help them connect their experience to job requirements
   - Guide them on what to mention next time
   - Give them specific things to say: "Consider saying: ''In my role at [Company], I [specific action] which resulted in [outcome]''"

CRITICAL REQUIREMENTS:

1. COMPARE TO JOB DESCRIPTION:
   - For each job requirement, check: Did they mention relevant experience?
   - If YES: Highlight it as a strength with specific quote
   - If NO: Point out they should have mentioned [specific experience from resume] and give them exact words to say

2. COMPARE TO RESUME:
   - Identify relevant experience on their resume
   - Check: Did they mention it in the interview?
   - If NO: This is a missed opportunity - tell them what they should have said with specific example
   - Example: "The job requires ''experience with agile methodologies.'' Your resume shows you worked in an agile environment at [Company], but you didn''t mention it. Consider saying: ''In my role at [Company], I participated in daily standups and sprint planning, which helped us deliver features 30% faster.''"

3. BE SPECIFIC:
   - Don''t say: "You could improve communication"
   - Do say: "When asked about team management, you said ''I''ve led teams'' but didn''t give a specific example. Consider: ''I managed a team of 5 developers on a project where we delivered [outcome]''"

4. BE ENCOURAGING:
   - Frame improvements as opportunities, not failures
   - Use "Consider..." not "You failed to..."
   - Show them the path forward
   - Make them want to improve (and use the product more)

OUTPUT FORMAT:
- Overall assessment (encouraging message about likely moving forward)
- Strengths (what they did well with specific examples and quotes)
- Areas for improvement (what they missed, with specific suggestions of what to say)
- Actionable tips (how to improve for next time with concrete examples)

Remember: This is a sales tool. Be encouraging, show value, and make them want to use the full product.',
    ARRAY['job_alignment', 'experience_connection', 'specificity', 'missed_opportunities', 'communication', 'resume_consistency'],
    ARRAY['deep_technical_skills', 'complex_problem_solving'],
    '{"technical_skills": 0.5, "problem_solving": 0.3, "job_alignment": 1.3, "communication": 1.2, "experience_relevance": 1.1}'::jsonb
  )
ON CONFLICT (stage) DO NOTHING;

-- Insert default observer prompts
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

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

