/**
 * HM interview simulator.
 *
 * Runs the live Hiring Manager interviewer prompt against synthetic
 * candidate personas (poor / good / better / best), then optionally hands
 * each transcript to the production grader and writes markdown + JSON reports.
 *
 * Usage:
 *   npm run simulate:hm                         # all four levels in one go
 *   npm run simulate:hm -- best                 # one level
 *   npm run simulate:hm -- poor,best            # comma-separated levels
 *   SIM_MODEL=gpt-4o npm run simulate:hm
 *   SIM_MAX_TURNS=8 npm run simulate:hm
 *   SIM_RUNS_PER_LEVEL=25 npm run simulate:hm   # 100 total simulations
 *   SIM_GRADE=0 npm run simulate:hm             # prompt-only, no Claude spend
 *
 * Requires OPENAI_API_KEY and ANTHROPIC_API_KEY in .env.local.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import OpenAI from 'openai'
import { buildSystemPrompt as buildHmPrompt } from '../lib/interview-prompts/hiring_manager'
import { gradeHiringManagerWithRetry, type GradingMaterials } from '../lib/claude-client'

// ── Configuration ──────────────────────────────────────────────────────────
const LEVELS = ['poor', 'good', 'better', 'best'] as const
type Level = (typeof LEVELS)[number]

const MODEL = process.env.SIM_MODEL || 'gpt-4o'
const MAX_TURNS = Number.parseInt(process.env.SIM_MAX_TURNS || '12', 10)
const RUNS_PER_LEVEL = Math.max(1, Number.parseInt(process.env.SIM_RUNS_PER_LEVEL || '1', 10))
const GRADER_ENABLED = !['0', 'false', 'off', 'no'].includes((process.env.SIM_GRADE || '1').toLowerCase())

const EXPECTED_SCORE_BANDS: Record<Level, { min: number; max: number }> = {
  poor: { min: 1, max: 4 },
  good: { min: 5, max: 7 },
  better: { min: 7, max: 8 },
  best: { min: 8, max: 10 },
}

// ── Fixture ────────────────────────────────────────────────────────────────
const FIXTURE = {
  role: 'Senior Product Manager',
  company: 'Atlas Robotics',
  candidateName: 'Jane Smith',
  resume: `Jane Smith — Senior Product Manager
Email: jane.smith@example.com

EXPERIENCE
Veris Logistics — Senior Product Manager (2021–present)
- Led the Warehouse OS platform team (6 PMs, ~40 engineers).
- Shipped fleet routing module that cut average robot idle time by 22% across 14 customer sites.
- Drove the 0→1 launch of a third-party integration framework adopted by 8 partners in 18 months.
- Defined the metrics framework for warehouse throughput; the company's North Star Metric came out of my team.
- Coached 2 PMs from mid to senior level.

Cubicle (B2B SaaS workflow tools) — Product Manager (2018–2021)
- Owned the public API and developer platform.
- Grew API-driven revenue from $2M to $14M ARR in 30 months via developer programs and packaging changes.
- Designed and ran A/B testing infrastructure used by all PMs.

EDUCATION
MBA, Stanford GSB (2018)
BS Mechanical Engineering, MIT (2014)

SKILLS
SQL, A/B testing, Amplitude, Figma, JIRA, Roadmunk, OKRs, technical depth in robotics & APIs.
`,
  jobDescription: `Atlas Robotics is hiring a Senior Product Manager to lead Fleet OS, our software platform for autonomous warehouse robotics.

What you'll do
- Define and drive the multi-year roadmap for Fleet OS across our customer base (3PLs, retail DCs, manufacturing).
- Translate hard operational problems (routing under congestion, dynamic prioritization, exception handling) into product specs.
- Partner deeply with robotics engineering, ML, and customer operations.
- Own KPIs that matter: robot utilization, pick rate, mean time to recover, customer outcome metrics.
- Drive 0→1 module launches and scale them to all enterprise customers.

What we look for
- 5+ years in B2B SaaS PM. Robotics, logistics, or industrial automation strongly preferred.
- Track record of shipping complex products against measurable outcomes.
- Comfortable with SQL, experimentation, OKRs, and technical depth.
- Strong written and verbal communication; can negotiate with engineering leadership.
- Bias to action under ambiguity.
`,
}

function buildDataSection(): string {
  return `=== CANDIDATE RESUME ===
${FIXTURE.resume}

=== JOB DESCRIPTION ===
Company: ${FIXTURE.company}
Position: ${FIXTURE.role}

${FIXTURE.jobDescription}

`
}

// ── Personas ───────────────────────────────────────────────────────────────
function candidateSystem(level: Level): string {
  const identity = `You are ${FIXTURE.candidateName}, interviewing live (voice) with the hiring manager at ${FIXTURE.company} for the ${FIXTURE.role} role. You have lived your own resume below — speak from it as your real history.

YOUR RESUME (your real background):
${FIXTURE.resume}

THE ROLE YOU'RE INTERVIEWING FOR:
${FIXTURE.jobDescription}

INTERVIEW RULES:
- This is the candidate side of a live conversation. Reply ONLY with what you would say out loud. No stage directions, no meta commentary, no bullet lists, no markdown.
- One thought at a time. Natural conversational length.
- Never break character to ask the interviewer for help or clarification about the simulation.
- If asked a question you can't answer, respond the way a real candidate at your skill level would.`

  const styles: Record<Level, string> = {
    poor: `SKILL LEVEL: POOR.
- Vague and generic. Lots of hedging ("kind of", "we sort of", "things like that").
- Use "we" not "I". You cannot cleanly separate your contribution from the team's.
- Never cite metrics. Avoid specific decisions, tradeoffs, or named tools.
- Use buzzwords ("synergy", "drive value", "stakeholder alignment") instead of substance.
- When pushed for specifics, hedge harder, repeat yourself, or change the topic.
- Don't ask thoughtful questions at the end — ask basic logistics ("how big is the team?").
- Keep answers short (40–80 words) and shallow.`,

    good: `SKILL LEVEL: GOOD (average candidate).
- Loose STAR structure but generic results ("we improved things", "it went well").
- Mix of "we" and "I". Ownership is decent but not crisp under probing.
- Some specifics. One or two metrics if directly asked, never volunteered.
- Surface-level role knowledge — repeat JD language without depth.
- Recover from follow-ups, but predictable and a little defensive.
- Ask one or two okay questions at the end ("what does success look like in the first six months?").
- 60–100 words per turn.`,

    better: `SKILL LEVEL: BETTER (strong candidate).
- Tight STAR. Short situation, clear task ownership, specific action, real result.
- Use "I" framing. Can separate your work from the team's.
- Volunteer real metrics from the resume (e.g. "cut robot idle time 22%", "grew API ARR from $2M to $14M").
- Decent role-specific depth tied to the JD — name concrete tools, decisions, tradeoffs.
- Handle pressure probes well. Concede honestly when you don't have direct experience and explain how you'd close the gap.
- Ask two sharp questions at the end about role expectations or success metrics.
- 70–110 words per turn.`,

    best: `SKILL LEVEL: BEST (near-ideal candidate).
- Crisp STAR with business impact landed at the end of each story.
- Strong "I" framing, including the decision points and tradeoffs you owned.
- Anticipate the follow-up — offer the metric, the lesson, and the counterfactual in the same answer.
- Deep role-specific knowledge tied directly to the JD (e.g. routing under congestion, MTTR, 3PL ops realities).
- When asked for ambiguous scenarios, walk through how you'd clarify, prioritize, and decide — with explicit tradeoffs.
- Ask 2–3 sharp questions at the end about expectations, customer access, or how the manager defines a successful first year.
- 90–130 words per turn.`,
  }

  return `${identity}\n\n${styles[level]}`
}

// ── Conversation loop ──────────────────────────────────────────────────────
type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string }

interface GradeResult {
  grade: any | null
  error: string | null
}

interface SimulationResult {
  level: Level
  runNumber: number
  model: string
  transcript: string[]
  grade: any | null
  gradeError: string | null
  score: number | null
  likelihood: string
  interviewerTurns: number
  candidateTurns: number
  flags: string[]
  markdownFile: string
  jsonFile: string
}

async function chat(openai: OpenAI, messages: ChatMsg[], maxTokens: number, temperature: number) {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: messages as any,
    temperature,
    max_tokens: maxTokens,
  })
  return res.choices[0]?.message?.content?.trim() || ''
}

function isEndSignal(interviewerMsg: string): boolean {
  return /thanks for the conversation|much clearer sense of how you think/i.test(interviewerMsg)
}

async function runSimulation(level: Level): Promise<string[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const hmSystem = buildHmPrompt({ dataSection: buildDataSection() })
  const candSystem = candidateSystem(level)

  // Two parallel histories — same conversation, mirrored role assignments.
  const interviewerHistory: ChatMsg[] = [{ role: 'system', content: hmSystem }]
  const candidateHistory: ChatMsg[] = [{ role: 'system', content: candSystem }]

  // Prime the interviewer to lead.
  interviewerHistory.push({
    role: 'user',
    content: '[The candidate just joined the video call. Greet them and start the interview.]',
  })

  const transcript: string[] = []

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const interviewerMsg = await chat(openai, interviewerHistory, 220, 0.7)
    if (!interviewerMsg) break
    interviewerHistory.push({ role: 'assistant', content: interviewerMsg })
    candidateHistory.push({ role: 'user', content: interviewerMsg })
    transcript.push(`Interviewer: ${interviewerMsg}`)
    process.stdout.write(`  [${turn + 1}] interviewer (${interviewerMsg.length}c)`)

    if (isEndSignal(interviewerMsg)) {
      process.stdout.write(' — end signal\n')
      break
    }

    const candidateMsg = await chat(openai, candidateHistory, 260, 0.85)
    if (!candidateMsg) break
    candidateHistory.push({ role: 'assistant', content: candidateMsg })
    interviewerHistory.push({ role: 'user', content: candidateMsg })
    transcript.push(`Candidate: ${candidateMsg}`)
    process.stdout.write(` -> candidate (${candidateMsg.length}c)\n`)
  }

  return transcript
}

// ── Grading ────────────────────────────────────────────────────────────────
async function gradeTranscript(transcript: string[]): Promise<GradeResult> {
  if (!GRADER_ENABLED) {
    return { grade: null, error: 'grading skipped with SIM_GRADE=0' }
  }

  const materials: GradingMaterials = {
    transcript: transcript.join('\n\n'),
    resume: FIXTURE.resume,
    jobDescription: `Company: ${FIXTURE.company}\nPosition: ${FIXTURE.role}\n\n${FIXTURE.jobDescription}`,
    stage: 'hiring_manager',
  }
  try {
    const grade = await gradeHiringManagerWithRetry(materials, 2)
    return { grade, error: null }
  } catch (err: any) {
    const message = err?.message || String(err)
    console.error('  grading failed:', message)
    return { grade: null, error: message }
  }
}

// ── Output ─────────────────────────────────────────────────────────────────
function bulletList(items: any): string {
  const arr = Array.isArray(items) ? items : []
  if (!arr.length) return '_(none)_'
  return arr.map((s) => `- ${typeof s === 'string' ? s : JSON.stringify(s)}`).join('\n')
}

function sixAreaList(items: any): string {
  const arr = Array.isArray(items) ? items : []
  if (!arr.length) return '_(none)_'
  return arr
    .map((a: any) => {
      const name = a?.criterion || a?.score_area || a?.area || 'Criterion'
      const score = a?.score != null ? ` (${a.score}/10)` : ''
      const feedback = a?.feedback ? ` — ${a.feedback}` : ''
      return `- **${name}**${score}${feedback}`
    })
    .join('\n')
}

function renderTranscript(transcript: string[]): string {
  return transcript
    .map((line) => {
      const isI = line.startsWith('Interviewer:')
      const label = isI ? '**Interviewer:**' : '**Candidate:**'
      const body = line.replace(/^(Interviewer:|Candidate:)\s*/, '')
      return `${label} ${body}`
    })
    .join('\n\n')
}

