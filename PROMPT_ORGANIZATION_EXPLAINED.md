# How Prompts Are Organized - Simple Explanation

## Current Structure

### We Have TWO Types of Prompts:

1. **Interview Prompts** (for conducting the interview)
   - Stored in: `interview_prompts` table
   - One per stage: `hr_screen`, `hiring_manager`, `team_interview`
   - Used by: Interview AI (the one asking questions)

2. **Grading Instructions** (for evaluating the interview)
   - Stored in: `feedback_evaluation_settings` table
   - Currently: ONE global set for all stages
   - Used by: Grading AI (the one giving scores)

---

## The Problem

**Right now:**
- ✅ Each interview stage has its own prompt (for conducting)
- ❌ All stages use the SAME grading instructions (for evaluating)

**What we need:**
- ✅ Each interview stage should have its own grading instructions too

---

## Solution: Add Stage-Specific Grading Instructions

### Option 1: Database Table (Recommended)

**Create a new table: `feedback_stage_instructions`**

```
┌─────────────────────────────────────────┐
│  feedback_stage_instructions            │
├─────────────────────────────────────────┤
│  stage: 'hr_screen'                     │
│  evaluation_instructions: "..."        │
│  focus_areas: [...]                     │
│  weight_overrides: {...}                │
└─────────────────────────────────────────┘
```

**How it works:**
- One row per interview stage
- Each row has stage-specific grading instructions
- Admin can edit via admin portal
- Code fetches the right instructions based on stage

**Pros:**
- ✅ Easy to update (via admin portal)
- ✅ No code changes needed to update prompts
- ✅ Consistent with how interview prompts work
- ✅ Can be configured per customer/company

**Cons:**
- ❌ Requires database change
- ❌ Need to build admin UI

---

### Option 2: Code Files (Simpler for Now)

**Create files:**
```
/prompts/
  hr_screen_grading.ts
  hiring_manager_grading.ts
  team_interview_grading.ts
```

**How it works:**
- Each file exports grading instructions for that stage
- Code imports the right file based on stage
- Instructions are in code, not database

**Pros:**
- ✅ Quick to implement
- ✅ Easy to version control (git)
- ✅ No database changes needed
- ✅ Easy to test

**Cons:**
- ❌ Requires code deployment to change
- ❌ Can't be edited by non-developers
- ❌ Not as flexible

---

### Option 3: Hybrid (Best of Both)

**Database table for instructions + Code for structure**

- Store stage-specific instructions in database
- Code handles the structure/logic
- Admin can edit instructions
- Code applies them consistently

---

## Recommended Approach: Database Table

### Why Database?

1. **Consistency** - Same pattern as interview prompts
2. **Flexibility** - Admin can update without code changes
3. **Scalability** - Easy to add more stages
4. **Customization** - Can customize per customer later

### Structure:

```sql
CREATE TABLE feedback_stage_instructions (
  stage TEXT PRIMARY KEY,  -- 'hr_screen', 'hiring_manager', etc.
  evaluation_instructions TEXT NOT NULL,  -- The main prompt
  focus_areas TEXT[],  -- What to focus on
  excluded_areas TEXT[],  -- What NOT to focus on
  weight_overrides JSONB,  -- Adjust weights per stage
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Example Data:

**HR Screen:**
```sql
INSERT INTO feedback_stage_instructions VALUES (
  'hr_screen',
  'You are evaluating an HR phone screen interview. This is a brief 5-10 minute screening call. Focus on: (1) VERIFICATION - Does the candidate match their resume? (2) MOTIVATIONS - Why do they want this role? (3) BASIC FIT - Do they meet minimum qualifications? (4) COMMUNICATION - Can they communicate clearly? Be honest and direct.',
  ARRAY['resume_verification', 'motivations', 'basic_qualifications', 'communication'],
  ARRAY['deep_technical_skills', 'complex_problem_solving'],
  '{"technical_skills": 0.5, "problem_solving": 0.3, "job_alignment": 1.3}'::jsonb
);
```

**Hiring Manager:**
```sql
INSERT INTO feedback_stage_instructions VALUES (
  'hiring_manager',
  'You are evaluating a hiring manager interview. This is a deeper technical/behavioral interview. Focus on: (1) TECHNICAL DEPTH - How well do they understand the technical requirements? (2) PROBLEM SOLVING - Can they solve complex problems? (3) EXPERIENCE QUALITY - Depth and relevance of their experience. Be thorough and technical.',
  ARRAY['technical_depth', 'problem_solving', 'experience_quality'],
  ARRAY['basic_qualifications', 'salary_expectations'],
  '{"technical_skills": 1.5, "problem_solving": 1.3, "job_alignment": 1.2}'::jsonb
);
```

---

## How It Works in Code

### Current Code (Generic):
```typescript
// app/api/interview/feedback/route.ts

