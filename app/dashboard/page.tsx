'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import FileUpload from '@/components/FileUpload'
import Link from 'next/link'
import Header from '@/components/Header'
import { CheckCircle2, Lock, Crown, ChevronDown, Briefcase, ArrowRight, FileText, FolderOpen, Clock, PlusSquare } from 'lucide-react'
import PurchaseFlow from '@/components/PurchaseFlow'
import Preppi from '@/components/Preppi'
import MobileNav from '@/components/MobileNav'
import AppSidebar from '@/components/AppSidebar'
import AppProgressRail from '@/components/AppProgressRail'
import { isAdminPreview, MOCK_SESSION_DATA } from '@/lib/mock-feedback'

type InterviewStage = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'
type OnboardStep = 'welcome' | 'job' | 'resume' | 'stage'

interface InterviewGroup {
  companyName: string | null
  positionTitle: string | null
  stages: {
    [key: string]: {
      latestSession: any | null
      hasFeedback: boolean
      overallScore: number | null
    }
  }
}

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
  const [interviewGroups, setInterviewGroups] = useState<InterviewGroup[]>([])
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
  const searchParams = useSearchParams()
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
      await loadInterviewGroups(session)
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

  const loadInterviewGroups = async (session: any) => {
    try {
      const { data: sessions, error } = await supabase
        .from('interview_sessions')
        .select(`
          id, stage, status, created_at, completed_at,
          user_interview_data ( job_description_text ),
          interview_feedback ( id, overall_score, created_at )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error || !sessions) return

      const groupsMap = new Map<string, InterviewGroup>()

      sessions.forEach((sessionRow: any) => {
        if (!sessionRow.interview_feedback?.length) return

        const text = sessionRow.user_interview_data?.job_description_text || ''
        const companyMatch = text.match(/^Company:\s*(.+)$/m)
        const positionMatch = text.match(/^Position:\s*(.+)$/m)
        const companyName = companyMatch?.[1]?.trim() || null
        const positionTitle = positionMatch?.[1]?.trim() || null
        const groupKey = `${companyName || 'Unknown'}-${positionTitle || 'Unknown'}`
        const stageKey = sessionRow.stage === 'team_interview'
          ? 'culture_fit'
          : sessionRow.stage === 'final_interview'
          ? 'final'
          : sessionRow.stage

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, {
            companyName,
            positionTitle,
            stages: {
              hr_screen: { latestSession: null, hasFeedback: false, overallScore: null },
              hiring_manager: { latestSession: null, hasFeedback: false, overallScore: null },
              culture_fit: { latestSession: null, hasFeedback: false, overallScore: null },
              final: { latestSession: null, hasFeedback: false, overallScore: null },
            },
          })
        }

        const group = groupsMap.get(groupKey)!
        const stageState = group.stages[stageKey]
        if (!stageState) return
        const latestDate = stageState.latestSession ? new Date(stageState.latestSession.completed_at || stageState.latestSession.created_at).getTime() : 0
        const currentDate = new Date(sessionRow.completed_at || sessionRow.created_at).getTime()

        stageState.hasFeedback = true
        stageState.overallScore = sessionRow.interview_feedback[0]?.overall_score ?? null
        if (!stageState.latestSession || currentDate >= latestDate) {
          stageState.latestSession = sessionRow
        }
      })

      if (isAdminPreview(session.user.email)) {
        const mockCompany = 'Atlas Developer Tools'
        const mockRole = 'Senior Technical Program Manager'
        const mockKey = `${mockCompany}-${mockRole}`
        if (!groupsMap.has(mockKey)) {
          groupsMap.set(mockKey, {
            companyName: mockCompany,
            positionTitle: mockRole,
            stages: {
              hr_screen: {
                latestSession: {
                  id: 'mock-session',
                  stage: 'hr_screen',
                  previewMock: true,
                  created_at: MOCK_SESSION_DATA.created_at,
                  completed_at: MOCK_SESSION_DATA.created_at,
                },
                hasFeedback: true,
                overallScore: 6.2,
              },
              hiring_manager: { latestSession: null, hasFeedback: false, overallScore: null },
              culture_fit: { latestSession: null, hasFeedback: false, overallScore: null },
              final: { latestSession: null, hasFeedback: false, overallScore: null },
            },
          })
        }
      }

      setInterviewGroups(Array.from(groupsMap.values()))
    } catch (error) {
      console.error('Error loading interview groups:', error)
    }
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
  const workspacePanel = searchParams?.get('panel') === 'documents' ? 'documents' : 'interviews'
  const forceNewProcess = searchParams?.get('new') === '1'
  const hasWorkspaceData = user && (interviewGroups.length > 0 || savedResumes.length > 0)
  const showWorkspaceHub = !!hasWorkspaceData && !forceNewProcess
  const getCompletedCount = (group: InterviewGroup) =>
    (['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).filter((stage) => group.stages[stage]?.hasFeedback).length
  const getLatestSessionForGroup = (group: InterviewGroup) => {
    return (['final', 'culture_fit', 'hiring_manager', 'hr_screen'] as const)
      .map((stage) => group.stages[stage]?.latestSession)
      .find(Boolean) || null
  }
  const getFeedbackHref = (sessionRow: any) => {
    if (!sessionRow) return '/dashboard'
    if (sessionRow.previewMock) return '/interview/feedback?preview=mock'
    const stage = sessionRow.stage === 'team_interview' ? 'culture_fit' : sessionRow.stage === 'final_interview' ? 'final' : sessionRow.stage
    return `/interview/feedback?sessionId=${sessionRow.id}&stage=${stage}`
  }
  const activeInterviewGroups = interviewGroups.filter((group) => getCompletedCount(group) < 4)
  const completedInterviewGroups = interviewGroups.filter((group) => getCompletedCount(group) === 4)
  const completedReportCount = interviewGroups.reduce(
    (count, group) => count + (['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).filter((stage) => group.stages[stage]?.hasFeedback).length,
    0
  )
  const processStages = (['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).map((stage) => ({
    key: stage,
    label: STAGE_CONFIG[stage].name,
    status: selectedStage === stage ? 'current' as const : stage === 'hr_screen' || !isStageLockedFn(stage) ? 'complete' as const : 'upcoming' as const,
  }))
  const setupRailCards = [
    {
      title: 'Setup Progress',
      items: [
        { label: 'Resume', value: hasResume ? 'Added' : 'Missing', progress: hasResume ? 100 : 12, tone: hasResume ? 'success' as const : 'default' as const },
        { label: 'Job Posting', value: hasJobDesc ? 'Added' : 'Missing', progress: hasJobDesc ? 100 : 12, tone: hasJobDesc ? 'success' as const : 'default' as const },
        { label: 'Current Step', value: onboardStep.replace('_', ' '), progress: onboardStep === 'stage' ? 100 : onboardStep === 'resume' ? 66 : onboardStep === 'job' ? 33 : 10, tone: 'brand' as const },
      ],
    },
    {
      title: 'Selected Round',
      items: [
        { label: STAGE_CONFIG[selectedStage].name, value: STAGE_CONFIG[selectedStage].price || 'Free', progress: 100, tone: stageAccess?.[selectedStage]?.hasAccess || selectedStage === 'hr_screen' ? 'success' as const : 'warning' as const },
        { label: 'Company', value: interviewData.companyName || 'Not set' },
        { label: 'Role', value: interviewData.positionTitle || 'Not set' },
      ],
    },
  ]
  const hubRailCards = [
    {
      title: 'Workspace Snapshot',
      items: [
        { label: 'Active Processes', value: `${activeInterviewGroups.length}`, progress: activeInterviewGroups.length ? 100 : 0, tone: 'brand' as const },
        { label: 'Completed Processes', value: `${completedInterviewGroups.length}`, progress: completedInterviewGroups.length ? 100 : 0, tone: 'success' as const },
        { label: 'Saved Resumes', value: `${savedResumes.length}`, progress: savedResumes.length ? 100 : 0, tone: 'brand' as const },
      ],
    },
    {
      title: 'Documents',
      items: [
        { label: 'Detailed Reports', value: `${completedReportCount}`, progress: completedReportCount ? 100 : 0, tone: 'success' as const },
        { label: 'Current View', value: workspacePanel === 'documents' ? 'Documents' : 'Interviews' },
        { label: 'Next Action', value: activeInterviewGroups.length ? 'Continue process' : 'Start new process' },
      ],
    },
  ]
  const dashboardRailCards = showWorkspaceHub ? hubRailCards : setupRailCards

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
    <div className="app-shell lg:grid lg:min-h-screen lg:grid-cols-[248px_minmax(0,1fr)_320px_minmax(12px,0.25fr)] lg:bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_42%,#eef3f8_100%)]">
      <div className="lg:hidden">
        <Header />
      </div>
      <AppSidebar
        activeSection={showWorkspaceHub ? (workspacePanel === 'documents' ? 'documents' : 'interviews') : 'new_process'}
        processStages={showWorkspaceHub ? [] : processStages}
        navTitle={showWorkspaceHub ? 'Workspace' : 'Prep Workspace'}
        theme="light"
      />
      <AppProgressRail
        cards={dashboardRailCards}
        theme="light"
        header={showWorkspaceHub ? {
          eyebrow: 'Workspace Hub',
          title: activeInterviewGroups.length ? 'Pick up where you left off' : 'Start a fresh interview process',
          subtitle: workspacePanel === 'documents' ? 'Resumes and coaching artifacts live here.' : 'Select a process or launch a new one.',
        } : undefined}
      />

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-xl px-5 pb-36 pt-6 lg:order-2 lg:min-h-screen lg:max-w-none lg:bg-[linear-gradient(180deg,#fcfdff_0%,#f6f8fb_40%,#eef3f8_100%)] lg:px-8 lg:pb-12 lg:pt-8">
        {showWorkspaceHub && (
          <div className="space-y-8 animate-slide-up">
            <div className="premium-panel p-6 lg:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="eyebrow eyebrow-coach mb-3 w-fit">Workspace Hub</div>
                  <h1 className="text-3xl font-black text-slate-950">Your interview prep lives here.</h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                    Choose an interview process to continue, review saved materials, or launch a new round.
                  </p>
                </div>
                <Link href="/dashboard?new=1" className="btn-coach-primary inline-flex items-center justify-center gap-2 px-6 py-4">
                  <PlusSquare className="h-5 w-5" />
                  New Interview Process
                </Link>
              </div>
            </div>

            {workspacePanel === 'interviews' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">Active Processes</p>
                      <h2 className="mt-1 text-2xl font-black text-slate-900">Continue where you left off</h2>
                    </div>
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                      {activeInterviewGroups.length} active
                    </span>
                  </div>
                  {activeInterviewGroups.length === 0 ? (
                    <div className="premium-panel p-8 text-center">
                      <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
                      <p className="mt-4 text-base font-semibold text-slate-700">No active interview processes right now.</p>
                      <p className="mt-2 text-sm text-slate-500">Start a new process when the next role comes in.</p>
                    </div>
                  ) : (
                    <div className="grid gap-5 xl:grid-cols-2">
                      {activeInterviewGroups.map((group, idx) => {
                        const latestSession = getLatestSessionForGroup(group)
                        const completedCount = getCompletedCount(group)
                        const title = [group.positionTitle, group.companyName].filter(Boolean).join(' at ') || `Interview Process ${idx + 1}`
                        return (
                          <button
                            key={`${title}-${idx}`}
                            type="button"
                            onClick={() => latestSession && router.push(getFeedbackHref(latestSession))}
                            className="premium-panel flex flex-col gap-5 p-6 text-left transition-all hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(15,23,42,0.08)]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Interview Process</p>
                                <h3 className="mt-2 text-2xl font-black text-slate-900">{title}</h3>
                              </div>
                              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                                {completedCount}/4 complete
                              </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]" style={{ width: `${(completedCount / 4) * 100}%` }} />
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              {(['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).map((stage) => {
                                const stageState = group.stages[stage]
                                return (
                                  <div key={stage} className={`rounded-[1.2rem] border px-3 py-3 text-center ${
                                    stageState?.hasFeedback ? 'border-emerald-200 bg-emerald-50/80' : 'border-slate-200 bg-slate-50/80'
                                  }`}>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{STAGE_CONFIG[stage].name}</p>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                              <span>{latestSession ? 'Open latest feedback' : 'No completed stages yet'}</span>
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-500">Completed Processes</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">Finished interview tracks</h2>
                  </div>
                  {completedInterviewGroups.length === 0 ? (
                    <div className="premium-panel p-8 text-center">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
                      <p className="mt-4 text-base font-semibold text-slate-700">No completed processes yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {completedInterviewGroups.map((group, idx) => {
                        const latestSession = getLatestSessionForGroup(group)
                        const title = [group.positionTitle, group.companyName].filter(Boolean).join(' at ') || `Completed Process ${idx + 1}`
                        return (
                          <button
                            key={`${title}-${idx}`}
                            type="button"
                            onClick={() => latestSession && router.push(getFeedbackHref(latestSession))}
                            className="premium-panel flex items-center justify-between gap-4 p-5 text-left transition-all hover:-translate-y-0.5"
                          >
                            <div>
                              <p className="text-lg font-black text-slate-900">{title}</p>
                              <p className="mt-1 text-sm text-slate-500">All four stages completed.</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {workspacePanel === 'documents' && (
              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="premium-panel p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-violet-100">
                      <FolderOpen className="h-6 w-6 text-violet-700" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Resumes</p>
                      <h2 className="text-2xl font-black text-slate-900">Saved resume library</h2>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {savedResumes.length === 0 ? (
                      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
                        No saved resumes yet. Upload one when you start a new interview process.
                      </div>
                    ) : savedResumes.map((resume) => (
                      <div key={resume.id} className="rounded-[1.4rem] border border-slate-200 bg-white/92 px-4 py-4">
                        <p className="text-sm font-black text-slate-900">{resume.label}</p>
                        <p className="mt-1 text-sm text-slate-500">Ready to use in a new interview process.</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-panel p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-emerald-100">
                      <FileText className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Coaching Artifacts</p>
                      <h2 className="text-2xl font-black text-slate-900">Detailed reports</h2>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/85 px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Saved Reports</p>
                      <p className="mt-2 text-3xl font-black text-emerald-800">{completedReportCount}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                      <p className="text-sm leading-7 text-slate-600">
                        Every completed stage creates a downloadable coaching artifact inside that interview process.
                      </p>
                    </div>
                    <Link href="/dashboard" className="btn-coach-secondary mt-2 flex items-center justify-center gap-2 py-3.5 text-sm">
                      <Briefcase className="h-4 w-4" />
                      Back to interview processes
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!showWorkspaceHub && (
          <>
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
          </>
        )}
      </main>

      {/* ── STICKY BOTTOM CTA (Duolingo-style) ──────────────────────── */}
      {!showWorkspaceHub && onboardStep !== 'welcome' && (
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

      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
