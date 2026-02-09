# How Interview Grading Works - Simple Explanation

## The Big Picture

**Interview happens** → **Transcript saved** → **AI reads everything** → **AI gives scores and feedback**

That's it! But let's break down each step.

---

## Step-by-Step: What Actually Happens

### Step 1: Interview Ends
```
User completes HR phone screen interview
↓
All conversation is saved as text in database
Example transcript:
  "Interviewer: Tell me about yourself.
   You: I'm a software engineer with 5 years experience...
   Interviewer: Why are you interested in this role?
   You: I'm looking for growth opportunities..."
```

**What we have:**
- ✅ Full conversation transcript (text)
- ✅ Job description (from dashboard)
- ✅ User's resume (from dashboard)
- ✅ Interview stage (hr_screen)

---

### Step 2: System Calls Grading API
```
Interview ends → System automatically calls /api/interview/feedback
```

**What the API does:**
1. Gets the transcript
2. Gets the job description
3. Gets the resume
4. Gets evaluation criteria (from admin portal)
5. Gets grading instructions (from admin portal)

**Tools used:**
- Database (Supabase) - stores all the data
- API route (`/api/interview/feedback`) - the code that does the work

---

### Step 3: Build the "Question" for AI

The system puts together a big prompt (instructions) for ChatGPT:

```
"Hey ChatGPT, here's what I need you to do:

1. I'm going to give you:
   - A job description
   - A candidate's resume
   - An interview transcript
   - Some criteria to evaluate on

2. Your job:
   - Read everything
   - Compare the candidate's answers to the job requirements
   - Give scores (1-10) for different areas
   - Write feedback explaining why

3. Here are the areas to evaluate:
   - Communication (how well they communicated)
   - Job Alignment (do they fit the role?)
   - Technical Skills (basic check for HR screen)
   - etc.

4. Be honest and tough. Don't sugarcoat.

5. Return your answer as JSON with scores and feedback."
```

**Tools used:**
- Code that builds the prompt
- Evaluation criteria from database
- Grading instructions from database

---

### Step 4: Send to ChatGPT

```
System sends the prompt to ChatGPT API
↓
ChatGPT reads everything
↓
ChatGPT analyzes and thinks
↓
ChatGPT returns scores and feedback
```

**What ChatGPT does:**
1. Reads the transcript
2. Compares answers to job description
3. Checks if resume matches what they said
4. Evaluates communication quality
5. Scores each area (1-10)
6. Writes feedback explaining scores

**Tools used:**
- OpenAI API (ChatGPT)
- Currently: GPT-4o-mini
- Should upgrade to: GPT-4 Turbo or GPT-5

---

### Step 5: ChatGPT Returns Results

ChatGPT sends back JSON like this:

```json
{
  "overall_score": 7,
  "area_scores": {
    "communication": 8,
    "job_alignment": 7,
    "technical_skills": 6,
    "cultural_fit": 7
  },
  "area_feedback": {
    "communication": "Candidate communicated clearly and professionally. Used specific examples like 'In my previous role, I led a team of 5 developers...'",
    "job_alignment": "Good alignment with role requirements. Expressed genuine interest in the position and understood the responsibilities."
  },
  "strengths": [
    "Clear communication style",
    "Genuine interest in the role",
    "Relevant experience"
  ],
  "weaknesses": [
    "Could be more specific about technical skills",
    "Didn't ask many questions about the role"
  ],
  "suggestions": [
    "Prepare more specific examples of technical work",
    "Ask more questions to show engagement"
  ]
}
```

---

### Step 6: Save and Display

```
System saves results to database
↓
User sees feedback on dashboard
```

**What user sees:**
- Overall score (7/10)
- Scores for each area
- Detailed feedback
- Strengths and weaknesses
- Suggestions for improvement

---

## The Tools Used

### 1. **Database (Supabase)**
   - Stores: transcript, job description, resume, criteria, settings
   - Like a filing cabinet

### 2. **API Route (`/api/interview/feedback`)**
   - The code that:
     - Gets data from database
     - Builds the prompt
     - Calls ChatGPT
     - Saves results
   - Like a worker that does all the organizing

### 3. **ChatGPT (OpenAI API)**
   - The AI that actually grades
   - Reads everything and gives scores/feedback
   - Like a human evaluator, but AI

### 4. **Evaluation Criteria (from Admin Portal)**
   - Tells ChatGPT WHAT to evaluate
   - Example: "Communication - evaluate clarity, professionalism..."
   - Like a rubric for grading

