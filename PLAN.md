# PrepMe — Ship-Ready Plan

## Phase 1: Clean Foundation
Remove test artifacts, secure routes, fix data integrity.

### 1.1 Remove Mock Data & Test Endpoints
- [ ] Delete `app/api/test/feedback/route.ts` (HR mock endpoint)
- [ ] Delete `app/api/test/hiring-manager-feedback/route.ts` (HM mock endpoint)
- [ ] Remove any references to these endpoints from other files
- [ ] Clean up excessive `console.log` with emoji prefixes across the codebase (voice route, claude-client, feedback route, rubric-validator)

### 1.2 Auth Middleware & Route Protection
- [ ] Create `middleware.ts` at project root
  - Public routes: `/`, `/auth/*`, `/api/extract-text`, `/api/interview/voice` (for anonymous HR screen)
  - Semi-protected: `/dashboard` (anonymous allowed for first HR screen only), `/interview` (anonymous allowed for HR screen only), `/interview/feedback` (anonymous allowed for HR screen results only)
  - Protected: `/profile`, `/api/interview/voice` for non-HR stages (require auth), `/api/interview/feedback` for non-HR stages
- [ ] Enforce stage gating in voice route: anonymous users can ONLY do `hr_screen`
- [ ] Enforce stage gating in feedback route: anonymous users can ONLY grade `hr_screen`

### 1.3 Fix Interview Session Integrity
- [ ] On signup, migrate ALL anonymous sessions (not just the last one) via `last_interview_session_id`
- [ ] Ensure `user_interview_data` properly links to user after signup migration
- [ ] Verify feedback records link correctly to sessions after migration

---

## Phase 2: Account Creation After HR Screen
Seamless account creation gate between HR Screen and Hiring Manager.

### 2.1 Post-HR-Screen Signup Prompt
- [ ] After HR screen feedback loads, if user is anonymous, show a modal/banner:
  - "Create your account to unlock your full dashboard and continue to the Hiring Manager round"
  - Pre-fill from resume-extracted data (name, email, phone)
  - Show: "Create account with this info?" → Yes / Edit / No
  - Google OAuth option alongside email/password
- [ ] On "Yes": create account, migrate localStorage data, redirect to feedback page (now authenticated)
- [ ] On "No": they can still view their HR screen feedback and practice cards, but cannot proceed to HM

### 2.2 Returning User Gate
- [ ] If a returning anonymous user tries to start another HR screen, check localStorage for prior completion
- [ ] Show: "You've already taken your free HR screen. Sign in or create an account to continue."
- [ ] Track free HR screen usage: store `hr_screen_completions` count in localStorage (anonymous) or `user_profiles` (authenticated)
- [ ] Authenticated users get 1 free HR retake, then must pay

---

## Phase 3: Monetization System

### 3.1 Database Schema for Payments
- [ ] Create `user_credits` table:
  ```sql
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  stage TEXT NOT NULL, -- 'hiring_manager', 'culture_fit', 'final'
  credits_remaining INTEGER DEFAULT 0,
  bundle_purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
  ```
- [ ] Create `payment_transactions` table:
  ```sql
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  product_type TEXT NOT NULL, -- 'single_hm', 'single_cf', 'single_fr', 'bundle_3', 'bundle_2_no_cf', 'subscription'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'refunded'
  created_at TIMESTAMPTZ
  ```
- [ ] Create `user_subscriptions` table (for monthly option):
  ```sql
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  interview_count_this_period INTEGER DEFAULT 0,
  max_interviews_per_period INTEGER DEFAULT 5, -- anti-abuse cap
  created_at TIMESTAMPTZ
  ```

### 3.2 Stripe Integration
- [ ] Install `stripe` and `@stripe/stripe-js` packages
- [ ] Create `/api/payments/create-checkout` route — generates Stripe Checkout session
- [ ] Create `/api/payments/webhook` route — handles Stripe events (payment_intent.succeeded, subscription events)
- [ ] Create `/api/payments/status` route — checks user's current credits/subscription
- [ ] Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

### 3.3 Pricing Products (to be configured in Stripe)
- **Individual stages**:
  - Hiring Manager: $X (includes 2 free retakes)
  - Culture Fit: $Y (includes 2 free retakes)
  - Final Round: $Z (includes 2 free retakes)
- **Bundle (all 3)**: $B (cheaper than X+Y+Z)
- **Bundle without Culture Fit (2 stages)**: $B - $discount
- **Monthly subscription**: $M/month (capped at N full interview processes per month)

### 3.4 Purchase Flow UI
- [ ] After HR screen, show pricing options:
  - "Unlock Hiring Manager" — individual price + "includes 2 retakes"
  - "Unlock Full Interview Prep" — bundle price + "Best value" badge
  - Bundle shows checkboxes: ✅ Hiring Manager, ✅ Culture Fit (optional, -$X if unchecked), ✅ Final Round
  - Monthly subscription option with usage cap disclosure
