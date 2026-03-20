'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import FileUpload from '@/components/FileUpload'
import Link from 'next/link'
import Header from '@/components/Header'
import { Play, ChevronRight, CheckCircle2, Lock, Crown, ChevronDown } from 'lucide-react'
import PurchaseFlow from '@/components/PurchaseFlow'
import Preppi from '@/components/Preppi'
import MobileNav from '@/components/MobileNav'

type InterviewStage = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const STAGE_CONFIG: Record<InterviewStage, { name: string; subtitle: string; icon: string; price?: string }> = {
  hr_screen: { name: 'HR Screen', subtitle: 'Phone screening with recruiter', icon: '1' },
  hiring_manager: { name: 'Hiring Manager', subtitle: 'Deep-dive with your future boss', icon: '2', price: '$4.99' },
  culture_fit: { name: 'Culture Fit', subtitle: 'Team & values alignment', icon: '3', price: '$3.99' },
  final: { name: 'Final Round', subtitle: 'Executive-level evaluation', icon: '4', price: '$5.99' },
}

const PAID_STAGES: InterviewStage[] = ['hiring_manager', 'culture_fit', 'final']

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<InterviewStage>('hr_screen')
  const [interviewData, setInterviewData] = useState({
    resumeFile: null as { name: string; text: string } | null,
    resumeText: '',
    jobDescriptionFile: null as { name: string; text: string } | null,
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
    email: string | null
    name: string | null
    phone: string | null
  }>({ email: null, name: null, phone: null })
  const [showSetup, setShowSetup] = useState(true)
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
        .from('user_resumes')
        .select('id, label, resume_text')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (data) setSavedResumes(data)
    }
    loadResumes()
  }, [user?.id])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      // Fetch payment/access status
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
      .from('user_interview_data')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !dataArray || dataArray.length === 0) return

    const data = dataArray[0]
    const parsed = parseJobDescriptionText(data.job_description_text || '')

    setInterviewData({
      resumeFile: data.resume_file_url ? { name: 'Resume.pdf', text: data.resume_text || '' } : null,
      resumeText: data.resume_text || '',
      jobDescriptionFile: data.job_description_file_url ? { name: 'Job Description.pdf', text: data.job_description_text || '' } : null,
      jobDescriptionText: parsed.jobDescriptionText,
      jobDescriptionUrl: '',
      companyName: parsed.companyName,
      positionTitle: parsed.positionTitle,
      companyWebsite: data.company_website || '',
      notes: data.notes || '',
    })

    if (data.resume_text && data.job_description_text) {
      setShowSetup(false)
    }
  }

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session && createAccountChecked && extractedUserInfo.email) {
      await createAccountFromResume()
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { data: { session: newSession } } = await supabase.auth.getSession()
      if (!newSession) {
        alert('Account creation in progress. Please check your email to complete setup.')
        return
      }
    }

    if (!session) return
    setSaving(true)
    try {
      let formattedJobDescriptionText = interviewData.jobDescriptionText
      if (interviewData.companyName || interviewData.positionTitle) {
        if (!interviewData.jobDescriptionText.includes('Company:') && !interviewData.jobDescriptionText.includes('Position:')) {
          formattedJobDescriptionText = formatJobDescriptionText(interviewData.jobDescriptionText)
        }
      }

      const { error } = await supabase
        .from('user_interview_data')
        .upsert({
          user_id: session.user.id,
          resume_text: interviewData.resumeText,
          resume_file_url: null,
          job_description_text: formattedJobDescriptionText,
          job_description_file_url: null,
          company_website: interviewData.companyWebsite,
          notes: interviewData.notes,
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error
      alert('Saved!')
    } catch (error: any) {
      console.error('Error saving data:', error)
      alert('Error saving data. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatJobDescriptionText = (text: string) => {
    const parts: string[] = []
    if (interviewData.companyName) parts.push(`Company: ${interviewData.companyName}`)
    if (interviewData.positionTitle) parts.push(`Position: ${interviewData.positionTitle}`)
    if (parts.length > 0) { parts.push('', '---', '') }
    parts.push(text)
    return parts.join('\n')
  }

  const parseJobDescriptionText = (text: string) => {
    const companyMatch = text.match(/^Company:\s*(.+)$/m)
    const positionMatch = text.match(/^Position:\s*(.+)$/m)
    let companyName = ''
    let positionTitle = ''
    let jobDescriptionText = text
    if (companyMatch || positionMatch) {
      if (companyMatch) companyName = companyMatch[1].trim()
      if (positionMatch) positionTitle = positionMatch[1].trim()
      const headerEnd = text.indexOf('---')
      if (headerEnd > -1) jobDescriptionText = text.substring(headerEnd + 3).trim()
    }
    return { companyName, positionTitle, jobDescriptionText }
  }

  const getDomainName = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      const hostname = urlObj.hostname.replace('www.', '')
      const parts = hostname.split('.')
      if (parts.length >= 2) return parts[parts.length - 2] + '.' + parts[parts.length - 1]
      return hostname
    } catch { return 'this website' }
  }

  const extractUserInfoFromResume = (text: string) => {
    if (!text || text.trim().length === 0) {
      setExtractedUserInfo({ email: null, name: null, phone: null })
      return
    }
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
    const email = emails?.[0] || null
    const phones = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g)
    const phone = phones?.[0]?.replace(/\s+/g, '-') || null
    const lines = text.split('\n').slice(0, 10)
    let name = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(trimmed) && trimmed.length < 50) {
        if (!trimmed.includes('@') && !/\d{3}/.test(trimmed)) { name = trimmed; break }
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
        options: {
          data: { full_name: extractedUserInfo.name || '', phone: extractedUserInfo.phone || '' },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
        setInterviewData({ ...interviewData, jobDescriptionText: formatJobDescriptionText(data.content) })
        setFetchError(null)
      } else {
        const errorMsg = data.error || 'Failed to extract job description'
        const domainName = getDomainName(interviewData.jobDescriptionUrl)
        if (errorMsg.includes('403') || errorMsg.includes('Access denied')) {
          setFetchError(`${domainName} blocks automated access. Paste the job description manually.`)
        } else if (errorMsg.includes('404')) {
          setFetchError(`URL not found. Check the URL or paste manually.`)
        } else {
          setFetchError(`${errorMsg}. Paste manually instead.`)
        }
      }
    } catch (error: any) {
      setFetchError(`Error fetching. Paste manually instead.`)
    } finally { setFetchingJobDescription(false) }
  }

  const canStartInterview = () => {
    return (interviewData.resumeText.length > 0 || interviewData.resumeFile) && interviewData.jobDescriptionText.length > 0
  }

  const isStageLockedFn = (stage: InterviewStage): boolean => {
    if (stage === 'hr_screen') return false
    return !stageAccess?.[stage]?.hasAccess
  }

  const handleStartInterview = async (stage: InterviewStage = selectedStage) => {
    if (!canStartInterview()) return

    // Check if the selected stage is locked
    if (isStageLockedFn(stage)) {
      setPurchaseHighlightStage(stage)
      setShowPurchaseFlow(true)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      localStorage.setItem('temp_interview_data', JSON.stringify({
        resumeText: interviewData.resumeText,
        jobDescriptionText: interviewData.jobDescriptionText,
        companyName: interviewData.companyName,
        positionTitle: interviewData.positionTitle,
        companyWebsite: interviewData.companyWebsite,
        notes: interviewData.notes,
        createAccountChecked,
        extractedUserInfo,
      }))
    }

    try {
      let formattedJobDescriptionText = interviewData.jobDescriptionText
      if (interviewData.companyName || interviewData.positionTitle) {
        if (!interviewData.jobDescriptionText.includes('Company:') && !interviewData.jobDescriptionText.includes('Position:')) {
          formattedJobDescriptionText = formatJobDescriptionText(interviewData.jobDescriptionText)
        }
      }
      if (session) {
        await supabase.from('user_interview_data').upsert({
          user_id: session.user.id,
          resume_text: interviewData.resumeText,
          resume_file_url: null,
          job_description_text: formattedJobDescriptionText,
          job_description_file_url: null,
          company_website: interviewData.companyWebsite,
          notes: interviewData.notes,
          updated_at: new Date().toISOString(),
        }).select()
      }
      router.push(`/interview?stage=${stage}`)
    } catch (error: any) {
      console.error('Error starting interview:', error)
      alert('Error starting interview. Please try again.')
    }
  }

  const hasResume = interviewData.resumeText.length > 0 || !!interviewData.resumeFile
  const hasJobDesc = interviewData.jobDescriptionText.length > 0

  // Wizard step: 0=resume, 1=job details, 2=stage select
  const wizardStep = !hasResume ? 0 : !hasJobDesc ? 1 : 2

  const getPreppiMessage = () => {
    if (hasResume && hasJobDesc) {
      const name = extractedUserInfo.name?.split(' ')[0]
      return name
        ? `${name}, you're set. Pick your stage and let's get to work.`
        : "You're set. Pick your stage and let's get to work."
    }
    if (hasResume) return "Resume's in. Now add the job you're going after."
    return "Let's get you ready. Start with your resume."
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-8">

        {/* Preppi intro */}
        <div className="mb-8">
          <Preppi message={getPreppiMessage()} size="lg" animate />
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8">
          {[
            { label: 'Resume', done: hasResume },
            { label: 'Job Details', done: hasJobDesc },
            { label: 'Choose Stage', done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step.done
                    ? 'bg-emerald-500 text-white'
                    : wizardStep === i
                    ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${
                  step.done ? 'text-emerald-600' : wizardStep === i ? 'text-primary-600' : 'text-gray-400'
                }`}>{step.label}</span>
              </div>
              {i < 2 && (
                <div className={`h-0.5 flex-1 -mt-4 mx-1 transition-colors ${
                  (i === 0 && hasResume) || (i === 1 && hasJobDesc) ? 'bg-emerald-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Resume */}
        <div className={`bg-white rounded-2xl border transition-all duration-200 mb-4 overflow-hidden ${
          wizardStep === 0 ? 'border-primary-300 shadow-md' : hasResume ? 'border-emerald-200' : 'border-gray-200 opacity-60'
        }`}>
          <button
            className="w-full flex items-center gap-4 px-5 py-4 text-left"
            onClick={() => setShowSetup(wizardStep !== 0 ? true : showSetup)}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              hasResume ? 'bg-emerald-100' : 'bg-primary-100'
            }`}>
              {hasResume
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <span className="text-sm font-bold text-primary-600">1</span>
              }
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Resume</p>
              {hasResume
                ? <p className="text-xs text-emerald-600">
                    {interviewData.resumeFile ? interviewData.resumeFile.name : 'Text resume added'}
                  </p>
                : <p className="text-xs text-gray-400">Upload a PDF or paste your resume text</p>
              }
            </div>
            {hasResume && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSetup(!showSetup) }}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2"
              >
                Edit
              </button>
            )}
          </button>

          {(wizardStep === 0 || (hasResume && showSetup)) && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
              {user && savedResumes.length > 0 && (
                <select
                  value={selectedResumeId || ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setSelectedResumeId(id)
                    if (id) {
                      const resume = savedResumes.find(r => r.id === id)
                      if (resume) {
                        setInterviewData(prev => ({
                          ...prev,
                          resumeFile: { name: `${resume.label}.pdf`, text: resume.resume_text },
                          resumeText: resume.resume_text,
                        }))
                        extractUserInfoFromResume(resume.resume_text)
                      }
                    } else {
                      setInterviewData(prev => ({ ...prev, resumeFile: null, resumeText: '' }))
                      setExtractedUserInfo({ email: null, name: null, phone: null })
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Select a saved resume...</option>
                  {savedResumes.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              )}
              <FileUpload
                label=""
                onFileUploaded={async (file, text, thumbnailUrl, pdfUrl, fullPagePreviewUrl) => {
                  setSelectedResumeId(null)
                  setInterviewData(prev => ({ ...prev, resumeFile: { name: file.name, text }, resumeText: text }))
                  extractUserInfoFromResume(text)
                  if (user) {
                    const { data: existingResumes } = await supabase
                      .from('user_resumes')
                      .select('id')
                      .eq('user_id', user.id)
                    const uploadLabel = new Date().toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                    const { data: newResume, error: insertError } = await supabase.from('user_resumes').insert({
                      user_id: user.id,
                      label: uploadLabel,
                      resume_text: text,
                      file_url: thumbnailUrl ?? null,
                      pdf_url: pdfUrl ?? null,
                      full_page_preview_url: fullPagePreviewUrl ?? null,
                      is_active: !existingResumes || existingResumes.length === 0,
                    }).select('id, label, resume_text').single()
                    if (!insertError && newResume) {
                      setSavedResumes(prev => [newResume, ...prev])
                      setSelectedResumeId(newResume.id)
                    }
                  }
                }}
                onFileRemoved={() => {
                  setSelectedResumeId(null)
                  setInterviewData(prev => ({ ...prev, resumeFile: null, resumeText: '' }))
                  setExtractedUserInfo({ email: null, name: null, phone: null })
                }}
                currentFile={interviewData.resumeFile || undefined}
              />
              {!interviewData.resumeFile && (
                <textarea
                  value={interviewData.resumeText}
                  onChange={(e) => {
                    setSelectedResumeId(null)
                    setInterviewData(prev => ({ ...prev, resumeText: e.target.value }))
                    extractUserInfoFromResume(e.target.value)
                  }}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Or paste resume text..."
                />
              )}
              {!user && (interviewData.resumeFile || interviewData.resumeText) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={createAccountChecked} onChange={(e) => setCreateAccountChecked(e.target.checked)} className="w-3.5 h-3.5 text-primary-500 border-gray-300 rounded" />
                  <span className="text-xs text-gray-600">
                    {extractedUserInfo.email ? `Save progress to ${extractedUserInfo.email}` : 'Create free account to save progress'}
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Job Details */}
        <div className={`bg-white rounded-2xl border transition-all duration-200 mb-4 overflow-hidden ${
          wizardStep === 1 ? 'border-primary-300 shadow-md'
          : hasJobDesc ? 'border-emerald-200'
          : hasResume ? 'border-gray-200' : 'border-gray-100 opacity-40 pointer-events-none'
        }`}>
          <button
            className="w-full flex items-center gap-4 px-5 py-4 text-left"
            onClick={() => { if (hasResume) setShowSetup(true) }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              hasJobDesc ? 'bg-emerald-100' : hasResume ? 'bg-primary-100' : 'bg-gray-100'
            }`}>
              {hasJobDesc
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <span className={`text-sm font-bold ${hasResume ? 'text-primary-600' : 'text-gray-400'}`}>2</span>
              }
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Job Details</p>
              {hasJobDesc && interviewData.companyName
                ? <p className="text-xs text-emerald-600">{interviewData.positionTitle} at {interviewData.companyName}</p>
                : hasJobDesc
                ? <p className="text-xs text-emerald-600">Job description added</p>
                : <p className="text-xs text-gray-400">Paste the job posting URL or description</p>
              }
            </div>
            {hasJobDesc && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSetup(!showSetup) }}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2"
              >
                Edit
              </button>
            )}
          </button>

          {hasResume && (wizardStep === 1 || (hasJobDesc && showSetup)) && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={interviewData.jobDescriptionUrl || ''}
                  onChange={(e) => { setInterviewData({ ...interviewData, jobDescriptionUrl: e.target.value }); if (fetchError) setFetchError(null) }}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleFetchJobDescription() }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Paste job posting URL..."
                />
                <button
                  onClick={handleFetchJobDescription}
                  disabled={!interviewData.jobDescriptionUrl || fetchingJobDescription}
                  className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium shrink-0"
                >
                  {fetchingJobDescription ? '...' : 'Fetch'}
                </button>
              </div>
              {fetchError && <p className="text-xs text-red-600">{fetchError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={interviewData.companyName || ''}
                  onChange={(e) => setInterviewData({ ...interviewData, companyName: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Company name"
                />
                <input
                  type="text"
                  value={interviewData.positionTitle || ''}
                  onChange={(e) => setInterviewData({ ...interviewData, positionTitle: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Position title"
                />
              </div>
              <textarea
                value={interviewData.jobDescriptionText}
                onChange={(e) => { setInterviewData({ ...interviewData, jobDescriptionText: e.target.value }); if (fetchError) setFetchError(null) }}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Or paste job description..."
              />
              {/* Optional fields collapsible */}
              <details className="group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 font-medium list-none flex items-center gap-1">
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                  Optional: company website & notes
                </summary>
                <div className="mt-3 space-y-3">
                  <input
                    type="url"
                    value={interviewData.companyWebsite}
                    onChange={(e) => setInterviewData({ ...interviewData, companyWebsite: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Company website (optional)"
                  />
                  <textarea
                    value={interviewData.notes}
                    onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Any additional context... (optional)"
                  />
                </div>
              </details>
              {user && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save draft'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Choose Stage + Start */}
        <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
          canStartInterview() ? 'border-primary-300 shadow-md' : 'border-gray-100 opacity-40 pointer-events-none'
        }`}>
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                canStartInterview() ? 'bg-primary-100' : 'bg-gray-100'
              }`}>
                <span className={`text-sm font-bold ${canStartInterview() ? 'text-primary-600' : 'text-gray-400'}`}>3</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Choose your stage</p>
                <p className="text-xs text-gray-400">HR Screen is always free</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {(['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).map((s) => {
              const config = STAGE_CONFIG[s]
              const isSelected = selectedStage === s
              const isLocked = user && isStageLockedFn(s)

              return (
                <button
                  key={s}
                  onClick={() => {
                    if (isLocked) {
                      setPurchaseHighlightStage(s)
                      setShowPurchaseFlow(true)
                    } else {
                      setSelectedStage(s)
                    }
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                    isLocked ? 'bg-gray-50 hover:bg-gray-100'
                    : isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isLocked ? 'bg-gray-200 text-gray-400'
                    : isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${
                      isLocked ? 'text-gray-400' : isSelected ? 'text-primary-700' : 'text-gray-900'
                    }`}>{config.name}</p>
                    <p className="text-xs text-gray-400">{config.subtitle}</p>
                  </div>
                  {isLocked && <span className="text-xs font-semibold text-indigo-500 shrink-0">{config.price}</span>}
                  {!isLocked && isSelected && <ChevronRight className="w-4 h-4 text-primary-400 shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
            {user && isStageLockedFn(selectedStage) ? (
              <button
                onClick={() => { setPurchaseHighlightStage(selectedStage); setShowPurchaseFlow(true) }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 md:py-3.5 rounded-xl text-white font-bold text-base md:text-sm bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                <Lock className="w-5 h-5 md:w-4 md:h-4" />
                Unlock {STAGE_CONFIG[selectedStage].name} — {STAGE_CONFIG[selectedStage].price}
              </button>
            ) : (
              <button
                onClick={() => handleStartInterview(selectedStage)}
                disabled={!canStartInterview() || saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 md:py-3.5 rounded-xl text-white font-bold text-base md:text-sm bg-primary-500 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-100"
              >
                <Play className="w-5 h-5 md:w-4 md:h-4" />
                Start {STAGE_CONFIG[selectedStage].name}
              </button>
            )}
          </div>
        </div>

        {/* Subtle unlock prompt for logged-in users */}
        {user && PAID_STAGES.some(s => isStageLockedFn(s)) && canStartInterview() && (
          <button
            onClick={() => { setPurchaseHighlightStage(undefined); setShowPurchaseFlow(true) }}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            <Crown className="w-4 h-4" />
            Unlock all 4 stages — bundle from $9.99
          </button>
        )}
      </main>

      {/* Purchase Flow Modal */}
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