// Gets generic instructions for all stages
const { data: settings } = await supabase
  .from('feedback_evaluation_settings')
  .select('*')
  .single();

// Uses same instructions for all stages
systemPrompt = settings.evaluation_instructions;
```

### Updated Code (Stage-Specific):
```typescript
// app/api/interview/feedback/route.ts

// Get the stage from session
const stage = sessionData.stage; // 'hr_screen', 'hiring_manager', etc.

// Get stage-specific instructions
const { data: stageInstructions } = await supabase
  .from('feedback_stage_instructions')
  .select('*')
  .eq('stage', stage)
  .single();

// Use stage-specific instructions
systemPrompt = stageInstructions.evaluation_instructions;

// Apply stage-specific weight overrides
criteria.forEach(criterion => {
  const override = stageInstructions.weight_overrides?.[criterion.assessment_area];
  if (override) {
    criterion.weight = override;
  }
});
```

---

## File Structure (If Using Files Instead)

If you prefer files over database:

```
/app
  /api
    /interview
      /feedback
        /prompts
          hr_screen.ts
          hiring_manager.ts
          team_interview.ts
        route.ts
```

**hr_screen.ts:**
```typescript
export const hrScreenGradingPrompt = {
  instructions: `You are evaluating an HR phone screen...`,
  focusAreas: ['resume_verification', 'motivations', 'communication'],
  weightOverrides: {
    technical_skills: 0.5,
    problem_solving: 0.3,
    job_alignment: 1.3
  }
};
```

**route.ts:**
```typescript
import { hrScreenGradingPrompt } from './prompts/hr_screen';
import { hiringManagerGradingPrompt } from './prompts/hiring_manager';

const prompts = {
  hr_screen: hrScreenGradingPrompt,
  hiring_manager: hiringManagerGradingPrompt,
  team_interview: teamInterviewGradingPrompt
};

const stagePrompt = prompts[stage];
systemPrompt = stagePrompt.instructions;
```

---

## Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Database Table** | Admin editable, flexible, scalable | Requires DB change, admin UI | Production, multiple customers |
| **Code Files** | Quick, version controlled, simple | Requires deployment to change | MVP, single customer |
| **Hybrid** | Best of both | More complex | Long-term solution |

---

## Recommendation

**For Now (MVP):** Use **Database Table**
- Consistent with existing pattern (interview_prompts)
- Easy to add to admin portal later
- Flexible for future needs

**Implementation:**
1. Create `feedback_stage_instructions` table
2. Add HR screen instructions
3. Update feedback API to use stage-specific instructions
4. Add to admin portal (later)

---

## Visual: How It All Fits Together

```
┌─────────────────────────────────────────┐
│  INTERVIEW STAGE: hr_screen             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  INTERVIEW PROMPT (conducting)          │
│  From: interview_prompts table          │
│  Stage: hr_screen                       │
│  Used by: Interview AI                  │
└─────────────────────────────────────────┘
              ↓
        [Interview Happens]
              ↓
┌─────────────────────────────────────────┐
│  GRADING INSTRUCTIONS (evaluating)      │
│  From: feedback_stage_instructions      │
│  Stage: hr_screen                       │
│  Used by: Grading AI                    │
└─────────────────────────────────────────┘
              ↓
        [Grading Happens]
```

**Key Point:** Each stage has TWO prompts:
1. One for conducting (interview_prompts)
2. One for grading (feedback_stage_instructions)

---

## Summary

**Question:** Will each interview get its own prompt file?

**Answer:** Yes, but stored in database (like interview prompts)

**How it works:**
- `interview_prompts` table → One prompt per stage (for conducting)
- `feedback_stage_instructions` table → One prompt per stage (for grading)
- Code fetches the right one based on stage
- Admin can edit both via admin portal

**For HR Screen:**
- Has its own row in `feedback_stage_instructions`
- Contains HR-specific grading instructions
- Code automatically uses it when stage = 'hr_screen'

