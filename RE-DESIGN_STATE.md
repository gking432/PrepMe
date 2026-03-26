# Post-Interview Feedback Redesign — Full State Document

> **Last updated**: 2026-03-26
> **Branch**: `claude/improve-interview-feedback-9BBeR`
> **Status**: In progress — core components built, needs polish and testing

---

## 1. The Vision

The post-interview feedback page is being completely redesigned from a traditional 3-tab report page (Results/Report/Train) into a **Preppi-guided Duolingo-style experience**.

### Core Principles
- **Preppi (the parrot mascot) walks the user through everything** — it's not a report page, it's a guided experience
- **Mobile = Duolingo exactly** — full-screen cards, bottom-anchored green Continue buttons, progress bar, XP, badges, sound effects, Preppi speech bubbles
- **Desktop = Brilliant.org meets Duolingo** — Preppi as persistent companion on left sidebar, content flows on right, still fun and interactive, NOT dry/homework-like
- **Reporting and Practice are separate worlds** — reporting is guided by Preppi, practice is a "whole different world" you enter through the report
- **Value first, paywall later** — the detailed report and practice are the sales pitch, not a gate
- **V1 covers ALL 4 interview stages**: HR Screen, Hiring Manager, Culture Fit, Final Round

### What We're NOT Building
- We don't teach domain knowledge (CS, finance, etc.) — we teach interview PERFORMANCE
- "Executive presence" → use "professional presence" or "composure" instead
- No text input for re-answer — voice only (the whole point is practicing speaking)

---

## 2. The Complete User Flow

### First Visit (Walkthrough Active)

```
PreppiWalkthrough takes over entire screen (no Header, no Timeline)

1. INTRO
   - Preppi bounces in: "Hey! Here's how you did!"
   - Big green "Let's Go!" button at bottom

2. SCORE REVEAL
   - Animated score ring counts up (e.g. 6.2/10)
   - Preppi reacts: excited if high, encouraging if low
   - +10 XP

3. STRENGTHS (card by card)
   - Each strength gets its own card with green border
   - Shows criterion name, score bar, feedback, evidence excerpt
   - Preppi: "You nailed [criterion]! Keep that energy!"
   - +5 XP per card

4. WEAKNESSES (card by card)
   - Each weakness gets its own card with amber border
   - Shows criterion, score, feedback, and "Practice lesson ready!" teaser
   - Preppi: "Don't worry — I have the perfect practice for this!"
   - +5 XP per card

5. FORK
   - "View Detailed Report" (secondary button)
   - "Let's Start Practicing!" (primary green Duolingo button)
   - Preppi recommends practice: "I'd recommend jumping in while it's fresh!"
   - Detailed report is always saved in profile

6. PRACTICE (auto-queued, Preppi picks order)
   For each weak area:
   a. PracticeLessonFlow opens as full-screen overlay
   b. Intro: "Here's your problem"
   c. Teach card: "Here's what interviewers want" (bad vs good answer)
   d. Exercises: multiple choice, label sort, short answer (4-5 questions)
   e. Re-answer: Interviewer VOICE asks the question, user responds by VOICE
   f. Completion: score, XP, celebration
   → Auto-advance to next weak area
   → Transition screen between lessons: "Skill 1 Complete! Ready for the next one?"

7. COMPLETE
   - Preppi celebrates: "Look at you go!"
   - Stats: Total XP, Skills Passed, Practiced count
   - Badges earned (First Steps, Quick Learner, Perfect Run, Comeback Kid)
   - Three buttons:
     a. "View Detailed Report" (primary)
     b. "Retake Interview" (secondary)
     c. "Unlock Next Stage" (if not premium)
```

### Subsequent Visits (Walkthrough Seen)
- Skips walkthrough, shows static results view
- Score card + practice world grid + transcript + detailed report button
- Small "Replay Walkthrough" button available
- Practice entry points embedded in the report/feedback cards

### Skip Option
- Tiny X button in top-left of walkthrough — easy to miss on purpose
- For experienced users who've done multiple interviews
- Jumps straight to static results view

### Walkthrough Persistence
- `localStorage.setItem('walkthrough_seen_' + sessionId, 'true')`
- Checked on mount — if seen, auto-skip to results
- Retakes get a fresh walkthrough (different sessionId)

---

## 3. Practice System Design

### 6 Root Cause Practice Bundles
Each maps to a common interview weakness. Universal across ALL stages.

| Root Cause | Display Name | Example Criterion |
|---|---|---|
| `poor_structure` | Answer Structure | Answer Structure and Conciseness |
| `lack_of_specificity` | Specificity & Evidence | Specific Examples and Evidence |
| `weak_communication` | Communication Clarity | Communication and Delivery |
| `missing_knowledge` | Knowledge & Preparation | Company/Industry Knowledge |
| `off_topic` | Relevance & Focus | Handling Uncertain/Difficult Questions |
| `too_short` | Depth of Response | Response Completeness |

