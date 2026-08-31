# Interview App AI Architecture: Cached Profile Extraction + Flagged Module Generation

> **Status: design exploration, not the current portfolio-demo architecture.** The running demo passes scoped resume and job context into flagged coaching modules. See `docs/portfolio-case-study.md` for the implemented system. This document is retained as a production cost/latency proposal, not as a claim about shipped behavior.

## Purpose

This document defines the recommended AI architecture for keeping generation costs low while still producing high-quality, personalized interview coaching.

The core strategy is:

```
Resume + Job Description upload
→ One reusable extraction/compression call
→ Save structured candidate and role profiles
→ Run targeted generation only for modules that are actually flagged
```

This avoids generating every possible coaching module upfront while also avoiding repeatedly sending the full resume and job description into every later prompt.

---

## 1. Core Recommendation

Use a hybrid architecture:

**Step 1: Upfront Extraction**

When the user uploads or enters a resume and job description, make one API call to create reusable structured summaries:

```
Full Resume + Full Job Description
→ CandidateInterviewProfile + TargetRoleProfile
```

Store those profiles in the database/session.

**Step 2: Mock Interview**

The user completes the interview simulation.
The system scores the interview and flags weak modules.

Example flagged modules:

```
- Professional Introduction
- Career Alignment
- Specific Evidence / STAR
```

**Step 3: Targeted Module Generation**

Only generate coaching and improved answers for modules that were actually flagged.

Each targeted generation should use:

```
CandidateInterviewProfile
+ TargetRoleProfile
+ flagged question
+ user's original answer
+ module-specific structured inputs
→ improved answer/coaching
```

Do not send the full resume and full job description again unless absolutely necessary.

---

## 2. Why This Architecture

There are three possible approaches.

### Option A: Generate Everything Upfront

```
Resume + JD upload
→ generate professional intro
→ generate career alignment
→ generate STAR answers
→ generate uncertainty answers
→ generate curiosity questions
→ generate strengths/weaknesses
→ generate all coaching modules
```

**Pros**

- Fast results later
- Some outputs are ready immediately
- Less latency after interview

**Cons**

- Expensive
- Generates many assets the user may never need
- Outputs are less personalized because the system has not seen the user's actual weak answer yet
- Harder to know which modules matter before the interview happens

**Verdict:** Do not use this for MVP. This is usually wasteful because the app may generate answers for modules that never get flagged.

### Option B: Generate Only After Flagging, Using Full Resume/JD Every Time

```
User completes interview
→ module gets flagged
→ send full resume + full JD + original answer to API
→ generate coaching
```

**Pros**

- Only generates what the user needs
- More personalized than upfront generation
- Simple to implement

**Cons**

- Repeatedly sends large resume/JD context
- Higher repeated input-token cost
- Slower if multiple modules are flagged
- Less scalable as the app adds more modules

**Verdict:** Better than generating everything upfront, but not optimal.

### Option C: Cached Extraction + Flagged Module Generation

```
Resume + JD upload
→ one extraction/compression call
→ save reusable profile summaries
→ later generate only flagged modules using summaries
```

**Pros**

- Lower repeated token cost
- Generates only what the user actually needs
- More personalized because it uses the flagged question and original answer
- Scales well across modules
- Reusable across the full interview flow
- Good balance between cost, speed, and quality

**Cons**

- Requires profile schemas and caching
- Requires fallback logic if the summary is missing or insufficient

**Verdict:** Recommended architecture.

---

## 3. High-Level Pipeline

```
1. User uploads resume and job description

2. App makes one extraction call:
   Full resume + full JD
   → CandidateInterviewProfile
   → TargetRoleProfile

3. App saves both profiles

4. User completes mock interview

5. App scores the interview and flags weak areas

6. For each flagged module:
   - Use cached CandidateInterviewProfile
   - Use cached TargetRoleProfile
   - Include flagged question
   - Include user's original answer
   - Include any small module-specific user choices
   - Generate targeted coaching/answer

7. Store generated module output

8. Show user only the modules that were flagged
```

---

## 4. What to Generate Upfront

