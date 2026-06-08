# CLAUDE.md — PrepMe Project Guide

> **IMPORTANT**: This file must be continuously updated by Claude with the current vision, completed work, in-progress tasks, and future outlook. Every session should read this file at the start and update it before finishing. This is the single source of truth for project continuity.

---

## Project Overview

**PrepMe** is an AI-powered interview preparation platform. Users practice mock interviews with an AI interviewer (voice-based), receive detailed performance feedback, and practice their weak areas through Duolingo-style interactive lessons guided by Preppi (a parrot mascot).

### Tech Stack
- **Framework**: Next.js 14 (App Router) with React 18, TypeScript
- **Styling**: Tailwind CSS with custom design tokens
- **Auth & DB**: Supabase (auth, PostgreSQL)
- **Payments**: Stripe via PurchaseFlow component
- **AI**: OpenAI GPT-4 for grading, Realtime API for voice interviews
- **Deployment**: Vercel (Google Fonts may fail in sandboxed build environments)

### Design Tokens
- `primary-*`: Slate-indigo (#2D3A8C) — professional/report UI
- `accent-*`: Violet (#7C3AED) — Preppi the parrot, fun/practice UI
- Duolingo green: #58CC02 (via `.btn-duo-green` CSS class)

### Key Directories
```
app/                          # Next.js App Router pages
  interview/feedback/page.tsx # Main feedback page (~5000 lines, handles all stages)
  globals.css                 # Global styles + Duolingo animations
components/                   # React components
  PreppiWalkthrough.tsx       # Preppi-guided post-interview experience
  PracticeLessonFlow.tsx      # Practice lesson orchestrator
  exercises/                  # Exercise renderers (MultipleChoice, LabelSort, etc.)
  Preppi.tsx                  # Parrot mascot SVG + speech bubble
  ScoreRevealCard.tsx         # Animated score ring
  DetailedRubricReport.tsx    # Full rubric modal (54KB)
  Confetti.tsx                # Celebration animation
lib/
  practice-bundles.ts         # 6 root cause practice bundles + mapping
  mock-feedback.ts            # Admin mock data for preview
  supabase-client.ts          # Supabase client
hooks/
  useGameFeedback.ts          # Ding sound effect (Web Audio API)
```

---

## Current State (Last Updated: 2026-06-08)

### What's Built & Working
- Preppi-guided walkthrough (PreppiWalkthrough.tsx) — full Duolingo-style flow
- Practice lesson system with 4 exercise types + voice-only re-answer
- 6 practice bundles covering all common interview weaknesses
- Mock data system for admin preview (`?preview=mock`)
- InterviewTimeline showing 4-stage journey
- Duolingo CSS animations (btn-duo-green, preppi-bounce, badge-reveal, etc.)
- Walkthrough persistence via localStorage

### Active Branch
`claude/bold-planck-rRxBf` — current session work

### What Needs Work Next
1. Test end-to-end on `?preview=mock` — verify summary screen, smart CTAs, workshops
2. Wire CF/FR stages into workshop builder (HM done, HR done)
3. Retake display — take 1 vs retake on process page / summary screen
4. Custom Preppi SVG illustration (currently using basic SVG) — user will build in Figma
5. XP/badge persistence to Supabase
6. Test voice re-answer scoring end-to-end with real microphone

---

## The Vision (User's Words)

The post-interview experience should feel like **Duolingo for interview prep**:
- **Preppi walks the user through their results** — not a static report page
- **Mobile is full-screen, card-by-card** — exactly like Duolingo
- **Desktop has Preppi as a sidebar companion** — content flows on the right
- **Practice is a "whole different world"** entered through the report
- **Voice-only re-answers** — the whole point is practicing speaking
- **The detailed performance report is the only "report-feeling" thing** — everything else is guided and interactive
- **Badges, XP, sounds, confetti** — make it fun, not homework

### What We Don't Do
- Don't teach domain knowledge — we teach interview PERFORMANCE
- Don't use "executive presence" — use "professional presence" or "composure"
- Don't have text input for re-answers — voice only
- Preppi has no voice — only sounds (like Duolingo owl) and text bubbles
- Don't gamify the live interview itself — interview mode should stay formal and realistic
- Don't show a live transcript during interviews

### Product Positioning Clarification
- The correct feel is **premium coach with game structure underneath**, not a silly gamified app
- The interview itself should feel as close to a real interview as possible
- Duolingo influence belongs mainly in review/practice flow, progression clarity, and motivation
- The app should feel more serious as the user moves deeper into the interview process

### Interview Process Model
- Stage order: **HR Screen → Hiring Manager → optional Culture Fit → Executive/Final**
- Culture Fit is optional because not every company runs it
- Pricing is pay-per-use: users can buy stage-by-stage or buy a bundle, with or without Culture Fit
- Product goal: users use PrepMe for a real interview process, perform well, and ideally do not need PrepMe again

### Stage Philosophy
- **HR Screen**: broader diagnosis, clearer teaching, confidence-building
- **Hiring Manager**: deeper probing, stronger evidence demands, more "what exactly did you do?"
- **Culture Fit**: nuance, interpersonal judgment, self-awareness, conflict handling, credibility
- **Executive/Final**: pressure, ambiguity, strategic thinking, concise executive-style answers, gap exposure

### Practice Philosophy
- Keep the current 3 sublessons + 1 final voice re-answer structure
- Later rounds should keep the structure but intensify the content and scoring
- Sometimes the final voice challenge can use an elevated variant of the original weak question, especially in later rounds
- Practice can remain optional before retakes; do not hard-gate retakes behind practice

### Feedback Philosophy
- Call out **all** meaningful issues an interviewer would care about; don't hide failures just because there are many
- Prioritization is acceptable, omission is not
- Later rounds should grade what that interviewer actually cares about, but recurring issues from earlier rounds should still be surfaced if they remain limiting
- If role/industry knowledge depth is lacking, call it out fairly using the job description and the candidate's answer as evidence
- We are interview practice, not industry/job training

### Desktop vs Mobile / Preppi
- Preppi can be more visible on mobile, more restrained on desktop
- Preppi presence should decrease and tone should become more serious in later rounds, especially final/executive stages
- Interview mode should remain formal regardless of device

### Future Ideas to Preserve
- Long-term direction: mock Zoom-style interview surface
- Possible future enhancement: AI avatar interviewer for more realistic executive/final-round simulation
- Possible future enhancement: role/industry-specific content packs (out of scope for now)

---

## Conventions

### Code Style
- All new components: `'use client'` directive
- Use design tokens (`primary-*`, `accent-*`), not hardcoded colors
- CSS animations in `globals.css`, not Framer Motion
- Sound via Web Audio API (`useGameFeedback` hook)
- Voice recording via MediaRecorder API
- State management: React useState (no Redux/Zustand)
- TypeScript strict mode — zero errors required before push

### Git
- Develop on feature branches named `claude/*`
- Push with `git push -u origin <branch>`
- Retry network failures up to 4 times with exponential backoff
- Clear, descriptive commit messages

### Testing Mock Data
- Admin email: `gunnarneuman60@gmail.com`
- URL param: `?preview=mock` on `/interview/feedback`
- Mock data in `lib/mock-feedback.ts`

---

## Important Context for Future Sessions

1. **The feedback page is ~5000 lines** — it handles all 4 interview stages in one file. The walkthrough is an early-return pattern before the main return.

2. **The walkthrough only plays once per interview** (not per retake). Stored in localStorage as `walkthrough_seen_${sessionId}`.

3. **Practice bundles are predetermined content** — no API calls needed for exercises. Only the final voice re-answer needs an API call to score.

4. **The user can create custom images/3D assets** — don't limit design to what's currently available.

5. **All 6 root causes apply to all interview stages** — the mapping in `CRITERION_TO_ROOT_CAUSE` covers HR Screen, Hiring Manager, and Culture Fit criteria.

6. **The `full_rubric` field in feedback data** contains the detailed report data. It IS generated for real interviews. The mock data mirrors this structure.

7. **Google Fonts build error** (`Failed to fetch Plus Jakarta Sans`) is a network issue in sandboxed environments — not a code bug. Dev mode works fine.

---

## Session Update Log

### 2026-03-26 (Session 1)
- Built PreppiWalkthrough component (Duolingo-style guided experience)
- Built PracticeLessonFlow + 4 exercise components
- Made PracticeLessonFlow voice-only (removed text input for re-answer)
- Added Duolingo CSS animations to globals.css
- Added showOnDesktop prop to Preppi component
- Wired walkthrough into feedback page (early-return pattern)
- Added Replay Walkthrough button to static results view
- Created RE-DESIGN_STATE.md with full vision documentation

### 2026-03-26 (Session 2)
- Built `LessonRoadmap` component — Duolingo badge path, two-level (lesson → task)
  - Grey/locked badges turn green w/ confetti on lesson complete
  - Preppi hops along to next badge
  - Mini confetti burst per badge
- Rewrote `PreppiWalkthrough`:
  - Fork now goes to `LessonRoadmap` (not direct to practice)
  - Added `TranscriptOverlay` — animated Q&A popup on weakness cards ("See what you said")
  - Interviewer icon: male/female deterministic from sessionId
  - Removed `practice_transition` state (LessonRoadmap handles between-lesson flow)
- Rewrote `PracticeLessonFlow`:
  - Replaced progress bar with badge-style step indicators (Learn → Q1..Qn → Apply)
  - Mini confetti burst after each step completes
  - Step badge turns green with `animate-task-badge-complete`
  - Added "Try Again" button when voice re-answer fails
- Updated `app/globals.css`: added `badge-fill-green`, `preppi-hop`, `slide-in-top`,
  `slide-in-bottom`, `mini-confetti-fall`, `badge-pulse-glow`, `task-badge-complete`
- Polished static results view (`app/interview/feedback/page.tsx`):
  - Removed colored score-based CTA banners
  - Replaced practice grid with clean criteria breakdown (all criteria, strengths + weaknesses)
  - Weak area cards have embedded "Practice →" button → opens LessonRoadmap
  - "View Full Performance Report" card at bottom
  - LessonRoadmap overlay wired as early-return before main static view
- No new TypeScript errors introduced (pre-existing sandbox errors remain)

**Next session should**: Test on `?preview=mock`, wire HM/CF/FR practice, get custom Preppi SVG from user.

### 2026-03-26 (Session 3)
- Verified all session 2 work committed on branch `claude/read-project-docs-E36ZX`
- Pushed branch to remote (`git push -u origin claude/read-project-docs-E36ZX`)
- Confirmed zero new TypeScript errors in our modified files
- Confirmed mock data structure (`what_needs_improve` with criterion/score/rootCause/evidence) matches `WeaknessArea` interface in LessonRoadmap

**Next session should**: Test on `?preview=mock`, wire HM/CF/FR stages into LessonRoadmap (currently only `sixAreas?.what_needs_improve` wired for HR screen), get custom Preppi SVG from user.

### 2026-03-27 (Session 4)
- Reviewed project against the intended Duolingo-like redesign and identified that the new direction is concentrated mostly in post-interview feedback/practice, while onboarding/dashboard/interview flows still reflect the older app
- Clarified product direction with user:
  - Interview mode must stay formal, realistic, and non-gamified
  - No live transcript during interview
  - Correct positioning is "premium coach with game structure underneath"
  - Culture Fit is an optional stage in both product flow and pricing
  - Practice should intensify across rounds while keeping the 3-sublesson + 1 final voice structure
  - Recurring issues should be surfaced across rounds, but each round must still reflect what that interviewer actually cares about
  - If knowledge depth is lacking, feedback should cite the JD and candidate response rather than trying to teach the job
  - Future idea logged: Zoom-like interview UI and eventual AI avatar interviewer

**Next session should**: Turn the clarified direction into a concrete product spec covering stage-specific feedback/practice, progression memory, UI boundaries, and implementation priorities before major code changes.

### 2026-06-06 (Session 5)
- **Major workshop overhaul**: replaced all 6 template workshops in HrFeedbackDeck with a single unified `GuidedBuilderWorkshop` that pulls from the user's resume + JD + original answer via Haiku
- Created `app/api/interview/guided-workshop/route.ts` — Haiku-based suggestion endpoint (~$0.003-0.005 per call) that returns 3 distinct, grounded suggestions per build step
- Created `components/exercises/GuidedBuilderWorkshop.tsx` — 7-phase state machine:
  1. **Intro** — why this matters + when to use it (teaches the WHY/WHEN)
  2. **Method** — animated framework breakdown, tap each step to expand (teaches the WHAT/HOW)
  3. **Diagnose** — maps the user's original answer against the method, shows what was missing
  4. **Build** — loops through framework steps; for each step Haiku produces 3 resume-grounded suggestions; user picks, refreshes for more, or writes their own
  5. **Assemble** — animated reveal of all chosen pieces snapping together into a full answer
  6. **Compare** — before/after side-by-side with a coaching insight
  7. **Done** — final answer + drill instructions
- Each workshop type (`star_proof`, `professional_story`, `career_alignment`, `handling_uncertainty`, `pace_delivery`, `preparation_curiosity`) is configured via a single `CONFIGS` object — adding new ones is now trivial
- Resume + JD + companyWebsite are fetched server-side from `user_interview_data` and `user_resumes` (Supabase admin). All suggestions cite real user details — Haiku prompt explicitly forbids inventing facts.
- HrFeedbackDeck.tsx now imports only `GuidedBuilderWorkshop`; removed 6 individual workshop imports
- Old workshop components (StarProofWorkshop, etc.) are still in the codebase but no longer rendered. Safe to delete later if not used elsewhere.

**Why this change**: Template workshops (multiple choice, drag-to-sort) taught generic patterns but didn't help users build *their specific better answer*. Haiku rewrites showed users what a better answer looked like, but reading isn't practicing. The new builder is interactive enough to feel like doing, grounded enough to teach the right thing, and cheap enough to ship (~$0.02-0.04 per interview total for 3-4 workshops).

**Next session should**: Test end-to-end on `?preview=mock` and real HR interview. Verify Haiku suggestions feel personalized to actual resumes. Consider deleting unused workshop components. Wire HM/CF/FR stages into the new builder.

### 2026-06-08 (Session 6)
- **Practice path data loading fix**: Changed `select('id, stage, structured_transcript...')` to `select('*')` because Supabase rejects queries with non-existent column names. Same for feedback query.
- **Practice entry points moved**: Removed `practice_handoff` from walkthrough deck. Practice is now accessible from: static feedback view (after walkthrough), process page, and dashboard.
- **HM practice support**: Updated HM grader to emit `practice_focus_id` on every signal. Added 2 new workshop types: `role_depth` (Context·Method·Tradeoff·Outcome) and `problem_solving` (Clarify·Approach·Execute·Reflect). Extended `COACHING_BUCKET_TO_WORKSHOP` mappings in HrFeedbackDeck and PracticePath.
- **Workshop flip card examples**: Added generic, broadly applicable examples (in quotes) to all steps across all 8 workshop types. Flip card height auto-adjusts when example is present.
- **Approach picker ("What's your instinct?")**: Added a mini selection before each build step — 3 approach options per step key. Gives user ownership before suggestions load. Data tracked but not used for generation (intentional).
- **Smart CTAs on process page**: Hero card + per-stage "All rounds" cards now show contextual primary CTA based on flow state:
  - Feedback not viewed → "View feedback" (primary)
  - Feedback viewed but no practice → "Start practicing" (accent)
  - Practice done → "Retake interview" (primary)
- **Stage summary screen**: Clicking a stage in the sidebar or "All rounds" grid opens a summary modal showing: score ring, strengths/weaknesses from rubric, flow progress indicator (feedback → practice → retake), smart CTA, and secondary action buttons. Previously went directly to feedback.
- **HrFeedbackDeck CTA fix**: "Start Practicing" is now the primary CTA on the deck's unlock-next-stage screen (was "Start [Next Stage] Round").

### 2026-06-08 (Session 6b — continuation)
- **Process page radical simplification**: Removed All Rounds grid, stats row, summary modal, and all secondary button rows. Main content is now driven entirely by sidebar selection:
  - Clicking a stage in sidebar/mobile picker shows that stage's data inline (score, strengths/weaknesses)
  - Selected stage is highlighted in sidebar (not "next up")
  - Flow progress bar (Interview → Feedback → Practice → Retake) is the centerpiece with a single CTA
  - Locked stages show unlock CTA, available stages show start CTA
  - Mobile gets a horizontal stage pill picker
  - No more black buttons, no more modal
- **Connector system completely removed**: All connector fields deleted from every workshop config. `assembleAnswer` simplified to just join chosen pieces with spaces. Each Haiku suggestion now includes its own natural spoken transition.
- **Workshop language overhauled for spoken delivery**: Haiku system prompt rewritten to enforce conversational speech — contractions required, 15-20 word max sentences, corporate cliches banned ("leveraged", "spearheaded", "passionate about", etc.).
- **Approach picker diversity**: Removed from steps where it adds no value (recovery, landing, result, outcome, reflect). Remaining steps get contextual question text (e.g. "How do you want to set the scene?", "What angle shows your work best?") instead of uniform "What's your instinct?"
- **Build phase UX simplified**: Shows 1 suggestion in a highlighted card with "Use this" button. "Show me other options" reveals the other 2 in list format. Previously dumped all 3 at once.
- **Behavioral workshop prompt fix attempted**: Added `isBehavioral` flag for `star_proof`, `role_depth`, `problem_solving`, `handling_uncertainty`. System prompt now includes critical rule: "This is a behavioral answer workshop. The candidate already gave an answer — your job is to RESTRUCTURE it, NOT to invent a new answer." All STEP_GUIDANCE for these 4 types rewritten.

#### ⚠️ CRITICAL UNSOLVED: Behavioral Workshop Content Fabrication
The prompt fix above was NOT sufficient. 4 of 8 workshops (`star_proof`, `role_depth`, `problem_solving`, `handling_uncertainty`) have a **fundamental design flaw**: they generate content from the resume + JD instead of helping users structure their own specific stories. Example: for a "Tell me about a time you faced a challenge" STAR question, the workshop generated vague process descriptions about the target job (senior living accounts) instead of restructuring the user's actual past experience (e.g., a specific website redesign mess-up at TouchPoint). No amount of prompt engineering fixes this because **the specific incident lives in the user's head, not in any data passed to Haiku**. The resume lists responsibilities, not incidents. The original answer was vague (that's why it was flagged). Haiku can't restructure vagueness into specificity.

**User's proposed solution**: "We should just have an adjective picker and an instinct picker before each part, and then we give the user one single piece for each of the areas." This means: the user PROVIDES the raw content (what actually happened), Haiku POLISHES it (tightens phrasing, adds structure, makes it sound professional). The current flow is inverted — Haiku generates, user picks — and that's wrong for behavioral answers.

### Active Branch
`claude/bold-planck-rRxBf`

### What Needs Work Next (Priority Order)
1. **Test STAR Story Builder end-to-end**: Verify the full flow (story type → setting → situation → ... → generated output) works with real data and produces good answers. This is the litmus test — if it works, apply same pattern to other workshops. If not, scrap workshops and focus on grading + recommendations.
2. **If STAR works well**: Design similar card-and-chip builders for role_depth, problem_solving, and potentially other workshop types
3. **Test non-behavioral workshops** (`professional_story`, `career_alignment`, `pace_delivery`, `preparation_curiosity`) for quality with the GuidedBuilderWorkshop
4. **Wire CF/FR stages into workshop system** (HR and HM are done)
5. Retake display — how to show take 1 vs retake on process page
6. Consider deleting unused old workshop components (StarProofWorkshop, etc.)
7. Custom Preppi SVG illustration (user will build in Figma)
8. XP/badge persistence to Supabase

### 2026-06-08 (Session 7 continued)
- **STAR Story Builder**: Built a completely new multi-step wizard that replaces the old `star_proof` GuidedBuilderWorkshop. Instead of open-ended text questions, users build their STAR answer through structured card and chip selections:
  - 10 story types (customer problem, messy project, ownership moment, etc.)
  - 10 branching situation arrays (each story type has its own set of specific situations)
  - Stakes, role, actions (22 options with detail prompts), results, metrics/proof, competencies
  - Haiku assembles a polished 60-second and 30-second answer from the structured data
  - Follow-up questions the interviewer might ask
- **3 new files**: `lib/star-story-config.ts` (all static config, ~800 lines), `components/exercises/StarStoryBuilder.tsx` (16-step wizard, ~960 lines), `app/api/interview/star-story/route.ts` (Haiku generation endpoint)
- **Wired into both entry points**: HrFeedbackDeck and PracticePath now route `star_proof` to StarStoryBuilder instead of GuidedBuilderWorkshop
- **Keeps intro + method flip cards**: The STAR framework teaching (why it matters, flip each card) is preserved. Everything after that is the new guided flow.
- **Architecture**: This is a test run. If the card-and-chip approach works well for STAR, the same pattern will be applied to other workshop types. If not, workshops may be scrapped entirely in favor of grading + recommendations only.
