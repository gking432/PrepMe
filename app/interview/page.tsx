'use client'

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
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const interviewStartTimeRef = useRef<number | null>(null)
  const supabase = createClient()

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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
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
      }

      let interviewDataId = null
      if (authSession) {
        // Get latest interview data for logged-in users
        const { data: interviewData } = await supabase
          .from('user_interview_data')
          .select('id')
          .eq('user_id', authSession.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        interviewDataId = interviewData?.id || null
      }

      // Create NEW interview session
      // For anonymous users, we'll use a placeholder user_id or handle it in the API
      const { data: newSession, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: authSession?.user.id || null, // Allow null for anonymous users
          user_interview_data_id: interviewDataId,
          stage: stage,
          status: 'in_progress',
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating session:', sessionError)
        throw new Error('Failed to create interview session')
      }

      if (newSession) {
        setSessionId(newSession.id)
        sessionIdRef.current = newSession.id
        console.log('Created new interview session:', newSession.id)
      }
      
      // Mark interview as active before connecting
      isInterviewActiveRef.current = true
      setIsInterviewActive(true)
      
      // Create Realtime session via API
      const response = await fetch('/api/interview/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, sessionId: newSession.id }),
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
      
      // Connect to OpenAI Realtime API WebSocket
      // The client_secret should be in the URL for authentication
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-realtime-mini&client_secret=${encodeURIComponent(clientSecret)}`
      
      console.log('Connecting to WebSocket with client_secret in URL')
      const ws = new WebSocket(wsUrl)

      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected - sending session configuration')
        
        // Configure the session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: instructions || '',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            temperature: 0.7,
            max_response_output_tokens: 150,
          },
        }))
        
        console.log('Sent session configuration')

        // Wait for session to be configured before starting audio
        setTimeout(() => {
          startAudioInput()
          setIsConnected(true)
          setIsListening(true)
        }, 1000)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleRealtimeMessage(data)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        setIsListening(false)
        alert('WebSocket connection error. Check console for details.')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed', { code: event.code, reason: event.reason, wasClean: event.wasClean })
        setIsConnected(false)
        setIsListening(false)
        
        // If closed due to authentication error, fallback to traditional approach
        if (event.reason?.includes('authentication') || event.reason?.includes('Missing bearer')) {
          console.log('WebSocket closed due to authentication error, falling back to traditional approach')
          // Ensure interview is active before starting traditional approach
          setIsInterviewActive(true)
          startInterviewTraditional()
          return
        }
        
        // If closed unexpectedly, show error
        if (!event.wasClean && event.code !== 1000 && !isInterviewComplete) {
          console.log('WebSocket closed unexpectedly, falling back to traditional approach')
          // Ensure interview is active before starting traditional approach
          setIsInterviewActive(true)
          startInterviewTraditional()
        }
      }
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
    switch (data.type) {
      case 'response.audio_transcript.delta':
        // Update current message as AI speaks
        setCurrentMessage((prev) => (prev + (data.delta || '')).trim())
        break

      case 'response.audio_transcript.done':
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
        
        // HR Screen specific: Check for natural ending keywords
        if (stage === 'hr_screen') {
          const lowerMessage = fullMessage.toLowerCase()
          const endingKeywords = [
            'scheduled',
            'hiring manager',
            'get something scheduled',
            'thanks for your time',
            'i\'ll get something scheduled',
            'i\'ll schedule',
            'we\'ll schedule',
            'next steps',
            'move forward',
            'connect you with'
          ]
          
          const hasEndingKeyword = endingKeywords.some(keyword => lowerMessage.includes(keyword))
          const elapsedMinutes = interviewStartTimeRef.current 
            ? (Date.now() - interviewStartTimeRef.current) / 1000 / 60 
            : 0
          
          // End if: (1) contains ending keyword, OR (2) 10+ minutes elapsed, OR (3) 6+ turns and 5+ minutes
          if (hasEndingKeyword || elapsedMinutes >= 10 || (turnCount >= 6 && elapsedMinutes >= 5)) {
            console.log('HR screen ending detected:', { hasEndingKeyword, elapsedMinutes, turnCount })
            setTimeout(() => {
              setInterviewComplete(true)
              endInterview()
            }, 2000)
          }
        } else {
          // Other stages: Check if should end interview (after 5-10 turns)
          if (turnCount >= 5) {
            setTimeout(() => endInterview(), 2000)
          }
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        const userMessage = data.transcript || ''
        setTranscript((prev) => {
          const updated = [...prev, `You: ${userMessage}`]
          // Save to database asynchronously (don't block UI)
          saveTranscriptToDatabase(updated).catch(err => console.error('Error saving transcript:', err))
          return updated
        })
        break

      case 'response.audio.delta':
        // Stream audio chunks
        if (data.delta) {
          playAudioChunk(data.delta)
        }
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

  const startAudioInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      mediaStreamRef.current = stream

      // Create AudioContext with 24kHz sample rate (Realtime API requirement)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const inputData = e.inputBuffer.getChannelData(0)
        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        // Convert to base64 for transmission
        const buffer = new Uint8Array(pcm16.buffer)
        const base64 = btoa(String.fromCharCode(...buffer))

        // Send audio to Realtime API
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64,
        }))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (error: any) {
      console.error('Error starting audio input:', error)
      
      let errorMessage = 'Microphone access denied. '
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings.\n\n'
        errorMessage += 'Steps:\n'
        errorMessage += '1. Check the browser address bar for a microphone icon\n'
        errorMessage += '2. Click it and select "Allow"\n'
        errorMessage += '3. Or go to browser Settings > Privacy > Site Settings > Microphone\n'
        errorMessage += '4. Make sure this site (localhost or your domain) is allowed'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone.'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Microphone is being used by another application. Please close other apps using the mic.'
      } else {
        errorMessage += `Error: ${error.message || error.name}`
      }
      
      alert(errorMessage)
    }
  }

  const playAudioChunk = (base64Audio: string) => {
    // Decode base64 audio and play
    try {
      if (!audioContextRef.current) return

      const audioData = atob(base64Audio)
      const audioBytes = new Uint8Array(audioData.length)
      for (let i = 0; i < audioData.length; i++) {
        audioBytes[i] = audioData.charCodeAt(i)
      }

      // Convert to Int16Array (PCM16)
      const pcm16 = new Int16Array(audioBytes.buffer, audioBytes.byteOffset, audioBytes.length / 2)
      
      // Create audio buffer (24kHz sample rate)
      const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000)
      const channelData = audioBuffer.getChannelData(0)
      
      // Convert PCM16 to Float32
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0
      }

      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()
    } catch (error) {
      console.error('Error playing audio chunk:', error)
    }
  }

  const disconnectRealtime = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaStreamRef.current) {
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

      // Check if a session was already created (e.g. by failed Realtime attempt)
      const existingSessionId = sessionIdRef.current

      // Create interview session NOW (when user clicks Begin Interview)
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession()

      // For HR screen, allow proceeding without account (anonymous mode)
      // Check for temp data in localStorage
      let tempInterviewData = null
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
      }

      // Reuse existing session if one was already created, otherwise create new
      let activeSessionId = existingSessionId
      if (!activeSessionId) {
        let interviewDataId = null
        if (authSession) {
          const { data: interviewData } = await supabase
            .from('user_interview_data')
            .select('id')
            .eq('user_id', authSession.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          interviewDataId = interviewData?.id || null
        }

        const { data: newSession, error: sessionError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: authSession?.user.id || null,
            user_interview_data_id: interviewDataId,
            stage: stage,
            status: 'in_progress',
          })
          .select()
          .single()

        if (sessionError) {
          console.error('Error creating session:', sessionError)
          throw new Error('Failed to create interview session')
        }

        if (newSession) {
          activeSessionId = newSession.id
          setSessionId(newSession.id)
          sessionIdRef.current = newSession.id
          console.log('Created new interview session:', newSession.id)
        }
      } else {
        console.log('Reusing existing session from Realtime attempt:', activeSessionId)
      }
      
      // Mark interview as active - this enables audio recording/playback
      // Set both state and ref immediately for synchronous checks
      isInterviewActiveRef.current = true
      setIsInterviewActive(true)
      
      // Start the interview conversation using traditional API
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          sessionId: activeSessionId,
          hrCompleted: stage === 'hr_screen' ? localStorage.getItem('prepme_hr_completed') === 'true' : undefined,
        }),
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
      if (data.audioBase64) {
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

  const playAudio = (audioBase64: string) => {
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
        
        if (!audioBase64) {
          reject(new Error('No audio data provided'))
          return
        }

        // Stop any current recording if user interrupts
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('User interrupted - stopping current recording')
          mediaRecorderRef.current.stop()
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          setIsRecording(false)
        }

        // Convert base64 to binary string, then to Uint8Array
        const binaryString = atob(audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // Create blob from bytes
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)

        // Create audio element if it doesn't exist
        if (!audioRef.current) {
          audioRef.current = new Audio()
        }

        const audio = audioRef.current
        
        // Stop current audio if playing
        audio.pause()
        audio.currentTime = 0
        
        audio.src = audioUrl
        setIsPlayingAudio(true)

        // Allow interruption - if user starts speaking, stop audio
        const handleInterruption = () => {
          if (isRecording) {
            console.log('User interrupted audio playback')
            audio.pause()
            audio.currentTime = 0
            setIsPlayingAudio(false)
            URL.revokeObjectURL(audioUrl)
            resolve()
          }
        }

        audio.onended = () => {
          console.log('Audio playback finished, restarting listening...')
          setIsPlayingAudio(false)
          URL.revokeObjectURL(audioUrl)
          // Start listening again after audio finishes
          // Use a function to get current state values
          setTimeout(() => {
            // Check current state - isListening should still be true
            if (!interviewComplete) {
              console.log('Restarting voice input after audio finished')
              // Ensure isListening is true before restarting
              setIsListening(true)
              startVoiceInput()
            } else {
              console.log('Not restarting - interview complete')
            }
          }, 300)
          resolve()
        }

        audio.onerror = () => {
          setIsPlayingAudio(false)
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Audio playback failed'))
        }

        // Check for interruption periodically
        const interruptionCheck = setInterval(() => {
          if (isRecording) {
            handleInterruption()
            clearInterval(interruptionCheck)
          }
        }, 100)

        audio.play().then(() => {
          // Clear interruption check when audio finishes naturally
          audio.addEventListener('ended', () => clearInterval(interruptionCheck))
        }).catch((error) => {
          console.error('Error playing audio:', error)
          clearInterval(interruptionCheck)
          setIsPlayingAudio(false)
          URL.revokeObjectURL(audioUrl)
          reject(error)
        })
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
        // Close the stream tracks to free up resources
        const tracks = stream.getTracks()
        tracks.forEach(track => {
          track.stop()
          console.log('Stopped track:', track.kind)
        })
        
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
        
        // If silence for 2 seconds and we have audio, stop and send
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
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
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
      
      const response = await fetch('/api/interview/voice', {
        method: 'POST',
        body: formData,
      })

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
      
      // HR Screen specific: Check for natural ending keywords in traditional approach
      if (stage === 'hr_screen') {
        const assistantText = data.assistantMessage.replace('Interviewer: ', '').toLowerCase()
        const endingKeywords = [
          'scheduled',
          'hiring manager',
          'get something scheduled',
          'thanks for your time',
          'i\'ll get something scheduled',
          'i\'ll schedule',
          'we\'ll schedule',
          'next steps',
          'move forward',
          'connect you with'
        ]
        
        const hasEndingKeyword = endingKeywords.some(keyword => assistantText.includes(keyword))
        const elapsedMinutes = interviewStartTimeRef.current 
          ? (Date.now() - interviewStartTimeRef.current) / 1000 / 60 
          : 0
        
        // End if: (1) contains ending keyword, OR (2) 10+ minutes elapsed, OR (3) 6+ turns and 5+ minutes
        if (hasEndingKeyword || elapsedMinutes >= 10 || (turnCount >= 5 && elapsedMinutes >= 5)) {
          console.log('HR screen ending detected (traditional):', { hasEndingKeyword, elapsedMinutes, turnCount })
          setTimeout(() => {
            setInterviewComplete(true)
            endInterview()
          }, 2000)
          return
        }
      }

      // Ensure isListening stays true throughout conversation
      setIsListening(true)
      
      // Play audio if available (will auto-start listening after)
      if (data.audioBase64) {
        try {
          console.log('Playing AI response audio...')
          await playAudio(data.audioBase64)
          console.log('Audio playback completed, should restart listening')
          // playAudio will automatically start listening again after audio finishes
        } catch (error) {
          console.error('Error playing audio:', error)
          // If audio fails, start listening anyway
          if (!interviewComplete) {
            console.log('Audio failed, restarting listening manually')
            setIsListening(true)
            setTimeout(() => startVoiceInput(), 500)
          }
        }
      } else {
        // No audio response, start listening again
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

      // Generate feedback - API will fetch transcript from database
      try {
        // Generating feedback for session
        
        // Feedback API will fetch transcript from database, so we don't need to send it
        const feedbackResponse = await fetch('/api/interview/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId: currentSessionId
            // Transcript will be fetched from database by API
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
    if (!text.trim() || !wsRef.current) return

    setTranscript((prev) => [...prev, `You: ${text}`])

    // Send text input to Realtime API
    wsRef.current.send(JSON.stringify({
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
    wsRef.current.send(JSON.stringify({
      type: 'response.create',
    }))
  }

  // Handle redirect when interview is complete
  useEffect(() => {
    if (interviewComplete) {
      const timer = setTimeout(() => {
        router.push('/interview/feedback')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [interviewComplete, router])

  if (interviewComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Interview Complete!</h2>
          <p className="text-gray-600 mb-4">Redirecting to feedback...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <button
          onClick={() => {
            cleanupAllResources()
            router.push('/dashboard')
          }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">{STAGE_NAMES[stage]}</span>
          {isListening && (
            <span className="text-xs text-gray-500 font-mono">{formatTime(elapsedTime)}</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
            >
              {showQuestion ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showQuestion ? 'Hide' : 'View'} Question</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning banner for viewing question */}
      {showQuestionWarning && showQuestion && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 bg-amber-900/30 border border-amber-700/40 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            In a real interview you won't see the question. Practice without viewing for the best results and feedback.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-lg">
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
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Pre-interview: Ready to start */}
        {!isListening && !currentMessage && !error && (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 border-2 border-primary-500/30 flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {STAGE_NAMES[stage]}
            </h2>
            <p className="text-gray-400 mb-8 text-sm">
              Your interviewer is ready. Click begin when you are.
            </p>
            <button
              onClick={startInterview}
              disabled={isLoading}
              className="px-8 py-3.5 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors text-lg"
            >
              {isLoading ? 'Connecting...' : 'Begin Interview'}
            </button>
          </div>
        )}

        {/* Active interview */}
        {(isListening || currentMessage) && (
          <div className="w-full max-w-lg text-center">
            {/* Visualizer */}
            <div className="mb-8">
              <AudioVisualizer isActive={isPlayingAudio || isRecording} color="white" />
            </div>

            {/* Status indicator */}
            <div className="mb-6">
              {isPlayingAudio ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                  <span className="text-sm text-gray-400">Interviewer is speaking...</span>
                </div>
              ) : isRecording ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-sm text-gray-400">Listening...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                  <span className="text-sm text-gray-500">Ready</span>
                </div>
              )}
            </div>

            {/* Question text (hidden by default) */}
            {showQuestion && currentMessage && (
              <div className="mb-8 px-6 py-4 bg-gray-900/60 border border-gray-800 rounded-xl">
                <p className="text-gray-300 text-sm leading-relaxed">{currentMessage}</p>
              </div>
            )}

            {/* Text input */}
            {isListening && (
              <div className="mt-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleTextResponse(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
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
                    className="px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
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
        <div className="px-4 py-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800">
          <div className="max-w-lg mx-auto flex items-center justify-center">
            <button
              onClick={endInterview}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 hover:text-red-300 transition-colors text-sm font-medium"
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
