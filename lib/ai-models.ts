/**
 * One task-oriented registry for the models used by the interview pipeline.
 * Routes choose a capability here instead of scattering provider model names.
 */
export const AI_MODELS = {
  realtimeInterview: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-mini',
  realtimeTranscription: 'gpt-4o-mini-transcribe',
  rubricGrading: 'claude-sonnet-4-20250514',
  combinedReport: 'claude-sonnet-4-6',
  coachingGeneration: 'claude-haiku-4-5-20251001',
  lightweightReasoning: 'gpt-4o-mini',
  voiceConversation: 'gpt-4o',
  legacyTranscription: 'whisper-1',
  speech: 'tts-1',
} as const

export type AiModelTask = keyof typeof AI_MODELS
