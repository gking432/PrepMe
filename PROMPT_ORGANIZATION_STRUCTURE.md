# Prompt Organization Structure - Three-Agent Architecture

## Current State

### Existing Prompt Storage

1. **Interviewer Prompts** ✅
   - **Table**: `interview_prompts`
   - **Structure**: One row per stage
   - **Fields**: `stage`, `system_prompt`, `question_set`, `tone`, `depth_level`
   - **Used by**: Interviewer Agent (GPT-4o)
   - **Location in code**: `app/api/interview/voice/route.ts`, `app/api/interview/realtime/route.ts`

2. **Grader Prompts** ✅
   - **Table**: `feedback_stage_instructions`
   - **Structure**: One row per stage
   - **Fields**: `stage`, `evaluation_instructions`, `focus_areas`, `excluded_areas`, `weight_overrides`
   - **Used by**: Grader Agent (Claude Sonnet 4)
   - **Location in code**: `app/api/interview/feedback/route.ts`

3. **Observer Prompts** ❌ **MISSING**
   - **Need**: One prompt per stage for real-time note-taking
   - **Used by**: Observer Agent (GPT-4o-mini)

---

## Proposed Structure

### Option 1: New Table for Observer Prompts (Recommended)

**Create `observer_prompts` table** (consistent with existing pattern):

```sql
CREATE TABLE IF NOT EXISTS public.observer_prompts (
  stage TEXT PRIMARY KEY, -- 'hr_screen', 'hiring_manager', 'team_interview', etc.
  system_prompt TEXT NOT NULL, -- Observer agent instructions
  note_schema JSONB, -- JSON schema for structured notes output
  red_flag_keywords TEXT[], -- Keywords to watch for
  quality_indicators JSONB, -- What constitutes strong/weak answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Pros:**
- ✅ Consistent with existing pattern (`interview_prompts`, `feedback_stage_instructions`)
- ✅ Easy to manage via admin portal
- ✅ One table per agent type (clear separation)
- ✅ Can add stage-specific observer logic

**Cons:**
- ❌ Another table to manage
- ❌ Need to add to admin UI

---

### Option 2: Unified Agent Prompts Table

**Create single `agent_prompts` table** for all agents:

```sql
CREATE TABLE IF NOT EXISTS public.agent_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_type TEXT NOT NULL, -- 'interviewer', 'observer', 'grader'
  stage TEXT NOT NULL, -- 'hr_screen', 'hiring_manager', etc.
  system_prompt TEXT NOT NULL,
  config JSONB, -- Agent-specific configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_type, stage)
);
```

**Pros:**
- ✅ Single table for all prompts
- ✅ Easy to query all prompts for a stage
- ✅ Consistent structure

**Cons:**
- ❌ Requires migrating existing tables
- ❌ Less flexible (different agents need different fields)
- ❌ Breaks existing pattern

---

### Option 3: Code Files (For Development/Version Control)

**Create file structure**:

```
/prompts/
  /interviewer/
    hr_screen.ts
    hiring_manager.ts
    team_interview.ts
  /observer/
    hr_screen.ts
    hiring_manager.ts
    team_interview.ts
  /grader/
    hr_screen.ts
    hiring_manager.ts
    team_interview.ts
```

**Example file** (`prompts/observer/hr_screen.ts`):
```typescript
export const hrScreenObserverPrompt = {
  systemPrompt: `You are observing an HR phone screen interview...`,
  noteSchema: {
    question_id: 'string',
    quality_flag: 'strong|okay|weak',
    should_practice: 'boolean',
    // ... etc
  },
  redFlagKeywords: ['badmouthing', 'inconsistent', 'defensive'],
  qualityIndicators: {
    strong: ['specific metrics', 'STAR method', 'concrete examples'],
    weak: ['vague', 'generic', 'rambling']
  }
};
```

**Pros:**
- ✅ Version controlled (git)
- ✅ Easy to review changes
- ✅ No database migrations
- ✅ Type-safe (TypeScript)

**Cons:**
- ❌ Requires code deployment to change
- ❌ Can't be edited by non-developers
- ❌ Inconsistent with current database approach

---

## Recommended Approach: Option 1 (New Table)

### Why Option 1?

1. **Consistency**: Matches your existing pattern (`interview_prompts`, `feedback_stage_instructions`)
2. **Flexibility**: Can add observer-specific fields without affecting other agents
3. **Admin-friendly**: Can add to admin portal alongside existing prompt editors
4. **No migration needed**: Existing tables stay as-is

### Implementation

#### 1. Database Schema

```sql
-- Observer prompts (for real-time note-taking agent)
CREATE TABLE IF NOT EXISTS public.observer_prompts (
  stage TEXT PRIMARY KEY, -- 'hr_screen', 'hiring_manager', 'team_interview'
  system_prompt TEXT NOT NULL, -- Full observer agent instructions
  note_schema JSONB, -- JSON schema for structured notes (optional, for validation)
  red_flag_keywords TEXT[], -- Keywords to watch for red flags
  quality_indicators JSONB, -- What constitutes strong/weak/okay answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.observer_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admins can view observer prompts"
  ON public.observer_prompts FOR SELECT
  USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update observer prompts"
  ON public.observer_prompts FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert observer prompts"
  ON public.observer_prompts FOR INSERT
  WITH CHECK (true);
```

#### 2. Insert Default HR Screen Observer Prompt

```sql
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
);
```

#### 3. Code Usage

**In `lib/observer-agent.ts`**:
```typescript
import { supabaseAdmin } from '@/lib/supabase'

