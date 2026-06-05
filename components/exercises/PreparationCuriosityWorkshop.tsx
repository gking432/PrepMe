'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Search, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface PreparationCuriosityWorkshopProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type WorkshopStep = 'research' | 'question_type' | 'build_question' | 'build_second' | 'preview' | 'done'

interface ResearchTheme {
  id: string
  title: string
  description: string
  questionStarters: string[]
  keywords: string[]
}

const FALLBACK_THEMES: ResearchTheme[] = [
  {
    id: 'team_structure',
    title: 'Team structure and dynamics',
    description: 'How the team is organized, who you would work with, and how collaboration works.',
    questionStarters: ['How is the team structured around', 'What does collaboration look like between', 'Who would I be working most closely with on'],
    keywords: ['team', 'collaborate', 'cross-functional', 'report', 'structure'],
  },
  {
    id: 'role_priorities',
    title: 'Near-term role priorities',
    description: 'What the first 90 days look like and what problems need solving soon.',
    questionStarters: ['What would success look like in the first 90 days for', 'What are the most pressing challenges for someone in this', 'What is the highest priority project for'],
    keywords: ['priority', 'challenge', 'roadmap', 'initiative', 'project', 'goal'],
  },
  {
    id: 'growth_path',
    title: 'Growth and development path',
    description: 'How people in similar roles have grown, what skills are valued most.',
    questionStarters: ['How have people in similar roles grown into', 'What does professional development look like for', 'What skills tend to matter most as someone progresses in'],
    keywords: ['growth', 'career', 'development', 'progression', 'promotion', 'mentorship'],
  },
  {
    id: 'company_direction',
    title: 'Company direction and culture',
    description: 'Where the company is headed and what it is like to work there day to day.',
    questionStarters: ['What is the biggest shift happening at', 'How would you describe the culture around', 'What excites you most about where the company is headed in'],
    keywords: ['culture', 'mission', 'direction', 'values', 'remote', 'hybrid'],
  },
  {
    id: 'success_metrics',
    title: 'How success is measured',
    description: 'What metrics or outcomes define strong performance in this role.',
    questionStarters: ['How is performance typically measured for', 'What does strong execution look like in', 'What are the key outcomes you would expect from'],
    keywords: ['metric', 'KPI', 'measure', 'evaluate', 'outcome', 'success'],
  },
]

const QUESTION_TYPE_OPTIONS = [
  { id: 'role', label: 'About the role itself', description: 'Day-to-day work, expectations, and priorities' },
  { id: 'team', label: 'About the team', description: 'Structure, collaboration, and who you would work with' },
  { id: 'growth', label: 'About growth', description: 'How people develop, what skills matter, and where the role leads' },
  { id: 'company', label: 'About the company', description: 'Direction, culture, and what sets the company apart' },
]

function stripHeaders(text: string) {
  return text
    .replace(/^(Company|Position|Job Description|Requirements|Qualifications|Responsibilities|About|Benefits):?\s*/gim, '')
    .replace(/^[-–—•*]\s*/gm, '')
    .trim()
}

