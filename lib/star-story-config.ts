// ---------------------------------------------------------------------------
// STAR Story Builder — Static Configuration
// ---------------------------------------------------------------------------

// ========================== TYPE DEFINITIONS ==========================

export type StoryType =
  | "customer_problem"
  | "messy_project"
  | "ownership_moment"
  | "sales_results_win"
  | "fast_learning"
  | "conflict_pushback"
  | "mistake_recovery"
  | "process_improvement"
  | "leadership_influence"
  | "pressure_deadline"

export type StorySetting =
  | "current_job"
  | "previous_job"
  | "internship"
  | "school_project"
  | "freelance_client"
  | "side_project"
  | "volunteer_organization"
  | "personal_project"
  | "other"

export type CustomerProblemSituation =
  | "customer_unhappy"
  | "customer_confused"
  | "unrealistic_expectations"
  | "customer_at_risk"
  | "customer_needed_decision_help"
  | "customer_had_problem"
  | "customer_needed_persuasion"
  | "deliverable_wrong"
  | "communication_breakdown"
  | "other"

export type MessyProjectSituation =
  | "project_behind_schedule"
  | "unclear_ownership"
  | "missing_information"
  | "disorganized_process"
  | "scope_changed"
  | "quality_issue"
  | "deadline_at_risk"
  | "team_not_aligned"
  | "too_many_moving_parts"
  | "other"

export type OwnershipSituation =
  | "something_was_falling_through_cracks"
  | "no_one_owned_it"
  | "manager_needed_help"
  | "team_needed_structure"
  | "customer_needed_answer"
  | "problem_needed_fast_action"
  | "opportunity_needed_owner"
  | "work_was_outside_role"
  | "important_task_unassigned"
  | "other"

export type SalesResultsSituation =
  | "needed_new_revenue"
  | "account_growth_opportunity"
  | "customer_needed_solution"
  | "lead_needed_follow_up"
  | "performance_below_goal"
  | "retention_risk"
  | "upsell_cross_sell_opportunity"
  | "new_market_or_channel"
  | "low_adoption"
  | "other"

export type FastLearningSituation =
  | "new_tool"
  | "new_product"
  | "new_industry"
  | "new_role_or_responsibility"
  | "new_customer_type"
  | "new_process"
  | "technical_skill"
  | "presentation_or_training"
  | "urgent_assignment"
  | "other"

export type ConflictSituation =
  | "teammate_disagreed"
  | "customer_pushed_back"
  | "manager_or_leader_disagreed"
  | "competing_priorities"
  | "unclear_expectations"
  | "different_departments_misaligned"
  | "difficult_conversation"
  | "resistance_to_change"
  | "feedback_or_criticism"
  | "other"

export type MistakeRecoverySituation =
  | "your_mistake"
  | "team_mistake"
  | "customer_issue"
  | "missed_deadline"
  | "wrong_deliverable"
  | "miscommunication"
  | "bad_assumption"
  | "quality_problem"
  | "process_failed"
  | "other"

export type ProcessImprovementSituation =
  | "manual_work"
  | "slow_process"
  | "confusing_process"
  | "repeated_errors"
  | "poor_handoff"
  | "lack_of_tracking"
  | "customer_friction"
  | "team_wasting_time"
  | "outdated_method"
  | "other"

export type LeadershipInfluenceSituation =
  | "led_project"
  | "organized_team"
  | "trained_someone"
  | "persuaded_stakeholder"
  | "got_buy_in"
  | "coordinated_people"
  | "mentored_or_supported_teammate"
  | "presented_recommendation"
  | "led_without_authority"
  | "other"

export type PressureDeadlineSituation =
  | "tight_deadline"
  | "last_minute_change"
  | "high_stakes_work"
  | "multiple_priorities"
  | "short_staffed"
  | "urgent_customer_need"
  | "event_or_launch"
  | "unexpected_problem"
  | "large_workload"
  | "other"

