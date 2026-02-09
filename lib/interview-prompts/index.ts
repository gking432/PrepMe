/**
 * Interview stage prompts. Each stage has a buildSystemPrompt(options) that returns
 * the full system prompt (data section + stage-specific instructions).
 *
 * - hr_screen: detailed prompt in hr_screen.ts (used by voice route)
 * - hiring_manager: draft in hiring_manager.ts (replace placeholders; then wire voice route to use it)
 * - culture_fit: placeholder in culture_fit.ts
 * - final: placeholder in final.ts
 */

export type { StagePromptOptions, StageId } from './types'
export { buildSystemPrompt as buildHrScreenPrompt } from './hr_screen'
export { buildSystemPrompt as buildHiringManagerPrompt } from './hiring_manager'
export { buildSystemPrompt as buildCultureFitPrompt } from './culture_fit'
export { buildSystemPrompt as buildFinalPrompt } from './final'

import type { StageId } from './types'
import { buildSystemPrompt as buildHrScreenPrompt } from './hr_screen'
import { buildSystemPrompt as buildHiringManagerPrompt } from './hiring_manager'
import { buildSystemPrompt as buildCultureFitPrompt } from './culture_fit'
import { buildSystemPrompt as buildFinalPrompt } from './final'
import type { StagePromptOptions } from './types'

const builders: Record<StageId, (options: StagePromptOptions) => string> = {
  hr_screen: buildHrScreenPrompt,
  hiring_manager: buildHiringManagerPrompt,
  culture_fit: buildCultureFitPrompt,
  final: buildFinalPrompt,
}

export function buildSystemPromptForStage(stage: StageId, options: StagePromptOptions): string {
  const build = builders[stage]
  if (!build) {
    throw new Error(`Unknown interview stage: ${stage}`)
  }
  return build(options)
}