- [ ] Payment confirmation page with Stripe Checkout redirect
- [ ] Post-payment: credit the user's `user_credits` and unlock the stage(s)

### 3.5 Stage Access Enforcement
- [ ] Before starting any non-HR interview, check `user_credits` or `user_subscriptions`
- [ ] Voice route: reject stage start if no credits/subscription
- [ ] On interview completion, decrement `credits_remaining` (retake uses 1 credit; initial purchase gives 3 total)
- [ ] Subscription anti-abuse: increment `interview_count_this_period`, reject if over `max_interviews_per_period`

### 3.6 Cost Analysis (for pricing)
See section at bottom of this plan.

---

## Phase 4: Practice Cards Upgrade
Extend practice cards to all 4 stages with pass/fail regrading.

### 4.1 Extend Practice Route to All Stages
- [ ] Remove HR-screen-only restriction in `app/api/interview/practice/route.ts`
- [ ] Accept `stage` parameter and load stage-appropriate criteria for comparison
- [ ] Regrading logic: compare new answer against the rubric criterion, return a score + pass/fail
- [ ] Pass threshold: score >= 7/10 on the specific criterion

### 4.2 Practice Card UI Updates
- [ ] Add pass/fail state per card (stored in component state + optionally persisted to DB)
- [ ] On "pass": animate card moving to "Passed" pile with confetti/checkmark
- [ ] On "fail": keep in "Needs Work" pile, show specific feedback on what to improve
- [ ] Show progress: "3 of 6 areas mastered"
- [ ] Persist practice progress to `interview_feedback` or a new `practice_progress` table so it survives page reloads

### 4.3 Audio Recording Polish
- [ ] Ensure MediaRecorder works cross-browser (Chrome, Safari, Firefox)
- [ ] Add visual waveform/timer during recording
- [ ] Auto-stop after 3 minutes (prevent runaway recordings)
- [ ] Show transcription of their answer before submitting for regrading

---

## Phase 5: Profile Page Redesign
Comprehensive user hub.

### 5.1 Profile Layout
- [ ] Header: user name, email, avatar (from Google OAuth or initials), member since date
- [ ] Tabbed interface:
  - **Interviews** — all interview processes grouped by company/position
  - **Resumes** — manage multiple resume versions
  - **Account** — email, password change, subscription status, payment history

### 5.2 Interview History (Interviews Tab)
- [ ] Group by company + position (existing logic, improved UI)
- [ ] Per group: visual pipeline showing all 4 stages with scores, dates, and status
- [ ] Click any completed stage → jump to feedback page
- [ ] Show retake count per stage
- [ ] "Start New Interview Process" button → goes to dashboard

### 5.3 Resume Management (Resumes Tab)
- [ ] List all saved resumes with:
  - Version name / label (e.g., "Software Engineer Resume v2")
  - Upload date
  - File size
  - Preview (first 200 chars of extracted text)
- [ ] Upload new resume (PDF/TXT)
- [ ] Set "active" resume (used by default for new interviews)
- [ ] Delete old versions
- [ ] Store in Supabase Storage (actual files) + `user_resumes` table (metadata + extracted text)
- [ ] Schema:
  ```sql
  user_resumes (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    label TEXT,
    file_url TEXT, -- Supabase Storage URL
    resume_text TEXT, -- extracted text
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ
  )
  ```

### 5.4 Account Tab
- [ ] Display current plan (free / credits remaining / subscription status)
- [ ] Payment history from `payment_transactions`
- [ ] Change password
- [ ] Delete account option

---

## Phase 6: Polish & Testing Readiness

### 6.1 Console Cleanup
- [ ] Remove all `console.log` with emoji prefixes across:
  - `app/api/interview/voice/route.ts`
  - `app/api/interview/feedback/route.ts`
  - `lib/claude-client.ts`
  - `lib/rubric-validator.ts`
  - Other API routes
- [ ] Replace critical logs with proper error logging (keep `console.error` for actual errors)

### 6.2 HR Screen Prompt Dedup
- [ ] Voice route still has HR prompt duplicated inline — switch to using `lib/interview-prompts/hr_screen.ts` module

### 6.3 Error Handling & Edge Cases
- [ ] Graceful handling when API keys are missing/invalid
- [ ] Timeout handling for long-running grading calls
- [ ] User-friendly error messages (not raw error objects)
- [ ] Handle browser tab close during interview (save partial transcript)

### 6.4 UI Polish
- [ ] Loading states for all async operations
- [ ] Mobile responsiveness audit (feedback page is 6000+ lines — likely has mobile issues)
- [ ] Consistent design language across all pages
- [ ] Empty states for new users (no interviews yet, no resumes yet)