export type Stake =
  | "customer_relationship"
  | "revenue_or_sales"
  | "deadline"
  | "quality"
  | "team_trust"
  | "manager_trust"
  | "customer_trust"
  | "cost_or_budget"
  | "time_or_efficiency"
  | "launch_or_event"
  | "reputation"
  | "learning_or_growth"
  | "safety_or_compliance"
  | "nothing_major"
  | "other"

export type UserRole =
  | "main_owner"
  | "supporting_team_member"
  | "client_or_customer_contact"
  | "sales_or_account_owner"
  | "project_lead"
  | "builder_or_creator"
  | "analyst_or_researcher"
  | "trainer_or_presenter"
  | "problem_solver"
  | "founder_or_freelancer"
  | "student_or_group_member"
  | "other"

export type ActionTaken =
  | "asked_questions"
  | "listened_to_customer"
  | "investigated_problem"
  | "created_plan"
  | "prioritized_work"
  | "communicated_updates"
  | "followed_up"
  | "coordinated_people"
  | "built_or_created"
  | "fixed_or_reworked"
  | "presented_options"
  | "persuaded_or_reframed"
  | "used_data_or_research"
  | "learned_new_skill"
  | "took_responsibility"
  | "escalated_issue"
  | "trained_or_taught"
  | "documented_process"
  | "changed_process"
  | "worked_extra_time"
  | "measured_results"
  | "other"

export type ResultType =
  | "customer_satisfied"
  | "customer_retained"
  | "sale_closed"
  | "revenue_increased"
  | "performance_improved"
  | "project_completed"
  | "deadline_met"
  | "quality_improved"
  | "time_saved"
  | "cost_saved"
  | "process_adopted"
  | "team_aligned"
  | "relationship_improved"
  | "risk_reduced"
  | "approval_received"
  | "positive_feedback"
  | "referral_or_repeat_business"
  | "learned_and_applied"
  | "earned_responsibility"
  | "mistake_fixed"
  | "no_hard_result_but_positive"
  | "other"

export type HasMetric = "yes" | "no" | "not_sure"

export type MetricType =
  | "percent_increase"
  | "percent_decrease"
  | "dollar_amount"
  | "revenue_amount"
  | "cost_savings"
  | "time_saved"
  | "number_of_customers"
  | "number_of_sales"
  | "number_of_projects"
  | "deadline_timeframe"
  | "quota_or_goal"
  | "ranking_or_score"
  | "other"

export type NonMetricProof =
  | "positive_feedback"
  | "customer_approved"
  | "manager_approved"
  | "team_used_it"
  | "project_finished"
  | "customer_returned"
  | "customer_referred"
  | "problem_stopped_happening"
  | "process_reused"
  | "relationship_improved"
  | "got_more_responsibility"
  | "learned_lesson"
  | "other"

export type Competency =
  | "problem_solving"
  | "ownership"
  | "customer_focus"
  | "sales_ability"
  | "communication"
  | "leadership"
  | "adaptability"
  | "learning_agility"
  | "collaboration"
  | "conflict_resolution"
  | "attention_to_detail"
  | "resilience"
  | "strategic_thinking"
  | "execution"
  | "initiative"
  | "accountability"

export type ActionDetail = {
  actionId: string
  detail?: string
}

export type StarStoryInput = {
  storyType: StoryType
  setting: StorySetting
  contextName?: string
  situationType: string
  situationDetail?: string
  stakes: string[]
  stakeOtherDetail?: string
  userRole: string
  roleOtherDetail?: string
  roleDetail?: string
  actionsTaken: string[]
  actionDetails: ActionDetail[]
  resultTypes: string[]
  hasMetric: string
  metricType?: string
  metricValue?: string
  metricContext?: string
  nonMetricProofs?: string[]
  proofDetail?: string
  competencies: string[]
  additionalNotes?: string
}

