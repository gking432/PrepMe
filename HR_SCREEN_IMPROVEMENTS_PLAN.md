# HR Screen Interview Improvements - Implementation Plan

## Overview
This plan outlines all improvements needed for the HR screen interview to make it more realistic, structured, and effective.

## ⚠️ IMPORTANT SCOPE CLARIFICATION

**HR Screen ONLY:**
- All prompt changes, conversation flow, and structured scripts are **ONLY for `hr_screen` stage**
- Other interview stages (`hiring_manager`, `team_interview`) remain **completely unchanged**
- Their prompts, flow, and behavior should NOT be affected by these changes

**Data Sharing:**
- Interview transcripts and conversation data MUST be stored and accessible across all stages
- Future interview stages (hiring manager, team interview) can reference what was discussed in HR screen
- Grading/feedback dashboard can access all interview data
- Users can review their interview history

**Implementation:**
- All changes should be scoped with `if (stage === 'hr_screen')` checks
- Other stages should use their existing prompts and logic
- Transcript storage is shared across all stages

## Current Issues to Fix
1. ❌ No structured opening script
2. ❌ Technical questions being asked (should be basic only)
3. ❌ Questions being repeated
4. ❌ No follow-up questions based on answers
5. ❌ Not asking about resume experiences that pertain to role
6. ❌ Missing standard HR questions (why interested, why leaving, etc.)
7. ❌ Admin page affects all stages (should only affect HR screen for now)

---

## Implementation Plan

### Phase 1: Opening Script & Flow Structure

#### 1.1 Update Initial Greeting (`app/api/interview/start/route.ts`)
**Current:** Generic "Hello! I'm conducting your HR screen interview..."

**New Flow:**
```
Step 1: Opening
"Hey, I'm calling from [Company Name] about the [Position Name] position. 
I just want to speak with you for a few minutes to see if you're a good 
candidate for this position. Is now still a good time?"

Step 2: Wait for "yes" confirmation

Step 3: Structure Overview
"Great, so I thought I'd just give you a little information about our 
company and the position you're applying for, and then ask a few screener 
questions, and then you can ask me any questions that you may have. 
Does that sound good?"

Step 4: Wait for confirmation

Step 5: Company Information
[AI talks about company using website content]

Step 6: Job Overview
[AI talks about the position using job description]

Step 7: Begin Screening Questions
[Start asking resume-based and motivation questions]
```

**Implementation:**
- Modify `start/route.ts` to return structured initial message
- Add conversation state tracking to know which step we're on
- Store conversation state in session or frontend state

---

### Phase 2: Conversation State & Question Tracking

#### 2.1 Add Question Tracking
**Location:** `app/api/interview/voice/route.ts` and `app/interview/page.tsx`

**What to Track:**
- Questions already asked (array of question IDs/text)
- Current conversation phase (opening, company_intro, job_overview, screening, q_and_a)
- Candidate's previous answers (for follow-ups)

**Implementation:**
- Add `askedQuestions: string[]` to transcript/conversation state
- Pass this to API routes in each request
- Include in system prompt: "You have already asked: [list]. Do NOT repeat these questions."

---

### Phase 3: HR Screen System Prompt Updates

#### 3.1 Update Base System Prompt
**Location:** Database `interview_prompts` table, `hr_screen` stage

**New Prompt Structure:**
```
You are an HR representative conducting a 5-10 minute phone screen for [Company Name].

YOUR ROLE:
- This is a BRIEF screening call, not a technical interview
- Your goal: Verify candidate matches resume + understand motivations
- Keep it conversational and friendly
- NO technical questions (save those for hiring manager interview)

CONVERSATION FLOW:
1. Opening: Confirm good time
2. Structure: Explain what you'll cover
3. Company Intro: Share info about company (from website)
4. Job Overview: Describe the position (from job description)
5. Screening Questions: Ask 3-5 basic questions
6. Q&A: Let candidate ask questions
7. Closing: Schedule next steps

QUESTION GUIDELINES:
- Ask about work experience from resume that relates to this role
- Ask follow-up questions based on their answers
- Ask motivation questions: "What interests you about this position?", "Why are you moving on from your last job?"
- DO NOT ask technical questions
- DO NOT repeat questions you've already asked
- Keep questions brief and conversational

RESUME-BASED QUESTIONS:
- Reference specific companies, roles, or projects from their resume
- Ask: "I see you worked at [Company] as a [Role] - tell me about that experience"
- Ask follow-ups: "What did you learn from that?", "How does that relate to this role?"

MOTIVATION QUESTIONS:
- "What interests you about this position?"
- "Why are you moving on from your last job?"
- "What do you know about our company?"
- "Why do you think this role is a good fit for you?"

FOLLOW-UP LOGIC:
- After each answer, ask 1 follow-up question if the answer is interesting or needs clarification
- Follow-ups should be natural: "That's interesting, can you tell me more about [specific detail]?"
- Don't ask follow-ups for every question - be selective

CONVERSATION MEMORY:
- You have access to the full conversation transcript
- Track which questions you've already asked
- Do NOT repeat questions
- Reference previous answers when appropriate: "Earlier you mentioned [X], can you expand on that?"

CLOSING:
- After 4-6 screening questions (when you have verified identity and confirmed motivations)
- Say: "Perfect! I have your availability and I'll get something scheduled with the hiring manager. Thanks for your time today!"
- Do NOT continue asking questions after you have the information you need
```