### 6.5 Security Audit
- [ ] Verify RLS policies on all tables (especially new payment/credit tables)
- [ ] Ensure API routes validate user ownership before returning data
- [ ] Rate limiting on API routes (especially voice/practice which call OpenAI)
- [ ] Sanitize all user inputs (resume text, job description URLs)

---

## Cost Analysis & Pricing Model

### Per-Interview API Costs (estimated)

**HR Screen** (free tier):
| Service | Model | Est. Tokens | Cost |
|---------|-------|-------------|------|
| Interviewer (8 exchanges) | GPT-4o | ~6K in + 2K out | ~$0.04 |
| Observer (real-time) | GPT-4o-mini | ~4K in + 1K out | ~$0.002 |
| Grader | Claude Sonnet 4 | ~8K in + 4K out | ~$0.06 |
| TTS (interviewer voice) | OpenAI TTS | ~2K chars × 8 | ~$0.02 |
| Whisper (transcription) | Whisper | ~5 min audio | ~$0.03 |
| **Total per HR Screen** | | | **~$0.15** |

**Hiring Manager** (paid):
| Service | Model | Est. Tokens | Cost |
|---------|-------|-------------|------|
| Interviewer (8-10 exchanges) | GPT-4o | ~8K in + 3K out | ~$0.06 |
| Observer | GPT-4o-mini | ~5K in + 1.5K out | ~$0.003 |
| Grader (two-tier) | Claude Sonnet 4 | ~10K in + 6K out | ~$0.08 |
| TTS | OpenAI TTS | ~2.5K chars × 10 | ~$0.025 |
| Whisper | Whisper | ~7 min audio | ~$0.04 |
| **Total per HM** | | | **~$0.21** |

**Culture Fit** (~same as HM): **~$0.19**

**Final Round** (longest, most intensive):
| Service | Model | Est. Tokens | Cost |
|---------|-------|-------------|------|
| Interviewer (9-12 exchanges) | GPT-4o | ~10K in + 4K out | ~$0.08 |
| Observer | GPT-4o-mini | ~6K in + 2K out | ~$0.003 |
| Grader (two-tier, strictest) | Claude Sonnet 4 | ~12K in + 8K out | ~$0.10 |
| TTS | OpenAI TTS | ~3K chars × 12 | ~$0.03 |
| Whisper | Whisper | ~10 min audio | ~$0.06 |
| **Total per Final Round** | | | **~$0.27** |

**Practice Card Regrading** (per card):
| Service | Model | Cost |
|---------|-------|------|
| Whisper (30-60s) | Whisper | ~$0.01 |
| Regrader | GPT-4o-mini | ~$0.003 |
| TTS feedback | OpenAI TTS | ~$0.005 |
| **Total per practice** | | **~$0.02** |

### Full Pipeline Cost (all 4 stages + practice):
- HR Screen: $0.15 (free, we absorb)
- HM + CF + FR: $0.15 + $0.21 + $0.19 + $0.27 = $0.67
- With retakes (3 attempts × 3 paid stages): ~$2.01
- Practice cards (~10 cards × 2 attempts): ~$0.40
- **Total max cost per full pipeline with retakes: ~$2.56**

### Suggested Pricing (targeting 70-80% margin):

| Product | Our Cost (max) | Suggested Price | Margin |
|---------|---------------|-----------------|--------|
| HR Screen (free) | $0.15 | $0.00 | -$0.15 (acquisition cost) |
| HR Screen retake (auth'd) | $0.15 | Free (1 retake) | -$0.15 |
| Hiring Manager (individual) | $0.63 (3 attempts) | $4.99 | 87% |
| Culture Fit (individual) | $0.57 (3 attempts) | $3.99 | 86% |
| Final Round (individual) | $0.81 (3 attempts) | $5.99 | 86% |
| **Bundle (all 3)** | **$2.01** | **$11.99** | **83%** |
| Bundle without CF | $1.44 | $9.99 | 86% |
| Monthly subscription | ~$8-12 (cap 5 full pipelines) | $24.99/mo | 52-67% |

### Subscription Anti-Abuse:
- Cap at 5 complete interview processes per billing period
- Each "process" = 1 set of HM + CF(optional) + FR for one job
- Overage: $2.99 per additional process
- Flag accounts doing >3 processes in a single day for review

---

## Implementation Order

1. **Phase 1** (Clean Foundation) — prerequisite for everything
2. **Phase 2** (Account Creation Gate) — needed before monetization
3. **Phase 3** (Monetization) — the revenue engine
4. **Phase 4** (Practice Cards) — enhances value prop
5. **Phase 5** (Profile Redesign) — user experience
6. **Phase 6** (Polish) — testing readiness

Estimated scope: ~15-20 implementation sessions across all phases.