export type StarStoryOutput = {
  storySummary: string
  starBreakdown: {
    situation: string
    task: string
    action: string
    result: string
  }
  sixtySecondAnswer: string
  thirtySecondAnswer: string
  followUpQuestions: string[]
}

export type SavedStarStory = {
  id: string
  input: StarStoryInput
  output: StarStoryOutput
  createdAt: string
  updatedAt: string
}

// ========================== OPTION ARRAYS ==========================

export const STORY_TYPES = [
  { id: "customer_problem", label: "Customer Problem", description: "A client, customer, or stakeholder needed help." },
  { id: "messy_project", label: "Messy Project", description: "Something was unclear, delayed, disorganized, or at risk." },
  { id: "ownership_moment", label: "Ownership Moment", description: "You stepped up and handled something that needed to get done." },
  { id: "sales_results_win", label: "Sales or Results Win", description: "You helped drive revenue, growth, retention, performance, or adoption." },
  { id: "fast_learning", label: "Fast Learning", description: "You had to learn something quickly and deliver." },
  { id: "conflict_pushback", label: "Conflict or Pushback", description: "You worked through disagreement, resistance, or competing priorities." },
  { id: "mistake_recovery", label: "Mistake Recovery", description: "Something went wrong and you helped fix it." },
  { id: "process_improvement", label: "Process Improvement", description: "You made something faster, clearer, simpler, or more effective." },
  { id: "leadership_influence", label: "Leadership or Influence", description: "You led, persuaded, organized, trained, or influenced others." },
  { id: "pressure_deadline", label: "Pressure or Deadline", description: "You delivered under time pressure or difficult circumstances." },
] as const

export const STORY_SETTINGS = [
  { id: "current_job", label: "Current job" },
  { id: "previous_job", label: "Previous job" },
  { id: "internship", label: "Internship" },
  { id: "school_project", label: "School or class project" },
  { id: "freelance_client", label: "Freelance or client work" },
  { id: "side_project", label: "Side project or startup idea" },
  { id: "volunteer_organization", label: "Volunteer work or organization" },
  { id: "personal_project", label: "Personal project" },
  { id: "other", label: "Other" },
] as const

// -------------------- Situation branches --------------------

export const CUSTOMER_PROBLEM_SITUATIONS = [
  { id: "customer_unhappy", label: "The customer or client was unhappy" },
  { id: "customer_confused", label: "They were confused or needed clarity" },
  { id: "unrealistic_expectations", label: "They wanted something unrealistic" },
  { id: "customer_at_risk", label: "They were at risk of leaving, cancelling, or losing trust" },
  { id: "customer_needed_decision_help", label: "They needed help making a decision" },
  { id: "customer_had_problem", label: "They had a problem that needed solving" },
  { id: "customer_needed_persuasion", label: "They needed to be persuaded or reassured" },
  { id: "deliverable_wrong", label: "The deliverable, order, or outcome was wrong" },
  { id: "communication_breakdown", label: "There was a communication breakdown" },
  { id: "other", label: "Other" },
] as const

export const MESSY_PROJECT_SITUATIONS = [
  { id: "project_behind_schedule", label: "The project was behind schedule" },
  { id: "unclear_ownership", label: "Ownership or responsibilities were unclear" },
  { id: "missing_information", label: "Important information was missing" },
  { id: "disorganized_process", label: "The process was disorganized" },
  { id: "scope_changed", label: "The scope changed or kept expanding" },
  { id: "quality_issue", label: "There was a quality issue" },
  { id: "deadline_at_risk", label: "A deadline was at risk" },
  { id: "team_not_aligned", label: "The team was not aligned" },
  { id: "too_many_moving_parts", label: "There were too many moving parts" },
  { id: "other", label: "Other" },
] as const

