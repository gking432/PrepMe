# HR Screen Grading Implementation Plan

## Current State

### What We Have:
- ✅ Feedback API route that fetches interview stage
- ✅ Generic evaluation criteria (works for all stages)
- ✅ Evaluation settings (honesty level, instructions)
- ✅ System prompt builder

### What's Missing:
- ❌ Stage-specific evaluation criteria
- ❌ Stage-specific grading instructions
- ❌ HR screen-specific focus areas
- ❌ Different emphasis based on interview type

---

## What Needs to Be Implemented

### 1. Stage-Specific Evaluation Criteria

**Current:** All stages use the same criteria (Technical Skills, Communication, Problem Solving, etc.)

**Needed:** HR Screen should focus on:
- **Resume Verification** - Did they match what they said on resume?
- **Motivations** - Why do they want this role?
- **Basic Qualifications** - Do they meet minimum requirements?
- **Communication** - Can they communicate clearly?
- **Cultural Fit** - Would they fit the company culture?
- **Job Alignment** - Do their goals align with the role?

**NOT needed for HR Screen:**
- Deep technical skills (that's for hiring manager)
- Complex problem-solving (that's for technical interview)
- Team collaboration details (that's for team interview)

### 2. Stage-Specific Grading Instructions

**Current:** Generic instructions for all interview types

**Needed for HR Screen:**
```
You are evaluating an HR phone screen interview. This is a brief 5-10 minute 
screening call focused on:

1. VERIFICATION: Does the candidate match their resume? Are they who they say they are?
2. MOTIVATIONS: Why do they want this role? What are their career goals?
3. BASIC FIT: Do they meet minimum qualifications? Are they available?
4. COMMUNICATION: Can they communicate clearly and professionally?
5. CULTURAL FIT: Would they fit the company culture?

Focus Areas:
- Resume consistency (do answers match resume?)
- Motivation clarity (do they understand the role?)
- Communication quality (clear, professional, concise)
- Basic qualifications (experience, availability, salary expectations)

What NOT to evaluate deeply:
- Technical depth (that's for hiring manager interview)
- Problem-solving complexity (that's for technical interview)
- Team dynamics (that's for team interview)

Be honest and direct. This is a screening call - if they don't pass basic checks, 
say so clearly.
```

### 3. Stage-Specific Criteria Weights

**HR Screen should weight:**
- Job Alignment: 1.3 (high - most important)
- Communication: 1.2 (high - critical for phone screen)
- Experience Relevance: 1.1 (medium-high)
- Cultural Fit: 1.0 (medium)
- Technical Skills: 0.5 (low - just basic check)
- Problem Solving: 0.3 (very low - not the focus)

---

## Implementation Options

### Option 1: Stage-Specific Criteria in Database (Recommended)

**Add to database:**
```sql
-- Add stage column to feedback_evaluation_criteria
ALTER TABLE feedback_evaluation_criteria 
ADD COLUMN applicable_stages TEXT[] DEFAULT ARRAY['hr_screen', 'hiring_manager', 'team_interview'];

-- Or create stage-specific criteria table
CREATE TABLE feedback_evaluation_criteria_by_stage (
  id UUID PRIMARY KEY,
  stage TEXT NOT NULL,
  assessment_area TEXT NOT NULL,
  area_name TEXT NOT NULL,
  description TEXT,
  evaluation_guidelines TEXT NOT NULL,
  rubric TEXT,
  weight DECIMAL DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true
);
```

**Pros:**
- Flexible - can configure different criteria per stage
- Admin can manage via UI
- Scales to multiple interview types

**Cons:**
- More complex database schema
- More admin UI work

### Option 2: Stage-Specific Prompts (Simpler)

**Add to database:**
```sql
CREATE TABLE feedback_stage_instructions (
  stage TEXT PRIMARY KEY,
  evaluation_instructions TEXT NOT NULL,
  focus_areas TEXT[],
  excluded_areas TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**In code:**
- Fetch stage-specific instructions
- Filter criteria based on stage
- Adjust weights based on stage

**Pros:**
- Simpler - just different prompts
- Quick to implement
- Easy to test and iterate

**Cons:**
- Less flexible
- Harder to configure via admin UI

### Option 3: Hybrid Approach (Best for Now)

**Use existing criteria table, but:**
1. Add `applicable_stages` column to criteria
2. Filter criteria by stage in feedback API
3. Add stage-specific instructions to evaluation settings
4. Adjust weights based on stage in code

**Implementation:**
- Minimal database changes
- Use existing admin UI
- Add stage-specific logic in feedback route

---

## Recommended Implementation (Option 3: Hybrid)

### Step 1: Update Database Schema

```sql
-- Add stage applicability to criteria
ALTER TABLE feedback_evaluation_criteria 
ADD COLUMN applicable_stages TEXT[] DEFAULT ARRAY['hr_screen', 'hiring_manager', 'team_interview'];

-- Add stage-specific instructions
CREATE TABLE IF NOT EXISTS feedback_stage_instructions (
  stage TEXT PRIMARY KEY,
  evaluation_instructions TEXT NOT NULL,
  focus_areas TEXT[],
  weight_overrides JSONB, -- Override weights per stage
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert HR screen specific instructions
INSERT INTO feedback_stage_instructions (stage, evaluation_instructions, focus_areas, weight_overrides)
VALUES (
  'hr_screen',
  'You are evaluating an HR phone screen interview. This is a brief 5-10 minute screening call. Focus on: (1) VERIFICATION - Does the candidate match their resume? (2) MOTIVATIONS - Why do they want this role? (3) BASIC FIT - Do they meet minimum qualifications? (4) COMMUNICATION - Can they communicate clearly? (5) CULTURAL FIT - Would they fit the company? Be honest and direct. This is a screening call - if they don''t pass basic checks, say so clearly.',
  ARRAY['resume_verification', 'motivations', 'basic_qualifications', 'communication', 'cultural_fit'],
  '{"technical_skills": 0.5, "problem_solving": 0.3, "job_alignment": 1.3, "communication": 1.2}'::jsonb
);
```

### Step 2: Update Feedback API Route

```typescript
// In app/api/interview/feedback/route.ts

// After fetching sessionData (which includes stage):
const stage = sessionData.stage; // 'hr_screen', 'hiring_manager', etc.

// Fetch stage-specific instructions
const { data: stageInstructions } = await supabase
  .from('feedback_stage_instructions')
  .select('*')
  .eq('stage', stage)
  .single();

// Filter criteria by stage
const { data: criteriaData } = await supabase
  .from('feedback_evaluation_criteria')
  .select('*')
  .eq('is_active', true)
  .contains('applicable_stages', [stage]) // Only criteria applicable to this stage
  .order('area_name');

// Apply stage-specific weight overrides
const criteria = (criteriaData || []).map(criterion => {
  const weightOverride = stageInstructions?.weight_overrides?.[criterion.assessment_area];
  return {
    ...criterion,
    weight: weightOverride !== undefined ? weightOverride : criterion.weight
  };
});

// Use stage-specific instructions in prompt
const stageSpecificInstructions = stageInstructions?.evaluation_instructions || '';
```

### Step 3: Update Admin Portal

Add UI to:
- Configure which criteria apply to which stages
- Set stage-specific instructions
- Override weights per stage

---

## HR Screen Specific Implementation

### HR Screen Evaluation Criteria

**Primary Focus:**
1. **Resume Verification** (Weight: 1.3)
   - Do answers match resume claims?
   - Are they consistent?
   - Any red flags or discrepancies?

2. **Job Alignment** (Weight: 1.3)
   - Do they understand the role?
   - Why do they want this position?
   - Are their goals aligned?

3. **Communication** (Weight: 1.2)
   - Clear and professional?
   - Appropriate for phone screen?
   - Good listening skills?

4. **Motivations** (Weight: 1.1)
   - Genuine interest?
   - Career goals alignment?
   - Understanding of company/role?

5. **Basic Qualifications** (Weight: 1.0)
   - Meets minimum requirements?
   - Availability?
   - Salary expectations reasonable?

6. **Cultural Fit** (Weight: 0.8)
   - Would they fit the team?
   - Professional demeanor?
   - Positive attitude?

**Secondary (Lower Weight):**
- Technical Skills: 0.5 (just basic check)
- Problem Solving: 0.3 (not the focus)
- Experience Depth: 0.7 (surface level only)

### HR Screen Grading Prompt Template

```
You are evaluating an HR phone screen interview. This is a brief 5-10 minute 
screening call focused on basic verification and fit assessment.

INTERVIEW CONTEXT:
- Stage: HR Phone Screen
- Duration: 5-10 minutes
- Purpose: Initial screening, not deep technical evaluation

FOCUS AREAS (in order of importance):
1. RESUME VERIFICATION (Weight: 1.3)
   - Do their answers match their resume?
   - Are they consistent in their claims?
   - Any discrepancies or red flags?

2. JOB ALIGNMENT (Weight: 1.3)
   - Do they understand the role?
   - Why do they want this position?
   - Are their career goals aligned with this role?

3. COMMUNICATION (Weight: 1.2)
   - Clear and professional communication?
   - Appropriate for phone screen context?
   - Good listening and response quality?

4. MOTIVATIONS (Weight: 1.1)
   - Genuine interest in the role?
   - Clear career goals?
   - Understanding of company/role?

5. BASIC QUALIFICATIONS (Weight: 1.0)
   - Meets minimum requirements?
   - Availability matches needs?
   - Salary expectations reasonable?

WHAT NOT TO EVALUATE DEEPLY:
- Technical depth (that's for hiring manager)
- Complex problem-solving (that's for technical interview)
- Team collaboration details (that's for team interview)

EVALUATION APPROACH:
- Be honest and direct
- This is a screening call - if they don't pass basic checks, say so
- Focus on "go/no-go" decision factors
- Reference specific examples from transcript
- Compare to job requirements explicitly

[Then include job description, resume, transcript, and criteria as usual]
```

---

## Implementation Checklist

### Database Changes
- [ ] Add `applicable_stages` column to `feedback_evaluation_criteria`
- [ ] Create `feedback_stage_instructions` table
- [ ] Insert HR screen specific instructions
- [ ] Update existing criteria to specify applicable stages

### Code Changes
- [ ] Update feedback API to fetch stage-specific instructions
- [ ] Filter criteria by stage
- [ ] Apply stage-specific weight overrides
- [ ] Build stage-specific prompt

### Admin Portal
- [ ] Add UI for stage-specific instructions
- [ ] Add UI for criteria stage assignment
- [ ] Add UI for weight overrides per stage

### Testing
- [ ] Test HR screen grading with new criteria
- [ ] Verify weights are applied correctly
- [ ] Check that feedback is stage-appropriate
- [ ] Ensure other stages still work (when implemented)

---

## Next Steps

1. **For HR Screen (Now):**
   - Implement stage-specific instructions
   - Filter/weight criteria appropriately
   - Test with real interviews

2. **For Future Stages:**
   - Hiring Manager: Focus on technical depth, problem-solving
   - Team Interview: Focus on collaboration, cultural fit, teamwork

3. **Admin Configuration:**
   - Build UI to configure stage-specific settings
   - Allow admins to customize per interview type

---

## Summary

**What we need:**
1. ✅ Stage-specific evaluation instructions (different prompt per stage)
2. ✅ Stage-specific criteria filtering (different criteria per stage)
3. ✅ Stage-specific weight adjustments (different emphasis per stage)

**Implementation:**
- Add stage instructions table
- Update feedback API to use stage
- Filter and weight criteria by stage
- Build stage-specific prompts

**For HR Screen specifically:**
- Focus on verification, motivations, basic fit
- Less emphasis on technical depth
- Clear "go/no-go" evaluation approach

