import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { NextRequest } from 'next/server'

import {
  PORTFOLIO_SAMPLE_SETUP,
  buildStructuredTranscript,
  getDemoFeedback,
  getDemoPracticeProgress,
  getDemoSession,
  markDemoPracticeComplete,
  saveDemoFeedback,
  saveDemoSession,
  seedPortfolioSampleResult,
} from '../lib/portfolio-demo'
import { MOCK_FEEDBACK, MOCK_TRANSCRIPT } from '../lib/mock-feedback'
import { assertSafePublicUrl, enforceRateLimit, rejectOversizedRequest } from '../lib/demo-guard'
import { getHrInterviewCoverage } from '../lib/hr-interview-coverage'
import { gradeHrScreenQuestionLevel } from '../lib/hr-question-level-grader'
import { buildSystemPrompt as buildHrScreenPrompt } from '../lib/interview-prompts/hr_screen'
import { FRAMEWORK_STEPS, PROFESSIONAL_IDENTITY_STYLE_OPTIONS } from '../lib/professional-story-config'
import {
  FALLBACK_THINKING_SILENCE_MS,
  REALTIME_DEFAULT_MAX_OUTPUT_TOKENS,
  REALTIME_HR_MAX_OUTPUT_TOKENS,
  REALTIME_THINKING_SILENCE_MS,
} from '../lib/realtime-interview-config'

function installBrowserStorage() {
  const values = new Map<string, string>()
  const localStorage = {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
    removeItem(key: string) {
      values.delete(key)
    },
    clear() {
      values.clear()
    },
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  })

  return localStorage
}

test('sample setup contains a complete fictional interview context', () => {
  assert.equal(PORTFOLIO_SAMPLE_SETUP.companyName, 'Moonrise Wildlife Sanctuary')
  assert.ok(PORTFOLIO_SAMPLE_SETUP.resumeText.length > 200)
  assert.ok(PORTFOLIO_SAMPLE_SETUP.resumeText.includes('FICTIONAL SAMPLE CANDIDATE'))
  assert.ok(PORTFOLIO_SAMPLE_SETUP.jobDescriptionText.includes('FICTIONAL DEMO JOB POSTING'))
  assert.ok(PORTFOLIO_SAMPLE_SETUP.jobDescriptionText.includes('Responsibilities:'))
  assert.doesNotMatch(
    `${PORTFOLIO_SAMPLE_SETUP.resumeText}\n${PORTFOLIO_SAMPLE_SETUP.jobDescriptionText}`,
    /customer research|customer insights|program management|software studio|product teams/i,
  )
})

test('professional story workshop teaches present, past, future', () => {
  assert.deepEqual(FRAMEWORK_STEPS.map((step) => step.key), ['present', 'past', 'future'])
  assert.doesNotMatch(
    PROFESSIONAL_IDENTITY_STYLE_OPTIONS.map((option) => option.description).join('\n'),
    /example:|marketing|sales|software engineer|healthcare|education/i,
  )
})

test('sparse interview coverage is not inflated by duplicate transcript formats', () => {
  const structuredTranscript = {
    messages: [
      { speaker: 'candidate', text: "Why aren't you responding quickly?" },
      { speaker: 'candidate', text: "Yeah, I'm, I do a lot of research." },
    ],
  }
  const plainTranscript = [
    "You: Why aren't you responding quickly?",
    "You: Yeah, I'm, I do a lot of research.",
  ].join('\n')

  assert.deepEqual(getHrInterviewCoverage(structuredTranscript, plainTranscript), {
    candidateTurnCount: 2,
    meaningfulTurnCount: 1,
    meaningfulWordCount: 8,
    sufficient: false,
  })
})

test('completed fictional sample has enough live coverage for normal grading', () => {
  const plainTranscript = MOCK_TRANSCRIPT.messages
    .map((message) => `${message.speaker === 'candidate' ? 'You' : 'Interviewer'}: ${message.text}`)
    .join('\n')

  assert.equal(getHrInterviewCoverage(MOCK_TRANSCRIPT, plainTranscript).sufficient, true)
})

test('demo feedback splits exactly six canonical HR areas between strengths and repairs', () => {
  const wentWell = MOCK_FEEDBACK.hr_screen_six_areas.what_went_well
  const needsWork = MOCK_FEEDBACK.hr_screen_six_areas.what_needs_improve
  const criteria = [...wentWell, ...needsWork].map((area) => area.criterion)

  assert.equal(criteria.length, 6)
  assert.equal(new Set(criteria).size, 6)
  assert.equal(wentWell.length, 0)
  assert.equal(needsWork.length, 6)
  assert.deepEqual(new Set(criteria), new Set([
    'Professional Story',
    'Specific Examples and Evidence',
    'Preparation / Curiosity',
    'Handling Uncertain/Difficult Questions',
    'Alignment of Career Goals with Position',
    'Pace and Conversation Flow',
  ]))
})