export const OWNERSHIP_SITUATIONS = [
  { id: "something_was_falling_through_cracks", label: "Something was falling through the cracks" },
  { id: "no_one_owned_it", label: "No one clearly owned it" },
  { id: "manager_needed_help", label: "A manager or teammate needed help" },
  { id: "team_needed_structure", label: "The team needed structure or direction" },
  { id: "customer_needed_answer", label: "A customer or stakeholder needed an answer" },
  { id: "problem_needed_fast_action", label: "A problem needed fast action" },
  { id: "opportunity_needed_owner", label: "There was an opportunity that needed someone to run with it" },
  { id: "work_was_outside_role", label: "The work was outside your normal role" },
  { id: "important_task_unassigned", label: "An important task was unassigned" },
  { id: "other", label: "Other" },
] as const

export const SALES_RESULTS_SITUATIONS = [
  { id: "needed_new_revenue", label: "There was a need for new revenue or sales" },
  { id: "account_growth_opportunity", label: "There was an opportunity to grow an account" },
  { id: "customer_needed_solution", label: "A customer needed the right solution" },
  { id: "lead_needed_follow_up", label: "A lead or opportunity needed follow-up" },
  { id: "performance_below_goal", label: "Performance was below goal" },
  { id: "retention_risk", label: "A customer or account was at risk" },
  { id: "upsell_cross_sell_opportunity", label: "There was an upsell or cross-sell opportunity" },
  { id: "new_market_or_channel", label: "There was a new market, channel, or audience to pursue" },
  { id: "low_adoption", label: "Adoption, usage, or engagement was low" },
  { id: "other", label: "Other" },
] as const

export const FAST_LEARNING_SITUATIONS = [
  { id: "new_tool", label: "You had to learn a new tool or system" },
  { id: "new_product", label: "You had to learn a new product or service" },
  { id: "new_industry", label: "You had to learn a new industry or market" },
  { id: "new_role_or_responsibility", label: "You had a new role or responsibility" },
  { id: "new_customer_type", label: "You had to understand a new customer type" },
  { id: "new_process", label: "You had to learn a new process" },
  { id: "technical_skill", label: "You had to learn a technical skill" },
  { id: "presentation_or_training", label: "You had to present or train on something new" },
  { id: "urgent_assignment", label: "You had to figure something out quickly for an urgent assignment" },
  { id: "other", label: "Other" },
] as const

export const CONFLICT_SITUATIONS = [
  { id: "teammate_disagreed", label: "A teammate disagreed with you" },
  { id: "customer_pushed_back", label: "A customer or client pushed back" },
  { id: "manager_or_leader_disagreed", label: "A manager or leader disagreed" },
  { id: "competing_priorities", label: "People had competing priorities" },
  { id: "unclear_expectations", label: "Expectations were unclear" },
  { id: "different_departments_misaligned", label: "Different departments or groups were misaligned" },
  { id: "difficult_conversation", label: "You had to have a difficult conversation" },
  { id: "resistance_to_change", label: "Someone resisted a change or recommendation" },
  { id: "feedback_or_criticism", label: "You received feedback or criticism" },
  { id: "other", label: "Other" },
] as const

export const MISTAKE_RECOVERY_SITUATIONS = [
  { id: "your_mistake", label: "You made a mistake" },
  { id: "team_mistake", label: "The team made a mistake" },
  { id: "customer_issue", label: "A customer issue was mishandled" },
  { id: "missed_deadline", label: "A deadline was missed or almost missed" },
  { id: "wrong_deliverable", label: "The wrong thing was delivered" },
  { id: "miscommunication", label: "There was a miscommunication" },
  { id: "bad_assumption", label: "Someone made the wrong assumption" },
  { id: "quality_problem", label: "There was a quality problem" },
  { id: "process_failed", label: "A process failed" },
  { id: "other", label: "Other" },
] as const

