export interface MultipleChoiceExercise {
  type: 'multiple_choice'
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface LabelSortExercise {
  type: 'label_sort'
  instruction: string
  segments: { text: string; correctLabel: string }[]
}

export interface WordBankExercise {
  type: 'word_bank'
  instruction: string
  sentenceWithBlank: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface TapSelectExercise {
  type: 'tap_select'
  instruction: string
  items: string[]
  correctIndices: number[]
  explanation: string
}

export interface ApplyToYourselfExercise {
  type: 'apply_to_yourself'
  instruction: string
  coachingTip: string
  fields: Array<{
    label: string
    placeholder: string
    helper?: string
    minWords?: number
    shouldIncludeNumber?: boolean
    avoidWords?: string[]
  }>
}

export type Exercise =
  | MultipleChoiceExercise
  | LabelSortExercise
  | WordBankExercise
  | TapSelectExercise
  | ApplyToYourselfExercise

export interface SubLesson {
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  teach: {
    title: string
    explanation: string
    example: {
      question: string
      badAnswer: string
      goodAnswer: string
      breakdown: Record<string, string>
    }
  }
  exercises: Exercise[]
}

export interface PracticeBundle {
  rootCause: string
  displayName: string
  description: string
  lessons: SubLesson[]
}

export const PRACTICE_BUNDLES: PracticeBundle[] = [
  {
    rootCause: 'poor_structure',
    displayName: 'Answer Structure',
    description: "Your answers lacked clear structure. Let's fix that.",
    lessons: [
      {
        title: 'Recognizing STAR',
        difficulty: 'easy',
        teach: {
          title: 'STAR gives your answer a clean spine',
          explanation:
            'STAR means Situation, Task, Action, Result. Situation gives context, Task states the goal, Action shows what you did, and Result proves it worked. Strong interview answers move through all four parts in order so the listener never has to guess what happened or why it mattered.',
          example: {
            question: 'Tell me about a time you solved a difficult problem.',
            badAnswer:
              'At my last job we had an issue with reporting, and I was involved in helping fix it. I worked with the team on a few changes and things ended up improving. It taught me a lot about staying flexible.',
            goodAnswer:
              'At my last job, our weekly revenue report was delayed by two days because data from three systems had to be merged manually. I was responsible for making the report reliable before the CFO review. I mapped the data sources, built one validation script, and created a single export template so the team stopped reconciling by hand. Within two weeks, the report went out the same day every Friday and finance stopped escalating data errors.',
            breakdown: {
              Situation: 'Weekly revenue reporting was delayed because three systems were merged manually.',
              Task: 'Make the report reliable before the CFO review.',
              Action: 'Mapped sources, built a validation script, and created one export template.',
              Result: 'Report shipped same day every Friday and escalations stopped.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which part of STAR explains what you personally did?',
            options: ['Situation', 'Task', 'Action', 'Result'],
            correctIndex: 2,
            explanation: 'Action is the step where you describe your own moves, decisions, and execution.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment with the correct STAR element.',
            segments: [
              { text: 'Customer support tickets had doubled after a product launch.', correctLabel: 'Situation' },
              { text: 'I needed to cut the backlog before the next release.', correctLabel: 'Task' },
              { text: 'I built a triage rubric and reassigned issues by severity.', correctLabel: 'Action' },
              { text: 'The backlog dropped by 40% in one week.', correctLabel: 'Result' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing STAR element.',
            sentenceWithBlank: 'In STAR, the [___] explains the measurable outcome of your work.',
            options: ['Situation', 'Task', 'Action', 'Result'],
            correctIndex: 3,
            explanation: 'Result is where you show the outcome, impact, or evidence.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the STAR elements that belong in a complete answer.',
            items: ['Situation', 'Task', 'Action', 'Result', 'Opinion'],
            correctIndices: [0, 1, 2, 3],
            explanation: 'A complete STAR answer uses Situation, Task, Action, and Result. Opinion is not a STAR element.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer is best structured as STAR?',
            options: [
              'I like solving messy problems and I usually stay calm under pressure.',
              'We had a delivery issue, I owned the fix, I changed the routing plan, and on-time delivery improved from 82% to 96%.',
              'The project was hard, but I learned a lot and people were happy.',
              'My manager trusted me, and I always try to communicate well.',
            ],
            correctIndex: 1,
            explanation: 'Option 2 clearly gives context, goal, action, and result in a logical flow.',
          },
        ],
      },
      {
        title: 'Strengthening Action and Result',
        difficulty: 'medium',
        teach: {
          title: 'Most weak STAR answers collapse in Action and Result',
          explanation:
            'Candidates often describe the setup well, then rush through what they actually did and what changed. The fix is simple: name the actions you chose and end with a concrete result.',
          example: {
            question: 'Tell me about a time you improved a process.',
            badAnswer:
              'Our onboarding process had a few issues, so I got involved and helped clean some of it up. We made a couple of updates and it definitely felt smoother afterward for the team.',
            goodAnswer:
              'New hires were taking almost two weeks to get system access, which slowed their ramp-up. I was asked to shorten that timeline without adding headcount. I mapped every approval step, removed duplicate manager sign-offs, and created one request form tied to IT and HR workflows. Access time dropped from 9 business days to 3, and new hires completed their first tasks in week one.',
            breakdown: {
              Focus: 'The weak version names the problem but never proves what changed.',
              Action: 'Mapped steps, removed duplicate approvals, created one request form.',
              Result: 'Access time dropped from 9 business days to 3.',
              WhyItWorks: 'Concrete steps and a hard result make the answer believable.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What is missing from this answer? "Our backlog was growing, so I jumped in and helped the team. It ended up going well."',
            options: ['Situation only', 'Task and concrete Action', 'Result only', 'Nothing important'],
            correctIndex: 1,
            explanation: 'The answer hints at a problem but never states the goal clearly or the specific actions taken.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment. One segment is stronger because it is specific.',
            segments: [
              { text: 'The sales team was losing follow-up notes in spreadsheets.', correctLabel: 'Situation' },
              { text: 'I needed to make handoffs consistent before quarter close.', correctLabel: 'Task' },
              { text: 'I built a CRM template with required fields and reminders.', correctLabel: 'Action' },
              { text: 'Missed follow-ups fell by 30% that month.', correctLabel: 'Result' },
              { text: 'Everyone felt more organized.', correctLabel: 'Result' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Pick the strongest word to complete the coaching tip.',
            sentenceWithBlank: 'If your STAR answer feels flat, add a [___] result instead of a vague ending.',
            options: ['measurable', 'friendly', 'longer', 'general'],
            correctIndex: 0,
            explanation: 'A measurable result makes the ending credible and memorable.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the segments that improve the Action section.',
            items: [
              'I coordinated with IT and finance to map the failure points.',
              'It was a challenging time for everyone.',
              'I replaced the manual checklist with an automated trigger.',
              'People appreciated the effort.',
            ],
            correctIndices: [0, 2],
            explanation: 'The correct items describe concrete actions. The others are commentary, not execution.',
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing STAR element.',
            sentenceWithBlank: '"I redesigned the handoff checklist" belongs in the [___] part of STAR.',
            options: ['Situation', 'Task', 'Action', 'Result'],
            correctIndex: 2,
            explanation: 'That sentence describes what you did, so it belongs in Action.',
          },
        ],
      },
      {
        title: 'Mastering Tight STAR Answers',
        difficulty: 'hard',
        teach: {
          title: 'Use enough context to orient, but do not let Situation swallow the answer',
          explanation:
            'Edge case: an answer can sound structured while still failing if the Action is generic or the Result is weak. Good STAR is balanced, not just ordered.',
          example: {
            question: 'Describe a time you influenced without authority.',
            badAnswer:
              'There was some disagreement between teams, and I spent a lot of time trying to get everyone aligned. Eventually we got on the same page and moved forward, so it ended up working out.',
            goodAnswer:
              'Product and support disagreed on the rollout timeline for a billing change, which risked confusing current customers. My goal was to get agreement on a launch sequence without formal authority over either team. I collected the top support risks, paired them with product dependencies, and proposed a phased launch with customer messaging checkpoints. Both teams adopted the plan, the change shipped on schedule, and support tickets stayed flat during rollout.',
            breakdown: {
              EdgeCase: 'This only works if the influence move is specific, not generic.',
              Situation: 'Product and support disagreed on rollout timing.',
              Action: 'Collected risks, mapped dependencies, proposed phased launch.',
              Result: 'Shipped on schedule and support tickets stayed flat.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer subtly fails STAR even though it sounds polished?',
            options: [
              'Our team missed deadlines, so I reset the workflow, assigned owners, and delivery improved from 70% to 93% on time.',
              'A client escalation hit our team, I owned the response, coordinated fixes, and the client renewed for another year.',
              'The launch was complex and high-visibility. I worked closely with everyone and kept communication strong. In the end, leadership was pleased.',
              'We had duplicate work across teams, so I centralized intake, set SLAs, and cut turnaround time by 35%.',
            ],
            correctIndex: 2,
            explanation: 'It sounds professional, but the Action is vague and the Result is not concrete.',
          },
          {
            type: 'label_sort',
            instruction: 'Label the segments of this compact STAR answer.',
            segments: [
              { text: 'Returns were rising after a packaging change.', correctLabel: 'Situation' },
              { text: 'I had to identify the cause before the next warehouse order.', correctLabel: 'Task' },
              { text: 'I compared return notes, found one box size causing damage, and updated the packing rule.', correctLabel: 'Action' },
              { text: 'Damage-related returns dropped by 22% the next month.', correctLabel: 'Result' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Fill in the missing coaching phrase.',
            sentenceWithBlank: 'A STAR answer with a long setup and generic execution usually fails in the [___] section.',
            options: ['Action', 'Situation', 'Title', 'Greeting'],
            correctIndex: 0,
            explanation: 'The subtle failure is usually weak Action, not missing context.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the statements that are valid Result lines.',
            items: [
              'Cycle time dropped from 6 days to 2.',
              'Everyone was excited.',
              'We reduced error rates by 18% in one quarter.',
              'It felt like a win.',
              'The client expanded the contract by $120k.',
            ],
            correctIndices: [0, 2, 4],
            explanation: 'Strong Results are concrete and outcome-based, not just emotional impressions.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the best revision to strengthen this weak ending: "The project turned out well"?',
            options: [
              'It was a great success for the team.',
              'I was proud of how it went.',
              'The rollout finished one week early and support tickets dropped 15% after launch.',
              'People noticed the improvement right away.',
            ],
            correctIndex: 2,
            explanation: 'The best revision supplies clear evidence and closes the STAR answer with a real result.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Apply it to yourself. Build a tight STAR answer from your own experience.',
            coachingTip: 'Keep each section short, specific, and easy to say out loud later. The goal is not a perfect essay. It is a strong interview-ready skeleton.',
            fields: [
              {
                label: 'Situation',
                placeholder: 'What was happening? Give just enough context to orient the interviewer.',
                helper: 'Name the moment, team, or problem without turning this into a long setup.',
                minWords: 8,
              },
              {
                label: 'Task',
                placeholder: 'What did you need to solve, own, or deliver?',
                helper: 'State the goal or responsibility clearly.',
                minWords: 6,
              },
              {
                label: 'Action',
                placeholder: 'What did you personally do?',
                helper: 'Use first-person ownership and name the real moves you made.',
                minWords: 12,
              },
              {
                label: 'Result',
                placeholder: 'What changed because of your work?',
                helper: 'End with the outcome, impact, or evidence.',
                minWords: 8,
                shouldIncludeNumber: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'lack_of_specificity',
    displayName: 'Specificity & Impact',
    description: "Your answers were too vague. Let's make every claim provable.",
    lessons: [
      {
        title: 'Recognizing the Specificity Ladder',
        difficulty: 'easy',
        teach: {
          title: 'Climb the Specificity Ladder',
          explanation:
            'The Specificity Ladder has three steps: Name it, Quantify it, Show impact. First, state the exact thing you worked on. Next, attach a number, frequency, size, or scope. Finally, explain why that change mattered to the business, customer, or team.',
          example: {
            question: 'Tell me about a project you are proud of.',
            badAnswer:
              'I worked on our onboarding process and made it a lot better for the team. It became more efficient overall, and people appreciated that it was easier to use.',
            goodAnswer:
              'I redesigned the customer onboarding checklist for our SMB accounts. Before the change, setup took an average of 12 days; after I removed duplicate approvals and added automated reminders, it dropped to 7 days. That shorter ramp meant customers reached first value faster and our implementation team could handle more accounts each month.',
            breakdown: {
              NameIt: 'Customer onboarding checklist for SMB accounts.',
              QuantifyIt: 'Setup time dropped from 12 days to 7.',
              ShowImpact: 'Customers reached value faster and team capacity increased.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which sentence is the best example of "Name it"?',
            options: [
              'I improved things a lot.',
              'I worked on a process.',
              'I redesigned the refund approval workflow for enterprise orders.',
              'It was helpful overall.',
            ],
            correctIndex: 2,
            explanation: 'It identifies the exact process rather than using generic language.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment by the Specificity Ladder step.',
            segments: [
              { text: 'I rebuilt the weekly staffing forecast model.', correctLabel: 'Name it' },
              { text: 'Forecast error dropped from 18% to 6%.', correctLabel: 'Quantify it' },
              { text: 'That let managers schedule fewer overtime shifts.', correctLabel: 'Show impact' },
              { text: 'I updated the churn dashboard for sales.', correctLabel: 'Name it' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing step.',
            sentenceWithBlank: 'If you already named the project and added a metric, the next step is to [___].',
            options: ['show impact', 'change topics', 'add humor', 'slow down'],
            correctIndex: 0,
            explanation: 'The ladder ends by connecting the evidence to why it mattered.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the statements that are specific enough to sound credible.',
            items: [
              'I improved retention.',
              'I raised trial-to-paid conversion from 14% to 19%.',
              'I made reports faster.',
              'I cut monthly reporting time by 6 hours.',
            ],
            correctIndices: [1, 3],
            explanation: 'Specific statements name a metric or scope. Generic claims do not.',
          },
          {
            type: 'multiple_choice',
            question: 'Why is "Show impact" important?',
            options: [
              'It makes the answer longer.',
              'It connects your evidence to business value.',
              'It avoids using numbers.',
              'It replaces the need for examples.',
            ],
            correctIndex: 1,
            explanation: 'Impact explains why the metric matters beyond the task itself.',
          },
        ],
      },
      {
        title: 'Making Claims Provable',
        difficulty: 'medium',
        teach: {
          title: 'The hard part is not adding numbers; it is choosing numbers that prove the claim',
          explanation:
            'A weak answer says something improved. A stronger answer shows what improved, by how much, and for whom. Use the metric that best supports the claim you are making.',
          example: {
            question: 'Describe a time you increased efficiency.',
            badAnswer:
              'I improved our reporting process and made it run a lot more efficiently. The team noticed it was easier to work with after the changes.',
            goodAnswer:
              'I streamlined the monthly compliance report by removing duplicate data pulls and standardizing the template. The process went from 5 hours of manual work to 90 minutes, which freed the analyst team to review exceptions instead of formatting spreadsheets.',
            breakdown: {
              Claim: 'Increased efficiency.',
              Proof: 'Reduced manual work from 5 hours to 90 minutes.',
              Impact: 'Freed analysts for higher-value review work.',
              Tip: 'Use the metric that proves the exact claim you are making.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer better proves "I improved team efficiency"?',
            options: [
              'The team liked the new process.',
              'I reduced ticket triage time from 20 minutes to 8 minutes per case.',
              'People said the workflow felt smoother.',
              'The process was much easier after my update.',
            ],
            correctIndex: 1,
            explanation: 'That option directly proves the efficiency claim with a relevant metric.',
          },
          {
            type: 'label_sort',
            instruction: 'Sort each segment by the Specificity Ladder step.',
            segments: [
              { text: 'I rebuilt the interview scheduling workflow.', correctLabel: 'Name it' },
              { text: 'Scheduling time dropped from 3 days to 1 day.', correctLabel: 'Quantify it' },
              { text: 'Recruiters could move candidates through the funnel faster.', correctLabel: 'Show impact' },
              { text: 'I updated the recruiter scorecard.', correctLabel: 'Name it' },
              { text: 'Offer acceptance rose 6 points after follow-up speed improved.', correctLabel: 'Show impact' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the strongest phrase.',
            sentenceWithBlank: 'When a claim sounds vague, the fastest fix is to replace "better" with [___].',
            options: ['a metric', 'a joke', 'more adjectives', 'a disclaimer'],
            correctIndex: 0,
            explanation: 'A metric turns a soft claim into something provable.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the details that would strengthen the claim "I improved customer retention."',
            items: [
              'Renewal rate increased from 81% to 88%.',
              'Customers seemed happier.',
              'Churn fell by 3 percentage points.',
              'The team was energized.',
            ],
            correctIndices: [0, 2],
            explanation: 'Both correct choices directly measure retention. The others are indirect and vague.',
          },
          {
            type: 'word_bank',
            instruction: 'Complete the ladder in the correct order.',
            sentenceWithBlank: 'Name it -> Quantify it -> [___].',
            options: ['Show impact', 'Start over', 'Generalize it', 'Apologize'],
            correctIndex: 0,
            explanation: 'The final step is to connect the quantified claim to business or customer value.',
          },
        ],
      },
      {
        title: 'Mastering Precision Under Pressure',
        difficulty: 'hard',
        teach: {
          title: 'Do not add random numbers; add the right evidence for the claim',
          explanation:
            'Edge case: a number can still be weak if it does not prove the point you are making. Precision means relevant evidence, not just any evidence.',
          example: {
            question: 'Tell me about a time you improved customer experience.',
            badAnswer:
              'I spent a lot of time handling tickets and trying to support customers better. Customers seemed happier afterward, and our team also stayed more aligned through regular check-ins.',
            goodAnswer:
              'I noticed billing tickets were taking too long because agents had to verify account history in two systems. I created one lookup view and a macro for the three most common billing issues. First-response time on billing tickets fell from 11 hours to 4, and CSAT on that queue rose from 82% to 91%.',
            breakdown: {
              EdgeCase: 'A busy queue alone does not prove customer experience improved.',
              RelevantMetric: 'First-response time and CSAT fit the claim.',
              Impact: 'Both metrics connect directly to a better customer experience.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which metric best supports the claim "I improved onboarding quality"?',
            options: [
              'We held more team meetings.',
              'The onboarding completion rate rose from 76% to 92%.',
              'I answered many questions.',
              'The project lasted six weeks.',
            ],
            correctIndex: 1,
            explanation: 'Completion rate is directly relevant to onboarding quality; the others are not proof.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each statement by the ladder step.',
            segments: [
              { text: 'I redesigned the new-customer kickoff deck.', correctLabel: 'Name it' },
              { text: 'No-show rates fell from 18% to 9%.', correctLabel: 'Quantify it' },
              { text: 'That gave account managers more time for active accounts.', correctLabel: 'Show impact' },
              { text: 'I updated the support queue tags.', correctLabel: 'Name it' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best completion.',
            sentenceWithBlank: 'A number is weak evidence when it is [___] to the claim you are making.',
            options: ['unrelated', 'large', 'recent', 'surprising'],
            correctIndex: 0,
            explanation: 'Relevance matters more than raw size or novelty.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the details that actually prove the claim "I improved reliability."',
            items: [
              'Uptime rose from 97.8% to 99.4%.',
              'The team met twice a week.',
              'Incident volume dropped by 28%.',
              'Leadership thanked us.',
              'Mean time to recovery fell from 50 minutes to 18.',
            ],
            correctIndices: [0, 2, 4],
            explanation: 'These metrics directly reflect reliability. The others may be true but do not prove the claim.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer is most precise?',
            options: [
              'I improved hiring a lot and it helped the business.',
              'I made our recruiting process more organized.',
              'I cut average interview scheduling time from 4 days to 36 hours, which reduced candidate drop-off before final rounds.',
              'People said recruiting felt smoother after my changes.',
            ],
            correctIndex: 2,
            explanation: 'It names the process, quantifies the change, and shows the business impact.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Apply it to yourself. Build one answer using the Specificity Ladder.',
            coachingTip: 'Name the exact thing, quantify the change, then show why it mattered. If the claim cannot be proven, tighten it.',
            fields: [
              {
                label: 'Name it',
                placeholder: 'What exact project, workflow, feature, or problem did you work on?',
                helper: 'Avoid generic phrases like "a process" or "some reporting work."',
                minWords: 6,
              },
              {
                label: 'Quantify it',
                placeholder: 'What metric, volume, time frame, or scope proves the claim?',
                helper: 'Use the number that best supports the specific improvement you are claiming.',
                minWords: 6,
                shouldIncludeNumber: true,
              },
              {
                label: 'Show impact',
                placeholder: 'Why did that change matter to the business, customer, or team?',
                helper: 'Close the loop from evidence to value.',
                minWords: 10,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'weak_communication',
    displayName: 'Confident Delivery',
    description: "Hedge words are killing your credibility. Let's cut them.",
    lessons: [
      {
        title: 'Recognizing Hedge Words',
        difficulty: 'easy',
        teach: {
          title: 'Cut the Hedges',
          explanation:
            'Confident delivery uses three habits: remove hedge words, lead with the answer, and use active voice. Hedge words like "maybe," "kind of," or "I think" make a solid point sound uncertain. Start with the claim, then support it directly.',
          example: {
            question: 'Why should we hire you?',
            badAnswer:
              'I think I would probably be a pretty good fit because I have kind of done similar work before and I guess I learn quickly.',
            goodAnswer:
              'You should hire me because I have already done this work at scale. I led a process redesign that cut response time by 35%, and I can bring that same operational discipline to this role.',
            breakdown: {
              NoHedges: 'The weak version wobbles with "I think," "probably," and "kind of."',
              LeadWithAnswer: 'The strong version starts with the answer right away.',
              ActiveVoice: 'It says "I led" instead of hiding behind vague phrasing.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which phrase is a hedge word?',
            options: ['I led the rollout', 'We shipped on time', 'I think we improved it', 'Revenue rose 12%'],
            correctIndex: 2,
            explanation: '"I think" weakens certainty and sounds less credible.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment with the communication habit it best represents.',
            segments: [
              { text: 'You should hire me because I have managed this exact type of launch.', correctLabel: 'Lead with the answer' },
              { text: 'I removed the manual approval step.', correctLabel: 'Active voice' },
              { text: 'I probably could help here.', correctLabel: 'Hedge word' },
              { text: 'I owned the customer handoff design.', correctLabel: 'Active voice' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing word.',
            sentenceWithBlank: 'To sound more confident, cut [___] words like "maybe" and "sort of."',
            options: ['hedge', 'transition', 'technical', 'filler'],
            correctIndex: 0,
            explanation: 'Hedge words soften the statement and reduce confidence.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap all hedge words.',
            items: ['maybe', 'probably', 'led', 'kind of', 'delivered'],
            correctIndices: [0, 1, 3],
            explanation: 'The hedge words are "maybe," "probably," and "kind of."',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer leads with the answer?',
            options: [
              'Well, there are a few ways to think about it.',
              'I guess one thing I would say is that communication matters.',
              'Yes. My strongest fit is stakeholder management in fast-moving teams.',
              'It probably depends on the situation.',
            ],
            correctIndex: 2,
            explanation: 'It answers directly first, then leaves room to support the claim.',
          },
        ],
      },
      {
        title: 'Replacing Soft Language',
        difficulty: 'medium',
        teach: {
          title: 'The hard part is cutting soft openers without sounding robotic',
          explanation:
            'You do not need to sound aggressive. You need to sound clear. Replace soft openers with direct claims and use active verbs that show ownership.',
          example: {
            question: 'What is your leadership style?',
            badAnswer:
              'I would say I am probably pretty collaborative, and I try to help the team where I can.',
            goodAnswer:
              'My leadership style is collaborative and direct. I set clear priorities, remove blockers early, and give teams enough context to move without waiting on me.',
            breakdown: {
              DirectClaim: 'The first sentence answers the question immediately.',
              ActiveVerbs: 'Set, remove, and give make the answer sound owned.',
              Tone: 'The delivery is clear without sounding aggressive.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which revision is most confident without sounding arrogant?',
            options: [
              'I guess I am sort of good at managing projects.',
              'I am the best project manager you will ever meet.',
              'I manage projects by setting milestones, clarifying owners, and tracking risks early.',
              'Project work is something I have maybe done a little.',
            ],
            correctIndex: 2,
            explanation: 'It is direct, specific, and grounded without exaggeration.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each phrase by the communication habit it illustrates.',
            segments: [
              { text: 'Yes. I enjoy mentoring because I like turning ambiguity into clear next steps.', correctLabel: 'Lead with the answer' },
              { text: 'The process was redesigned by me.', correctLabel: 'Passive voice' },
              { text: 'I kind of helped with the launch.', correctLabel: 'Hedge word' },
              { text: 'I redesigned the launch checklist.', correctLabel: 'Active voice' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Pick the strongest replacement.',
            sentenceWithBlank: 'Replace "I think I could help" with "[___] can help by reducing response time and clarifying ownership."',
            options: ['I', 'maybe I', 'I guess I', 'sort of I'],
            correctIndex: 0,
            explanation: 'A direct first-person subject removes the hedge and keeps the sentence clean.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the phrases that weaken credibility.',
            items: [
              'I probably would approach it this way.',
              'I led the rollout across three teams.',
              'I guess the result was positive.',
              'I reduced rework by 20%.',
            ],
            correctIndices: [0, 2],
            explanation: 'The correct choices hedge. The other two are direct and credible.',
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing habit.',
            sentenceWithBlank: 'If your sentence starts with "Well, it depends," you probably failed to [___].',
            options: ['lead with the answer', 'use a bigger metric', 'add more context', 'tell a longer story'],
            correctIndex: 0,
            explanation: 'You should answer first, then explain nuance if needed.',
          },
        ],
      },
      {
        title: 'Sounding Clear in Edge Cases',
        difficulty: 'hard',
        teach: {
          title: 'Confidence is clarity, not overclaiming',
          explanation:
            'Edge case: some candidates remove hedges by making claims that are too absolute. The goal is a direct answer that is still accurate. State the answer clearly, then qualify with evidence instead of verbal wobbling.',
          example: {
            question: 'How do you handle conflict?',
            badAnswer:
              'I never really have conflict, and I am always able to fix it right away.',
            goodAnswer:
              'I address conflict early and directly. I start by clarifying the disagreement, align on the decision needed, and document next steps so the issue does not keep resurfacing.',
            breakdown: {
              EdgeCase: 'Do not replace hedging with fake certainty like "always" or "never."',
              ClearClaim: 'Start with a direct statement of how you handle conflict.',
              Support: 'Back the claim with process instead of exaggeration.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is confident and credible?',
            options: [
              'I never make mistakes in communication.',
              'I probably communicate well most of the time.',
              'I communicate directly, summarize decisions in writing, and confirm owners before work starts.',
              'Maybe I am strong at communication depending on the team.',
            ],
            correctIndex: 2,
            explanation: 'It is direct, specific, and believable without overclaiming.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each phrase with the best fit.',
            segments: [
              { text: 'I always solve every stakeholder issue instantly.', correctLabel: 'Overclaim' },
              { text: 'I address stakeholder issues early and clarify decision owners.', correctLabel: 'Lead with the answer' },
              { text: 'The escalation was resolved by me.', correctLabel: 'Passive voice' },
              { text: 'I resolved the escalation within one business day.', correctLabel: 'Active voice' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Complete the coaching sentence.',
            sentenceWithBlank: 'The safest way to sound confident is to make a direct claim and support it with [___].',
            options: ['evidence', 'hedges', 'jokes', 'volume'],
            correctIndex: 0,
            explanation: 'Evidence keeps the answer confident without drifting into exaggeration.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the phrases that should be cut or revised.',
            items: [
              'always',
              'never',
              'I led the migration',
              'sort of',
              'probably',
            ],
            correctIndices: [0, 1, 3, 4],
            explanation: '"Always" and "never" often overclaim; "sort of" and "probably" hedge. "I led the migration" is strong.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the best opening to a difficult answer?',
            options: [
              'That is a great question and there are a lot of ways to think about it.',
              'Yes. The main risk was timing, so I reduced it by sequencing the rollout in phases.',
              'I guess I would maybe start by saying it was complicated.',
              'It always works out when people communicate.',
            ],
            correctIndex: 1,
            explanation: 'It leads with a clear answer and stays grounded in a real action.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Apply it to yourself. Draft a confident answer without hedging.',
            coachingTip: 'Lead with the answer. Cut soft qualifiers. Then support the claim with one specific proof point.',
            fields: [
              {
                label: 'Direct opening',
                placeholder: 'Write the first sentence the interviewer should hear.',
                helper: 'Lead with the answer instead of circling around it.',
                minWords: 6,
                avoidWords: ['maybe', 'probably', 'kind of', 'sort of', 'i think', 'i guess'],
              },
              {
                label: 'Supporting proof',
                placeholder: 'Add one concrete line that backs up your claim.',
                helper: 'Use active voice and direct ownership.',
                minWords: 10,
                avoidWords: ['maybe', 'probably', 'kind of', 'sort of', 'i think', 'i guess'],
              },
              {
                label: 'Tight close',
                placeholder: 'Write a concise closing line that sounds clear and credible.',
                helper: 'No overclaiming. No wobbling.',
                minWords: 6,
                avoidWords: ['always', 'never', 'maybe', 'probably', 'kind of', 'sort of'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'missing_knowledge',
    displayName: 'Research That Lands',
    description: "Generic answers signal zero prep. Let's fix that.",
    lessons: [
      {
        title: 'Recognizing the Research Bridge',
        difficulty: 'easy',
        teach: {
          title: 'Use the Research Bridge',
          explanation:
            'Research Bridge has three parts: their priority, your evidence, and the connection. First, identify what the company or role likely cares about. Then show your relevant proof. Finally, connect your proof back to that priority so your answer sounds prepared, not generic.',
          example: {
            question: 'Why do you want to work here?',
            badAnswer:
              'Your company seems like a great place to grow, and I really like what you are building. The culture and mission both stood out to me, so it feels like a place where I could see myself doing well.',
            goodAnswer:
              'What stands out to me is your push to shorten implementation time for mid-market customers. In my current role, I redesigned onboarding steps and cut average time-to-launch from 21 days to 12. That is why this role makes sense to me: the problem you are solving is one I have already improved in practice.',
            breakdown: {
              TheirPriority: 'Shortening implementation time for mid-market customers.',
              YourEvidence: 'Cut average time-to-launch from 21 days to 12.',
              TheConnection: 'Your past work matches the exact problem they care about.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What comes first in the Research Bridge?',
            options: ['Your evidence', 'Their priority', 'Your salary target', 'A generic compliment'],
            correctIndex: 1,
            explanation: 'Start by naming what the company or role appears to care about.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment by the Research Bridge step.',
            segments: [
              { text: 'You are investing heavily in self-serve onboarding.', correctLabel: 'Their priority' },
              { text: 'I previously reduced setup friction by consolidating five onboarding emails into one guided flow.', correctLabel: 'Your evidence' },
              { text: 'That experience is why I am excited about this role.', correctLabel: 'The connection' },
              { text: 'Your team is focused on account expansion.', correctLabel: 'Their priority' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing phrase.',
            sentenceWithBlank: 'Research Bridge = their priority -> your evidence -> [___].',
            options: ['the connection', 'small talk', 'your resume summary', 'a disclaimer'],
            correctIndex: 0,
            explanation: 'The final step explains why your background matches the priority.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the statements that count as real company research signals.',
            items: [
              'A public note about expanding into healthcare',
              'Their logo looks modern',
              'A hiring manager mentions reducing churn',
              'The office seems nice',
            ],
            correctIndices: [0, 2],
            explanation: 'Real research signals are business priorities, not surface-level compliments.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer uses the Research Bridge best?',
            options: [
              'I like your mission and culture.',
              'I want a new challenge, and your company seems interesting.',
              'You are focused on retention in SMB accounts, and I recently led a renewal playbook that raised retention by 7 points in that segment.',
              'I have always wanted to work at a fast-growing company.',
            ],
            correctIndex: 2,
            explanation: 'It names their priority and provides matching evidence from the candidate.',
          },
        ],
      },
      {
        title: 'Turning Research Into Relevance',
        difficulty: 'medium',
        teach: {
          title: 'The gap is usually the connection, not the research',
          explanation:
            'Many candidates mention a company fact and stop there. The stronger move is to connect that fact to a relevant piece of your own experience so the answer sounds targeted.',
          example: {
            question: 'Why this role?',
            badAnswer:
              'I saw that your company is expanding in Europe, which sounded exciting to me. It feels like a good time to join, and I would love to be part of that growth.',
            goodAnswer:
              'I saw that this team is expanding in Europe and building more multilingual support coverage. In my last role, I standardized escalation flows across three regions, which reduced handoff delays and made issue ownership clearer. That is why this role stands out to me: the scaling challenge is one I have already worked through.',
            breakdown: {
              Miss: 'The weak version notices a fact but never makes it relevant.',
              Evidence: 'Regional escalation workflow experience is the proof point.',
              Connection: 'The answer links past work to the company problem.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer makes the best connection?',
            options: [
              'I noticed you launched a new product, and that seems exciting.',
              'I saw you are expanding your partner channel, and I previously built partner onboarding guides that cut ramp time by 30%, so that priority fits my background well.',
              'Your company is growing quickly, which is interesting.',
              'I admire your leadership team and mission.',
            ],
            correctIndex: 1,
            explanation: 'It links a company priority to direct, relevant evidence.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment of the answer.',
            segments: [
              { text: 'Your team is prioritizing implementation speed for enterprise customers.', correctLabel: 'Their priority' },
              { text: 'I led a rollout that reduced enterprise go-live delays by standardizing approvals.', correctLabel: 'Your evidence' },
              { text: 'That is why this problem space feels like a direct fit.', correctLabel: 'The connection' },
              { text: 'You also seem to value operational rigor.', correctLabel: 'Their priority' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Fill in the strongest completion.',
            sentenceWithBlank: 'Mentioning a company fact without linking it to your background is missing the [___].',
            options: ['connection', 'timeline', 'closing joke', 'resume'],
            correctIndex: 0,
            explanation: 'The connection is what turns research into a targeted answer.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the details that would count as "your evidence."',
            items: [
              'I reduced onboarding time from 14 days to 8.',
              'Your mission is inspiring.',
              'I managed a cross-functional launch across finance and ops.',
              'Your website looks polished.',
            ],
            correctIndices: [0, 2],
            explanation: 'Evidence comes from your own relevant work, not company compliments.',
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best word.',
            sentenceWithBlank: 'A researched answer feels strong only when the evidence is [___] to their stated priority.',
            options: ['relevant', 'long', 'casual', 'emotional'],
            correctIndex: 0,
            explanation: 'Relevance is the core of the Research Bridge.',
          },
        ],
      },
      {
        title: 'Avoiding Fake Prep',
        difficulty: 'hard',
        teach: {
          title: 'Do not confuse trivia with preparation',
          explanation:
            'Edge case: candidates sometimes cite random facts that do not matter to the role. Strong research focuses on operating priorities, customer problems, or team goals that your experience can actually address.',
          example: {
            question: 'Why are you interested in this company?',
            badAnswer:
              'I know you were founded a few years ago, raised funding recently, and have been growing quickly. Those are all really interesting signs to me that the company is heading in a strong direction.',
            goodAnswer:
              'I noticed your recent hiring push in customer education, which suggests adoption and retention are core priorities right now. In my current role, I built a webinar-to-onboarding handoff that increased activation for new accounts. That is the bridge for me: the customer problem you are investing in is one I have already helped solve.',
            breakdown: {
              EdgeCase: 'Random company facts do not show real preparation.',
              BetterResearch: 'Focus on a business priority that actually maps to the job.',
              Bridge: 'Tie that priority to proof from your own background.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which detail is the strongest research signal for an interview answer?',
            options: [
              'The company mascot',
              'A recent note that the team is reducing implementation time',
              'The color palette on the homepage',
              'The city where the office opened',
            ],
            correctIndex: 1,
            explanation: 'It points to an operating priority that can be linked to your experience.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment.',
            segments: [
              { text: 'You are trying to improve activation for self-serve users.', correctLabel: 'Their priority' },
              { text: 'I previously simplified first-run setup and increased activation by 11 points.', correctLabel: 'Your evidence' },
              { text: 'That is why this role feels unusually aligned with my background.', correctLabel: 'The connection' },
              { text: 'You have recently expanded your customer education team.', correctLabel: 'Their priority' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the strongest completion.',
            sentenceWithBlank: 'Interview research should focus on role-relevant [___], not random trivia.',
            options: ['priorities', 'headlines', 'logos', 'office snacks'],
            correctIndex: 0,
            explanation: 'Priorities are what you can connect to your own evidence.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the details that are usually weak or off-target in a "Why this company?" answer.',
            items: [
              'Their homepage uses a clean design',
              'They are trying to reduce churn in a key segment',
              'Their founder gave a talk about customer retention',
              'Their office has a nice location',
            ],
            correctIndices: [0, 3],
            explanation: 'Design preferences and office location are weak signals compared with business priorities.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer sounds best prepared?',
            options: [
              'I saw you were founded eight years ago and recently changed offices.',
              'I know your company is growing, and I like growth.',
              'You are investing in onboarding quality for new enterprise customers, and I have already improved onboarding speed and consistency in that exact environment.',
              'Your brand seems modern and exciting to me.',
            ],
            correctIndex: 2,
            explanation: 'It identifies a business priority and matches it with relevant proof.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Apply it to yourself. Build a Research Bridge answer for one target role.',
            coachingTip: 'Use one real company or role priority, one piece of your own evidence, and one sentence that ties them together.',
            fields: [
              {
                label: 'Their priority',
                placeholder: 'What does this company, team, or role seem to care about right now?',
                helper: 'Choose a role-relevant priority, not a random fact.',
                minWords: 8,
              },
              {
                label: 'Your evidence',
                placeholder: 'What from your own experience proves you can help with that?',
                helper: 'Use a relevant example, ideally with scope or a measurable result.',
                minWords: 10,
                shouldIncludeNumber: true,
              },
              {
                label: 'The connection',
                placeholder: 'Why does that make you a fit for this role?',
                helper: 'Make the bridge explicit.',
                minWords: 8,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'off_topic',
    displayName: 'Answering the Real Question',
    description: "You're answering what you want to say, not what was asked.",
    lessons: [
      {
        title: 'Recognizing the Hidden Question',
        difficulty: 'easy',
        teach: {
          title: 'Decode the Hidden Question',
          explanation:
            'Interview questions usually have two layers: the surface question and what the interviewer is actually evaluating. A strong answer addresses both. If someone asks about a conflict, they are usually testing judgment, communication, and accountability, not looking for a dramatic story.',
          example: {
            question: 'Tell me about a time you received difficult feedback.',
            badAnswer:
              'I care a lot about doing good work, and I always try to improve when I get feedback. In general I take feedback seriously and try to support the team however I can.',
            goodAnswer:
              'In one role, my manager told me my project updates were too detailed for executives and made it harder to spot the real decisions. I reworked the format into a one-page summary with decisions, risks, and asks, then used that format for the next few leadership reviews. The updates became easier for executives to use, and I kept that structure going forward.',
            breakdown: {
              SurfaceQuestion: 'A real example of difficult feedback you received.',
              HiddenQuestion: 'Can you absorb criticism, adjust, and improve your behavior?',
              WhyBadFails: 'It stays abstract and never shows a real feedback moment.',
              WhyGoodWorks: 'It shows the feedback, the adjustment, and the result.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'If asked about conflict, what is the interviewer often really evaluating?',
            options: [
              'Whether you can tell dramatic stories',
              'Whether you can handle disagreement with judgment and professionalism',
              'Whether you dislike teammates',
              'Whether you can memorize definitions',
            ],
            correctIndex: 1,
            explanation: 'The hidden question is usually about judgment, communication, and accountability.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each item as Surface question or Hidden question.',
            segments: [
              { text: 'Tell me about a time you missed a deadline.', correctLabel: 'Surface question' },
              { text: 'Do you take ownership when things go wrong?', correctLabel: 'Hidden question' },
              { text: 'Describe a disagreement with a coworker.', correctLabel: 'Surface question' },
              { text: 'Can you navigate tension without creating bigger problems?', correctLabel: 'Hidden question' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Fill in the missing term.',
            sentenceWithBlank: 'Strong answers respond to the surface question and the [___] question underneath it.',
            options: ['hidden', 'easiest', 'shortest', 'loudest'],
            correctIndex: 0,
            explanation: 'The hidden question is what the interviewer is actually trying to evaluate.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the prompts that reveal a hidden evaluation of judgment or ownership.',
            items: [
              'Can you admit mistakes?',
              'What is your favorite app?',
              'Can you stay constructive under pressure?',
              'Which font do you prefer?',
            ],
            correctIndices: [0, 2],
            explanation: 'These reflect the deeper evaluation behind many behavioral questions.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer is most on-topic for "Tell me about a mistake"?',
            options: [
              'I care deeply about excellence and teamwork.',
              'I once missed an escalation signal, owned it immediately, fixed the alert threshold, and documented the new check so it did not recur.',
              'My biggest strength is communication.',
              'Mistakes can happen in any company, and culture matters a lot.',
            ],
            correctIndex: 1,
            explanation: 'It answers the actual question and shows the capability being evaluated.',
          },
        ],
      },
      {
        title: 'Staying Aligned Under Pressure',
        difficulty: 'medium',
        teach: {
          title: 'The trap is answering with your favorite story instead of the relevant one',
          explanation:
            'A polished story can still miss if it does not address the hidden evaluation. Before answering, decide what the interviewer is really trying to learn, then choose the example that proves that point.',
          example: {
            question: 'Tell me about a time you disagreed with your manager.',
            badAnswer:
              'I am usually very collaborative and try to keep everyone aligned. In one situation I was involved in a launch across several teams, and we eventually worked through the differences.',
            goodAnswer:
              'In one role, my manager wanted to keep a launch date even though our support documentation was still incomplete. I pulled recent ticket trends, showed where customers were already getting stuck, and recommended delaying the launch by one week so the team could finish the materials. We made the change, launched the following week, and saw fewer avoidable escalations.',
            breakdown: {
              Trap: 'A polished story still misses if it proves teamwork instead of disagreement handled well.',
              HiddenQuestion: 'Can you push back professionally and still move the work forward?',
              BetterChoice: 'Use the story where you pushed back, explained why, and improved the outcome.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What is wrong with this answer to "Tell me about a setback"? "I am usually very proactive, and I love working on ambitious projects."',
            options: [
              'It is too specific',
              'It answers the wrong question',
              'It uses too many numbers',
              'It is too short but still fully on-topic',
            ],
            correctIndex: 1,
            explanation: 'It talks about general strengths instead of an actual setback and response.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each statement.',
            segments: [
              { text: 'Describe a time you handled ambiguity.', correctLabel: 'Surface question' },
              { text: 'Can you create structure when instructions are incomplete?', correctLabel: 'Hidden question' },
              { text: 'Tell me about a conflict with a teammate.', correctLabel: 'Surface question' },
              { text: 'Can you protect the relationship while solving the issue?', correctLabel: 'Hidden question' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best completion.',
            sentenceWithBlank: 'Before answering, ask yourself: what are they actually [___] here?',
            options: ['evaluating', 'selling', 'avoiding', 'celebrating'],
            correctIndex: 0,
            explanation: 'That question keeps you aligned with the hidden evaluation.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the responses that directly answer "Tell me about a time you handled failure."',
            items: [
              'I missed a client handoff, owned the miss, and changed the checklist.',
              'I care a lot about quality in everything I do.',
              'One launch underperformed, so I analyzed adoption data and revised the rollout plan.',
              'My biggest strength is problem-solving.',
            ],
            correctIndices: [0, 2],
            explanation: 'The correct answers describe an actual failure and what happened next.',
          },
          {
            type: 'word_bank',
            instruction: 'Fill in the phrase.',
            sentenceWithBlank: 'A polished story is still weak if it proves the [___] capability.',
            options: ['wrong', 'highest', 'easiest', 'funniest'],
            correctIndex: 0,
            explanation: 'A relevant story matters more than a polished but misaligned one.',
          },
        ],
      },
      {
        title: 'Handling Tricky Question Variants',
        difficulty: 'hard',
        teach: {
          title: 'Sometimes the hidden question is narrower than the surface wording suggests',
          explanation:
            'Edge case: some answers sound related but still miss the exact evaluation. If asked about uncertainty, a story about teamwork might still fail unless it proves decision-making under incomplete information.',
          example: {
            question: 'Tell me about a time you had to make a decision with incomplete information.',
            badAnswer:
              'I worked closely with many teams during a large project, and communication was really important.',
            goodAnswer:
              'During a vendor outage, we did not yet know the root cause, but I still had to decide whether to keep customer-facing changes moving. I paused new releases for 24 hours, set a communication cadence with support and engineering, and used error-rate thresholds to decide when it was safe to resume. Once the metrics stabilized, we reopened the pipeline with less risk to customers.',
            breakdown: {
              EdgeCase: 'A related story still misses if it never shows an actual decision under uncertainty.',
              NarrowEvaluation: 'Can you make a sound call before you have the full picture?',
              GoodFit: 'It shows the decision, the reasoning, and the risk control.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is most on-topic for "Tell me about a time you made a decision with incomplete information"?',
            options: [
              'I enjoy collaborating with cross-functional teams.',
              'During a payment outage, I paused releases, communicated the risk, and resumed only after key indicators stabilized.',
              'I once led a successful product launch.',
              'My strength is staying organized under pressure.',
            ],
            correctIndex: 1,
            explanation: 'It directly addresses decision-making under uncertainty instead of drifting to general strengths.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each item.',
            segments: [
              { text: 'Tell me about a time priorities changed suddenly.', correctLabel: 'Surface question' },
              { text: 'Can you adapt without losing focus or ownership?', correctLabel: 'Hidden question' },
              { text: 'Describe a difficult stakeholder conversation.', correctLabel: 'Surface question' },
              { text: 'Can you stay clear and constructive in tension?', correctLabel: 'Hidden question' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best word.',
            sentenceWithBlank: 'If a story sounds related but does not prove the evaluated skill, it is still [___].',
            options: ['off-topic', 'advanced', 'complete', 'confident'],
            correctIndex: 0,
            explanation: 'Partial relevance is not enough if the story misses the actual evaluation.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the answer elements that fit a question about uncertainty.',
            items: [
              'The information available at the time',
              'The decision I made anyway',
              'A generic summary of my strengths',
              'How I monitored risk after the decision',
            ],
            correctIndices: [0, 1, 3],
            explanation: 'Those elements fit uncertainty. A generic strength summary does not.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the subtle failure in this answer? "The project had a lot of ambiguity, but I worked well with people and everyone appreciated my communication."',
            options: [
              'It is too technical',
              'It likely answers teamwork, not decision-making under ambiguity',
              'It includes too much evidence',
              'It is overly specific',
            ],
            correctIndex: 1,
            explanation: 'The answer sounds relevant, but it proves communication more than judgment under ambiguity.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Apply it to yourself. Decode the question before you answer it.',
            coachingTip: 'Start by naming what the interviewer is really testing. Then choose the example and opening that prove that exact capability.',
            fields: [
              {
                label: 'Surface question',
                placeholder: 'What would the interviewer literally ask?',
                helper: 'Use the wording you expect to hear.',
                minWords: 6,
              },
              {
                label: 'Hidden question',
                placeholder: 'What are they actually evaluating?',
                helper: 'Judgment, ownership, adaptability, conflict handling, and so on.',
                minWords: 6,
              },
              {
                label: 'Your answer opening',
                placeholder: 'Write the first lines of an answer that directly proves that hidden skill.',
                helper: 'Pick the example that fits the evaluation, not just your favorite story.',
                minWords: 14,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'too_short',
    displayName: 'Depth & Substance',
    description: "Your answers are too thin. Let's build them out.",
    lessons: [
      {
        title: 'Recognizing the 5-Layer Answer',
        difficulty: 'easy',
        teach: {
          title: 'Build depth with 5 layers',
          explanation:
            'The 5-Layer Answer is Claim, Context, Action, Outcome, Reflection. Start with the main point. Add enough context so the answer makes sense. Explain what you did. Show what happened. End with what you learned or how you would apply it again. This creates substance without rambling.',
          example: {
            question: 'Tell me about a project you led.',
            badAnswer:
              'I led a migration project. It went well, and I learned a lot.',
            goodAnswer:
              'I led a billing system migration for a team that was struggling with duplicate invoices. The project mattered because finance was spending hours correcting errors each week. I mapped failure points, set a phased cutover plan, and partnered with engineering on reconciliation checks. After launch, duplicate invoices dropped sharply and monthly close became faster. The experience taught me to front-load risk reviews before any system change touches finance workflows.',
            breakdown: {
              Claim: 'I led a billing system migration.',
              Context: 'Duplicate invoices were creating operational pain for finance.',
              Action: 'Mapped failure points, planned phased cutover, partnered on checks.',
              Outcome: 'Errors dropped and monthly close improved.',
              Reflection: 'Front-load risk reviews when finance workflows are involved.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which layer explains what happened because of your work?',
            options: ['Claim', 'Context', 'Outcome', 'Reflection'],
            correctIndex: 2,
            explanation: 'Outcome is where you show the result or effect of your actions.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment with the correct 5-Layer element.',
            segments: [
              { text: 'I led the support queue redesign.', correctLabel: 'Claim' },
              { text: 'Response times had been slipping for two months.', correctLabel: 'Context' },
              { text: 'I rewrote routing rules and assigned ownership by ticket type.', correctLabel: 'Action' },
              { text: 'First-response time fell from 10 hours to 4.', correctLabel: 'Outcome' },
              { text: 'It taught me to simplify ownership early.', correctLabel: 'Reflection' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the missing layer.',
            sentenceWithBlank: 'Claim -> Context -> Action -> Outcome -> [___].',
            options: ['Reflection', 'Greeting', 'Disclaimer', 'Question'],
            correctIndex: 0,
            explanation: 'Reflection is the fifth layer that adds maturity and depth.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the elements that make an answer feel complete.',
            items: ['Claim', 'Action', 'Outcome', 'Reflection', 'Random opinion'],
            correctIndices: [0, 1, 2, 3],
            explanation: 'A complete 5-Layer answer includes the first four plus Reflection. Random opinion is not part of the structure.',
          },
          {
            type: 'multiple_choice',
            question: 'Why does Reflection matter?',
            options: [
              'It proves you can learn and generalize from experience.',
              'It makes the answer sound dramatic.',
              'It replaces the need for results.',
              'It should always be the longest part.',
            ],
            correctIndex: 0,
            explanation: 'Reflection shows judgment and growth, not just activity.',
          },
        ],
      },
      {
        title: 'Adding Depth Without Rambling',
        difficulty: 'medium',
        teach: {
          title: 'The missing layer is often Context or Reflection',
          explanation:
            'Thin answers usually jump from claim to action with no stakes, or stop after the result with no insight. Add the missing layer that makes the story feel complete, but keep each layer tight.',
          example: {
            question: 'Tell me about a time you improved a process.',
            badAnswer:
              'I improved the handoff process and it worked better afterward.',
            goodAnswer:
              'I improved our handoff process between sales and implementation because key customer details were being lost after close. I added required fields to the CRM handoff, built a kickoff summary template, and reviewed the first ten handoffs with both teams. Implementation started projects with fewer surprises, and I learned that process fixes stick faster when both teams help design the checklist.',
            breakdown: {
              MissingContext: 'Name the pain so the process change actually matters.',
              Action: 'Specific intervention is what gives the answer substance.',
              Reflection: 'A short lesson adds maturity without dragging the answer out.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What is most missing from this answer? "I improved onboarding by simplifying forms, and completion rates increased."',
            options: ['Claim', 'Context', 'Outcome', 'Nothing'],
            correctIndex: 1,
            explanation: 'It has a claim, action, and outcome, but no context for why the change mattered.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment of the 5-Layer answer.',
            segments: [
              { text: 'I rebuilt the weekly reporting workflow.', correctLabel: 'Claim' },
              { text: 'Analysts were spending Fridays cleaning inconsistent exports.', correctLabel: 'Context' },
              { text: 'I standardized the template and added a validation check.', correctLabel: 'Action' },
              { text: 'Report prep time dropped from 4 hours to 90 minutes.', correctLabel: 'Outcome' },
              { text: 'I learned that simple guardrails beat heroic cleanup.', correctLabel: 'Reflection' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the strongest completion.',
            sentenceWithBlank: 'If an answer feels abrupt after the result, add a short [___].',
            options: ['reflection', 'detour', 'apology', 'greeting'],
            correctIndex: 0,
            explanation: 'A concise reflection often gives the answer a more mature finish.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the layers this answer already includes: "I led the migration, fixed the data mapping, and cut errors by 25%."',
            items: ['Claim', 'Context', 'Action', 'Outcome', 'Reflection'],
            correctIndices: [0, 2, 3],
            explanation: 'The answer has a claim, action, and outcome. It lacks context and reflection.',
          },
          {
            type: 'word_bank',
            instruction: 'Fill in the tip.',
            sentenceWithBlank: 'Depth comes from covering the right layers, not from making each sentence [___].',
            options: ['longer', 'softer', 'faster', 'louder'],
            correctIndex: 0,
            explanation: 'A deep answer is complete, not wordy.',
          },
        ],
      },
      {
        title: 'Mastering Concise Depth',
        difficulty: 'hard',
        teach: {
          title: 'A short answer can still be deep if every layer earns its place',
          explanation:
            'Edge case: some candidates add depth by stacking details, but the answer still feels thin because it lacks reflection or stakes. The goal is layered substance, not clutter.',
          example: {
            question: 'Tell me about a time you took initiative.',
            badAnswer:
              'I saw a problem and took initiative to solve it. It went well and everyone appreciated it.',
            goodAnswer:
              'I noticed new support agents were answering the same billing question inconsistently, which was frustrating customers and managers alike. I drafted a one-page decision guide, tested it with two senior agents, and rolled it into onboarding. Billing escalations dropped the following month, and it reinforced for me that small documentation fixes can create outsized operational stability.',
            breakdown: {
              Stakes: 'The context shows why this issue was worth fixing.',
              Action: 'The initiative is concrete instead of just claimed.',
              Outcome: 'The result proves the change worked.',
              Reflection: 'The final lesson adds substance instead of filler.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is short but still deep?',
            options: [
              'I took initiative and it worked out well.',
              'I noticed repeated billing errors, created a one-page guide for agents, reduced escalations, and learned that small workflow tools can stabilize operations quickly.',
              'I like being proactive in general.',
              'My team values initiative, and I agree with that.',
            ],
            correctIndex: 1,
            explanation: 'It packs in claim, context, action, outcome, and reflection without wasting words.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment.',
            segments: [
              { text: 'I redesigned the customer FAQ for our top cancellation reasons.', correctLabel: 'Claim' },
              { text: 'Support was answering the same questions inconsistently after policy changes.', correctLabel: 'Context' },
              { text: 'I grouped the issues into five scenarios and rewrote the guidance.', correctLabel: 'Action' },
              { text: 'Repeat contacts on those cases fell by 17%.', correctLabel: 'Outcome' },
              { text: 'It reminded me that clarity often scales better than extra effort.', correctLabel: 'Reflection' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best word.',
            sentenceWithBlank: 'An answer with many details but no lesson often lacks [___].',
            options: ['reflection', 'context', 'grammar', 'energy'],
            correctIndex: 0,
            explanation: 'Reflection is often the subtle missing layer in otherwise detailed answers.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the layers that make this answer feel substantial: "I found a handoff gap, created a new checklist, cut missed details, and now I always design for clear ownership first."',
            items: ['Claim', 'Context', 'Action', 'Outcome', 'Reflection'],
            correctIndices: [0, 2, 3, 4],
            explanation: 'It includes a claim, action, outcome, and reflection. The context is implied but not explicit.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the subtle weakness in this answer? "I led the rollout, created the plan, ran the meetings, and tracked every issue."',
            options: [
              'It has too much reflection',
              'It lacks depth because there is no context or outcome',
              'It is too specific',
              'It answers the wrong question in every case',
            ],
            correctIndex: 1,
            explanation: 'It lists actions but gives no stakes and no result, so it still feels thin.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Apply it to yourself. Build a concise 5-layer answer.',
            coachingTip: 'The answer should feel complete, not long. Give one useful sentence per layer and make the outcome real.',
            fields: [
              {
                label: 'Claim',
                placeholder: 'What did you lead, fix, improve, or own?',
                helper: 'Open with the main point.',
                minWords: 5,
              },
              {
                label: 'Context',
                placeholder: 'Why did this matter or what problem made it important?',
                helper: 'Add stakes without rambling.',
                minWords: 8,
              },
              {
                label: 'Action',
                placeholder: 'What did you specifically do?',
                helper: 'Name the work, choices, or intervention.',
                minWords: 10,
              },
              {
                label: 'Outcome',
                placeholder: 'What changed because of your work?',
                helper: 'Use evidence if you have it.',
                minWords: 8,
                shouldIncludeNumber: true,
              },
              {
                label: 'Reflection',
                placeholder: 'What did you learn or what principle would you carry forward?',
                helper: 'End with judgment, not filler.',
                minWords: 8,
              },
            ],
          },
        ],
      },
    ],
  },
]

export function getBundleForRootCause(rootCause: string): PracticeBundle {
  return (
    PRACTICE_BUNDLES.find((b) => b.rootCause === rootCause) ||
    PRACTICE_BUNDLES[0]
  )
}

export const CRITERION_TO_ROOT_CAUSE: Record<string, string> = {
  'Answer Structure and Conciseness': 'poor_structure',
  'Specific Examples and Evidence': 'lack_of_specificity',
  'Pace and Conversation Flow': 'weak_communication',
  'Questions Asked About Role/Company': 'missing_knowledge',
  'Alignment of Career Goals with Position': 'missing_knowledge',
  'Handling Uncertain/Difficult Questions': 'off_topic',
  'Technical Depth': 'lack_of_specificity',
  'Problem-Solving': 'poor_structure',
  'Experience Storytelling (STAR)': 'poor_structure',
  'Role Competencies': 'missing_knowledge',
  'Critical Thinking': 'off_topic',
  'Teamwork': 'lack_of_specificity',
  'Communication Style': 'weak_communication',
  'Values Alignment': 'missing_knowledge',
  'Adaptability': 'off_topic',
  'Feedback/Growth Mindset': 'too_short',
  'Conflict Resolution': 'off_topic',
}

export function getRootCauseForCriterion(criterion: string, explicitRootCause?: string): string {
  if (explicitRootCause) return explicitRootCause
  return CRITERION_TO_ROOT_CAUSE[criterion] || 'poor_structure'
}
