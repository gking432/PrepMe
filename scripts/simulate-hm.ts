/**
 * HM interview simulator.
 *
 * Runs the live Hiring Manager interviewer prompt against four synthetic
 * candidate personas (poor / good / better / best), then hands each
 * transcript to the production grader and writes markdown reports.
 *
 * Usage:
 *   npm run simulate:hm                # all four levels in one go
 *   npm run simulate:hm -- best        # one level
 *   SIM_MODEL=gpt-4o npm run simulate:hm
 *   SIM_MAX_TURNS=8 npm run simulate:hm
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
async function gradeTranscript(transcript: string[]): Promise<any | null> {
  const materials: GradingMaterials = {
    transcript: transcript.join('\n\n'),
    resume: FIXTURE.resume,
    jobDescription: `Company: ${FIXTURE.company}\nPosition: ${FIXTURE.role}\n\n${FIXTURE.jobDescription}`,
    stage: 'hiring_manager',
  }
  try {
    return await gradeHiringManagerWithRetry(materials, 2)
  } catch (err: any) {
    console.error('  grading failed:', err?.message || err)
    return null
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

function renderMarkdown(level: Level, transcript: string[], grade: any | null, model: string): string {
  const overall = grade?.overall_assessment || {}
  const hmSix = grade?.hiring_manager_six_areas
  const score = overall.overall_score ?? 'n/a'
  const likelihood = overall.likelihood_to_advance ?? 'n/a'
  const summary = overall.summary ?? '_(no summary)_'
  const interviewerTurns = transcript.filter((l) => l.startsWith('Interviewer:')).length

  return `# HM Simulation — ${level}

**Role:** ${FIXTURE.role} at ${FIXTURE.company}
**Model:** ${model}
**Interviewer turns:** ${interviewerTurns}

---

## Overall

- **Score:** ${score}/10
- **Likelihood to advance:** ${likelihood}

${summary}

### Key strengths
${bulletList(overall.key_strengths)}

### Key weaknesses
${bulletList(overall.key_weaknesses)}

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

function renderSummary(rows: Array<{ level: Level; score: any; turns: number; file: string }>, model: string, ts: string): string {
  return `# HM Simulation Summary — ${ts}

**Model:** ${model}

| Level  | Score   | Turns | Report |
|--------|---------|-------|--------|
${rows.map((r) => `| ${r.level} | ${r.score}/10 | ${r.turns} | [${path.basename(r.file)}](./${path.basename(r.file)}) |`).join('\n')}
`
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing (set it in .env.local)')
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing (set it in .env.local)')

  const arg = process.argv[2] as Level | undefined
  const levels: readonly Level[] = arg && LEVELS.includes(arg) ? [arg] : LEVELS

  const outDir = path.join(process.cwd(), 'simulations')
  fs.mkdirSync(outDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  console.log(`HM simulator — model=${MODEL} levels=${levels.join(',')} maxTurns=${MAX_TURNS}`)

  const summary: Array<{ level: Level; score: any; turns: number; file: string }> = []

  for (const level of levels) {
    console.log(`\n── Level: ${level} ──`)
    const transcript = await runSimulation(level)
    const interviewerTurns = transcript.filter((l) => l.startsWith('Interviewer:')).length
    console.log(`  running grader…`)
    const grade = await gradeTranscript(transcript)
    const md = renderMarkdown(level, transcript, grade, MODEL)
    const file = path.join(outDir, `hm-${level}-${ts}.md`)
    fs.writeFileSync(file, md)
    console.log(`  wrote ${path.relative(process.cwd(), file)}`)
    summary.push({ level, score: grade?.overall_assessment?.overall_score ?? 'n/a', turns: interviewerTurns, file })
  }

  if (summary.length > 1) {
    const summaryFile = path.join(outDir, `summary-${ts}.md`)
    fs.writeFileSync(summaryFile, renderSummary(summary, MODEL, ts))
    console.log(`\n── Summary ──`)
    for (const row of summary) console.log(`  ${row.level.padEnd(7)} score=${row.score}/10 turns=${row.turns}`)
    console.log(`  ${path.relative(process.cwd(), summaryFile)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