export const PROCESS_IMPROVEMENT_SITUATIONS = [
  { id: "manual_work", label: "Too much work was manual" },
  { id: "slow_process", label: "A process was too slow" },
  { id: "confusing_process", label: "A process was confusing" },
  { id: "repeated_errors", label: "The same errors kept happening" },
  { id: "poor_handoff", label: "Handoffs between people or teams were weak" },
  { id: "lack_of_tracking", label: "There was no clear tracking or visibility" },
  { id: "customer_friction", label: "Customers or users were experiencing friction" },
  { id: "team_wasting_time", label: "The team was wasting time" },
  { id: "outdated_method", label: "The old method was outdated" },
  { id: "other", label: "Other" },
] as const

export const LEADERSHIP_INFLUENCE_SITUATIONS = [
  { id: "led_project", label: "You led a project" },
  { id: "organized_team", label: "You organized a team or group" },
  { id: "trained_someone", label: "You trained someone" },
  { id: "persuaded_stakeholder", label: "You persuaded a stakeholder" },
  { id: "got_buy_in", label: "You got buy-in for an idea" },
  { id: "coordinated_people", label: "You coordinated multiple people" },
  { id: "mentored_or_supported_teammate", label: "You mentored or supported a teammate" },
  { id: "presented_recommendation", label: "You presented a recommendation" },
  { id: "led_without_authority", label: "You led without formal authority" },
  { id: "other", label: "Other" },
] as const

export const PRESSURE_DEADLINE_SITUATIONS = [
  { id: "tight_deadline", label: "There was a tight deadline" },
  { id: "last_minute_change", label: "There was a last-minute change" },
  { id: "high_stakes_work", label: "The work was high-stakes" },
  { id: "multiple_priorities", label: "You had multiple priorities at once" },
  { id: "short_staffed", label: "The team was short-staffed" },
  { id: "urgent_customer_need", label: "A customer or stakeholder needed something urgently" },
  { id: "event_or_launch", label: "There was an event, launch, or important milestone" },
  { id: "unexpected_problem", label: "An unexpected problem came up" },
  { id: "large_workload", label: "There was a large workload" },
  { id: "other", label: "Other" },
] as const

// -------------------- Stakes --------------------

export const STAKES = [
  { id: "customer_relationship", label: "Customer/client relationship" },
  { id: "revenue_or_sales", label: "Revenue, sales, or business results" },
  { id: "deadline", label: "A deadline" },
  { id: "quality", label: "Quality of the work" },
  { id: "team_trust", label: "Trust with the team" },
  { id: "manager_trust", label: "Trust with a manager or leader" },
  { id: "customer_trust", label: "Trust with a customer or stakeholder" },
  { id: "cost_or_budget", label: "Cost or budget" },
  { id: "time_or_efficiency", label: "Time or efficiency" },
  { id: "launch_or_event", label: "A launch, event, or important milestone" },
  { id: "reputation", label: "Reputation or credibility" },
  { id: "learning_or_growth", label: "My learning or growth" },
  { id: "safety_or_compliance", label: "Safety, compliance, or risk" },
  { id: "nothing_major", label: "Nothing major, but it still mattered" },
  { id: "other", label: "Other" },
] as const

// -------------------- User roles --------------------

export const USER_ROLES = [
  { id: "main_owner", label: "I was the main owner" },
  { id: "supporting_team_member", label: "I was a supporting team member" },
  { id: "client_or_customer_contact", label: "I was the client/customer contact" },
  { id: "sales_or_account_owner", label: "I was responsible for the sale, account, or relationship" },
  { id: "project_lead", label: "I was leading the project" },
  { id: "builder_or_creator", label: "I was building or creating the work" },
  { id: "analyst_or_researcher", label: "I was researching, analyzing, or figuring it out" },
  { id: "trainer_or_presenter", label: "I was training, presenting, or explaining" },
  { id: "problem_solver", label: "I was the person helping solve the problem" },
  { id: "founder_or_freelancer", label: "I was the founder, freelancer, or independent owner" },
  { id: "student_or_group_member", label: "I was a student or group member" },
  { id: "other", label: "Other" },
] as const

// -------------------- Actions taken --------------------

