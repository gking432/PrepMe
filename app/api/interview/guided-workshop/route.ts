import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Anthropic } from '@anthropic-ai/sdk/client'
import { enforceRateLimit, rejectOversizedRequest } from '@/lib/demo-guard'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropic
}

type WorkshopType =
  | 'professional_story'
  | 'star_proof'
  | 'career_alignment'
  | 'handling_uncertainty'
  | 'pace_delivery'
  | 'preparation_curiosity'
  | 'role_depth'
  | 'problem_solving'

const STEP_GUIDANCE: Record<WorkshopType, Record<string, string>> = {
  star_proof: {
    situation: `Generate 3 suggestions that each follow one of these EXACT structural patterns. Fill in the blanks from the candidate's resume and original answer:
Pattern A: "[At/During/When] [company/project], [1-sentence scene-setter with who and what was happening]."
Pattern B: "So this was at [company] — [brief context of the situation]."
Pattern C: "This happened when I was [role] at [company]. [One sentence about what was going on]."
Pull from the candidate's ORIGINAL ANSWER first for the specific story. If the original answer names a situation, USE THAT — don't invent a different one. Only fall back to resume details if the original answer is too vague to identify a scene. Each suggestion is 1-2 sentences max.`,
    task: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "I was responsible for [specific ownership from the story]."
Pattern B: "My piece of it was [what specifically fell to them]."
Pattern C: "I was the one who had to [specific task they owned]."
The content MUST come from what was described in the original answer or previous situation choice. Do NOT invent responsibilities — restructure what the candidate actually said they did. One sentence each.`,
    action: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "What I actually did was [concrete step 1], [concrete step 2], and [concrete step 3]."
Pattern B: "So I [first action], then [second action], and [third action if applicable]."
Pattern C: "I ended up [specific action] — and then [follow-up action]."
The actions MUST come from the candidate's original answer. Restructure and tighten what they actually said they did — do not invent new actions. This is the heaviest part of the answer. 1-2 sentences, but pack in the specifics.`,
    result: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "In the end, [specific outcome — numbers if available, real result if not]."
Pattern B: "We ended up [concrete outcome]. [One sentence about lasting impact if applicable]."
Pattern C: "That got us [specific result] — [brief note on why it mattered]."
Pull the result from the candidate's original answer. If the original answer had a result, USE IT. If it was vague, tighten it. Never invent metrics.`,
  },
  professional_story: {
    present: `Generate 3 suggestions using the candidate's MOST RECENT role (latest end date or "present"). Each must follow one of these EXACT structural patterns:
Pattern A: "Right now, at [company] I work as [title], where I'm mostly focused on [top 2-3 duties as gerunds]."
Pattern B: "At [company], I've spent the last [timeframe] focused on [duties described conversationally]."
Pattern C: "As [title] at [company], a lot of my work centers on [duties]."
Fill in company, title, and duties from the resume. Convert resume bullet points into spoken gerund phrases (e.g. "managing orders, coordinating vendors"). One sentence each.`,
    past: `Generate 3 suggestions using an EARLIER role from the resume (NOT the current one). Each must follow one of these EXACT structural patterns:
Pattern A: "Before that, I spent time at [company] doing [duties], which is where I built [skill/strength]."
Pattern B: "Earlier in my career, [company] shaped me a lot — that [title] role gave me real experience in [skills]."
Pattern C: "A big part of what got me here was my time at [company], where I worked as [title] and developed [skills] through [duties]."
Pull company, title, duties, and skills from an earlier resume role. Keep it to 1-2 sentences. Must sound spoken.`,
    future: `Generate 3 suggestions that connect the candidate's arc to the TARGET JOB. Each must follow one of these EXACT structural patterns:
Pattern A: "So that's why this [role title from JD] role makes sense — it's [connection to their arc]."
Pattern B: "Going forward, I want to keep building in [area], and this role is [why it fits]."
Pattern C: "That's what got me interested in this — I want [specific thing from JD] to be more central to what I do."
Each must name something SPECIFIC from the job description and connect it to the candidate's background. 1-2 sentences.`,
  },
  career_alignment: {
    observation: `Generate 3 suggestions that each follow one of these EXACT structural patterns. Use ONLY the job description — do NOT mention the candidate's background:
Pattern A: "What stood out to me is how central this role is to [specific responsibility/scope from JD]."
Pattern B: "One thing that really caught my attention is that this role [specific detail from JD]."
Pattern C: "What interests me most is that this role sits close to [specific aspect of the work from JD]."
HARD RULE: This step is ONLY about the role/company. Do NOT mention the candidate at all — no "which aligns with my...", no "because I...", no background references. Just what they noticed about the JD. One sentence each.`,
    fit: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "That fits well with my background, because [concrete experience from resume that maps to the observation]."
Pattern B: "That connects naturally to the work I've been doing — [specific experience or skill from resume]."
Pattern C: "That's actually what I've been doing at [company] — [specific matching experience]."
HARD RULE: This step is ONLY about the candidate's background. Do NOT repeat what was said in the observation — the reader already knows what the role involves. Add NEW information about the candidate's experience that connects to it. One sentence each.`,
    timing: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "The timing makes sense because [career arc reason — why NOW, not just why generally]."
Pattern B: "At this point, I'm looking for a role where [specific desire that maps to this opportunity]."
Pattern C: "That's a big part of why this feels like a logical next step — [forward-looking reason tied to their arc]."
HARD RULE: This step is ONLY about timing and direction. Do NOT repeat the observation or fit content. Explain why NOW — what changed in their career, what they want next, why this moment is right. One sentence each.`,
  },
  handling_uncertainty: {
    recovery: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "That's a good question — let me think about that for a second."
Pattern B: "Good question. If I had to pick one area, it would be this:"
Pattern C: "Honestly, that's something I've been thinking about — here's where I've landed."
These are RECOVERY OPENERS — short, calm, buys time without sounding panicked. No apologies. No filler. One sentence each.`,
    answer: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "One area I'm still developing is [specific skill/behavior — e.g. 'getting faster at making decisions when the path isn't fully clear']."
Pattern B: "Something I'm actively working on is [specific behavior]."
Pattern C: "The thing I'd point to is [specific area] — [brief elaboration]."
Choose development areas that are REAL but not alarming — things like decision speed, delegation, speaking up earlier, prioritization under pressure. Pull from what's plausible given the candidate's resume level. One sentence each.`,
    reason: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "I've improved a lot, but I still push myself to [specific improvement behavior]."
Pattern B: "I've learned that [insight about why this matters] — so I work on [what they do about it]."
Pattern C: "Being [positive trait] is useful, but [honest downside] if I don't [corrective behavior]."
Each must explain WHY this is still something they work on. Must sound self-aware, not scripted. One sentence each.`,
    example: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "For example, in one role I [brief situation], and I learned that [lesson]."
Pattern B: "For example, when [brief scenario], I learned that [specific takeaway]."
Pattern C: "For instance, [brief past moment] taught me that [insight]."
Each starts with "For example" or "For instance" and gives a SHORT, real-sounding example. Pull from resume roles if possible. Keep to 1-2 sentences — this is a supporting detail, not a full story.`,
  },
  pace_delivery: {
    opener: 'Take the candidate\'s original answer and draft 3 alternative OPENERS — each leads with the main point in 1 confident sentence. No warmup words. Must sound like a person talking, not writing.',
    main_point: 'Given the chosen opener, draft 3 MAIN BODY versions — 2-3 SHORT sentences each — restating the candidate\'s same content with cleaner structure and zero filler. Conversational, with contractions. Do not invent facts.',
    landing: 'Draft 3 short LANDINGS — 1 sentence each — that close the answer cleanly. Must sound like a natural spoken ending: "That\'s the kind of...", "And that\'s why...", "So yeah, that\'s what I want to keep doing."',
  },
  preparation_curiosity: {
    what_you_know: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "I saw that [specific detail from JD or company]."
Pattern B: "I noticed [specific detail] — [brief reason it caught your attention]."
Pattern C: "One thing that stood out was [specific detail from the JD]."
Each MUST cite a REAL, specific detail from the JD or company website — not generic praise. One sentence each.`,
    what_stood_out: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "What caught my attention was [why that detail matters, connected to candidate's experience]."
Pattern B: "The reason that stuck with me is [connection to their background]."
Pattern C: "That hit home because [tie to something real in the candidate's resume]."
Each must flow after the previous piece and connect the company detail to the candidate's own experience. One sentence each.`,
    your_question: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "So I'm curious — [specific question about the role/team]?"
Pattern B: "That makes me want to ask — [specific question]?"
Pattern C: "I'd love to know — [specific question tied to JD context]?"
Each question must be specific enough that the interviewer can't answer with a generic reply. Reference the company/role context.`,
  },
  role_depth: {
    context: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "[At/During] [company], [1-sentence scene-setter with the specific project/problem and constraints]."
Pattern B: "So this was at [company] — [what we were working on and why it mattered]."
Pattern C: "When I was [role] at [company], [specific situation and the real constraint]."
Pull from the candidate's ORIGINAL ANSWER first for the story. Fall back to resume if the original answer is too vague. One sentence each.`,
    method: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "So I went with [specific approach] — [brief why]."
Pattern B: "My approach was [method], because [reasoning]."
Pattern C: "What I did was [specific method/tool/framework] — [brief justification]."
Name specific tools, frameworks, or thinking from the candidate's experience. One sentence each.`,
    tradeoff: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "The main tradeoff was [option A] vs. [option B] — [why they chose what they chose]."
Pattern B: "I had to weigh [consideration] against [consideration] — [what they decided]."
Pattern C: "The hard part was choosing between [option A] and [option B], but [why they went the way they did]."
Ground in the specific situation. One sentence each.`,
    outcome: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "And it worked — [specific outcome with numbers if available]."
Pattern B: "That got us [concrete result]. [Brief lasting impact]."
Pattern C: "By the end, [what changed because of their approach]."
Pull outcomes from the original answer or resume. Never invent metrics. One sentence each.`,
  },
  problem_solving: {
    clarify: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "First thing I needed to figure out was [specific question or assumption to test]."
Pattern B: "I started by asking [specific question] — because [why it mattered]."
Pattern C: "Before doing anything, I wanted to understand [specific constraint or unknown]."
Name a real question or assumption the candidate checked first. One sentence each.`,
    approach: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "From there, I looked at [option A] vs. [option B] — and went with [choice] because [reason]."
Pattern B: "So I [approach] — mainly because [reasoning]."
Pattern C: "My thinking was [plan], because [justification]."
Describe the plan and reasoning. Keep it conversational. One sentence each.`,
    execute: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "So I [concrete step 1], then [step 2], and [step 3 if applicable]."
Pattern B: "What I actually did was [specific action] — [who was involved if relevant]."
Pattern C: "I ended up [concrete steps taken]."
Concrete steps, not theory. Pull from resume or original answer. One sentence each.`,
    reflect: `Generate 3 suggestions that each follow one of these EXACT structural patterns:
Pattern A: "Looking back, [what worked or what they'd change]."
Pattern B: "If I did it again, I'd probably [specific adjustment] — [why]."
Pattern C: "The biggest lesson was [honest takeaway]."
Must sound like genuine personal reflection — honest, not scripted. One sentence each.`,
  },
}

const WORKSHOP_CONTEXT: Record<WorkshopType, string> = {
  star_proof: 'Behavioral STAR answer (Situation → Task → Action → Result). The candidate needs a believable, specific example with clear ownership and a real outcome.',
  professional_story: '"Tell me about yourself" using Present → Past → Future. The candidate needs a clear professional arc, not a list of facts.',
  career_alignment: '"Why this role" using Observation → Fit → Timing. The candidate needs to show they researched the role and that their background matches.',
  handling_uncertainty: 'Recovering from an unexpected question using Recovery → Answer → Reason → Example. The candidate needs to avoid rambling.',
  pace_delivery: 'Rebuilding their existing answer with cleaner pacing — Opener → Main Point → Landing. Same content, sharper delivery, zero filler.',
  preparation_curiosity: 'Showing genuine company curiosity using What You Know → What Stood Out → Your Question. The candidate needs to sound informed, not generic.',
  role_depth: 'Demonstrating domain depth using Context → Method → Tradeoff → Outcome. The candidate needs to show they can think inside the role — naming real tools, weighing real tradeoffs, and talking like someone who does the work, not someone who read about it.',
  problem_solving: 'Walking through problem-solving using Clarify → Approach → Execute → Reflect. The candidate needs to show their reasoning process, not just the answer — clarifying assumptions, choosing deliberately, and reflecting honestly.',
}

async function fetchUserContext(sessionId?: string, userId?: string) {
  let jobDescription = ''
  let resumeText = ''
  let companyWebsite = ''

  try {
    if (sessionId) {
      const { data: sessionData } = await supabaseAdmin
        .from('interview_sessions')
        .select('user_interview_data_id, user_id')
        .eq('id', sessionId)
        .single()

      if (sessionData?.user_interview_data_id) {
        const { data: interviewData } = await supabaseAdmin
          .from('user_interview_data')
          .select('job_description_text, resume_text, company_website')
          .eq('id', sessionData.user_interview_data_id)
          .single()
        if (interviewData?.job_description_text) jobDescription = interviewData.job_description_text
        if (interviewData?.resume_text) resumeText = interviewData.resume_text
        if (interviewData?.company_website) companyWebsite = interviewData.company_website
      }

      if (!resumeText && sessionData?.user_id) {
        const { data: resumeRow } = await supabaseAdmin
          .from('user_resumes')
          .select('resume_text')
          .eq('user_id', sessionData.user_id)
          .eq('is_active', true)
          .limit(1)
          .single()
        if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
      }
    }

    if (!resumeText && userId) {
      const { data: resumeRow } = await supabaseAdmin
        .from('user_resumes')
        .select('resume_text')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single()
      if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
    }
  } catch {
    // best-effort context
  }

  return {
    jobDescription: (jobDescription || '').slice(0, 4000),
    resumeText: (resumeText || '').slice(0, 4000),
    companyWebsite,
  }
}

function safeParseJson(raw: string): any {
  if (!raw) return null
  const match = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || raw.match(/(\{[\s\S]*\})/)
  const body = match ? match[1] : raw
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, 'guided-workshop', { limit: 30, windowMs: 60 * 60 * 1000 })
  if (rateLimited) return rateLimited
  const oversized = rejectOversizedRequest(request, 96 * 1024)
  if (oversized) return oversized

  const body = await request.json().catch(() => ({}))
  const session = body.demoMode
    ? null
    : (await createRouteHandlerClient({ cookies }).auth.getSession()).data.session
  const workshopType = body.workshopType as WorkshopType
  const stepKey = String(body.stepKey || '')
  const sessionId = body.sessionId ? String(body.sessionId) : undefined
  if (!sessionId && !session?.user?.id) {
    return NextResponse.json({ error: 'Interview session required' }, { status: 400 })
  }
  const originalQuestion = String(body.originalQuestion || '').slice(0, 2000)
  const originalAnswer = String(body.originalAnswer || '').slice(0, 4000)
  const previousChoices = (body.previousChoices && typeof body.previousChoices === 'object') ? body.previousChoices : {}
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t || '').trim()).filter(Boolean).slice(0, 8)
    : []
  const storyContext = (body.storyContext && typeof body.storyContext === 'object') ? body.storyContext : null

  if (!workshopType || !STEP_GUIDANCE[workshopType] || !STEP_GUIDANCE[workshopType][stepKey]) {
    return NextResponse.json({ error: 'Invalid workshopType or stepKey' }, { status: 400 })
  }

  const context = body.demoMode
    ? {
        jobDescription: String(body.demoContext?.jobDescriptionText || '').slice(0, 4000),
        resumeText: String(body.demoContext?.resumeText || '').slice(0, 4000),
        companyWebsite: String(body.demoContext?.companyWebsite || ''),
      }
    : await fetchUserContext(sessionId, session?.user?.id)
  const { jobDescription, resumeText, companyWebsite } = context
  if (!resumeText && !jobDescription) {
    return NextResponse.json({ error: 'Interview context not found' }, { status: 404 })
  }

  const stepGuidance = STEP_GUIDANCE[workshopType][stepKey]
  const workshopContext = WORKSHOP_CONTEXT[workshopType]
  const tagHint = tags.length
    ? `The candidate self-described their voice/approach for this answer as: ${tags.join(', ')}. Let those subtly color tone and word choice — but never override what's actually in the resume.`
    : ''

  const isBehavioral = ['star_proof', 'role_depth', 'problem_solving', 'handling_uncertainty'].includes(workshopType)
  const hasStory = !!storyContext && Object.keys(storyContext).length > 0
  const behavioralRule = isBehavioral
    ? `\n- CRITICAL: This is a behavioral answer workshop.${hasStory ? ' The candidate provided specific story details in the CANDIDATE\'S STORY section — that is your PRIMARY SOURCE. Use the company, problem, actions, and result they described. Do NOT substitute a different story.' : ' The candidate already gave an answer — your job is to RESTRUCTURE it with better structure, NOT to invent a new answer.'} The original answer and resume are supporting context. The job description tells you what the INTERVIEWER CARES ABOUT, but the content must come from the candidate\'s real experience. Never generate content about the target role as if the candidate already works there.`
    : ''

  const system = `You are a sharp, no-nonsense interview coach helping a candidate build one part of one answer.

Workshop: ${workshopContext}
Current step: ${stepKey}
Step task: ${stepGuidance}
${tagHint}

Hard rules:${behavioralRule}
- FOLLOW THE STRUCTURAL PATTERNS EXACTLY. Each step has specific sentence starters and patterns (e.g. "Right now at [company]...", "I was responsible for...", "In the end,..."). Your suggestions MUST use those patterns. The whole point is teaching a framework — the output must match the framework.
- SPOKEN LANGUAGE ONLY. The candidate will say this out loud in an interview. Write the way a confident, prepared person actually talks — short sentences, contractions, natural pauses. If it sounds like a cover letter or an essay, rewrite it.
- Use contractions ("I'm", "that's", "didn't", "I've") — nobody says "I have been" or "that is" in conversation.
- Keep sentences SHORT. Max 15-20 words per sentence. Break long compound sentences into two.
- Pull specific details from the resume, original answer, and job description provided.
- ORIGINAL ANSWER IS THE PRIMARY SOURCE for behavioral workshops (STAR, role depth, problem solving). The candidate already told a story — your job is to restructure it into the framework, NOT invent a new story. If the original answer mentions a specific company, project, or situation, USE THAT.
- NEVER invent companies, titles, metrics, dates, clients, or accomplishments not visible in the context.
- If the resume is sparse, give options that the candidate can lightly personalize — use bracketed placeholders like [team size] or [project name] only when truly needed.
- Each suggestion is 1-3 sentences max. Distinct in angle, not slight variations.
- Do not use corporate cliches: "leveraged", "spearheaded", "passionate about", "team player", "navigate", "strategic alignment".
- Do not start suggestions with the same word as another suggestion in the set.
- Return ONLY valid JSON.`

  const storyBlock = storyContext
    ? `\n\nCANDIDATE'S STORY (from gather phase — THIS IS THE PRIMARY SOURCE, use it over the original answer):\n${Object.entries(storyContext).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : ''

  const userMessage = JSON.stringify({
    task: 'Generate 3 strong, distinct suggestions for this build step, grounded in the candidate\'s actual resume and the job they\'re applying for.',
    original_question: originalQuestion || '(not provided)',
    original_flagged_answer: originalAnswer || '(not provided)',
    candidate_story_context: storyContext || '(no gather data — use original answer and resume)',
    previous_choices: previousChoices,
    candidate_voice_tags: tags,
    candidate_resume: resumeText || '(resume not available — use generic patterns)',
    job_description: jobDescription || '(JD not available — use general best practices)',
    company_website: companyWebsite || '',
    output_shape: {
      suggestions: ['option 1 text', 'option 2 text', 'option 3 text'],
      hint: 'One sentence telling the candidate what to look for when picking, or what makes one choice stronger than another.',
    },
  }) + storyBlock

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      temperature: 0.4,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ suggestions: [], hint: '' })
    }

    const parsed = safeParseJson(content.text) || {}
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s: unknown) => String(s || '').trim()).filter(Boolean).slice(0, 3)
      : []
    const hint = typeof parsed.hint === 'string' ? parsed.hint.trim() : ''

    return NextResponse.json({ suggestions, hint })
  } catch (error: any) {
    console.error('guided-workshop suggest failed:', error?.message || error)
    return NextResponse.json({ suggestions: [], hint: '', error: 'suggest_failed' }, { status: 200 })
  }
}