Generate only reusable structured context.
Do not generate full interview answers upfront.

**Upfront Extraction Should Produce:**

```
CandidateInterviewProfile
TargetRoleProfile
```

These profiles should be compact enough to reuse in later prompts but detailed enough to support multiple coaching modules.

---

## 5. CandidateInterviewProfile Schema

```ts
type CandidateInterviewProfile = {
  professionalIdentity: string;

  careerArc: string;

  currentSituation?: string;

  strongestExperienceAreas: string[];

  coreSkills: string[];

  relevantCompaniesOrProjects: string[];

  strongestProofPoints: CandidateProofPoint[];

  possibleConcerns: CandidateConcern[];

  likelyStorySeeds: CandidateStorySeed[];
};
```

### Supporting Types

```ts
type CandidateProofPoint = {
  source: string;
  claim: string;
  evidence: string;
  usefulForModules: InterviewModuleType[];
};

type CandidateConcern = {
  concern: string;
  whyItMayMatter: string;
  suggestedFraming: string;
};

type CandidateStorySeed = {
  storyTheme: string;
  sourceExperience: string;
  whyUseful: string;
  likelyQuestionTypes: string[];
};

type InterviewModuleType =
  | "professional_introduction"
  | "career_alignment"
  | "specific_evidence_star"
  | "handling_uncertainty"
  | "company_knowledge_curiosity"
  | "pace_conversation_flow"
  | "strengths_weaknesses"
  | "general";
```

### Example CandidateInterviewProfile

```json
{
  "professionalIdentity": "[Concise professional identity derived at runtime]",
  "careerArc": "[Relevant career through-line derived at runtime]",
  "currentSituation": "[Current situation supplied by the candidate]",
  "strongestExperienceAreas": [
    "[Relevant experience area]"
  ],
  "coreSkills": [
    "[Relevant skill]"
  ],
  "relevantCompaniesOrProjects": [
    "[Source label; never hardcode a real user's employer in examples]"
  ],
  "strongestProofPoints": [
    {
      "source": "[Candidate-provided source]",
      "claim": "[Supported claim]",
      "evidence": "[Evidence from supplied materials]",
      "usefulForModules": [
        "professional_introduction",
        "career_alignment",
        "specific_evidence_star"
      ]
    }
  ],
  "possibleConcerns": [
    {
      "concern": "[Evidence-based concern]",
      "whyItMayMatter": "[Interview relevance]",
      "suggestedFraming": "[Truthful framing guidance]"
    }
  ],
  "likelyStorySeeds": [
    {
      "storyTheme": "[Candidate-provided story theme]",
      "sourceExperience": "[Candidate-provided source]",
      "whyUseful": "[Relevant competencies]",
      "likelyQuestionTypes": [
        "[Matching interview question type]"
      ]
    }
  ]
}
```

---

## 6. TargetRoleProfile Schema

```ts
type TargetRoleProfile = {
  roleTitle?: string;

  companyName?: string;

  roleCategory: string;

  topResponsibilities: string[];

  topSkills: string[];

  likelyInterviewPriorities: string[];

  roleFitThemes: string[];

  companyOrIndustryThemes?: string[];

  possibleRisksForCandidate?: string[];
};
```

### Example TargetRoleProfile

```json
{
  "roleTitle": "Animal Care Operations Coordinator",
  "companyName": "Moonrise Wildlife Sanctuary",
  "roleCategory": "Wildlife care operations",
  "topResponsibilities": [
    "Coordinate animal intake",
    "Maintain treatment and care records",
    "Schedule volunteer coverage",
    "Arrange wildlife transport",
    "Track care supplies"
  ],
  "topSkills": [
    "Animal-care coordination",
    "Record keeping",
    "Volunteer scheduling",
    "Calm communication",
    "Operational follow-through"
  ],
  "likelyInterviewPriorities": [
    "Can the candidate prioritize urgent intake needs?",
    "Can the candidate coordinate staff and volunteers?",
    "Can the candidate keep accurate care records?",
    "Can the candidate communicate clearly during time-sensitive transfers?"
  ],
  "roleFitThemes": [
    "Animal welfare",
    "Care operations",
    "Reliable documentation",
    "Volunteer coordination",
    "Team communication"
  ],
  "companyOrIndustryThemes": [
    "Wildlife rehabilitation",
    "Seasonal intake volume",
    "Safe animal transport"
  ],
  "possibleRisksForCandidate": [
    "May need to show experience handling competing animal-care priorities.",
    "May need to explain how record accuracy is maintained during urgent intake periods."
  ]
}
```