export const ACTIONS_TAKEN = [
  { id: "asked_questions", label: "Asked questions to understand the issue" },
  { id: "listened_to_customer", label: "Listened to the customer, client, or stakeholder" },
  { id: "investigated_problem", label: "Investigated the problem" },
  { id: "created_plan", label: "Created a plan" },
  { id: "prioritized_work", label: "Prioritized the most important work" },
  { id: "communicated_updates", label: "Communicated updates" },
  { id: "followed_up", label: "Followed up consistently" },
  { id: "coordinated_people", label: "Coordinated with other people" },
  { id: "built_or_created", label: "Built, created, or produced something" },
  { id: "fixed_or_reworked", label: "Fixed, revised, or reworked something" },
  { id: "presented_options", label: "Presented options or recommendations" },
  { id: "persuaded_or_reframed", label: "Persuaded someone or reframed the issue" },
  { id: "used_data_or_research", label: "Used data, research, or evidence" },
  { id: "learned_new_skill", label: "Learned a new skill, tool, product, or process" },
  { id: "took_responsibility", label: "Took responsibility" },
  { id: "escalated_issue", label: "Escalated the issue when needed" },
  { id: "trained_or_taught", label: "Trained, taught, or explained something" },
  { id: "documented_process", label: "Documented the process" },
  { id: "changed_process", label: "Changed or improved the process" },
  { id: "worked_extra_time", label: "Put in extra time or effort" },
  { id: "measured_results", label: "Measured or tracked results" },
  { id: "other", label: "Other" },
] as const

// -------------------- Action detail prompts --------------------

export const ACTION_DETAIL_PROMPTS: Record<string, { label: string; placeholder: string }> = {
  asked_questions: {
    label: "What did you ask about?",
    placeholder: "Describe the questions you asked and what you needed to understand.",
  },
  listened_to_customer: {
    label: "What did you learn from listening?",
    placeholder: "Describe what you learned by listening.",
  },
  investigated_problem: {
    label: "What did you investigate?",
    placeholder: "Describe what you investigated and what you discovered.",
  },
  created_plan: {
    label: "What was your plan?",
    placeholder: "Describe the plan you created.",
  },
  prioritized_work: {
    label: "What did you prioritize?",
    placeholder: "Describe what you prioritized and why.",
  },
  communicated_updates: {
    label: "Who did you update, and how?",
    placeholder: "Describe who you updated, how, and how often.",
  },
  followed_up: {
    label: "Who did you follow up with?",
    placeholder: "Describe who you followed up with and what you needed from them.",
  },
  coordinated_people: {
    label: "Who did you coordinate with?",
    placeholder: "Describe the people or groups you coordinated.",
  },
  built_or_created: {
    label: "What did you build or create?",
    placeholder: "Describe what you built or created.",
  },
  fixed_or_reworked: {
    label: "What did you fix or rework?",
    placeholder: "Describe what you fixed or reworked.",
  },
  presented_options: {
    label: "What options did you present?",
    placeholder: "Describe the options you presented.",
  },
  persuaded_or_reframed: {
    label: "How did you persuade or reframe it?",
    placeholder: "Describe how you reframed the decision.",
  },
  used_data_or_research: {
    label: "What data or research did you use?",
    placeholder: "Describe the evidence you used and how it informed the decision.",
  },
  learned_new_skill: {
    label: "What did you learn?",
    placeholder: "Describe what you learned and how you applied it.",
  },
  took_responsibility: {
    label: "What did you take responsibility for?",
    placeholder: "Describe what you took responsibility for.",
  },
  escalated_issue: {
    label: "What did you escalate?",
    placeholder: "Describe what you escalated and why.",
  },
  trained_or_taught: {
    label: "What did you teach or explain?",
    placeholder: "Describe what you taught and who needed it.",
  },
  documented_process: {
    label: "What did you document?",
    placeholder: "Describe what you documented and why.",
  },
  changed_process: {
    label: "What process did you change?",
    placeholder: "Describe the process change you made.",
  },
  worked_extra_time: {
    label: "What extra effort did you put in?",
    placeholder: "Describe the extra effort you personally contributed.",
  },
  measured_results: {
    label: "What did you track or measure?",
    placeholder: "Describe what you measured and what the measure showed.",
  },
  other: {
    label: "What else did you do?",
    placeholder: "Describe the specific action that moved the situation forward.",
  },
}

