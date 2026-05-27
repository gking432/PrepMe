// Feedback generation config.
//
// HR_DETAILED_REPORT_ENABLED controls the free HR-screen detailed performance
// report (DetailedRubricReport). When false, the report is "stored away":
//   - the grading prompt skips the report-only rubric sections
//     (per-criterion 1-10 scores, time/question analysis, comparative/percentile,
//      predicted HM questions), which is where most output-token cost lives;
//   - the rubric validator accepts the lean HR shape;
//   - the UI hides the "View Full Report" entry points.
//
// The 6 pass/fail areas, overall score, strengths/weaknesses, summary,
// improvement suggestions, and Haiku answer rewrites are unaffected.
// Paid stages (hiring manager, culture fit, final) always use the full rubric.
//
// Flip to true to restore the full HR report end-to-end. Nothing is deleted.
export const HR_DETAILED_REPORT_ENABLED = false

export const HR_SCREEN_GRADING_MODE =
  (process.env.HR_SCREEN_GRADING_MODE || 'v2_question_level') as 'v2_question_level' | 'pass_fail' | 'sonnet'

export const HR_SCREEN_PASS_FAIL_MODEL =
  process.env.HR_SCREEN_PASS_FAIL_MODEL || 'gpt-5-nano'