test('an interrupted interview returns all six repair areas without calling the grader model', async () => {
  const transcriptStructured = {
    messages: [
      { speaker: 'candidate', text: "Why aren't you responding quickly?" },
      { speaker: 'candidate', text: "Yeah, I'm, I do a lot of research." },
    ],
  }
  const rubric = await gradeHrScreenQuestionLevel({
    transcriptStructured,
    transcript: [
      "You: Why aren't you responding quickly?",
      "You: Yeah, I'm, I do a lot of research.",
    ].join('\n'),
  })

  assert.equal(rubric.hr_screen_six_areas.what_needs_improve.length, 6)
  assert.equal(rubric.overall_assessment.overall_score, 0)
})

test('realtime response pacing matches the earlier responsive configuration', () => {
  assert.equal(REALTIME_THINKING_SILENCE_MS, 3200)
  assert.equal(FALLBACK_THINKING_SILENCE_MS, 4500)
  assert.equal(REALTIME_HR_MAX_OUTPUT_TOKENS, 180)
  assert.equal(REALTIME_DEFAULT_MAX_OUTPUT_TOKENS, 400)

  const prompt = buildHrScreenPrompt({ dataSection: 'Demo context' })
  assert.match(prompt, /Normal turns are 6-18 words/)
  assert.doesNotMatch(prompt, /20-55 words|35-70 words/)
})

test('answer-building source files do not contain personal work-history examples', () => {
  const sourceFiles = [
    '../components/exercises/GuidedBuilderWorkshop.tsx',
    '../components/exercises/ProfessionalStoryBuilder.tsx',
    '../components/exercises/ProfessionalStoryWorkshop.tsx',
    '../components/exercises/StarStoryBuilder.tsx',
    '../components/exercises/HandlingUncertaintyWorkshop.tsx',
    '../lib/handling-uncertainty-bank.ts',
    '../lib/practice-bundles.ts',
    '../lib/professional-story-config.ts',
    '../lib/star-story-config.ts',
    '../lib/claude-client.ts',
    '../docs/ai-architecture-cached-profiles.md',
  ]
  const sources = sourceFiles
    .map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
    .join('\n')

  assert.doesNotMatch(
    sources,
    /TouchPoint|Sub-Zero|Senior Living|United Way|e\.g\. Target|Logistics Coordinator|Program Coordinator|dealer development|dealer-facing|training dealers|website redesign/i,
  )
})

test('structured transcripts preserve interviewer questions and candidate answers', () => {
  const structured = buildStructuredTranscript([
    'Interviewer: Tell me about your background?',
    'You: I coordinate animal intake and maintain wildlife care records.',
    'Interviewer: Why are you interested in this role?',
    'You: It combines animal-care routines, volunteer scheduling, and safe transport planning.',
  ].join('\n'))

  assert.equal(structured.messages.length, 4)
  assert.equal(structured.questions_asked.length, 2)
  assert.equal(structured.messages[1].speaker, 'candidate')
})

test('one-session demo feedback and practice completion survive browser navigation', () => {
  installBrowserStorage()
  const sessionId = 'demo-session-1'
  const session = {
    id: sessionId,
    stage: 'hr_screen' as const,
    status: 'completed' as const,
    created_at: new Date().toISOString(),
    demo_mode: true as const,
    setup: PORTFOLIO_SAMPLE_SETUP,
  }

  saveDemoSession(session)
  saveDemoFeedback(sessionId, { overall_score: 7, hr_screen_six_areas: { what_needs_improve: [] } })
  markDemoPracticeComplete(sessionId, 'professional_story:q1')
  markDemoPracticeComplete(sessionId, 'professional_story:q1')

  assert.equal(getDemoSession()?.id, sessionId)
  assert.equal(getDemoFeedback(sessionId)?.feedback.overall_score, 7)
  assert.deepEqual(getDemoPracticeProgress(sessionId), ['professional_story:q1'])
})

test('completed sample seeds feedback and a workshop-ready practice session', () => {
  installBrowserStorage()
  const session = seedPortfolioSampleResult(MOCK_FEEDBACK, MOCK_TRANSCRIPT)

  assert.equal(session.status, 'completed')
  assert.equal(session.company_name, PORTFOLIO_SAMPLE_SETUP.companyName)
  assert.equal(session.transcript_structured?.questions_asked.length, MOCK_TRANSCRIPT.questions_asked.length)
  assert.ok((getDemoFeedback(session.id)?.feedback.hr_screen_six_areas.what_needs_improve || []).length > 0)
})

test('public request guard rejects oversized bodies', () => {
  const request = new NextRequest('https://prepme.example/api/demo', {
    method: 'POST',
    headers: { 'content-length': '2048' },
  })

  assert.equal(rejectOversizedRequest(request, 1024)?.status, 413)
})

test('public request guard throttles repeated callers', () => {
  const request = new NextRequest('https://prepme.example/api/demo', {
    headers: { 'x-forwarded-for': '203.0.113.42' },
  })
  const scope = `test-${Date.now()}`

  assert.equal(enforceRateLimit(request, scope, { limit: 1, windowMs: 60_000 }), null)
  assert.equal(enforceRateLimit(request, scope, { limit: 1, windowMs: 60_000 })?.status, 429)
})

test('website import refuses local and private-network destinations', async () => {
  await assert.rejects(assertSafePublicUrl('http://localhost:3000/private'))
  await assert.rejects(assertSafePublicUrl('http://127.0.0.1/private'))
})