// -------------------- Result types --------------------

export const RESULT_TYPES = [
  { id: "customer_satisfied", label: "The customer/client was satisfied" },
  { id: "customer_retained", label: "The customer/client stayed or continued working with us" },
  { id: "sale_closed", label: "A sale closed" },
  { id: "revenue_increased", label: "Revenue, sales, or growth increased" },
  { id: "performance_improved", label: "Performance improved" },
  { id: "project_completed", label: "The project was completed" },
  { id: "deadline_met", label: "The deadline was met" },
  { id: "quality_improved", label: "Quality improved" },
  { id: "time_saved", label: "Time was saved" },
  { id: "cost_saved", label: "Cost or waste was reduced" },
  { id: "process_adopted", label: "The process was adopted or reused" },
  { id: "team_aligned", label: "The team got aligned" },
  { id: "relationship_improved", label: "The relationship improved" },
  { id: "risk_reduced", label: "Risk was reduced" },
  { id: "approval_received", label: "Approval was received" },
  { id: "positive_feedback", label: "You received positive feedback" },
  { id: "referral_or_repeat_business", label: "It led to a referral, renewal, or repeat business" },
  { id: "learned_and_applied", label: "You learned something and applied it" },
  { id: "earned_responsibility", label: "You earned more trust or responsibility" },
  { id: "mistake_fixed", label: "The mistake was fixed" },
  { id: "no_hard_result_but_positive", label: "No hard number, but there was a clear positive outcome" },
  { id: "other", label: "Other" },
] as const

// -------------------- Metric options --------------------

export const HAS_METRIC_OPTIONS = [
  { id: "yes", label: "Yes, I have a number" },
  { id: "no", label: "No, but I know the outcome" },
  { id: "not_sure", label: "Not sure" },
] as const

export const METRIC_TYPES = [
  { id: "percent_increase", label: "Percent increase" },
  { id: "percent_decrease", label: "Percent decrease" },
  { id: "dollar_amount", label: "Dollar amount" },
  { id: "revenue_amount", label: "Revenue amount" },
  { id: "cost_savings", label: "Cost savings" },
  { id: "time_saved", label: "Time saved" },
  { id: "number_of_customers", label: "Number of customers/users/accounts" },
  { id: "number_of_sales", label: "Number of sales/deals/orders" },
  { id: "number_of_projects", label: "Number of projects/tasks completed" },
  { id: "deadline_timeframe", label: "Deadline or timeframe" },
  { id: "quota_or_goal", label: "Quota, goal, or target" },
  { id: "ranking_or_score", label: "Ranking, score, rating, or review" },
  { id: "other", label: "Other" },
] as const

export const NON_METRIC_PROOFS = [
  { id: "positive_feedback", label: "Positive feedback" },
  { id: "customer_approved", label: "Customer/client approved it" },
  { id: "manager_approved", label: "Manager or leader approved it" },
  { id: "team_used_it", label: "The team used it" },
  { id: "project_finished", label: "The project got finished" },
  { id: "customer_returned", label: "The customer returned, renewed, or continued" },
  { id: "customer_referred", label: "The customer referred someone" },
  { id: "problem_stopped_happening", label: "The problem stopped happening" },
  { id: "process_reused", label: "The process was reused" },
  { id: "relationship_improved", label: "The relationship improved" },
  { id: "got_more_responsibility", label: "You got more responsibility afterward" },
  { id: "learned_lesson", label: "You learned something you applied later" },
  { id: "other", label: "Other" },
] as const

