'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import AudioVisualizer from '@/components/AudioVisualizer'
import { Mic, MicOff, X, MessageSquare, Eye, EyeOff, Phone, ArrowLeft, AlertTriangle } from 'lucide-react'

type Stage = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const STAGE_NAMES: Record<Stage, string> = {
  hr_screen: 'HR Phone Screen',
  hiring_manager: 'Hiring Manager Interview',
  culture_fit: 'Culture Fit Interview',
  final: 'Final Round Interview',
}

export default function InterviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<Stage>('hr_screen')
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [backgroundColor, setBackgroundColor] = useState<'white' | 'black'>('white')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [hasUserPermission, setHasUserPermission] = useState(false)
  const [isInterviewActive, setIsInterviewActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false)
  const [showQuestionWarning, setShowQuestionWarning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // HR Screen conversation state tracking (only for hr_screen stage)
  // Initialize to 'opening' for hr_screen, null for other stages
  const [conversationPhase, setConversationPhase] = useState<'opening' | 'company_intro' | 'job_overview' | 'screening' | 'q_and_a' | 'closing' | null>(
    stage === 'hr_screen' ? 'opening' : null
  )
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])
  
  // Use refs for immediate synchronous access (state updates are async)
  const isInterviewActiveRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const conversationPhaseRef = useRef<'opening' | 'company_intro' | 'job_overview' | 'screening' | 'q_and_a' | 'closing' | null>(
    stage === 'hr_screen' ? 'opening' : null
  )
  const askedQuestionsRef = useRef<string[]>([])
  
  // Keep refs in sync with state
  useEffect(() => {
    conversationPhaseRef.current = conversationPhase
  }, [conversationPhase])
  
  useEffect(() => {
    askedQuestionsRef.current = askedQuestions
  }, [askedQuestions])
  
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null)
  const localAudioSenderRef = useRef<RTCRtpSender | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const interviewStartTimeRef = useRef<number | null>(null)
  const assistantSpeakingRef = useRef(false)
  const assistantSpeechResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const turnDetectionDisabledRef = useRef(false)
  const closingDetectedRef = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const getOrCreateInterviewMediaStream = async () => {
    const existingStream = mediaStreamRef.current
    const hasLiveTrack = existingStream?.getAudioTracks().some((track) => track.readyState === 'live')

    if (existingStream && hasLiveTrack) {
      return existingStream
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    mediaStreamRef.current = stream
    return stream
  }

  const setRealtimeMicEnabled = (enabled: boolean) => {
    if (assistantSpeechResetTimeoutRef.current && enabled) {
      clearTimeout(assistantSpeechResetTimeoutRef.current)
      assistantSpeechResetTimeoutRef.current = null
    }

    const stream = mediaStreamRef.current
    if (!stream) return

    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  const setRealtimeAudioInputEnabled = async (enabled: boolean) => {
    const sender = localAudioSenderRef.current
    const track = localAudioTrackRef.current

    if (!sender) return

    try {
      await sender.replaceTrack(enabled ? track : null)
      console.log('[realtime] audio sender', enabled ? 'attached' : 'detached')
    } catch (error) {
      console.error('[realtime] failed to toggle audio sender', error)
    }
  }

  const updateRealtimeTurnDetection = (enabled: boolean) => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') return

    if (enabled && !turnDetectionDisabledRef.current) return
    if (!enabled && turnDetectionDisabledRef.current) return

    dc.send(JSON.stringify({
      type: 'session.update',
      session: {
        turn_detection: enabled
          ? {
              type: 'server_vad',
              threshold: 0.8,
              prefix_padding_ms: 300,
              silence_duration_ms: 900,
            }
          : null,
      },
    }))

    turnDetectionDisabledRef.current = !enabled
    console.log('[realtime] turn detection', enabled ? 'enabled' : 'disabled')
  }

  const markClosingAndFinish = () => {
    if (closingDetectedRef.current) return
    closingDetectedRef.current = true
    setIsListening(false)
    setRealtimeMicEnabled(false)

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }

    closeTimerRef.current = setTimeout(() => {
      setInterviewComplete(true)
      endInterview()
      closeTimerRef.current = null
    }, 3200)
  }

  useEffect(() => {
    // Ensure interviewComplete starts as false (reset on page load)
    setInterviewComplete(false)
    setTurnCount(0)
    setTranscript([])
    setCurrentMessage('')
    interviewStartTimeRef.current = null
    
    // Load stage from URL first (this is the source of truth for which interview type)
    const stageParam = (searchParams.get('stage') as Stage) || 'hr_screen'
    const resolvedStage = ['hr_screen', 'hiring_manager', 'culture_fit', 'final'].includes(stageParam) ? stageParam : 'hr_screen'
    setStage(resolvedStage)
    // Initialize conversation phase for HR screen
    if (resolvedStage === 'hr_screen') {
      setConversationPhase('opening')
    } else {
      setConversationPhase(null)
    }
    // Use URL stage so we cancel/init the correct stage (state would still be stale here)
    initializeSession(resolvedStage)

    // Cleanup on unmount - ensure no audio/recording continues
    return () => {
      console.log('Component unmounting - cleaning up all resources')
      cleanupAllResources()
    }
  }, [])

  // Keep ref in sync with state for immediate synchronous checks
  useEffect(() => {
    isInterviewActiveRef.current = isInterviewActive
  }, [isInterviewActive])

  // Elapsed time timer during active interview
  useEffect(() => {
    if (!isListening) return
    const interval = setInterval(() => {
      if (interviewStartTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - interviewStartTimeRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isListening])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Safety: Monitor page navigation and cleanup if user leaves interview page
  useEffect(() => {
    const handleRouteChange = () => {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/interview')) {
        console.log('User navigated away from interview page - cleaning up')
        // Inline cleanup to avoid dependency issues
        setIsInterviewActive(false)
        setHasUserPermission(false)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          audioRef.current.src = ''
        }
        if (mediaRecorderRef.current) {
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          }
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        disconnectRealtime()
        setIsListening(false)
        setIsRecording(false)
        setIsPlayingAudio(false)
      }
    }

    // Check on mount
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/interview')) {
      handleRouteChange()
    }

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const initializeSession = async (stageFromUrl?: Stage) => {
    const stageToUse = stageFromUrl ?? stage
    try {
      const redirectToSetup = () => {
        router.push('/dashboard?new=1')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        // HR screen is free and anonymous, but it still requires temp setup data.
        if (stageToUse !== 'hr_screen') {
          router.push('/auth/login')
          return
        }

        const tempDataStr = typeof window !== 'undefined' ? localStorage.getItem('temp_interview_data') : null
        if (!tempDataStr) {
          console.log('No anonymous interview setup data found - redirecting to dashboard setup')
          redirectToSetup()
        }
        return
      }

      // Check access for paid stages before proceeding
      if (stageToUse !== 'hr_screen') {
        try {
          const paymentRes = await fetch('/api/payments/status')
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json()
            const access = paymentData.stageAccess?.[stageToUse]
            if (!access?.hasAccess) {
              console.log('User does not have access to stage:', stageToUse)
              router.push('/dashboard')
              return
            }
          }
        } catch (err) {
          console.error('Error checking stage access:', err)
        }
      }

      // Get user interview data (handle case where none exists or multiple rows)
      // Use limit(1) and take first result to handle multiple rows gracefully
      const { data: interviewDataArray, error: interviewError } = await supabase
        .from('user_interview_data')
        .select('id, resume_text, job_description_text, company_website')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      // Take the first result (most recent)
      const interviewData = interviewDataArray && interviewDataArray.length > 0 ? interviewDataArray[0] : null
      
      if (interviewError) {
        console.error('Error fetching interview data:', interviewError)
        // Log the full error for debugging
        console.error('Full error details:', JSON.stringify(interviewError, null, 2))
      } else {
        console.log('Interview data check (stage:', stageToUse, '):', {
          hasId: !!interviewData?.id,
          hasResumeText: !!interviewData?.resume_text && interviewData.resume_text.length > 0,
          hasJobDescription: !!interviewData?.job_description_text && interviewData.job_description_text.length > 0,
          resumeTextLength: interviewData?.resume_text?.length || 0,
          jobDescriptionLength: interviewData?.job_description_text?.length || 0,
        })
      }

      const hasResumeText = !!interviewData?.resume_text && interviewData.resume_text.trim().length > 0
      const hasJobDescription = !!interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0

      if (!hasResumeText || !hasJobDescription) {
        console.log('Missing interview setup data - redirecting to dashboard setup', {
          hasResumeText,
          hasJobDescription,
          stage: stageToUse,
        })
        redirectToSetup()
        return
      }

      // Cancel any existing in-progress sessions for this user/stage (use URL stage so correct type)
      const { data: existingSessions, error: sessionsError } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('stage', stageToUse)
        .eq('status', 'in_progress')
      
      if (sessionsError) {
        console.error('Error fetching existing sessions:', sessionsError)
      }

      if (existingSessions && existingSessions.length > 0) {
        // Mark all in-progress sessions as cancelled
        await supabase
          .from('interview_sessions')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
          .eq('stage', stageToUse)
          .eq('status', 'in_progress')
        
        console.log(`Cancelled ${existingSessions.length} existing in-progress session(s)`)
      }

      // Always create a NEW interview session - never resume
      // Session will only be created when user clicks "Begin Interview"
      // For now, just prepare the interview data ID for when they start
      console.log('Ready to start new interview. Interview data available:', !!interviewData?.id)
    } catch (error) {
      console.error('Error initializing session:', error)
      // Don't set interviewComplete to true on error
    }
  }

  const connectRealtime = async () => {
    try {
      // Create interview session NOW (when user clicks Begin Interview)
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession()
      
      // For HR screen, allow proceeding without account (anonymous mode)
      // Check for temp data in localStorage
      let tempInterviewData = null
      let reuseInterviewDataId: string | null = null
      if (!authSession) {
        const tempDataStr = localStorage.getItem('temp_interview_data')
        if (tempDataStr) {
          tempInterviewData = JSON.parse(tempDataStr)
          console.log('Found temp interview data for anonymous user')
        } else {
          // No session and no temp data - redirect to login
          router.push('/auth/login')
          return
        }
      } else {
        reuseInterviewDataId = localStorage.getItem('prepme_retake_interview_data_id')
      }

      // Create session via API (uses supabaseAdmin to bypass RLS for anonymous users)
      const sessionRes = await fetch('/api/interview/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, tempInterviewData, reuseInterviewDataId }),
      })
      if (!sessionRes.ok) {
        const err = await sessionRes.json()
        console.error('Error creating session:', err)
        throw new Error('Failed to create interview session')
      }
      const { sessionId: newSessionId } = await sessionRes.json()
      setSessionId(newSessionId)
      sessionIdRef.current = newSessionId
      console.log('Created new interview session:', newSessionId)
      localStorage.removeItem('prepme_retake_interview_data_id')
      
      // Mark interview as active before connecting
      isInterviewActiveRef.current = true
      setIsInterviewActive(true)
      
      // Create Realtime session via API
      const response = await fetch('/api/interview/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, sessionId: newSessionId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create Realtime session: ${errorText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        console.error('Server error:', data)
        throw new Error(data.error)
      }
      
      const { clientSecret, sessionId: realtimeSessionId, instructions } = data
      
      console.log('Session data received:', { hasClientSecret: !!clientSecret, sessionId: realtimeSessionId })
      
      if (!clientSecret) {
        throw new Error('No client secret received from server')
      }
      
      // Connect to OpenAI Realtime API via WebRTC (browser-native audio pipeline)
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Remote audio plays through a hidden <audio> element
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      remoteAudioRef.current = audioEl
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
        setIsPlayingAudio(true)
        e.streams[0].getTracks().forEach((t) => {
          t.onended = () => setIsPlayingAudio(false)
        })
      }

      // Add local mic track — WebRTC handles encoding natively
      const stream = await getOrCreateInterviewMediaStream()
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream)
        if (track.kind === 'audio') {
          localAudioTrackRef.current = track
          localAudioSenderRef.current = sender
        }
      })

      // Data channel for control events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        console.log('WebRTC data channel open - configuring session')
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: instructions || '',
            input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.8,
              prefix_padding_ms: 300,
              silence_duration_ms: 900,
            },
            temperature: 0.7,
            max_response_output_tokens: 400,
          },
        }))
        setIsConnected(true)
        setIsListening(true)
        // Trigger the interviewer to speak first — without this the AI waits for VAD
        dc.send(JSON.stringify({ type: 'response.create' }))
      }

      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        handleRealtimeMessage(msg)
      }

      dc.onerror = (err) => {
        console.error('Data channel error:', err)
        setIsConnected(false)
        setIsListening(false)
      }

      dc.onclose = () => {
        console.log('Data channel closed')
        setIsConnected(false)
        setIsListening(false)
        // Only fall back if the interview is still supposed to be active.
        // isInterviewActiveRef is set to false BEFORE disconnectRealtime() is called
        // during normal cleanup, so this only fires on unexpected disconnects.
        if (isInterviewActiveRef.current) {
          startInterviewTraditional()
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState)
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setIsConnected(false)
          setIsListening(false)
        }
      }

      // SDP offer/answer exchange
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview',
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp',
          },
        }
      )

      if (!sdpRes.ok) {
        const errText = await sdpRes.text()
        throw new Error(`WebRTC SDP exchange failed: ${sdpRes.status} - ${errText}`)
      }

      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      console.log('WebRTC connection established')
    } catch (error) {
      console.error('Error connecting to Realtime API:', error)
      alert('Failed to start interview. Please try again.')
    }
  }

  // Helper function to save transcript to database (for Realtime API path)
  const saveTranscriptToDatabase = async (currentTranscript: string[]) => {
    const currentSessionId = sessionIdRef.current || sessionId
    if (!currentSessionId || currentTranscript.length === 0) {
      return
    }
    
    try {
      const transcriptText = currentTranscript.join('\n')
      const { error } = await supabase
        .from('interview_sessions')
        .update({ transcript: transcriptText })
        .eq('id', currentSessionId)
      
      if (error) {
        console.error('Error saving transcript to database:', error)
      } else {
        // transcript saved to database
      }
    } catch (error) {
      console.error('Error saving transcript:', error)
    }
  }

  const handleRealtimeMessage = (data: any) => {
    if (
      data.type === 'response.audio_transcript.delta' ||
      data.type === 'response.audio_transcript.done' ||
      data.type === 'conversation.item.input_audio_transcription.completed' ||
      data.type === 'error'
    ) {
      console.log('[realtime]', data.type, {
        assistantSpeaking: assistantSpeakingRef.current,
        closingDetected: closingDetectedRef.current,
        transcriptPreview: typeof data.transcript === 'string' ? data.transcript.slice(0, 120) : undefined,
      })
    }

    switch (data.type) {
      case 'response.audio_transcript.delta':
        if (!assistantSpeakingRef.current) {
          assistantSpeakingRef.current = true
          setIsPlayingAudio(true)
          setRealtimeMicEnabled(false)
          void setRealtimeAudioInputEnabled(false)
          updateRealtimeTurnDetection(false)
          console.log('[realtime] assistant speech started')
        }
        // Update current message as AI speaks
        setCurrentMessage((prev) => (prev + (data.delta || '')).trim())
        break

      case 'response.audio_transcript.done':
        if (assistantSpeechResetTimeoutRef.current) {
          clearTimeout(assistantSpeechResetTimeoutRef.current)
        }
        assistantSpeechResetTimeoutRef.current = setTimeout(() => {
          assistantSpeakingRef.current = false
          setIsPlayingAudio(false)
          setRealtimeMicEnabled(true)
          void setRealtimeAudioInputEnabled(true)
          updateRealtimeTurnDetection(true)
          console.log('[realtime] assistant speech ended')
          assistantSpeechResetTimeoutRef.current = null
        }, 700)
        // Final transcript
        const fullMessage = data.transcript || ''
        setCurrentMessage(fullMessage)
        setTranscript((prev) => {
          const updated = [...prev, `Interviewer: ${fullMessage}`]
          // Save to database asynchronously (don't block UI)
          saveTranscriptToDatabase(updated).catch(err => console.error('Error saving transcript:', err))
          return updated
        })
        setTurnCount((prev) => prev + 1)
        
        // HR Screen specific: only end after an explicit recruiter closing.
        if (stage === 'hr_screen') {
          const lowerMessage = fullMessage.toLowerCase()
          const closingSignals = [
            'that covers everything i wanted to ask',
            'that covers everything',
            'i have what i need for now',
            'i\'ll pass my notes along',
            'someone will be in touch about next steps',
            'thanks for your time',
            'thanks again for your time',
            'we\'ll wrap up here',
            'we can wrap up here'
          ]

          const hasClosingSignal = closingSignals.some(keyword => lowerMessage.includes(keyword))

          if (hasClosingSignal) {
            console.log('HR screen explicit close detected')
            markClosingAndFinish()
          }
        } else {
          // Other stages: Check if should end interview (after 5-10 turns)
          if (turnCount >= 5) {
            setTimeout(() => endInterview(), 2000)
          }
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        if (closingDetectedRef.current) {
          console.log('[realtime] ignoring user transcript after close')
          break
        }
        // User's speech transcribed
        const userMessage = data.transcript || ''
        if (assistantSpeakingRef.current) {
          console.log('[realtime] user transcript arrived while assistant marked as speaking', {
            userMessagePreview: userMessage.slice(0, 120),
          })
          break
        }
        setTranscript((prev) => {
          const updated = [...prev, `You: ${userMessage}`]
          // Save to database asynchronously (don't block UI)
          saveTranscriptToDatabase(updated).catch(err => console.error('Error saving transcript:', err))
          return updated
        })
        break

      case 'error':
        console.error('Realtime API error:', data.error)
        setIsConnected(false)
        setIsListening(false)
        
        // If authentication fails, fallback to traditional approach
        if (data.error?.message?.includes('authentication') || data.error?.message?.includes('Missing bearer')) {
          console.log('Realtime API authentication failed, falling back to traditional approach')
          disconnectRealtime()
          // Ensure interview is active before starting traditional approach
          setIsInterviewActive(true)
          startInterviewTraditional()
          return
        }
        
        // Show user-friendly error for other errors
        alert(`API error: ${data.error?.message || 'Unknown error'}`)
        break
        
      case 'session.updated':
        console.log('Session updated successfully')
        break
    }
  }

  const disconnectRealtime = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (assistantSpeechResetTimeoutRef.current) {
      clearTimeout(assistantSpeechResetTimeoutRef.current)
      assistantSpeechResetTimeoutRef.current = null
    }
    assistantSpeakingRef.current = false
    turnDetectionDisabledRef.current = false
    closingDetectedRef.current = false
    localAudioSenderRef.current = null
    localAudioTrackRef.current = null
    if (dcRef.current) {
      dcRef.current.close()
      dcRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
      remoteAudioRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = true
      })
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsConnected(false)
    setIsListening(false)
  }

  const startInterview = async () => {
    // Record start time for HR screen time tracking
    interviewStartTimeRef.current = Date.now()
    closingDetectedRef.current = false

    // Try Realtime API first, fallback to optimized traditional approach
    try {
      await connectRealtime()
    } catch (error) {
      console.error('Realtime API failed, using fallback:', error)
      // Fallback to traditional approach
      await startInterviewTraditional()
    }
  }

  const startInterviewTraditional = async () => {
    try {
      console.log('Starting traditional interview approach')

      if (stage === 'hr_screen') {
        await getOrCreateInterviewMediaStream()
        setHasUserPermission(true)
      }

      // Check if a session was already created (e.g. by failed Realtime attempt)
      const existingSessionId = sessionIdRef.current

      // Create interview session NOW (when user clicks Begin Interview)
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession()

      // For HR screen, allow proceeding without account (anonymous mode)
      // Check for temp data in localStorage
      let tempInterviewData = null
      let reuseInterviewDataId: string | null = null
      if (!authSession) {
        const tempDataStr = localStorage.getItem('temp_interview_data')
        if (tempDataStr) {
          tempInterviewData = JSON.parse(tempDataStr)
          console.log('Found temp interview data for anonymous user')
        } else {
          // No session and no temp data - redirect to login
          router.push('/auth/login')
          return
        }
      } else {
        reuseInterviewDataId = localStorage.getItem('prepme_retake_interview_data_id')
      }

      // Reuse existing session if one was already created, otherwise create new
      let activeSessionId = existingSessionId
      if (!activeSessionId) {
        // Create session via API (uses supabaseAdmin to bypass RLS for anonymous users)
        const sessionRes = await fetch('/api/interview/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage, tempInterviewData, reuseInterviewDataId }),
        })
        if (!sessionRes.ok) {
          const err = await sessionRes.json()
          console.error('Error creating session:', err)
          throw new Error('Failed to create interview session')
        }
        const { sessionId: newSessionId } = await sessionRes.json()
        activeSessionId = newSessionId
        setSessionId(newSessionId)
        sessionIdRef.current = newSessionId
        console.log('Created new interview session:', newSessionId)
        localStorage.removeItem('prepme_retake_interview_data_id')
      } else {
        console.log('Reusing existing session from Realtime attempt:', activeSessionId)
      }
      
      // Mark interview as active - this enables audio recording/playback
      // Set both state and ref immediately for synchronous checks
      isInterviewActiveRef.current = true
      setIsInterviewActive(true)
      
      // Start the interview conversation using traditional API
      const startRoute = '/api/interview/start'
      const startBody = {
        stage,
        sessionId: activeSessionId,
        hrCompleted: localStorage.getItem('prepme_hr_completed') === 'true',
      }

      const response = await fetch(startRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startBody),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}` }
        }
        // Handle HR limit and credit errors with user-friendly messages
        if (errorData.code === 'HR_LIMIT_REACHED' || errorData.code === 'HR_RETAKE_USED') {
          setError(errorData.error)
          setIsLoading(false)
          return
        }
        if (errorData.code === 'NO_CREDITS') {
          setError(errorData.error)
          setIsLoading(false)
          return
        }
        console.error('Failed to start interview:', response.status, errorData)
        throw new Error(`Failed to start interview: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }

      let data
      try {
        data = await response.json()
        // Interview start response parsed successfully
      } catch (parseError) {
        console.error('Failed to parse interview start response:', parseError)
        throw new Error('Invalid response from interview start API')
      }
      setCurrentMessage(data.message)
      
      // Initialize conversation phase for HR screen
      if (stage === 'hr_screen') {
        // Default to 'opening' if not provided
        const initialPhase = data.conversationPhase || 'opening'
        setConversationPhase(initialPhase)
        console.log('HR Screen conversation phase:', initialPhase)
      }
      
      setIsListening(true) // Keep listening throughout the conversation
      console.log('Set isListening to true, interview is now active')

      // Play audio if available
      if (data.audioSequenceBase64?.length) {
        try {
          await playAudio(data.audioSequenceBase64)
        } catch (error) {
          console.error('Error playing audio:', error)
          // If audio fails, start listening anyway
          if (isListening && !isRecording && !interviewComplete) {
            setTimeout(() => startVoiceInput(), 500)
          }
        }
      } else if (data.audioBase64) {
        try {
          await playAudio(data.audioBase64)
        } catch (error) {
          console.error('Error playing audio:', error)
          // If audio fails, start listening anyway
          if (isListening && !isRecording && !interviewComplete) {
            setTimeout(() => startVoiceInput(), 500)
          }
        }
      } else {
        // No audio, start listening immediately
        if (isListening && !isRecording && !interviewComplete) {
          setTimeout(() => startVoiceInput(), 500)
        }
      }
    } catch (error: any) {
      console.error('Error starting interview:', error)
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      })
      
      // Reset interview state on error
      isInterviewActiveRef.current = false
      setIsInterviewActive(false)
      setIsListening(false)
      
      // Show user-friendly error message
      alert(`Failed to start interview: ${error?.message || 'Unknown error'}. Please try again.`)
      
      // Don't navigate away - let user try again
    }
  }

  const playAudio = (audioBase64: string | string[]) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Safety check: Only play audio on interview page and when interview is active
        // Use ref for immediate check (state might be stale)
        if (!isInterviewActiveRef.current) {
          console.warn('Cannot play audio - interview not active')
          reject(new Error('Interview not active'))
          return
        }
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/interview')) {
          console.warn('Cannot play audio - not on interview page')
          reject(new Error('Not on interview page'))
          return
        }
        
        if (!audioBase64 || (Array.isArray(audioBase64) && audioBase64.length === 0)) {
          reject(new Error('No audio data provided'))
          return
        }

        // Stop any current recording if user interrupts
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('User interrupted - stopping current recording')
          mediaRecorderRef.current.stop()
          setIsRecording(false)
        }

        // Create audio element if it doesn't exist
        if (!audioRef.current) {
          audioRef.current = new Audio()
        }

        const audio = audioRef.current
        
        // Stop current audio if playing
        audio.pause()
        audio.currentTime = 0
        
        const segments = Array.isArray(audioBase64) ? audioBase64 : [audioBase64]
        let currentAudioUrl: string | null = null

        // Allow interruption - if user starts speaking, stop audio
        const handleInterruption = () => {
          if (isRecording) {
            console.log('User interrupted audio playback')
            audio.pause()
            audio.currentTime = 0
            setIsPlayingAudio(false)
            if (currentAudioUrl) {
              URL.revokeObjectURL(currentAudioUrl)
              currentAudioUrl = null
            }
            resolve()
          }
        }

        let segmentIndex = 0

        const playSegment = () => {
          if (segmentIndex >= segments.length) {
            console.log('Audio playback finished, restarting listening...')
            setIsPlayingAudio(false)
            setTimeout(() => {
              if (!interviewComplete) {
                console.log('Restarting voice input after audio finished')
                setIsListening(true)
                startVoiceInput()
              } else {
                console.log('Not restarting - interview complete')
              }
            }, 300)
            resolve()
            return
          }

          const binaryString = atob(segments[segmentIndex])
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }

          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
          currentAudioUrl = URL.createObjectURL(audioBlob)
          audio.src = currentAudioUrl
          setIsPlayingAudio(true)

          audio.play().catch((error) => {
            console.error('Error playing audio:', error)
            if (currentAudioUrl) {
              URL.revokeObjectURL(currentAudioUrl)
              currentAudioUrl = null
            }
            setIsPlayingAudio(false)
            reject(error)
          })
        }

        audio.onended = () => {
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl)
            currentAudioUrl = null
          }
          segmentIndex += 1
          setTimeout(playSegment, 100)
        }

        audio.onerror = () => {
          setIsPlayingAudio(false)
          if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl)
            currentAudioUrl = null
          }
          reject(new Error('Audio playback failed'))
        }

        // Check for interruption periodically
        const interruptionCheck = setInterval(() => {
          if (isRecording) {
            handleInterruption()
            clearInterval(interruptionCheck)
          }
        }, 100)

        audio.addEventListener('ended', () => clearInterval(interruptionCheck), { once: true })
        playSegment()
      } catch (error) {
        console.error('Error creating audio:', error)
        setIsPlayingAudio(false)
        reject(error)
      }
    })
  }

  const startVoiceInput = async () => {
    try {
      // Safety checks: Only record on interview page, with permission, and when interview is active
      // Use ref for immediate check (state might be stale)
      if (!isInterviewActiveRef.current) {
        console.warn('Cannot start recording - interview not active')
        return
      }
      
      if (isRecording || interviewComplete) {
        console.log('Skipping startVoiceInput - already recording or complete')
        return
      }
      
      // Check if we're still on the interview page (safety check)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/interview')) {
        console.warn('Cannot start recording - not on interview page')
        return
      }
      
      console.log('Starting continuous voice recording...')
      
      // Request explicit permission
      const stream = await getOrCreateInterviewMediaStream()
      setHasUserPermission(true)
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped event fired')
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        console.log('Recording stopped, audio blob size:', audioBlob.size, 'bytes')
        
        // Clear chunks for next recording
        audioChunksRef.current = []
        setIsRecording(false)
        
        if (audioBlob.size > 0) {
          await sendAudioToAPI(audioBlob)
        } else {
          console.warn('Audio blob is empty, restarting recording')
          // Restart recording if empty
          if (isListening && !interviewComplete) {
            setTimeout(() => startVoiceInput(), 500)
          }
        }
      }

      setIsRecording(true)
      console.log('Starting continuous voice recording...')
      
      // Start recording with timeslice for continuous monitoring
      mediaRecorder.start(100) // Get data every 100ms
      
      // Auto-stop after silence (Voice Activity Detection)
      let lastAudioTime = Date.now()
      let vadContext: AudioContext | null = null
      
      const checkSilence = () => {
        const now = Date.now()
        const silenceDuration = now - lastAudioTime
        
        if (silenceDuration > 2000 && audioChunksRef.current.length > 0) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('Silence detected, stopping recording')
            mediaRecorderRef.current.stop()
            if (vadContext) {
              vadContext.close()
              vadContext = null
            }
          }
        }
      }
      
      // Monitor audio levels for VAD and interruption detection
      vadContext = new AudioContext()
      const source = vadContext.createMediaStreamSource(stream)
      const analyser = vadContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const detectVoice = () => {
        if (!vadContext || !mediaRecorderRef.current) return
        
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        
        // If audio level is above threshold, user is speaking
        if (average > 30) {
          lastAudioTime = Date.now()
          
          // If AI is speaking and user starts talking, interrupt
          if (isPlayingAudio && audioRef.current) {
            console.log('User interrupted AI - stopping audio playback')
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            setIsPlayingAudio(false)
          }
        }
        
        checkSilence()
        
        // Continue monitoring if still recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          requestAnimationFrame(detectVoice)
        } else {
          if (vadContext) {
            vadContext.close()
            vadContext = null
          }
        }
      }
      
      detectVoice()
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Microphone access denied. Please enable microphone permissions.')
    }
  }

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      // Safety check: Only send audio if interview is active
      // Use ref for immediate check (state might be stale)
      if (!isInterviewActiveRef.current) {
        console.warn('Cannot send audio - interview not active')
        return
      }
      
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/interview')) {
        console.warn('Cannot send audio - not on interview page')
        return
      }
      
      console.log('Sending audio to API, blob size:', audioBlob.size)
      setIsRecording(false)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('stage', stage)
      formData.append('sessionId', sessionIdRef.current || sessionId || '')
      formData.append('transcript', JSON.stringify(transcript))
      
      // Add conversation state for HR screen and hiring_manager (askedQuestions for phase instructions)
      const currentAskedQuestions = askedQuestionsRef.current || []
      formData.append('askedQuestions', JSON.stringify(currentAskedQuestions))

      if (stage === 'hr_screen') {
        const currentPhase = conversationPhaseRef.current || 'opening'
        formData.append('conversationPhase', currentPhase)
        // Sending conversation state
      }

      // Log what we're actually sending (use refs for accurate logging)
      if (stage === 'hr_screen' || stage === 'hiring_manager') {
        const loggedPhase = stage === 'hr_screen' ? conversationPhaseRef.current || 'opening' : null
        console.log('Sending request to /api/interview/voice', {
          stage,
          ...(stage === 'hr_screen' && { conversationPhase: loggedPhase }),
          askedQuestionsCount: currentAskedQuestions.length,
          askedQuestionsPreview: currentAskedQuestions.slice(0, 2).map(q => q.substring(0, 30)),
        })
      } else {
        console.log('Sending request to /api/interview/voice', { stage })
      }
      
      const voiceRoute = '/api/interview/voice'

      const responsePromise = fetch(voiceRoute, {
        method: 'POST',
        body: formData,
      })

      const response = await responsePromise

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error:', response.status, errorText)
        throw new Error(`Failed to process audio: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Received response from API:', data)

      // Update transcript
      setTranscript((prev) => [...prev, data.userMessage, data.assistantMessage])
      setCurrentMessage(data.assistantMessage)
      setTurnCount((prev) => prev + 1)
      
      // For HR screen: Update conversation phase if provided
      if (stage === 'hr_screen' && data.conversationPhase) {
        conversationPhaseRef.current = data.conversationPhase
        setConversationPhase(data.conversationPhase)
        console.log('HR Screen conversation phase updated:', data.conversationPhase)
      }

      // Track asked questions for HR screen and hiring_manager (for phase instructions)
      if (stage === 'hr_screen' || stage === 'hiring_manager') {
        const interviewerMessage = data.assistantMessage.replace('Interviewer:', '').trim()
        const isQuestion = interviewerMessage.includes('?') ||
            interviewerMessage.toLowerCase().startsWith('tell me') ||
            interviewerMessage.toLowerCase().startsWith('what') ||
            interviewerMessage.toLowerCase().startsWith('why') ||
            interviewerMessage.toLowerCase().startsWith('how') ||
            interviewerMessage.toLowerCase().startsWith('can you') ||
            interviewerMessage.toLowerCase().startsWith('would you') ||
            interviewerMessage.toLowerCase().startsWith('i see you') ||
            interviewerMessage.toLowerCase().includes('tell me about') ||
            interviewerMessage.toLowerCase().startsWith('describe') ||
            interviewerMessage.toLowerCase().startsWith('walk me')
        if (isQuestion) {
          setAskedQuestions(prev => {
            const isDuplicate = prev.some(q => {
              const currentStart = interviewerMessage.substring(0, 50).toLowerCase().trim()
              const prevStart = q.substring(0, 50).toLowerCase().trim()
              return currentStart === prevStart ||
                     (currentStart.length > 30 && prevStart.length > 30 &&
                      currentStart.substring(0, 30) === prevStart.substring(0, 30))
            })
            if (!isDuplicate) {
              const updated = [...prev, interviewerMessage]
              askedQuestionsRef.current = updated
              // Tracked new question
              return updated
            }
            return prev
          })
        }
      }
      
      // Ensure isListening stays true throughout conversation
      setIsListening(true)
      
      if (data.audioSequenceBase64?.length) {
        try {
          console.log('Playing AI response audio sequence...')
          await playAudio(data.audioSequenceBase64)
          console.log('Audio playback completed, should restart listening')
        } catch (error) {
          console.error('Error playing audio:', error)
          if (!interviewComplete) {
            console.log('Audio failed, restarting listening manually')
            setIsListening(true)
            setTimeout(() => startVoiceInput(), 500)
          }
        }
      } else if (data.audioBase64) {
        try {
          console.log('Playing AI response audio...')
          await playAudio(data.audioBase64)
          console.log('Audio playback completed, should restart listening')
        } catch (error) {
          console.error('Error playing audio:', error)
          if (!interviewComplete) {
            console.log('Audio failed, restarting listening manually')
            setIsListening(true)
            setTimeout(() => startVoiceInput(), 500)
          }
        }
      } else {
        console.log('No audio in response, restarting listening')
        if (!interviewComplete) {
          setIsListening(true)
          setTimeout(() => startVoiceInput(), 500)
        }
      }

      // Check if interview should progress to next stage
      // For HR screen, always complete instead of progressing
      if (data.nextStage && stage !== 'hr_screen') {
        // Only progress if not HR screen (HR screen should complete)
        setStage(data.nextStage as Stage)
        // Could add navigation logic here if needed
      } else if (data.nextStage && stage === 'hr_screen') {
        // HR screen should complete, not progress
        setInterviewComplete(true)
        await endInterview()
      }

      // Check if interview is complete
      if (data.complete) {
        setInterviewComplete(true)
        await endInterview()
      }
    } catch (error) {
      console.error('Error sending audio:', error)
      alert('Error processing your response. Please try again.')
    }
  }

  const cleanupAllResources = async () => {
    console.log('Cleaning up all interview resources')
    
    // Mark interview as inactive - this blocks all audio operations
    // Set both ref and state immediately
    isInterviewActiveRef.current = false
    setIsInterviewActive(false)
    setHasUserPermission(false)
    
    // Cancel the interview session if it exists and is in progress
    const cleanupSessionId = sessionIdRef.current || sessionId
    if (cleanupSessionId) {
      try {
        await supabase
          .from('interview_sessions')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString(),
          })
          .eq('id', cleanupSessionId)
          .eq('status', 'in_progress')
        
        console.log('Marked interview session as cancelled')
      } catch (error) {
        console.error('Error cancelling session:', error)
      }
    }
    
    // Stop all audio playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      setIsPlayingAudio(false)
    }
    
    // Stop all recording
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped track:', track.kind)
        })
      }
      setIsRecording(false)
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    // Close audio contexts
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    // Disconnect Realtime API
    disconnectRealtime()
    
    // Reset states
    setIsListening(false)
    setIsConnected(false)
    setInterviewComplete(true)
  }

  const endInterview = async () => {
    console.log('Ending interview - cleaning up')
    console.log('Current sessionId (state):', sessionId)
    console.log('Current sessionId (ref):', sessionIdRef.current)
    console.log('Transcript length:', transcript.length)
    
    // Use ref first (always up-to-date), then state, then look it up
    let currentSessionId = sessionIdRef.current || sessionId
    
    if (!currentSessionId) {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession()
      
      if (authSession) {
        // Get the most recent in-progress session for this user
        const { data: recentSession } = await supabase
          .from('interview_sessions')
          .select('id')
          .eq('user_id', authSession.user.id)
          .eq('stage', stage)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (recentSession) {
          currentSessionId = recentSession.id
          console.log('Found recent session:', currentSessionId)
        }
      }
    }
    
    if (!currentSessionId) {
      console.error('CRITICAL: No sessionId found - cannot generate feedback!')
    }

    cleanupAllResources()

    if (currentSessionId) {
      // Compile final observer notes via API (server-side only)
      // Observer agent uses server-side Supabase client, can't run in browser
      try {
        await fetch('/api/interview/compile-observer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentSessionId }),
        })
      } catch (error) {
        console.error('Error compiling observer notes:', error)
        // Don't fail interview completion if observer compilation fails
      }

      // Calculate duration and fetch current transcript from database
      let durationSeconds: number | null = null
      let finalTranscript = transcript.join('\n') // Use local state if available
      
      const { data: sessionData } = await supabase
        .from('interview_sessions')
        .select('created_at, transcript')
        .eq('id', currentSessionId)
        .single()
      
      if (sessionData?.created_at) {
        const startTime = new Date(sessionData.created_at).getTime()
        const endTime = Date.now()
        durationSeconds = Math.floor((endTime - startTime) / 1000)
      }
      
      // Use transcript from database if local state is empty (voice API saves incrementally)
      if (!finalTranscript && sessionData?.transcript) {
        finalTranscript = sessionData.transcript
        // Using transcript from database
      } else if (finalTranscript) {
        // Using transcript from local state
      } else {
        console.warn('No transcript found in local state or database')
      }

      // Update session status
      const updateData: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }
      
      // Only update transcript if we have actual content (don't overwrite with empty string)
      // Check both that it exists AND has content (not just whitespace)
      if (finalTranscript && finalTranscript.trim().length > 0) {
        updateData.transcript = finalTranscript
        // Saving transcript to database
      } else {
        // Skipping transcript update - no valid transcript content
      }
      
      if (durationSeconds !== null) {
        updateData.duration_seconds = durationSeconds
      }

      const { error: updateError } = await supabase
        .from('interview_sessions')
        .update(updateData)
        .eq('id', currentSessionId)

      if (updateError) {
        console.error('Error updating session:', updateError)
      } else {
        console.log('Session updated to completed:', currentSessionId)
      }

      // Generate feedback - pass transcript directly since anon users can't write to DB via RLS
      try {
        const feedbackResponse = await fetch('/api/interview/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            transcript: finalTranscript || undefined,
          }),
        })

        // Feedback API responded

        if (!feedbackResponse.ok) {
          const errorText = await feedbackResponse.text()
          console.error('Error generating feedback:', errorText)
          console.error('Response status:', feedbackResponse.status)
        } else {
          const result = await feedbackResponse.json()
          // Feedback generated successfully
        }
      } catch (error) {
        console.error('CRITICAL ERROR calling feedback API:', error)
        console.error('Error details:', error)
      }
    } else {
      console.error('CRITICAL: No sessionId found - cannot generate feedback!')
      console.error('This means feedback will NOT be generated. Check sessionId state and ref.')
    }

    // Store sessionId in localStorage for feedback page (in case user is anonymous)
    // BUT only if we actually have a sessionId (don't overwrite with null)
    if (currentSessionId) {
      localStorage.setItem('last_interview_session_id', currentSessionId)
      // Stored sessionId in localStorage
    } else {
      console.error('Cannot store sessionId - it is null!')
    }

    // Mark HR screen as completed in localStorage for returning user gate
    if (stage === 'hr_screen') {
      localStorage.setItem('prepme_hr_completed', 'true')
    }

    // Small delay to ensure feedback API call completes before redirect
    await new Promise(resolve => setTimeout(resolve, 500))

    router.push('/interview/feedback')
  }

  const handleTextResponse = async (text: string) => {
    if (!text.trim() || !dcRef.current) return

    setTranscript((prev) => [...prev, `You: ${text}`])

    // Send text input to Realtime API via data channel
    dcRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text,
          },
        ],
      },
    }))

    // Trigger response
    dcRef.current.send(JSON.stringify({
      type: 'response.create',
    }))
  }

  if (interviewComplete) {
    return (
      <div className="app-shell-interview flex min-h-screen items-center justify-center px-4">
        <div className="interview-card w-full max-w-md p-8 text-center">
          <h2 className="mb-3 text-2xl font-black">Interview complete</h2>
          <p className="text-sm text-slate-300">Saving the round and preparing your feedback...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell-interview flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-black/18 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <button
          onClick={() => {
            cleanupAllResources()
            router.push('/dashboard')
          }}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-200">{STAGE_NAMES[stage]}</span>
          {isListening && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-slate-400">{formatTime(elapsedTime)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isListening && (
            <button
              onClick={() => {
                if (!showQuestion) {
                  setShowQuestionWarning(true)
                  setTimeout(() => setShowQuestionWarning(false), 4000)
                }
                setShowQuestion(!showQuestion)
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-white/20 hover:text-white"
            >
              {showQuestion ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showQuestion ? 'Hide' : 'View'} Question</span>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Warning banner for viewing question */}
      {showQuestionWarning && showQuestion && (
        <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-5xl items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-100/85">
            In a real interview you won't see the question. Practice without viewing for the best results and feedback.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => { setError(null); router.push('/dashboard') }}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Back to dashboard
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* Pre-interview: Ready to start */}
        {!isListening && !currentMessage && !error && (
          <div className="interview-card w-full max-w-xl p-8 text-center sm:p-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/5">
              <Phone className="h-8 w-8 text-sky-300" />
            </div>
            <div className="mx-auto mb-4 w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Formal interview mode
            </div>
            <h2 className="mb-2 text-3xl font-black text-white">
              {STAGE_NAMES[stage]}
            </h2>
            <p className="mx-auto mb-8 max-w-md text-sm leading-7 text-slate-300">
              Your interviewer is ready. This round is designed to feel as close to the real thing as possible. Start when you are settled.
            </p>
            <button
              onClick={startInterview}
              disabled={isLoading}
              className="btn-interview-primary px-8 py-3.5 text-lg disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Begin Interview'}
            </button>
          </div>
        )}

        {/* Active interview */}
        {(isListening || currentMessage) && (
          <div className="w-full max-w-3xl text-center">
            {/* Visualizer */}
            <div className="mb-8">
              <AudioVisualizer isActive={isPlayingAudio || isRecording} color="white" />
            </div>

            {/* Status indicator */}
            <div className="mb-6">
              {isPlayingAudio ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sky-300 animate-pulse" />
                  <span className="text-sm text-slate-300">Interviewer is speaking...</span>
                </div>
              ) : isRecording ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-sm text-slate-300">Listening...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-600" />
                  <span className="text-sm text-slate-500">Ready</span>
                </div>
              )}
            </div>

            {/* Question text (hidden by default) */}
            {showQuestion && currentMessage && (
              <div className="interview-card mx-auto mb-8 max-w-2xl px-6 py-4">
                <p className="text-sm leading-7 text-slate-200">{currentMessage}</p>
              </div>
            )}

            {/* Text input */}
            {isListening && (
              <div className="mt-6">
                <div className="mx-auto flex max-w-2xl gap-2">
                  <input
                    type="text"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleTextResponse(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                    placeholder="Type response instead..."
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                      if (input.value) {
                        handleTextResponse(input.value)
                        input.value = ''
                      }
                    }}
                    className="rounded-2xl border border-sky-400/30 bg-sky-500/20 px-4 py-3 text-sm font-bold text-sky-100 hover:bg-sky-500/30"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {isListening && (
        <div className="border-t border-white/10 bg-black/18 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-center">
            <button
              onClick={endInterview}
              className="flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/12 px-6 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/18"
            >
              <Phone className="w-4 h-4" />
              End Interview
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