function toScore(value: any): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function containsClosing(transcript: string[]): boolean {
  return transcript.some((line) => line.startsWith('Interviewer:') && isEndSignal(line))
}

function findRunFlags(level: Level, transcript: string[], grade: any | null, gradeError: string | null): string[] {
  const flags: string[] = []
  const interviewerTurns = transcript.filter((l) => l.startsWith('Interviewer:')).length
  const score = toScore(grade?.overall_assessment?.overall_score)
  const band = EXPECTED_SCORE_BANDS[level]
  const interviewerText = transcript
    .filter((l) => l.startsWith('Interviewer:'))
    .join('\n')
    .toLowerCase()

  if (!GRADER_ENABLED) flags.push('grading_skipped')
  if (GRADER_ENABLED && !grade) flags.push('grading_failed')
  if (gradeError && GRADER_ENABLED) flags.push('grading_error_recorded')
  if (score != null && (score < band.min || score > band.max)) flags.push('score_out_of_expected_band')
  if (!containsClosing(transcript)) flags.push('no_interviewer_closing')
  if (interviewerTurns < 8) flags.push('too_short')
  if (interviewerTurns > 14) flags.push('too_long')
  if (/that's impressive|great questions|excellent question|i appreciate your honesty|that's insightful/.test(interviewerText)) {
    flags.push('possible_over_validation')
  }

  return flags
}