### Exercise Flow Per Bundle
1. **Teach Card** — bad answer vs good answer comparison with breakdown (e.g. STAR method)
2. **Multiple Choice** — 4 options, one correct, explanation after
3. **Label Sort** — categorize text segments into buckets (80% pass threshold)
4. **Short Answer** — free text with character limit (bridges to re-answer)
5. **Voice Re-Answer** — interviewer voice asks the question, user speaks response (NO text input)

### XP System
| Action | XP |
|---|---|
| View teach card | +5 |
| Exercise attempt | +5 |
| Exercise correct | +10 |
| Re-answer submitted | +25 |
| Re-answer passed (score >= 7) | +25 bonus |

### Criterion-to-Root-Cause Mapping
Defined in `lib/practice-bundles.ts` as `CRITERION_TO_ROOT_CAUSE`. Covers criteria for:
- HR Screen (6 criteria)
- Hiring Manager (6 criteria)
- Culture Fit (6 criteria)
- Final Round (implicit via fallback)

### Badges
- **First Steps** — completed first walkthrough
- **Quick Learner** — passed a practice on first try
- **Perfect Run** — all exercises correct in a lesson
- **Comeback Kid** — improved a weak area score

---

## 4. Duolingo Design Language

### Must-Have Elements
- **Green progress bar** at top (thin, #58CC02)
- **XP counter** with flame icon in top-right
- **Bottom-anchored Continue button** (full-width green, Duolingo's signature)
- **Card-by-card progression** on mobile (one thing at a time)
- **Celebration animations**: confetti, badge reveals, XP flyups
- **Sound effects**: ding on correct answers, completion chime (Web Audio API)
- **Preppi speech bubbles** with contextual messages at every step
- **Badges and achievements** with reveal animations
- **Large, friendly character illustrations** (Preppi the parrot)

### CSS Classes Added (globals.css)
- `.btn-duo-green` — Duolingo's green button with bottom border (#58CC02, border-bottom: 4px solid #46a302)
- `.animate-preppi-bounce` — Preppi entrance animation
- `.animate-bubble-pop` — speech bubble pop-in
- `.animate-slide-in-right` — card transition
- `.animate-gentle-pulse` — interactive element pulse
- `.animate-badge-reveal` — badge unlock with sparkle
- `.animate-xp-glow` — XP counter glow on increment
- `.animate-progress-fill` — progress bar fill
- Existing: `.animate-slide-up`, `.animate-fly-up`, `.animate-pop-in`, `.animate-score-pop`, `.animate-correct-flash`

### Color Tokens (tailwind.config.ts)
- `primary-*`: Slate-indigo (#2D3A8C) — the professional/report color
- `accent-*`: Violet (#7C3AED) — Preppi's color, used for practice/fun elements
- Duolingo green: #58CC02 (used via `.btn-duo-green` class, not a token)

---

## 5. Architecture & File Map

### New Components Created
| File | Description | Lines |
|---|---|---|
| `components/PreppiWalkthrough.tsx` | Main Preppi-guided walkthrough experience | ~770 |
| `components/PracticeLessonFlow.tsx` | Practice lesson orchestrator (teach → exercises → re-answer) | ~850 |
| `components/exercises/MultipleChoiceExercise.tsx` | 4-option quiz with feedback | ~125 |
| `components/exercises/LabelSortExercise.tsx` | Segment categorization exercise | ~200 |
| `components/exercises/ShortAnswerExercise.tsx` | Text response with character limit | ~80 |
| `components/exercises/TeachCard.tsx` | Bad vs good answer comparison | ~130 |

### Modified Files
| File | Changes |
|---|---|
| `app/interview/feedback/page.tsx` | Added walkthrough integration, practice world entry, removed old SkillTrainer |
| `app/globals.css` | Added Duolingo-style animations and btn-duo-green |
| `components/Preppi.tsx` | Added `showOnDesktop` prop (was mobile-only) |
| `lib/practice-bundles.ts` | Practice bundle data, root cause mapping (created earlier) |
| `lib/mock-feedback.ts` | Admin preview mock data (created earlier) |
| `components/InterviewTimeline.tsx` | 4-stage journey bar (created earlier) |

### Key Existing Components (not modified)
| File | Role |
|---|---|
| `components/ScoreRevealCard.tsx` | Animated score ring (used in static results view) |
| `components/DetailedRubricReport.tsx` | Full rubric modal (54KB, the formal "report") |
| `components/DetailedHmRubricReport.tsx` | Hiring manager rubric modal |
| `components/Confetti.tsx` | Confetti celebration animation |
| `hooks/useGameFeedback.ts` | Ding sound effect (Web Audio API) |
| `components/PurchaseFlow.tsx` | Stripe checkout modal |

### Data Flow
```
feedback.hr_screen_six_areas.what_needs_improve[].criterion
  → getRootCauseForCriterion(criterion, explicitRootCause)
  → getBundleForRootCause(rootCause)
  → PracticeBundle { teach, exercises[] }
  → PracticeLessonFlow renders the bundle
```

### Mock Data System
- Admin email: `gunnarneuman60@gmail.com`
- URL param: `?preview=mock`
- Files: `lib/mock-feedback.ts` (MOCK_FEEDBACK, MOCK_TRANSCRIPT, MOCK_SESSION_DATA)
- Mock data includes `full_rubric` with `traditional_hr_criteria`, `overall_assessment`, etc.

---

## 6. What's Done

### Fully Built & Compiling
- [x] PreppiWalkthrough component (intro → score → strengths → weaknesses → fork → practice → complete)
- [x] PracticeLessonFlow orchestrator with voice-only re-answer
- [x] All 4 exercise components (MultipleChoice, LabelSort, ShortAnswer, TeachCard)
- [x] Practice bundles for all 6 root causes with teach cards and 5 exercises each
- [x] Duolingo CSS animations and btn-duo-green
- [x] Preppi showOnDesktop prop
- [x] Feedback page wired to show walkthrough on first visit, static results on revisit
- [x] Mock data system for admin preview
- [x] InterviewTimeline component
- [x] Walkthrough localStorage persistence
- [x] XP system with animated flyups
- [x] Badge system (client-side only)

### Committed & Pushed
All above changes are on branch `claude/improve-interview-feedback-9BBeR`.

---

## 7. What's NOT Done (Pending Tasks)

### High Priority
- [ ] **Test the walkthrough end-to-end** — verify clicking through all states works correctly
- [ ] **Fix practice overlay z-index/containment** — the practice cards in static results view may have click issues (overlay rendered inside hasFeedback block)
- [ ] **Detailed report integration** — ensure DetailedRubricReport modal opens correctly from walkthrough's "View Detailed Report" button
- [ ] **Transcript placement** — transcript should be at the end of the detailed report, also accessible via Preppi
- [ ] **Static results view polish** — after walkthrough, the results page needs practice entry points within the weak area cards (not a separate practice section grid)

### Medium Priority
- [ ] **Interviewer voice for re-answer** — TTS should use an "interviewer" voice tone, not Preppi's voice (Preppi has no voice, only sounds + text bubbles)
- [ ] **Desktop layout polish** — Preppi sidebar companion needs more visual refinement
- [ ] **Mobile responsive testing** — verify full-screen card experience on actual mobile viewports
- [ ] **Practice lesson transition animations** — the between-lesson "Skill Complete!" screen needs more celebration
- [ ] **Badge persistence** — currently client-side only, should persist to Supabase later

### Lower Priority
- [ ] **Other interview stages** — wire walkthrough for hiring_manager, culture_fit, final_round stages (data flow exists, just needs testing)
- [ ] **XP persistence** — save XP to user profile in Supabase
- [ ] **Streak system** — daily practice streaks like Duolingo
- [ ] **Custom Preppi images/3D assets** — user offered to create these
- [ ] **Duolingo path/lesson map** — the node-based progression view (user mentioned this but said "not sure we need it")
- [ ] **Practice re-answer AI scoring** — the `/api/interview/practice` endpoint needs to handle voice transcription + scoring

---

## 8. Key User Decisions & Quotes

> "The mobile version should feel exactly like Duolingo."

> "Preppi should almost walk the user through the report itself."

> "The only thing that should actually feel like a report is the detailed performance report."

> "After preppi goes through the basics of the report, it can give the option of View Detailed Report or Start Practicing."

> "The detailed report is always saved in the user's profile."

> "Preppi picks the practice. Practice goes: here's your problem, here's what interviewers want, here's an example, here are a few questions, then try again with voice."

> "There is no text input option when redoing the question — which is the whole point of the questions leading up."

> "I don't think Preppi will have a voice. More just sounds like the duolingo owl and text bubbles."

> "There should be badges and stuff. Not everything has to be a card. It should be super interactive."

> "I can create any images or 3D things we need, so don't let that limit you."

> "Executive presence → professional presence or composure. Appropriate for whatever level the user is at."

> "V1 needs to cover all interview rounds."

> "We are an interview prep platform, we don't need to and frankly shouldn't be teaching people about CS and technical aspects."

> "The first time is the only time the preppi walkthrough should play for any given interview — this does not include retakes."

> "The skip button should be very hard to accidentally press, and way out of the way especially on mobile."

---

## 9. Technical Notes

### Build Issues
- **Google Fonts error**: `Failed to fetch Plus Jakarta Sans` — this is a network issue in the build environment, NOT a code problem. The app works fine in dev mode.
- **TypeScript**: All components compile with zero errors as of last push.

### Key Patterns
- All new components use `'use client'` directive
- Design tokens: `primary-*` for professional, `accent-*` for Preppi/fun
- Animations: CSS keyframes in globals.css, not Framer Motion
- Sound: Web Audio API via `useGameFeedback` hook (no audio files)
- Voice: MediaRecorder API for recording, existing TTS for playback
- State management: React useState (no external state library)

### The feedback page (`app/interview/feedback/page.tsx`) is ~5000 lines
This file is massive and handles all 4 interview stages. The walkthrough integration is an early-return pattern:
```tsx
if (hasFeedback && walkthroughActive) {
  return <PreppiWalkthrough ... />
}
// ... rest of the page (static results view)
```