// -------------------- Competencies --------------------

export const COMPETENCIES = [
  { id: "problem_solving", label: "Problem solving" },
  { id: "ownership", label: "Ownership" },
  { id: "customer_focus", label: "Customer focus" },
  { id: "sales_ability", label: "Sales ability" },
  { id: "communication", label: "Communication" },
  { id: "leadership", label: "Leadership" },
  { id: "adaptability", label: "Adaptability" },
  { id: "learning_agility", label: "Learning agility" },
  { id: "collaboration", label: "Collaboration" },
  { id: "conflict_resolution", label: "Conflict resolution" },
  { id: "attention_to_detail", label: "Attention to detail" },
  { id: "resilience", label: "Resilience" },
  { id: "strategic_thinking", label: "Strategic thinking" },
  { id: "execution", label: "Execution" },
  { id: "initiative", label: "Initiative" },
  { id: "accountability", label: "Accountability" },
] as const

// ========================== MAPPING OBJECTS ==========================

export const DEFAULT_COMPETENCIES_BY_STORY_TYPE: Record<StoryType, Competency[]> = {
  customer_problem: ["customer_focus", "communication", "problem_solving"],
  messy_project: ["problem_solving", "execution", "ownership"],
  ownership_moment: ["ownership", "initiative", "accountability"],
  sales_results_win: ["sales_ability", "customer_focus", "execution"],
  fast_learning: ["learning_agility", "adaptability", "initiative"],
  conflict_pushback: ["conflict_resolution", "communication", "collaboration"],
  mistake_recovery: ["accountability", "resilience", "problem_solving"],
  process_improvement: ["problem_solving", "execution", "strategic_thinking"],
  leadership_influence: ["leadership", "communication", "collaboration"],
  pressure_deadline: ["resilience", "execution", "ownership"],
}

export const SITUATION_DETAIL_PLACEHOLDERS: Record<StoryType, string> = {
  customer_problem: "Describe the specific concern, expectation, or breakdown.",
  messy_project: "Describe what made the work unclear, disorganized, or at risk.",
  ownership_moment: "Describe the gap you noticed and why you stepped in.",
  sales_results_win: "Describe the need, decision, and outcome without naming a real organization.",
  fast_learning: "Describe what you needed to learn and the time constraint.",
  conflict_pushback: "Describe the disagreement and what was at stake.",
  mistake_recovery: "Describe the mistake, its impact, and what needed to be corrected.",
  process_improvement: "Describe the inefficient process and who it affected.",
  leadership_influence: "Describe who needed to align and why alignment was difficult.",
  pressure_deadline: "Describe the deadline, normal timeline, and consequences.",
}

// ========================== PROGRESS STEPS ==========================

export const PROGRESS_STEPS = [
  'Story Type', 'Context', 'Situation', 'Stakes', 'Role', 'Actions', 'Result', 'Relevance', 'Generate'
] as const

// ========================== HELPER FUNCTIONS ==========================

export function getSituationOptions(storyType: StoryType) {
  switch (storyType) {
    case "customer_problem":
      return CUSTOMER_PROBLEM_SITUATIONS
    case "messy_project":
      return MESSY_PROJECT_SITUATIONS
    case "ownership_moment":
      return OWNERSHIP_SITUATIONS
    case "sales_results_win":
      return SALES_RESULTS_SITUATIONS
    case "fast_learning":
      return FAST_LEARNING_SITUATIONS
    case "conflict_pushback":
      return CONFLICT_SITUATIONS
    case "mistake_recovery":
      return MISTAKE_RECOVERY_SITUATIONS
    case "process_improvement":
      return PROCESS_IMPROVEMENT_SITUATIONS
    case "leadership_influence":
      return LEADERSHIP_INFLUENCE_SITUATIONS
    case "pressure_deadline":
      return PRESSURE_DEADLINE_SITUATIONS
  }
}