---

## 7. Upfront Extraction Call

### Input

```ts
type ProfileExtractionInput = {
  resumeText: string;
  jobDescriptionText: string;
  companyName?: string;
  roleTitle?: string;
};
```

### Output

```ts
type ProfileExtractionOutput = {
  candidateProfile: CandidateInterviewProfile;
  targetRoleProfile: TargetRoleProfile;
};
```

### Prompt

```
You are preparing reusable structured context for an interview simulation app.

The user has uploaded a resume and a job description.

Your task is to extract compact, reusable profiles that can support multiple later interview coaching modules.

Do not generate interview answers yet.

Create:

1. CandidateInterviewProfile
2. TargetRoleProfile

The CandidateInterviewProfile should summarize the candidate's background, strengths, proof points, likely concerns, and possible story seeds.

The TargetRoleProfile should summarize the role, company if available, key responsibilities, required skills, likely interviewer priorities, role fit themes, and possible risks for the candidate.

Important rules:
- Do not invent metrics, companies, job titles, achievements, certifications, or outcomes.
- Use only information supported by the resume and job description.
- Keep the profiles compact enough to reuse in later prompts.
- Preserve useful specifics such as company names, project names, responsibilities, and strong proof points.
- Avoid long paragraphs where structured bullets are better.
- Do not generate final interview answers in this step.
- Do not coach the user yet.

Resume:
{{resumeText}}

Job description:
{{jobDescriptionText}}

Known company name:
{{companyName}}

Known role title:
{{roleTitle}}

Return valid JSON only using this exact shape:

{
  "candidateProfile": {
    "professionalIdentity": "...",
    "careerArc": "...",
    "currentSituation": "...",
    "strongestExperienceAreas": ["..."],
    "coreSkills": ["..."],
    "relevantCompaniesOrProjects": ["..."],
    "strongestProofPoints": [
      {
        "source": "...",
        "claim": "...",
        "evidence": "...",
        "usefulForModules": ["..."]
      }
    ],
    "possibleConcerns": [
      {
        "concern": "...",
        "whyItMayMatter": "...",
        "suggestedFraming": "..."
      }
    ],
    "likelyStorySeeds": [
      {
        "storyTheme": "...",
        "sourceExperience": "...",
        "whyUseful": "...",
        "likelyQuestionTypes": ["..."]
      }
    ]
  },
  "targetRoleProfile": {
    "roleTitle": "...",
    "companyName": "...",
    "roleCategory": "...",
    "topResponsibilities": ["..."],
    "topSkills": ["..."],
    "likelyInterviewPriorities": ["..."],
    "roleFitThemes": ["..."],
    "companyOrIndustryThemes": ["..."],
    "possibleRisksForCandidate": ["..."]
  }
}
```

---

## 8. Storage Recommendation

Store the extraction output once per interview setup.

```ts
type InterviewSetupContext = {
  id: string;
  userId: string;

  resumeText?: string;
  jobDescriptionText?: string;

  companyName?: string;
  roleTitle?: string;

  candidateProfile: CandidateInterviewProfile;
  targetRoleProfile: TargetRoleProfile;

  createdAt: string;
  updatedAt: string;
};
```

If resume or job description changes, invalidate and regenerate the profiles.

```
If resumeText changes → regenerate CandidateInterviewProfile
If jobDescriptionText changes → regenerate TargetRoleProfile
If both change → regenerate both
```

For simplicity in MVP, regenerate both profiles whenever either resume or JD changes.

---

## 9. Module Generation Pattern

Every module should follow this pattern:

