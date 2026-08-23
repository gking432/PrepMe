import assert from 'node:assert/strict'
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
} from '../lib/portfolio-demo'
import { assertSafePublicUrl, enforceRateLimit, rejectOversizedRequest } from '../lib/demo-guard'

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
  assert.equal(PORTFOLIO_SAMPLE_SETUP.companyName, 'Cedar & Signal Labs')
  assert.ok(PORTFOLIO_SAMPLE_SETUP.resumeText.length > 200)
  assert.ok(PORTFOLIO_SAMPLE_SETUP.resumeText.includes('FICTIONAL SAMPLE CANDIDATE'))
  assert.ok(PORTFOLIO_SAMPLE_SETUP.jobDescriptionText.includes('FICTIONAL DEMO JOB POSTING'))
  assert.ok(PORTFOLIO_SAMPLE_SETUP.jobDescriptionText.includes('Responsibilities:'))
})

test('structured transcripts preserve interviewer questions and candidate answers', () => {
  const structured = buildStructuredTranscript([
    'Interviewer: Tell me about your background?',
    'You: I lead product marketing for B2B software.',
    'Interviewer: Why are you interested in this role?',
    'You: It combines customer research, launches, and sales partnership.',
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
