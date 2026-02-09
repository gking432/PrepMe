# Database Setup Instructions

## Quick Setup for Testing

You need to run the database schema in Supabase. Here's what to do:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Schema

Copy and paste this ENTIRE section into the SQL Editor and run it:

```sql
-- Feedback evaluation criteria (what to evaluate)
CREATE TABLE IF NOT EXISTS public.feedback_evaluation_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_area TEXT NOT NULL UNIQUE,
  area_name TEXT NOT NULL,
  description TEXT,
  evaluation_guidelines TEXT NOT NULL,
  rubric TEXT,
  weight DECIMAL(3, 2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback evaluation settings (global settings)
CREATE TABLE IF NOT EXISTS public.feedback_evaluation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  honesty_level TEXT DEFAULT 'tough',
  evaluation_instructions TEXT NOT NULL,
  require_job_alignment BOOLEAN DEFAULT true,
  require_specific_examples BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage-specific grading instructions (NEW - for HR screen)
CREATE TABLE IF NOT EXISTS public.feedback_stage_instructions (
  stage TEXT PRIMARY KEY,
  evaluation_instructions TEXT,
  focus_areas TEXT[],
  excluded_areas TEXT[],
  weight_overrides JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.feedback_evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_evaluation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_stage_instructions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view evaluation criteria"
  ON public.feedback_evaluation_criteria FOR SELECT
  USING (true);

CREATE POLICY "Admins can update evaluation criteria"
  ON public.feedback_evaluation_criteria FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert evaluation criteria"
  ON public.feedback_evaluation_criteria FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete evaluation criteria"
  ON public.feedback_evaluation_criteria FOR DELETE
  USING (true);

CREATE POLICY "Admins can view evaluation settings"
  ON public.feedback_evaluation_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update evaluation settings"
  ON public.feedback_evaluation_settings FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert evaluation settings"
  ON public.feedback_evaluation_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view stage instructions"
  ON public.feedback_stage_instructions FOR SELECT
  USING (true);

CREATE POLICY "Admins can update stage instructions"
  ON public.feedback_stage_instructions FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert stage instructions"
  ON public.feedback_stage_instructions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete stage instructions"
  ON public.feedback_stage_instructions FOR DELETE
  USING (true);

-- Insert default evaluation criteria
INSERT INTO public.feedback_evaluation_criteria (assessment_area, area_name, description, evaluation_guidelines, rubric, weight, is_active)
VALUES
  (
    'job_alignment',
    'Job Alignment',
    'Assesses how well the candidate''s responses align with the job requirements and responsibilities.',
    'Evaluate based on: relevance of candidate''s experience to job requirements, understanding of role responsibilities, alignment of skills with job description, and ability to connect their background to the position.',
    '10: Perfect alignment, all requirements met. 7-9: Good alignment with minor gaps. 4-6: Some alignment but significant gaps. 1-3: Poor alignment, major gaps.',
    1.0,
    true
  ),
  (
    'communication',
    'Communication',
    'Evaluates the candidate''s ability to communicate clearly, professionally, and effectively.',
    'Evaluate based on: clarity of responses, professionalism, ability to articulate thoughts, use of specific examples, and overall communication quality.',
    '10: Excellent communication, clear and professional. 7-9: Good communication with minor issues. 4-6: Adequate but needs improvement. 1-3: Poor communication, unclear or unprofessional.',
    1.0,
    true
  ),
  (
    'technical_skills',
    'Technical Skills',
    'Assesses the candidate''s technical knowledge, expertise, and ability to perform job-specific technical tasks.',
    'Evaluate based on: depth of technical knowledge, relevant experience, ability to explain technical concepts, and practical application of skills.',
    '10: Expert level, highly skilled. 7-9: Proficient with good knowledge. 4-6: Basic understanding, needs development. 1-3: Limited or no relevant skills.',
    1.0,
    true
  ),
  (
    'problem_solving',
    'Problem Solving',
    'Evaluates the candidate''s ability to analyze problems, think critically, and develop solutions.',
    'Evaluate based on: analytical thinking, approach to problem-solving, creativity in solutions, and ability to handle complex situations.',
    '10: Exceptional problem-solving skills. 7-9: Good analytical abilities. 4-6: Basic problem-solving, needs improvement. 1-3: Poor problem-solving skills.',
    1.0,
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

-- Insert HR screen specific grading instructions
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
```

### Step 3: Verify Tables Were Created

After running, you should see:
- ✅ `feedback_evaluation_criteria` table created
- ✅ `feedback_evaluation_settings` table created  
- ✅ `feedback_stage_instructions` table created
- ✅ Default data inserted

### Step 4: Test Again

Go back to `/admin` → "Test Feedback" tab → Click "Generate Test Feedback"

It should work now!

---

## Alternative: Run Full Schema

If you prefer, you can run the entire `supabase/schema.sql` file, but the above is the minimum needed for testing.

