'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { User, Calendar, Clock, Target, ArrowRight, LogOut, Settings, Briefcase, Phone, Users, Crown, CheckCircle, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'

const STAGE_NAMES: Record<string, string> = {
  hr_screen: 'HR Screen',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final_interview: 'Final Interview',
  team_interview: 'Team Interview',
}

const STAGE_ICONS: Record<string, any> = {
  hr_screen: Phone,
  hiring_manager: Briefcase,
  culture_fit: Users,
  final_interview: Crown,
  team_interview: Users,
}

const ALL_STAGES = ['hr_screen', 'hiring_manager', 'culture_fit', 'final_interview']

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

function getGroupKey(group: InterviewGroup): string {
  return `${group.companyName ?? ''}-${group.positionTitle ?? ''}`
}

function getGroupLatestDate(group: InterviewGroup): number {
  let latest = 0
  ALL_STAGES.forEach((stageKey) => {
    const stageData = group.stages[stageKey]
    if (stageData.hasFeedback && stageData.latestSession) {
      const d = new Date(stageData.latestSession.completed_at || stageData.latestSession.created_at).getTime()
      if (d > latest) latest = d
    }
  })
  return latest
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [interviewGroups, setInterviewGroups] = useState<InterviewGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())
  const hasSeededExpandedRef = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  // Sort groups by most recent activity first; default-expand the first (most recent)
  const sortedGroups = useMemo(() => {
    return [...interviewGroups].sort((a, b) => getGroupLatestDate(b) - getGroupLatestDate(a))
  }, [interviewGroups])

  // Seed expanded state with first (most recent) group so it starts expanded; only once
  useEffect(() => {
    if (sortedGroups.length > 0 && !hasSeededExpandedRef.current) {
      hasSeededExpandedRef.current = true
      setExpandedGroupKeys(new Set([getGroupKey(sortedGroups[0])]))
    }
  }, [sortedGroups])

  useEffect(() => {
    checkUser()
    loadInterviews()
  }, [])

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
    } else {
      // Redirect to login if not authenticated
      router.push('/auth/login')
    }
    setLoading(false)
  }

  const loadInterviews = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setLoading(false)
        return
      }

      // Fetch only completed interview sessions for the user
      const { data: sessions, error } = await supabase
        .from('interview_sessions')
        .select(`
          id,
          stage,
          status,
          duration_seconds,
          created_at,
          completed_at,
          user_interview_data_id,
          user_interview_data (
            job_description_text
          ),
          interview_feedback (
            id,
            overall_score,
            created_at
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading interviews:', error)
      } else {
        // Double-check: Filter out any non-completed interviews AND interviews without feedback
        // "Processing" status means completed but no feedback yet - these should not be shown
        const completedSessions = (sessions || []).filter((session: any) => {
          const hasFeedback = session.interview_feedback && session.interview_feedback.length > 0
          return session.status === 'completed' && hasFeedback
        })

        // Group interviews by company/position
        const groupsMap = new Map<string, InterviewGroup>()

        completedSessions.forEach((session: any) => {
          let companyName = null
          let positionTitle = null
          
          // Extract from job_description_text if available
          if (session.user_interview_data && session.user_interview_data.job_description_text) {
            const text = session.user_interview_data.job_description_text
            const companyMatch = text.match(/^Company:\s*(.+)$/m)
            const positionMatch = text.match(/^Position:\s*(.+)$/m)
            
            if (companyMatch) {
              companyName = companyMatch[1].trim()
            }
            if (positionMatch) {
              positionTitle = positionMatch[1].trim()
            }
          }

          // Create a key for grouping (company + position)
          const groupKey = `${companyName || 'Unknown'}-${positionTitle || 'Unknown'}`
          
          if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, {
              companyName,
              positionTitle,
              stages: {
                hr_screen: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
                hiring_manager: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
                culture_fit: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
                final_interview: { sessions: [], latestSession: null, retakes: 0, hasFeedback: false, overallScore: null },
              }
            })
          }

          const group = groupsMap.get(groupKey)!
          const stageKey = session.stage === 'team_interview' ? 'culture_fit' : session.stage
          
          // Map final_interview if needed
          const mappedStage = stageKey === 'final_interview' ? 'final_interview' : 
                            stageKey === 'hiring_manager' ? 'hiring_manager' :
                            stageKey === 'culture_fit' ? 'culture_fit' :
                            'hr_screen'

          if (group.stages[mappedStage]) {
            group.stages[mappedStage].sessions.push(session)
            
            // Update latest session (most recent)
            if (!group.stages[mappedStage].latestSession || 
                new Date(session.completed_at || session.created_at) > 
                new Date(group.stages[mappedStage].latestSession.completed_at || group.stages[mappedStage].latestSession.created_at)) {
              group.stages[mappedStage].latestSession = session
            }

            // Count retakes (sessions - 1, since first attempt is not a retake)
            group.stages[mappedStage].retakes = Math.max(0, group.stages[mappedStage].sessions.length - 1)

            // Check for feedback
            const hasFeedback = session.interview_feedback && session.interview_feedback.length > 0
            if (hasFeedback) {
              group.stages[mappedStage].hasFeedback = true
              const feedback = session.interview_feedback[0]
              if (feedback.overall_score) {
                group.stages[mappedStage].overallScore = feedback.overall_score
              }
            }
          }
        })

        setInterviewGroups(Array.from(groupsMap.values()))
      }
    } catch (error) {
      console.error('Error loading interviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCompletedCount = (group: InterviewGroup) => {
    return ALL_STAGES.filter(stage => group.stages[stage]?.hasFeedback).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <img
                src="/logo.svg"
                alt="PrepMe"
                className="h-12 w-auto"
              />
            </Link>
            <div className="flex items-center space-x-4">
              {user?.email && (
                <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              )}
              <Link
                href="/dashboard"
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/admin?test=true"
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-400 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <p className="text-lg text-gray-600">{user.email}</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-xl">+</span>
              <span>New Interview</span>
            </Link>
          </div>
        </div>

        {/* Interviews Section */}
        {interviewGroups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-12 text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No interviews yet</h3>
              <p className="text-gray-600 mb-6">
                Start your first interview to see it here
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-lg font-medium hover:from-primary-600 hover:to-accent-500 transition-all"
              >
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

              // Find the most recent completed interview session
              let mostRecentSession: any = null
              let mostRecentStage: string | null = null
              let mostRecentDate: Date | null = null

              ALL_STAGES.forEach((stageKey) => {
                const stageData = group.stages[stageKey]
                if (stageData.hasFeedback && stageData.latestSession) {
                  const sessionDate = new Date(stageData.latestSession.completed_at || stageData.latestSession.created_at)
                  if (!mostRecentDate || sessionDate > mostRecentDate) {
                    mostRecentDate = sessionDate
                    mostRecentSession = stageData.latestSession
                    mostRecentStage = stageKey
                  }
                }
              })

              // Condensed row for non–most-recent groups (when there are multiple)
              if (!isOnlyGroup && !isExpanded) {
                return (
                  <div
                    key={groupKey}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGroupKeys((prev) => new Set(prev).add(groupKey))}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {group.companyName && group.positionTitle
                            ? `${group.companyName} - ${group.positionTitle}`
                            : group.companyName
                            ? `${group.companyName} - Interview`
                            : group.positionTitle
                            ? `${group.positionTitle} - Interview`
                            : 'Interview'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {completedCount} of 4 interviews completed
                        </p>
                      </div>
                      <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 ml-2" />
                    </button>
                  </div>
                )
              }

              return (
                <div key={groupKey} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  {/* Header with Company/Position */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          {mostRecentSession && mostRecentStage ? (
                            <Link
                              href={`/interview/feedback?sessionId=${mostRecentSession.id}&stage=${mostRecentStage}`}
                              className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors group"
                            >
                              <span>
                                {group.companyName && group.positionTitle
                                  ? `${group.companyName} - ${group.positionTitle}`
                                  : group.companyName
                                  ? `${group.companyName} - Interview`
                                  : group.positionTitle
                                  ? `${group.positionTitle} - Interview`
                                  : 'Interview'}
                              </span>
                              <ChevronRight className="w-6 h-6 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          ) : (
                            <Link
                              href="/dashboard"
                              className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors group"
                            >
                              <span>
                                {group.companyName && group.positionTitle
                                  ? `${group.companyName} - ${group.positionTitle}`
                                  : group.companyName
                                  ? `${group.companyName} - Interview`
                                  : group.positionTitle
                                  ? `${group.positionTitle} - Interview`
                                  : 'Interview'}
                              </span>
                              <ChevronRight className="w-6 h-6 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {completedCount} of 4 interviews completed
                          </p>
                        </div>
                      </div>
                      {!isOnlyGroup && (
                        <button
                          type="button"
                          onClick={() => setExpandedGroupKeys((prev) => {
                            const next = new Set(prev)
                            if (next.has(groupKey)) next.delete(groupKey)
                            else next.add(groupKey)
                            return next
                          })}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg shrink-0"
                          title={expandedGroupKeys.has(groupKey) || groupIndex === 0 ? 'Collapse' : 'Expand'}
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    {/* Interview Stages - Horizontal Layout */}
                    <div className="relative mb-4">
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-6">
                        <div 
                          className="bg-gradient-to-r from-primary-500 to-accent-400 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      
                      {/* Interview Titles - Horizontal */}
                      <div className="grid grid-cols-4 gap-4">
                        {ALL_STAGES.map((stageKey, index) => {
                          const stageData = group.stages[stageKey]
                          const StageIcon = STAGE_ICONS[stageKey] || Briefcase
                          const isCompleted = stageData.hasFeedback
                          const latestSession = stageData.latestSession
                          const progressWidth = (index + 1) * 25 // 25%, 50%, 75%, 100%
                          const nextStageInCadence = ALL_STAGES.find(s => !group.stages[s]?.hasFeedback)
                          const isNextStep = stageKey === nextStageInCadence

                          return (
                            <div
                              key={stageKey}
                              className={`relative ${isCompleted ? 'cursor-pointer' : ''}`}
                              onClick={() => {
                                if (isCompleted && latestSession) {
                                  router.push(`/interview/feedback?sessionId=${latestSession.id}&stage=${stageKey}`)
                                }
                              }}
                            >
                              {/* Progress indicator line */}
                              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
                                <div className={`w-0.5 h-6 ${isCompleted ? 'bg-primary-500' : isNextStep ? 'bg-primary-400' : 'bg-gray-300'}`}></div>
                              </div>
                              
                              <div className={`text-center ${isCompleted ? 'hover:opacity-80 transition-opacity' : isNextStep ? '' : 'opacity-60'}`}>
                                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
                                  isCompleted ? 'bg-primary-100' : isNextStep ? 'bg-primary-100' : 'bg-gray-100'
                                }`}>
                                  <StageIcon className={`w-5 h-5 ${isCompleted ? 'text-primary-500' : isNextStep ? 'text-primary-600' : 'text-gray-400'}`} />
                                </div>
                                <h3 className={`text-sm font-semibold mb-1 ${isCompleted ? 'text-gray-900' : isNextStep ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {STAGE_NAMES[stageKey] || stageKey}
                                </h3>
                                {isCompleted && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold mb-2">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Done</span>
                                  </span>
                                )}
                                
                                {isCompleted && latestSession && (
                                  <div className="space-y-1 mt-2">
                                    {stageData.overallScore !== null && (
                                      <div className="flex items-center justify-center space-x-1">
                                        <Target className="w-3 h-3 text-primary-500" />
                                        <span className="text-xs font-semibold text-gray-700">
                                          {stageData.overallScore}/10
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-xs text-gray-600">
                                      Retakes: {stageData.retakes}
                                    </p>
                                  </div>
                                )}
                                
                                {!isCompleted && (
                                  <div className="mt-2 space-y-2">
                                    <p className={`text-xs italic ${isNextStep ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                                      {isNextStep ? 'Next step' : 'Not started'}
                                    </p>
                                    {isNextStep ? (
                                      <Link
                                        href={`/interview?stage=${stageKey}`}
                                        className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-lg text-sm font-semibold hover:from-primary-600 hover:to-accent-500 shadow-md transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span>Start interview</span>
                                        <ArrowRight className="w-4 h-4" />
                                      </Link>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
