import fs from 'fs/promises'
import path from 'path'

const root = process.cwd()
const envPath = path.join(root, '.env.local')
const outputDir = path.join(root, 'public', 'audio', 'hr-screen')

function parseEnvFile(contents) {
  const env = {}
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex)
    const value = trimmed.slice(eqIndex + 1)
    env[key] = value
  }
  return env
}

const FIXED_AUDIO = {
  okay: 'Okay.',
  mhm: 'Mm-hm.',
  got_it: 'Got it.',
  i_see: 'I see.',
  understood: 'Understood.',
  right: 'Right.',
  that_makes_sense: 'That makes sense.',
  gotcha: 'Gotcha.',
  okay_and: 'Okay, and...',
  so_then: 'So then...',
  alright: 'Alright.',
  oh_okay: 'Oh, okay.',
  followup_specific: 'Can you be a bit more specific about that?',
  followup_role: 'Can you tell me a little more about your specific role there?',
  followup_company: 'What have you learned about us so far?',
  followup_role_interest: 'What about this role stands out to you most?',
  guarded_move_on: 'Alright. Let’s move on.',
  guarded_next: 'Got it. Next question.',
  guarded_close: 'Alright, I have what I need. Thanks for your time today.',
  terminate_wrap_up: 'Alright, I think we’ll wrap up here. Thanks for your time.',
  terminate_end: 'I’m going to end the interview here. Thank you for your time.',
}

async function main() {
  const envContents = await fs.readFile(envPath, 'utf8')
  const env = { ...process.env, ...parseEnvFile(envContents) }
  const apiKey = env.ELEVENLABS_API_KEY
  const voiceId = env.ELEVENLABS_VOICE_ID
  const modelId = env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'

  if (!apiKey || !voiceId) {
    throw new Error('Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID')
  }

  await fs.mkdir(outputDir, { recursive: true })

  for (const [key, text] of Object.entries(FIXED_AUDIO)) {
    const filePath = path.join(outputDir, `${key}.mp3`)
    try {
      await fs.access(filePath)
      console.log(`skip ${key}`)
      continue
    } catch {}

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed generating ${key}: ${response.status} ${await response.text()}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(filePath, audioBuffer)
    console.log(`generated ${key}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
