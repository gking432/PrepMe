export function getRealtimeVoiceForStage(stage?: string) {
  if (stage === 'hiring_manager') {
    return process.env.OPENAI_REALTIME_HIRING_MANAGER_VOICE || 'cedar'
  }

  return process.env.OPENAI_REALTIME_VOICE || 'marin'
}

export function getFallbackTtsVoiceForStage(stage?: string) {
  if (stage === 'hiring_manager') {
    return process.env.OPENAI_TTS_HIRING_MANAGER_VOICE || 'onyx'
  }

  return process.env.OPENAI_TTS_VOICE || 'alloy'
}
