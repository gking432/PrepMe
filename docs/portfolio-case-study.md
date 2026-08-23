# PrepMe: Applied AI Interview Coaching

PrepMe is a public portfolio demo showing how generative and realtime AI can be integrated into a complete application workflow—not just placed behind a chat box.

## The user journey

1. A visitor supplies a resume and job posting, or loads fictional sample data.
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
- Structured model outputs and schema validation
- Evidence-linked scoring instead of generic AI feedback
- Model failure, microphone-denial, and sample-result fallbacks
- Prompt organization by interview stage and task
- Cost controls through payload limits and public-demo rate limits
- Browser-local persistence for a low-friction portfolio experience

## Reliability and safety decisions

The public demo provides sample data so a reviewer can reach the core experience immediately. Voice is recommended, but typed replies and a completed sample keep the demo usable in noisy environments or when microphone access is unavailable.

Public AI endpoints use request-size limits and best-effort per-instance throttles; deployment-level rate limits should also be enabled. The job URL fetcher rejects private-network destinations and validates redirects. Resume files are processed temporarily in portfolio mode and are not written to the public storage bucket.

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

## Extending the implementation

The same architecture supports hiring-manager, culture-fit, and final-round interviews by changing the stage prompt, rubric, and coaching mappings. For a production product, the browser-local demo store would be replaced by authenticated, encrypted persistence and shared edge rate limiting.