```
Module Triggered
→ Use cached CandidateInterviewProfile
→ Use cached TargetRoleProfile
→ Add module-specific context
→ Generate targeted answer/coaching
```

Do not resend the full resume/JD by default.

---

## 10. Example: Career Alignment Module

### Input

```ts
type CareerAlignmentInput = {
  flaggedQuestion: string;
  userOriginalAnswer?: string;

  candidateProfile: CandidateInterviewProfile;
  targetRoleProfile: TargetRoleProfile;

  observationChoice: CareerAlignmentObservationChoice;
  fitChoice: CareerAlignmentFitChoice;
  timingChoice: CareerAlignmentTimingChoice;

  tone?: CareerAlignmentTone;
  length?: CareerAlignmentLength;
};
```

### Generation Pattern

```
Flagged question
+ Original answer
+ CandidateInterviewProfile
+ TargetRoleProfile
+ 3 multiple-choice framework choices
→ Stronger answer using Observation → Evidence of Fit → Timing
```

This should be one API call.

---

## 11. Example: Professional Introduction Module

### Input

```ts
type ProfessionalIntroductionInput = {
  candidateProfile: CandidateInterviewProfile;
  targetRoleProfile: TargetRoleProfile;

  currentSituation: CurrentSituation;
  professionalIdentityStyle: ProfessionalIdentityStyle;

  tone?: ProfessionalIntroductionTone;
  length?: ProfessionalIntroductionLength;
};
```

### Generation Pattern

```
CandidateInterviewProfile
+ TargetRoleProfile
+ current situation
+ identity style
→ Tell me about yourself answer
```

Structure:

```
Present → Past → Future
```

Present defines the candidate's current professional lane, Past selects the one or two experiences that best explain it, and Future connects that through-line to the target role and company.

This should be one API call only when this module is flagged or requested.

---

## 12. Example: STAR / Specific Evidence Module

### Input

```ts
type StarStoryInput = {
  candidateProfile: CandidateInterviewProfile;
  targetRoleProfile: TargetRoleProfile;

  storyType: string;
  setting: string;
  situationType: string;
  situationDetail?: string;
  stakes: string[];
  userRole: string;
  actionsTaken: string[];
  actionDetails: {
    actionId: string;
    detail?: string;
  }[];
  resultTypes: string[];
  hasMetric: "yes" | "no" | "not_sure";
  metricType?: string;
  metricValue?: string;
  metricContext?: string;
  nonMetricProofs?: string[];
  proofDetail?: string;
};
```

### Generation Pattern

```
CandidateInterviewProfile
+ TargetRoleProfile
+ User's structured STAR choices
→ STAR answer
```

The STAR module should rely more heavily on user-selected story details than resume text because the resume usually does not contain enough detail for a true STAR answer.

---

## 13. When to Fall Back to Full Resume/JD

Normally, use cached profiles.

Only include full resume or full job description in a targeted module call if:

```
1. The cached profile is missing
2. The cached profile is too vague
3. The module requires details not captured in the profile
4. The user asks to use a specific resume bullet or JD detail
5. The answer quality is poor and a regeneration needs more context
```

For MVP, use this fallback rule:

```
If candidateProfile or targetRoleProfile exists, use it.
If not, use resumeText and jobDescriptionText.
```

---

## 14. Cost Control Rules

### Do Upfront

```
- One extraction/compression call on resume/JD upload
- Save CandidateInterviewProfile
- Save TargetRoleProfile
```

### Do On Demand

```
- Generate improved answers only for flagged modules
- Use cached profiles instead of full resume/JD
- Include the flagged question and user's original answer
- Include small module-specific user inputs
```

### Do Not Do Upfront

```
- Generate all possible module answers
- Generate STAR stories before the user selects a story
- Generate professional intro unless flagged/requested
- Generate career alignment unless flagged/requested
- Generate curiosity questions unless flagged/requested
- Generate strengths/weaknesses unless flagged/requested
```

### Avoid Repeatedly Sending

```
- Full resume
- Full job description
```

Use the structured summaries instead.