### 5. **Grading Instructions (from Admin Portal)**
   - Tells ChatGPT HOW to evaluate
   - Example: "Be honest and tough, compare to job requirements..."
   - Like instructions for the evaluator

---

## How It Works for HR Screen Specifically

### What Makes HR Screen Different?

**HR Screen Focus:**
- ✅ Did they match their resume? (Verification)
- ✅ Why do they want this role? (Motivations)
- ✅ Can they communicate clearly? (Communication)
- ✅ Do they meet basic requirements? (Basic Fit)

**HR Screen Does NOT Focus:**
- ❌ Deep technical skills (that's for hiring manager)
- ❌ Complex problem-solving (that's for technical interview)

### How We Make It HR Screen-Specific

**Option 1: Different Criteria**
- HR Screen uses: Communication, Job Alignment, Motivations, Basic Qualifications
- Hiring Manager uses: Technical Skills, Problem Solving, Experience Depth

**Option 2: Different Weights**
- HR Screen: Communication (high weight), Technical Skills (low weight)
- Hiring Manager: Technical Skills (high weight), Communication (medium weight)

**Option 3: Different Instructions**
- HR Screen: "Focus on verification and motivations, this is a screening call"
- Hiring Manager: "Focus on technical depth and problem-solving ability"

---

## Visual Flow

```
┌─────────────────────────────────────┐
│  INTERVIEW COMPLETES                │
│  Transcript saved to database       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SYSTEM GATHERS DATA                 │
│  - Gets transcript from database    │
│  - Gets job description             │
│  - Gets resume                      │
│  - Gets evaluation criteria         │
│  - Gets grading instructions        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SYSTEM BUILDS PROMPT               │
│  "Hey ChatGPT, evaluate this:       │
│   - Transcript: [full conversation] │
│   - Job: [job description]         │
│   - Resume: [candidate resume]     │
│   - Criteria: [what to evaluate]   │
│   - Instructions: [how to evaluate]"│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  CHATGPT ANALYZES                   │
│  - Reads transcript                 │
│  - Compares to job requirements     │
│  - Checks resume consistency        │
│  - Evaluates communication          │
│  - Scores each area (1-10)          │
│  - Writes feedback                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  CHATGPT RETURNS RESULTS            │
│  {                                  │
│    overall_score: 7,                │
│    area_scores: {...},              │
│    feedback: "..."                  │
│  }                                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SYSTEM SAVES TO DATABASE           │
│  - Saves scores                     │
│  - Saves feedback                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  USER SEES FEEDBACK                 │
│  - Overall score: 7/10               │
│  - Area scores                      │
│  - Detailed feedback                │
│  - Strengths/weaknesses              │
└─────────────────────────────────────┘
```

---

## Simple Analogy

**Think of it like a teacher grading an essay:**

1. **Student writes essay** = User does interview
2. **Teacher gets essay** = System gets transcript
3. **Teacher reads rubric** = System gets evaluation criteria
4. **Teacher grades** = ChatGPT analyzes
5. **Teacher writes feedback** = ChatGPT generates feedback
6. **Student sees grade** = User sees feedback

**The difference:**
- Instead of a teacher, it's ChatGPT
- Instead of an essay, it's an interview transcript
- Instead of a rubric, it's evaluation criteria from admin portal
- Instead of one grade, it's multiple scores (communication, job fit, etc.)

---

## What We Need to Implement

### For HR Screen Specifically:

1. **Tell ChatGPT this is an HR screen**
   - "You're evaluating an HR phone screen (5-10 min screening call)"

2. **Tell ChatGPT what to focus on**
   - "Focus on: verification, motivations, basic fit"
   - "Don't focus on: deep technical skills"

3. **Give ChatGPT the right criteria**
   - Use: Communication, Job Alignment, Motivations
   - Don't use: Deep Technical Skills (or use with low weight)

4. **Adjust the weights**
   - Communication: High weight (1.2)
   - Job Alignment: High weight (1.3)
   - Technical Skills: Low weight (0.5)

---

## Summary

**How grading works:**
1. Interview ends → Transcript saved
2. System gathers: transcript + job + resume + criteria
3. System builds prompt for ChatGPT
4. ChatGPT reads and analyzes everything
5. ChatGPT gives scores and feedback
6. System saves results
7. User sees feedback

**Tools:**
- Database (stores everything)
- API code (organizes everything)
- ChatGPT (does the grading)
- Criteria/instructions (tell ChatGPT what/how to grade)

**For HR Screen:**
- Just need to tell ChatGPT to focus on different things
- Use different criteria or weights
- Add stage-specific instructions

That's it! It's basically: **Give ChatGPT everything, tell it what to look for, it grades, you show results.**

