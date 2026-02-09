# Interview stage prompts

Each file in this folder defines the **detailed system prompt** for one interview stage. The voice route (`app/api/interview/voice/route.ts`) can import and use these via `@/lib/interview-prompts`.

## Files

| Stage            | File               | Status |
|------------------|--------------------|--------|
| HR Screen        | `hr_screen.ts`     | In use (detailed prompt; route still builds context/phases and can switch to importing this). |
| Hiring Manager   | `hiring_manager.ts`| **Draft here** – replace placeholder sections with full prompt text. |
| Culture Fit      | `culture_fit.ts`   | Placeholder – draft when ready. |
| Final            | `final.ts`         | Placeholder – draft when ready. |

## Contract

Each module exports:

```ts
export function buildSystemPrompt(options: StagePromptOptions): string
```

- `options.dataSection`: Built by the voice route (resume, job description, company website). Always passed.
- `options.conversationContext`: Optional; used by HR screen for “already asked” tracking.
- `options.phaseInstructions`: Optional; used by HR screen for screening / Q&A / closing.

Return value is the **full system prompt** (usually `dataSection` + stage-specific instructions).

## After drafting Hiring Manager

1. Edit `lib/interview-prompts/hiring_manager.ts` and replace the `[bracketed]` sections with the full prompt.
2. In `app/api/interview/voice/route.ts`, for `stage === 'hiring_manager'`, import `buildHiringManagerPrompt` (or `buildSystemPromptForStage('hiring_manager', options)`), build `dataSection` the same way as for HR screen, and set `systemPrompt = buildHiringManagerPrompt({ dataSection })` instead of using the DB prompt.
