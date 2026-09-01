# PrepMe: Applied AI Interview Coaching

PrepMe is a public portfolio demo showing how generative and realtime AI can be integrated into a complete application workflow—not just placed behind a chat box.

## The user journey

1. A visitor starts the live demo with fictional sample context or supplies a resume and job posting.
2. PrepMe normalizes that context into an interview profile.
3. OpenAI Realtime conducts an HR phone screen through WebRTC.
4. The visitor can answer by voice or text, and the conversation is converted into a structured transcript.
5. A grading pipeline evaluates the interview against six explicit HR-screen signals.
6. Weak signals are mapped into targeted, interactive coaching workshops.
7. Demo session, feedback, and completed workshops are stored locally in the browser, so no account is required.

## What this demonstrates

- Realtime audio and WebRTC lifecycle management
- Context assembly from resumes and job descriptions
- Typed and voice interaction through one conversation state
- Task-based model routing from a centralized model registry
- Zod-validated model contracts for grading, rewrites, and coaching output
- Evidence-linked scoring instead of generic AI feedback
- Model failure, microphone-denial, and sample-result fallbacks
- Prompt organization by interview stage and task
- Cost controls through payload limits and public-demo rate limits
- Browser-local persistence for a low-friction portfolio experience

The in-app AI implementation panel exposes this pipeline without forcing a hiring manager to read the repository first. It is a compact icon with activity notifications on a phone and a labeled control on larger screens. Its evaluation result is backed by the checked-in test suite rather than a hand-written marketing number.

## Reviewer paths

The primary demo is simply the product flow: add interview details, press **Continue**, answer by voice or text, end the session, and inspect the resulting evidence-linked coaching. **Fill demo data** is an optional setup shortcut that supplies a fictional résumé and job description without changing the path.

The optional **View demo feedback** shortcut seeds one deliberately weak, fully fictional completed interview. It puts all six HR signals into **Needs work** so a reviewer can inspect the complete evidence-to-coaching loop without conducting an interview:

1. Read the outcome and the explicit fictional-sample label.
2. Open the six-area analysis and select any weak signal.
3. Compare the source interview excerpt, rubric decision, and coaching route.
4. Launch the mapped workshop and see the framework-specific answer builder.

Both paths expose the AI implementation panel, so the technical implementation remains visible without competing with the product’s primary action.

## Model and contract boundaries

`lib/ai-models.ts` maps tasks—not pages—to model IDs: realtime interviewing, transcription, rubric grading, coaching generation, report synthesis, and fallbacks. Routes consume that registry so model changes have one reviewable source.

`lib/ai-contracts.ts` owns the structured boundaries. Grader output is checked before it can complete a grading attempt; coaching answers, guided suggestions, and rewrite batches are parsed and schema validated before they reach the UI. A malformed response fails the attempt instead of silently rendering a partial object.

## Checked-in evaluations

`tests/portfolio-demo.test.ts` runs eight published golden scenarios covering fictional-data isolation, sparse and complete interview coverage, the six-area repair mapping, valid and malformed feedback contracts, coaching output validation, and fenced-JSON recovery. The same scenario list appears in the technical panel so the visible claim and executable test stay aligned.

## Reliability and safety decisions

The public demo provides sample data so a reviewer can reach the core experience immediately. Voice is recommended, but typed replies and a completed sample keep the demo usable in noisy environments or when microphone access is unavailable.

Public AI endpoints use request-size limits and best-effort per-instance throttles; deployment-level rate limits should also be enabled. The job URL fetcher rejects private-network destinations and validates redirects. Resume files are processed temporarily in portfolio mode and are not written to the public storage bucket. Portfolio mode removes purchase prompts from the guided reviewer path.

## Architecture

```text
Resume + job context
        ↓
Interview prompt assembly
        ↓
OpenAI Realtime over WebRTC
        ↓
Structured transcript
        ↓
Rubric-based grading
        ↓
Evidence-linked feedback
        ↓
Targeted coaching workshops
```

## Current scope and extension points

The repository also contains account-backed, multi-stage product infrastructure. The public portfolio configuration intentionally presents only the HR-screen story because that is the most coherent end-to-end demo.

For a production product, browser-local demo state would be replaced by authenticated, encrypted persistence and shared edge rate limiting. The cached profile extraction described in `docs/ai-architecture-cached-profiles.md` is a future cost/latency design exploration; it is not represented as current production behavior.