---

## 15. Latency Strategy

The upfront extraction call can happen immediately after the user submits their resume/JD.

The UI can show:

```
Preparing your interview profile...
```

This call is reusable, so the user only waits once.

Later targeted module generation will be faster because prompts are smaller.

---

## 16. Quality Strategy

The targeted module calls should include:

```
1. Cached candidate profile
2. Cached role profile
3. The actual flagged question
4. The user's original answer
5. Module-specific user selections
```

This is better than generating everything upfront because the app now knows exactly what the user struggled with.

For example, Career Alignment should be generated after seeing the weak answer, not before.

---

## 17. Recommended MVP Implementation

### Phase 1

Implement:

```
Resume/JD upload
→ profile extraction call
→ save profiles
```

Then use profiles in:

```
Professional Introduction
Career Alignment
STAR / Specific Evidence
```

### Phase 2

Expand profile reuse into:

```
Handling Uncertainty
Company Knowledge / Curiosity
Strengths / Weaknesses
Pace / Conversation Flow
```

### Phase 3

Add profile refresh logic:

```
If resume changes, regenerate candidate profile.
If JD changes, regenerate role profile.
If both change, regenerate both.
```

---

## 18. Summary

The recommended architecture is:

```
Upload resume/JD
→ Extract reusable profiles once
→ Cache them
→ Run targeted generation only for flagged modules
```

This is better than generating all coaching upfront because:

```
1. It avoids paying for unused modules.
2. It keeps prompts smaller after setup.
3. It uses the actual flagged question and weak answer.
4. It scales across many coaching modules.
5. It improves answer relevance while controlling cost.
```

The core cost-saving principle:

```
Compress once.
Reuse often.
Generate only what is needed.
```

---

## 19. Implementation Notes

These notes capture important considerations for when this architecture is implemented.

### Single Point of Failure in Extraction

The extraction call is the foundation everything else builds on. If it mischaracterizes the career arc, misses a key proof point, or gets the role category wrong, every downstream module inherits that error. This is amplified because unlike a one-off generation mistake (which only affects one answer), an extraction mistake silently degrades all flagged modules.

**Recommendation:** Use a stronger model for the extraction call (Sonnet instead of Haiku). Since it runs once per interview setup, the cost difference is small (~$0.02-0.04 vs. ~$0.005-0.01), but the quality improvement propagates across every module that uses the cached profiles.

### Break-Even Depends on Flag Count

The extraction call is overhead that only pays for itself when multiple modules consume the cached profiles. If a user triggers only 1 flagged module, sending the full resume/JD directly (Option B) would have been cheaper. At 2 flagged modules, the approaches are roughly equal. At 3-5 flagged modules, the cached profile approach clearly wins.

Given that most weak interviews flag 2-4 areas, the math works for the typical case. But for users who nail everything except one question, the extraction call is a sunk cost. This is acceptable — the architecture optimizes for the common case.

### Section 10 Inconsistency with Current Implementation

The CareerAlignmentInput example in section 10 includes `observationChoice`, `fitChoice`, and `timingChoice` as user-selected inputs. The current Career Alignment Builder implementation is a one-click flow with no user choices — the observation anchor and question intent are inferred by the model. This inconsistency should be reconciled when this architecture is implemented. Either update the schema to match the current one-click design, or decide whether future iterations of the module will reintroduce lightweight user choices.

### Extraction Timing and Latency

The extraction call maps naturally to the existing flow: the user uploads their resume and JD when setting up an interview session. The extraction can run in parallel with interview session creation, so there is zero added user-facing latency. The profiles are ready before the interview even starts.

### suggestedFraming Does Light Coaching in Extraction

The `suggestedFraming` field inside `possibleConcerns` is doing a small amount of coaching work inside the extraction step — it is pre-deciding how to frame sensitive areas (career gaps, transitions, broad backgrounds). This is actually beneficial: it means every downstream module gets consistent framing for these areas instead of each module independently deciding how to handle them. A career transition framed one way in Career Alignment and a different way in Professional Introduction would feel disjointed to the user.