function buildThemesFromJobDescription(jdText: string): ResearchTheme[] {
  if (!jdText || jdText.trim().length < 40) return FALLBACK_THEMES

  const cleaned = stripHeaders(jdText)
  const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(l => l.length > 15 && l.length < 300)

  const scored = FALLBACK_THEMES.map(theme => {
    const score = lines.reduce((total, line) => {
      const lower = line.toLowerCase()
      const hits = theme.keywords.filter(kw => lower.includes(kw)).length
      return total + hits
    }, 0)
    return { theme, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.theme)
}

export default function PreparationCuriosityWorkshop({
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: PreparationCuriosityWorkshopProps) {
  const [step, setStep] = useState<WorkshopStep>('research')
  const [jobDescription, setJobDescription] = useState('')
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null)
  const [builtQuestion, setBuiltQuestion] = useState('')
  const [secondQuestion, setSecondQuestion] = useState('')
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()
    const fetchJd = async () => {
      const { data: session } = await supabase
        .from('interview_sessions')
        .select('user_interview_data_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (!session?.user_interview_data_id) return
      const { data: interviewData } = await supabase
        .from('user_interview_data')
        .select('job_description_text')
        .eq('id', session.user_interview_data_id)
        .maybeSingle()
      if (interviewData?.job_description_text) {
        setJobDescription(interviewData.job_description_text)
      }
    }
    fetchJd().catch(() => {})
  }, [sessionId])

  const themes = useMemo(() => buildThemesFromJobDescription(jobDescription), [jobDescription])
  const selectedTheme = themes.find(t => t.id === selectedThemeId) || themes[0]

  const questionLabel = originalQuestion || 'Your flagged interview question'
  const answerSummary = originalAnswer || ''

  function handleNext() {
    if (step === 'research') { setStep('question_type'); return }
    if (step === 'question_type') { setStep('build_question'); return }
    if (step === 'build_question') { setStep('build_second'); return }
    if (step === 'build_second') { setStep('preview'); return }
    if (step === 'preview') { setStep('done'); return }
    onComplete()
  }

  function handleBack() {
    if (step === 'question_type') setStep('research')
    else if (step === 'build_question') setStep('question_type')
    else if (step === 'build_second') setStep('build_question')
    else if (step === 'preview') setStep('build_second')
    else if (step === 'done') setStep('preview')
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Preparation &amp; Curiosity Workshop
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl">
            Show you did the homework — and that your interest is real
          </h3>
          {originalQuestion && (
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {questionLabel}
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The interviewer is checking whether you researched the role and whether your curiosity is genuine. Generic praise fails this check. Specific, relevant questions pass it.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {step === 'research' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pick a research theme</p>
              <p className="text-sm text-slate-600 mb-3">
                Which area do you want your question to focus on? {jobDescription ? 'These are ranked by relevance to the job description.' : ''}
              </p>
            </div>
            <div className="grid gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedThemeId === theme.id
                      ? 'border-accent-300 bg-accent-50 ring-2 ring-accent-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{theme.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{theme.description}</p>
                </button>
              ))}
            </div>
            {answerSummary && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">What the interviewer heard</p>
                <p className="text-sm leading-6 text-slate-700 italic">&ldquo;{answerSummary}&rdquo;</p>
              </div>
            )}
          </div>
        )}

        {step === 'question_type' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">What kind of question?</p>
              <p className="text-sm text-slate-600 mb-3">Strong questions show you thought about what matters, not that you memorized the website.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUESTION_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedQuestionType(option.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedQuestionType === option.id
                      ? 'border-accent-300 bg-accent-50 ring-2 ring-accent-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{option.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'build_question' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Build your first question</p>
              <p className="text-sm text-slate-600 mb-3">Pick a starter or write your own. The best questions are specific enough that the interviewer can&apos;t answer with a generic reply.</p>
            </div>
            {selectedTheme && (
              <div className="grid gap-2">
                {selectedTheme.questionStarters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => {
                      setSelectedStarter(starter)
                      setBuiltQuestion(starter + '...')
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedStarter === starter
                        ? 'border-accent-300 bg-accent-50 font-bold'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    &ldquo;{starter}...&rdquo;
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={builtQuestion}
              onChange={(e) => setBuiltQuestion(e.target.value)}
              placeholder="Type or refine your question here..."
              className="min-h-[80px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
            />
          </div>
        )}

        {step === 'build_second' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Build a second question</p>
              <p className="text-sm text-slate-600 mb-3">Having two strong questions signals genuine interest. Pick a different angle this time.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Your first question</p>
              <p className="text-sm text-slate-800">{builtQuestion || '(none yet)'}</p>
            </div>
            <textarea
              value={secondQuestion}
              onChange={(e) => setSecondQuestion(e.target.value)}
              placeholder="Write a second question from a different angle..."
              className="min-h-[80px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
            />
            <div className="rounded-xl border border-accent-200 bg-accent-50/60 px-4 py-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-accent-600" />
                <p className="text-xs leading-5 text-slate-700">
                  Good second-question angles: day-to-day work, team dynamics, how success is measured, what challenges the team faces, or what they wish new hires knew earlier.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Your prepared questions</p>
              <p className="text-sm text-slate-600 mb-3">These should feel natural to say out loud. Practice the delivery, not just the words.</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Question 1</p>
                <p className="text-sm font-bold text-slate-900">{builtQuestion || '(empty)'}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Question 2</p>
                <p className="text-sm font-bold text-slate-900">{secondQuestion || '(empty)'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold text-slate-700">Before the real interview, replace the starters with your own words and add one detail that shows you researched the company.</p>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center text-center py-8 animate-slide-up">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Search className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Questions ready</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
              You have two specific, relevant questions that show real interest. Practice saying them naturally — the delivery matters as much as the content.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
        {step !== 'research' ? (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
          >
            Back
          </button>
        ) : <div />}
        <button
          type="button"
          onClick={handleNext}
          disabled={step === 'build_question' && !builtQuestion.trim()}
          className="btn-coach-primary flex items-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {step === 'done' ? 'Continue' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
