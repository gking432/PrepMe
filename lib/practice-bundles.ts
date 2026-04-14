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

export interface SentenceBuilderExercise {
  type: 'sentence_builder'
  instruction: string
  slotLabels: string[]
  options: string[]
  correctOrder: string[]
  explanation: string
}

export interface ApplyToYourselfExercise {
  type: 'apply_to_yourself'
  instruction: string
  coachingTip: string
  evaluationType?: string
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
  | SentenceBuilderExercise
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
      annotatedStrongAnswer?: Array<{
        label: string
        text: string
        detail?: string
      }>
      pairedAnnotatedAnswer?: Array<{
        label: string
        statement: string
        groundingDetail: string
        note?: string
      }>
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
        title: 'Make the answer easy to follow',
        difficulty: 'easy',
        teach: {
          title: 'Lead clearly, then use STAR in the middle',
          explanation:
            'Good interview answers need two things at once: they need to be easy to follow out loud, and they need enough structure underneath to sound credible. Lead with the point, use a tight STAR-style middle to explain what happened, then land on the result.',
          example: {
            question: 'Tell me about a project you are proud of.',
            badAnswer:
              'There are a few I could talk about. One was this onboarding work I did, and there were a lot of moving pieces around approvals and handoffs. I worked with different teams on it and changed some parts of the process, and overall it ended up being better for everyone involved.',
            goodAnswer:
              'A project I am proud of was rebuilding our onboarding workflow because it fixed a bottleneck the team had been dealing with for months. The old process had duplicate approvals and too many handoffs, and I was responsible for shortening the setup timeline without making more work for HR or IT. I mapped the blockers, removed two extra sign-offs, and created one shared request form. That cut onboarding time from about nine business days to three. It also meant new hires could start contributing in their first week instead of waiting around for access.',
            breakdown: {
              Lead: 'Open with the answer so the interviewer knows your point right away.',
              Support: 'Use STAR in the middle: Situation for context, Task for what you owned, Action for what you did, and Result for what changed.',
              Land: 'Close on the result so the answer feels finished and believable.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Lead',
                text: 'A project I am proud of was rebuilding our onboarding workflow because it fixed a bottleneck the team had been dealing with for months.',
                detail: 'This answers the question immediately and tells the interviewer where the story is going.',
              },
              {
                label: 'Situation',
                text: 'The old process had duplicate approvals and too many handoffs,',
                detail: 'This gives just enough context to understand the problem.',
              },
              {
                label: 'Task',
                text: 'and I was responsible for shortening the setup timeline without making more work for HR or IT.',
                detail: 'This makes your responsibility clear instead of leaving ownership vague.',
              },
              {
                label: 'Action',
                text: 'I mapped the blockers, removed two extra sign-offs, and created one shared request form.',
                detail: 'This is the execution. It should sound like real moves, not generic effort.',
              },
              {
                label: 'Result',
                text: 'That cut onboarding time from about nine business days to three.',
                detail: 'This proves the change worked.',
              },
              {
                label: 'Land',
                text: 'It also meant new hires could start contributing in their first week instead of waiting around for access.',
                detail: 'This closes the answer with why the result mattered.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which opening makes the answer easiest to follow?',
            options: [
              'There are a few things I could mention, but one project was kind of interesting.',
              'A project I am proud of was rebuilding our onboarding workflow because it solved a concrete team problem.',
              'So this was a pretty complex situation with a lot of pieces, and I can walk through all of them.',
              'I have worked on a lot of projects, and they all taught me different things.',
            ],
            correctIndex: 1,
            explanation: 'The strongest opening leads with the point right away instead of circling around it.',
          },
          {
            type: 'multiple_choice',
            question: 'Which sentence is the clearest Lead for a proud-project answer?',
            options: [
              'One thing that comes to mind is this project that was pretty interesting to work on.',
              'I have had a lot of projects over the years, but one that stands out is probably this onboarding work.',
              'A project I am proud of was redesigning our onboarding workflow because it fixed a major bottleneck.',
              'There are a few ways I could answer that because a lot of projects were meaningful to me.',
            ],
            correctIndex: 2,
            explanation: 'A strong Lead answers the question immediately and names the project directly.',
          },
          {
            type: 'multiple_choice',
            question: 'Select the Situation.',
            options: [
              'I needed to shorten the setup timeline without creating more work for HR or IT',
              'The old onboarding flow had duplicate approvals and too many handoffs',
              'I removed two extra sign-offs and created one shared request form',
              'Setup time dropped from nine business days to three',
            ],
            correctIndex: 1,
            explanation: 'Situation is the context or problem the answer starts from.',
          },
          {
            type: 'multiple_choice',
            question: 'Select the Task.',
            options: [
              'New hires started contributing in their first week instead of waiting for access',
              'I mapped the blockers and built one shared request form',
              'I was responsible for shortening the setup timeline without adding more work for HR or IT',
              'The old onboarding flow had duplicate approvals and too many handoffs',
            ],
            correctIndex: 2,
            explanation: 'Task is the responsibility, goal, or problem you personally had to solve.',
          },
          {
            type: 'multiple_choice',
            question: 'Select the Action.',
            options: [
              'I removed two extra sign-offs and created one shared request form',
              'I was responsible for improving the process',
              'The process had too many handoffs',
              'Onboarding time dropped to three days',
            ],
            correctIndex: 0,
            explanation: 'Action is what you actually did, not just what needed to happen.',
          },
          {
            type: 'multiple_choice',
            question: 'Select the Result.',
            options: [
              'I owned shortening the setup timeline',
              'The process had duplicate approvals and too many handoffs',
              'I mapped the blockers across HR and IT',
              'Onboarding time dropped from nine business days to three',
            ],
            correctIndex: 3,
            explanation: 'Result is the outcome that proves the work changed something.',
          },
          {
            type: 'multiple_choice',
            question: 'What should the middle of a strong answer do?',
            options: [
              'List every background detail you remember so nothing gets left out',
              'Use STAR: explain the Situation, your Task, the Action you took, and the Result',
              'Stay broad so you can reuse the answer for different questions',
              'Focus mostly on how proud or excited you felt',
            ],
            correctIndex: 1,
            explanation: 'The middle of the answer needs real structure underneath it, and STAR is the clearest way to do that.',
          },
          {
            type: 'multiple_choice',
            question: 'Which version of the middle is strongest?',
            options: [
              'It was a complicated project with a lot of people involved, and we all worked hard on it.',
              'The process had duplicate approvals, I owned shortening the setup timeline, and I removed two extra sign-offs and built one shared request form.',
              'There were a lot of moving pieces, so I stayed flexible and tried to help where I could.',
              'It was definitely a challenge, but we learned a lot and things improved over time.',
            ],
            correctIndex: 1,
            explanation: 'That version gives context, ownership, and action instead of vague commentary.',
          },
          {
            type: 'multiple_choice',
            question: 'Which ending lands the answer best?',
            options: [
              'Overall it went well and I was proud of how it turned out.',
              'People were really happy with the changes.',
              'That cut onboarding time from nine business days to three and got new hires contributing in their first week.',
              'It taught me a lot about communication and teamwork.',
            ],
            correctIndex: 2,
            explanation: 'A strong ending closes with a concrete result and why it mattered.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest problem with this answer? "There were a lot of moving parts, I worked with different teams, and it ended up being better in the end."',
            options: [
              'It has no numbers anywhere',
              'It sounds too formal',
              'It stays vague about ownership, action, and result',
              'It is too short to understand',
            ],
            correctIndex: 2,
            explanation: 'The listener still does not know what you owned, what you did, or what changed.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer best combines clear spoken flow with STAR underneath?',
            options: [
              'A project I am proud of was fixing our onboarding bottleneck. The process had duplicate approvals, I owned shortening the timeline, I removed two sign-offs and created one shared form, and setup time dropped from nine days to three.',
              'One project that maybe stands out was onboarding, and there were a lot of things happening, but overall it ended up much better after we worked on it.',
              'I have done a lot of work over the years, so it is hard to choose just one example.',
              'The project was complex, cross-functional, and definitely a strong learning experience for me.',
            ],
            correctIndex: 0,
            explanation: 'This one opens clearly, walks through the STAR middle, and closes on a real outcome.',
          },
          {
            type: 'word_bank',
            instruction: 'Complete the structure rule.',
            sentenceWithBlank: 'Lead with the point, use STAR in the middle, then [___].',
            options: ['land on the outcome', 'restart the story', 'add every side detail', 'repeat the setup'],
            correctIndex: 0,
            explanation: 'A strong answer feels complete because it ends on what happened or why it mattered.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the moves that make the middle of the answer stronger.',
            items: [
              'Give just enough context to orient the interviewer',
              'State what you were responsible for',
              'Jump around between details as you remember them',
              'Name the concrete action you took',
            ],
            correctIndices: [0, 1, 3],
            explanation: 'The middle works when it still has a STAR backbone instead of turning into a ramble.',
          },
          {
            type: 'multiple_choice',
            question: 'If you only changed one thing to make a messy answer better, what should you do first?',
            options: [
              'Add more detail so the interviewer sees how much work it was',
              'Open with a direct Lead sentence that answers the question immediately',
              'Use bigger words so the answer sounds more polished',
              'Save the real result for the very end without mentioning the project up front',
            ],
            correctIndex: 1,
            explanation: 'The biggest immediate improvement is making the answer easy to follow from the first sentence.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer is easiest to follow out loud?',
            options: [
              'I can talk about a customer issue we had, and there were a few layers to it, but eventually we solved it and I learned a lot from the situation.',
              'One example was a customer escalation I owned. The account was at risk because response times had slipped, so I reset the communication plan, coordinated fixes across support and product, and the client renewed for another year.',
              'There were a lot of things happening at once with that customer, and I worked with different people to keep things moving.',
              'It was definitely one of the more complicated situations I have been part of, but it turned out well in the end.',
            ],
            correctIndex: 1,
            explanation: 'The strongest answer leads clearly, walks through the work, and lands on a concrete result.',
          },
          {
            type: 'multiple_choice',
            question: 'Select the Action.',
            options: [
              'The release timeline was slipping because design changes kept arriving late',
              'I had to get the launch back on track before the client review',
              'I created a daily checkpoint, cut non-critical scope, and reassigned the final QA pass',
              'We shipped on time and avoided pushing the client demo',
            ],
            correctIndex: 2,
            explanation: 'Action is the actual execution step, not the context, responsibility, or result.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer has the strongest Land?',
            options: [
              'That project really taught me a lot about communication.',
              'Overall, it was a strong experience and I was glad I worked on it.',
              'The fix reduced billing errors by 28%, and it also gave the support team a cleaner process to work with every week.',
              'People seemed to feel much better about the workflow after that.',
            ],
            correctIndex: 2,
            explanation: 'A strong Land closes on what changed and why it mattered, not just how it felt.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Build your answer as STAR.',
            coachingTip: 'Do not write a long paragraph. Write one clean line for the Situation, one for the Task, one for the Action, and one for the Result.',
            fields: [
              {
                label: 'Situation',
                placeholder: 'What was happening? Give only the context the interviewer needs.',
                helper: 'Keep this short. Just orient the listener.',
                minWords: 5,
              },
              {
                label: 'Task',
                placeholder: 'What did you own or need to solve?',
                helper: 'Make your responsibility explicit.',
                minWords: 5,
              },
              {
                label: 'Action',
                placeholder: 'What did you actually do?',
                helper: 'Use real execution steps, not general effort words.',
                minWords: 8,
              },
              {
                label: 'Result',
                placeholder: 'What changed because of your work?',
                helper: 'Use a concrete result if you can.',
                minWords: 8,
                shouldIncludeNumber: true,
              },
            ],
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
    displayName: 'Specific Examples',
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
    displayName: 'Pace & Flow',
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
    rootCause: 'questions_about_company',
    displayName: 'Company Questions',
    description: 'Weak company prep and weak end-of-interview questions make you sound underprepared.',
    lessons: [
      {
        title: 'Show You Did Real Homework',
        difficulty: 'easy',
        teach: {
          title: 'Use two real specifics, then connect them to the role',
          explanation:
            'Good company answers are short and concrete. Mention one or two real things you noticed, then say why they matter to you and this role.',
          example: {
            question: 'What do you know about our company?',
            badAnswer:
              'I know you are growing pretty quickly and seem to have a strong reputation. The role looked interesting, and I like the kind of work you are doing.',
            goodAnswer:
              'From what I saw, a couple things stood out to me. First, you have been expanding the product line over the last year. Second, a lot of your messaging focuses on customer experience, not just features. That stood out because my background has mostly been in roles where I had to connect what the product does to how customers actually experience it.',
            breakdown: {
              Ask: 'Show real preparation, not a full company history.',
              Miss: 'The weak version has no concrete detail and no real fit.',
              WhyItWorks: 'The strong version uses specific observations and ties them back to relevant experience.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer sounds the most prepared without sounding rehearsed?',
            options: [
              'I noticed customer experience comes up across both your product messaging and user reviews. That interested me because my best work has been in roles where customer experience affected retention and growth.',
              'You seem like a great company with strong values, and that really speaks to me.',
              'I do not know a ton yet, but that is part of why I wanted to interview.',
              'I know you are in this industry and have been around for a while, which is always a good sign.',
            ],
            correctIndex: 0,
            explanation: 'The strongest answer uses a real observation and links it to the candidate’s background.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each segment of a stronger company answer.',
            segments: [
              { text: 'I noticed your team has been expanding into mid-market accounts.', correctLabel: 'Specific company observation' },
              { text: 'That caught my attention because I have worked in growth roles where messaging had to shift for a new buyer type.', correctLabel: 'Connection to my background' },
              { text: 'That makes this role feel especially relevant to where I am strongest.', correctLabel: 'Why this role fits' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best phrase to complete the answer.',
            sentenceWithBlank: 'One thing that stood out to me was [___], because it connects directly to the kind of work I have done before.',
            options: [
              'your recent expansion into a new customer segment',
              'that your company seems nice',
              'that I need a new opportunity',
              'that the office looked cool online',
            ],
            correctIndex: 0,
            explanation: 'Strong answers use something observable and relevant, not generic praise or personal need.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the parts that make someone sound genuinely prepared.',
            items: [
              'A specific company detail',
              'A broad compliment with no evidence',
              'A link between the company and your experience',
              'A vague statement like "it just seemed interesting"',
            ],
            correctIndices: [0, 2],
            explanation: 'Prepared candidates sound specific and relevant. Generic praise and filler weaken credibility.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Write a better version of your answer to "What do you know about us?" using two real details and one connection to your background.',
            coachingTip: 'Do not summarize the whole company. Pick two specifics you can actually explain, then connect them to your experience or interest in the role.',
            fields: [
              {
                label: 'Two things you noticed about the company',
                placeholder: 'Example: recent launch, customer focus, business model, team setup, market move',
                helper: 'Use real observations, not compliments.',
                minWords: 12,
              },
              {
                label: 'Why those details matter to you',
                placeholder: 'Explain why those specifics connect to your experience, strengths, or goals.',
                helper: 'Make the connection clear and practical.',
                minWords: 12,
              },
            ],
          },
        ],
      },
      {
        title: 'Answer Why This Company With Real Fit',
        difficulty: 'medium',
        teach: {
          title: 'Move from interest to evidence',
          explanation:
            'A strong "Why this company?" answer names something real about the company, explains why it matters to you, and shows why this role fits your direction. Interest alone is not enough.',
          example: {
            question: 'Why do you want to work here?',
            badAnswer:
              'It seems like a good company, and the role looks like a strong next step for me. I think I would learn a lot, and the team seems great.',
            goodAnswer:
              'A big reason is that this role seems to sit right at the intersection of execution and cross-functional work. From what I read, your team works closely across departments, and that matches how I have done my best work. I am not just looking for the same title somewhere else. I am looking for a role where that kind of work is actually central to the job.',
            breakdown: {
              Risk: 'The weak version could apply to almost any company.',
              Focus: 'The strong version explains why this company and role make sense together.',
              Fit: 'It ties the company setup to how the candidate actually works best.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What makes a "Why this company?" answer stronger?',
            options: [
              'Explaining why the company and the role fit your actual direction',
              'Saying you have always wanted to work somewhere successful',
              'Talking mostly about compensation and flexibility',
              'Keeping it vague so you do not sound too scripted',
            ],
            correctIndex: 0,
            explanation: 'The strongest answers show informed motivation and real role fit, not generic enthusiasm.',
          },
          {
            type: 'label_sort',
            instruction: 'Label the parts of this stronger answer.',
            segments: [
              { text: 'I noticed this role works closely with both operations and customer-facing teams.', correctLabel: 'Role-specific observation' },
              { text: 'That matters to me because my strongest work has usually involved translating between teams, not working in a silo.', correctLabel: 'Why it matters to me' },
              { text: 'That is why this feels more specific than just another opening with the same title.', correctLabel: 'Why this company and role' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Complete the sentence with the strongest fit-based phrase.',
            sentenceWithBlank: 'What makes this role especially compelling to me is [___], not just the title itself.',
            options: [
              'how the work seems to sit between teams and drive real coordination',
              'that I have been applying to a lot of companies lately',
              'that the brand seems well known',
              'that it would probably help my resume',
            ],
            correctIndex: 0,
            explanation: 'Good answers focus on the actual work and why it matches the candidate.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the parts that improve a "Why this company?" answer.',
            items: [
              'A reason tied to how the company operates',
              'A connection to your own strengths or goals',
              'A generic statement that the company seems exciting',
              'A claim that you can do any job as long as the team is nice',
            ],
            correctIndices: [0, 1],
            explanation: 'Specific fit beats broad enthusiasm.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Rewrite your answer to "Why this company?" so it sounds chosen, not generic.',
            coachingTip: 'Use this formula: what you noticed, why it matters, why it fits you now. Avoid praise that could apply anywhere.',
            fields: [
              {
                label: 'What feels specific about this company or role',
                placeholder: 'Write one thing that makes this role different from similar jobs elsewhere.',
                helper: 'Focus on the actual work, team, market, or company direction.',
                minWords: 12,
              },
              {
                label: 'Why that specifically fits you',
                placeholder: 'Explain how it matches your background, strengths, or next step.',
                helper: 'Make it about fit, not just desire.',
                minWords: 12,
              },
            ],
          },
        ],
      },
      {
        title: 'Ask Questions That Signal Judgment',
        difficulty: 'hard',
        teach: {
          title: 'Good candidate questions show seriousness, not just curiosity',
          explanation:
            'The best end-of-interview questions help you understand expectations, team realities, and what success looks like. Weak questions are usually too generic, too easy to answer, or clearly copied from a list.',
          example: {
            question: 'What questions do you have for me?',
            badAnswer:
              'Yeah, I guess just what do you like most about working here? And what are the growth opportunities?',
            goodAnswer:
              'I would love to understand what success looks like in the first six months for this role. And if someone does really well here, what tends to separate them from people who are just meeting expectations?',
            breakdown: {
              Miss: 'The weak version asks broad questions that rarely reveal much.',
              WhyItWorks: 'The strong version gets at expectations, performance, and standards.',
              Signal: 'It shows the candidate is thinking seriously about doing the job well.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which end-of-interview question signals the strongest judgment in an HR screen?',
            options: [
              'What does strong performance look like in this role after the first few months?',
              'Do people usually have fun on the team?',
              'What is your favorite part about the company?',
              'How fast do promotions happen here?',
            ],
            correctIndex: 0,
            explanation: 'This question is concrete, role-relevant, and useful. It signals maturity and seriousness.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each question based on what it is really trying to learn.',
            segments: [
              { text: 'What tends to be most challenging for new hires in this role?', correctLabel: 'Role reality' },
              { text: 'How would you describe someone who is really effective on this team?', correctLabel: 'Success profile' },
              { text: 'What do you like best about working here?', correctLabel: 'Generic culture question' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best phrase to complete a stronger candidate question.',
            sentenceWithBlank: 'Before we wrap up, one thing I would love to understand is [___] in this role.',
            options: [
              'what strong performance looks like early on',
              'whether people here are nice',
              'if promotions happen quickly',
              'what snacks are in the office',
            ],
            correctIndex: 0,
            explanation: 'Strong questions focus on expectations, work, and success.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the questions that would likely leave a stronger impression in an HR screen.',
            items: [
              'What are the most important things you would want this person to own well in the first few months?',
              'How would this role interact with other teams day to day?',
              'So, what is the company culture like?',
              'Do you personally enjoy working here?',
            ],
            correctIndices: [0, 1],
            explanation: 'The strongest questions help the candidate understand the work and show real judgment.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Write two better questions you could ask at the end of an interview for this role.',
            coachingTip: 'Aim for questions about expectations, team dynamics, performance, or role priorities. Avoid questions that are too generic or easy to answer from the website.',
            fields: [
              {
                label: 'Question 1',
                placeholder: 'Write a question that helps you understand success or expectations.',
                helper: 'Make it specific to the role, not just the company.',
                minWords: 12,
              },
              {
                label: 'Question 2',
                placeholder: 'Write a question that helps you understand team reality or priorities.',
                helper: 'Ask something that would help you perform better if hired.',
                minWords: 12,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'handling_uncertainty',
    displayName: 'Handling Uncertainty',
    description: 'Your answers need to sound calmer and more grounded when the path is unclear.',
    lessons: [
      {
        title: 'Stay Calm and Name Your First Step',
        difficulty: 'easy',
        teach: {
          title: 'You do not need a perfect answer right away',
          explanation:
            'Good answers about uncertainty are simple. Briefly name the unclear situation, say what you did first to get grounded, and show how you moved forward.',
          example: {
            question: 'Tell me about a time you had to work through something unclear or uncertain.',
            badAnswer:
              'Yeah, that happens a lot. Usually I just stay flexible and figure it out as I go. I am pretty good under pressure, so I worked through it and made sure it got done.',
            goodAnswer:
              'One example was a project with a hard deadline but no clear process yet. I did not try to guess my way through it. My first step was to talk to the people involved, figure out what was actually fixed versus still open, and map the next few decisions from there. That helped me move the work forward without creating more confusion.',
            breakdown: {
              Ask: 'Can you stay composed when the path is not obvious?',
              Miss: 'The weak version stays abstract and never shows a real move.',
              WhyItWorks: 'The strong version names the uncertainty, then shows a calm first step.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What makes an uncertainty answer sound more credible?',
            options: [
              'It shows the first concrete step you took to reduce the unknowns.',
              'It says you are naturally good under pressure.',
              'It avoids admitting anything was unclear.',
              'It focuses on staying positive more than what you actually did.',
            ],
            correctIndex: 0,
            explanation: 'Interviewers trust grounded action more than self-description.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each part of this stronger answer.',
            segments: [
              { text: 'The project had a deadline, but the process and ownership were still fuzzy.', correctLabel: 'Unclear situation' },
              { text: 'My first step was to clarify what had already been decided and what still needed input.', correctLabel: 'First grounding step' },
              { text: 'That gave us a cleaner path forward and kept the team from making conflicting assumptions.', correctLabel: 'Why it helped' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best phrase to complete the sentence.',
            sentenceWithBlank: 'When the situation was unclear, the first thing I did was [___] before trying to solve everything at once.',
            options: [
              'clarify what was known and what was still undecided',
              'act quickly so I looked confident',
              'wait for someone else to define the answer',
              'talk broadly about how I handle ambiguity',
            ],
            correctIndex: 0,
            explanation: 'Strong answers show how you reduced uncertainty, not how you described it.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the parts that improve credibility under uncertainty.',
            items: [
              'Admitting the situation was not fully clear',
              'Naming a practical first step',
              'Saying you just stayed calm and figured it out',
              'Avoiding specifics so the answer sounds smoother',
            ],
            correctIndices: [0, 1],
            explanation: 'Calm honesty plus a real action sounds stronger than vague confidence language.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Rewrite your flagged answer so it clearly shows what was uncertain and what you did first.',
            coachingTip: 'Do not jump straight to the ending. Start by naming what was unclear, then give the first step you took to get grounded.',
            fields: [
              {
                label: 'What was actually unclear?',
                placeholder: 'Describe what you did not know yet: priorities, ownership, timeline, information, process, or decision path.',
                helper: 'Keep it concrete. What specifically was uncertain?',
                minWords: 12,
              },
              {
                label: 'What was your first step?',
                placeholder: 'Describe the first thing you did to reduce uncertainty.',
                helper: 'Choose a real action, not a personality trait.',
                minWords: 12,
              },
            ],
          },
        ],
      },
      {
        title: 'Show Judgment, Not Just Activity',
        difficulty: 'medium',
        teach: {
          title: 'Explain how you decided what mattered first',
          explanation:
            'A better uncertainty answer does more than list actions. It shows judgment. The interviewer wants to hear how you decided where to focus when you did not have full information.',
          example: {
            question: 'Tell me about a time you had to make progress without having all the information.',
            badAnswer:
              'I usually gather as much information as I can and keep pushing until things become clearer. In this case I talked to a lot of people, looked at the details, and did what made the most sense at the time.',
            goodAnswer:
              'I had a situation where we needed to move forward, but we did not have every answer yet. Instead of trying to solve everything at once, I focused on the few things that would change the decision most, got clarity on those first, and then made a call. That kept the work moving without pretending we knew more than we did.',
            breakdown: {
              Risk: 'The weak version sounds busy, but not thoughtful.',
              Judgment: 'The strong version shows how you decided what mattered most.',
              WhyItWorks: 'It turns uncertainty into a clear decision process.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer element best shows judgment under uncertainty?',
            options: [
              'Explaining how you decided which unknowns mattered most',
              'Listing every step you took in order',
              'Saying you kept working hard until it got resolved',
              'Talking about how uncertainty is part of every job',
            ],
            correctIndex: 0,
            explanation: 'Judgment comes through when you show how you prioritized, not when you sound busy.',
          },
          {
            type: 'label_sort',
            instruction: 'Label the parts of this stronger answer.',
            segments: [
              { text: 'We did not have complete information, and the team could have gone in a few directions.', correctLabel: 'Context' },
              { text: 'I narrowed it down to the two questions that would affect the decision most.', correctLabel: 'Prioritization' },
              { text: 'Once I had that clarity, I made a call and moved the work forward.', correctLabel: 'Decision' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best phrase to complete the sentence.',
            sentenceWithBlank: 'Because we did not know everything yet, I focused first on [___] so we could make a reasonable decision.',
            options: [
              'the few unknowns that would actually change the outcome',
              'collecting every possible data point',
              'sounding confident in front of the team',
              'avoiding a decision until the picture was perfect',
            ],
            correctIndex: 0,
            explanation: 'Strong candidates show prioritization and decision quality, not endless information gathering.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the statements that make an uncertainty answer sound more thoughtful.',
            items: [
              'I focused on the unknowns that mattered most to the decision.',
              'I did not have every answer, so I started by narrowing the problem.',
              'I just worked really hard and stayed flexible.',
              'I tried to gather as much information as possible from everyone.',
            ],
            correctIndices: [0, 1],
            explanation: 'The best statements show prioritization and decision-making, not just effort.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Improve your answer by making your judgment process explicit.',
            coachingTip: 'Do not only describe motion. Describe how you decided what to focus on, what you ignored for the moment, and why.',
            fields: [
              {
                label: 'What mattered most first?',
                placeholder: 'Write the one or two unknowns you chose to focus on first.',
                helper: 'Pick the factors that most affected the decision or next step.',
                minWords: 12,
              },
              {
                label: 'Why did you focus there?',
                placeholder: 'Explain why those unknowns mattered more than the rest.',
                helper: 'This is where your judgment becomes visible.',
                minWords: 12,
              },
            ],
          },
        ],
      },
      {
        title: 'Finish With a Real Outcome and Lesson',
        difficulty: 'hard',
        teach: {
          title: 'Close the loop without sounding defensive or overly polished',
          explanation:
            'The strongest answers do not stop at "I handled it." They end with what happened, what decision got made, or what you learned about handling uncertainty better the next time.',
          example: {
            question: 'Tell me about a time you had to make a decision without perfect information.',
            badAnswer:
              'It was definitely challenging, but I stayed calm and trusted my instincts. In the end it worked out, and I think it taught me that ambiguity is just part of business.',
            goodAnswer:
              'I did not have perfect information, but I got enough clarity to make a reasonable decision and explain the tradeoff behind it. We moved forward, avoided getting stuck, and the outcome was solid. The bigger lesson for me was that in uncertain situations, people do not expect you to know everything. They expect you to reduce risk, make a sound call, and communicate it clearly.',
            breakdown: {
              Miss: 'The weak version has no real outcome and no grounded lesson.',
              WhyItWorks: 'The strong version ends with a decision, result, and practical takeaway.',
              Tone: 'It sounds calm and credible without overselling.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What is the strongest way to end an answer about uncertainty?',
            options: [
              'State the outcome, the decision you made, and the lesson you took from it.',
              'Say that everything worked out in the end.',
              'Talk about how ambiguity is common in business.',
              'Repeat that you stayed calm under pressure.',
            ],
            correctIndex: 0,
            explanation: 'A strong ending proves the situation led to a real result and shows what you learned from it.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each part of this stronger ending.',
            segments: [
              { text: 'We made the decision once we had enough clarity to move responsibly.', correctLabel: 'Decision' },
              { text: 'That kept the project from stalling and gave the team a clear direction.', correctLabel: 'Outcome' },
              { text: 'It reinforced for me that under uncertainty, the goal is not certainty. It is sound judgment and clear communication.', correctLabel: 'Lesson' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the strongest phrase to complete the sentence.',
            sentenceWithBlank: 'What I learned from that experience was [___], especially when the answer is not obvious right away.',
            options: [
              'to make the best grounded call you can and explain the reasoning clearly',
              'to trust my instincts no matter what',
              'that uncertainty is always stressful',
              'to avoid decisions until everything is confirmed',
            ],
            correctIndex: 0,
            explanation: 'The best lesson is practical, credible, and tied to judgment.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the parts that make the ending stronger.',
            items: [
              'A specific result of your approach',
              'A lesson that sounds practical and earned',
              'A vague line like "it all worked out"',
              'A generic statement that ambiguity exists in every business',
            ],
            correctIndices: [0, 1],
            explanation: 'A strong close proves impact and shows maturity.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Finish your flagged answer with a stronger ending.',
            coachingTip: 'Do not end on effort alone. Land on the call you made, what happened, and what it taught you about handling uncertainty well.',
            fields: [
              {
                label: 'What happened because of your approach?',
                placeholder: 'Write the outcome, decision, or practical result.',
                helper: 'Even a modest outcome is better than a vague ending.',
                minWords: 12,
              },
              {
                label: 'What did you learn about handling uncertainty?',
                placeholder: 'Write a lesson that sounds earned, specific, and useful.',
                helper: 'Avoid generic lines about staying confident.',
                minWords: 12,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    rootCause: 'career_alignment',
    displayName: 'Career Alignment',
    description: 'Your answers need to explain more clearly why this role makes sense for you now.',
    lessons: [
      {
        title: 'Explain Why This Role Makes Sense Now',
        difficulty: 'easy',
        teach: {
          title: 'Give a clear next-step reason',
          explanation:
            'A strong answer does not need a big story. It should quickly explain what you have been doing, what you want more of next, and why this role fits that direction now.',
          example: {
            question: 'Why are you interested in this role?',
            badAnswer:
              'I am really open right now and this looked like a great opportunity. I think I could do well in a role like this, and I am excited to keep growing.',
            goodAnswer:
              'What makes this role interesting to me is that it feels like a natural next step from the work I have already been doing. I have been in roles where I had to balance execution, communication, and follow-through, and I want to keep building in that direction in a role where that is more central to the job.',
            breakdown: {
              Ask: 'Do you have a real reason this role fits now?',
              Miss: 'The weak version sounds open-ended and generic.',
              WhyItWorks: 'The strong version connects past work to a clear next step.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer sounds most intentional?',
            options: [
              'This role makes sense because it builds on work I have already done and moves me further in the direction I want to keep growing.',
              'I am exploring a lot of options right now, and this one stood out.',
              'It seems like a great opportunity and I am excited about anything that could be a good fit.',
              'I think I could probably do a lot of different jobs at this point.',
            ],
            correctIndex: 0,
            explanation: 'The best answer sounds chosen. It explains fit and direction, not general openness.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each part of this stronger answer.',
            segments: [
              { text: 'In my recent work, I have spent a lot of time coordinating across people and driving execution.', correctLabel: 'Relevant background' },
              { text: 'What I want next is a role where that kind of work is more central.', correctLabel: 'Direction' },
              { text: 'That is why this position feels like a logical next step for me.', correctLabel: 'Why this role now' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the best phrase to complete the answer.',
            sentenceWithBlank: 'I am interested in this role because it feels like a [___] from the work I have already been doing.',
            options: [
              'natural next step',
              'random new challenge',
              'safe option for now',
              'chance to try something totally unrelated',
            ],
            correctIndex: 0,
            explanation: 'Career alignment sounds strongest when the role feels connected, not random.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the parts that improve career alignment.',
            items: [
              'A clear link to your recent experience',
              'A believable reason this role fits now',
              'A vague statement that you are open to anything',
              'A generic line about wanting to grow',
            ],
            correctIndices: [0, 1],
            explanation: 'Strong alignment answers connect your background to a real next step.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Write a tighter answer to "Why are you interested in this role?"',
            coachingTip: 'Keep it simple: what you have been doing, what you want more of, and why this role matches that now.',
            fields: [
              {
                label: 'What have you been doing that connects to this role?',
                placeholder: 'Describe the kind of work, responsibilities, or strengths you have already been using.',
                helper: 'Use real work themes, not broad traits.',
                minWords: 12,
              },
              {
                label: 'Why does this role make sense as your next step?',
                placeholder: 'Explain why this is a logical move from where you are now.',
                helper: 'Show direction, not just interest.',
                minWords: 12,
              },
            ],
          },
        ],
      },
      {
        title: 'Connect Your Background to the Actual Work',
        difficulty: 'medium',
        teach: {
          title: 'Do not just say you are interested. Show the fit.',
          explanation:
            'A lot of weak answers talk about wanting the role without proving why the candidate fits it. A stronger answer points to experience that lines up with what the job actually requires.',
          example: {
            question: 'Why do you think this position is a good fit for you?',
            badAnswer:
              'I think my background could transfer well, and I am someone who learns quickly. I also think this would be a good place for me to continue developing professionally.',
            goodAnswer:
              'I think it fits because the role asks for someone who can manage details, communicate clearly, and keep work moving across people. That has already been a big part of how I have worked. So it does not feel like a stretch. It feels like applying strengths I already use in a role where they matter even more.',
            breakdown: {
              Fit: 'The strong version names the work, not just the title.',
              Miss: 'The weak version leans on potential instead of evidence.',
              WhyItWorks: 'It shows how past experience matches the job.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'What makes a fit answer more believable?',
            options: [
              'Showing how your past work matches the core demands of the role',
              'Saying you are a fast learner and can adapt anywhere',
              'Talking mostly about how much you want the opportunity',
              'Keeping the answer broad so it can work in many interviews',
            ],
            correctIndex: 0,
            explanation: 'Believable fit comes from matching your experience to the actual work.',
          },
          {
            type: 'label_sort',
            instruction: 'Label the parts of this stronger fit answer.',
            segments: [
              { text: 'This role seems to require someone who can coordinate work, communicate clearly, and stay organized.', correctLabel: 'What the job requires' },
              { text: 'Those are all things I have had to do consistently in my recent roles.', correctLabel: 'Relevant evidence' },
              { text: 'That is why it feels like a strong fit rather than a leap.', correctLabel: 'Fit conclusion' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the strongest phrase to complete the sentence.',
            sentenceWithBlank: 'What makes this role feel like a fit is that it relies on [___], which I have already had to use in my recent work.',
            options: [
              'skills and responsibilities that overlap with my background',
              'a company name I recognize',
              'the fact that I am ready for something new',
              'general business experience of any kind',
            ],
            correctIndex: 0,
            explanation: 'Strong fit language points to overlap between your background and the role.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the statements that make a fit answer stronger.',
            items: [
              'This role depends on skills I have already had to use consistently.',
              'The work itself lines up with how I have been operating.',
              'I am confident I could learn anything if given a chance.',
              'I just feel like this would be a good experience.',
            ],
            correctIndices: [0, 1],
            explanation: 'The best answers show evidence-based fit, not just optimism.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Make your fit answer sound more grounded and specific.',
            coachingTip: 'Name the actual work in the job, then connect it to work you have already done well.',
            fields: [
              {
                label: 'What does this role seem to require?',
                placeholder: 'List the main work themes or responsibilities you see in the role.',
                helper: 'Focus on the actual job, not the company.',
                minWords: 12,
              },
              {
                label: 'Where have you already done similar work?',
                placeholder: 'Explain which parts of your background line up with those demands.',
                helper: 'This is the proof behind your fit.',
                minWords: 12,
              },
            ],
          },
        ],
      },
      {
        title: 'Make Your Motivation Sound Chosen, Not Reactive',
        difficulty: 'hard',
        teach: {
          title: 'Frame the move as direction, not escape',
          explanation:
            'Sometimes candidates sound interested in a role mainly because they want out of their current situation. A stronger answer shifts the focus toward what they are moving toward and why that next move is credible.',
          example: {
            question: 'Why are you looking to make a move right now?',
            badAnswer:
              'Honestly, I have been ready for a change for a while. I feel like I have outgrown my current situation, and I want something better with more opportunity.',
            goodAnswer:
              'I am looking now because I have a clearer sense of the kind of work I want to keep building toward. I have learned a lot from my current situation, but I want my next role to make fuller use of the parts of the job I am strongest in. That is what made this opportunity stand out to me.',
            breakdown: {
              Risk: 'The weak version sounds like escape.',
              Timing: 'The strong version explains why now makes sense.',
              Credibility: 'It focuses on direction and fit, not frustration.',
            },
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer sounds most credible when explaining why now is the right time to move?',
            options: [
              'I have gotten clearer on the kind of work I want to keep building toward, and this role lines up with that direction.',
              'I just know it is time for a change and want something better.',
              'I have been unhappy for a while, so I am looking around.',
              'I feel like any new opportunity would probably be a step up.',
            ],
            correctIndex: 0,
            explanation: 'A strong answer frames the move around direction and fit, not dissatisfaction.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each part of this stronger answer.',
            segments: [
              { text: 'My recent experience helped clarify the kind of work I want to keep doing.', correctLabel: 'Why now' },
              { text: 'I want a role that makes fuller use of those strengths.', correctLabel: 'What I am moving toward' },
              { text: 'That is why this opportunity feels like a sensible next step.', correctLabel: 'Why this move is credible' },
            ],
          },
          {
            type: 'word_bank',
            instruction: 'Choose the strongest phrase to complete the sentence.',
            sentenceWithBlank: 'The reason I am exploring this move now is that I have a clearer sense of [___] in my next role.',
            options: [
              'the kind of work I want to keep building toward',
              'how badly I need a change',
              'why I want to leave my current team',
              'why almost anything different would help',
            ],
            correctIndex: 0,
            explanation: 'Strong timing answers point toward a direction, not away from a problem.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the statements that improve a "why now" answer.',
            items: [
              'I have gotten clearer on where I add the most value.',
              'This move is about getting closer to the kind of work I want to keep doing.',
              'I am mostly trying to get out of my current situation.',
              'I just need a fresh start somewhere else.',
            ],
            correctIndices: [0, 1],
            explanation: 'The strongest answers sound intentional and forward-looking.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Rewrite your "why now" answer so it sounds directional, not reactive.',
            coachingTip: 'Talk about what you are moving toward, what you have learned about your fit, and why this role makes sense now.',
            fields: [
              {
                label: 'Why is now the right time for this move?',
                placeholder: 'Explain what has become clearer for you about your next step.',
                helper: 'Focus on direction, not frustration.',
                minWords: 12,
              },
              {
                label: 'What are you moving toward in this role?',
                placeholder: 'Describe the kind of work or contribution you want more of next.',
                helper: 'Make the next step sound chosen and believable.',
                minWords: 12,
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
  'Questions Asked About Role/Company': 'questions_about_company',
  'Questions Asked About the Role/Company': 'questions_about_company',
  'Alignment of Career Goals with Position': 'career_alignment',
  'Handling Uncertain/Difficult Questions': 'handling_uncertainty',
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
  const mappedRootCause = CRITERION_TO_ROOT_CAUSE[criterion]
  if (mappedRootCause) return mappedRootCause
  if (explicitRootCause) return explicitRootCause
  return 'poor_structure'
}

export type AnswerStructureTemplate =
  | 'star'
  | 'present_past_now'
  | 'noticed_fit_now'
  | 'answer_reason_example'

export function detectAnswerStructureTemplate(question?: string): AnswerStructureTemplate {
  const normalized = (question || '').toLowerCase()

  if (
    normalized.includes('tell me about yourself') ||
    normalized.includes('walk me through your background') ||
    normalized.includes('briefly introduce yourself') ||
    normalized.includes('walk me through your resume')
  ) {
    return 'present_past_now'
  }

  if (
    normalized.includes('why this role') ||
    normalized.includes('why are you interested') ||
    normalized.includes('why do you want') ||
    normalized.includes('why this company') ||
    normalized.includes('what interests you about') ||
    normalized.includes('why are you exploring')
  ) {
    return 'noticed_fit_now'
  }

  if (
    normalized.includes('tell me about a time') ||
    normalized.includes('project you are proud') ||
    normalized.includes('project you\'re proud') ||
    normalized.includes('challenge') ||
    normalized.includes('accomplishment') ||
    normalized.includes('example of') ||
    normalized.includes('improved') ||
    normalized.includes('solved') ||
    normalized.includes('handled')
  ) {
    return 'star'
  }

  return 'answer_reason_example'
}

function buildAnswerStructureLesson(template: AnswerStructureTemplate): SubLesson {
  switch (template) {
    case 'present_past_now':
      return {
        title: 'Tell your story with real qualifiers',
        difficulty: 'easy',
        teach: {
          title: 'Use Present, Past, Now with a qualifier in each section',
          explanation: 'Structure helps, but structure alone is not enough. A candidate can use the right order and still sound vague. Present should say what you do now and what kind of work that actually is. Past should say what built that foundation and what pattern connects it. Now should explain why this role makes sense now and why the move is logical, not random.',
          example: {
            question: 'Can you tell me about yourself?',
            badAnswer: 'Sure. I started out doing a lot of different marketing work, and over the years I have touched a bunch of industries and learned a lot. I have worked with agencies and internal teams and done everything from content to operations, so there is a lot I could get into.',
            goodAnswer: 'Right now I work at the intersection of marketing execution and operations, with a lot of my recent work focused on keeping cross-functional projects moving. Before that, I built my foundation across agency and in-house roles where I had to turn messy requirements into clean execution. That is why this role makes sense now. It lets me keep doing that kind of work in a position where it is more central to the job.',
            breakdown: {
              Present: 'Say what you do now, then add the qualifier that shows what kind of work it really is.',
              Past: 'Say what built that foundation, then add the qualifier that explains the through-line.',
              Now: 'Say why this move makes sense now, then add the qualifier that makes the timing and fit believable.',
            },
            annotatedStrongAnswer: [
              { label: 'Present', text: 'Right now I work at the intersection of marketing execution and operations,', detail: 'This is the section statement. It names the current lane.' },
              { label: 'Present Qualifier', text: 'with a lot of my recent work focused on keeping cross-functional projects moving.', detail: 'This is the qualifier. It explains what kind of work that actually is.' },
              { label: 'Past', text: 'Before that, I built my foundation across agency and in-house roles', detail: 'This is the section statement. It names the foundation.' },
              { label: 'Past Qualifier', text: 'where I had to turn messy requirements into clean execution.', detail: 'This is the qualifier. It explains the repeated pattern that matters now.' },
              { label: 'Now', text: 'That is why this role makes sense now.', detail: 'This is the section statement. It marks the move.' },
              { label: 'Now Qualifier', text: 'It lets me keep doing that kind of work in a position where it is more central to the job.', detail: 'This is the qualifier. It makes the timing and fit sound logical instead of generic.' },
            ],
            pairedAnnotatedAnswer: [
              {
                label: 'Present',
                statement: 'Right now I work at the intersection of marketing execution and operations',
                groundingDetail: 'with a lot of my recent work focused on keeping cross-functional projects moving',
                note: 'The section statement names the lane. The qualifier tells the interviewer what that lane actually looks like in practice.',
              },
              {
                label: 'Past',
                statement: 'Before that, I built my foundation across agency and in-house roles',
                groundingDetail: 'where I had to turn messy requirements into clean execution',
                note: 'The section statement gives the background. The qualifier explains the through-line that makes the background relevant.',
              },
              {
                label: 'Now',
                statement: 'That is why this role makes sense now',
                groundingDetail: 'It lets me keep doing that kind of work in a position where it is more central to the job',
                note: 'The section statement signals the move. The qualifier is what makes the timing and fit feel logical and chosen.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is the strongest?',
            options: [
              'I have worked in a lot of different roles and learned a lot along the way. I think those experiences have prepared me for this opportunity.',
              'Right now I work in operations. Before that, I worked in support roles. That is why this role makes sense for me now.',
              'Right now I work in operations, mostly in situations where keeping work organized and moving across people or priorities is important. Before that, I built my foundation in support roles where I had to stay organized, follow through, and make sure things did not get missed. That is why this role makes sense now. It lets me keep doing that kind of work in a role where it is more central.',
              'Right now I do a lot of different work. Before that, I gained experience in a few other jobs. That is why this opportunity interests me.',
            ],
            correctIndex: 2,
            explanation: 'The strongest answer has the right shape and a useful qualifier in each section. The middle tier has the shape but still sounds generic.',
          },
          {
            type: 'multiple_choice',
            question: 'Which section is structurally correct but still too weak because it lacks a useful qualifier?',
            options: [
              'Right now I work in client support, mostly handling work that requires careful follow-through.',
              'Before that, I built my foundation in roles where I had to keep requests organized and moving.',
              'That is why this role makes sense now. It builds on the kind of work I have already been doing.',
              'Right now I work in project coordination.',
            ],
            correctIndex: 3,
            explanation: 'That section has the right bucket, but it is still only a label. The interviewer still does not know what kind of project coordination it is.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves this Present line: "Right now I work in project coordination."',
            options: [
              'Right now I work in project coordination and have learned a lot from it.',
              'Right now I work in project coordination, mostly helping keep timelines, handoffs, and follow-through on track.',
              'Right now I work in project coordination and enjoy being busy.',
              'Right now I work in project coordination and am ready for more responsibility.',
            ],
            correctIndex: 1,
            explanation: 'A good qualifier defines the lane. It does not just add emotion or ambition.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves this Past line: "Before that, I worked in a few different roles."',
            options: [
              'Before that, I worked in a few different roles and gained valuable experience.',
              'Before that, I worked in a few different roles where I learned how to stay organized and work well with others.',
              'Before that, I built my foundation in roles where I had to bring structure to shifting priorities and keep work moving.',
              'Before that, I worked in different environments that helped me grow professionally.',
            ],
            correctIndex: 2,
            explanation: 'The Past section needs a through-line, not a resume summary.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves this Now line: "That is why this role makes sense for me now."',
            options: [
              'That is why this role makes sense for me now, and I think it would be a great next step.',
              'That is why this role makes sense for me now. It feels like a good opportunity to continue growing.',
              'That is why this role makes sense for me now. It lets me keep doing this kind of coordination work in a role where it is more central.',
              'That is why this role makes sense for me now, and I am excited to learn more.',
            ],
            correctIndex: 2,
            explanation: 'The Now section should explain why the move is logical now, not just that you want growth.',
          },
          {
            type: 'multiple_choice',
            question: 'Which section is weakest in this answer? "Right now I work in administrative support, mostly helping keep scheduling, communication, and follow-through organized. Before that, I worked in a few different roles. That is why this role makes sense now. It builds on the kind of work I have already been doing."',
            options: ['Present', 'Past', 'Now', 'None of them'],
            correctIndex: 1,
            explanation: 'The Present and Now sections are at least qualified. The Past section is still just a summary with no through-line.',
          },
          {
            type: 'sentence_builder',
            instruction: 'Build the strongest answer using one Present line, one Past line, and one Now line.',
            slotLabels: [
              'Present',
              'Past',
              'Now',
            ],
            correctOrder: [
              'Right now I work in operations, mostly supporting work that depends on coordination, follow-through, and keeping moving parts aligned.',
              'Before that, I built my foundation in roles where I had to keep work organized, respond to changing needs, and make sure things stayed on track.',
              'That is why this role makes sense now. It lets me keep doing that kind of work in a role with more direct ownership.',
            ],
            options: [
              'Right now I work in operations.',
              'Right now I work in operations, mostly supporting work that depends on coordination, follow-through, and keeping moving parts aligned.',
              'Right now I have experience in operations and related work.',
              'Before that, I worked in a few different roles.',
              'Before that, I built my foundation in roles where I had to keep work organized, respond to changing needs, and make sure things stayed on track.',
              'Before that, I learned a lot from different environments.',
              'That is why this role makes sense now.',
              'That is why this role makes sense now. It lets me keep doing that kind of work in a role with more direct ownership.',
              'That is why I think this would be a good next step.',
            ],
            explanation: 'The strongest build uses the right section and the qualifier that makes it believable. The weaker pieces sound generic even when the structure is technically right.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each section of the stronger answer by the job it is doing.',
            segments: [
              { text: 'Right now I work at the intersection of marketing execution and operations', correctLabel: 'Present' },
              { text: 'with a lot of my recent work focused on keeping cross-functional projects moving', correctLabel: 'Present Qualifier' },
              { text: 'Before that, I built my foundation across agency and in-house roles', correctLabel: 'Past' },
              { text: 'where I had to turn messy requirements into clean execution', correctLabel: 'Past Qualifier' },
              { text: 'That is why this role makes sense now', correctLabel: 'Now' },
              { text: 'It lets me keep doing that kind of work in a position where it is more central to the job', correctLabel: 'Now Qualifier' },
            ],
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your answer using Present, Past, Now. Do not stop at the section label. Add a qualifier to each one.',
            coachingTip: 'A stronger answer does not just hit the right order. Each section needs a qualifier that makes it believable. Present should define your current lane, Past should explain the pattern behind your background, and Now should show why this move makes sense at this moment.',
            evaluationType: 'present_past_now',
            fields: [
              { label: 'Present', placeholder: 'What do you do now?', helper: 'Name your current lane clearly.', minWords: 5, avoidWords: ['something', 'stuff', 'various things', 'a lot of things'] },
              { label: 'Present Qualifier', placeholder: 'What kind of work is it really? What defines it?', helper: 'Add the qualifier that makes the Present section believable.', minWords: 8, avoidWords: ['learned a lot', 'busy', 'many things'] },
              { label: 'Past', placeholder: 'What earlier background built this?', helper: 'Name the foundation, not your whole resume.', minWords: 5, avoidWords: ['a few different roles', 'many jobs', 'different industries'] },
              { label: 'Past Qualifier', placeholder: 'What repeated skill or pattern came from that experience?', helper: 'Show the through-line that still matters now.', minWords: 8, avoidWords: ['valuable experience', 'learned a lot', 'grew professionally'] },
              { label: 'Now', placeholder: 'Why does this role make sense now?', helper: 'State the move clearly.', minWords: 5, avoidWords: ['good opportunity', 'next step', 'sounds interesting'] },
              { label: 'Now Qualifier', placeholder: 'Why is this a logical next move, not just a job you want?', helper: 'Make the timing and fit feel specific and earned.', minWords: 8, avoidWords: ['full-time role', 'something new', 'continue growing'] },
            ],
          },
        ],
      }
    case 'noticed_fit_now':
      return {
        title: 'Make motivation sound chosen',
        difficulty: 'easy',
        teach: {
          title: 'Use What I noticed, Why it fits, Why now',
          explanation: 'For motivation answers, do not start with generic enthusiasm. Name something real about the role or company, explain why it fits your background, and close on why this move makes sense now.',
          example: {
            question: 'Why are you interested in this role?',
            badAnswer: 'It seems like a great company and a strong opportunity. I think I would learn a lot and it feels like a good next step for me.',
            goodAnswer: 'What stood out to me is that this role sits between execution and cross-functional coordination, which is where I have done some of my best work. That fits because a lot of my recent experience has been about turning messy requirements into clear execution across teams. And the reason it makes sense now is that I am looking for a role where that kind of work is central, not just an occasional part of the job.',
            breakdown: {
              WhatINoticed: 'Start with a real observation about the role or company.',
              WhyItFits: 'Show the overlap between that observation and your background.',
              WhyNow: 'Explain why this is the right next step now.',
            },
            annotatedStrongAnswer: [
              { label: 'What I noticed', text: 'What stood out to me is that this role sits between execution and cross-functional coordination,', detail: 'Start with a specific observation instead of generic praise.' },
              { label: 'Why it fits', text: 'which is where I have done some of my best work. That fits because a lot of my recent experience has been about turning messy requirements into clear execution across teams.', detail: 'Connect the role to what you already do well.' },
              { label: 'Why now', text: 'And the reason it makes sense now is that I am looking for a role where that kind of work is central, not just an occasional part of the job.', detail: 'Close on timing and direction.' },
            ],
          },
        },
        exercises: [
          { type: 'multiple_choice', question: 'What should come first in a strong motivation answer?', options: ['A compliment about the brand', 'Something specific you noticed about the role or company', 'Your salary expectations', 'A long summary of your resume'], correctIndex: 1, explanation: 'Start with a real observation, not empty enthusiasm.' },
          { type: 'multiple_choice', question: 'Which opening is strongest?', options: ['You seem like a great company.', 'What stood out to me is how cross-functional this role is.', 'I am open to a lot of opportunities right now.', 'I have always wanted to work somewhere successful.'], correctIndex: 1, explanation: 'The strongest opening shows you noticed something real.' },
          { type: 'multiple_choice', question: 'What should the middle "Why it fits" section do?', options: ['Explain why the role lines up with your background', 'Repeat why the company is impressive', 'Talk about compensation', 'List every skill you have ever used'], correctIndex: 0, explanation: 'Fit is about overlap between the role and your experience.' },
          { type: 'multiple_choice', question: 'What should the "Why now" section do?', options: ['Show why the timing makes sense', 'List your grievances with your current job', 'Repeat your resume summary', 'Add more company research'], correctIndex: 0, explanation: 'Why now explains why this move is logical now.' },
          { type: 'multiple_choice', question: 'Which answer sounds most chosen rather than generic?', options: ['This seems like a great place to grow.', 'I am excited about any strong opportunity.', 'This role stands out because it focuses on work I already know I want to keep building toward.', 'I think I could do a lot of jobs like this one.'], correctIndex: 2, explanation: 'Chosen answers sound specific and directional.' },
          { type: 'multiple_choice', question: 'Select the "What I noticed" sentence.', options: ['A lot of my recent work has involved coordinating across teams.', 'That is why this feels like the right next step now.', 'What stood out to me is how this role connects execution with stakeholder coordination.', 'I want a role where that kind of work is central.'], correctIndex: 2, explanation: 'What I noticed starts with a real observation.' },
          { type: 'multiple_choice', question: 'Select the "Why it fits" sentence.', options: ['What stood out to me is the role’s cross-functional scope.', 'A lot of my recent work has been about coordinating execution across teams.', 'That is why now feels like the right time to move.', 'The company seems to be growing quickly.'], correctIndex: 1, explanation: 'Why it fits connects the observation to your background.' },
          { type: 'multiple_choice', question: 'Select the "Why now" sentence.', options: ['This role seems to touch a lot of teams.', 'I have done this kind of work before.', 'That is why this move makes sense now for me.', 'The company has a strong reputation.'], correctIndex: 2, explanation: 'Why now explains timing and direction.' },
          { type: 'word_bank', instruction: 'Complete the pattern.', sentenceWithBlank: 'What I noticed -> Why it fits -> [___]', options: ['Why now', 'Salary range', 'Resume recap', 'Reflection'], correctIndex: 0, explanation: 'The last step explains why the move makes sense now.' },
          { type: 'tap_select', instruction: 'Tap the moves that strengthen a motivation answer.', items: ['Use a specific observation', 'Tie it to your background', 'Stay vague so it works everywhere', 'Explain why now makes sense'], correctIndices: [0, 1, 3], explanation: 'Strong motivation answers sound informed and intentional.' },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your answer as What I noticed, Why it fits, Why now.',
            coachingTip: 'Start with one real observation, connect it to your experience, then explain why this move makes sense now.',
            evaluationType: 'noticed_fit_now',
            fields: [
              { label: 'What I noticed', placeholder: 'What specifically stood out to you about the role or company?', helper: 'Use one real observation, not generic praise.', minWords: 6 },
              { label: 'Why it fits', placeholder: 'Why does that fit your background or strengths?', helper: 'Connect the role to your actual experience.', minWords: 8 },
              { label: 'Why now', placeholder: 'Why does this role make sense for you now?', helper: 'Explain the timing and direction.', minWords: 8 },
            ],
          },
        ],
      }
    case 'answer_reason_example':
      return {
        title: 'Make judgment answers easy to follow',
        difficulty: 'easy',
        teach: {
          title: 'Use Answer, Reason, Example',
          explanation: 'For simpler judgment or opinion questions, do not overbuild the answer. State your answer directly, give the reason behind it, then add one concrete example to make it credible.',
          example: {
            question: 'How do you prioritize when everything feels urgent?',
            badAnswer: 'I try to stay organized and communicate a lot. It depends on the situation, but I usually work hard and keep moving things along.',
            goodAnswer: 'I prioritize by identifying what has the biggest business impact and the shortest real deadline. The reason is that urgency and importance are not always the same thing, so I try to separate noise from actual risk. For example, in my last role I had two requests come in at once, and I pushed the one tied to a client launch first because missing it would have created downstream issues for three teams.',
            breakdown: {
              Answer: 'State your answer directly instead of circling around it.',
              Reason: 'Explain the thinking behind your answer.',
              Example: 'Use one concrete example so the answer feels real.',
            },
            annotatedStrongAnswer: [
              { label: 'Answer', text: 'I prioritize by identifying what has the biggest business impact and the shortest real deadline.', detail: 'Open with the answer, not with caveats.' },
              { label: 'Reason', text: 'The reason is that urgency and importance are not always the same thing, so I try to separate noise from actual risk.', detail: 'Explain your thinking clearly.' },
              { label: 'Example', text: 'For example, in my last role I had two requests come in at once, and I pushed the one tied to a client launch first because missing it would have created downstream issues for three teams.', detail: 'A short concrete example makes the answer believable.' },
            ],
          },
        },
        exercises: [
          { type: 'multiple_choice', question: 'What should come first in a judgment answer?', options: ['A disclaimer', 'The answer itself', 'A long story', 'A reflection'], correctIndex: 1, explanation: 'Judgment answers are strongest when you answer first.' },
          { type: 'multiple_choice', question: 'What should the middle "Reason" section do?', options: ['List every detail you remember', 'Explain the logic behind your answer', 'Switch to a different topic', 'Repeat the answer word for word'], correctIndex: 1, explanation: 'Reason explains the thinking behind the answer.' },
          { type: 'multiple_choice', question: 'Why add an Example?', options: ['To make the answer longer', 'To prove the answer works in real life', 'To avoid answering directly', 'To sound more formal'], correctIndex: 1, explanation: 'A short example makes the judgment answer credible.' },
          { type: 'multiple_choice', question: 'Which opening is strongest?', options: ['It depends, but I guess I usually try to stay organized.', 'I prioritize by ranking work by impact and real deadline.', 'There are a lot of ways to think about that.', 'I have seen a lot of urgent requests over the years.'], correctIndex: 1, explanation: 'Answer first.' },
          { type: 'multiple_choice', question: 'Which middle sentence is the strongest Reason?', options: ['The reason is that not everything urgent is actually high impact.', 'I try to stay flexible and positive.', 'It really depends on the circumstances.', 'There is a lot to balance in those moments.'], correctIndex: 0, explanation: 'Reason should make your logic visible.' },
          { type: 'multiple_choice', question: 'Which sentence is the best Example?', options: ['For example, I once had two deadlines and picked the one tied to a client launch first.', 'It usually works out well when I do this.', 'People generally appreciate this approach.', 'That is how I think about it most of the time.'], correctIndex: 0, explanation: 'A short real example is better than vague commentary.' },
          { type: 'multiple_choice', question: 'Select the Answer sentence.', options: ['The reason is that urgency and importance are not always the same.', 'For example, I once prioritized a client launch request first.', 'I prioritize by identifying what has the biggest impact and closest real deadline.', 'That approach has worked well for me over time.'], correctIndex: 2, explanation: 'Answer comes first and states your approach directly.' },
          { type: 'multiple_choice', question: 'Select the Reason sentence.', options: ['I prioritize by identifying the biggest impact first.', 'The reason is that urgency and importance are not always the same.', 'For example, I once had two competing deadlines.', 'That kept three teams from getting blocked.'], correctIndex: 1, explanation: 'Reason makes the logic visible.' },
          { type: 'word_bank', instruction: 'Complete the pattern.', sentenceWithBlank: 'Answer -> Reason -> [___]', options: ['Example', 'Disclaimer', 'Resume', 'Reflection'], correctIndex: 0, explanation: 'A short example completes the answer.' },
          { type: 'tap_select', instruction: 'Tap the moves that strengthen a judgment answer.', items: ['Answer first', 'Explain your reasoning', 'Hide your point until the end', 'Use one concrete example'], correctIndices: [0, 1, 3], explanation: 'Judgment answers work best when they are direct, reasoned, and grounded.' },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your answer as Answer, Reason, Example.',
            coachingTip: 'Start with the answer itself. Then explain the logic behind it. Then add one short example that proves it.',
            evaluationType: 'answer_reason_example',
            fields: [
              { label: 'Answer', placeholder: 'What is your answer to the question?', helper: 'State the answer directly.', minWords: 5 },
              { label: 'Reason', placeholder: 'Why do you approach it that way?', helper: 'Make your logic clear.', minWords: 6 },
              { label: 'Example', placeholder: 'What is one short example that proves it?', helper: 'Use one concrete example, not a long story.', minWords: 8 },
            ],
          },
        ],
      }
    case 'star':
    default:
      return {
        title: 'Build the story with STAR',
        difficulty: 'easy',
        teach: {
          title: 'Lead clearly, then use STAR in the middle',
          explanation: 'Behavioral answers should be easy to follow out loud and specific underneath. Lead with the project or challenge, walk through Situation, Task, Action, and Result, then land on why the outcome mattered.',
          example: {
            question: 'Tell me about a project you are proud of.',
            badAnswer: 'There are a few I could talk about. One was this onboarding work I did, and there were a lot of moving pieces around approvals and handoffs. I worked with different teams on it and changed some parts of the process, and overall it ended up being better for everyone involved.',
            goodAnswer: 'A project I am proud of was rebuilding our onboarding workflow because it fixed a bottleneck the team had been dealing with for months. The old process had duplicate approvals and too many handoffs, and I was responsible for shortening the setup timeline without making more work for HR or IT. I mapped the blockers, removed two extra sign-offs, and created one shared request form. That cut onboarding time from about nine business days to three. It also meant new hires could start contributing in their first week instead of waiting around for access.',
            breakdown: {
              Lead: 'Open with the answer so the interviewer knows your point right away.',
              Support: 'Use STAR in the middle: Situation for context, Task for what you owned, Action for what you did, and Result for what changed.',
              Land: 'Close on the result so the answer feels finished and believable.',
            },
            annotatedStrongAnswer: [
              { label: 'Lead', text: 'A project I am proud of was rebuilding our onboarding workflow because it fixed a bottleneck the team had been dealing with for months.', detail: 'This answers the question immediately and tells the interviewer where the story is going.' },
              { label: 'Situation', text: 'The old process had duplicate approvals and too many handoffs,', detail: 'This gives just enough context to understand the problem.' },
              { label: 'Task', text: 'and I was responsible for shortening the setup timeline without making more work for HR or IT.', detail: 'This makes your responsibility clear instead of leaving ownership vague.' },
              { label: 'Action', text: 'I mapped the blockers, removed two extra sign-offs, and created one shared request form.', detail: 'This is the execution. It should sound like real moves, not generic effort.' },
              { label: 'Result', text: 'That cut onboarding time from about nine business days to three.', detail: 'This proves the change worked.' },
              { label: 'Land', text: 'It also meant new hires could start contributing in their first week instead of waiting around for access.', detail: 'This closes the answer with why the result mattered.' },
            ],
          },
        },
        exercises: [
          { type: 'multiple_choice', question: 'Which opening makes the answer easiest to follow?', options: ['There are a few things I could mention, but one project was kind of interesting.', 'A project I am proud of was rebuilding our onboarding workflow because it solved a concrete team problem.', 'So this was a pretty complex situation with a lot of pieces, and I can walk through all of them.', 'I have worked on a lot of projects, and they all taught me different things.'], correctIndex: 1, explanation: 'The strongest opening leads with the point right away instead of circling around it.' },
          { type: 'multiple_choice', question: 'Select the Situation.', options: ['I needed to shorten the setup timeline without creating more work for HR or IT', 'The old onboarding flow had duplicate approvals and too many handoffs', 'I removed two extra sign-offs and created one shared request form', 'Setup time dropped from nine business days to three'], correctIndex: 1, explanation: 'Situation is the context or problem the answer starts from.' },
          { type: 'multiple_choice', question: 'Select the Task.', options: ['New hires started contributing in their first week instead of waiting for access', 'I mapped the blockers and built one shared request form', 'I was responsible for shortening the setup timeline without adding more work for HR or IT', 'The old onboarding flow had duplicate approvals and too many handoffs'], correctIndex: 2, explanation: 'Task is the responsibility, goal, or problem you personally had to solve.' },
          { type: 'multiple_choice', question: 'Select the Action.', options: ['I removed two extra sign-offs and created one shared request form', 'I was responsible for improving the process', 'The process had too many handoffs', 'Onboarding time dropped to three days'], correctIndex: 0, explanation: 'Action is what you actually did, not just what needed to happen.' },
          { type: 'multiple_choice', question: 'Select the Result.', options: ['I owned shortening the setup timeline', 'The process had duplicate approvals and too many handoffs', 'I mapped the blockers across HR and IT', 'Onboarding time dropped from nine business days to three'], correctIndex: 3, explanation: 'Result is the outcome that proves the work changed something.' },
          { type: 'multiple_choice', question: 'Which ending lands the answer best?', options: ['Overall it went well and I was proud of how it turned out.', 'People were really happy with the changes.', 'That cut onboarding time from nine business days to three and got new hires contributing in their first week.', 'It taught me a lot about communication and teamwork.'], correctIndex: 2, explanation: 'A strong ending closes with a concrete result and why it mattered.' },
          { type: 'multiple_choice', question: 'What is the biggest problem with this answer? "There were a lot of moving parts, I worked with different teams, and it ended up being better in the end."', options: ['It has no numbers anywhere', 'It sounds too formal', 'It stays vague about ownership, action, and result', 'It is too short to understand'], correctIndex: 2, explanation: 'The listener still does not know what you owned, what you did, or what changed.' },
          { type: 'multiple_choice', question: 'Which answer best combines clear spoken flow with STAR underneath?', options: ['A project I am proud of was fixing our onboarding bottleneck. The process had duplicate approvals, I owned shortening the timeline, I removed two sign-offs and created one shared form, and setup time dropped from nine days to three.', 'One project that maybe stands out was onboarding, and there were a lot of things happening, but overall it ended up much better after we worked on it.', 'I have done a lot of work over the years, so it is hard to choose just one example.', 'The project was complex, cross-functional, and definitely a strong learning experience for me.'], correctIndex: 0, explanation: 'This one opens clearly, walks through STAR, and closes on an outcome.' },
          { type: 'word_bank', instruction: 'Complete the structure rule.', sentenceWithBlank: 'Lead with the point, use STAR in the middle, then [___].', options: ['land on the outcome', 'restart the story', 'add every side detail', 'repeat the setup'], correctIndex: 0, explanation: 'A strong answer feels complete because it ends on what happened or why it mattered.' },
          { type: 'tap_select', instruction: 'Tap the moves that make the middle of the answer stronger.', items: ['Give just enough context to orient the interviewer', 'State what you were responsible for', 'Jump around between details as you remember them', 'Name the concrete action you took'], correctIndices: [0, 1, 3], explanation: 'The middle works when it still has a STAR backbone instead of turning into a ramble.' },
          { type: 'multiple_choice', question: 'If you only changed one thing to make a messy answer better, what should you do first?', options: ['Add more detail so the interviewer sees how much work it was', 'Open with a direct Lead sentence that answers the question immediately', 'Use bigger words so the answer sounds more polished', 'Save the real result for the very end without mentioning the project up front'], correctIndex: 1, explanation: 'The biggest immediate improvement is making the answer easy to follow from the first sentence.' },
          {
            type: 'apply_to_yourself',
            instruction: 'Build your answer as STAR.',
            coachingTip: 'Do not write a long paragraph. Write one clean line for the Situation, one for the Task, one for the Action, and one for the Result.',
            evaluationType: 'star',
            fields: [
              { label: 'Situation', placeholder: 'What was happening? Give only the context the interviewer needs.', helper: 'Keep this short. Just orient the listener.', minWords: 5 },
              { label: 'Task', placeholder: 'What did you own or need to solve?', helper: 'Make your responsibility explicit.', minWords: 5 },
              { label: 'Action', placeholder: 'What did you actually do?', helper: 'Use real execution steps, not general effort words.', minWords: 8 },
              { label: 'Result', placeholder: 'What changed because of your work?', helper: 'Use a concrete result if you can.', minWords: 8, shouldIncludeNumber: true },
            ],
          },
        ],
      }
  }
}

export function getContextualPracticeBundle(rootCause: string, question?: string): PracticeBundle {
  const baseBundle = getBundleForRootCause(rootCause)
  if (rootCause !== 'poor_structure') return baseBundle

  const template = detectAnswerStructureTemplate(question)
  const lesson = buildAnswerStructureLesson(template)

  return {
    ...baseBundle,
    lessons: [lesson],
  }
}
