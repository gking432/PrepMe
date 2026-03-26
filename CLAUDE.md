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

## Current State (Last Updated: 2026-03-26)

### What's Built & Working
- Preppi-guided walkthrough (PreppiWalkthrough.tsx) — full Duolingo-style flow
- Practice lesson system with 4 exercise types + voice-only re-answer
- 6 practice bundles covering all common interview weaknesses
- Mock data system for admin preview (`?preview=mock`)
- InterviewTimeline showing 4-stage journey
- Duolingo CSS animations (btn-duo-green, preppi-bounce, badge-reveal, etc.)
- Walkthrough persistence via localStorage

### Active Branch
`claude/read-project-docs-E36ZX` — current session work

### What Needs Work Next
1. End-to-end test on `?preview=mock` — verify every flow state renders correctly
2. Wire LessonRoadmap + practice for HM/CF/FR stages (currently only HR screen)
3. Custom Preppi SVG illustration (currently using basic SVG) — user will build in Figma
4. XP/badge persistence to Supabase
5. Streak system (lower priority)
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
