'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import FileUpload from '@/components/FileUpload'
import Link from 'next/link'
import Header from '@/components/Header'
import { CheckCircle2, Lock, Crown, ChevronDown } from 'lucide-react'
import PurchaseFlow from '@/components/PurchaseFlow'
import Preppi from '@/components/Preppi'
import MobileNav from '@/components/MobileNav'

type InterviewStage = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'
type OnboardStep = 'welcome' | 'job' | 'resume' | 'stage'

const STAGE_CONFIG: Record<InterviewStage, {
  name: string; subtitle: string; emoji: string; price?: string
  bg: string; activeBorder: string
}> = {
  hr_screen:      { name: 'HR Screen',       subtitle: 'Phone screening with a recruiter',   emoji: '📱', bg: 'bg-[#58CC02]', activeBorder: 'border-[#3b9400]' },
  hiring_manager: { name: 'Hiring Manager',  subtitle: 'Deep-dive with your future boss',    emoji: '💼', price: '$4.99', bg: 'bg-primary-600', activeBorder: 'border-primary-800' },
  culture_fit:    { name: 'Culture Fit',     subtitle: 'Team & values alignment',            emoji: '🤝', price: '$3.99', bg: 'bg-accent-600', activeBorder: 'border-accent-800' },
  final:          { name: 'Final Round',     subtitle: 'Executive-level evaluation',          emoji: '🏆', price: '$5.99', bg: 'bg-slate-800', activeBorder: 'border-slate-950' },
}