export async function getObserverPrompt(stage: string) {
  const { data, error } = await supabaseAdmin
    .from('observer_prompts')
    .select('*')
    .eq('stage', stage)
    .single()
  
  if (error || !data) {
    throw new Error(`Observer prompt not found for stage: ${stage}`)
  }
  
  return {
    systemPrompt: data.system_prompt,
    redFlagKeywords: data.red_flag_keywords || [],
    qualityIndicators: data.quality_indicators || {}
  }
}
```

---

## Complete Prompt Matrix

### All Prompts by Stage × Agent

| Stage | Interviewer | Observer | Grader |
|-------|-------------|----------|--------|
| `hr_screen` | `interview_prompts` | `observer_prompts` | `feedback_stage_instructions` |
| `hiring_manager` | `interview_prompts` | `observer_prompts` | `feedback_stage_instructions` |
| `team_interview` | `interview_prompts` | `observer_prompts` | `feedback_stage_instructions` |
| *(future stages)* | `interview_prompts` | `observer_prompts` | `feedback_stage_instructions` |

**Total**: 3 tables × N stages = 3N prompts

---

## File Organization (Alternative: Code Files)

If you prefer code files for version control, here's the structure:

```
/prompts/
  /interviewer/
    hr_screen.ts          # Interviewer prompt for HR screen
    hiring_manager.ts     # Interviewer prompt for hiring manager
    team_interview.ts     # Interviewer prompt for team interview
  
  /observer/
    hr_screen.ts          # Observer prompt for HR screen
    hiring_manager.ts     # Observer prompt for hiring manager
    team_interview.ts     # Observer prompt for team interview
  
  /grader/
    hr_screen.ts          # Grader prompt for HR screen (Claude)
    hiring_manager.ts     # Grader prompt for hiring manager (Claude)
    team_interview.ts     # Grader prompt for team interview (Claude)
```

**Example** (`prompts/observer/hr_screen.ts`):
```typescript
export const hrScreenObserverPrompt = {
  systemPrompt: `You are observing an HR phone screen interview...`,
  noteSchema: {
    type: 'object',
    properties: {
      question_id: { type: 'string' },
      quality_flag: { type: 'string', enum: ['strong', 'okay', 'weak'] },
      should_practice: { type: 'boolean' },
      // ... etc
    }
  },
  redFlagKeywords: ['badmouthing', 'inconsistent', 'defensive'],
  qualityIndicators: {
    strong: ['specific metrics', 'STAR method'],
    weak: ['vague', 'generic']
  }
}
```

**Usage in code**:
```typescript
import { hrScreenObserverPrompt } from '@/prompts/observer/hr_screen'
import { hrScreenGraderPrompt } from '@/prompts/grader/hr_screen'
```

---

## Recommendation: Hybrid Approach

**Best of both worlds:**

1. **Database for production** (admin-editable):
   - `interview_prompts` ✅ (existing)
   - `observer_prompts` ⭐ (new)
   - `feedback_stage_instructions` ✅ (existing)

2. **Code files for development** (version control):
   - Keep prompts in `/prompts/` directory for git tracking
   - Use database as source of truth in production
   - Script to sync code → database on deploy

**Benefits:**
- ✅ Version controlled prompts (git)
- ✅ Admin can edit in production (database)
- ✅ Easy to test changes (code files)
- ✅ Consistent with existing pattern

---

## Summary

**Current State:**
- ✅ Interviewer prompts: `interview_prompts` table
- ✅ Grader prompts: `feedback_stage_instructions` table
- ❌ Observer prompts: **MISSING**

**Recommended Solution:**
- Create `observer_prompts` table (consistent with existing pattern)
- One row per stage
- Add to admin portal for editing
- Use in `lib/observer-agent.ts`

**Total Prompts Needed:**
- 3 agents × 4 stages = **12 prompts**
- All stored in database (3 tables)
- All editable via admin portal

**Next Steps:**
1. Add `observer_prompts` table to schema
2. Insert default HR screen observer prompt
3. Update `lib/observer-agent.ts` to fetch from table
4. Add observer prompt editor to admin portal

