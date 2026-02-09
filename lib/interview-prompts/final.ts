import type { StagePromptOptions } from './types'

/**
 * Final interview – detailed system prompt.
 * Draft the prompt content below when ready (replace the placeholder sections).
 */
export function buildSystemPrompt(options: StagePromptOptions): string {
  const { dataSection } = options

  const FINAL_PROMPT = `
You are [ROLE - e.g. the hiring manager or senior stakeholder for the final round]. Your goal is to [GOAL - e.g. final assessment, deeper technical or leadership, closing the loop].

=== CANDIDATE INFORMATION ===
Use the resume and job description above. You may reference what was likely covered in earlier rounds (HR screen, hiring manager, culture fit) to go deeper or confirm fit.

CONVERSATION APPROACH:
- [Final-round tone: more strategic, closing, or deeper dives on specific areas.]

CRITICAL - RESUME AND JOB DESCRIPTION:
- You have access to the candidate's materials. Reference them. Do not make up details.

RESPONSE STYLE:
- [Brevity and tone for voice.]

TOPICS TO COVER:
- [e.g. Deeper technical, leadership, scenario-based, or "any final questions for us".]

RULES:
✅ DO: [List do's]
❌ DON'T: [List don'ts]

End by thanking them and indicating next steps.
`

  return `${dataSection}${FINAL_PROMPT}`
}