const PAID_STAGES: InterviewStage[] = ['hiring_manager', 'culture_fit', 'final']

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onboardStep, setOnboardStep] = useState<OnboardStep>('welcome')
  const [selectedStage, setSelectedStage] = useState<InterviewStage>('hr_screen')
  const [interviewData, setInterviewData] = useState({
    resumeFile: null as { name: string; text: string } | null,
    resumeText: '',
    jobDescriptionText: '',
    jobDescriptionUrl: '',
    companyName: '',
    positionTitle: '',
    companyWebsite: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [stageAccess, setStageAccess] = useState<Record<string, any>>({})
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false)
  const [purchaseHighlightStage, setPurchaseHighlightStage] = useState<string | undefined>(undefined)
  const [fetchingJobDescription, setFetchingJobDescription] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [createAccountChecked, setCreateAccountChecked] = useState(true)
  const [extractedUserInfo, setExtractedUserInfo] = useState<{
    email: string | null; name: string | null; phone: string | null
  }>({ email: null, name: null, phone: null })
  const [savedResumes, setSavedResumes] = useState<{ id: string; label: string; resume_text: string }[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadInterviewData()
  }, [])

  useEffect(() => {
    const loadResumes = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('user_resumes').select('id, label, resume_text')
        .eq('user_id', session.user.id).order('created_at', { ascending: false })
      if (data) setSavedResumes(data)
    }
    loadResumes()
  }, [user?.id])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      try {
        const paymentRes = await fetch('/api/payments/status')
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json()
          setStageAccess(paymentData.stageAccess || {})
        }
      } catch (err) {
        console.error('Error loading payment status:', err)
      }
    }
    setLoading(false)
  }

  const loadInterviewData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: dataArray, error } = await supabase
      .from('user_interview_data').select('*')
      .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1)

    if (error || !dataArray || dataArray.length === 0) return

    const data = dataArray[0]
    const parsed = parseJobDescriptionText(data.job_description_text || '')

    setInterviewData({
      resumeFile: data.resume_text ? { name: 'Resume', text: data.resume_text } : null,
      resumeText: data.resume_text || '',
      jobDescriptionText: parsed.jobDescriptionText,
      jobDescriptionUrl: '',
      companyName: parsed.companyName,
      positionTitle: parsed.positionTitle,
      companyWebsite: data.company_website || '',
      notes: data.notes || '',
    })

    // Skip to the right step for returning users
    if (data.resume_text && data.job_description_text) {
      setOnboardStep('stage')
    } else if (data.resume_text) {
      setOnboardStep('job')
    }
  }

  const parseJobDescriptionText = (text: string) => {
    const companyMatch = text.match(/^Company:\s*(.+)$/m)
    const positionMatch = text.match(/^Position:\s*(.+)$/m)
    let companyName = '', positionTitle = '', jobDescriptionText = text
    if (companyMatch || positionMatch) {
      if (companyMatch) companyName = companyMatch[1].trim()
      if (positionMatch) positionTitle = positionMatch[1].trim()
      const headerEnd = text.indexOf('---')
      if (headerEnd > -1) jobDescriptionText = text.substring(headerEnd + 3).trim()
    }
    return { companyName, positionTitle, jobDescriptionText }
  }

  const formatJobDescriptionText = (text: string) => {
    const parts: string[] = []
    if (interviewData.companyName) parts.push(`Company: ${interviewData.companyName}`)
    if (interviewData.positionTitle) parts.push(`Position: ${interviewData.positionTitle}`)
    if (parts.length > 0) { parts.push('', '---', '') }
    parts.push(text)
    return parts.join('\n')
  }

  const extractUserInfoFromResume = (text: string) => {
    if (!text?.trim()) { setExtractedUserInfo({ email: null, name: null, phone: null }); return }
    const email = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)?.[0] || null
    const phone = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g)?.[0]?.replace(/\s+/g, '-') || null
    let name = null
    for (const line of text.split('\n').slice(0, 10)) {
      const t = line.trim()
      if (t && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(t) && t.length < 50 && !t.includes('@') && !/\d{3}/.test(t)) {
        name = t; break
      }
    }
    setExtractedUserInfo({ email, name, phone })
  }

  const createAccountFromResume = async () => {
    if (!createAccountChecked || !extractedUserInfo.email) return
    try {
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!'
      const { data, error } = await supabase.auth.signUp({
        email: extractedUserInfo.email,
        password: tempPassword,
        options: { data: { full_name: extractedUserInfo.name || '', phone: extractedUserInfo.phone || '' }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        if (error.message.includes('already registered')) {
          await supabase.auth.signInWithOtp({ email: extractedUserInfo.email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        }
        return
      }
      if (data.user) {
        await supabase.from('user_profiles').upsert({ id: data.user.id, email: extractedUserInfo.email, full_name: extractedUserInfo.name || '' })
        await supabase.auth.resetPasswordForEmail(extractedUserInfo.email, { redirectTo: `${window.location.origin}/auth/reset-password` })
        router.refresh()
      }
    } catch (error) { console.error('Error creating account from resume:', error) }
  }

  const getDomainName = (url: string): string => {
    try {
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '')
      const parts = hostname.split('.')
      return parts.length >= 2 ? parts[parts.length - 2] + '.' + parts[parts.length - 1] : hostname
    } catch { return 'this website' }
  }

  const handleFetchJobDescription = async () => {
    if (!interviewData.jobDescriptionUrl?.trim()) { setFetchError('Please enter a URL'); return }
    setFetchError(null)
    setFetchingJobDescription(true)
    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: interviewData.jobDescriptionUrl }),
      })
      const data = await response.json()
      if (data.success && data.content?.trim()) {
        setInterviewData(prev => ({ ...prev, jobDescriptionText: formatJobDescriptionText(data.content) }))
      } else {
        const errorMsg = data.error || 'Failed to extract job description'
        const domain = getDomainName(interviewData.jobDescriptionUrl)
        if (errorMsg.includes('403') || errorMsg.includes('Access denied')) {
          setFetchError(`${domain} blocks automated access. Paste the job description manually.`)
        } else if (errorMsg.includes('404')) {
          setFetchError(`URL not found. Check the link or paste manually.`)
        } else {
          setFetchError(`Couldn't fetch. Paste the job description below.`)
        }
      }
    } catch { setFetchError('Error fetching. Paste manually instead.') }
    finally { setFetchingJobDescription(false) }
  }

  const isStageLockedFn = (stage: InterviewStage): boolean => {
    if (stage === 'hr_screen') return false
    return !stageAccess?.[stage]?.hasAccess
  }

  const hasResume = interviewData.resumeText.length > 0 || !!interviewData.resumeFile
  const hasJobDesc = interviewData.jobDescriptionText.length > 0
  const canStartInterview = () => hasResume && hasJobDesc

  const getPreppiMessage = () => {
    if (onboardStep === 'stage') {
      if (!hasJobDesc) return "Got your resume! Add the job posting so I can tailor your prep."
      const name = extractedUserInfo.name?.split(' ')[0]
      return name ? `${name}, all set! Pick your challenge.` : "All set! Pick your challenge."
    }
    if (onboardStep === 'job') return "What job are you interviewing for?"
    if (onboardStep === 'resume') return "Now let me get to know you!"
    return "Let's get you ready."
  }

  const handleStartInterview = async (stage: InterviewStage = selectedStage) => {
    if (!canStartInterview()) return
    if (isStageLockedFn(stage)) { setPurchaseHighlightStage(stage); setShowPurchaseFlow(true); return }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session && createAccountChecked && extractedUserInfo.email) {
      await createAccountFromResume()
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { data: { session: newSession } } = await supabase.auth.getSession()
      if (!newSession) { alert('Account creation in progress. Please check your email.'); return }
    }

    try {
      let formattedJobDescriptionText = interviewData.jobDescriptionText
      if ((interviewData.companyName || interviewData.positionTitle) &&
          !interviewData.jobDescriptionText.includes('Company:') && !interviewData.jobDescriptionText.includes('Position:')) {
        formattedJobDescriptionText = formatJobDescriptionText(interviewData.jobDescriptionText)
      }

      if (!session) {
        localStorage.setItem('temp_interview_data', JSON.stringify({
          resumeText: interviewData.resumeText, jobDescriptionText: formattedJobDescriptionText,
          companyName: interviewData.companyName, positionTitle: interviewData.positionTitle,
          companyWebsite: interviewData.companyWebsite, notes: interviewData.notes,
          createAccountChecked, extractedUserInfo,
        }))
      } else {
        setSaving(true)
        await supabase.from('user_interview_data').upsert({
          user_id: session.user.id, resume_text: interviewData.resumeText,
          resume_file_url: null, job_description_text: formattedJobDescriptionText,
          job_description_file_url: null, company_website: interviewData.companyWebsite,
          notes: interviewData.notes, updated_at: new Date().toISOString(),
        }).select()
      }
      router.push(`/interview?stage=${stage}`)
    } catch (error: any) {
      console.error('Error starting interview:', error)
      alert('Error starting interview. Please try again.')
    } finally { setSaving(false) }
  }

  // ─── Job posting panel (reused in both job step and stage step) ──────────────
  const JobPostingPanel = ({ accent = false }: { accent?: boolean }) => (
    <div className={`overflow-hidden rounded-[1.6rem] border ${accent ? 'border-amber-200/80 bg-amber-50/90 shadow-[0_12px_28px_rgba(245,158,11,0.08)]' : 'border-slate-200/80 bg-white/90 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'}`}>
      <details className="group">
        <summary className={`flex cursor-pointer list-none items-center justify-between px-4 py-4 ${accent ? 'text-amber-800' : 'text-primary-700'}`}>
          <span className="text-sm font-semibold">
            {hasJobDesc ? '✓ Job posting added' : 'Add job posting (recommended)'}
          </span>
          <ChevronDown className={`w-4 h-4 group-open:rotate-180 transition-transform ${accent ? 'text-amber-500' : 'text-primary-400'}`} />
        </summary>
        <div className={`space-y-2 border-t px-4 pb-4 ${accent ? 'border-amber-100' : 'border-slate-100'}`}>
          <div className="flex gap-2 mt-3">
            <input
              type="url"
              value={interviewData.jobDescriptionUrl}
              onChange={(e) => { setInterviewData(prev => ({ ...prev, jobDescriptionUrl: e.target.value })); setFetchError(null) }}
              onKeyPress={(e) => { if (e.key === 'Enter') handleFetchJobDescription() }}
              className={`field-shell flex-1 text-sm ${accent ? 'border-amber-200 focus:border-amber-400 focus:shadow-[0_0_0_4px_rgba(245,158,11,0.12)]' : ''}`}
              placeholder="Paste job posting URL..."
            />
            <button
              onClick={handleFetchJobDescription}
              disabled={!interviewData.jobDescriptionUrl || fetchingJobDescription}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${accent ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'}`}
            >
              {fetchingJobDescription ? '…' : 'Fetch'}
            </button>
          </div>
          {fetchError && <p className="text-xs text-red-500 px-1">{fetchError}</p>}
          {hasJobDesc
            ? <p className="text-xs text-emerald-600 flex items-center gap-1 px-1"><CheckCircle2 className="w-3.5 h-3.5" />Job description loaded</p>
            : <textarea
                value={interviewData.jobDescriptionText}
                onChange={(e) => setInterviewData(prev => ({ ...prev, jobDescriptionText: e.target.value }))}
                rows={4}
                className={`field-shell w-full resize-none text-sm ${accent ? 'border-amber-200 focus:border-amber-400 focus:shadow-[0_0_0_4px_rgba(245,158,11,0.12)]' : ''}`}
                placeholder="Or paste the job description…"
              />
          }
        </div>
      </details>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-5">
          <Preppi size="md" animate />
          <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header />

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-xl px-5 pb-36 pt-6">

        {/* ── WELCOME ─────────────────────────────────────────────────── */}
        {onboardStep === 'welcome' && (
          <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center gap-8 text-center animate-slide-up">
            <div className="relative">
              <Preppi size="xl" animate />
            </div>
            <div>
              <div className="eyebrow eyebrow-coach mx-auto mb-4 w-fit">Interview prep, round by round</div>
              <h1 className="mb-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                Ace your next interview.
              </h1>
              <p className="mx-auto max-w-sm text-base leading-relaxed text-slate-500">
                I&apos;m Preppi. Give me the role, show me your background, and I&apos;ll coach you through the process with pressure where it counts.
              </p>
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={() => setOnboardStep('job')}
                className="btn-coach-primary w-full py-4 text-xl"
              >
                LET'S GO
              </button>
              {!user && (
                <Link href="/auth" className="block text-center text-sm text-gray-400 hover:text-gray-600 py-2">
                  Already have an account? <span className="font-semibold text-accent-600">Sign in</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── JOB STEP ─────────────────────────────────────────────────── */}
        {onboardStep === 'job' && (
          <div className="flex flex-col gap-6 animate-slide-up">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 pt-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            </div>

            <Preppi message="What job are you interviewing for?" size="md" animate className="justify-center" />
            <p className="hidden md:block text-center text-base font-semibold text-gray-700">What job are you interviewing for?</p>

            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                value={interviewData.companyName}
                onChange={(e) => setInterviewData(prev => ({ ...prev, companyName: e.target.value }))}
                className="field-shell"
                placeholder="Company"
              />
              <input
                type="text"
                value={interviewData.positionTitle}
                onChange={(e) => setInterviewData(prev => ({ ...prev, positionTitle: e.target.value }))}
                className="field-shell"
                placeholder="Role / position title"
              />
            </div>

            <JobPostingPanel />
          </div>
        )}

        {/* ── RESUME STEP ──────────────────────────────────────────────── */}
        {onboardStep === 'resume' && (
          <div className="flex flex-col gap-6 animate-slide-up">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 pt-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
            </div>

            <Preppi message="Now let me get to know you!" size="md" animate className="justify-center" />
            <p className="hidden md:block text-center text-base font-semibold text-gray-700">Add your resume</p>

            <div className="space-y-3">
              {user && savedResumes.length > 0 && (
                <select
                  value={selectedResumeId || ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setSelectedResumeId(id)
                    if (id) {
                      const resume = savedResumes.find(r => r.id === id)
                      if (resume) {
                        setInterviewData(prev => ({ ...prev, resumeFile: { name: resume.label, text: resume.resume_text }, resumeText: resume.resume_text }))
                        extractUserInfoFromResume(resume.resume_text)
                      }
                    } else {
                      setInterviewData(prev => ({ ...prev, resumeFile: null, resumeText: '' }))
                      setExtractedUserInfo({ email: null, name: null, phone: null })
                    }
                  }}
                  className="field-shell text-sm"
                >
                  <option value="">Use a saved resume…</option>
                  {savedResumes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              )}

              <FileUpload
                label=""
                onFileUploaded={async (file, text, thumbnailUrl, pdfUrl, fullPagePreviewUrl) => {
                  setSelectedResumeId(null)
                  setInterviewData(prev => ({ ...prev, resumeFile: { name: file.name, text }, resumeText: text }))
                  extractUserInfoFromResume(text)
                  if (user) {
                    const { data: existingResumes } = await supabase.from('user_resumes').select('id').eq('user_id', user.id)
                    const uploadLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    const { data: newResume, error: insertError } = await supabase.from('user_resumes').insert({
                      user_id: user.id, label: uploadLabel, resume_text: text,
                      file_url: thumbnailUrl ?? null, pdf_url: pdfUrl ?? null,
                      full_page_preview_url: fullPagePreviewUrl ?? null,
                      is_active: !existingResumes || existingResumes.length === 0,
                    }).select('id, label, resume_text').single()
                    if (!insertError && newResume) { setSavedResumes(prev => [newResume, ...prev]); setSelectedResumeId(newResume.id) }
                  }
                }}
                onFileRemoved={() => {
                  setSelectedResumeId(null)
                  setInterviewData(prev => ({ ...prev, resumeFile: null, resumeText: '' }))
                  setExtractedUserInfo({ email: null, name: null, phone: null })
                }}
                currentFile={interviewData.resumeFile || undefined}
              />

              {!interviewData.resumeFile && !selectedResumeId && (
                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/92 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-primary-700">
                      <span className="text-sm font-semibold">Or paste resume text</span>
                      <ChevronDown className="w-4 h-4 text-primary-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <textarea
                      value={interviewData.resumeText}
                      onChange={(e) => {
                        setSelectedResumeId(null)
                        setInterviewData(prev => ({ ...prev, resumeText: e.target.value }))
                        extractUserInfoFromResume(e.target.value)
                      }}
                      rows={7}
                      className="w-full resize-none border-t border-slate-100 bg-transparent px-4 py-3 text-sm focus:outline-none"
                      placeholder="Paste your resume here…"
                    />
                  </details>
                </div>
              )}

              {!user && hasResume && (
                <label className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input type="checkbox" checked={createAccountChecked} onChange={(e) => setCreateAccountChecked(e.target.checked)} className="w-4 h-4 text-accent-500 border-gray-300 rounded" />
                  <span className="text-xs text-gray-500">
                    {extractedUserInfo.email ? `Save progress to ${extractedUserInfo.email}` : 'Create free account to save progress'}
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* ── STAGE SELECTION ───────────────────────────────────────────── */}
        {onboardStep === 'stage' && (
          <div className="flex flex-col gap-5 animate-slide-up">
            <Preppi message={getPreppiMessage()} size="md" animate className="justify-center" />
            <p className="hidden md:block text-center text-base font-semibold text-gray-700">Which stage are you preparing for?</p>

            {/* Company / role summary */}
            {(interviewData.companyName || interviewData.positionTitle) && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-400 font-medium">
                  {[interviewData.positionTitle, interviewData.companyName].filter(Boolean).join(' at ')}
                </span>
                <button onClick={() => setOnboardStep('job')} className="text-xs text-accent-500 font-semibold hover:text-accent-700">
                  Edit
                </button>
              </div>
            )}

            {/* Add job posting if missing */}
            {!hasJobDesc && <JobPostingPanel accent />}

            {/* Stage cards — Duolingo-style */}
            <div className="space-y-3">
              {(['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).map((stage) => {
                const config = STAGE_CONFIG[stage]
                const isSelected = selectedStage === stage
                const isLocked = user ? isStageLockedFn(stage) : false

                return (
                  <button
                    key={stage}
                    onClick={() => {
                      if (isLocked) { setPurchaseHighlightStage(stage); setShowPurchaseFlow(true) }
                      else setSelectedStage(stage)
                    }}
                    className={`flex w-full items-center gap-4 rounded-[1.45rem] px-5 py-4 text-left transition-all active:scale-[0.985] ${
                      isLocked
                        ? 'border border-slate-200 bg-slate-100/80 shadow-none'
                        : isSelected
                        ? `${config.bg} ${config.activeBorder} border-b-4 shadow-[0_18px_34px_rgba(15,23,42,0.14)]`
                        : 'border border-slate-200/80 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.06)] hover:border-slate-300'
                    }`}
                  >
                    <span className="text-3xl shrink-0">{config.emoji}</span>
                    <div className="flex-1 text-left">
                      <p className={`font-bold text-base leading-tight ${isLocked ? 'text-gray-400' : isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {config.name}
                      </p>
                      <p className={`text-sm mt-0.5 ${isLocked ? 'text-gray-400' : isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {config.subtitle}
                      </p>
                    </div>
                    {stage === 'hr_screen' && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${isSelected ? 'bg-white text-[#3b9400]' : 'bg-emerald-100 text-emerald-700'}`}>
                        FREE
                      </span>
                    )}
                    {isLocked && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-primary-500">{config.price}</span>
                      </div>
                    )}
                    {!isLocked && stage !== 'hr_screen' && (
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${isSelected ? 'text-white' : 'text-gray-200'}`} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Bundle unlock */}
            {user && PAID_STAGES.some(s => isStageLockedFn(s)) && (
              <button
                onClick={() => { setPurchaseHighlightStage(undefined); setShowPurchaseFlow(true) }}
                className="flex items-center justify-center gap-2 py-2 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
              >
                <Crown className="w-4 h-4" />
                Unlock all 4 stages — bundle from $9.99
              </button>
            )}
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM CTA (Duolingo-style) ──────────────────────── */}
      {onboardStep !== 'welcome' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#f4f7fb] via-[#f4f7fb]/96 to-transparent px-5 pb-7 pt-4">
          {onboardStep === 'job' && (
            <button
              onClick={() => setOnboardStep('resume')}
              className="btn-coach-secondary w-full py-4 text-lg text-primary-700"
            >
              CONTINUE →
            </button>
          )}

          {onboardStep === 'resume' && (
            <button
              onClick={() => setOnboardStep('stage')}
              disabled={!hasResume}
              className="btn-coach-secondary w-full py-4 text-lg text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {hasResume ? 'CONTINUE →' : 'Add your resume to continue'}
            </button>
          )}

          {onboardStep === 'stage' && (
            user && isStageLockedFn(selectedStage) ? (
              <button
                onClick={() => { setPurchaseHighlightStage(selectedStage); setShowPurchaseFlow(true) }}
                className="btn-coach-secondary w-full py-4 text-lg text-primary-700"
              >
                <Lock className="inline w-5 h-5 mr-2" />
                Unlock {STAGE_CONFIG[selectedStage].name} · {STAGE_CONFIG[selectedStage].price}
              </button>
            ) : (
              <button
                onClick={() => handleStartInterview(selectedStage)}
                disabled={!canStartInterview() || saving}
                className="btn-coach-primary w-full py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {canStartInterview()
                  ? `START ${STAGE_CONFIG[selectedStage].name.toUpperCase()} →`
                  : 'Add job details to start'}
              </button>
            )
          )}
        </div>
      )}

      {showPurchaseFlow && (
        <PurchaseFlow
          onClose={() => { setShowPurchaseFlow(false); setPurchaseHighlightStage(undefined) }}
          highlightStage={purchaseHighlightStage}
        />
      )}

      <MobileNav />
    </div>
  )
}
