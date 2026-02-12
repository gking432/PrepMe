'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { User, Calendar, Clock, Target, ArrowRight, LogOut, Settings, Briefcase, Phone, Users, Crown, CheckCircle, ChevronDown, ChevronUp, ChevronRight, FileText, CreditCard, Upload, Trash2, Star, Shield } from 'lucide-react'

const STAGE_NAMES: Record<string, string> = {
  hr_screen: 'HR Screen',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final: 'Final Round',
}

const STAGE_ICONS: Record<string, any> = {
  hr_screen: Phone,
  hiring_manager: Briefcase,
  culture_fit: Users,
  final: Crown,
}

const ALL_STAGES = ['hr_screen', 'hiring_manager', 'culture_fit', 'final']

interface InterviewGroup {
  companyName: string | null
  positionTitle: string | null
  stages: {
    [key: string]: {
      sessions: any[]
      latestSession: any | null
      retakes: number
      hasFeedback: boolean
      overallScore: number | null
    }
  }
}

interface ResumeItem {
  id: string
  label: string
  resume_text: string
  is_active: boolean
  created_at: string
}

function getGroupKey(group: InterviewGroup): string {
  return `${group.companyName ?? ''}-${group.positionTitle ?? ''}`
}

function getGroupLatestDate(group: InterviewGroup): number {
  let latest = 0
  ALL_STAGES.forEach((stageKey) => {
    const stageData = group.stages[stageKey]
    if (stageData?.hasFeedback && stageData.latestSession) {
      const d = new Date(stageData.latestSession.completed_at || stageData.latestSession.created_at).getTime()
      if (d > latest) latest = d
    }
  })
  return latest
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'interviews' | 'resumes' | 'account'>('interviews')
  const [interviewGroups, setInterviewGroups] = useState<InterviewGroup[]>([])
  const [resumes, setResumes] = useState<ResumeItem[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [stageAccess, setStageAccess] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())
  const [uploadingResume, setUploadingResume] = useState(false)
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null)
  const [editingResumeLabel, setEditingResumeLabel] = useState('')
  const hasSeededExpandedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const sortedGroups = useMemo(() => {
    return [...interviewGroups].sort((a, b) => getGroupLatestDate(b) - getGroupLatestDate(a))
  }, [interviewGroups])

  useEffect(() => {
    if (sortedGroups.length > 0 && !hasSeededExpandedRef.current) {
      hasSeededExpandedRef.current = true
      setExpandedGroupKeys(new Set([getGroupKey(sortedGroups[0])]))
    }
  }, [sortedGroups])

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      // Load all data in parallel
      await Promise.all([
        loadInterviews(session),
        loadResumes(session),
        loadPaymentInfo(session),
      ])
    } else {
      router.push('/auth/login')
    }
    setLoading(false)
  }

  const loadInterviews = async (session: any) => {
    try {
      const { data: sessions, error } = await supabase
        .from('interview_sessions')
        .select(`
          id, stage, status, duration_seconds, created_at, completed_at,
          user_interview_data_id,
          user_interview_data ( job_description_text ),
          interview_feedback ( id, overall_score, created_at )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading interviews:', error)
        return
      }

      const completedSessions = (sessions || []).filter((s: any) => {
        return s.status === 'completed' && s.interview_feedback && s.interview_feedback.length > 0
      })

      const groupsMap = new Map<string, InterviewGroup>()

      completedSessions.forEach((session: any) => {
        let companyName = null
        let positionTitle = null

        if (session.user_interview_data?.job_description_text) {
          const text = session.user_interview_data.job_description_text
          const companyMatch = text.match(/^Company:\s*(.+)$/m)
          const positionMatch = text.match(/^Position:\s*(.+)$/m)
          if (companyMatch) companyName = companyMatch[1].trim()
          if (positionMatch) positionTitle = positionMatch[1].trim()
        }

        const groupKey = `${companyName || 'Unknown'}-${positionTitle || 'Unknown'}`

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, {
            companyName,
            positionTitle,
            stages: {
              hr_screen: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
              hiring_manager: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
              culture_fit: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
              final: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
            },
          })
        }

        const group = groupsMap.get(groupKey)!
        // Map legacy stage names
        const stageKey = session.stage === 'team_interview' ? 'culture_fit'
          : session.stage === 'final_interview' ? 'final'
          : session.stage

        if (group.stages[stageKey]) {
          group.stages[stageKey].sessions.push(session)

          if (!group.stages[stageKey].latestSession ||
              new Date(session.completed_at || session.created_at) >
              new Date(group.stages[stageKey].latestSession.completed_at || group.stages[stageKey].latestSession.created_at)) {
            group.stages[stageKey].latestSession = session
          }

          group.stages[stageKey].retakes = Math.max(0, group.stages[stageKey].sessions.length - 1)

          if (session.interview_feedback?.length > 0) {
            group.stages[stageKey].hasFeedback = true
            const fb = session.interview_feedback[0]
            if (fb.overall_score) group.stages[stageKey].overallScore = fb.overall_score
          }
        }
      })

      setInterviewGroups(Array.from(groupsMap.values()))
    } catch (error) {
      console.error('Error loading interviews:', error)
    }
  }

  const loadResumes = async (session: any) => {
    try {
      const { data, error } = await supabase
        .from('user_resumes')
        .select('id, label, resume_text, is_active, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setResumes(data)
      }

      // Also check user_interview_data for resumes not yet in user_resumes
      if (data && data.length === 0) {
        const { data: interviewData } = await supabase
          .from('user_interview_data')
          .select('resume_text, created_at')
          .eq('user_id', session.user.id)
          .not('resume_text', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)

        if (interviewData && interviewData.length > 0 && interviewData[0].resume_text) {
          // Migrate this resume to user_resumes
          const { data: newResume, error: insertError } = await supabase
            .from('user_resumes')
            .insert({
              user_id: session.user.id,
              label: 'My Resume',
              resume_text: interviewData[0].resume_text,
              is_active: true,
            })
            .select()
            .single()

          if (!insertError && newResume) {
            setResumes([newResume])
          }
        }
      }
    } catch (error) {
      console.error('Error loading resumes:', error)
    }
  }

  const loadPaymentInfo = async (session: any) => {
    try {
      // Load payment history
      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (payments) setPaymentHistory(payments)

      // Load stage access
      const res = await fetch('/api/payments/status')
      if (res.ok) {
        const data = await res.json()
        setStageAccess(data.stageAccess)
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Error loading payment info:', error)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingResume(true)
    try {
      let resumeText = ''

      if (file.type === 'application/pdf') {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/extract-text', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          resumeText = data.text
        }
      } else {
        resumeText = await file.text()
      }

      if (!resumeText.trim()) {
        alert('Could not extract text from the file. Please try a different file.')
        return
      }

      const { data: newResume, error } = await supabase
        .from('user_resumes')
        .insert({
          user_id: user.id,
          label: file.name.replace(/\.(pdf|txt|docx?)$/i, ''),
          resume_text: resumeText,
          is_active: resumes.length === 0, // first resume is active by default
        })
        .select()
        .single()

      if (!error && newResume) {
        setResumes(prev => [newResume, ...prev])
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
    } finally {
      setUploadingResume(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const setActiveResume = async (resumeId: string) => {
    // Deactivate all, activate the selected one
    await supabase.from('user_resumes').update({ is_active: false }).eq('user_id', user.id)
    await supabase.from('user_resumes').update({ is_active: true }).eq('id', resumeId)
    setResumes(prev => prev.map(r => ({ ...r, is_active: r.id === resumeId })))
  }

  const deleteResume = async (resumeId: string) => {
    if (!confirm('Delete this resume?')) return
    await supabase.from('user_resumes').delete().eq('id', resumeId)
    setResumes(prev => prev.filter(r => r.id !== resumeId))
  }

  const updateResumeLabel = async (resumeId: string, newLabel: string) => {
    await supabase.from('user_resumes').update({ label: newLabel }).eq('id', resumeId)
    setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, label: newLabel } : r))
    setEditingResumeId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const getCompletedCount = (group: InterviewGroup) => {
    return ALL_STAGES.filter(stage => group.stages[stage]?.hasFeedback).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <img src="/logo.svg" alt="PrepMe" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center space-x-4">
              {user?.email && (
                <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              )}
              <Link href="/dashboard" className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <button onClick={handleLogout} className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-400 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.user_metadata?.full_name || 'My Profile'}
                </h1>
                <p className="text-lg text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-400">
                  Member since {formatDate(user.created_at)}
                </p>
              </div>
            </div>
            <Link href="/dashboard" className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-lg font-medium hover:from-primary-600 hover:to-accent-500 transition-all">
              <span className="text-lg">+</span>
              <span>New Interview</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'interviews', label: 'Interviews', icon: Briefcase },
              { key: 'resumes', label: 'Resumes', icon: FileText },
              { key: 'account', label: 'Account', icon: Shield },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ===== INTERVIEWS TAB ===== */}
        {activeTab === 'interviews' && (
          <>
            {interviewGroups.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-12 text-center">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No interviews yet</h3>
                  <p className="text-gray-600 mb-6">Start your first interview to see your history here</p>
                  <Link href="/dashboard" className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-lg font-medium hover:from-primary-600 hover:to-accent-500 transition-all">
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedGroups.map((group, groupIndex) => {
                  const completedCount = getCompletedCount(group)
                  const progressPercentage = (completedCount / 4) * 100
                  const groupKey = getGroupKey(group)
                  const isExpanded = expandedGroupKeys.has(groupKey)
                  const isOnlyGroup = sortedGroups.length === 1
                  const groupTitle = group.companyName && group.positionTitle
                    ? `${group.companyName} - ${group.positionTitle}`
                    : group.companyName ? `${group.companyName} - Interview`
                    : group.positionTitle ? `${group.positionTitle} - Interview`
                    : 'Interview'

                  if (!isOnlyGroup && !isExpanded) {
                    return (
                      <div key={groupKey} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setExpandedGroupKeys(prev => new Set(prev).add(groupKey))}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">{groupTitle}</h2>
                            <p className="text-sm text-gray-600 mt-0.5">{completedCount} of 4 interviews completed</p>
                          </div>
                          <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 ml-2" />
                        </button>
                      </div>
                    )
                  }

                  return (
                    <div key={groupKey} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{groupTitle}</h2>
                            <p className="text-sm text-gray-600 mt-1">{completedCount} of 4 interviews completed</p>
                          </div>
                          {!isOnlyGroup && (
                            <button
                              type="button"
                              onClick={() => setExpandedGroupKeys(prev => {
                                const next = new Set(prev)
                                next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey)
                                return next
                              })}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg shrink-0"
                            >
                              <ChevronUp className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-6">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-accent-400 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>

                        {/* Stage Cards Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {ALL_STAGES.map(stageKey => {
                            const stageData = group.stages[stageKey]
                            if (!stageData) return null
                            const StageIcon = STAGE_ICONS[stageKey] || Briefcase
                            const isCompleted = stageData.hasFeedback
                            const latestSession = stageData.latestSession
                            const nextStage = ALL_STAGES.find(s => !group.stages[s]?.hasFeedback)
                            const isNextStep = stageKey === nextStage

                            return (
                              <div
                                key={stageKey}
                                className={`rounded-xl border-2 p-4 text-center transition-all ${
                                  isCompleted
                                    ? 'border-green-200 bg-green-50 cursor-pointer hover:border-green-300 hover:shadow-md'
                                    : isNextStep
                                    ? 'border-indigo-200 bg-indigo-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                                }`}
                                onClick={() => {
                                  if (isCompleted && latestSession) {
                                    router.push(`/interview/feedback?sessionId=${latestSession.id}&stage=${stageKey}`)
                                  }
                                }}
                              >
                                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
                                  isCompleted ? 'bg-green-100' : isNextStep ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                  <StageIcon className={`w-5 h-5 ${
                                    isCompleted ? 'text-green-600' : isNextStep ? 'text-indigo-600' : 'text-gray-400'
                                  }`} />
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                  {STAGE_NAMES[stageKey]}
                                </h3>

                                {isCompleted && (
                                  <>
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold mb-2">
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Done</span>
                                    </span>
                                    {stageData.overallScore !== null && (
                                      <p className="text-lg font-bold text-gray-900">{stageData.overallScore}/10</p>
                                    )}
                                    <p className="text-xs text-gray-500">{stageData.retakes} retake{stageData.retakes !== 1 ? 's' : ''}</p>
                                  </>
                                )}

                                {!isCompleted && isNextStep && (
                                  <Link
                                    href={`/interview?stage=${stageKey}`}
                                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 mt-2"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <span>Start</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                )}

                                {!isCompleted && !isNextStep && (
                                  <p className="text-xs text-gray-400 mt-1">Not started</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== RESUMES TAB ===== */}
        {activeTab === 'resumes' && (
          <div className="space-y-6">
            {/* Upload Button */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">My Resumes</h2>
                  <p className="text-sm text-gray-600">Manage multiple resume versions for different roles</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingResume ? 'Uploading...' : 'Upload Resume'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
              </div>

              {resumes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No resumes saved yet</p>
                  <p className="text-sm text-gray-400">Upload a PDF or text file to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map(resume => (
                    <div
                      key={resume.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                        resume.is_active ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <FileText className={`w-8 h-8 shrink-0 ${resume.is_active ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          {editingResumeId === resume.id ? (
                            <input
                              type="text"
                              value={editingResumeLabel}
                              onChange={e => setEditingResumeLabel(e.target.value)}
                              onBlur={() => updateResumeLabel(resume.id, editingResumeLabel)}
                              onKeyDown={e => e.key === 'Enter' && updateResumeLabel(resume.id, editingResumeLabel)}
                              className="text-sm font-semibold text-gray-900 border border-indigo-300 rounded px-2 py-1 w-full"
                              autoFocus
                            />
                          ) : (
                            <p
                              className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                              onClick={() => { setEditingResumeId(resume.id); setEditingResumeLabel(resume.label) }}
                            >
                              {resume.label}
                              {resume.is_active && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                  <Star className="w-3 h-3 mr-1" />Active
                                </span>
                              )}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            Uploaded {formatDate(resume.created_at)} &middot; {resume.resume_text.length.toLocaleString()} characters
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!resume.is_active && (
                          <button
                            onClick={() => setActiveResume(resume.id)}
                            className="text-xs px-3 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => deleteResume(resume.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== ACCOUNT TAB ===== */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Plan</h2>
              {subscription?.active ? (
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                  <div>
                    <p className="font-semibold text-indigo-900">Monthly Subscription</p>
                    <p className="text-sm text-indigo-700">
                      {subscription.interviewsUsed} of {subscription.interviewsMax} interviews used this period
                    </p>
                    <p className="text-xs text-indigo-500 mt-1">
                      Renews {formatDate(subscription.periodEnd)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">Active</span>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="font-semibold text-gray-900">Free Tier</p>
                  <p className="text-sm text-gray-600 mt-1">HR Screen interviews are free. Purchase access to advanced stages individually or as a bundle.</p>
                </div>
              )}

              {/* Stage Credits */}
              {stageAccess && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ALL_STAGES.map(stage => {
                    const access = stageAccess[stage]
                    return (
                      <div key={stage} className={`p-3 rounded-lg border ${
                        access?.hasAccess ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <p className="text-xs font-medium text-gray-600">{STAGE_NAMES[stage]}</p>
                        {stage === 'hr_screen' ? (
                          <p className="text-sm font-semibold text-green-700">Free</p>
                        ) : access?.hasAccess ? (
                          <p className="text-sm font-semibold text-green-700">
                            {access.source === 'subscription' ? 'Subscribed' : `${access.creditsRemaining} left`}
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-gray-400">Locked</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
              {paymentHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No payments yet</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {paymentHistory.map(payment => (
                    <div key={payment.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{payment.product_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(payment.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">${(payment.amount_cents / 100).toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Account</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Name</p>
                    <p className="text-sm text-gray-600">{user.user_metadata?.full_name || 'Not set'}</p>
                  </div>
                </div>
                <hr />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
