'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import FileUpload from '@/components/FileUpload'
import Link from 'next/link'
import Header from '@/components/Header'
import { Play, ChevronRight, CheckCircle2, Lock, Crown } from 'lucide-react'
import PurchaseFlow from '@/components/PurchaseFlow'

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
  const ready = hasResume && hasJobDesc

  const stageIcons: Record<InterviewStage, string> = {
    hr_screen: '📞',
    hiring_manager: '💼',
    culture_fit: '🤝',
    final: '🏆',
  }

  const stageColors: Record<InterviewStage, { ring: string; bg: string; text: string }> = {
    hr_screen:       { ring: 'ring-emerald-400 border-emerald-400', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
    hiring_manager:  { ring: 'ring-indigo-400  border-indigo-400',  bg: 'bg-indigo-50',   text: 'text-indigo-700'  },
    culture_fit:     { ring: 'ring-teal-400    border-teal-400',    bg: 'bg-teal-50',     text: 'text-teal-700'    },
    final:           { ring: 'ring-amber-400   border-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700'   },
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 260px, #f1f5f9 260px)' }}>
      <Header />

      <div className="max-w-lg mx-auto px-4 pb-16">

        {/* ── Hero: Preppi on dark ── */}
        <div className="pt-6 pb-12">
          <div className="flex items-end gap-4">
            {/* Parrot without speech bubble on dark bg */}
            <div className="shrink-0 w-16 h-16 drop-shadow-xl">
              <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <ellipse cx="40" cy="50" rx="18" ry="22" fill="#2E9E6B" />
                <ellipse cx="24" cy="52" rx="9" ry="14" fill="#27856E" transform="rotate(-15 24 52)" />
                <ellipse cx="56" cy="52" rx="9" ry="14" fill="#27856E" transform="rotate(15 56 52)" />
                <ellipse cx="40" cy="54" rx="10" ry="14" fill="#F0C040" />
                <path d="M32 68 Q28 78 24 76 Q30 70 32 68Z" fill="#1E7A55" />
                <path d="M40 70 Q38 82 34 80 Q38 72 40 70Z" fill="#27856E" />
                <path d="M48 68 Q52 78 56 76 Q50 70 48 68Z" fill="#1E7A55" />
                <circle cx="40" cy="28" r="16" fill="#2E9E6B" />
                <path d="M36 14 Q38 6 40 8 Q42 6 44 14" stroke="#1E7A55" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="40" cy="7" r="3" fill="#F0C040" />
                <ellipse cx="40" cy="30" rx="9" ry="8" fill="#F9E4A0" />
                <circle cx="35" cy="24" r="5" fill="white" /><circle cx="45" cy="24" r="5" fill="white" />
                <circle cx="36" cy="25" r="2.5" fill="#1A1A2E" /><circle cx="46" cy="25" r="2.5" fill="#1A1A2E" />
                <circle cx="37" cy="24" r="1" fill="white" /><circle cx="47" cy="24" r="1" fill="white" />
                <path d="M37 31 Q40 36 43 31 Q40 29 37 31Z" fill="#E8923A" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {ready
                  ? (extractedUserInfo.name ? `Ready, ${extractedUserInfo.name.split(' ')[0]}.` : 'Ready. Pick your stage.')
                  : !hasResume
                  ? "Let's get you prepped."
                  : 'One more thing.'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {ready ? 'Choose your interview stage and launch.' : !hasResume ? 'Drop your resume to start.' : 'Add the job posting.'}
              </p>
              {/* Progress pips */}
              <div className="flex items-center gap-1.5 mt-3">
                {[hasResume, hasJobDesc, ready].map((done, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-700 ${done ? 'bg-emerald-400 w-6' : 'bg-white/15 w-3'}`}
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1">
                  {!hasResume ? '1 / 3' : !hasJobDesc ? '2 / 3' : '3 / 3'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content card ── */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden -mt-2">

          {/* Slot 1: Resume */}
          <div className={`transition-all duration-300 ${hasResume ? 'border-b border-gray-100' : ''}`}>
            {hasResume ? (
              /* Filled — compact slot */
              <button
                onClick={() => setShowSetup(prev => !prev)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left group"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-700 truncate">
                    {interviewData.resumeFile?.name || 'Resume added'}
                  </p>
                  <p className="text-xs text-gray-400">Ready · tap to edit</p>
                </div>
                <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors font-mono">✕</span>
              </button>
            ) : (
              /* Empty — expanded input zone */
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">1</span>
                  </div>
                  <span className="font-semibold text-gray-900">Resume</span>
                </div>

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
                    className="w-full mb-3 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  >
                    <option value="">Select a saved resume…</option>
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
                      const label = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      const { data: newResume, error: insertError } = await supabase.from('user_resumes').insert({
                        user_id: user.id, label, resume_text: text,
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
                {!interviewData.resumeFile && (
                  <textarea
                    value={interviewData.resumeText}
                    onChange={(e) => { setSelectedResumeId(null); setInterviewData(prev => ({ ...prev, resumeText: e.target.value })); extractUserInfoFromResume(e.target.value) }}
                    rows={4}
                    className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                    placeholder="Or paste resume text…"
                  />
                )}
                {!user && (interviewData.resumeFile || interviewData.resumeText) && (
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={createAccountChecked} onChange={e => setCreateAccountChecked(e.target.checked)} className="w-3.5 h-3.5 rounded text-primary-500" />
                    <span className="text-xs text-gray-500">{extractedUserInfo.email ? `Save progress to ${extractedUserInfo.email}` : 'Create free account to save progress'}</span>
                  </label>
                )}
              </div>
            )}

            {/* Edit panel when resume is done */}
            {hasResume && showSetup && (
              <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-2">
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
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  >
                    <option value="">Select a saved resume…</option>
                    {savedResumes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                )}
                <FileUpload
                  label=""
                  onFileUploaded={async (file, text, thumbnailUrl, pdfUrl, fullPagePreviewUrl) => {
                    setSelectedResumeId(null)
                    setInterviewData(prev => ({ ...prev, resumeFile: { name: file.name, text }, resumeText: text }))
                    extractUserInfoFromResume(text)
                    setShowSetup(false)
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
                    onChange={e => { setSelectedResumeId(null); setInterviewData(prev => ({ ...prev, resumeText: e.target.value })); extractUserInfoFromResume(e.target.value) }}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                    placeholder="Or paste resume text…"
                  />
                )}
              </div>
            )}
          </div>

          {/* Slot 2: Job Details — only rendered once resume is done */}
          {hasResume && (
            <div className={`transition-all duration-300 ${hasJobDesc ? 'border-b border-gray-100' : ''}`}>
              {hasJobDesc ? (
                /* Filled */
                <button
                  onClick={() => setShowSetup(prev => !prev)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left group"
                >
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-700 truncate">
                      {interviewData.positionTitle && interviewData.companyName
                        ? `${interviewData.positionTitle} at ${interviewData.companyName}`
                        : 'Job description added'}
                    </p>
                    <p className="text-xs text-gray-400">Ready · tap to edit</p>
                  </div>
                  <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors font-mono">✕</span>
                </button>
              ) : (
                /* Empty */
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                    <span className="font-semibold text-gray-900">Job Details</span>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="url"
                      value={interviewData.jobDescriptionUrl || ''}
                      onChange={e => { setInterviewData({ ...interviewData, jobDescriptionUrl: e.target.value }); if (fetchError) setFetchError(null) }}
                      onKeyPress={e => { if (e.key === 'Enter') handleFetchJobDescription() }}
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
                      placeholder="Paste job posting URL…"
                    />
                    <button
                      onClick={handleFetchJobDescription}
                      disabled={!interviewData.jobDescriptionUrl || fetchingJobDescription}
                      className="px-4 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 font-semibold shrink-0 transition-colors"
                    >
                      {fetchingJobDescription ? '…' : 'Fetch'}
                    </button>
                  </div>
                  {fetchError && <p className="text-xs text-red-500 mb-3">{fetchError}</p>}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <input type="text" value={interviewData.companyName || ''} onChange={e => setInterviewData({ ...interviewData, companyName: e.target.value })} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="Company" />
                    <input type="text" value={interviewData.positionTitle || ''} onChange={e => setInterviewData({ ...interviewData, positionTitle: e.target.value })} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="Role" />
                  </div>
                  <textarea
                    value={interviewData.jobDescriptionText}
                    onChange={e => { setInterviewData({ ...interviewData, jobDescriptionText: e.target.value }); if (fetchError) setFetchError(null) }}
                    rows={4}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                    placeholder="Or paste job description…"
                  />
                </div>
              )}

              {/* Edit job panel */}
              {hasJobDesc && showSetup && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex gap-2">
                    <input type="url" value={interviewData.jobDescriptionUrl || ''} onChange={e => { setInterviewData({ ...interviewData, jobDescriptionUrl: e.target.value }); setFetchError(null) }} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="Job URL…" />
                    <button onClick={handleFetchJobDescription} disabled={!interviewData.jobDescriptionUrl || fetchingJobDescription} className="px-3 py-2 text-sm bg-primary-500 text-white rounded-xl disabled:opacity-50 font-semibold">{fetchingJobDescription ? '…' : 'Fetch'}</button>
                  </div>
                  {fetchError && <p className="text-xs text-red-500">{fetchError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={interviewData.companyName || ''} onChange={e => setInterviewData({ ...interviewData, companyName: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="Company" />
                    <input type="text" value={interviewData.positionTitle || ''} onChange={e => setInterviewData({ ...interviewData, positionTitle: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="Role" />
                  </div>
                  <textarea value={interviewData.jobDescriptionText} onChange={e => { setInterviewData({ ...interviewData, jobDescriptionText: e.target.value }); setFetchError(null) }} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                </div>
              )}
            </div>
          )}

          {/* ── Stage tiles — always visible, energetic ── */}
          <div className={`p-5 transition-all duration-500 ${!ready ? 'opacity-40 pointer-events-none' : ''}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              {ready ? 'Choose your stage' : 'Add resume + job to unlock'}
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {(['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).map((s) => {
                const config = STAGE_CONFIG[s]
                const isSelected = selectedStage === s
                const isLocked = user ? isStageLockedFn(s) : false
                const colors = stageColors[s]

                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (isLocked) { setPurchaseHighlightStage(s); setShowPurchaseFlow(true) }
                      else setSelectedStage(s)
                    }}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                      isLocked
                        ? 'border-dashed border-gray-200 bg-gray-50 hover:border-gray-300'
                        : isSelected
                        ? `border-2 ${colors.ring} ${colors.bg} shadow-sm`
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-2xl mb-2 leading-none">{stageIcons[s]}</div>
                    <div className={`font-bold text-sm mb-0.5 ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                      {config.name}
                    </div>
                    {isLocked ? (
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                        <Lock className="w-3 h-3" /> {config.price}
                      </div>
                    ) : (
                      <div className={`text-xs font-semibold ${isSelected ? colors.text : 'text-gray-400'}`}>
                        {s === 'hr_screen' ? 'Free' : config.price}
                      </div>
                    )}
                    {isSelected && !isLocked && (
                      <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${colors.bg} border-2 ${colors.ring} flex items-center justify-center`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Stage description strip */}
            <div className={`rounded-xl px-4 py-3 mb-4 ${stageColors[selectedStage].bg} transition-all`}>
              <p className={`text-xs font-medium ${stageColors[selectedStage].text}`}>
                {STAGE_CONFIG[selectedStage].subtitle}
              </p>
            </div>

            {/* ── LAUNCH BUTTON ── */}
            {user && isStageLockedFn(selectedStage) ? (
              <button
                onClick={() => { setPurchaseHighlightStage(selectedStage); setShowPurchaseFlow(true) }}
                className="w-full py-4 rounded-2xl text-white font-bold text-base bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Unlock {STAGE_CONFIG[selectedStage].name} — {STAGE_CONFIG[selectedStage].price}
              </button>
            ) : (
              <button
                onClick={() => handleStartInterview(selectedStage)}
                disabled={!ready}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                  ready
                    ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-200/60 active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {ready ? `Start ${STAGE_CONFIG[selectedStage].name}` : 'Complete setup to start'}
                {ready && <ChevronRight className="w-4 h-4" />}
              </button>
            )}

            {/* Subtle bundle upsell */}
            {user && PAID_STAGES.some(s => isStageLockedFn(s)) && ready && (
              <button
                onClick={() => { setPurchaseHighlightStage(undefined); setShowPurchaseFlow(true) }}
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                Unlock all 4 stages — bundle from $9.99
              </button>
            )}
          </div>
        </div>
      </div>

      {showPurchaseFlow && (
        <PurchaseFlow
          onClose={() => { setShowPurchaseFlow(false); setPurchaseHighlightStage(undefined) }}
          highlightStage={purchaseHighlightStage}
        />
      )}
    </div>
  )
}
