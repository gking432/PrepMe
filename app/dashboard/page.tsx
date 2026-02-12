'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import FileUpload from '@/components/FileUpload'
import Link from 'next/link'
import { LogOut, Play, Globe, FileText, User, ChevronRight, CheckCircle2 } from 'lucide-react'

type InterviewStage = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const STAGE_CONFIG: Record<InterviewStage, { name: string; subtitle: string; icon: string }> = {
  hr_screen: { name: 'HR Screen', subtitle: 'Phone screening with recruiter', icon: '1' },
  hiring_manager: { name: 'Hiring Manager', subtitle: 'Deep-dive with your future boss', icon: '2' },
  culture_fit: { name: 'Culture Fit', subtitle: 'Team & values alignment', icon: '3' },
  final: { name: 'Final Round', subtitle: 'Executive-level evaluation', icon: '4' },
}

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
  const [fetchingJobDescription, setFetchingJobDescription] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [createAccountChecked, setCreateAccountChecked] = useState(true)
  const [extractedUserInfo, setExtractedUserInfo] = useState<{
    email: string | null
    name: string | null
    phone: string | null
  }>({ email: null, name: null, phone: null })
  const [showSetup, setShowSetup] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadInterviewData()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) setUser(session.user)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
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

  const handleStartInterview = async (stage: InterviewStage = selectedStage) => {
    if (!canStartInterview()) return

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <img src="/logo.svg" alt="PrepMe" className="h-9 w-auto" />
            </Link>
            <div className="flex items-center gap-1">
              {user && (
                <Link href="/profile" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              )}
              {user ? (
                <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              ) : (
                <Link href="/auth/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {interviewData.positionTitle && interviewData.companyName
              ? `${interviewData.positionTitle} at ${interviewData.companyName}`
              : user ? 'Interview Prep' : 'Get Started'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {canStartInterview()
              ? 'Your materials are ready. Choose a stage to begin practicing.'
              : 'Upload your resume and job description to get started.'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Interview stages */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Interview Stages</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {(['hr_screen', 'hiring_manager', 'culture_fit', 'final'] as const).map((s) => {
                  const config = STAGE_CONFIG[s]
                  const isSelected = selectedStage === s
                  const isReady = canStartInterview()

                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedStage(s)}
                      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                          {config.name}
                        </p>
                        <p className="text-xs text-gray-500">{config.subtitle}</p>
                      </div>
                      {isSelected && isReady && (
                        <ChevronRight className="w-4 h-4 text-primary-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => handleStartInterview(selectedStage)}
                  disabled={!canStartInterview() || saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start {STAGE_CONFIG[selectedStage].name}</span>
                </button>
                {!canStartInterview() && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Upload resume & job description first
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Materials */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 text-sm">Materials</h2>
                <button onClick={() => setShowSetup(!showSetup)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  {showSetup ? 'Collapse' : 'Edit'}
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {hasResume ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                  <span className={`text-sm ${hasResume ? 'text-gray-900' : 'text-gray-400'}`}>Resume {hasResume ? 'uploaded' : 'needed'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasJobDesc ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                  <span className={`text-sm ${hasJobDesc ? 'text-gray-900' : 'text-gray-400'}`}>Job description {hasJobDesc ? 'added' : 'needed'}</span>
                </div>
              </div>
            </div>

            {/* Setup form */}
            {showSetup && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                {/* Resume */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Resume <span className="text-red-500">*</span></label>
                  <FileUpload
                    label=""
                    onFileUploaded={(file, text) => {
                      setInterviewData({ ...interviewData, resumeFile: { name: file.name, text }, resumeText: text })
                      extractUserInfoFromResume(text)
                    }}
                    onFileRemoved={() => {
                      setInterviewData({ ...interviewData, resumeFile: null, resumeText: '' })
                      setExtractedUserInfo({ email: null, name: null, phone: null })
                    }}
                    currentFile={interviewData.resumeFile || undefined}
                  />
                  {!interviewData.resumeFile && (
                    <textarea
                      value={interviewData.resumeText}
                      onChange={(e) => {
                        setInterviewData({ ...interviewData, resumeText: e.target.value })
                        extractUserInfoFromResume(e.target.value)
                      }}
                      rows={3}
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="Or paste resume text..."
                    />
                  )}
                  {!user && (interviewData.resumeFile || interviewData.resumeText) && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={createAccountChecked} onChange={(e) => setCreateAccountChecked(e.target.checked)} className="w-3.5 h-3.5 text-primary-500 border-gray-300 rounded" />
                      <span className="text-xs text-gray-600">{extractedUserInfo.email ? `Use ${extractedUserInfo.email} to create account` : 'Create free account'}</span>
                    </label>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Job Description <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={interviewData.jobDescriptionUrl || ''}
                      onChange={(e) => { setInterviewData({ ...interviewData, jobDescriptionUrl: e.target.value }); if (fetchError) setFetchError(null) }}
                      onKeyPress={(e) => { if (e.key === 'Enter') handleFetchJobDescription() }}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Job posting URL..."
                    />
                    <button onClick={handleFetchJobDescription} disabled={!interviewData.jobDescriptionUrl || fetchingJobDescription} className="px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium shrink-0">
                      {fetchingJobDescription ? '...' : 'Fetch'}
                    </button>
                  </div>
                  {fetchError && <p className="text-xs text-red-600 mb-2">{fetchError}</p>}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" value={interviewData.companyName || ''} onChange={(e) => setInterviewData({ ...interviewData, companyName: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Company" />
                    <input type="text" value={interviewData.positionTitle || ''} onChange={(e) => setInterviewData({ ...interviewData, positionTitle: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Position" />
                  </div>
                  <textarea
                    value={interviewData.jobDescriptionText}
                    onChange={(e) => { setInterviewData({ ...interviewData, jobDescriptionText: e.target.value }); if (fetchError) setFetchError(null) }}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="Or paste job description..."
                  />
                </div>

                {/* Company Website */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Company Website <span className="text-gray-400">(optional)</span></label>
                  <input type="url" value={interviewData.companyWebsite} onChange={(e) => setInterviewData({ ...interviewData, companyWebsite: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="https://company.com" />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes <span className="text-gray-400">(optional)</span></label>
                  <textarea value={interviewData.notes} onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" placeholder="Any context..." />
                </div>

                {user && (
                  <button onClick={handleSave} disabled={saving} className="w-full px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors">
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
