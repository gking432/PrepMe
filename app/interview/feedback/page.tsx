"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import Header from '@/components/Header'
import { Phone, Users, Briefcase, Target, TrendingUp, TrendingDown, Lock, ArrowRight, CheckCircle, AlertCircle, Clock, Crown, Mic, MicOff, MessageCircle, X, RefreshCw, User } from 'lucide-react'
import DetailedRubricReport from '@/components/DetailedRubricReport'
import DetailedHmRubricReport from '@/components/DetailedHmRubricReport'
import PurchaseFlow from '@/components/PurchaseFlow'

export default function InterviewDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isPremium, setIsPremium] = useState(false)
  const [stageAccess, setStageAccess] = useState<Record<string, any>>({})
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [areaScores, setAreaScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackGenerating, setFeedbackGenerating] = useState(false)
  const [pollingAttempts, setPollingAttempts] = useState(0)
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)
  const [accountPromptDismissed, setAccountPromptDismissed] = useState(false)
  const [defaultTabSet, setDefaultTabSet] = useState(false)
  const [structuredTranscript, setStructuredTranscript] = useState<any>(null)
  const [currentSessionData, setCurrentSessionData] = useState<any>(null)
  const [hasTranscript, setHasTranscript] = useState(false)
  const [regeneratingFeedback, setRegeneratingFeedback] = useState(false)
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null) // Track which criterion is expanded
  const [practiceData, setPracticeData] = useState<Record<string, any>>({}) // Store practice data per question
  const [practiceResponse, setPracticeResponse] = useState<Record<string, string>>({}) // Store responses per question
  const [practiceFeedback, setPracticeFeedback] = useState<Record<string, any>>({}) // Store feedback per question
  const [practiceLoading, setPracticeLoading] = useState<Record<string, boolean>>({}) // Loading state per question
  const [practiceRecording, setPracticeRecording] = useState<Record<string, boolean>>({}) // Recording state per question
  const [practicePlayingQuestion, setPracticePlayingQuestion] = useState<Record<string, boolean>>({}) // Playing question audio
  const [practicePlayingFeedback, setPracticePlayingFeedback] = useState<Record<string, boolean>>({}) // Playing feedback audio
  const [showFeedbackChatTooltip, setShowFeedbackChatTooltip] = useState(true) // Show tooltip on initial load
  const [strengthCarouselIndex, setStrengthCarouselIndex] = useState(0)
  const [improveCarouselIndex, setImproveCarouselIndex] = useState(0)
  const [hmStrengthCarouselIndex, setHmStrengthCarouselIndex] = useState(0)
  const [hmImproveCarouselIndex, setHmImproveCarouselIndex] = useState(0)
  const [cfStrengthCarouselIndex, setCfStrengthCarouselIndex] = useState(0)
  const [cfImproveCarouselIndex, setCfImproveCarouselIndex] = useState(0)
  const [frStrengthCarouselIndex, setFrStrengthCarouselIndex] = useState(0)
  const [frImproveCarouselIndex, setFrImproveCarouselIndex] = useState(0)
  const [practicedCriteria, setPracticedCriteria] = useState<string[]>([])
  const [passedCriteria, setPassedCriteria] = useState<string[]>([])
  const [activePracticeCriterion, setActivePracticeCriterion] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showRubricModal, setShowRubricModal] = useState(false)
  const [showHmRubricModal, setShowHmRubricModal] = useState(false)
  const [showCfRubricModal, setShowCfRubricModal] = useState(false)
  const [showFrRubricModal, setShowFrRubricModal] = useState(false)
  const [showAreasToStudy, setShowAreasToStudy] = useState(false)
  const [showPredictedQuestions, setShowPredictedQuestions] = useState(false)
  const [showStep4, setShowStep4] = useState(false)
  const mediaRecorderRefs = useRef<Record<string, MediaRecorder>>({})
  const audioChunksRefs = useRef<Record<string, Blob[]>>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadFeedback()
    
    // Check if user just signed up and needs to migrate data
    const checkMigration = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (session) {
        const tempData = localStorage.getItem('temp_interview_data')
        if (tempData) {
          // User just signed up, migrate their data
          await migrateLocalStorageToAccount()
        }
      }
    }
    
    // Check for migration after a short delay (to ensure session is established)
    const migrationTimer = setTimeout(checkMigration, 1000)
    return () => clearTimeout(migrationTimer)
  }, [])

  // Poll for feedback if it's still generating (up to 60 seconds)
  useEffect(() => {
    if (feedbackGenerating && pollingAttempts < 12) { // 12 attempts * 5 seconds = 60 seconds max
      const pollInterval = setInterval(async () => {
        setPollingAttempts(prev => prev + 1)
        await loadFeedback()
      }, 5000) // Poll every 5 seconds

      return () => clearInterval(pollInterval)
    } else if (pollingAttempts >= 12) {
      setFeedbackGenerating(false)
      console.error('Feedback generation timed out after 60 seconds')
    }
  }, [feedbackGenerating, pollingAttempts])

  // Check if user is anonymous and prompt to create account before leaving
  useEffect(() => {
    const checkAnonymous = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (!session) {
        const tempData = localStorage.getItem('temp_interview_data')
        const lastSessionId = localStorage.getItem('last_interview_session_id')
        
        if (tempData || lastSessionId) {
          setIsAnonymous(true)
          setShowAccountPrompt(true)
          
          // Show prompt when user tries to leave
          const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = 'You have interview data that will be lost. Create an account to save it?'
            return e.returnValue
          }

          window.addEventListener('beforeunload', handleBeforeUnload)

          return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
          }
        }
      }
    }
    checkAnonymous()
  }, [])

  // Auto-hide tooltip after 5 seconds
  useEffect(() => {
    if (showFeedbackChatTooltip) {
      const timer = setTimeout(() => {
        setShowFeedbackChatTooltip(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showFeedbackChatTooltip])

  // Prevent body scroll when modal is open and handle ESC key
  useEffect(() => {
    if (showRubricModal) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowRubricModal(false)
        }
      }
      document.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEsc)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showRubricModal])

  // Prevent body scroll when HM modal is open and handle ESC key
  useEffect(() => {
    if (showHmRubricModal) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowHmRubricModal(false)
        }
      }
      document.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEsc)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showHmRubricModal])

  // Prevent body scroll when CF modal is open and handle ESC key
  useEffect(() => {
    if (showCfRubricModal) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowCfRubricModal(false)
        }
      }
      document.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEsc)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showCfRubricModal])

  // Prevent body scroll when FR modal is open and handle ESC key
  useEffect(() => {
    if (showFrRubricModal) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowFrRubricModal(false)
        }
      }
      document.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEsc)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showFrRubricModal])

  const loadFeedback = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      let sessionData = null

      // First, check if sessionId is provided in URL params (from profile page)
      const sessionIdFromUrl = searchParams?.get('sessionId')
      if (sessionIdFromUrl) {
        const { data: sessionById } = await supabase
          .from('interview_sessions')
          .select('id, stage, completed_at, created_at, duration_seconds')
          .eq('id', sessionIdFromUrl)
          .maybeSingle()
        
        if (sessionById) {
          sessionData = sessionById
          console.log('Found session from URL params:', sessionById.id)
        }
      }

      // If no session from URL, try to get the MOST RECENT completed session (prioritize by completed_at, not localStorage)
      // First, try by user_id if logged in (most reliable)
      if (!sessionData && session) {
        const { data: sessionByUser } = await supabase
          .from('interview_sessions')
          .select('id, stage, completed_at')
          .eq('user_id', session.user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (sessionByUser) {
          sessionData = sessionByUser
          console.log('Found most recent session by user_id:', sessionByUser.id)
        }
      }

      // If no session found by user_id, try localStorage (for anonymous users)
      if (!sessionData) {
        const lastSessionId = localStorage.getItem('last_interview_session_id')
        
        if (lastSessionId) {
          // Load feedback by session ID (works for both logged-in and anonymous users)
          const { data: sessionById } = await supabase
            .from('interview_sessions')
            .select('id, stage, completed_at, created_at, duration_seconds')
            .eq('id', lastSessionId)
            .eq('status', 'completed')
            .maybeSingle()
          
          if (sessionById) {
            sessionData = sessionById
            console.log('Found session from localStorage:', sessionById.id)
          } else {
            console.log('Session from localStorage not found or not completed:', lastSessionId)
          }
        }
      }

      // If still no session, try to find ANY completed session (fallback)
      if (!sessionData) {
        const { data: anySession } = await supabase
          .from('interview_sessions')
          .select('id, stage, completed_at, created_at, duration_seconds')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (anySession) {
          sessionData = anySession
          console.log('Found any completed session (fallback):', anySession.id)
        }
      }

      if (sessionData) {
        console.log('Found session data:', sessionData.id)
        setCurrentSessionData(sessionData) // Store session data in state
        
        // Set default tab to the most recent completed interview
        // Map stage to tab ID (do this as soon as we find a session)
        if (!defaultTabSet) {
          let defaultTabId = 'overview'
          
          // Check if stage is provided in URL params (from profile page)
          const stageFromUrl = searchParams?.get('stage')
          const stageToUse = stageFromUrl || sessionData.stage
          
          // Map session stage to tab ID
          if (stageToUse === 'hr_screen') {
            defaultTabId = 'hr-screen'
          } else if (stageToUse === 'hiring_manager') {
            defaultTabId = 'hiring-manager-1'
          } else if (stageToUse === 'culture_fit') {
            defaultTabId = 'culture-fit'
          } else if (stageToUse === 'final_interview') {
            defaultTabId = 'hiring-manager-2'
          }
          
          setActiveTab(defaultTabId)
          setDefaultTabSet(true)
          console.log('Set default tab to:', defaultTabId, 'based on stage:', stageToUse)
        }
        
        // Load feedback for this session
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('interview_feedback')
          .select('*')
          .eq('interview_session_id', sessionData.id)
          .maybeSingle()

        if (feedbackError) {
          console.error('Error loading feedback:', feedbackError)
        }

        if (feedbackData) {
          console.log('Feedback found:', feedbackData.id)
          console.log('📊 Feedback data keys:', Object.keys(feedbackData))
          console.log('📊 Has full_rubric?', !!feedbackData.full_rubric)
          console.log('📊 full_rubric type:', typeof feedbackData.full_rubric)
          if (feedbackData.full_rubric) {
            console.log('📊 full_rubric keys:', Object.keys(feedbackData.full_rubric))
            console.log('📊 full_rubric structure:', {
              has_overall_assessment: !!feedbackData.full_rubric.overall_assessment,
              has_traditional_hr_criteria: !!feedbackData.full_rubric.traditional_hr_criteria,
              has_time_management: !!feedbackData.full_rubric.time_management_analysis,
              has_question_analysis: !!feedbackData.full_rubric.question_analysis,
              has_next_steps: !!feedbackData.full_rubric.next_steps_preparation,
              has_comparative: !!feedbackData.full_rubric.comparative_analysis,
              has_six_areas: !!feedbackData.full_rubric.hr_screen_six_areas,
            })
            // Log the actual structure for debugging
            if (feedbackData.full_rubric.traditional_hr_criteria) {
              console.log('📊 traditional_hr_criteria structure:', {
                has_scores: !!feedbackData.full_rubric.traditional_hr_criteria.scores,
                has_feedback: !!feedbackData.full_rubric.traditional_hr_criteria.feedback,
                scores_keys: feedbackData.full_rubric.traditional_hr_criteria.scores ? Object.keys(feedbackData.full_rubric.traditional_hr_criteria.scores) : [],
              })
            }
          } else {
            console.log('⚠️ full_rubric is missing - this means Claude grading may not have run or failed')
          }
          
          // For HR screen: Use full_rubric data if available (from Claude grader)
          if (sessionData.stage === 'hr_screen' && feedbackData.full_rubric) {
            // Extract hr_screen_six_areas from full_rubric
            if (feedbackData.full_rubric.hr_screen_six_areas) {
              feedbackData.hr_screen_six_areas = feedbackData.full_rubric.hr_screen_six_areas
            }

            // Extract strengths/weaknesses from full_rubric if not already set
            if (!feedbackData.strengths && feedbackData.full_rubric.overall_assessment?.key_strengths) {
              feedbackData.strengths = feedbackData.full_rubric.overall_assessment.key_strengths
            }
            if (!feedbackData.weaknesses && feedbackData.full_rubric.overall_assessment?.key_weaknesses) {
              feedbackData.weaknesses = feedbackData.full_rubric.overall_assessment.key_weaknesses
            }

            // Extract suggestions from full_rubric if not already set
            if (!feedbackData.suggestions && feedbackData.full_rubric.next_steps_preparation?.improvement_suggestions) {
              feedbackData.suggestions = feedbackData.full_rubric.next_steps_preparation.improvement_suggestions
            }

            // Extract entire next_steps_preparation object from full_rubric
            if (feedbackData.full_rubric.next_steps_preparation) {
              feedbackData.next_steps_preparation = feedbackData.full_rubric.next_steps_preparation
            }
          }

          // For Hiring Manager: Use full_rubric data if available (from Claude grader)
          if (sessionData.stage === 'hiring_manager' && feedbackData.full_rubric) {
            // Extract hiring_manager_six_areas from full_rubric
            if (feedbackData.full_rubric.hiring_manager_six_areas) {
              feedbackData.hiring_manager_six_areas = feedbackData.full_rubric.hiring_manager_six_areas
            }

            // Extract role_specific_criteria from full_rubric
            if (feedbackData.full_rubric.role_specific_criteria) {
              feedbackData.role_specific_criteria = feedbackData.full_rubric.role_specific_criteria
            }

            // Extract cross_stage_progress from full_rubric
            if (feedbackData.full_rubric.cross_stage_progress) {
              feedbackData.cross_stage_progress = feedbackData.full_rubric.cross_stage_progress
            }

            // Extract strengths/weaknesses from full_rubric if not already set
            if (!feedbackData.strengths && feedbackData.full_rubric.overall_assessment?.key_strengths) {
              feedbackData.strengths = feedbackData.full_rubric.overall_assessment.key_strengths
            }
            if (!feedbackData.weaknesses && feedbackData.full_rubric.overall_assessment?.key_weaknesses) {
              feedbackData.weaknesses = feedbackData.full_rubric.overall_assessment.key_weaknesses
            }

            // Extract suggestions from full_rubric if not already set
            if (!feedbackData.suggestions && feedbackData.full_rubric.next_steps_preparation?.improvement_suggestions) {
              feedbackData.suggestions = feedbackData.full_rubric.next_steps_preparation.improvement_suggestions
            }

            // Extract entire next_steps_preparation object from full_rubric
            if (feedbackData.full_rubric.next_steps_preparation) {
              feedbackData.next_steps_preparation = feedbackData.full_rubric.next_steps_preparation
            }
          }
          
          // Load structured transcript for all stages
          if (['hr_screen', 'hiring_manager', 'culture_fit', 'final'].includes(sessionData.stage)) {
            console.log('Loading structured transcript for session:', sessionData.id)
            const { data: sessionWithTranscript, error: transcriptError } = await supabase
              .from('interview_sessions')
              .select('transcript_structured, transcript')
              .eq('id', sessionData.id)
              .single()

            if (transcriptError) {
              console.error('Error loading transcript:', transcriptError)
            }

            if (sessionWithTranscript?.transcript_structured) {
              console.log('Found structured transcript:', {
                messageCount: sessionWithTranscript.transcript_structured.messages?.length || 0,
                questionCount: sessionWithTranscript.transcript_structured.questions_asked?.length || 0
              })
              setStructuredTranscript(sessionWithTranscript.transcript_structured)
            } else if (sessionWithTranscript?.transcript) {
              // Fallback: Parse plain text transcript into structured format
              console.log('No structured transcript, but found plain text transcript. Parsing...')
              console.log('Transcript preview (first 500 chars):', sessionWithTranscript.transcript.substring(0, 500))
              const plainTranscript = sessionWithTranscript.transcript
              const messages: any[] = []
              const questions_asked: any[] = []

              // Parse "You: ..." and "Interviewer: ..." format
              // Also handle lines without prefix (alternating pattern)
              const lines = plainTranscript.split('\n').filter((line: string) => line.trim().length > 0)
              console.log('Total lines to parse:', lines.length)
              let questionCounter = 0
              let timeSeconds = 0
              let lastSpeaker: 'candidate' | 'interviewer' | null = null

              lines.forEach((line: string, idx: number) => {
                const trimmedLine = line.trim()

                if (trimmedLine.startsWith('You:')) {
                  const text = trimmedLine.replace(/^You:\s*/, '')
                  if (text.length > 0) {
                    const minutes = Math.floor(timeSeconds / 60)
                    const seconds = timeSeconds % 60
                    messages.push({
                      speaker: 'candidate',
                      text: text,
                      timestamp: `${minutes}:${String(seconds).padStart(2, '0')}`
                    })
                    timeSeconds += 30 // Estimate 30 seconds per response
                    lastSpeaker = 'candidate'
                    console.log(`Parsed candidate message ${messages.length}:`, text.substring(0, 50))
                  }
                } else if (trimmedLine.startsWith('Interviewer:')) {
                  const text = trimmedLine.replace(/^Interviewer:\s*/, '')
                  if (text.length > 0) {
                    const isQuestion = text.includes('?') ||
                      text.toLowerCase().startsWith('tell me') ||
                      text.toLowerCase().startsWith('what') ||
                      text.toLowerCase().startsWith('why') ||
                      text.toLowerCase().startsWith('how') ||
                      text.toLowerCase().startsWith('can you') ||
                      text.toLowerCase().startsWith('would you')

                    const questionId = isQuestion ? `q${++questionCounter}` : undefined

                    const minutes = Math.floor(timeSeconds / 60)
                    const seconds = timeSeconds % 60
                    messages.push({
                      speaker: 'interviewer',
                      text: text,
                      timestamp: `${minutes}:${String(seconds).padStart(2, '0')}`,
                      question_id: questionId
                    })
                    timeSeconds += 15 // Estimate 15 seconds per question
                    lastSpeaker = 'interviewer'

                    if (isQuestion && questionId) {
                      questions_asked.push({
                        id: questionId,
                        question: text,
                        timestamp: `${minutes}:${String(seconds).padStart(2, '0')}`
                      })
                    }
                    console.log(`Parsed interviewer message ${messages.length}${isQuestion ? ' (question)' : ''}:`, text.substring(0, 50))
                  }
                } else {
                  // Line doesn't start with prefix - infer from context
                  // Pattern: transcript alternates between candidate and interviewer
                  // First line without prefix = candidate, then alternate
                  if (trimmedLine.length > 0) {
                    const shouldBeCandidate = lastSpeaker === 'interviewer' ||
                                              (lastSpeaker === null && idx === 0) ||
                                              (lastSpeaker === null && !trimmedLine.toLowerCase().startsWith('interviewer'))

                    if (shouldBeCandidate) {
                      // This is a candidate response
                      const minutes = Math.floor(timeSeconds / 60)
                      const seconds = timeSeconds % 60
                      messages.push({
                        speaker: 'candidate',
                        text: trimmedLine,
                        timestamp: `${minutes}:${String(seconds).padStart(2, '0')}`
                      })
                      timeSeconds += 30
                      lastSpeaker = 'candidate'
                      console.log(`Parsed candidate message ${messages.length} (inferred from context):`, trimmedLine.substring(0, 50))
                    } else {
                      // This is an interviewer response
                      const isQuestion = trimmedLine.includes('?') ||
                        trimmedLine.toLowerCase().startsWith('tell me') ||
                        trimmedLine.toLowerCase().startsWith('what') ||
                        trimmedLine.toLowerCase().startsWith('why') ||
                        trimmedLine.toLowerCase().startsWith('how') ||
                        trimmedLine.toLowerCase().startsWith('can you') ||
                        trimmedLine.toLowerCase().startsWith('would you')

                      const questionId = isQuestion ? `q${++questionCounter}` : undefined
                      const minutes = Math.floor(timeSeconds / 60)
                      const seconds = timeSeconds % 60
                      messages.push({
                        speaker: 'interviewer',
                        text: trimmedLine,
                        timestamp: `${minutes}:${String(seconds).padStart(2, '0')}`,
                        question_id: questionId
                      })
                      timeSeconds += 15
                      lastSpeaker = 'interviewer'

                      if (isQuestion && questionId) {
                        questions_asked.push({
                          id: questionId,
                          question: trimmedLine,
                          timestamp: `${minutes}:${String(seconds).padStart(2, '0')}`
                        })
                      }
                      console.log(`Parsed interviewer message ${messages.length} (inferred from context${isQuestion ? ', question' : ''}):`, trimmedLine.substring(0, 50))
                    }
                  }
                }
              })

              console.log('Parsing complete:', {
                totalMessages: messages.length,
                candidateMessages: messages.filter(m => m.speaker === 'candidate').length,
                interviewerMessages: messages.filter(m => m.speaker === 'interviewer').length,
                questions: questions_asked.length
              })

              if (messages.length > 0) {
                console.log('Parsed plain text transcript into', messages.length, 'messages')
                setStructuredTranscript({
                  messages,
                  questions_asked,
                  start_time: new Date().toISOString()
                })
              } else {
                console.warn('Could not parse plain text transcript - no messages found')
                console.warn('Full transcript:', plainTranscript)
              }
            } else {
              console.warn('No structured transcript or plain text transcript found for session:', sessionData.id)
            }
          }
          
          setFeedback(feedbackData)
          setFeedbackGenerating(false) // Stop polling once feedback is found

          // Load evaluation criteria to get display names
          const { data: criteriaData } = await supabase
            .from('feedback_evaluation_criteria')
            .select('assessment_area, area_name')
            .eq('is_active', true)

          // Build area scores array with display names
          // Try to get from direct fields first, then from full_rubric if available
          let areaScoresData = feedbackData.area_scores
          let areaFeedbackData = feedbackData.area_feedback
          
          // If not in direct fields, try to extract from full_rubric
          if ((!areaScoresData || !areaFeedbackData) && feedbackData.full_rubric?.traditional_hr_criteria) {
            console.log('📋 Extracting area_scores from full_rubric.traditional_hr_criteria')
            areaScoresData = feedbackData.full_rubric.traditional_hr_criteria.scores
            areaFeedbackData = feedbackData.full_rubric.traditional_hr_criteria.feedback
          }
          
          if (areaScoresData && areaFeedbackData && Object.keys(areaScoresData).length > 0) {
            const scores: any[] = Object.keys(areaScoresData).map((area) => {
              const criterion = criteriaData?.find((c) => c.assessment_area === area)
              return {
                area,
                score: areaScoresData[area],
                feedback: areaFeedbackData[area] || '',
                displayName: criterion?.area_name || area.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              }
            })
            // Sort by score (lowest first to highlight areas needing improvement)
            scores.sort((a, b) => a.score - b.score)
            setAreaScores(scores)
            console.log('✅ Loaded area scores:', scores.length, 'areas')
          } else {
            console.warn('⚠️ No area_scores or area_feedback found in feedback data')
            setAreaScores([])
          }
        } else {
          console.log('No feedback found for session:', sessionData.id)
          
          // Check if transcript exists in database
          const { data: sessionWithTranscript } = await supabase
            .from('interview_sessions')
            .select('transcript, transcript_structured')
            .eq('id', sessionData.id)
            .single()
          
          const hasTranscriptData = !!(sessionWithTranscript?.transcript || sessionWithTranscript?.transcript_structured)
          setHasTranscript(hasTranscriptData)
          
          if (hasTranscriptData) {
            console.log('✅ Transcript found in database, can regenerate feedback')
          } else {
            console.warn('⚠️ No transcript found in database')
          }
          
          // Feedback might still be generating
          if (!feedbackGenerating && pollingAttempts === 0) {
            console.log('Starting feedback generation polling...')
            setFeedbackGenerating(true)
          }
        }
      } else {
        console.log('No completed interview session found')
      }
    } catch (error) {
      console.error('Error loading feedback:', error)
    } finally {
      setLoading(false)

      // Show account creation prompt for anonymous HR screen users
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const stageFromUrl = searchParams?.get('stage')
      const resolvedStage = stageFromUrl || currentSessionData?.stage
      if (!authSession && (resolvedStage === 'hr_screen' || !resolvedStage)) {
        // Delay prompt slightly so they can see their results first
        setTimeout(() => setShowAccountPrompt(true), 3000)
      }

      // Fetch payment/credit status for authenticated users
      if (authSession) {
        try {
          const paymentRes = await fetch('/api/payments/status')
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json()
            setStageAccess(paymentData.stageAccess || {})
            // User is "premium" if they have access to any paid stage
            const hasAnyPaidAccess = ['hiring_manager', 'culture_fit', 'final'].some(
              s => paymentData.stageAccess?.[s]?.hasAccess
            )
            setIsPremium(hasAnyPaidAccess || paymentData.subscription?.active || false)
          }
        } catch (err) {
          console.error('Error loading payment status:', err)
        }
      }
    }
  }

  // Voice practice functions
  const playAudio = (audioBase64: string, practiceKey: string, type: 'question' | 'feedback') => {
    return new Promise<void>((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
        
        if (type === 'question') {
          setPracticePlayingQuestion({ ...practicePlayingQuestion, [practiceKey]: true })
        } else {
          setPracticePlayingFeedback({ ...practicePlayingFeedback, [practiceKey]: true })
        }
        
        audio.addEventListener('ended', () => {
          if (type === 'question') {
            setPracticePlayingQuestion({ ...practicePlayingQuestion, [practiceKey]: false })
          } else {
            setPracticePlayingFeedback({ ...practicePlayingFeedback, [practiceKey]: false })
          }
          resolve()
        })
        
        audio.addEventListener('error', (error) => {
          console.error('Error playing audio:', error)
          if (type === 'question') {
            setPracticePlayingQuestion({ ...practicePlayingQuestion, [practiceKey]: false })
          } else {
            setPracticePlayingFeedback({ ...practicePlayingFeedback, [practiceKey]: false })
          }
          reject(error)
        })
        
        audio.play().catch((error) => {
          console.error('Error playing audio:', error)
          if (type === 'question') {
            setPracticePlayingQuestion({ ...practicePlayingQuestion, [practiceKey]: false })
          } else {
            setPracticePlayingFeedback({ ...practicePlayingFeedback, [practiceKey]: false })
          }
          reject(error)
        })
      } catch (error) {
        console.error('Error creating audio:', error)
        reject(error)
      }
    })
  }

  const startPracticeRecording = async (practiceKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRefs.current[practiceKey] = mediaRecorder
      audioChunksRefs.current[practiceKey] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRefs.current[practiceKey].push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRefs.current[practiceKey], { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        
        // Send audio to practice API
        await sendPracticeAudioToAPI(audioBlob, practiceKey)
      }

      mediaRecorder.start()
      setPracticeRecording({ ...practiceRecording, [practiceKey]: true })
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Microphone access denied. Please enable microphone permissions.')
    }
  }

  const stopPracticeRecording = (practiceKey: string) => {
    const mediaRecorder = mediaRecorderRefs.current[practiceKey]
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setPracticeRecording({ ...practiceRecording, [practiceKey]: false })
    }
  }

  const sendPracticeAudioToAPI = async (audioBlob: Blob, practiceKey: string) => {
    try {
      setPracticeLoading({ ...practiceLoading, [practiceKey]: true })
      
      const practiceInfo = practiceData[practiceKey]
      if (!practiceInfo) return

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('sessionId', practiceInfo.sessionId)
      formData.append('questionId', practiceInfo.questionId)
      formData.append('question', practiceInfo.question)
      formData.append('originalAnswer', practiceInfo.originalAnswer)
      formData.append('stage', currentStage)

      const response = await fetch('/api/interview/practice', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        // Store the practice answer (transcribed or typed)
        if (data.practiceAnswer) {
          setPracticeResponse({ ...practiceResponse, [practiceKey]: data.practiceAnswer })
        }
        setPracticeFeedback({ ...practiceFeedback, [practiceKey]: data })

        // Track pass/fail for this criterion
        if (data.passed && practiceInfo.criterion) {
          const criterionKey = `${currentStage}:${practiceInfo.criterion}`
          if (!passedCriteria.includes(criterionKey)) {
            setPassedCriteria(prev => [...prev, criterionKey])
          }
        }

        // Play feedback audio if available
        if (data.feedbackAudio) {
          await playAudio(data.feedbackAudio, practiceKey, 'feedback')
        }
      } else {
        alert('Error: ' + (data.error || 'Failed to get feedback'))
      }
    } catch (error) {
      console.error('Error submitting practice audio:', error)
      alert('Failed to submit answer. Please try again.')
    } finally {
      setPracticeLoading({ ...practiceLoading, [practiceKey]: false })
    }
  }

  const startPracticeSession = async (practiceKey: string, question: string) => {
    try {
      // Generate TTS for the question
      const response = await fetch('/api/interview/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_question_audio',
          question: question,
        }),
      })

      const data = await response.json()
      if (data.success && data.questionAudio) {
        // Play the question and wait for it to finish
        await playAudio(data.questionAudio, practiceKey, 'question')
        
        // After question finishes playing, start recording
        startPracticeRecording(practiceKey)
      } else {
        // Fallback: just start recording if TTS fails
        startPracticeRecording(practiceKey)
      }
    } catch (error) {
      console.error('Error starting practice session:', error)
      // Fallback: just start recording
      startPracticeRecording(practiceKey)
    }
  }

  const migrateLocalStorageToAccount = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('No session found for migration')
      return
    }

    try {
      // Get temp data from localStorage
      const tempDataStr = localStorage.getItem('temp_interview_data')
      const lastSessionId = localStorage.getItem('last_interview_session_id')

      if (tempDataStr) {
        const tempData = JSON.parse(tempDataStr)

        // Format job description
        let formattedJobDescriptionText = tempData.jobDescriptionText
        if (tempData.companyName || tempData.positionTitle) {
          if (!tempData.jobDescriptionText.includes('Company:') && !tempData.jobDescriptionText.includes('Position:')) {
            const parts: string[] = []
            if (tempData.companyName) parts.push(`Company: ${tempData.companyName}`)
            if (tempData.positionTitle) parts.push(`Position: ${tempData.positionTitle}`)
            if (parts.length > 0) {
              parts.push('', '---', '')
            }
            parts.push(tempData.jobDescriptionText)
            formattedJobDescriptionText = parts.join('\n')
          }
        }

        // Save interview data to account
        const { error: saveError } = await supabase
          .from('user_interview_data')
          .upsert({
            user_id: session.user.id,
            resume_text: tempData.resumeText,
            job_description_text: formattedJobDescriptionText,
            company_website: tempData.companyWebsite,
            notes: tempData.notes,
            updated_at: new Date().toISOString(),
          })

        if (saveError) {
          console.error('Error saving interview data:', saveError)
          throw saveError
        }

        // Update interview session with user_id if we have a session ID
        if (lastSessionId) {
          await supabase
            .from('interview_sessions')
            .update({ user_id: session.user.id })
            .eq('id', lastSessionId)
        }

        // Clear localStorage
        localStorage.removeItem('temp_interview_data')
        localStorage.removeItem('last_interview_session_id')

        // Reload feedback now that session is linked to user
        await loadFeedback()

        setShowAccountPrompt(false)
        alert('Your interview data has been saved to your account!')
      }
    } catch (error) {
      console.error('Error migrating data:', error)
      alert('Error saving your data. Please try again.')
    }
  }

  // Check if user is anonymous
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  useEffect(() => {
    const checkAnonymous = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (!session) {
        const tempData = localStorage.getItem('temp_interview_data')
        const lastSessionId = localStorage.getItem('last_interview_session_id')
        if (tempData || lastSessionId) {
          setIsAnonymous(true)
          setShowAccountPrompt(true)
        }
      }
    }
    checkAnonymous()
  }, [])

  if (loading || feedbackGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {feedbackGenerating ? 'Generating Your Feedback' : 'Loading Feedback'}
          </h2>
          <p className="text-gray-600 mb-2">
            {feedbackGenerating 
              ? 'Our AI is analyzing your interview responses and generating personalized feedback. This may take up to 60 seconds.'
              : 'Loading your interview feedback...'}
          </p>
          {feedbackGenerating && (
            <>
              <p className="text-sm text-gray-500 mt-4">
                We're carefully reviewing your answers to provide the most helpful insights...
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Checking for feedback... (Attempt {pollingAttempts + 1} of 12)
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Function to regenerate feedback
  const regenerateFeedback = async () => {
    if (!currentSessionData?.id) {
      console.error('No session ID available')
      return
    }

    setRegeneratingFeedback(true)
    setFeedbackGenerating(true)
    setPollingAttempts(0)

    try {
      console.log('🔄 Regenerating feedback for session:', currentSessionData.id)
      const response = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionData.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Error regenerating feedback:', errorData)
        alert(`Error: ${errorData.error || 'Failed to regenerate feedback'}`)
        setRegeneratingFeedback(false)
        setFeedbackGenerating(false)
        return
      }

      console.log('✅ Feedback regeneration started, polling for results...')
      // Start polling for the feedback
      await loadFeedback()
    } catch (error: any) {
      console.error('❌ Error calling feedback API:', error)
      alert(`Error: ${error.message || 'Failed to regenerate feedback'}`)
      setRegeneratingFeedback(false)
      setFeedbackGenerating(false)
    }
  }

  // Show error message if feedback generation timed out
  if (pollingAttempts >= 12 && !feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Feedback Generation Taking Longer Than Expected</h2>
          <p className="text-gray-600 mb-4">
            {hasTranscript 
              ? "We found your interview transcript. You can regenerate feedback now."
              : "We're still processing your feedback. Please refresh the page in a moment, or check back later."}
          </p>
          <div className="flex gap-3 justify-center">
            {hasTranscript && (
              <button
                onClick={regenerateFeedback}
                disabled={regeneratingFeedback}
                className="px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all disabled:opacity-50"
              >
                {regeneratingFeedback ? 'Regenerating...' : 'Regenerate Feedback'}
              </button>
            )}
            <button
              onClick={() => {
                setPollingAttempts(0)
                setFeedbackGenerating(true)
                loadFeedback()
              }}
              className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate HR screen data from feedback (use defaults if no feedback)
  const overallScore = feedback?.overall_score || 0
  const scorePercentage = overallScore * 10 // Convert 1-10 to 0-100
  const likelihood = overallScore >= 6 ? 'likely' : overallScore > 0 ? 'unlikely' : null
  const strengths = feedback?.strengths || []
  const improvements = feedback?.weaknesses || []
  const hasFeedback = !!feedback
  const hasHmFeedback = !!feedback?.hiring_manager_six_areas || !!feedback?.full_rubric?.hiring_manager_six_areas
  const hasCfFeedback = !!feedback?.culture_fit_six_areas || !!feedback?.full_rubric?.culture_fit_six_areas
  const hasFrFeedback = !!feedback?.final_round_six_areas || !!feedback?.full_rubric?.final_round_six_areas
  const currentStage = (currentSessionData as any)?.stage || 'hr_screen'

  // Map area scores to HR phone screen criteria structure
  const mapToHRCriteria = (areaScores: any[]) => {
    const criteria: any = {
      communication: null,
      professionalism: null,
      basicQualifications: null,
      interestEnthusiasm: null,
      cultureFit: null,
      responseQuality: null,
      redFlags: null,
    }

    // Track which areas have been matched
    const matchedAreas = new Set()

    areaScores.forEach((area: any) => {
      const areaLower = area.area.toLowerCase()
      const displayLower = area.displayName.toLowerCase()

      // Communication Skills (1-5 scale)
      if ((areaLower.includes('communication') || displayLower.includes('communication')) && !criteria.communication) {
        criteria.communication = {
          ...area,
          scale: '1-5',
          score: Math.round((area.score / 10) * 5), // Convert 1-10 to 1-5
          maxScore: 5,
        }
        matchedAreas.add(area.area)
      }
      // Professionalism (Pass/Fail)
      else if ((areaLower.includes('professionalism') || displayLower.includes('professional') || 
                areaLower.includes('resume_consistency')) && !criteria.professionalism) {
        criteria.professionalism = {
          ...area,
          scale: 'pass/fail',
          passed: area.score >= 6,
          score: area.score,
        }
        matchedAreas.add(area.area)
      }
      // Basic Qualifications Match (1-10 scale)
      else if ((areaLower.includes('qualification') || areaLower.includes('experience') || 
               areaLower.includes('years') || areaLower.includes('job_alignment') ||
               displayLower.includes('qualification') || displayLower.includes('experience') ||
               displayLower.includes('alignment')) && !criteria.basicQualifications) {
        criteria.basicQualifications = {
          ...area,
          scale: '1-10',
          score: area.score,
          maxScore: 10,
        }
        matchedAreas.add(area.area)
      }
      // Interest and Enthusiasm (1-5 scale)
      else if ((areaLower.includes('interest') || areaLower.includes('enthusiasm') || 
               areaLower.includes('motivation') || displayLower.includes('interest') ||
               displayLower.includes('motivation')) && !criteria.interestEnthusiasm) {
        criteria.interestEnthusiasm = {
          ...area,
          scale: '1-5',
          score: Math.round((area.score / 10) * 5), // Convert 1-10 to 1-5
          maxScore: 5,
        }
        matchedAreas.add(area.area)
      }
      // Culture Fit Indicators (Pass/Fail with notes)
      else if ((areaLower.includes('culture') || areaLower.includes('fit') || 
               displayLower.includes('culture') || displayLower.includes('fit')) && !criteria.cultureFit) {
        criteria.cultureFit = {
          ...area,
          scale: 'pass/fail',
          passed: area.score >= 6,
          score: area.score,
        }
        matchedAreas.add(area.area)
      }
      // Response Quality (1-5 scale)
      else if ((areaLower.includes('response') || areaLower.includes('quality') ||
               areaLower.includes('specificity') || areaLower.includes('examples') ||
               displayLower.includes('response') || displayLower.includes('quality') ||
               displayLower.includes('specific')) && !criteria.responseQuality) {
        criteria.responseQuality = {
          ...area,
          scale: '1-5',
          score: Math.round((area.score / 10) * 5), // Convert 1-10 to 1-5
          maxScore: 5,
        }
        matchedAreas.add(area.area)
      }
      // Red Flags (Binary: Present/Absent)
      else if ((areaLower.includes('red') || areaLower.includes('flag') ||
               areaLower.includes('inconsistenc') || displayLower.includes('red flag')) && !criteria.redFlags) {
        criteria.redFlags = {
          ...area,
          scale: 'binary',
          present: area.score < 5, // Low score indicates red flags present
          score: area.score,
        }
        matchedAreas.add(area.area)
      }
    })

    // Fill in missing criteria with defaults based on remaining unmatched areas
    const unmatchedAreas = areaScores.filter((area: any) => !matchedAreas.has(area.area))
    let unmatchedIndex = 0
    
    // Fill missing criteria with unmatched areas or create defaults
    if (!criteria.professionalism) {
      if (unmatchedAreas.length > unmatchedIndex) {
        const area = unmatchedAreas[unmatchedIndex++]
        criteria.professionalism = {
          ...area,
          displayName: 'Professionalism',
          scale: 'pass/fail',
          passed: area.score >= 6,
          score: area.score,
          feedback: area.feedback || 'Professionalism assessment based on overall interview conduct.',
        }
        matchedAreas.add(area.area)
      } else {
        // Create default if no unmatched areas
        criteria.professionalism = {
          displayName: 'Professionalism',
          scale: 'pass/fail',
          passed: true,
          score: 7,
          feedback: 'Professionalism assessment based on overall interview conduct.',
        }
      }
    }
    
    if (!criteria.interestEnthusiasm) {
      if (unmatchedAreas.length > unmatchedIndex) {
        const area = unmatchedAreas[unmatchedIndex++]
        criteria.interestEnthusiasm = {
          ...area,
          displayName: 'Interest and Enthusiasm',
          scale: '1-5',
          score: Math.round((area.score / 10) * 5),
          maxScore: 5,
          feedback: area.feedback || 'Interest and enthusiasm assessment based on engagement level.',
        }
        matchedAreas.add(area.area)
      } else {
        criteria.interestEnthusiasm = {
          displayName: 'Interest and Enthusiasm',
          scale: '1-5',
          score: Math.round((overallScore / 10) * 5),
          maxScore: 5,
          feedback: 'Interest and enthusiasm assessment based on engagement level.',
        }
      }
    }
    
    if (!criteria.responseQuality) {
      if (unmatchedAreas.length > unmatchedIndex) {
        const area = unmatchedAreas[unmatchedIndex++]
        criteria.responseQuality = {
          ...area,
          displayName: 'Response Quality',
          scale: '1-5',
          score: Math.round((area.score / 10) * 5),
          maxScore: 5,
          feedback: area.feedback || 'Response quality assessment based on answer relevance and specificity.',
        }
        matchedAreas.add(area.area)
      } else {
        criteria.responseQuality = {
          displayName: 'Response Quality',
          scale: '1-5',
          score: Math.round((overallScore / 10) * 5),
          maxScore: 5,
          feedback: 'Response quality assessment based on answer relevance and specificity.',
        }
      }
    }
    
    if (!criteria.redFlags) {
      if (unmatchedAreas.length > unmatchedIndex) {
        const area = unmatchedAreas[unmatchedIndex++]
        criteria.redFlags = {
          ...area,
          displayName: 'Red Flags',
          scale: 'binary',
          present: area.score < 5,
          score: area.score,
          feedback: area.feedback || 'Red flags assessment based on interview responses.',
        }
      } else {
        criteria.redFlags = {
          displayName: 'Red Flags',
          scale: 'binary',
          present: overallScore < 5,
          score: overallScore,
          feedback: 'No significant red flags identified in the interview.',
        }
      }
    }

    return criteria
  }

  const hrCriteria = areaScores && areaScores.length > 0 ? mapToHRCriteria(areaScores) : null

  // HR screen 6-area data helpers
  const sixAreas = feedback?.hr_screen_six_areas
  const wentWellAreas = sixAreas?.what_went_well || []
  const needsImproveAreas = sixAreas?.what_needs_improve || []
  const strengthsCards = wentWellAreas
  const needsWorkCards = needsImproveAreas
  const totalAreas =
    wentWellAreas.length + needsImproveAreas.length > 0
      ? wentWellAreas.length + needsImproveAreas.length
      : 6
  const areasPassed = strengthsCards.length
  const areasProgress = totalAreas > 0 ? (areasPassed / totalAreas) * 100 : 0
  const circleRadius = 28
  const circleCircumference = 2 * Math.PI * circleRadius
  const circleDashOffset =
    circleCircumference - (areasPassed / (totalAreas || 1)) * circleCircumference

  // Hiring Manager 6-area data helpers
  const hmSixAreas = feedback?.hiring_manager_six_areas
  const hmWentWellAreas = hmSixAreas?.what_went_well || []
  const hmNeedsImproveAreas = hmSixAreas?.what_needs_improve || []
  const hmStrengthsCards = hmWentWellAreas
  const hmNeedsWorkCards = hmNeedsImproveAreas
  const hmTotalAreas =
    hmWentWellAreas.length + hmNeedsImproveAreas.length > 0
      ? hmWentWellAreas.length + hmNeedsImproveAreas.length
      : 6
  const hmAreasPassed = hmStrengthsCards.length
  const hmAreasProgress = hmTotalAreas > 0 ? (hmAreasPassed / hmTotalAreas) * 100 : 0
  const hmCircleDashOffset =
    circleCircumference - (hmAreasPassed / (hmTotalAreas || 1)) * circleCircumference

  // Culture Fit computed values
  const cfSixAreas = feedback?.culture_fit_six_areas || feedback?.full_rubric?.culture_fit_six_areas
  const cfWentWellAreas = cfSixAreas?.what_went_well || []
  const cfNeedsImproveAreas = cfSixAreas?.what_needs_improve || []
  const cfStrengthsCards = cfWentWellAreas.map((item: any) => ({
    criterion: item.criterion,
    feedback: item.feedback,
    evidence: item.evidence || [],
    type: 'strength' as const,
  }))
  const cfNeedsWorkCards = cfNeedsImproveAreas.map((item: any) => ({
    criterion: item.criterion,
    feedback: item.feedback,
    evidence: item.evidence || [],
    type: 'improve' as const,
  }))
  const cfTotalAreas = cfStrengthsCards.length + cfNeedsWorkCards.length > 0
    ? cfStrengthsCards.length + cfNeedsWorkCards.length
    : 6
  const cfAreasPassed = cfStrengthsCards.length
  const cfAreasProgress = cfTotalAreas > 0 ? (cfAreasPassed / cfTotalAreas) * 100 : 0
  const cfCircleDashOffset = circleCircumference - (cfAreasPassed / (cfTotalAreas || 1)) * circleCircumference

  // Final Round computed values
  const frSixAreas = feedback?.final_round_six_areas || feedback?.full_rubric?.final_round_six_areas
  const frWentWellAreas = frSixAreas?.what_went_well || []
  const frNeedsImproveAreas = frSixAreas?.what_needs_improve || []
  const frStrengthsCards = frWentWellAreas.map((item: any) => ({
    criterion: item.criterion,
    feedback: item.feedback,
    evidence: item.evidence || [],
    type: 'strength' as const,
  }))
  const frNeedsWorkCards = frNeedsImproveAreas.map((item: any) => ({
    criterion: item.criterion,
    feedback: item.feedback,
    evidence: item.evidence || [],
    type: 'improve' as const,
  }))
  const frTotalAreas = frStrengthsCards.length + frNeedsWorkCards.length > 0
    ? frStrengthsCards.length + frNeedsWorkCards.length
    : 6
  const frAreasPassed = frStrengthsCards.length
  const frAreasProgress = frTotalAreas > 0 ? (frAreasPassed / frTotalAreas) * 100 : 0
  const frCircleDashOffset = circleCircumference - (frAreasPassed / (frTotalAreas || 1)) * circleCircumference

  // Hiring Manager role-specific criteria
  const roleSpecificCriteria = feedback?.role_specific_criteria?.criteria_identified || []
  const crossStageProgress = feedback?.cross_stage_progress

  const getSafeIndex = (len: number, index: number) =>
    len === 0 ? 0 : ((index % len) + len) % len

  const renderStackedCarousel = (
    items: any[],
    activeIndex: number,
    setActiveIndex: (idx: number) => void,
    variant: 'strength' | 'improve'
  ) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-gray-500 text-sm">
          {variant === 'strength'
            ? 'No areas currently marked as strengths.'
            : 'No areas currently needing improvement.'}
        </p>
      )
    }

    const len = items.length
    const safeIndex = getSafeIndex(len, activeIndex)
    const item = items[safeIndex]
    const evidence = item.evidence || []
    const firstEvidence = evidence[0]
    const questionCount = evidence.length
    const practiceKey =
      firstEvidence && variant === 'improve'
        ? `criterion-${item.criterion}-${firstEvidence.question_id || 'q'}`
        : null
    const isPracticing =
      practiceKey && practiceData[practiceKey] ? true : false
    const criterionPassedKey = `${currentStage}:${item.criterion}`
    const criterionPassed = passedCriteria.includes(criterionPassedKey)

    const baseBorder =
      variant === 'strength' ? 'border-green-200' : (criterionPassed ? 'border-green-300' : 'border-orange-200')
    const baseBg = criterionPassed && variant === 'improve' ? 'bg-green-50/30' : 'bg-white'
    const accentText =
      variant === 'strength' ? 'text-green-700' : (criterionPassed ? 'text-green-700' : 'text-orange-700')
    const badgeBg =
      variant === 'strength' ? 'bg-green-100' : (criterionPassed ? 'bg-green-100' : 'bg-orange-100')
    const badgeIconColor =
      variant === 'strength' ? 'text-green-600' : (criterionPassed ? 'text-green-600' : 'text-orange-600')
    const headerPillBg =
      variant === 'strength' ? 'bg-green-50' : 'bg-orange-50'
    const headerPillText =
      variant === 'strength' ? 'text-green-700' : 'text-orange-700'

    // How many cards are effectively on each side of the current card
    const leftCount = safeIndex
    const rightCount = len - safeIndex - 1

    // Calculate mastered count for improve cards
    const masteredInStack = variant === 'improve'
      ? items.filter((it: any) => passedCriteria.includes(`${currentStage}:${it.criterion}`)).length
      : 0

    return (
      <div className="relative">
        {/* Practice mastery progress for needs-work cards */}
        {variant === 'improve' && items.length > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              {masteredInStack} of {items.length} area{items.length !== 1 ? 's' : ''} mastered via practice
            </span>
            {masteredInStack > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(masteredInStack / items.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {/* Stacked background cards (peek from sides, shorter and centered)
            At most 2 slices per side; when more remain, still only show 2. */}
        {len > 1 && (
          <>
            {/* Left side stack (previous cards) */}
            {leftCount > 0 && (
              <>
                {/* Further-left slice (represents additional cards beyond the nearest) */}
                {leftCount > 1 && (
                  <div className="absolute z-0 top-1/2 -translate-y-1/2 -left-4 h-3/4 w-1/4 rounded-2xl bg-white shadow-md border border-gray-200 pointer-events-none" />
                )}
                {/* Nearest previous card slice */}
                <div className="absolute z-10 top-1/2 -translate-y-1/2 -left-3 h-[88%] w-1/4 rounded-2xl bg-white shadow-sm border border-gray-100 pointer-events-none" />
              </>
            )}

            {/* Right side stack (next cards) */}
            {rightCount > 0 && (
              <>
                {/* Further-right slice (represents additional cards beyond the nearest) */}
                {rightCount > 1 && (
                  <div className="absolute z-0 top-1/2 -translate-y-1/2 -right-4 h-3/4 w-1/4 rounded-2xl bg-white shadow-md border border-gray-200 pointer-events-none" />
                )}
                {/* Nearest next card slice */}
                <div className="absolute z-10 top-1/2 -translate-y-1/2 -right-3 h-[88%] w-1/4 rounded-2xl bg-white shadow-sm border border-gray-100 pointer-events-none" />
              </>
            )}
          </>
        )}

        {/* Active card */}
        <div
          className={`relative z-20 rounded-2xl shadow-lg border-2 ${baseBorder} ${baseBg} p-6 overflow-hidden flex flex-col ${
            isPracticing ? 'min-h-[380px]' : 'h-[380px]'
          }`}
        >
          {/* soft decorative circle in corner */}
          <div
            className={`absolute top-0 right-0 w-32 h-32 ${
              variant === 'strength' ? 'bg-green-100' : 'bg-orange-100'
            } rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none`}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 ${badgeBg} rounded-lg flex items-center justify-center`}
                >
                  {variant === 'strength' ? (
                    <CheckCircle className={`w-6 h-6 ${badgeIconColor}`} />
                  ) : (
                    <AlertCircle className={`w-6 h-6 ${badgeIconColor}`} />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {item.criterion}
                  </h4>
                  <p className={`text-xs font-semibold ${accentText}`}>
                    {variant === 'strength'
                      ? '✓ STRENGTH'
                      : criterionPassed
                        ? '✓ MASTERED VIA PRACTICE'
                        : '⚠ NEEDS WORK'}
                  </p>
                </div>
              </div>
              {questionCount > 0 && (
                <div
                  className={`px-3 py-1 rounded-full flex items-center space-x-2 text-xs font-semibold ${headerPillBg} ${headerPillText}`}
                >
                  <span>{questionCount} question{questionCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-700 mb-4 leading-relaxed flex-1">
              {item.feedback}
            </p>

            {firstEvidence && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    Q{firstEvidence.question_id}
                  </span>
                  <span className="text-xs text-gray-500">
                    {firstEvidence.timestamp}
                  </span>
                </div>
                <p className="text-sm text-gray-700 italic line-clamp-3">
                  "{firstEvidence.excerpt}"
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <button
                className={`w-full px-4 py-3 rounded-lg text-sm font-semibold text-white shadow-md ${
                  variant === 'strength'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                }`}
                onClick={async () => {
                  if (variant !== 'improve' || !practiceKey || !firstEvidence) return

                  // Toggle dropdown-style practice interface for this criterion
                  if (isPracticing) {
                    // Hide practice and clean up state
                    if (practiceRecording[practiceKey]) {
                      stopPracticeRecording(practiceKey)
                    }
                    const newPracticeData = { ...practiceData }
                    delete newPracticeData[practiceKey]
                    setPracticeData(newPracticeData)
                    const newResponse = { ...practiceResponse }
                    delete newResponse[practiceKey]
                    setPracticeResponse(newResponse)
                    const newFeedback = { ...practiceFeedback }
                    delete newFeedback[practiceKey]
                    setPracticeFeedback(newFeedback)
                    const newRecording = { ...practiceRecording }
                    delete newRecording[practiceKey]
                    setPracticeRecording(newRecording)
                    setActivePracticeCriterion(null)
                  } else {
                    const questionText =
                      structuredTranscript?.questions_asked?.find(
                        (q: any) => q.id === firstEvidence.question_id
                      )?.question || firstEvidence.question || 'Practice this answer'

                    setPracticeData({
                      ...practiceData,
                      [practiceKey]: {
                        sessionId: feedback?.interview_session_id,
                        questionId: firstEvidence.question_id,
                        question: questionText,
                        originalAnswer: firstEvidence.excerpt,
                        criterion: item.criterion,
                      },
                    })
                    setActivePracticeCriterion(item.criterion)
                    await startPracticeSession(practiceKey, questionText)
                  }
                }}
              >
                {variant === 'strength'
                  ? 'Review Practice'
                  : 'Practice This Area'}
              </button>
            </div>

            {/* Inline practice interface for needs-work cards (dropdown style) */}
            {variant === 'improve' &&
              practiceKey &&
              activePracticeCriterion === item.criterion && (
                <div className="mt-4 border-t border-gray-200 pt-4 space-y-4">
                  {/* Question playing state */}
                  {practicePlayingQuestion[practiceKey] && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-blue-700 font-medium">
                          AI is asking the question...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recording State */}
                  {practiceRecording[practiceKey] && !practiceFeedback[practiceKey] && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-3 mb-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-red-700">
                          Recording your answer...
                        </span>
                      </div>
                      <button
                        onClick={() => stopPracticeRecording(practiceKey)}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                      >
                        <MicOff className="w-4 h-4" />
                        <span>Stop Recording</span>
                      </button>
                    </div>
                  )}

                  {/* Loading State */}
                  {practiceLoading[practiceKey] && !practiceRecording[practiceKey] && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-700">Getting feedback...</span>
                      </div>
                    </div>
                  )}

                  {/* Feedback Playing State */}
                  {practicePlayingFeedback[practiceKey] && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-700 font-medium">
                          AI is giving feedback...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Feedback Display */}
                  {practiceFeedback[practiceKey] && !practicePlayingFeedback[practiceKey] && (
                    <div className={`${practiceFeedback[practiceKey].passed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4`}>
                      {/* Pass/Fail Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-gray-900">
                          Practice Feedback
                        </h5>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            practiceFeedback[practiceKey].passed
                              ? 'bg-green-200 text-green-800'
                              : 'bg-amber-200 text-amber-800'
                          }`}>
                            {practiceFeedback[practiceKey].score}/10
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            practiceFeedback[practiceKey].passed
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {practiceFeedback[practiceKey].passed ? 'PASSED' : 'NEEDS WORK'}
                          </span>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">
                          {practiceFeedback[practiceKey].feedback}
                        </p>
                      </div>
                      {practiceResponse[practiceKey] && (
                        <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            Your Practice Answer:
                          </p>
                          <p className="text-xs text-gray-700 italic">
                            "{practiceResponse[practiceKey]}"
                          </p>
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          // Reset and let them try again on same card
                          setPracticeResponse({ ...practiceResponse, [practiceKey]: '' })
                          const newFeedback = { ...practiceFeedback }
                          delete newFeedback[practiceKey]
                          setPracticeFeedback(newFeedback)
                          const questionText =
                            structuredTranscript?.questions_asked?.find(
                              (q: any) => q.id === firstEvidence.question_id
                            )?.question || firstEvidence.question || 'Practice this answer'
                          await startPracticeSession(practiceKey, questionText)
                        }}
                        className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                      >
                        {practiceFeedback[practiceKey].passed ? 'Practice Again (Already Passed!)' : 'Try Again'}
                      </button>
                    </div>
                  )}

                  {/* Ready-to-record state after question audio finishes but before recording */}
                  {!practiceRecording[practiceKey] &&
                    !practiceLoading[practiceKey] &&
                    !practiceFeedback[practiceKey] &&
                    !practicePlayingQuestion[practiceKey] && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                          Click below to record a stronger answer than your original one.
                        </p>
                        <button
                          onClick={() => startPracticeRecording(practiceKey)}
                          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm flex items-center justify-center space-x-2 mx-auto"
                        >
                          <Mic className="w-4 h-4" />
                          <span>Start Recording</span>
                        </button>
                      </div>
                    )}
                </div>
              )}

            {/* Note: card index label and nav arrows are rendered in the section header for each stack */}
          </div>
        </div>
      </div>
    )
  }

  // Interview data structure
  const interviewData = {
    hrScreen: {
      completed: hasFeedback,
      score: scorePercentage,
      likelihood: likelihood,
      strengths: strengths,
      improvements: improvements,
      transcript: 'Sample transcript of the HR screening call...'
    },
    hiringManager1: {
      completed: hasHmFeedback && currentStage === 'hiring_manager',
      locked: !isPremium
    },
    cultureFit: {
      completed: false,
      locked: !isPremium
    },
    hiringManager2: {
      completed: false,
      locked: !isPremium
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'hr-screen', label: 'HR Screen', icon: Phone, completed: hasFeedback },
    { id: 'hiring-manager-1', label: 'Hiring Manager (30min)', icon: Briefcase },
    { id: 'culture-fit', label: 'Culture Fit', icon: Users, optional: true },
    { id: 'hiring-manager-2', label: 'Final Interview', icon: Crown }
  ]

  // Ordered interview gates: complete in order, pass (or premium) to proceed
  const canStartHiringManager1 = hasFeedback && (likelihood === 'likely' || isPremium)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Header />

      {/* Contextual action bar */}
      {(!loading && ((!hasFeedback && hasTranscript) || !isPremium)) && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
            {!hasFeedback && hasTranscript && (
              <button
                onClick={regenerateFeedback}
                disabled={regeneratingFeedback || feedbackGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingFeedback ? 'animate-spin' : ''}`} />
                <span>{regeneratingFeedback ? 'Regenerating...' : 'Regenerate Feedback'}</span>
              </button>
            )}
            {!isPremium && (
              <button
                onClick={() => setShowPurchaseFlow(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-all"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Unlock All Interviews</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Account Creation Prompt for Anonymous Users */}
      {showAccountPrompt && isAnonymous && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => {
                setShowAccountPrompt(false)
                setAccountPromptDismissed(true)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your Free Account</h3>
            <p className="text-gray-600 mb-6">
              Save your results, track progress, and unlock more interview stages
            </p>
            <div className="space-y-3">
              {(() => {
                const tempDataStr = localStorage.getItem('temp_interview_data')
                const tempData = tempDataStr ? JSON.parse(tempDataStr) : null
                const extractedName = tempData?.extractedUserInfo?.name || ''
                const extractedEmail = tempData?.extractedUserInfo?.email || ''
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        defaultValue={extractedName}
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        defaultValue={extractedEmail}
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams()
                        if (extractedEmail) params.set('email', extractedEmail)
                        if (extractedName) params.set('name', extractedName)
                        const query = params.toString()
                        router.push(`/auth/signup${query ? `?${query}` : ''}`)
                      }}
                      className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-lg"
                    >
                      Create Account
                    </button>
                  </>
                )
              })()}
              <button
                onClick={() => {
                  window.location.href = '/auth/signup?provider=google'
                }}
                className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </button>
              <button
                onClick={() => {
                  setShowAccountPrompt(false)
                  setAccountPromptDismissed(true)
                }}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
              >
                Maybe Later
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              Already have an account?{' '}
              <a href="/auth/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Persistent signup banner for anonymous users who dismissed the modal */}
      {isAnonymous && !showAccountPrompt && accountPromptDismissed && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-indigo-800 font-medium">
              Create an account to save your results and continue to the Hiring Manager round →
            </p>
            <button
              onClick={() => router.push('/auth/signup')}
              className="ml-4 px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isHRScreenCompleted = tab.id === 'hr-screen' && tab.completed
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? isHRScreenCompleted
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-primary-500 to-accent-400 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.optional && <span className="text-xs opacity-75">(Optional)</span>}
                  {isHRScreenCompleted && (
                    <CheckCircle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-green-600'}`} />
                  )}
                  {tab.completed && !isHRScreenCompleted && <CheckCircle className="w-4 h-4" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overall Score Card - Locked for now */}
            <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 opacity-50"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-400">Overall Performance</h2>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Lock className="w-5 h-5" />
                    <span className="text-sm font-medium">Available after all interviews</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gray-200 mb-4">
                      <span className="text-5xl font-bold text-gray-400">--</span>
                    </div>
                    <p className="text-gray-400 font-medium">Out of 100</p>
                  </div>
                  <div className="space-y-4">
                    {['Communication', 'Technical Skills', 'Cultural Fit', 'Problem Solving'].map((skill) => (
                      <div key={skill}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-400">{skill}</span>
                          <span className="text-sm text-gray-400">--/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gray-300 h-2 rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Interview Progress */}
            <div className="grid md:grid-cols-4 gap-4">
              {/* HR Screen - Completed or Empty */}
              {hasFeedback ? (
                <div className={`bg-white rounded-xl shadow-lg p-6 border-2 ${likelihood === 'unlikely' ? 'border-orange-500' : 'border-green-500'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <Phone className={`w-8 h-8 ${likelihood === 'unlikely' ? 'text-orange-600' : 'text-green-600'}`} />
                    {likelihood === 'unlikely' ? (
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">HR Screen</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {likelihood === 'unlikely' ? 'Needs improvement' : 'Initial screening completed'}
                  </p>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className={`flex-1 rounded-full h-2 ${likelihood === 'unlikely' ? 'bg-orange-100' : 'bg-green-100'}`}>
                      <div
                        className={`h-2 rounded-full ${likelihood === 'unlikely' ? 'bg-orange-600' : 'bg-green-600'}`}
                        style={{ width: `${scorePercentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${likelihood === 'unlikely' ? 'text-orange-600' : 'text-green-600'}`}>{scorePercentage}%</span>
                  </div>
                  {likelihood === 'unlikely' && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-orange-200">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('hr-screen')
                          setTimeout(() => {
                            const el = document.querySelector('[data-practice-section]')
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }, 150)
                        }}
                        className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all text-sm"
                      >
                        <Target className="w-4 h-4" />
                        <span>Go to practice cards</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <Link
                        href="/dashboard"
                        className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-orange-600 border-2 border-orange-500 rounded-lg font-medium hover:bg-orange-50 transition-all text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake</span>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Phone className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-500 mb-2">HR Screen</h3>
                  <p className="text-sm text-gray-400 mb-3">No interview completed yet</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
                    <span className="text-xs font-bold text-gray-400">--</span>
                  </div>
                </div>
              )}

              {/* Hiring Manager 1 - Locked */}
              <div className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-70"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <Briefcase className="w-8 h-8 text-gray-400" />
                    <Lock className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-500 mb-2">Hiring Manager</h3>
                  <p className="text-sm text-gray-400 mb-3">30-minute technical discussion</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
                    <span className="text-xs font-bold text-gray-400">--</span>
                  </div>
                </div>
              </div>

              {/* Culture Fit - Locked */}
              <div className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-70"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                    <Lock className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-500 mb-2">Culture Fit</h3>
                  <p className="text-sm text-gray-400 mb-3">Team member interviews</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
                    <span className="text-xs font-bold text-gray-400">--</span>
                  </div>
                </div>
              </div>

              {/* Final Interview - Locked */}
              <div className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-70"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <Crown className="w-8 h-8 text-gray-400" />
                    <Lock className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-500 mb-2">Final Interview</h3>
                  <p className="text-sm text-gray-400 mb-3">Extended technical deep-dive</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2"></div>
                    <span className="text-xs font-bold text-gray-400">--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA 1: Likely + Premium — Start Hiring Manager Interview */}
            {hasFeedback && likelihood === 'likely' && isPremium && (
              <div className="bg-gradient-to-br from-primary-500 via-accent-400 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Briefcase className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Ready for the Hiring Manager Interview?</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        You've completed the HR screen! Now it's time to prepare for the next stage. Practice with our AI-powered hiring manager interview to get ready for the real thing.
                      </p>
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-4 py-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">30-minute technical discussion</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-4 py-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Deep dive into your experience</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-4 py-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Company-specific questions</span>
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                      >
                        <Briefcase className="w-5 h-5" />
                        <span>Start Hiring Manager Interview</span>
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                    <div className="hidden lg:block">
                      <Briefcase className="w-32 h-32 text-white/20" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              </div>
            )}

            {/* CTA 2: Likely + !Premium — Unlock Hiring Manager OR Unlock All Interviews */}
            {hasFeedback && likelihood === 'likely' && !isPremium && (
              <div className="bg-gradient-to-br from-primary-500 via-accent-400 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Briefcase className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Ready for the Hiring Manager Interview?</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        Unlock the Hiring Manager interview to practice the next stage, or unlock all interview rounds with premium.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPurchaseFlow(true)}
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-500 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                        >
                          <Briefcase className="w-5 h-5" />
                          <span>Unlock Hiring Manager Interview</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPurchaseFlow(true)}
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg"
                        >
                          <Crown className="w-5 h-5" />
                          <span>Unlock All Interviews (Premium)</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-white/70 text-sm mt-3">One-time payment • No subscription • All interview stages</p>
                    </div>
                    <div className="hidden lg:block">
                      <Briefcase className="w-32 h-32 text-white/20" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              </div>
            )}

            {/* CTA 4: Unlikely + !Premium — Unlock Full Interview Process */}
            {hasFeedback && likelihood === 'unlikely' && !isPremium && (
              <div className="bg-gradient-to-br from-primary-500 to-accent-400 rounded-2xl shadow-xl p-8 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Unlock Full Interview Process</h3>
                    <p className="text-primary-100 mb-6">
                      Practice with an AI that has intimate knowledge of the company and job description. Get feedback, practice specific questions, and run through the whole interview again until you're ready to land the job.
                    </p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>Unlock all interview stages (Hiring Manager, Culture Fit, Final Interview)</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>3 practice attempts per interview round</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>Practice specific questions flagged for improvement right in this dashboard</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>AI-powered interviewer with deep knowledge of your target company and role</span>
                      </li>
                    </ul>
                    <div className="mb-4">
                      <p className="text-indigo-200 text-sm font-medium">One-time payment • No subscription • Land the job and never pay again</p>
                    </div>
                    <button 
                      onClick={() => setShowPurchaseFlow(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-white text-primary-500 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg"
                    >
                      <span>Unlock All Interviews</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="hidden lg:block ml-8">
                    <Crown className="w-32 h-32 text-white opacity-20" />
                  </div>
                </div>
              </div>
            )}

            {/* CTA 3: Unlikely + Premium — Retake or move forward (bottom CTA box) */}
            {hasFeedback && likelihood === 'unlikely' && isPremium && (
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden border-2 border-orange-400">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <RefreshCw className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Retake interview or move forward</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        Once you've completed the practice cards and reviewed the focus areas, you can retake this interview to show your improvement (one free retake), or skip ahead to the Hiring Manager interview.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Retake Interview (Free)</span>
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                          href="/dashboard?stage=hiring_manager"
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg"
                        >
                          <Briefcase className="w-5 h-5" />
                          <span>Skip to Hiring Manager Interview</span>
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* HR Screen Tab */}
        {activeTab === 'hr-screen' && (
          <div className="space-y-6">
            {hasFeedback ? (
              <>
                {/* HR Screen Completion Banner - Prominent */}
                <div className={`rounded-2xl shadow-2xl p-8 relative overflow-hidden ${
                  likelihood === 'likely' 
                    ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500' 
                    : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500'
                }`}>
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                      <div className="flex items-start space-x-6 flex-1">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
                          likelihood === 'likely' 
                            ? 'bg-white/20 backdrop-blur-md' 
                            : 'bg-white/20 backdrop-blur-md'
                        }`}>
                          {likelihood === 'likely' ? (
                            <CheckCircle className="w-12 h-12 text-white" />
                          ) : (
                            <AlertCircle className="w-12 h-12 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-white">
                          <div className="flex items-center space-x-3 mb-2">
                            <Phone className="w-6 h-6" />
                            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">HR Screen Complete</span>
                          </div>
                          <h2 className="text-4xl font-bold mb-3">
                            {likelihood === 'likely' 
                              ? "You're Likely to Move Forward!" 
                              : "Keep Improving to Move Forward"}
                          </h2>
                          <p className="text-lg text-white/90 mb-4 max-w-2xl">
                            {likelihood === 'likely'
                              ? "Based on your qualifications and conversation, we think you're likely to move onto the formal interview process. Your experience aligns well with the role, and here are some tips to strengthen your performance even further."
                              : "Based on your qualifications and conversation, there are some areas to strengthen before the formal interview process. Review the feedback below to improve your chances and better align your responses with the job requirements."}
                          </p>
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2">
                              <div className="text-3xl font-bold">{scorePercentage}%</div>
                              <div className="text-xs uppercase tracking-wider opacity-90">Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center md:items-end space-y-4">
                        {likelihood === 'likely' && (
                          <div className="text-center md:text-right">
                            <p className="text-white/90 text-sm mb-3 font-medium">Ready for the next step?</p>
                            <Link
                              href="/dashboard"
                              className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                            >
                              <Briefcase className="w-5 h-5" />
                              <span>Start Hiring Manager Interview</span>
                              <ArrowRight className="w-5 h-5" />
                            </Link>
                          </div>
                        )}
                        {likelihood === 'unlikely' && !isPremium && (
                          <div className="text-center md:text-right">
                            <p className="text-white/90 text-sm mb-3 font-medium">Unlock the full process</p>
                            <button
                              type="button"
                              onClick={() => setShowPurchaseFlow(true)}
                              className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                            >
                              <Crown className="w-5 h-5" />
                              <span>Unlock Hiring Manager Interview</span>
                              <ArrowRight className="w-5 h-5" />
                            </button>
                            <p className="text-white/70 text-xs mt-2">Get premium to access all interview stages</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Phone className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-900 mb-4">No Interview Completed Yet</h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  Complete an HR screen interview to see your performance feedback and detailed insights here.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-accent-500 transition-all shadow-lg"
                >
                  <span>Start an Interview</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}

            {hasFeedback && (
              <div className="space-y-6">
                {/* Areas Passed Tracker */}
                {sixAreas && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          Your HR Screen Progress
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Pass all 6 core areas to master the HR phone screen fundamentals.
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-3xl font-bold text-indigo-600">
                            {areasPassed}/{totalAreas}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Areas Passed
                          </div>
                        </div>
                        <svg className="w-20 h-20">
                          <circle
                            cx="40"
                            cy="40"
                            r={circleRadius}
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r={circleRadius}
                            stroke="#6366f1"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={circleCircumference}
                            strokeDashoffset={circleDashOffset}
                            strokeLinecap="round"
                            style={{
                              transform: 'rotate(-90deg)',
                              transformOrigin: '50% 50%',
                              transition: 'stroke-dashoffset 0.5s ease-out',
                            }}
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all"
                          style={{ width: `${areasProgress}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-600">
                          Focus on the orange areas below to level up faster.
                        </span>
                        <span className="text-indigo-600 font-semibold">
                          Master all 6 to be HR-screen ready.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Master These Questions */}
                {sixAreas && (
                  <div className="space-y-6" data-practice-section>
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-gray-900">
                        Master These Questions
                      </h3>
                      <div className="text-sm text-gray-600 flex space-x-4">
                        <span className="inline-flex items-center space-x-1">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          <span>Passed / Strengths</span>
                        </span>
                        <span className="inline-flex items-center space-x-1">
                          <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                          <span>Needs Work</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Strengths / Passed Stack */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700">
                            Passed Areas
                          </h4>
                          {strengthsCards.length > 1 && (
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <button
                                className="hover:text-gray-900 flex items-center space-x-1"
                                onClick={() =>
                                  setStrengthCarouselIndex((prev) =>
                                    prev - 1
                                  )
                                }
                              >
                                <span>←</span>
                              </button>
                              <span>
                                Card{' '}
                                {getSafeIndex(
                                  strengthsCards.length,
                                  strengthCarouselIndex
                                ) + 1}{' '}
                                of {strengthsCards.length}
                              </span>
                              <button
                                className="hover:text-gray-900 flex items-center space-x-1"
                                onClick={() =>
                                  setStrengthCarouselIndex((prev) =>
                                    prev + 1
                                  )
                                }
                              >
                                <span>→</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {renderStackedCarousel(
                          strengthsCards,
                          strengthCarouselIndex,
                          setStrengthCarouselIndex,
                          'strength'
                        )}
                      </div>

                      {/* Needs Work Stack */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700">
                            Needs Work
                          </h4>
                          {needsWorkCards.length > 1 && (
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <button
                                className="hover:text-gray-900 flex items-center space-x-1"
                                onClick={() =>
                                  setImproveCarouselIndex((prev) =>
                                    prev - 1
                                  )
                                }
                              >
                                <span>←</span>
                              </button>
                              <span>
                                Card{' '}
                                {getSafeIndex(
                                  needsWorkCards.length,
                                  improveCarouselIndex
                                ) + 1}{' '}
                                of {needsWorkCards.length}
                              </span>
                              <button
                                className="hover:text-gray-900 flex items-center space-x-1"
                                onClick={() =>
                                  setImproveCarouselIndex((prev) =>
                                    prev + 1
                                  )
                                }
                              >
                                <span>→</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {renderStackedCarousel(
                          needsWorkCards,
                          improveCarouselIndex,
                          setImproveCarouselIndex,
                          'improve'
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcript Section (simplified, with green/red highlights for extremes only) */}
                {structuredTranscript && (
                  (structuredTranscript.messages && structuredTranscript.messages.length > 0) ||
                  (structuredTranscript.questions_asked && structuredTranscript.questions_asked.length > 0)
                ) && (
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <button
                      type="button"
                      onClick={() => setShowTranscript((prev) => !prev)}
                      className="flex w-full items-center justify-between mb-4 text-left"
                    >
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          Full Interview Transcript
                        </h3>
                        <div className="mt-1 flex space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span>Strong</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                            <span>Weak</span>
                          </span>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          showTranscript ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {showTranscript && (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {structuredTranscript.messages && structuredTranscript.messages.length > 0 ? (
                          structuredTranscript.messages.map((msg: any, idx: number) => {
                          const isCandidate = msg.speaker === 'candidate'

                          let tone: 'strong' | 'weak' | 'neutral' = 'neutral'
                          if (isCandidate && feedback?.hr_screen_six_areas) {
                            const wentWell = feedback.hr_screen_six_areas.what_went_well || []
                            const needsImprove =
                              feedback.hr_screen_six_areas.what_needs_improve || []

                            // Check if this message matches any evidence from needs_improve
                            const inNeeds = needsImprove.some((item: any) =>
                              (item.evidence || []).some((ev: any) => {
                                // Match by question_id or by excerpt similarity
                                const questionMatch = ev.question_id && msg.question_id && 
                                  ev.question_id === msg.question_id
                                const excerptMatch = ev.excerpt && msg.text && 
                                  msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                                return questionMatch || excerptMatch
                              })
                            )
                            
                            // Check if this message matches any evidence from what_went_well
                            const inWell = wentWell.some((item: any) =>
                              (item.evidence || []).some((ev: any) => {
                                // Match by question_id or by excerpt similarity
                                const questionMatch = ev.question_id && msg.question_id && 
                                  ev.question_id === msg.question_id
                                const excerptMatch = ev.excerpt && msg.text && 
                                  msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                                return questionMatch || excerptMatch
                              })
                            )

                            if (inNeeds) tone = 'weak'
                            else if (inWell) tone = 'strong'
                          }

                          const baseClasses =
                            'p-4 rounded-lg border-2 transition-colors cursor-default'
                          const toneClasses =
                            tone === 'strong'
                              ? 'border-green-300 bg-green-50'
                              : tone === 'weak'
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-white'

                          return (
                            <div
                              key={idx}
                              className={`${baseClasses} ${toneClasses}`}
                            >
                              <div className="flex space-x-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                                  {isCandidate ? (
                                    <Users className="w-5 h-5 text-gray-700" />
                                  ) : (
                                    <Phone className="w-5 h-5 text-indigo-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <span
                                      className={`text-sm font-semibold ${
                                        isCandidate
                                          ? 'text-gray-900'
                                          : 'text-indigo-700'
                                      }`}
                                    >
                                      {isCandidate ? 'You' : 'AI Interviewer'}
                                    </span>
                                    {msg.timestamp && (
                                      <span className="text-xs text-gray-500">
                                        {msg.timestamp}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-800 text-sm">
                                    {msg.text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                          })
                        ) : structuredTranscript.questions_asked && structuredTranscript.questions_asked.length > 0 ? (
                          // Fallback: Show questions list if messages are empty
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">
                              Full conversation transcript is not available, but here are the questions that were asked:
                            </p>
                            {structuredTranscript.questions_asked.map((q: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                                <div className="flex items-start space-x-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100">
                                    <Phone className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm font-semibold text-indigo-700">AI Interviewer</span>
                                      {q.timestamp && (
                                        <span className="text-xs text-gray-500">{q.timestamp}</span>
                                      )}
                                    </div>
                                    <p className="text-gray-800 text-sm">{q.question}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-sm">No transcript data available.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {/* Detailed Performance Breakdown - HR Phone Screen Criteria */}
            {(hrCriteria || (areaScores && areaScores.length > 0)) && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Detailed Performance Breakdown
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Evaluation based on standard HR phone screen criteria
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRubricModal(true)}
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>View Full Report</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Next Step - Practice & Retake Section for Unlikely Candidates */}
            {hasFeedback && likelihood === 'unlikely' && (() => {
              // Use the same score calculation as the main display
              const currentScore = areasPassed
              const targetScore = totalAreas
              const scoreDisplay = `${currentScore}/${targetScore}`
              
              return (
                <div className="bg-white shadow-xl border-t-4 border-orange-500 rounded-2xl">
                  {/* Header */}
                  <div className="p-8 pb-6">
                    <div className="flex items-center space-x-3">
                      <Target className="w-8 h-8 text-orange-600" />
                      <div>
                        <span className="text-sm font-semibold uppercase tracking-wider text-orange-600">Next Step</span>
                        <h2 className="text-2xl font-bold text-gray-900 mt-1">Practice & Improve Your Performance</h2>
                      </div>
                    </div>
                  </div>

                  {/* Action Plan Steps */}
                  <div className="px-8 pb-6 space-y-4">
                    {/* Step 1 */}
                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          1
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg text-gray-900">Complete the practice cards above</h3>
                            <div className="flex items-baseline space-x-2">
                              <span className="text-sm text-gray-600">Current:</span>
                              <span className="text-2xl font-bold text-orange-600">{scoreDisplay}</span>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-4">
                            Work through each practice question for areas that need improvement. Record your responses and review the AI feedback to refine your answers.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const practiceSection = document.querySelector('[data-practice-section]')
                              if (practiceSection) {
                                practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }
                            }}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:scale-105 transform"
                          >
                            <Target className="w-5 h-5" />
                            <span>Go to Practice Cards</span>
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          2
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-2">Review the detailed performance breakdown</h3>
                          <p className="text-gray-700 mb-4">
                            Review the "Detailed Performance Breakdown" section above to understand exactly where you need to improve and why. Click the button below to open the full detailed report.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowRubricModal(true)}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:scale-105 transform"
                          >
                            <span>View Full Report</span>
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          3
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-3">Review focus areas</h3>
                          <p className="text-gray-700 mb-4">
                            Focus on the specific areas below that need improvement:
                          </p>
                          {needsWorkCards.length > 0 ? (
                            <div className="space-y-3">
                              {needsWorkCards.map((area: any, idx: number) => {
                                // Extract tip from feedback or create actionable tip based on criterion
                                let tip = area.feedback || ''
                                // If feedback contains "Consider" or "Try", extract that part as the tip
                                const considerMatch = tip.match(/Consider[^.]*(?:\.|$)/i)
                                const tryMatch = tip.match(/Try[^.]*(?:\.|$)/i)
                                const betterMatch = tip.match(/A better approach[^.]*(?:\.|$)/i)
                                
                                if (considerMatch) {
                                  tip = considerMatch[0].replace(/^Consider\s+/i, '').trim()
                                } else if (tryMatch) {
                                  tip = tryMatch[0].replace(/^Try\s+/i, '').trim()
                                } else if (betterMatch) {
                                  tip = betterMatch[0].replace(/^A better approach would be:\s*/i, '').trim().replace(/^['"]|['"]$/g, '')
                                } else {
                                  // Fallback: create tip from criterion
                                  if (area.criterion.includes('STAR') || area.criterion.includes('Structure')) {
                                    tip = 'Use the STAR method (Situation, Task, Action, Result) to structure your answers'
                                  } else if (area.criterion.includes('Examples')) {
                                    tip = 'Include specific examples with metrics and concrete results'
                                  } else if (area.criterion.includes('Questions')) {
                                    tip = 'Prepare 2-3 thoughtful questions about the role, team, or company'
                                  } else if (area.criterion.includes('Uncertain') || area.criterion.includes('Difficult')) {
                                    tip = 'Acknowledge gaps honestly, then pivot to related experience and learning ability'
                                  } else {
                                    tip = tip.length > 100 ? tip.substring(0, 100) + '...' : tip
                                  }
                                }
                                
                                return (
                                  <div key={idx} className="bg-white rounded-lg p-4 border border-orange-200">
                                    <h4 className="font-semibold text-gray-900 mb-2">{area.criterion}</h4>
                                    <p className="text-sm text-gray-700">
                                      <strong className="text-orange-600">Tip:</strong> {tip}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-600 text-sm">No specific focus areas identified. Continue practicing to improve your overall performance.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: only for Unlikely + !Premium. Unlikely + Premium see CTA box at bottom of page. */}
                  <div className="px-8 pb-6" style={isPremium ? { display: 'none' } : undefined}>
                    <button
                      type="button"
                      onClick={() => setShowStep4(!showStep4)}
                      className="w-full px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:scale-105 transform flex items-center justify-center space-x-2"
                    >
                      <span>{showStep4 ? 'Hide Step 4' : 'Reveal Step 4'}</span>
                      <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${showStep4 ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  <div className={`relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-2 border-orange-400 border-t-0 rounded-b-2xl overflow-hidden transition-all duration-500 ease-in-out ${
                    showStep4 ? 'max-h-[1000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4 overflow-hidden'
                  }`} style={isPremium ? { display: 'none' } : undefined}>
                    {/* Sheen/Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                    
                    <div className="relative p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-white mb-2">Retake interview or move forward</h3>
                          <p className="text-white/90 mb-4">
                            {isPremium
                              ? "Once you've completed the practice cards and reviewed the focus areas, you can retake this interview to show your improvement (one free retake), or skip ahead to the Hiring Manager interview."
                              : "Once you've completed the practice cards and reviewed the focus areas, you can retake this interview to show your improvement (one free retake). Unlock premium to access the Hiring Manager interview and all interview stages."}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <Link
                              href="/dashboard"
                              className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                            >
                              <RefreshCw className="w-5 h-5" />
                              <span>Retake Interview (Free)</span>
                              <ArrowRight className="w-5 h-5" />
                            </Link>
                            {isPremium ? (
                              <Link
                                href="/dashboard?stage=hiring_manager"
                                className="inline-flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg hover:scale-105 transform"
                              >
                                <Briefcase className="w-5 h-5" />
                                <span>Skip to Hiring Manager Interview</span>
                                <ArrowRight className="w-5 h-5" />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowPurchaseFlow(true)}
                                className="inline-flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg hover:scale-105 transform"
                              >
                                <Crown className="w-5 h-5" />
                                <span>Unlock Hiring Manager Interview</span>
                                <ArrowRight className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Full-Screen Rubric Report Modal */}
            {showRubricModal && (
              <>
                {/* Print styles */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    .print-content,
                    .print-content * {
                      visibility: visible;
                    }
                    .print-content {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      max-width: 100% !important;
                      max-height: none !important;
                      height: auto !important;
                      overflow: visible !important;
                      box-shadow: none !important;
                      border-radius: 0 !important;
                      margin: 0 !important;
                      padding: 20px !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    @page {
                      margin: 1cm;
                    }
                  }
                `}} />
                <div className="fixed inset-0 z-50 overflow-y-auto print-content">
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity no-print"
                    onClick={() => setShowRubricModal(false)}
                  ></div>
                  
                  {/* Modal Container */}
                  <div className="relative min-h-screen flex items-start justify-center p-4 pt-8 pb-8 print:min-h-0 print:p-0">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:my-0">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 print:border-b-2">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Detailed Performance Report
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          HR Phone Screen Interview Analysis
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 no-print">
                        {/* Print/Download PDF button - uses browser print dialog */}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
                          title="Print or save as PDF"
                        >
                          Print / Save PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRubricModal(false)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                          aria-label="Close"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
                      {feedback && (feedback as any).full_rubric ? (() => {
                        // Enrich the rubric with session metadata for DetailedRubricReport
                        const fullRubric = (feedback as any).full_rubric
                        console.log('🎨 Rendering DetailedRubricReport with fullRubric keys:', Object.keys(fullRubric))
                        console.log('🎨 fullRubric.overall_assessment:', fullRubric.overall_assessment)
                        console.log('🎨 fullRubric.traditional_hr_criteria:', fullRubric.traditional_hr_criteria)
                        
                        // Transform traditional_hr_criteria from {scores: {...}, feedback: {...}} 
                        // to the detailed structure expected by DetailedRubricReport
                        let transformedTraditionalCriteria = fullRubric.traditional_hr_criteria
                        if (fullRubric.traditional_hr_criteria?.scores && fullRubric.traditional_hr_criteria?.feedback) {
                          // Claude returns {scores: {...}, feedback: {...}}, need to transform
                          const scores = fullRubric.traditional_hr_criteria.scores
                          const feedbackObj = fullRubric.traditional_hr_criteria.feedback
                          console.log('🔍 traditional_hr_criteria.scores:', scores)
                          console.log('🔍 traditional_hr_criteria.feedback:', feedbackObj)
                          
                          transformedTraditionalCriteria = {}
                          
                          // Helper to normalize score to 1-5 scale if it's 1-10
                          const normalizeScore = (score: number, maxScale: number = 10): number => {
                            if (maxScale === 10 && score > 5) {
                              // Convert 1-10 to 1-5
                              return Math.round((score / 10) * 5)
                            }
                            return score
                          }
                          
                          // Create a mapping from Claude's keys to expected component keys
                          const criterionMapping: Record<string, string> = {
                            'communication': 'communication_skills',
                            'cultural_fit': 'culture_fit_indicators',
                            'job_alignment': 'basic_qualifications_match',
                            'experience_relevance': 'basic_qualifications_match',
                            'problem_solving': 'response_quality',
                            'technical_skills': 'response_quality',
                          }
                          
                          // Transform each criterion with expected structure
                          Object.keys(scores).forEach((key) => {
                            const score = scores[key]
                            // Try multiple possible keys for feedback (Claude might use different naming)
                            const feedbackText = feedbackObj[key] || 
                                                 feedbackObj[key.toLowerCase()] || 
                                                 feedbackObj[key.replace(/_/g, ' ')] ||
                                                 feedbackObj[key.replace(/_/g, '_')] ||
                                                 ''
                            console.log(`🔍 Criterion: ${key}, Score: ${score}, Feedback: "${feedbackText.substring(0, 50)}..."`)
                            
                            // Map criterion names to expected structure
                            // First check if this key maps to a standard criterion
                            const mappedKey = criterionMapping[key] || key
                            
                            if (mappedKey === 'communication_skills' || key === 'communication' || key.toLowerCase().includes('communication')) {
                              // If communication_skills already exists, merge feedback if better
                              if (!transformedTraditionalCriteria.communication_skills || !transformedTraditionalCriteria.communication_skills.feedback) {
                                transformedTraditionalCriteria.communication_skills = {
                                  score: normalizeScore(score),
                                  scale: '1-5',
                                  feedback: feedbackText || transformedTraditionalCriteria.communication_skills?.feedback || 'Communication assessment not available.',
                                  components: {
                                    clarity: normalizeScore(score),
                                    articulation: normalizeScore(score),
                                    pacing: normalizeScore(score),
                                    tone_appropriateness: normalizeScore(score),
                                    active_listening: normalizeScore(score),
                                    professional_language: normalizeScore(score),
                                  },
                                }
                              } else if (feedbackText && feedbackText.length > transformedTraditionalCriteria.communication_skills.feedback.length) {
                                // Use longer/more detailed feedback if available
                                transformedTraditionalCriteria.communication_skills.feedback = feedbackText
                              }
                            } else if (key === 'professionalism' || key.toLowerCase().includes('professional')) {
                              // Professionalism uses pass/fail
                              const isPass = score >= 4 || (typeof score === 'number' && score >= 7)
                              transformedTraditionalCriteria.professionalism = {
                                score: isPass ? 'pass' : 'fail',
                                scale: 'pass/fail',
                                feedback: feedbackText || 'Professionalism assessment not available.',
                                components: {
                                  appropriate_greeting: isPass,
                                  appropriate_closing: isPass,
                                  respectful_tone: isPass,
                                  prepared_environment: isPass,
                                  phone_etiquette: isPass,
                                },
                              }
                            } else if (mappedKey === 'basic_qualifications_match' || key === 'job_alignment' || key === 'experience_relevance' || key.toLowerCase().includes('qualification') || key.toLowerCase().includes('alignment')) {
                              // Try to extract alignment details from comparative_analysis if available
                              const alignmentDetails = fullRubric.comparative_analysis?.job_requirements_gaps || []
                              const metRequirements = fullRubric.comparative_analysis?.standout_qualities || []
                              
                              // Merge if basic_qualifications_match already exists (from job_alignment or experience_relevance)
                              if (!transformedTraditionalCriteria.basic_qualifications_match) {
                                transformedTraditionalCriteria.basic_qualifications_match = {
                                  score: score, // Keep 1-10 scale
                                  scale: '1-10',
                                  feedback: feedbackText || 'Basic qualifications assessment not available.',
                                  components: {},
                                  alignment_details: {
                                    job_requirements_met: Array.isArray(metRequirements) ? metRequirements : [],
                                    job_requirements_missing: Array.isArray(alignmentDetails) ? alignmentDetails : [],
                                    transferable_skills_identified: [],
                                  },
                                }
                              } else {
                                // Merge feedback from multiple sources
                                const existingFeedback = transformedTraditionalCriteria.basic_qualifications_match.feedback
                                if (feedbackText && (!existingFeedback || feedbackText.length > existingFeedback.length)) {
                                  transformedTraditionalCriteria.basic_qualifications_match.feedback = feedbackText
                                }
                                // Use higher score if available
                                if (score > transformedTraditionalCriteria.basic_qualifications_match.score) {
                                  transformedTraditionalCriteria.basic_qualifications_match.score = score
                                }
                              }
                            } else if (key === 'interest_and_enthusiasm' || key.toLowerCase().includes('enthusiasm') || key.toLowerCase().includes('interest')) {
                              transformedTraditionalCriteria.interest_and_enthusiasm = {
                                score: normalizeScore(score),
                                scale: '1-5',
                                feedback: feedbackText || 'Interest and enthusiasm assessment not available.',
                                components: {},
                                enthusiasm_indicators: {
                                  mentioned_specific_company_details: score >= 4,
                                  tone_was_enthusiastic: score >= 4,
                                  company_knowledge: score >= 4 ? 'Strong' : score >= 3 ? 'Moderate' : 'Limited',
                                  energy_level: score >= 4 ? 'High' : score >= 3 ? 'Moderate' : 'Low',
                                  tone_enthusiasm: score >= 4 ? 'Very Enthusiastic' : score >= 3 ? 'Enthusiastic' : 'Neutral',
                                  follow_up_questions: score >= 4 ? 'Multiple thoughtful questions' : score >= 3 ? 'Some questions' : 'Few or no questions',
                                },
                              }
                            } else if (mappedKey === 'culture_fit_indicators' || key === 'cultural_fit' || key.toLowerCase().includes('culture')) {
                              const isPass = score >= 4 || (typeof score === 'number' && score >= 7)
                              transformedTraditionalCriteria.culture_fit_indicators = {
                                score: isPass ? 'pass' : 'fail',
                                scale: 'pass/fail',
                                feedback: feedbackText || 'Culture fit assessment not available.',
                                components: {
                                  work_style_preferences_align: isPass ? 'Aligned' : 'Needs Review',
                                  values_alignment: isPass ? 'Aligned' : 'Needs Review',
                                  team_collaboration_mentions: isPass ? 'Strong collaboration focus' : 'Limited mention',
                                },
                                notes: feedbackText || 'Culture fit assessment not available.',
                              }
                            } else if (mappedKey === 'response_quality' || key === 'problem_solving' || key === 'technical_skills' || key.toLowerCase().includes('response') || key.toLowerCase().includes('quality')) {
                              // Try to extract quality metrics from question_analysis if available
                              const questionAnalysis = fullRubric.question_analysis?.questions || []
                              const answeredDirectly = questionAnalysis.filter((q: any) => q.answered_directly !== false).length
                              const withExamples = questionAnalysis.filter((q: any) => q.has_examples).length
                              const vagueAnswers = questionAnalysis.filter((q: any) => q.is_vague).length
                              
                              // Merge if response_quality already exists
                              if (!transformedTraditionalCriteria.response_quality) {
                                transformedTraditionalCriteria.response_quality = {
                                  score: normalizeScore(score),
                                  scale: '1-5',
                                  feedback: feedbackText || 'Response quality assessment not available.',
                                  components: {},
                                  quality_metrics: {
                                    questions_answered_directly: questionAnalysis.length > 0 ? `${answeredDirectly}/${questionAnalysis.length}` : 'N/A',
                                    questions_with_strong_examples: questionAnalysis.length > 0 ? `${withExamples}/${questionAnalysis.length}` : 'N/A',
                                    questions_with_vague_answers: questionAnalysis.length > 0 ? `${vagueAnswers}/${questionAnalysis.length}` : 'N/A',
                                    avg_length: questionAnalysis.length > 0 ? 
                                      `${Math.round(questionAnalysis.reduce((sum: number, q: any) => sum + (q.word_count || 0), 0) / questionAnalysis.length)} words` : 'N/A',
                                  },
                                }
                              } else {
                                // Merge feedback from multiple sources
                                const existingFeedback = transformedTraditionalCriteria.response_quality.feedback
                                if (feedbackText && (!existingFeedback || feedbackText.length > existingFeedback.length)) {
                                  transformedTraditionalCriteria.response_quality.feedback = feedbackText
                                }
                              }
                            } else if (key === 'red_flags' || key.toLowerCase().includes('red_flag')) {
                              transformedTraditionalCriteria.red_flags = {
                                present: score < 3 || (typeof score === 'number' && score < 5),
                                scale: 'present/absent',
                                detected_flags: [],
                                feedback: feedbackText || 'Red flags assessment not available.',
                              }
                            } else {
                              // Generic transformation for unknown criteria
                              transformedTraditionalCriteria[key] = {
                                score: normalizeScore(score),
                                scale: '1-5',
                                feedback: feedbackText,
                                components: {},
                              }
                            }
                          })
                          
                          // Validate that all required criteria are present (no defaults - validation should catch missing data)
                          const requiredCriteria = [
                            'communication_skills',
                            'professionalism',
                            'basic_qualifications_match',
                            'interest_and_enthusiasm',
                            'culture_fit_indicators',
                            'response_quality',
                            'red_flags',
                          ]
                          
                          const missingCriteria = requiredCriteria.filter(key => !transformedTraditionalCriteria[key])
                          if (missingCriteria.length > 0) {
                            console.error('❌ Missing required criteria in rubric:', missingCriteria)
                            console.error('❌ This should have been caught by validation. Rubric may be incomplete.')
                            // Don't create defaults - let the component handle missing data gracefully
                          }
                        }
                        
                        // Transform time_management_analysis from Claude's format to component's expected format
                        let transformedTimeManagement = fullRubric.time_management_analysis
                        if (fullRubric.time_management_analysis) {
                          const tma = fullRubric.time_management_analysis
                          // Claude returns: { per_question_timing: [...], overall_pace: "..." }
                          // Component expects: { time_per_question: [...], total_interview_duration, target_duration, variance, questions_asked, pacing_feedback }
                          
                          // Transform per_question_timing array to time_per_question format
                          const timingArray = tma.per_question_timing || tma.time_per_question || []
                          // Try to get question info from question_analysis or structured transcript
                          const questionAnalysis = fullRubric.question_analysis?.questions || []
                          const sessionStructuredTranscript = currentSessionData?.transcript_structured || fullRubric.transcript_structured
                          const questionsFromTranscript = sessionStructuredTranscript?.questions_asked || []
                          
                          const transformedTiming = Array.isArray(timingArray) ? timingArray.map((item: any, index: number) => {
                            // Try to find matching question from question_analysis
                            const matchingQuestion = questionAnalysis.find((q: any) => 
                              q.question_id === item.question_id || 
                              q.id === item.id ||
                              (q.question_text && item.question_text && q.question_text.includes(item.question_text.substring(0, 20)))
                            ) || questionAnalysis[index]
                            
                            // Try to find from structured transcript
                            const transcriptQuestion = questionsFromTranscript.find((q: any) => 
                              q.id === item.question_id || q.id === item.id
                            ) || questionsFromTranscript[index]
                            
                            // Format duration - try multiple sources
                            let formattedDuration = item.candidate_response_time || item.response_time || item.duration || item.time
                            if (item.duration_seconds && !formattedDuration) {
                              const mins = Math.floor(item.duration_seconds / 60)
                              const secs = item.duration_seconds % 60
                              formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
                            }
                            // If still no duration, try to calculate from timestamps
                            if (!formattedDuration && item.start_time && item.end_time) {
                              try {
                                const start = new Date(item.start_time).getTime()
                                const end = new Date(item.end_time).getTime()
                                const seconds = Math.floor((end - start) / 1000)
                                const mins = Math.floor(seconds / 60)
                                const secs = seconds % 60
                                formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
                              } catch (e) {
                                // Ignore date parsing errors
                              }
                            }
                            
                            return {
                              question_id: item.question_id || matchingQuestion?.question_id || transcriptQuestion?.id || `q${index + 1}`,
                              question_text: item.question_text || matchingQuestion?.question_text || transcriptQuestion?.question || item.question || item.text || 'Question text not available',
                              candidate_response_time: formattedDuration || 'N/A',
                              assessment: item.assessment || (item.duration_seconds > 120 ? 'too_long' : item.duration_seconds < 30 ? 'too_short' : 'appropriate'),
                              target_range: item.target_range || item.target || '30-90 seconds',
                            }
                          }) : []
                          
                          // Calculate duration from session if Claude didn't provide it (this is real data, not fake)
                          const calculatedDuration = currentSessionData?.duration_seconds 
                            ? `${Math.floor((currentSessionData.duration_seconds || 0) / 60)}:${String((currentSessionData.duration_seconds || 0) % 60).padStart(2, '0')}`
                            : null
                          
                          transformedTimeManagement = {
                            time_per_question: transformedTiming,
                            total_interview_duration: tma.total_interview_duration || calculatedDuration || null,
                            target_duration: tma.target_duration || null,
                            variance: tma.variance || null,
                            questions_asked: tma.questions_asked ?? transformedTiming.length ?? null,
                            pacing_feedback: tma.overall_pace || tma.pacing_feedback || null,
                          }
                        } else {
                          // If time_management_analysis is completely missing, set to null (validation should catch this)
                          console.error('❌ Missing time_management_analysis entirely - this should have been caught by validation')
                          transformedTimeManagement = null
                        }
                        
                        // Transform comparative_analysis from Claude's format to component's expected format
                        // NO DEFAULTS - if data is missing, validation should have caught it
                        let transformedComparativeAnalysis = fullRubric.comparative_analysis
                        if (fullRubric.comparative_analysis) {
                          const ca = fullRubric.comparative_analysis
                          // Validate that all required fields are present
                          if (!ca.percentile_estimate || typeof ca.percentile_estimate !== 'number') {
                            console.error('❌ Missing or invalid percentile_estimate in comparative_analysis')
                          }
                          if (!Array.isArray(ca.standout_qualities)) {
                            console.error('❌ Missing or invalid standout_qualities in comparative_analysis')
                          }
                          if (!Array.isArray(ca.common_weaknesses_avoided)) {
                            console.error('❌ Missing or invalid common_weaknesses_avoided in comparative_analysis')
                          }
                          
                          transformedComparativeAnalysis = {
                            resume_vs_interview: ca.resume_vs_interview || 'Comparative analysis not available.',
                            job_requirements_gaps: Array.isArray(ca.job_requirements_gaps) ? ca.job_requirements_gaps : [],
                            standout_qualities: Array.isArray(ca.standout_qualities) ? ca.standout_qualities : [],
                            common_weaknesses_avoided: Array.isArray(ca.common_weaknesses_avoided) ? ca.common_weaknesses_avoided : [],
                            percentile_estimate: typeof ca.percentile_estimate === 'number' ? ca.percentile_estimate : null,
                          }
                        } else {
                          console.error('❌ Missing comparative_analysis entirely - this should have been caught by validation')
                          transformedComparativeAnalysis = null
                        }
                        
                        // Transform question_analysis - ensure it has the expected structure
                        let transformedQuestionAnalysis = fullRubric.question_analysis
                        if (fullRubric.question_analysis) {
                          const qa = fullRubric.question_analysis
                          transformedQuestionAnalysis = {
                            questions: Array.isArray(qa.questions) ? qa.questions : [],
                            summary: qa.summary || 'Question analysis not available.',
                          }
                        } else {
                          transformedQuestionAnalysis = {
                            questions: [],
                            summary: 'Question analysis not available.',
                          }
                        }
                        
                        // Ensure observer_notes has the expected structure (optional field)
                        let transformedObserverNotes = fullRubric.observer_notes
                        if (fullRubric.observer_notes) {
                          const on = fullRubric.observer_notes
                          transformedObserverNotes = {
                            overall_impression: on.overall_impression || 'Overall impression not available.',
                            confidence_level: on.confidence_level || 'Not assessed',
                            engagement: on.engagement || 'Not assessed',
                            authenticity: on.authenticity || 'Not assessed',
                            best_moment: on.best_moment || {
                              question_id: 'N/A',
                              timestamp: 'N/A',
                              description: 'Best moment not identified.',
                            },
                            weakest_moment: on.weakest_moment || {
                              question_id: 'N/A',
                              timestamp: 'N/A',
                              description: 'Weakest moment not identified.',
                            },
                            interesting_note: on.interesting_note || {
                              question_id: 'N/A',
                              timestamp: 'N/A',
                              description: 'No interesting notes available.',
                            },
                            missed_opportunity: on.missed_opportunity || {
                              question_id: 'N/A',
                              timestamp: 'N/A',
                              description: 'No missed opportunities identified.',
                            },
                            additional_observations: Array.isArray(on.additional_observations) ? on.additional_observations : [],
                          }
                        }
                        // Note: observer_notes is optional, so we can leave it undefined if not present
                        
                        // Transform overall_assessment to ensure proper structure
                        let transformedOverallAssessment = fullRubric.overall_assessment || {}
                        if (transformedOverallAssessment) {
                          // Ensure key_strengths and key_weaknesses are arrays of objects with title/description
                          if (Array.isArray(transformedOverallAssessment.key_strengths)) {
                            transformedOverallAssessment.key_strengths = transformedOverallAssessment.key_strengths.map((item: any) => {
                              if (typeof item === 'string') {
                                return { title: item, description: item }
                              }
                              return item
                            })
                          }
                          if (Array.isArray(transformedOverallAssessment.key_weaknesses)) {
                            transformedOverallAssessment.key_weaknesses = transformedOverallAssessment.key_weaknesses.map((item: any) => {
                              if (typeof item === 'string') {
                                return { title: item, description: item }
                              }
                              return item
                            })
                          }
                          // Map 'summary' to 'executive_summary' if needed
                          if (transformedOverallAssessment.summary && !transformedOverallAssessment.executive_summary) {
                            transformedOverallAssessment.executive_summary = transformedOverallAssessment.summary
                          }
                        }

                        const enrichedRubric = {
                          ...fullRubric,
                          // Transform overall_assessment with proper structure
                          overall_assessment: transformedOverallAssessment,
                          // Transform traditional_hr_criteria to expected format
                          traditional_hr_criteria: transformedTraditionalCriteria,
                          // Transform time_management_analysis to expected format
                          time_management_analysis: transformedTimeManagement,
                          // Transform comparative_analysis to expected format
                          comparative_analysis: transformedComparativeAnalysis,
                          // Transform question_analysis to expected format
                          question_analysis: transformedQuestionAnalysis,
                          // Add observer_notes if present
                          ...(transformedObserverNotes && { observer_notes: transformedObserverNotes }),
                          // Add required metadata fields if missing
                          rubric_version: fullRubric.rubric_version || '1.0',
                          interview_type: fullRubric.interview_type || currentSessionData?.stage || 'hr_screen',
                          session_metadata: fullRubric.session_metadata || {
                            session_id: currentSessionData?.id || feedback?.interview_session_id || 'unknown',
                            candidate_name: 'Candidate', // Could be extracted from resume if available
                            position: 'Position', // Could be extracted from job description
                            company: 'Company', // Could be extracted from job description
                            interview_date: currentSessionData?.created_at || feedback?.created_at || new Date().toISOString(),
                            interview_duration_seconds: currentSessionData?.duration_seconds || 0,
                          },
                          grading_metadata: fullRubric.grading_metadata || {
                            graded_by_agent: 'Claude Sonnet 4',
                            grading_timestamp: feedback?.created_at || new Date().toISOString(),
                            confidence_in_assessment: 'High',
                          },
                        }
                        console.log('🎨 Final enrichedRubric keys:', Object.keys(enrichedRubric))
                        console.log('🎨 enrichedRubric.overall_assessment:', enrichedRubric.overall_assessment)
                        console.log('🎨 enrichedRubric.traditional_hr_criteria keys:', Object.keys(enrichedRubric.traditional_hr_criteria || {}))
                        console.log('🎨 enrichedRubric.time_management_analysis:', enrichedRubric.time_management_analysis)
                        console.log('🎨 enrichedRubric.comparative_analysis:', enrichedRubric.comparative_analysis)
                        return <DetailedRubricReport data={enrichedRubric} />
                      })() : (
                        <div className="p-12 text-center">
                          <p className="text-gray-600">
                            Detailed rubric report is not available for this interview yet.
                          </p>
                          {feedback && !(feedback as any).full_rubric && (
                            <p className="text-sm text-gray-500 mt-2">
                              The full rubric data has not been generated yet. Please wait for feedback generation to complete.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}

            {/* Combined CTA - Preparing for Hiring Manager Round */}
            {hasFeedback && likelihood === 'likely' && (feedback as any)?.next_steps_preparation && (
              <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-indigo-500">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-6">
                  <Briefcase className="w-8 h-8 text-indigo-600" />
                  <div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Next Step</span>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">Preparing for the Hiring Manager Round</h2>
                  </div>
                </div>

                {/* Readiness Assessment */}
                <div className="bg-indigo-50 rounded-xl p-6 mb-6 border border-indigo-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"/>
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">Readiness Assessment</h3>
                      <p className="text-gray-600 text-sm">Based on your HR screen performance</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <div className="text-sm text-gray-600 mb-1">Ready for Next Round?</div>
                      <div className="text-2xl font-bold text-indigo-600">{(feedback as any).next_steps_preparation.ready_for_hiring_manager ? 'Yes' : 'Not Yet'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <div className="text-sm text-gray-600 mb-1">Confidence Level</div>
                      <div className="text-2xl font-bold text-indigo-600 capitalize">{(feedback as any).next_steps_preparation.confidence_level}</div>
                    </div>
                  </div>
                </div>

                {/* Areas to Study - Collapsible */}
                {(feedback as any).next_steps_preparation.areas_to_study && (feedback as any).next_steps_preparation.areas_to_study.length > 0 && (
                  <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAreasToStudy((prev) => !prev)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <h3 className="font-bold text-lg text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
                        </svg>
                        Areas to Study Before Hiring Manager Interview
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${showAreasToStudy ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showAreasToStudy && (
                      <div className="p-4 bg-white space-y-3">
                        {(feedback as any).next_steps_preparation.areas_to_study.map((area: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-2">{idx + 1}. {area.topic}</h4>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Why:</strong> {area.reason}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Prep tip:</strong> {area.preparation_tip}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Predicted Questions - Collapsible */}
                {(feedback as any).next_steps_preparation.predicted_hiring_manager_questions && (feedback as any).next_steps_preparation.predicted_hiring_manager_questions.length > 0 && (
                  <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowPredictedQuestions((prev) => !prev)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <h3 className="font-bold text-lg text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                        </svg>
                        Predicted Hiring Manager Questions
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${showPredictedQuestions ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showPredictedQuestions && (
                      <div className="p-4 bg-white">
                        <p className="text-sm text-gray-600 mb-3">Based on your resume, the job description, and your HR screen responses, expect these questions:</p>
                        <div className="space-y-2">
                          {(feedback as any).next_steps_preparation.predicted_hiring_manager_questions.map((question: string, idx: number) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                              <span className="font-bold text-indigo-600 mr-2">{idx + 1}.</span>
                              <span className="text-gray-700">"{question}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* CTA 1: Likely + Premium — Start Hiring Manager Interview */}
            {hasFeedback && likelihood === 'likely' && isPremium && (
              <div className="bg-gradient-to-br from-primary-500 via-accent-400 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Briefcase className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Ready for the Hiring Manager Interview?</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        You've completed the HR screen! Now it's time to prepare for the next stage. Practice with our AI-powered hiring manager interview to get ready for the real thing.
                      </p>
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-4 py-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">30-minute technical discussion</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-4 py-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Deep dive into your experience</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-lg px-4 py-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Company-specific questions</span>
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                      >
                        <Briefcase className="w-5 h-5" />
                        <span>Start Hiring Manager Interview</span>
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                    <div className="hidden lg:block">
                      <Briefcase className="w-32 h-32 text-white/20" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              </div>
            )}

            {/* CTA 2: Likely + !Premium — Unlock Hiring Manager OR Unlock All Interviews */}
            {hasFeedback && likelihood === 'likely' && !isPremium && (
              <div className="bg-gradient-to-br from-primary-500 via-accent-400 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Briefcase className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Ready for the Hiring Manager Interview?</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        Unlock the Hiring Manager interview to practice the next stage, or unlock all interview rounds with premium.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPurchaseFlow(true)}
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-500 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                        >
                          <Briefcase className="w-5 h-5" />
                          <span>Unlock Hiring Manager Interview</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPurchaseFlow(true)}
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg"
                        >
                          <Crown className="w-5 h-5" />
                          <span>Unlock All Interviews (Premium)</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-white/70 text-sm mt-3">One-time payment • No subscription • All interview stages</p>
                    </div>
                    <div className="hidden lg:block">
                      <Briefcase className="w-32 h-32 text-white/20" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              </div>
            )}

            {/* CTA 4: Unlikely + !Premium — Unlock Full Interview Process */}
            {hasFeedback && likelihood === 'unlikely' && !isPremium && (
              <div className="bg-gradient-to-br from-primary-500 to-accent-400 rounded-2xl shadow-xl p-8 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Unlock Full Interview Process</h3>
                    <p className="text-primary-100 mb-6">
                      Practice with an AI that has intimate knowledge of the company and job description. Get feedback, practice specific questions, and run through the whole interview again until you're ready to land the job.
                    </p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>Unlock all interview stages (Hiring Manager, Culture Fit, Final Interview)</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>3 practice attempts per interview round</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>Practice specific questions flagged for improvement right in this dashboard</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>AI-powered interviewer with deep knowledge of your target company and role</span>
                      </li>
                    </ul>
                    <div className="mb-4">
                      <p className="text-indigo-200 text-sm font-medium">One-time payment • No subscription • Land the job and never pay again</p>
                    </div>
                    <button 
                      onClick={() => setShowPurchaseFlow(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-white text-primary-500 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg"
                    >
                      <span>Unlock All Interviews</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="hidden lg:block ml-8">
                    <Crown className="w-32 h-32 text-white opacity-20" />
                  </div>
                </div>
              </div>
            )}

            {/* CTA 3: Unlikely + Premium — Retake or move forward (bottom CTA box) */}
            {hasFeedback && likelihood === 'unlikely' && isPremium && (
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden border-2 border-orange-400">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <RefreshCw className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Retake interview or move forward</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        Once you've completed the practice cards and reviewed the focus areas, you can retake this interview to show your improvement (one free retake), or skip ahead to the Hiring Manager interview.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Retake Interview (Free)</span>
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                          href="/dashboard?stage=hiring_manager"
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg"
                        >
                          <Briefcase className="w-5 h-5" />
                          <span>Skip to Hiring Manager Interview</span>
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback CTA if no next_steps_preparation - CTA 1 or 2 (Likely only) */}
            {hasFeedback && likelihood === 'likely' && !(feedback as any)?.next_steps_preparation && (
              <div className="bg-gradient-to-br from-primary-500 via-accent-400 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Briefcase className="w-8 h-8" />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-3">Ready for the Hiring Manager Interview?</h3>
                      <p className="text-lg text-white/90 mb-6 max-w-2xl">
                        {isPremium
                          ? "You've completed the HR screen! Now it's time to prepare for the next stage. Practice with our AI-powered hiring manager interview to get ready for the real thing."
                          : "Unlock the Hiring Manager interview to practice the next stage, or unlock all interview rounds with premium."}
                      </p>
                      {isPremium ? (
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:scale-105 transform"
                        >
                          <Briefcase className="w-5 h-5" />
                          <span>Start Hiring Manager Interview</span>
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPurchaseFlow(true)}
                            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-500 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg"
                          >
                            <Briefcase className="w-5 h-5" />
                            <span>Unlock Hiring Manager Interview</span>
                            <ArrowRight className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPurchaseFlow(true)}
                            className="inline-flex items-center space-x-2 px-8 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all shadow-lg"
                          >
                            <Crown className="w-5 h-5" />
                            <span>Unlock All Interviews (Premium)</span>
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      {!isPremium && <p className="text-white/70 text-sm mt-3">One-time payment • No subscription • All interview stages</p>}
                    </div>
                    <div className="hidden lg:block">
                      <Briefcase className="w-32 h-32 text-white/20" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              </div>
            )}

          </div>
        )}

        {/* Hiring Manager 1 Tab */}
        {activeTab === 'hiring-manager-1' && (
          <div className="space-y-6">
            {/* Gate: Complete HR Screen first / Retake HR Screen / Start Interview */}
            {!hasFeedback && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-2 border-orange-400">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Phone className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Complete in order</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Complete the HR Screen first</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      Interviews must be completed in order. Finish the HR Screen and get a passing grade (or unlock with premium) before starting the Hiring Manager interview.
                    </p>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg"
                    >
                      <Phone className="w-5 h-5" />
                      <span>Start HR Screen</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {hasFeedback && likelihood === 'unlikely' && !isPremium && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-2 border-orange-400">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <AlertCircle className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Recommendation</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Pass the HR Screen before moving on</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      We recommend retaking the HR Screen to improve your score before the Hiring Manager round. You have up to 3 retakes per round. Or unlock with premium to continue without a passing grade.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg"
                      >
                        <RefreshCw className="w-5 h-5" />
                        <span>Retake HR Screen</span>
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowPurchaseFlow(true)}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all"
                      >
                        <Crown className="w-5 h-5" />
                        <span>Unlock with premium</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Start Interview CTA (when eligible but no HM feedback yet) */}
            {canStartHiringManager1 && !hasHmFeedback && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-primary-500 via-accent-400 to-indigo-600">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Briefcase className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Hiring Manager (30min)</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Start Interview</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      You're ready for the Hiring Manager round. Practice with our AI to get detailed feedback and improve before the real interview.
                    </p>
                    <Link
                      href="/dashboard?stage=hiring_manager"
                      className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg"
                    >
                      <Briefcase className="w-5 h-5" />
                      <span>Start Hiring Manager Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Banner (when HM feedback exists) */}
            {hasHmFeedback && (
              <>
                <div className={`rounded-2xl shadow-2xl p-8 relative overflow-hidden ${
                  feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely'
                    ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600'
                    : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500'
                }`}>
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                      <div className="flex items-start space-x-6 flex-1">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-md">
                          {feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely' ? (
                            <CheckCircle className="w-12 h-12 text-white" />
                          ) : (
                            <AlertCircle className="w-12 h-12 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-white">
                          <div className="flex items-center space-x-3 mb-2">
                            <Briefcase className="w-6 h-6" />
                            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Hiring Manager Complete</span>
                          </div>
                          <h2 className="text-4xl font-bold mb-3">
                            {feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely'
                              ? "Strong Performance!"
                              : "Room for Improvement"}
                          </h2>
                          <p className="text-lg text-white/90 mb-4 max-w-2xl">
                            {feedback?.full_rubric?.overall_assessment?.summary || feedback?.detailed_feedback || 'Review the detailed feedback below to see how you performed.'}
                          </p>
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2">
                              <div className="text-3xl font-bold">{feedback?.overall_score ? Math.round(feedback.overall_score * 10) : '--'}%</div>
                              <div className="text-xs uppercase tracking-wider opacity-90">Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                </div>
              </>
            )}

            {/* Areas Passed Tracker */}
            {hasHmFeedback && hmSixAreas ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Your Hiring Manager Interview Progress
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Pass all 6 core areas to master the hiring manager interview.
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-indigo-600">
                        {hmAreasPassed}/{hmTotalAreas}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        Areas Passed
                      </div>
                    </div>
                    <svg className="w-20 h-20">
                      <circle cx="40" cy="40" r={circleRadius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                      <circle
                        cx="40" cy="40" r={circleRadius}
                        stroke="#6366f1" strokeWidth="8" fill="none"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={hmCircleDashOffset}
                        strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${hmAreasProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-600">Focus on the orange areas below to level up.</span>
                    <span className="text-indigo-600 font-semibold">Master all 6 to be hiring-manager ready.</span>
                  </div>
                </div>
              </div>
            ) : !hasHmFeedback ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Your Hiring Manager Interview Progress</h3>
                    <p className="text-sm text-gray-600 mt-1">Pass all core areas to master the hiring manager interview fundamentals.</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-400">--/--</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Areas Passed</div>
                    </div>
                    <svg className="w-20 h-20">
                      <circle cx="40" cy="40" r="30" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gray-300 h-3 rounded-full transition-all" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Master These Areas - Strengths & Needs Work Cards */}
            {hasHmFeedback && hmSixAreas && (
              <div className="space-y-6" data-practice-section>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Master These Areas</h3>
                  <div className="text-sm text-gray-600 flex space-x-4">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Passed / Strengths</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span>Needs Work</span>
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths / Passed Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Passed Areas</h4>
                      {hmStrengthsCards.length > 1 && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <button className="hover:text-gray-900" onClick={() => setHmStrengthCarouselIndex((prev) => prev - 1)}>
                            <span>←</span>
                          </button>
                          <span>Card {getSafeIndex(hmStrengthsCards.length, hmStrengthCarouselIndex) + 1} of {hmStrengthsCards.length}</span>
                          <button className="hover:text-gray-900" onClick={() => setHmStrengthCarouselIndex((prev) => prev + 1)}>
                            <span>→</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {renderStackedCarousel(hmStrengthsCards, hmStrengthCarouselIndex, setHmStrengthCarouselIndex, 'strength')}
                  </div>

                  {/* Needs Work Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Needs Work</h4>
                      {hmNeedsWorkCards.length > 1 && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <button className="hover:text-gray-900" onClick={() => setHmImproveCarouselIndex((prev) => prev - 1)}>
                            <span>←</span>
                          </button>
                          <span>Card {getSafeIndex(hmNeedsWorkCards.length, hmImproveCarouselIndex) + 1} of {hmNeedsWorkCards.length}</span>
                          <button className="hover:text-gray-900" onClick={() => setHmImproveCarouselIndex((prev) => prev + 1)}>
                            <span>→</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {renderStackedCarousel(hmNeedsWorkCards, hmImproveCarouselIndex, setHmImproveCarouselIndex, 'improve')}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state when no HM feedback yet */}
            {!hasHmFeedback && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Master These Areas</h3>
                  <div className="text-sm text-gray-600 flex space-x-4">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Passed / Strengths</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span>Needs Work</span>
                    </span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Passed Areas</h4>
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No data available yet</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Needs Work</h4>
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No data available yet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role-Specific Criteria (Tier 2 - JD-adaptive) */}
            {hasHmFeedback && roleSpecificCriteria.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Role-Specific Skills</h3>
                <p className="text-sm text-gray-600 mb-4">Evaluated based on your job description requirements</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {roleSpecificCriteria.map((criterion: any, idx: number) => {
                    const score = criterion.score || 0
                    const isStrong = score >= 7
                    return (
                      <div key={idx} className={`rounded-xl border-2 p-4 ${isStrong ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{criterion.name}</h4>
                          <div className={`px-3 py-1 rounded-full text-sm font-bold ${isStrong ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {score}/10
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{criterion.feedback}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cross-Stage Progress (if HR Screen feedback was used) */}
            {hasHmFeedback && crossStageProgress && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Progress from HR Screen</h3>
                <p className="text-sm text-gray-600 mb-4">How you improved (or regressed) compared to your phone screen</p>
                <div className="space-y-4">
                  {crossStageProgress.improvement_from_hr_screen && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">Overall Progress</span>
                      </div>
                      <p className="text-sm text-gray-700">{crossStageProgress.improvement_from_hr_screen}</p>
                    </div>
                  )}
                  {crossStageProgress.consistent_strengths?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">Consistent Strengths</span>
                      </div>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {crossStageProgress.consistent_strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start space-x-2"><span className="text-green-500 mt-0.5">+</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {crossStageProgress.persistent_weaknesses?.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-700">Persistent Weaknesses</span>
                      </div>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {crossStageProgress.persistent_weaknesses.map((w: string, i: number) => (
                          <li key={i} className="flex items-start space-x-2"><span className="text-orange-500 mt-0.5">!</span><span>{w}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {crossStageProgress.new_concerns?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-700">New Concerns</span>
                      </div>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {crossStageProgress.new_concerns.map((c: string, i: number) => (
                          <li key={i} className="flex items-start space-x-2"><span className="text-red-500 mt-0.5">-</span><span>{c}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transcript Section */}
            {hasHmFeedback && structuredTranscript && (
              (structuredTranscript.messages && structuredTranscript.messages.length > 0) ||
              (structuredTranscript.questions_asked && structuredTranscript.questions_asked.length > 0)
            ) && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <button
                  type="button"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  className="flex w-full items-center justify-between mb-4 text-left"
                >
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Full Interview Transcript</h3>
                    <div className="mt-1 flex space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span>Strong</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <span>Weak</span>
                      </span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTranscript && (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {structuredTranscript.messages && structuredTranscript.messages.length > 0 ? (
                      structuredTranscript.messages.map((msg: any, idx: number) => {
                        const isCandidate = msg.speaker === 'candidate'

                        let tone: 'strong' | 'weak' | 'neutral' = 'neutral'
                        if (isCandidate && feedback?.hiring_manager_six_areas) {
                          const wentWell = feedback.hiring_manager_six_areas.what_went_well || []
                          const needsImprove = feedback.hiring_manager_six_areas.what_needs_improve || []

                          const inNeeds = needsImprove.some((item: any) =>
                            (item.evidence || []).some((ev: any) => {
                              const questionMatch = ev.question_id && msg.question_id && ev.question_id === msg.question_id
                              const excerptMatch = ev.excerpt && msg.text && msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                              return questionMatch || excerptMatch
                            })
                          )
                          const inWell = wentWell.some((item: any) =>
                            (item.evidence || []).some((ev: any) => {
                              const questionMatch = ev.question_id && msg.question_id && ev.question_id === msg.question_id
                              const excerptMatch = ev.excerpt && msg.text && msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                              return questionMatch || excerptMatch
                            })
                          )

                          if (inNeeds) tone = 'weak'
                          else if (inWell) tone = 'strong'
                        }

                        const baseClasses = 'p-4 rounded-lg border-2 transition-colors cursor-default'
                        const toneClasses = tone === 'strong' ? 'border-green-300 bg-green-50' : tone === 'weak' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'

                        return (
                          <div key={idx} className={`${baseClasses} ${toneClasses}`}>
                            <div className="flex space-x-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                                {isCandidate ? <Users className="w-5 h-5 text-gray-700" /> : <Briefcase className="w-5 h-5 text-indigo-600" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className={`text-sm font-semibold ${isCandidate ? 'text-gray-900' : 'text-indigo-700'}`}>
                                    {isCandidate ? 'You' : 'AI Interviewer'}
                                  </span>
                                  {msg.timestamp && <span className="text-xs text-gray-500">{msg.timestamp}</span>}
                                </div>
                                <p className="text-gray-800 text-sm">{msg.text}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">No transcript messages available.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty transcript state */}
            {!hasHmFeedback && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900">Full Interview Transcript</h3>
                <p className="text-sm text-gray-600 mt-1">Interview transcript will appear here after completion</p>
              </div>
            )}

            {/* Detailed Performance Breakdown - Universal Criteria */}
            {hasHmFeedback && feedback?.full_rubric?.hiring_manager_criteria ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Detailed Performance Breakdown
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Evaluation based on 6 universal hiring manager criteria + role-specific competencies
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHmRubricModal(true)}
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>View Full Report</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : !hasHmFeedback ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold text-gray-900">Detailed Performance Breakdown</h3>
                <p className="text-sm text-gray-600 mt-1">Evaluation based on hiring manager interview criteria</p>
              </div>
            ) : null}

            {/* Full-Screen HM Rubric Report Modal */}
            {showHmRubricModal && (
              <>
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * { visibility: hidden; }
                    .hm-print-content, .hm-print-content * { visibility: visible; }
                    .hm-print-content {
                      position: absolute; left: 0; top: 0; width: 100%;
                      max-width: 100% !important; max-height: none !important;
                      height: auto !important; overflow: visible !important;
                      box-shadow: none !important; border-radius: 0 !important;
                      margin: 0 !important; padding: 20px !important;
                    }
                    .no-print { display: none !important; }
                    @page { margin: 1cm; }
                  }
                `}} />
                <div className="fixed inset-0 z-50 overflow-y-auto hm-print-content">
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity no-print"
                    onClick={() => setShowHmRubricModal(false)}
                  ></div>

                  <div className="relative min-h-screen flex items-start justify-center p-4 pt-8 pb-8 print:min-h-0 print:p-0">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:my-0">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 print:border-b-2">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Detailed Performance Report
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Hiring Manager Interview Analysis
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 no-print">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all text-sm font-medium flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Print / Save PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowHmRubricModal(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                            aria-label="Close"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
                        {feedback?.full_rubric ? (() => {
                          const fullRubric = (feedback as any).full_rubric
                          const enrichedHmRubric = {
                            ...fullRubric,
                            rubric_version: fullRubric.rubric_version || '1.0',
                            interview_type: 'hiring_manager',
                            session_metadata: fullRubric.session_metadata || {
                              session_id: currentSessionData?.id || feedback?.interview_session_id || 'unknown',
                              candidate_name: 'Candidate',
                              position: 'Position',
                              company: 'Company',
                              interview_date: currentSessionData?.created_at || feedback?.created_at || new Date().toISOString(),
                              interview_duration_seconds: currentSessionData?.duration_seconds || 0,
                            },
                            grading_metadata: fullRubric.grading_metadata || {
                              graded_by_agent: 'Claude Sonnet 4',
                              grading_timestamp: feedback?.created_at || new Date().toISOString(),
                              confidence_in_assessment: 'High',
                            },
                          }
                          return <DetailedHmRubricReport data={enrichedHmRubric} />
                        })() : (
                          <div className="p-12 text-center">
                            <p className="text-gray-600">
                              Detailed rubric report is not available for this interview yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Culture Fit Tab */}
        {activeTab === 'culture-fit' && (
          <div className="space-y-6">
            {/* Gate: Complete Hiring Manager (30min) first (required for everyone, including premium) */}
            {!interviewData.hiringManager1.completed && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-2 border-orange-400">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Briefcase className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Complete in order</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Complete the Hiring Manager (30min) interview first</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      Interviews must be completed in order. Everyone must finish the Hiring Manager round before starting the Culture Fit interview.
                    </p>
                    <Link
                      href="/dashboard?stage=hiring_manager"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg"
                    >
                      <Briefcase className="w-5 h-5" />
                      <span>Start Hiring Manager Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {/* Start Interview CTA (when eligible but no CF feedback yet) */}
            {interviewData.hiringManager1.completed && !hasCfFeedback && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-primary-500 via-accent-400 to-indigo-600">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Users className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Culture Fit</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Start Interview</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      Practice the Culture Fit round with our AI. Get feedback on how you align with the company's values and team dynamics.
                    </p>
                    <Link
                      href="/dashboard?stage=culture_fit"
                      className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg"
                    >
                      <Users className="w-5 h-5" />
                      <span>Start Culture Fit Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Banner (when CF feedback exists) */}
            {hasCfFeedback && (
              <>
                <div className={`rounded-2xl shadow-2xl p-8 relative overflow-hidden ${
                  feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely'
                    ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600'
                    : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500'
                }`}>
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                      <div className="flex items-start space-x-6 flex-1">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-md">
                          {feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely' ? (
                            <CheckCircle className="w-12 h-12 text-white" />
                          ) : (
                            <AlertCircle className="w-12 h-12 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-white">
                          <div className="flex items-center space-x-3 mb-2">
                            <Users className="w-6 h-6" />
                            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Culture Fit Complete</span>
                          </div>
                          <h2 className="text-4xl font-bold mb-3">
                            {feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely'
                              ? "Strong Performance!"
                              : "Room for Improvement"}
                          </h2>
                          <p className="text-lg text-white/90 mb-4 max-w-2xl">
                            {feedback?.full_rubric?.overall_assessment?.summary || feedback?.detailed_feedback || 'Review the detailed feedback below to see how you performed.'}
                          </p>
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2">
                              <div className="text-3xl font-bold">{feedback?.overall_score ? Math.round(feedback.overall_score * 10) : '--'}%</div>
                              <div className="text-xs uppercase tracking-wider opacity-90">Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                </div>
              </>
            )}

            {/* Areas Passed Tracker */}
            {hasCfFeedback && cfSixAreas ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Your Culture Fit Interview Progress
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Pass all 6 core areas to master the culture fit interview.
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-indigo-600">
                        {cfAreasPassed}/{cfTotalAreas}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        Areas Passed
                      </div>
                    </div>
                    <svg className="w-20 h-20">
                      <circle cx="40" cy="40" r={circleRadius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                      <circle
                        cx="40" cy="40" r={circleRadius}
                        stroke="#6366f1" strokeWidth="8" fill="none"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={cfCircleDashOffset}
                        strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${cfAreasProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-600">Focus on the orange areas below to level up.</span>
                    <span className="text-indigo-600 font-semibold">Master all areas to be culture-fit ready.</span>
                  </div>
                </div>
              </div>
            ) : !hasCfFeedback ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Your Culture Fit Interview Progress</h3>
                    <p className="text-sm text-gray-600 mt-1">Pass all core areas to master the culture fit interview fundamentals.</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-400">--/--</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Areas Passed</div>
                    </div>
                    <svg className="w-20 h-20">
                      <circle cx="40" cy="40" r="30" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gray-300 h-3 rounded-full transition-all" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Master These Areas - Strengths & Needs Work Cards */}
            {hasCfFeedback && cfSixAreas && (
              <div className="space-y-6" data-practice-section>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Master These Areas</h3>
                  <div className="text-sm text-gray-600 flex space-x-4">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Passed / Strengths</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span>Needs Work</span>
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths / Passed Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Passed Areas</h4>
                      {cfStrengthsCards.length > 1 && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <button className="hover:text-gray-900" onClick={() => setCfStrengthCarouselIndex((prev) => prev - 1)}>
                            <span>&larr;</span>
                          </button>
                          <span>Card {getSafeIndex(cfStrengthsCards.length, cfStrengthCarouselIndex) + 1} of {cfStrengthsCards.length}</span>
                          <button className="hover:text-gray-900" onClick={() => setCfStrengthCarouselIndex((prev) => prev + 1)}>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {renderStackedCarousel(cfStrengthsCards, cfStrengthCarouselIndex, setCfStrengthCarouselIndex, 'strength')}
                  </div>

                  {/* Needs Work Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Needs Work</h4>
                      {cfNeedsWorkCards.length > 1 && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <button className="hover:text-gray-900" onClick={() => setCfImproveCarouselIndex((prev) => prev - 1)}>
                            <span>&larr;</span>
                          </button>
                          <span>Card {getSafeIndex(cfNeedsWorkCards.length, cfImproveCarouselIndex) + 1} of {cfNeedsWorkCards.length}</span>
                          <button className="hover:text-gray-900" onClick={() => setCfImproveCarouselIndex((prev) => prev + 1)}>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {renderStackedCarousel(cfNeedsWorkCards, cfImproveCarouselIndex, setCfImproveCarouselIndex, 'improve')}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state when no CF feedback yet */}
            {!hasCfFeedback && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Master These Areas</h3>
                  <div className="text-sm text-gray-600 flex space-x-4">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Passed / Strengths</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span>Needs Work</span>
                    </span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Passed Areas</h4>
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No data available yet</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Needs Work</h4>
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No data available yet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript Section */}
            {hasCfFeedback && structuredTranscript && (
              (structuredTranscript.messages && structuredTranscript.messages.length > 0) ||
              (structuredTranscript.questions_asked && structuredTranscript.questions_asked.length > 0)
            ) && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <button
                  type="button"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  className="flex w-full items-center justify-between mb-4 text-left"
                >
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Full Interview Transcript</h3>
                    <div className="mt-1 flex space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span>Strong</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <span>Weak</span>
                      </span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTranscript && (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {structuredTranscript.messages && structuredTranscript.messages.length > 0 ? (
                      structuredTranscript.messages.map((msg: any, idx: number) => {
                        const isCandidate = msg.speaker === 'candidate'

                        let tone: 'strong' | 'weak' | 'neutral' = 'neutral'
                        if (isCandidate && feedback?.culture_fit_six_areas) {
                          const wentWell = feedback.culture_fit_six_areas.what_went_well || []
                          const needsImprove = feedback.culture_fit_six_areas.what_needs_improve || []

                          const inNeeds = needsImprove.some((item: any) =>
                            (item.evidence || []).some((ev: any) => {
                              const questionMatch = ev.question_id && msg.question_id && ev.question_id === msg.question_id
                              const excerptMatch = ev.excerpt && msg.text && msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                              return questionMatch || excerptMatch
                            })
                          )
                          const inWell = wentWell.some((item: any) =>
                            (item.evidence || []).some((ev: any) => {
                              const questionMatch = ev.question_id && msg.question_id && ev.question_id === msg.question_id
                              const excerptMatch = ev.excerpt && msg.text && msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                              return questionMatch || excerptMatch
                            })
                          )

                          if (inNeeds) tone = 'weak'
                          else if (inWell) tone = 'strong'
                        }

                        const baseClasses = 'p-4 rounded-lg border-2 transition-colors cursor-default'
                        const toneClasses = tone === 'strong' ? 'border-green-300 bg-green-50' : tone === 'weak' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'

                        return (
                          <div key={idx} className={`${baseClasses} ${toneClasses}`}>
                            <div className="flex space-x-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                                {isCandidate ? <Users className="w-5 h-5 text-gray-700" /> : <Briefcase className="w-5 h-5 text-indigo-600" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className={`text-sm font-semibold ${isCandidate ? 'text-gray-900' : 'text-indigo-700'}`}>
                                    {isCandidate ? 'You' : 'AI Interviewer'}
                                  </span>
                                  {msg.timestamp && <span className="text-xs text-gray-500">{msg.timestamp}</span>}
                                </div>
                                <p className="text-gray-800 text-sm">{msg.text}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">No transcript messages available.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty transcript state */}
            {!hasCfFeedback && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900">Full Interview Transcript</h3>
                <p className="text-sm text-gray-600 mt-1">Interview transcript will appear here after completion</p>
              </div>
            )}

            {/* Detailed Performance Breakdown - Culture Fit Criteria */}
            {hasCfFeedback && feedback?.full_rubric?.culture_fit_criteria ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Detailed Performance Breakdown
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Evaluation based on culture fit interview criteria
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCfRubricModal(true)}
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>View Full Report</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : !hasCfFeedback ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold text-gray-900">Detailed Performance Breakdown</h3>
                <p className="text-sm text-gray-600 mt-1">Evaluation based on culture fit interview criteria</p>
              </div>
            ) : null}

            {/* Full-Screen CF Rubric Report Modal */}
            {showCfRubricModal && (
              <>
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * { visibility: hidden; }
                    .cf-print-content, .cf-print-content * { visibility: visible; }
                    .cf-print-content {
                      position: absolute; left: 0; top: 0; width: 100%;
                      max-width: 100% !important; max-height: none !important;
                      height: auto !important; overflow: visible !important;
                      box-shadow: none !important; border-radius: 0 !important;
                      margin: 0 !important; padding: 20px !important;
                    }
                    .no-print { display: none !important; }
                    @page { margin: 1cm; }
                  }
                `}} />
                <div className="fixed inset-0 z-50 overflow-y-auto cf-print-content">
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity no-print"
                    onClick={() => setShowCfRubricModal(false)}
                  ></div>

                  <div className="relative min-h-screen flex items-start justify-center p-4 pt-8 pb-8 print:min-h-0 print:p-0">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:my-0">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 print:border-b-2">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Detailed Performance Report
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Culture Fit Interview Analysis
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 no-print">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all text-sm font-medium flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Print / Save PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCfRubricModal(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                            aria-label="Close"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
                        {feedback?.full_rubric ? (() => {
                          const fullRubric = (feedback as any).full_rubric
                          const enrichedCfRubric = {
                            ...fullRubric,
                            hiring_manager_criteria: fullRubric.culture_fit_criteria,
                            rubric_version: fullRubric.rubric_version || '1.0',
                            interview_type: 'culture_fit',
                            session_metadata: fullRubric.session_metadata || {
                              session_id: currentSessionData?.id || feedback?.interview_session_id || 'unknown',
                              candidate_name: 'Candidate',
                              position: 'Position',
                              company: 'Company',
                              interview_date: currentSessionData?.created_at || feedback?.created_at || new Date().toISOString(),
                              interview_duration_seconds: currentSessionData?.duration_seconds || 0,
                            },
                            grading_metadata: fullRubric.grading_metadata || {
                              graded_by_agent: 'Claude Sonnet 4',
                              grading_timestamp: feedback?.created_at || new Date().toISOString(),
                              confidence_in_assessment: 'High',
                            },
                          }
                          return <DetailedHmRubricReport data={enrichedCfRubric} />
                        })() : (
                          <div className="p-12 text-center">
                            <p className="text-gray-600">
                              Detailed rubric report is not available for this interview yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Hiring Manager 2 (Final Interview) Tab */}
        {activeTab === 'hiring-manager-2' && (
          <div className="space-y-6">
            {/* Gate: Complete Culture Fit first (required for everyone, including premium) */}
            {!interviewData.cultureFit.completed && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-2 border-orange-400">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Users className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Complete in order</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Complete the Culture Fit interview first</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      Interviews must be completed in order. Everyone must finish the Culture Fit round before starting the Final interview.
                    </p>
                    <Link
                      href="/dashboard?stage=culture_fit"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg"
                    >
                      <Users className="w-5 h-5" />
                      <span>Start Culture Fit Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {/* Start Interview CTA (when eligible but no FR feedback yet) */}
            {interviewData.cultureFit.completed && !hasFrFeedback && (
              <div className="rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-gradient-to-br from-primary-500 via-accent-400 to-indigo-600">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Crown className="w-8 h-8 text-white" />
                      <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Final Interview</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Start Interview</h2>
                    <p className="text-lg text-white/90 mb-6 max-w-2xl">
                      You're ready for the Final round. Practice with our AI to get detailed feedback before your real final interview.
                    </p>
                    <Link
                      href="/dashboard?stage=final"
                      className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg"
                    >
                      <Crown className="w-5 h-5" />
                      <span>Start Final Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Banner (when FR feedback exists) */}
            {hasFrFeedback && (
              <>
                <div className={`rounded-2xl shadow-2xl p-8 relative overflow-hidden ${
                  feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely'
                    ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600'
                    : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500'
                }`}>
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                      <div className="flex items-start space-x-6 flex-1">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-md">
                          {feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely' ? (
                            <CheckCircle className="w-12 h-12 text-white" />
                          ) : (
                            <AlertCircle className="w-12 h-12 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-white">
                          <div className="flex items-center space-x-3 mb-2">
                            <Crown className="w-6 h-6" />
                            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Final Round Complete</span>
                          </div>
                          <h2 className="text-4xl font-bold mb-3">
                            {feedback?.full_rubric?.overall_assessment?.likelihood_to_advance === 'likely'
                              ? "Strong Performance!"
                              : "Room for Improvement"}
                          </h2>
                          <p className="text-lg text-white/90 mb-4 max-w-2xl">
                            {feedback?.full_rubric?.overall_assessment?.summary || feedback?.detailed_feedback || 'Review the detailed feedback below to see how you performed.'}
                          </p>
                          <div className="flex items-center space-x-4">
                            <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2">
                              <div className="text-3xl font-bold">{feedback?.overall_score ? Math.round(feedback.overall_score * 10) : '--'}%</div>
                              <div className="text-xs uppercase tracking-wider opacity-90">Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                </div>
              </>
            )}

            {/* Areas Passed Tracker */}
            {hasFrFeedback && frSixAreas ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Your Final Interview Progress
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Pass all 6 core areas to master the final interview.
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-indigo-600">
                        {frAreasPassed}/{frTotalAreas}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        Areas Passed
                      </div>
                    </div>
                    <svg className="w-20 h-20">
                      <circle cx="40" cy="40" r={circleRadius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                      <circle
                        cx="40" cy="40" r={circleRadius}
                        stroke="#6366f1" strokeWidth="8" fill="none"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={frCircleDashOffset}
                        strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${frAreasProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-600">Focus on the orange areas below to level up.</span>
                    <span className="text-indigo-600 font-semibold">Master all areas to be final-round ready.</span>
                  </div>
                </div>
              </div>
            ) : !hasFrFeedback ? (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Your Final Interview Progress</h3>
                    <p className="text-sm text-gray-600 mt-1">Pass all core areas to master the final interview fundamentals.</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-400">--/--</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Areas Passed</div>
                    </div>
                    <svg className="w-20 h-20">
                      <circle cx="40" cy="40" r="30" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gray-300 h-3 rounded-full transition-all" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Master These Areas - Strengths & Needs Work Cards */}
            {hasFrFeedback && frSixAreas && (
              <div className="space-y-6" data-practice-section>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Master These Areas</h3>
                  <div className="text-sm text-gray-600 flex space-x-4">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Passed / Strengths</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span>Needs Work</span>
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths / Passed Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Passed Areas</h4>
                      {frStrengthsCards.length > 1 && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <button className="hover:text-gray-900" onClick={() => setFrStrengthCarouselIndex((prev) => prev - 1)}>
                            <span>&larr;</span>
                          </button>
                          <span>Card {getSafeIndex(frStrengthsCards.length, frStrengthCarouselIndex) + 1} of {frStrengthsCards.length}</span>
                          <button className="hover:text-gray-900" onClick={() => setFrStrengthCarouselIndex((prev) => prev + 1)}>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {renderStackedCarousel(frStrengthsCards, frStrengthCarouselIndex, setFrStrengthCarouselIndex, 'strength')}
                  </div>

                  {/* Needs Work Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Needs Work</h4>
                      {frNeedsWorkCards.length > 1 && (
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <button className="hover:text-gray-900" onClick={() => setFrImproveCarouselIndex((prev) => prev - 1)}>
                            <span>&larr;</span>
                          </button>
                          <span>Card {getSafeIndex(frNeedsWorkCards.length, frImproveCarouselIndex) + 1} of {frNeedsWorkCards.length}</span>
                          <button className="hover:text-gray-900" onClick={() => setFrImproveCarouselIndex((prev) => prev + 1)}>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {renderStackedCarousel(frNeedsWorkCards, frImproveCarouselIndex, setFrImproveCarouselIndex, 'improve')}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state when no FR feedback yet */}
            {!hasFrFeedback && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Master These Areas</h3>
                  <div className="text-sm text-gray-600 flex space-x-4">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Passed / Strengths</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      <span>Needs Work</span>
                    </span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Passed Areas</h4>
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No data available yet</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Needs Work</h4>
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No data available yet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript Section */}
            {hasFrFeedback && structuredTranscript && (
              (structuredTranscript.messages && structuredTranscript.messages.length > 0) ||
              (structuredTranscript.questions_asked && structuredTranscript.questions_asked.length > 0)
            ) && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <button
                  type="button"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  className="flex w-full items-center justify-between mb-4 text-left"
                >
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Full Interview Transcript</h3>
                    <div className="mt-1 flex space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span>Strong</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <span>Weak</span>
                      </span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTranscript && (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {structuredTranscript.messages && structuredTranscript.messages.length > 0 ? (
                      structuredTranscript.messages.map((msg: any, idx: number) => {
                        const isCandidate = msg.speaker === 'candidate'

                        let tone: 'strong' | 'weak' | 'neutral' = 'neutral'
                        if (isCandidate && feedback?.final_round_six_areas) {
                          const wentWell = feedback.final_round_six_areas.what_went_well || []
                          const needsImprove = feedback.final_round_six_areas.what_needs_improve || []

                          const inNeeds = needsImprove.some((item: any) =>
                            (item.evidence || []).some((ev: any) => {
                              const questionMatch = ev.question_id && msg.question_id && ev.question_id === msg.question_id
                              const excerptMatch = ev.excerpt && msg.text && msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                              return questionMatch || excerptMatch
                            })
                          )
                          const inWell = wentWell.some((item: any) =>
                            (item.evidence || []).some((ev: any) => {
                              const questionMatch = ev.question_id && msg.question_id && ev.question_id === msg.question_id
                              const excerptMatch = ev.excerpt && msg.text && msg.text.toLowerCase().includes(ev.excerpt.toLowerCase().substring(0, 50))
                              return questionMatch || excerptMatch
                            })
                          )

                          if (inNeeds) tone = 'weak'
                          else if (inWell) tone = 'strong'
                        }

                        const baseClasses = 'p-4 rounded-lg border-2 transition-colors cursor-default'
                        const toneClasses = tone === 'strong' ? 'border-green-300 bg-green-50' : tone === 'weak' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'

                        return (
                          <div key={idx} className={`${baseClasses} ${toneClasses}`}>
                            <div className="flex space-x-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                                {isCandidate ? <Users className="w-5 h-5 text-gray-700" /> : <Crown className="w-5 h-5 text-indigo-600" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className={`text-sm font-semibold ${isCandidate ? 'text-gray-900' : 'text-indigo-700'}`}>
                                    {isCandidate ? 'You' : 'AI Interviewer'}
                                  </span>
                                  {msg.timestamp && <span className="text-xs text-gray-500">{msg.timestamp}</span>}
                                </div>
                                <p className="text-gray-800 text-sm">{msg.text}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">No transcript messages available.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty transcript state */}
            {!hasFrFeedback && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900">Full Interview Transcript</h3>
                <p className="text-sm text-gray-600 mt-1">Interview transcript will appear here after completion</p>
              </div>
            )}

            {/* Detailed Performance Breakdown - Final Round Criteria */}
            {hasFrFeedback && feedback?.full_rubric?.final_round_criteria ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Detailed Performance Breakdown
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Evaluation based on final round interview criteria
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFrRubricModal(true)}
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>View Full Report</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : !hasFrFeedback ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold text-gray-900">Detailed Performance Breakdown</h3>
                <p className="text-sm text-gray-600 mt-1">Evaluation based on final interview criteria</p>
              </div>
            ) : null}

            {/* Full-Screen FR Rubric Report Modal */}
            {showFrRubricModal && (
              <>
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * { visibility: hidden; }
                    .fr-print-content, .fr-print-content * { visibility: visible; }
                    .fr-print-content {
                      position: absolute; left: 0; top: 0; width: 100%;
                      max-width: 100% !important; max-height: none !important;
                      height: auto !important; overflow: visible !important;
                      box-shadow: none !important; border-radius: 0 !important;
                      margin: 0 !important; padding: 20px !important;
                    }
                    .no-print { display: none !important; }
                    @page { margin: 1cm; }
                  }
                `}} />
                <div className="fixed inset-0 z-50 overflow-y-auto fr-print-content">
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity no-print"
                    onClick={() => setShowFrRubricModal(false)}
                  ></div>

                  <div className="relative min-h-screen flex items-start justify-center p-4 pt-8 pb-8 print:min-h-0 print:p-0">
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:my-0">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 print:border-b-2">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Detailed Performance Report
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Final Round Interview Analysis
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 no-print">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all text-sm font-medium flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Print / Save PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFrRubricModal(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                            aria-label="Close"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
                        {feedback?.full_rubric ? (() => {
                          const fullRubric = (feedback as any).full_rubric
                          const enrichedFrRubric = {
                            ...fullRubric,
                            hiring_manager_criteria: fullRubric.final_round_criteria,
                            rubric_version: fullRubric.rubric_version || '1.0',
                            interview_type: 'final_round',
                            session_metadata: fullRubric.session_metadata || {
                              session_id: currentSessionData?.id || feedback?.interview_session_id || 'unknown',
                              candidate_name: 'Candidate',
                              position: 'Position',
                              company: 'Company',
                              interview_date: currentSessionData?.created_at || feedback?.created_at || new Date().toISOString(),
                              interview_duration_seconds: currentSessionData?.duration_seconds || 0,
                            },
                            grading_metadata: fullRubric.grading_metadata || {
                              graded_by_agent: 'Claude Sonnet 4',
                              grading_timestamp: feedback?.created_at || new Date().toISOString(),
                              confidence_in_assessment: 'High',
                            },
                          }
                          return <DetailedHmRubricReport data={enrichedFrRubric} />
                        })() : (
                          <div className="p-12 text-center">
                            <p className="text-gray-600">
                              Detailed rubric report is not available for this interview yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Feedback Chat Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Tooltip */}
        {showFeedbackChatTooltip && (
          <div className="relative mb-3 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl animate-fade-in">
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            <p className="font-medium mb-1">Ask About Your Feedback</p>
            <p className="text-gray-300 text-xs">
              Chat with the AI interviewer to discuss what went well, what needs improvement, and ask specific questions about your performance.
            </p>
          </div>
        )}
        
        {/* Chat Button */}
        <button
          onClick={() => {
            setShowFeedbackChatTooltip(false)
            // TODO: Open feedback chat interface
            console.log('Feedback chat clicked')
          }}
          className="w-14 h-14 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center group"
          aria-label="Ask about feedback"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Purchase Flow Modal */}
      {showPurchaseFlow && (
        <PurchaseFlow
          onClose={() => setShowPurchaseFlow(false)}
        />
      )}

    </div>
  )
}
