# Interview Runtime Change Log

Purpose: track changes to the live interview runtime so we stop re-solving the same problem without a clear history.

Scope: `/app/interview/page.tsx` and `/app/api/interview/realtime/route.ts`

## Current baseline

- Stage under active stabilization: `hr_screen`
- Runtime mode: OpenAI Realtime over WebRTC
- Known critical dependencies:
  - turn handoff between assistant audio and candidate mic
  - transcript persistence for candidate + interviewer turns
  - explicit HR closing detection

## Change history

### `d2f740e` Disable browser mic processing for interviews

- Change:
  - `echoCancellation: false`
  - `noiseSuppression: false`
  - `autoGainControl: false`
- Why:
  - earlier interview audio was behaving oddly and the browser processing stack was suspected to be part of the problem.
- What we learned later:
  - this made built-in laptop speaker/mic setups much more vulnerable to self-interruption and speaker bleed.

### `b1a91d7` Reuse interview mic stream across turns

- Change:
  - stop tearing down and recreating the mic stream every turn
  - reuse one stream across the whole interview
- Why:
  - repeated mic on/off lifecycle was causing instability
- Status:
  - keep this; it solved a different problem and should not be reverted casually.

### `fe60682` Fix realtime interviewer turn handoff

- Change:
  - stop relying only on transcript completion for assistant speech lifecycle
  - start using realtime audio-finished events
- Why:
  - interviewer was cutting itself off and racing ahead
- What we learned later:
  - direction was correct, but transcript-done logic still retained too much control over handoff.

### `1a427ab` Harden realtime interview audio input

- Change:
  - re-enabled browser mic processing:
    - `echoCancellation: true`
    - `noiseSuppression: true`
    - `autoGainControl: true`
- Why:
  - built-in laptop mic/speaker setup was causing false interruption behavior
- Status:
  - keep this; it appears to improve real-world stability.

### `f4dca2b` Fix realtime session startup after audio config change

- Change:
  - removed unsupported server-side realtime session audio payload addition
- Why:
  - interview stopped starting cleanly
- Status:
  - keep removed unless verified against current API docs and payload shape.

### `66aff36` Remove invalid realtime `session.update` audio param

- Change:
  - removed unsupported client-side `session.audio` update field
- Why:
  - browser popup: `Unknown parameter: 'session.audio'`
- Status:
  - keep removed.

### `664f48a` Preserve late realtime candidate transcript turns

- Change:
  - stop dropping candidate transcript entries that arrive after the assistant has already started speaking
  - insert late candidate lines back into transcript before trailing interviewer lines
- Why:
  - feedback incorrectly said the candidate gave no verbal responses
- Status:
  - keep this; transcript persistence is backbone functionality.

### `64cebe9` Gate realtime turn handoff on audio completion

- Change:
  - transcript completion no longer ends assistant speech
  - actual audio completion events now drive mic/VAD re-enable
  - failsafe timeout extended significantly
- Why:
  - longer interviewer questions were still getting cut off because mic reopened before playback finished
- Status:
  - improved the waveform/audio alignment and reduced early handoff problems.

### `current` Restore reliable realtime startup and broader HR close detection

- Change:
  - initial interviewer prompt now waits for `session.updated` before sending the first `response.create`
  - HR close detection now also matches:
    - `thanks for your questions`
    - `thank you for your questions`
    - `goodbye`
    - `take care`
    - `have a great day`
    - `have a good day`
- Why:
  - recent runs showed the interviewer sometimes would not start until the candidate said hello
  - recent runs also showed recruiter-style wrap-ups were not ending the session automatically
- Expected effect:
  - restore the known-good “assistant opens first” behavior
  - restore auto-finish on common recruiter closings

## What the latest logs show

### 1. Opening still sometimes fails without user saying hello

Observed log pattern:

- data channel opens
- `session.updated`
- no immediate assistant speech
- first event is `conversation.item.input_audio_transcription.completed`
- assistant only starts after the candidate says something

Likely cause:

- we send `response.create` immediately after `session.update`, before we know the session has actually accepted the update.
- safer pattern is likely:
  - send `session.update`
  - wait for `session.updated`
  - then send the initial `response.create` exactly once

Current status: open bug

### 2. Long interviewer answers in Q&A still sometimes get cut off

Observed symptoms:

- interviewer answer to candidate question gets truncated mid-thought
- candidate says “you got cut off there”
- interviewer repeats

Important transcript evidence:

- truncated interviewer message appears in saved transcript itself
- this means the model/runtime response is getting cut, not just the local speaker playback

Likely causes to investigate next:

- automatic interruption on overlapping input events during assistant speech
- late candidate input finalization colliding with assistant answer generation
- closing / turn-detection policy during candidate-question Q&A

This does **not** look like a pure transcript display issue.

Current status: open bug

### 3. Interview sometimes does not end cleanly after the wrap-up

Observed behavior:

- interviewer says a closing line
- conversation does not auto-finish
- user has to click End Interview

Important transcript evidence from latest run:

- interviewer closing lines included:
  - “I’m glad to hear that. Thanks for your questions.”
  - “Goodbye! Take care.”

Likely cause:

- current `closingSignals` list is too narrow and does not treat all valid wrap-up phrases as explicit close signals.

Current status: open bug

### `current` Reduce long-answer truncation during HR Q&A

- Change:
  - explicitly set `turn_detection.interrupt_response: false`
  - explicitly set `turn_detection.create_response: true`
  - tightened HR candidate-question answering guidance:
    - one short complete thought
    - roughly 25-30 words
    - shortest truthful summary, not long explanation
    - either "Does that help?" or move to close
    - defer detailed follow-up to the hiring team when needed
  - reduced realtime `max_response_output_tokens` from `400` to `220`
- Why:
  - long recruiter answers during candidate Q&A were getting cut off
  - logs and docs suggest a likely cause is automatic response interruption on detected user speech while the assistant is still speaking
  - product-wise, HR recruiter answers should be short anyway
- Expected effect:
  - reduce or eliminate assistant answer cancellation during Q&A
  - keep HR answers brief enough that they do not run long unnecessarily
  - reduce awkward mid-thought generation endings

## Working conclusions

### Stable enough to keep

- mic stream reuse
- browser mic processing enabled
- preserve late candidate transcript turns
- mic/VAD should be gated by audio completion, not transcript completion

### Still unsafe / unresolved

- Q&A answers may still be too long or may still truncate; this latest change is a mitigation and needs validation

## Next fixes to make

1. Q&A cutoff:
   - inspect whether long assistant answers are being interrupted by overlapping input handling
   - specifically review whether late user-turn completion during assistant speech can still trigger server-side interruption behavior

## Guardrail

Before changing interview runtime behavior again:

- add the change here
- note why the change is being made
- record whether it is:
  - solving laptop speaker bleed
  - solving turn handoff
  - solving transcript persistence
  - solving closing detection
  - solving initial startup

The goal is to stop mixing separate failure classes together.
