export const PORTFOLIO_GOLDEN_EVALUATIONS = [
  {
    id: 'fictional_context',
    label: 'Fictional demo isolation',
    description: 'Sample résumé, role, and employers cannot expose the portfolio owner’s history.',
  },
  {
    id: 'sparse_coverage',
    label: 'Sparse interview detection',
    description: 'Interrupted sessions cannot be inflated by duplicate transcript formats.',
  },
  {
    id: 'complete_coverage',
    label: 'Complete interview coverage',
    description: 'A substantive fictional interview reaches the normal grading path.',
  },
  {
    id: 'six_area_mapping',
    label: 'Six-area repair mapping',
    description: 'Every canonical HR signal maps to exactly one targeted workshop.',
  },
  {
    id: 'feedback_contract',
    label: 'Feedback contract acceptance',
    description: 'The checked-in sample satisfies the same validated contract used by the demo.',
  },
  {
    id: 'malformed_contract',
    label: 'Malformed output rejection',
    description: 'Incomplete model JSON is rejected before it reaches the interface.',
  },
  {
    id: 'coaching_contract',
    label: 'Coaching output validation',
    description: 'Generated answer variants and their framework breakdown are schema checked.',
  },
  {
    id: 'fenced_json_recovery',
    label: 'Safe JSON recovery',
    description: 'Valid JSON wrapped in model markdown is recovered and then validated.',
  },
] as const

export const PORTFOLIO_EVALUATION_SUMMARY = {
  passed: PORTFOLIO_GOLDEN_EVALUATIONS.length,
  total: PORTFOLIO_GOLDEN_EVALUATIONS.length,
  verifiedOn: 'August 31, 2026',
} as const