function renderMarkdown(result: SimulationResult): string {
  const { level, transcript, grade, gradeError, model, runNumber, flags } = result
  const overall = grade?.overall_assessment || {}
  const hmSix = grade?.hiring_manager_six_areas
  const score = overall.overall_score ?? 'n/a'
  const likelihood = overall.likelihood_to_advance ?? 'n/a'
  const summary = overall.summary ?? '_(no summary)_'
  const interviewerTurns = transcript.filter((l) => l.startsWith('Interviewer:')).length
  const expected = EXPECTED_SCORE_BANDS[level]

  return `# HM Simulation — ${level} #${runNumber}

**Role:** ${FIXTURE.role} at ${FIXTURE.company}
**Model:** ${model}
**Grading:** ${GRADER_ENABLED ? 'enabled' : 'skipped'}
**Interviewer turns:** ${interviewerTurns}
**Expected score band:** ${expected.min}-${expected.max}/10
**Flags:** ${flags.length ? flags.join(', ') : 'none'}

---

## Overall

- **Score:** ${score}/10
- **Likelihood to advance:** ${likelihood}

${summary}

### Key strengths
${bulletList(overall.key_strengths)}

### Key weaknesses
${bulletList(overall.key_weaknesses)}

${gradeError ? `### Grading error\n${gradeError}\n` : ''}

---

## Hiring Manager — what went well
${sixAreaList(hmSix?.what_went_well)}

## Hiring Manager — what needs improvement
${sixAreaList(hmSix?.what_needs_improve)}

---

## Transcript

${renderTranscript(transcript)}
`
}

function summarizeLevel(rows: SimulationResult[], level: Level) {
  const levelRows = rows.filter((r) => r.level === level)
  const scores = levelRows.map((r) => r.score).filter((s): s is number => typeof s === 'number')
  const avg = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null
  const avgTurns = levelRows.length
    ? levelRows.reduce((sum, r) => sum + r.interviewerTurns, 0) / levelRows.length
    : 0
  return {
    runs: levelRows.length,
    graded: scores.length,
    avg,
    min: scores.length ? Math.min(...scores) : null,
    max: scores.length ? Math.max(...scores) : null,
    gradeFailures: levelRows.filter((r) => r.flags.includes('grading_failed')).length,
    avgTurns,
  }
}

function findSuiteWarnings(rows: SimulationResult[]): string[] {
  const warnings: string[] = []
  const avgs = LEVELS.map((level) => ({ level, avg: summarizeLevel(rows, level).avg }))
  for (let i = 1; i < avgs.length; i++) {
    const prev = avgs[i - 1]
    const current = avgs[i]
    if (prev.avg != null && current.avg != null && current.avg <= prev.avg) {
      warnings.push(`non_monotonic_average: ${current.level} avg ${current.avg.toFixed(1)} <= ${prev.level} avg ${prev.avg.toFixed(1)}`)
    }
  }
  const failed = rows.filter((r) => r.flags.includes('grading_failed')).length
  if (failed) warnings.push(`${failed} grading failure(s)`)
  const noClose = rows.filter((r) => r.flags.includes('no_interviewer_closing')).length
  if (noClose) warnings.push(`${noClose} run(s) hit max turns without clean close`)
  return warnings
}

function renderSummary(rows: SimulationResult[], model: string, ts: string): string {
  const suiteWarnings = findSuiteWarnings(rows)

  return `# HM Simulation Summary — ${ts}

**Model:** ${model}
**Grading:** ${GRADER_ENABLED ? 'enabled' : 'skipped'}
**Runs per level:** ${RUNS_PER_LEVEL}

## Aggregates

| Level | Runs | Graded | Avg Score | Range | Avg Turns | Grade Failures |
|-------|------|--------|-----------|-------|-----------|----------------|
${LEVELS.map((level) => {
    const s = summarizeLevel(rows, level)
    return `| ${level} | ${s.runs} | ${s.graded} | ${s.avg == null ? 'n/a' : s.avg.toFixed(1)} | ${s.min == null ? 'n/a' : `${s.min}-${s.max}`} | ${s.avgTurns.toFixed(1)} | ${s.gradeFailures} |`
  }).join('\n')}

## Suite Warnings

${suiteWarnings.length ? suiteWarnings.map((w) => `- ${w}`).join('\n') : '_(none)_'}

## Runs

| Level | Run | Score | Expected | Turns | Flags | Report | JSON |
|-------|-----|-------|----------|-------|-------|--------|------|
${rows.map((r) => {
    const band = EXPECTED_SCORE_BANDS[r.level]
    return `| ${r.level} | ${r.runNumber} | ${r.score ?? 'n/a'}/10 | ${band.min}-${band.max} | ${r.interviewerTurns} | ${r.flags.join(', ') || 'none'} | [md](./${path.basename(r.markdownFile)}) | [json](./${path.basename(r.jsonFile)}) |`
  }).join('\n')}
`
}

function writeJson(file: string, payload: any) {
  fs.writeFileSync(file, JSON.stringify(payload, null, 2))
}

function parseLevelsFromArgs(): readonly Level[] {
  const args = process.argv
    .slice(2)
    .filter((arg) => arg !== '--')
    .flatMap((arg) => arg.split(',').map((part) => part.trim()))
    .filter(Boolean)
  const selected = args.filter((arg): arg is Level => LEVELS.includes(arg as Level))
  return selected.length ? Array.from(new Set(selected)) : LEVELS
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing (set it in .env.local)')
  if (GRADER_ENABLED && !process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing (set it in .env.local)')

  const levels = parseLevelsFromArgs()

  const outDir = path.join(process.cwd(), 'simulations')
  fs.mkdirSync(outDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  console.log(`HM simulator — model=${MODEL} levels=${levels.join(',')} maxTurns=${MAX_TURNS} runsPerLevel=${RUNS_PER_LEVEL} grading=${GRADER_ENABLED ? 'on' : 'off'}`)

  const summary: SimulationResult[] = []

  for (const level of levels) {
    for (let runNumber = 1; runNumber <= RUNS_PER_LEVEL; runNumber++) {
      console.log(`\n── Level: ${level} #${runNumber} ──`)
      const transcript = await runSimulation(level)
      const interviewerTurns = transcript.filter((l) => l.startsWith('Interviewer:')).length
      const candidateTurns = transcript.filter((l) => l.startsWith('Candidate:')).length
      console.log(`  ${GRADER_ENABLED ? 'running grader…' : 'skipping grader…'}`)
      const { grade, error: gradeError } = await gradeTranscript(transcript)
      const score = toScore(grade?.overall_assessment?.overall_score)
      const likelihood = grade?.overall_assessment?.likelihood_to_advance ?? 'n/a'
      const flags = findRunFlags(level, transcript, grade, gradeError)
      const suffix = RUNS_PER_LEVEL > 1 ? `${String(runNumber).padStart(2, '0')}-${ts}` : ts
      const markdownFile = path.join(outDir, `hm-${level}-${suffix}.md`)
      const jsonFile = path.join(outDir, `hm-${level}-${suffix}.json`)
      const result: SimulationResult = {
        level,
        runNumber,
        model: MODEL,
        transcript,
        grade,
        gradeError,
        score,
        likelihood,
        interviewerTurns,
        candidateTurns,
        flags,
        markdownFile,
        jsonFile,
      }

      fs.writeFileSync(markdownFile, renderMarkdown(result))
      writeJson(jsonFile, {
        level,
        runNumber,
        model: MODEL,
        maxTurns: MAX_TURNS,
        graderEnabled: GRADER_ENABLED,
        expectedScoreBand: EXPECTED_SCORE_BANDS[level],
        score,
        likelihood,
        interviewerTurns,
        candidateTurns,
        flags,
        gradeError,
        transcript,
        grade,
      })
      console.log(`  wrote ${path.relative(process.cwd(), markdownFile)} and ${path.relative(process.cwd(), jsonFile)}`)
      console.log(`  score=${score ?? 'n/a'}/10 turns=${interviewerTurns} flags=${flags.join(', ') || 'none'}`)
      summary.push(result)
    }
  }

  const summaryFile = path.join(outDir, `summary-${ts}.md`)
  const summaryJsonFile = path.join(outDir, `summary-${ts}.json`)
  fs.writeFileSync(summaryFile, renderSummary(summary, MODEL, ts))
  writeJson(summaryJsonFile, {
    timestamp: ts,
    model: MODEL,
    maxTurns: MAX_TURNS,
    runsPerLevel: RUNS_PER_LEVEL,
    graderEnabled: GRADER_ENABLED,
    expectedScoreBands: EXPECTED_SCORE_BANDS,
    suiteWarnings: findSuiteWarnings(summary),
    runs: summary.map((r) => ({
      level: r.level,
      runNumber: r.runNumber,
      score: r.score,
      likelihood: r.likelihood,
      interviewerTurns: r.interviewerTurns,
      candidateTurns: r.candidateTurns,
      flags: r.flags,
      markdownFile: path.relative(outDir, r.markdownFile),
      jsonFile: path.relative(outDir, r.jsonFile),
    })),
  })

  console.log(`\n── Summary ──`)
  for (const level of levels) {
    const s = summarizeLevel(summary, level)
    console.log(`  ${level.padEnd(7)} avg=${s.avg == null ? 'n/a' : s.avg.toFixed(1)} runs=${s.runs} graded=${s.graded} failures=${s.gradeFailures}`)
  }
  const warnings = findSuiteWarnings(summary)
  if (warnings.length) console.log(`  warnings=${warnings.join('; ')}`)
  console.log(`  ${path.relative(process.cwd(), summaryFile)}`)
  console.log(`  ${path.relative(process.cwd(), summaryJsonFile)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