---

### Phase 4: API Route Updates

**⚠️ CRITICAL: All changes must be scoped to `hr_screen` only!**

#### 4.1 Update `app/api/interview/start/route.ts`
**Changes:**
- **ONLY for `hr_screen`:** Return structured opening message (Step 1)
- **ONLY for `hr_screen`:** Include conversation phase in response
- **ONLY for `hr_screen`:** Add instructions for next steps
- **Other stages:** Keep existing logic unchanged

#### 4.2 Update `app/api/interview/voice/route.ts`
**Changes:**
- **ONLY for `hr_screen`:** Accept `conversationPhase` and `askedQuestions` in request
- **ONLY for `hr_screen`:** Include in system prompt: current phase + questions already asked
- **ONLY for `hr_screen`:** Add logic to determine next phase based on conversation
- **ONLY for `hr_screen`:** Include follow-up instructions in prompt
- **Other stages:** Use existing prompt building logic
- **All stages:** Ensure transcript is saved (already done, but verify)

#### 4.3 Update `app/api/interview/text/route.ts`
**Changes:**
- Same as voice route (for text input fallback)
- **ONLY for `hr_screen`:** Apply new logic
- **Other stages:** Keep existing behavior

#### 4.4 Update `app/api/interview/realtime/route.ts`
**Changes:**
- Same as voice route (for realtime API)
- **ONLY for `hr_screen`:** Apply new logic
- **Other stages:** Keep existing behavior

---

### Phase 5: Frontend Conversation State Management

#### 5.1 Update `app/interview/page.tsx`
**Add State (ONLY for hr_screen):**
```typescript
// Only initialize for hr_screen stage
const [conversationPhase, setConversationPhase] = useState<'opening' | 'company_intro' | 'job_overview' | 'screening' | 'q_and_a' | 'closing' | null>(stage === 'hr_screen' ? 'opening' : null)
const [askedQuestions, setAskedQuestions] = useState<string[]>([])
```

**Update API Calls:**
- **ONLY for `hr_screen`:** Include `conversationPhase` and `askedQuestions` in API requests
- **ONLY for `hr_screen`:** Update state based on AI responses
- **ONLY for `hr_screen`:** Track when AI asks questions to add to `askedQuestions` array
- **All stages:** Ensure transcript is saved to database (for future stages to access)

---

### Phase 6: Admin Page Updates

#### 6.1 Filter to HR Screen Only
**Location:** `app/admin/page.tsx`

**Changes:**
- Only load and display `hr_screen` prompt
- Hide/disable `hiring_manager` and `team_interview` prompts
- Add note: "Currently editing HR Screen only. Other stages coming soon."

---

## Implementation Order

1. **First:** Update system prompt in database (Phase 3)
2. **Second:** Add conversation state tracking (Phase 2, 5)
3. **Third:** Update opening script (Phase 1, 4.1)
4. **Fourth:** Update voice/text/realtime routes (Phase 4)
5. **Fifth:** Update admin page (Phase 6)

---

## Testing Checklist

### HR Screen Functionality
- [ ] Opening script follows exact flow
- [ ] AI waits for confirmations before proceeding
- [ ] Company information is shared from website
- [ ] Job overview is shared from job description
- [ ] Questions are based on resume experiences
- [ ] Motivation questions are asked
- [ ] No technical questions are asked
- [ ] Follow-up questions are asked based on answers
- [ ] Questions are not repeated
- [ ] Interview closes naturally after 4-6 questions
- [ ] Admin page only shows HR screen

### Scope Isolation (CRITICAL)
- [ ] `hiring_manager` stage still works with existing prompts
- [ ] `team_interview` stage still works with existing prompts
- [ ] Other stages do NOT use HR screen structured flow
- [ ] Other stages do NOT use HR screen conversation tracking
- [ ] Changes are properly scoped with `if (stage === 'hr_screen')` checks

### Data Storage & Sharing
- [ ] HR screen transcript is saved to database
- [ ] Transcript is accessible to grading dashboard
- [ ] Transcript can be accessed by future interview stages
- [ ] User can review interview history
- [ ] All conversation data persists correctly

---

## Notes

### Scope Isolation
- **ALL changes must be scoped to `hr_screen` stage only**
- Use `if (stage === 'hr_screen')` checks in all API routes
- Other interview stages (`hiring_manager`, `team_interview`) should use their existing prompts/logic
- Do NOT modify shared logic that affects other stages

### Data Storage & Sharing
- **Transcripts are shared** - stored in `interview_sessions.transcript` column
- All interview stages can read previous stage transcripts
- Conversation data (asked questions, phases) should be stored in session or transcript
- Future interviews can reference HR screen discussions

### Implementation Safety
- Test that `hiring_manager` and `team_interview` still work after changes
- Ensure admin page only shows HR screen for editing (other stages hidden)
- Verify transcript storage works across all stages

