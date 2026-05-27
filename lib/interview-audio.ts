import OpenAI from 'openai'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { supabaseAdmin } from './supabase'

let _openai: OpenAI | null = null

function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

function getOpenAiSpeechModel() {
  return process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
}

function getOpenAiSpeechVoice() {
  return process.env.OPENAI_TTS_VOICE || 'marin'
}

export async function synthesizeOpenAiSpeech(input: string): Promise<string | null> {
  try {
    const mp3 = await getOpenAI().audio.speech.create({
      model: getOpenAiSpeechModel(),
      voice: getOpenAiSpeechVoice(),
      input,
      response_format: 'mp3',
    } as any)
    const buffer = Buffer.from(await mp3.arrayBuffer())
    return buffer.toString('base64')
  } catch (error) {
    console.error('OpenAI speech synthesis failed:', error)
    return null
  }
}

export async function synthesizeElevenLabsSpeech(input: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID

  if (!apiKey || !voiceId) return null

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: input,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
        },
      }),
    })

    if (!response.ok) {
      console.error('ElevenLabs speech failed:', response.status, await response.text())
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('base64')
  } catch (error) {
    console.error('ElevenLabs speech synthesis failed:', error)
    return null
  }
}

export async function synthesizePreferredSpeech(input: string, preferOpenAI = false): Promise<string | null> {
  if (preferOpenAI) {
    return (await synthesizeOpenAiSpeech(input)) ?? (await synthesizeElevenLabsSpeech(input))
  }

  return (await synthesizeElevenLabsSpeech(input)) ?? (await synthesizeOpenAiSpeech(input))
}

function hrAudioPath(fileName: string) {
  return path.join(process.cwd(), 'public', 'audio', 'hr-screen', fileName)
}

function getSpeechCacheNamespace(preferOpenAI = false) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'
  const cacheVersion = 'v4'
  if (!preferOpenAI && process.env.ELEVENLABS_API_KEY && voiceId) {
    return `generated/${cacheVersion}-elevenlabs-${voiceId}-${modelId}`
  }
  return `generated/${cacheVersion}-openai-${getOpenAiSpeechModel()}-${getOpenAiSpeechVoice()}`
}

async function writeBase64Audio(filePath: string, audioBase64: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from(audioBase64, 'base64'))
}

export async function loadCachedSpeech(fileName: string): Promise<string | null> {
  try {
    const buffer = await fs.readFile(hrAudioPath(fileName))
    return buffer.toString('base64')
  } catch {
    return null
  }
}

export async function loadStoredInterviewAudioBase64(audioCache: any): Promise<string | null> {
  const bucket = typeof audioCache?.bucket === 'string' ? audioCache.bucket : ''
  const audioPath = typeof audioCache?.path === 'string' ? audioCache.path : ''
  if (!bucket || !audioPath) return null

  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(audioPath)
    if (error || !data) {
      console.error('Stored interview audio download failed:', error)
      return null
    }

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('base64')
  } catch (error) {
    console.error('Stored interview audio load failed:', error)
    return null
  }
}

export async function getOrCreateCachedSpeech(args: {
  cacheKey?: string
  text: string
  requireElevenLabs?: boolean
  preferOpenAI?: boolean
}): Promise<string | null> {
  const namespace = getSpeechCacheNamespace(args.preferOpenAI)
  const fileName = args.cacheKey
    ? `${namespace}/${args.cacheKey}.mp3`
    : `${namespace}/${crypto.createHash('sha1').update(args.text).digest('hex')}.mp3`

  const cached = await loadCachedSpeech(fileName)
  if (cached) return cached

  const audioBase64 = args.requireElevenLabs
    ? await synthesizeElevenLabsSpeech(args.text)
    : await synthesizePreferredSpeech(args.text, args.preferOpenAI)
  if (!audioBase64) return null

  try {
    await writeBase64Audio(hrAudioPath(fileName), audioBase64)
  } catch (error) {
    console.error('Failed to write cached speech:', error)
  }

  return audioBase64
}
