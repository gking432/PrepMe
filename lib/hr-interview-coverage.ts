export type HrInterviewCoverage = {
  candidateTurnCount: number
  meaningfulTurnCount: number
  meaningfulWordCount: number
  sufficient: boolean
}

const MIN_MEANINGFUL_TURNS = 3
const MIN_MEANINGFUL_WORDS = 45

function wordCount(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) || []).length
}

function isConnectionCheck(value: string) {
  const normalized = value.trim().toLowerCase()
  return (
    /\bwhy (aren't|are not|isn't|is not) you (responding|answering)\b/.test(normalized) ||
    /\b(can you hear me|are you there|is this working|hello,? are you there)\b/.test(normalized)
  )
}

function candidateTurnsFromStructured(transcriptStructured: any) {
  const messages = Array.isArray(transcriptStructured?.messages) ? transcriptStructured.messages : []
  return messages
    .filter((message: any) => message?.speaker === 'candidate' && typeof message?.text === 'string')
    .map((message: any) => String(message.text).trim())
    .filter(Boolean)
}

function candidateTurnsFromPlainTranscript(transcript: string) {
  return String(transcript || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(You|Candidate|User):/i.test(line))
    .map((line) => line.replace(/^(You|Candidate|User):\s*/i, '').trim())
    .filter(Boolean)
}

export function getHrInterviewCoverage(transcriptStructured: any, transcript: string): HrInterviewCoverage {
  const structuredTurns = candidateTurnsFromStructured(transcriptStructured)
  // Structured and plain transcripts contain the same speech. Prefer structured
  // data when present so candidate words are never counted twice.
  const candidateTurns = structuredTurns.length
    ? structuredTurns
    : candidateTurnsFromPlainTranscript(transcript)
  const meaningfulTurns = candidateTurns.filter((turn) => wordCount(turn) >= 6 && !isConnectionCheck(turn))
  const meaningfulWordCount = meaningfulTurns.reduce((total, turn) => total + wordCount(turn), 0)

  return {
    candidateTurnCount: candidateTurns.length,
    meaningfulTurnCount: meaningfulTurns.length,
    meaningfulWordCount,
    sufficient:
      meaningfulTurns.length >= MIN_MEANINGFUL_TURNS &&
      meaningfulWordCount >= MIN_MEANINGFUL_WORDS,
  }
}

export function hasSufficientHrInterviewCoverage(transcriptStructured: any, transcript: string) {
  return getHrInterviewCoverage(transcriptStructured, transcript).sufficient
}
