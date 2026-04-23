export interface MultipleChoiceExercise {
  type: 'multiple_choice'
  title?: string
  context?: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface LabelSortExercise {
  type: 'label_sort'
  title?: string
  context?: string
  instruction: string
  segments: { text: string; correctLabel: string }[]
}

export interface WordBankExercise {
  type: 'word_bank'
  title?: string
  context?: string
  instruction: string
  sentenceWithBlank: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface TapSelectExercise {
  type: 'tap_select'
  title?: string
  context?: string
  instruction: string
  items: string[]
  correctIndices: number[]
  explanation: string
}

export interface SentenceBuilderExercise {
  type: 'sentence_builder'
  title?: string
  context?: string
  instruction: string
  slotLabels: string[]
  options: string[]
  correctOrder: string[]
  explanation: string
  displayMode?: 'slots' | 'sequence'
}

export interface ApplyToYourselfExercise {
  type: 'apply_to_yourself'
  title?: string
  context?: string
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

export interface LessonWorkshop {
  type: 'professional_story'
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
      mediumAnswer?: string
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
  workshop?: LessonWorkshop
}

export interface PracticeBundle {
  rootCause: string
  displayName: string
  description: string
  lessons: SubLesson[]
}

const LEGACY_PRACTICE_CRITERION_ALIASES: Record<string, string> = {
  'Answer Structure and Conciseness': 'Professional Story',
}

export function normalizePracticeCriterion(criterion: string): string {
  return LEGACY_PRACTICE_CRITERION_ALIASES[criterion] || criterion
}

export const PRACTICE_BUNDLES: PracticeBundle[] = [
  {
    rootCause: 'professional_story',
    displayName: 'Professional Story',
    description: 'Build a clear, focused answer for Tell me about yourself.',
    lessons: [
      buildAnswerStructureLesson('present_past_future'),
    ],
  },
  {
    rootCause: 'poor_structure',
    displayName: 'Response Patterns',
    description: "Let's sharpen how your answers are built.",
    lessons: [
      {
        title: 'STAR',
        difficulty: 'easy',
        teach: {
          title: 'Use STAR, but put the weight in the right place',
          explanation:
            'STAR helps only if each part does its job. Situation should be short. Task should make your responsibility clear. Action should carry the most weight because that is where interviewers decide whether you are credible. Result should show what changed because of your actions.',
          example: {
            question: 'Tell me about a time you had to solve a problem under pressure.',
            badAnswer:
              'There was a time when things were moving quickly and a lot was going on. I had to step up and help, and it was a good learning experience for me.',
            mediumAnswer:
              'In one role, a project was falling behind close to a deadline. My responsibility was to help get things back on track. I worked with the team to improve communication and stay organized, and in the end we were able to finish successfully.',
            goodAnswer:
              'In one role, a key deliverable was at risk a few days before deadline because ownership across teams was unclear. I was responsible for pulling the work back into a clear plan and making sure nothing critical got missed. I mapped the remaining tasks, reassigned open items to the right owners, and set short check-ins so issues surfaced early instead of the deadline. We submitted on time, and the process we used became the model for the next project.',
            breakdown: {
              Situation: 'Give only the context the interviewer needs. Do not let the setup eat the answer.',
              Task: 'Make your responsibility clear so the interviewer knows what you owned.',
              Action: 'This is the engine of the answer. Show what you noticed, decided, changed, or prioritized.',
              Result: 'Close on the outcome or consequence so the story proves value.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Situation',
                text: 'In one role, a key deliverable was at risk a few days before deadline because ownership across teams was unclear.',
                detail: 'This is enough context to understand the pressure without spending too long in setup.',
              },
              {
                label: 'Task',
                text: 'I was responsible for pulling the work back into a clear plan and making sure nothing critical got missed.',
                detail: 'This makes ownership clear and tells the interviewer what problem you had to solve.',
              },
              {
                label: 'Action',
                text: 'I mapped the remaining tasks, reassigned open items to the right owners, and set short check-ins so issues surfaced early instead of the deadline.',
                detail: 'This is the most important part. It shows concrete decisions and execution that sound owned.',
              },
              {
                label: 'Result',
                text: 'We submitted on time, and the process we used became the model for the next project.',
                detail: 'This shows consequence. It did not just work out. Something changed because of the action.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is the strongest response to: "Tell me about a time you had to solve a problem under pressure."',
            options: [
              'There was a time when things were moving quickly and a lot was going on. I had to step up and help, and it was a good learning experience for me.',
              'In one role, a project was falling behind close to a deadline. My responsibility was to help get things back on track. I worked with the team to improve communication and stay organized, and in the end we were able to finish successfully.',
              'In one role, a key deliverable was at risk a few days before deadline because ownership across teams was unclear. I was responsible for pulling the work back into a clear plan and making sure nothing critical got missed. I mapped the remaining tasks, reassigned open items to the right owners, and set short check-ins so issues surfaced early instead of at the deadline. We submitted on time, and the process we used became the model for the next project.',
            ],
            correctIndex: 2,
            explanation: 'A is weak, B is structured but weak, and C is strong because the Action is specific and the Result shows consequence.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "In one role, a client request changed late in the process. My job was to help the team respond. I communicated with everyone involved and worked hard to keep things moving. In the end, the client was happy."',
            options: ['The Situation is too short', 'The Task is too specific', 'The Action is too vague', 'The Result is too long'],
            correctIndex: 2,
            explanation: 'Communicated and worked hard do not tell the interviewer what the candidate actually did.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "At one point, our team was handling several overlapping requests during a busy period, and one project became more complicated when priorities shifted and more people got involved than expected. I was responsible for helping the team manage the situation. I created a clearer handoff process and flagged blockers earlier. The work moved forward more smoothly after that."',
            options: ['The Situation is too long', 'The Task is too vague', 'The Action is missing', 'The Result is unrealistic'],
            correctIndex: 0,
            explanation: 'The setup is not terrible, but it takes too long to get to the point. Situation and Task should not eat the clock.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves the Action section?',
            options: [
              'I stayed involved and made sure we all stayed in touch throughout the process.',
              'I tried to be proactive and support the group however I could.',
              'I created a simple tracker for open issues, assigned clear owners, and set short daily check-ins so decisions did not stall.',
              'I focused on teamwork and kept a positive attitude while we worked through it.',
            ],
            correctIndex: 2,
            explanation: 'Strong Action sounds owned. It shows decisions and steps another person could not have described generically.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves the Result section?',
            options: [
              'In the end, everyone felt good about the outcome.',
              'In the end, the work was completed on time, and the process reduced confusion on similar projects afterward.',
              'In the end, it was a valuable experience for all of us.',
              'In the end, we learned a lot from the situation.',
            ],
            correctIndex: 1,
            explanation: 'A good Result shows consequence, not just positive vibes.',
          },
          {
            type: 'multiple_choice',
            question: 'Which Action best proves ownership in this situation? Situation: A deadline was at risk because work across several people was not clearly owned. Task: You were responsible for getting the project back on track.',
            options: [
              'I stayed calm, worked hard, and communicated with the team.',
              'I checked in with everyone and did my best to support the process.',
              'I identified the unfinished work, reassigned each item to a clear owner, and created short check-ins to catch blockers before they delayed the timeline.',
            ],
            correctIndex: 2,
            explanation: 'The Action section carries the answer. This one sounds operational, specific, and clearly owned.',
          },
          {
            type: 'sentence_builder',
            instruction: 'Build the strongest answer by choosing one Situation, one Task, one Action, and one Result.',
            slotLabels: ['Situation', 'Task', 'Action', 'Result'],
            correctOrder: [
              'A deliverable was at risk because responsibilities across several people were unclear.',
              'I was responsible for bringing structure to the remaining work and making sure critical items were covered.',
              'I created a list of open items, assigned owners, and used short check-ins to surface blockers early.',
              'We met the deadline, and the clearer ownership reduced confusion in later work too.',
            ],
            options: [
              'A project became stressful near the deadline.',
              'A deliverable was at risk because responsibilities across several people were unclear.',
              'There was a lot going on and the team was under pressure.',
              'I needed to help however I could.',
              'I was responsible for bringing structure to the remaining work and making sure critical items were covered.',
              'My role was to stay involved and support the team.',
              'I communicated often and tried to keep everyone aligned.',
              'I created a list of open items, assigned owners, and used short check-ins to surface blockers early.',
              'I worked hard and stayed organized throughout the process.',
              'In the end, things worked out.',
              'We met the deadline, and the clearer ownership reduced confusion in later work too.',
              'Everyone appreciated the effort.',
            ],
            explanation: 'A strong STAR answer keeps the setup short, makes ownership clear, puts the most detail into Action, and closes on a meaningful Result.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your own STAR answer. Keep the setup short. Put the most detail into the Action.',
            coachingTip: 'Situation and Task should be brief. Action is the engine of the answer. If someone else could have said your Action, it is probably too vague. Result should show what changed because of your actions.',
            evaluationType: 'star',
            fields: [
              {
                label: 'Situation',
                placeholder: 'What was happening?',
                helper: 'Give enough context, but do not ramble.',
                minWords: 5,
                avoidWords: ['a lot was going on', 'it was busy', 'things were moving quickly'],
              },
              {
                label: 'Task',
                placeholder: 'What were you responsible for?',
                helper: 'Make ownership clear.',
                minWords: 5,
                avoidWords: ['help however i could', 'support the team', 'do my part'],
              },
              {
                label: 'Action',
                placeholder: 'What did you actually do? Be specific.',
                helper: 'This should be the most detailed part. Name decisions, steps, and ownership.',
                minWords: 12,
                avoidWords: ['worked hard', 'communicated', 'helped the team', 'stayed organized'],
              },
              {
                label: 'Result',
                placeholder: 'What changed because of your actions?',
                helper: 'Show an outcome, consequence, improvement, or proof of value.',
                minWords: 8,
                avoidWords: ['it worked out', 'it went well', 'everyone was happy', 'we learned a lot'],
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
        title: 'Strengthen Weak Proof',
        difficulty: 'easy',
        teach: {
          title: 'Make your proof believable',
          explanation:
            'The problem here is not structure. It is proof quality. A strong answer makes a claim, supports it with a real example, adds enough concrete detail to feel believable, and makes clear what the example actually shows.',
          example: {
            question: 'What makes you good under pressure?',
            badAnswer:
              'I am good under pressure and have always handled busy environments well.',
            mediumAnswer:
              'I am good under pressure. In past roles, I have had to juggle a lot of priorities and stay organized.',
            goodAnswer:
              'I am good under pressure. In my last role, I managed scheduling changes across three teams during a busy launch week. I built one tracker for open requests and flagged blockers early, which kept handoffs from slipping. That is a good example of how I stay organized when priorities change quickly.',
            breakdown: {
              Claim: 'Make the point clearly.',
              Proof: 'Use a real example, not a broad summary.',
              Specifics: 'Add enough concrete detail to make it believable.',
              WhatItShows: 'End by making clear what the example proves.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Claim',
                text: 'I am good under pressure.',
                detail: 'This is the point the interviewer still needs a reason to believe.',
              },
              {
                label: 'Example',
                text: 'In my last role, I managed scheduling changes across three teams during a busy launch week.',
                detail: 'This works because it comes from a real moment instead of a vague summary like “I have done that in different roles.”',
              },
              {
                label: 'Detail',
                text: 'I built one tracker for open requests and flagged blockers early, which kept handoffs from slipping.',
                detail: 'This is the specific fact that makes the proof believable. You can picture what the person actually did.',
              },
              {
                label: 'Impact',
                text: 'That is a good example of how I stay organized when priorities change quickly.',
                detail: 'This lands the point instead of just telling the story and stopping.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer best supports the claim: "I am good under pressure"?',
            options: [
              'I am good under pressure and have always handled busy environments well.',
              'I am good under pressure. In past roles, I have had to juggle a lot of priorities and stay organized.',
              'I am good under pressure. In my last role, I managed scheduling changes across three teams during a busy launch week. I built one tracker for open requests and flagged blockers early, which kept handoffs from slipping. That is a good example of how I stay organized when priorities change quickly.',
            ],
            correctIndex: 2,
            explanation: 'A is just a claim, B has some shape but still stays broad, and C gives real proof, detail, and a clear takeaway.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "I am very organized. For example, I have handled a lot of moving pieces in past roles."',
            options: ['The claim is too specific', 'The example is too detailed', 'The proof is too vague', 'The impact is too long'],
            correctIndex: 2,
            explanation: 'The candidate makes a claim and gestures toward proof, but nothing concrete makes the proof believable.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "I am proactive. In my last role, I noticed a reporting issue before a deadline. I flagged it early and helped correct it."',
            options: ['The claim is missing', 'The detail is too thin', 'The impact is too emotional', 'The answer is too direct'],
            correctIndex: 1,
            explanation: 'The example exists, but the detail is too thin to sound persuasive. We still do not know enough about what they actually did.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision gives stronger proof?',
            options: [
              'I have had similar responsibilities in past roles.',
              'In my last role, I managed scheduling updates across several teams during a high-volume week.',
              'I have always been someone who stays on top of things.',
              'That is something I have done in different environments.',
            ],
            correctIndex: 1,
            explanation: 'A real example is stronger than a broad summary of how you usually are.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision adds the most useful concrete detail?',
            options: [
              'I worked hard to stay on top of everything.',
              'I made sure the team stayed aligned.',
              'I built a shared tracker for open requests and updated owners as priorities changed.',
              'I stayed focused throughout the process.',
            ],
            correctIndex: 2,
            explanation: 'Strong detail names a visible action the interviewer can actually picture.',
          },
          {
            type: 'multiple_choice',
            question: 'Which ending does the best job of showing what the example proves?',
            options: [
              'That was a valuable experience.',
              'That is something I have always cared about.',
              'That is a good example of how I create structure when priorities start shifting.',
              'That situation taught me a lot.',
            ],
            correctIndex: 2,
            explanation: 'Impact should connect the proof back to the original claim, not drift into filler or self-praise.',
          },
          {
            type: 'multiple_choice',
            question: 'Which extra line would most improve this answer? "I work well across teams. In my last role, I partnered with several groups on a launch."',
            options: [
              'I have always enjoyed collaboration.',
              'The launch involved marketing, operations, and implementation, and I kept owners aligned through one shared handoff tracker.',
              'That is how I usually like to work.',
              'People appreciated the teamwork.',
            ],
            correctIndex: 1,
            explanation: 'The answer already has a claim and example. What it needs most is concrete detail that makes the proof real.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Before you answer the flagged question again, strengthen your proof.',
            coachingTip: 'Make the claim clearly. Use one real example. Add one concrete detail. End by making clear what the example shows. If the flagged question needs structure, you can still use STAR or another framework to organize the stronger proof.',
            evaluationType: 'claim_example_detail_impact',
            fields: [
              {
                label: 'Claim',
                placeholder: 'What point are you making about yourself?',
                helper: 'Make the point clearly. Do not assume the interviewer will infer it.',
                minWords: 5,
                avoidWords: ['i care a lot', 'i have always been this way', 'i am a hard worker'],
              },
              {
                label: 'Real example',
                placeholder: 'What real moment supports it?',
                helper: 'Use a real moment or clear pattern of work, not a broad summary.',
                minWords: 8,
                avoidWords: ['in past roles', 'i have done that before', 'generally'],
              },
              {
                label: 'Concrete detail',
                placeholder: 'What detail makes the example believable?',
                helper: 'Add enough concrete detail to feel true, but do not turn it into a long story.',
                minWords: 10,
                avoidWords: ['worked hard', 'stayed organized', 'helped out', 'did my best'],
              },
              {
                label: 'What it shows',
                placeholder: 'What does this example prove?',
                helper: 'Land the point. Make clear what the example shows about you.',
                minWords: 8,
                avoidWords: ['that shows i care', 'that made me proud', 'that meant a lot to me'],
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
    description: 'Your interview should sound natural, attentive, and easy to follow.',
    lessons: [
      {
        title: 'Pace and Flow',
        difficulty: 'easy',
        teach: {
          title: 'Make the conversation feel natural and easy to follow',
          explanation:
            'A strong interview does not just depend on what you say. It also depends on how the conversation feels. Good pace and flow make your answers easier to follow and make the interview feel more natural.',
          example: {
            question: 'Why are you interested in this role?',
            badAnswer:
              'Yeah definitely so I’m interested because I’ve done similar work before and I think it’s a great opportunity and I’m ready for something new and I think I could contribute quickly because I’ve worked cross-functionally and I really like fast-moving environments.',
            mediumAnswer:
              'I’m interested in the role because I’ve done similar work before and I think it’s a good opportunity and I want to keep growing and I think I’d be a strong fit because I’ve worked across teams and I like fast-moving work.',
            goodAnswer:
              'The main thing that interests me is how closely the role sits to the kind of cross-functional work I’ve been doing already. I’ve worked in fast-moving environments before, and I’m looking for a role where that kind of coordination is more central to the job.',
            breakdown: {
              Rhythm: 'A strong answer should sound calm and easy to track.',
              Transition: 'One simple transition helps the answer begin naturally.',
              Flow: 'The ideas should build clearly instead of piling up too fast.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Transition',
                text: 'The main thing that interests me is how closely the role sits to the kind of cross-functional work I’ve been doing already.',
                detail: 'This starts smoothly and gives the interviewer one clear point to follow.',
              },
              {
                label: 'Steady pace',
                text: 'I’ve worked in fast-moving environments before, and I’m looking for a role where that kind of coordination is more central to the job.',
                detail: 'The answer unfolds in clear pieces instead of rushing through every idea at once.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which response sounds more natural in an interview?',
            options: [
              'Interviewer: "What interests you about this role?" Candidate: pauses briefly, then says, "What stands out most to me is how closely the role sits to cross-functional execution."',
              'Interviewer: "What interests you about this role?" Candidate: long silence, then says, "Sorry, give me one more second... I’m still thinking... okay..."',
            ],
            correctIndex: 0,
            explanation: 'A short pause often sounds thoughtful. A long, extended silence starts to break the conversational rhythm.',
          },
          {
            type: 'tap_select',
            instruction: 'Tap the parts that make this answer feel too fast or abrupt.',
            items: [
              'No pause or transition at the start',
              'A pileup of “and” clauses',
              'One clear main point early',
              'The answer never settles on one main point',
            ],
            correctIndices: [0, 1, 3],
            explanation: 'Rushed answers get harder to follow when they stack ideas too quickly and never settle on a clear point.',
          },
          {
            type: 'multiple_choice',
            question: 'Which opening makes this answer feel most conversational?',
            options: [
              'Yeah definitely so I think there are a lot of reasons honestly...',
              'The main thing I’d say is that the role sits close to the kind of work I’ve been doing already.',
              'I guess I’d probably say maybe the opportunity itself is strong.',
              'There are a few things and I’ll just kind of jump in.',
            ],
            correctIndex: 1,
            explanation: 'A simple transition helps the answer start naturally and gives the interviewer something clear to follow.',
          },
          {
            type: 'multiple_choice',
            question: 'Which interaction has better flow?',
            options: [
              'Interviewer: "Tell me a bit about your background." Candidate: "Sure—right now I work in operations, mostly around coordination and follow-through across teams..."',
              'Interviewer: "Tell me a bit about your background." Candidate: "Yeah and actually before I answer that I just wanted to say—" Interviewer: "Go ahead." Candidate: "Right, sorry—so basically..."',
            ],
            correctIndex: 0,
            explanation: 'The stronger interaction respects turn-taking and moves into the answer smoothly.',
          },
          {
            type: 'multiple_choice',
            question: 'Which line does the best job of showing grounded rhythm without pretending we can measure exact timing from text alone?',
            options: [
              'I’d just start talking so there’s no silence.',
              'I’d pause briefly, then start with one clear point.',
              'I’d wait until I felt completely ready before saying anything.',
              'I’d answer as fast as possible so it sounds confident.',
            ],
            correctIndex: 1,
            explanation: 'The goal is recognizable interview rhythm: a natural pause, then a clear starting point. We are not coaching stopwatch precision from text alone.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Rewrite this answer so it sounds calmer and more conversational.',
            coachingTip: 'Use one simple transition, focus on one main point first, and make the answer easier to follow out loud. We are not coaching perfect vocal delivery here. We are coaching recognizable interview rhythm: cleaner starts, smoother flow, and better back-and-forth.',
            evaluationType: 'pace_and_flow',
            fields: [
              {
                label: 'Smoother opening',
                placeholder: 'Start with one simple transition and one clear point.',
                helper: 'Avoid abrupt starts like “yeah definitely so...”',
                minWords: 8,
                avoidWords: ['yeah definitely so', 'there are a lot of reasons', 'i’ll just jump in'],
              },
              {
                label: 'Clearer flow',
                placeholder: 'Rewrite the middle so the ideas build instead of piling up.',
                helper: 'Break the answer into clear pieces the interviewer can follow.',
                minWords: 12,
                avoidWords: ['and i', 'and i think', 'and also', 'kind of'],
              },
              {
                label: 'More settled ending',
                placeholder: 'End on one clear sentence that sounds easy to follow.',
                helper: 'Keep it conversational, not robotic.',
                minWords: 8,
              },
            ],
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Answer the flagged question again with better pace and flow.',
            coachingTip: 'Pause naturally, do not rush the first sentence, use one simple transition, and aim for conversation instead of speed.',
            evaluationType: 'pace_and_flow',
            fields: [
              {
                label: 'Retry answer',
                placeholder: 'Answer the flagged question again in a way that sounds easier to follow and more conversational.',
                helper: 'The goal is not to sound robotic or perfectly polished. The goal is to sound natural and easy to talk through.',
                minWords: 20,
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
    displayName: 'Preparation and Curiosity',
    description: 'Weak company prep and weak end-of-interview questions make you sound underprepared.',
    lessons: [
      {
        title: 'Show You Prepared',
        difficulty: 'easy',
        teach: {
          title: 'Show you did enough homework to sound informed',
          explanation:
            'In an HR screen, the interviewer is usually checking whether you did basic homework and whether your interest feels real. You do not need deep research. You do need to know what the company does, who it serves, and one thing that stood out to you.',
          example: {
            question: 'What do you know about our company?',
            badAnswer:
              'You seem like a great company with a strong reputation, which is one reason I was excited about the role.',
            mediumAnswer:
              'I know the company is in this space and seems to be growing, which stood out to me as a good opportunity.',
            goodAnswer:
              'From what I saw, the company works with mid-market operations teams and seems focused on helping them reduce friction in day-to-day workflows. What stood out to me is how often execution and follow-through came up in the role and company materials, because that seems closely tied to the kind of work I am most interested in.',
            breakdown: {
              Basics: 'Know what the company does, who it serves, and one thing that stood out.',
              NoGenericPraise: 'Saying the company seems great is not the same as showing preparation.',
              ConnectInterest: 'Say what stood out, then explain why it matters to you.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Know',
                text: 'From what I saw, the company works with mid-market operations teams and seems focused on helping them reduce friction in day-to-day workflows.',
                detail: 'This works because it includes something real about the company, not just a flattering label.',
              },
              {
                label: 'Connect',
                text: 'What stood out to me is how often execution and follow-through came up in the role and company materials, because that seems closely tied to the kind of work I am most interested in.',
                detail: 'Research matters more when you explain what stood out and why it matters to you.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which is the strongest response to: "What do you know about our company?"',
            options: [
              'I know you are a great company and have a strong reputation. That is one of the reasons I was excited about the role.',
              'I know the company is in this industry and seems to be growing. That stood out to me because I am interested in strong opportunities.',
              'From what I saw, the company works with mid-market operations teams and seems focused on helping them reduce friction in day-to-day workflows. What stood out to me is how often execution and follow-through came up in the role and the company materials, because that seems closely tied to the kind of work I am most interested in.',
            ],
            correctIndex: 2,
            explanation: 'A is flattering, B is somewhat prepared but still generic, and C is informed and connected.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "I do not know too much yet, but the role definitely looked interesting."',
            options: ['The answer is too detailed', 'The answer shows too much confidence', 'The answer signals low preparation', 'The answer is too company-specific'],
            correctIndex: 2,
            explanation: 'The problem is not tone. The problem is that it signals very little preparation.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "I know the company has a strong reputation and seems to be doing really well. That stood out to me because I want to be part of a strong team."',
            options: ['It is too negative', 'It is too generic and flattering', 'It includes too much research', 'It focuses too much on culture'],
            correctIndex: 1,
            explanation: 'This sounds positive, but it still does not show anything real that the candidate actually learned.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves this answer? "I know you are a strong company in the industry."',
            options: [
              'I know you are well respected and seem like a good place to work.',
              'From what I saw, the company works with operations teams and has a strong focus on reducing workflow friction.',
              'I know the company has a positive reputation online.',
              'I know this is an exciting opportunity.',
            ],
            correctIndex: 1,
            explanation: 'A stronger answer says something real about the company, not just something flattering.',
          },
          {
            type: 'multiple_choice',
            question: 'Which follow-up does the best job of explaining what stood out?',
            options: [
              'That seemed interesting to me.',
              'That felt like a good opportunity.',
              'That stood out because the role seems closely tied to work I enjoy doing most.',
              'That made me want to apply.',
            ],
            correctIndex: 2,
            explanation: 'A stronger answer does not stop at the fact. It explains why that point actually matters to you.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Before you answer again, prepare a short company knowledge response.',
            coachingTip: 'Keep it short. You only need the basics plus one real point of interest.',
            evaluationType: 'company_knowledge',
            fields: [
              {
                label: 'What does the company do?',
                placeholder: 'Write a short line explaining what the company does.',
                helper: 'Keep it basic and real. No flattery.',
                minWords: 6,
                avoidWords: ['great company', 'strong reputation', 'seems nice'],
              },
              {
                label: 'Who does it serve?',
                placeholder: 'Who is the company for or what part of the market does it serve?',
                helper: 'You only need a simple, credible answer.',
                minWords: 4,
              },
              {
                label: 'What stood out to you?',
                placeholder: 'What real thing stood out in your research?',
                helper: 'Avoid generic praise.',
                minWords: 6,
                avoidWords: ['great company', 'seemed interesting', 'exciting opportunity'],
              },
              {
                label: 'Why does that matter to you?',
                placeholder: 'Explain why that point caught your attention.',
                helper: 'Connect what you noticed to your actual interest.',
                minWords: 6,
                avoidWords: ['good opportunity', 'seems nice', 'great reputation'],
              },
            ],
          },
        ],
      },
      {
        title: 'Ask Better Questions',
        difficulty: 'easy',
        teach: {
          title: 'Ask questions that help you understand the opportunity',
          explanation:
            'Your end-of-interview questions should show that you are thoughtful, interested, and paying attention to the opportunity. Good questions help you understand the work, team, priorities, or culture in practice. Weak questions are often only about convenience or are too broad to reveal anything useful.',
          example: {
            question: 'What questions do you have for me?',
            badAnswer:
              'What are the hours?',
            mediumAnswer:
              'How would you describe the company?',
            goodAnswer:
              'What tends to make someone successful in this role in the first few months? And what has the team been focused on most recently?',
            breakdown: {
              BeReady: 'Have 1–2 questions ready before the interview starts.',
              FocusOnWork: 'Strong questions focus on the role, team, culture, or company priorities.',
              AvoidOnlySelfFocus: 'Questions about salary, PTO, or remote work can matter, but they should not be your only questions early on.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Ask',
                text: 'What tends to make someone successful in this role in the first few months?',
                detail: 'This helps you understand expectations and success in the role.',
              },
              {
                label: 'Ask',
                text: 'And what has the team been focused on most recently?',
                detail: 'This shows interest in real team priorities, not just your own convenience.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which question best shows meaningful curiosity in an HR screen?',
            options: [
              'What are the hours?',
              'How quickly can someone get promoted?',
              'What tends to make someone successful in this role in the first few months?',
              'What is the PTO policy?',
            ],
            correctIndex: 2,
            explanation: 'This question is about the work and expectations, which is a stronger early signal than a convenience question.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest problem with this as your only question? "Is the role remote?"',
            options: ['It is too detailed', 'It is too self-focused', 'It is too company-specific', 'It is too difficult to answer'],
            correctIndex: 1,
            explanation: 'That question can matter, but as your only question in an HR screen it makes your interest look too centered on convenience.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this question? "How would you describe the company?"',
            options: ['It is too thoughtful', 'It is too broad', 'It is too self-focused', 'It is too formal'],
            correctIndex: 1,
            explanation: 'It is relevant, but it is so broad that it is unlikely to reveal anything specific or useful.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves this question? "How would you describe the company?"',
            options: [
              'Do people like working here?',
              'How would you describe the culture in practice on this team?',
              'Would you say the company is successful?',
              'Is it a good environment?',
            ],
            correctIndex: 1,
            explanation: 'This turns a broad question into one that is more grounded and more likely to produce a useful answer.',
          },
          {
            type: 'multiple_choice',
            question: 'Which question best shows interest in team priorities?',
            options: [
              'What are the benefits like?',
              'What has the team been focused on most recently?',
              'When would I be eligible for a raise?',
              'Is there flexibility in the schedule?',
            ],
            correctIndex: 1,
            explanation: 'It shows interest in what the team is actually working on, which is a stronger early signal.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Before you answer again, prepare two thoughtful questions.',
            coachingTip: 'Pick questions that help you understand the work, not just the perks.',
            evaluationType: 'meaningful_questions',
            fields: [
              {
                label: 'Question 1 about the role',
                placeholder: 'Write a question about success in the role or early expectations.',
                helper: 'This should help you understand what doing the job well actually looks like.',
                minWords: 6,
                avoidWords: ['salary', 'pto', 'raise', 'vacation days'],
              },
              {
                label: 'Question 2 about the team or company',
                placeholder: 'Write a question about the team, company, or culture in practice.',
                helper: 'Ask something that gives you a better picture of the opportunity.',
                minWords: 6,
                avoidWords: ['salary', 'pto', 'raise', 'vacation days'],
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
    description: 'Sometimes the question is fine, but you do not have a strong answer immediately. The goal is to stay steady, avoid spiraling, and give the clearest grounded answer you can.',
    lessons: [
      {
        title: 'Stay Grounded When You Are Unsure',
        difficulty: 'easy',
        teach: {
          title: 'Stay steady, avoid spiraling, and give the clearest grounded answer you can',
          explanation:
            'Sometimes the question is fine, but you do not have a strong answer immediately. In that moment, the goal is not to sound perfect. The goal is to stay steady, avoid spiraling, and give the clearest grounded answer you can.',
          example: {
            question: 'When you are not sure how to answer right away',
            badAnswer:
              'I think there are probably a few ways to think about that, and it would really depend on the situation. There are a lot of factors there, so I would not want to say too much too quickly. I would probably just try to feel it out first.',
            mediumAnswer:
              'I would want to understand the situation a little better first, but my starting point would be to clarify what matters most before reacting.',
            goodAnswer:
              'My starting point would be to get clear on the situation before reacting too quickly. I would want to understand what matters most first so I could make a more grounded decision. The main thing is staying calm and taking the next useful step from something real.',
            breakdown: {
              Steadiness: 'Do not fill the space with hedge-heavy rambling. Slow down and regain control.',
              ClearPoint: 'Make one clear point early so the interviewer has something grounded to follow.',
              HonestCaution: 'Be honest about what is unclear without sounding lost or helpless.',
              FirstMove: 'Name the first useful move that would help you get grounded.',
              SettledEnding: 'End somewhere settled instead of drifting back into uncertainty.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Clear Point',
                text: 'My starting point would be to get clear on the situation before reacting too quickly.',
                detail: 'This gives one grounded point instead of a cloud of hedges.',
              },
              {
                label: 'First Useful Move',
                text: 'I would want to understand what matters most first so I could make a more grounded decision.',
                detail: 'This names an actual next move instead of sounding passive or vague.',
              },
              {
                label: 'Settled Ending',
                text: 'The main thing is staying calm and taking the next useful step from something real.',
                detail: 'This lands on a grounded principle instead of wandering back into uncertainty.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'tap_select',
            instruction: 'Tap the parts of this answer that make it sound shaky or lost.',
            items: [
              'there are probably a few ways to think about that',
              'it would really depend on the situation',
              'There are a lot of factors there',
              'I would not want to say too much too quickly',
              'I would probably just try to feel it out first',
            ],
            correctIndices: [0, 1, 2, 4],
            explanation: 'These lines add uncertainty without adding direction. The answer sounds hesitant, but never becomes useful.',
          },
          {
            type: 'multiple_choice',
            question: 'Which response sounds more grounded?',
            options: [
              'I would want to understand the situation a little better first, but my starting point would be to clarify what matters most before reacting.',
              'I think there are a lot of ways it could go, and I would probably need more time to really know what I would do.',
            ],
            correctIndex: 0,
            explanation: 'Option A is honest about uncertainty, but still gives a first move. Option B stays vague and never lands anywhere useful.',
          },
          {
            type: 'multiple_choice',
            question: 'Which opening gives the clearest starting point when you do not have a strong answer right away?',
            options: [
              'That is a really interesting question, and I think there are a lot of ways to look at it.',
              'My starting point would be to get clear on the situation before deciding how to handle it.',
              'It probably depends a lot on context, honestly.',
              'There are a lot of variables there.',
            ],
            correctIndex: 1,
            explanation: 'It gives one clear point and a grounded first move instead of stalling.',
          },
          {
            type: 'multiple_choice',
            question: 'Which line does the best job of showing grounded judgment?',
            options: [
              'I would try to stay calm and think about it.',
              'I would probably do my best and figure it out as I went.',
              'I would first get clear on what matters most before taking action.',
              'I would not want to rush into anything.',
            ],
            correctIndex: 2,
            explanation: 'It names an actual move. The other choices sound passive or vague.',
          },
          {
            type: 'multiple_choice',
            question: 'Which ending lands the answer most clearly?',
            options: [
              'So I think it would depend a lot, but that is probably how I would start thinking about it.',
              'So yeah, I would kind of see what made the most sense.',
              'The main thing is staying calm, getting clear on the situation, and taking the first useful step.',
              'That would probably be my first instinct, at least.',
            ],
            correctIndex: 2,
            explanation: 'It ends on a grounded principle instead of drifting back into uncertainty.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Rewrite this answer so it sounds calm, honest, and grounded. Keep it under 3 sentences.',
            coachingTip: 'Start with one clear point. Acknowledge uncertainty honestly. Name the first useful move. End on a grounded principle.',
            evaluationType: 'handling_uncertainty',
            fields: [
              {
                label: 'Clear point',
                placeholder: 'Start with one clear point instead of a cloud of hedges.',
                helper: 'Give the interviewer one grounded starting point to follow.',
                minWords: 6,
                avoidWords: ['it depends', 'a lot of ways', 'every situation is different'],
              },
              {
                label: 'Honest caution',
                placeholder: 'Acknowledge what is unclear without sounding lost.',
                helper: 'Be honest, but do not just stall or circle.',
                minWords: 8,
                avoidWords: ['I do not know', 'it could go a lot of ways', 'I would need way more time'],
              },
              {
                label: 'First useful move',
                placeholder: 'Name the next grounded step you would take.',
                helper: 'This is the part that shows judgment.',
                minWords: 8,
                avoidWords: ['feel it out', 'do my best', 'see what happens'],
              },
              {
                label: 'Settled ending',
                placeholder: 'End on a grounded takeaway instead of drifting back into uncertainty.',
                helper: 'Even if the answer is not perfect, the ending should feel steady.',
                minWords: 8,
                avoidWords: ['it depends a lot', 'kind of see what made sense', 'guesswork'],
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
        title: 'Career Alignment',
        difficulty: 'easy',
        teach: {
          title: 'Make the move feel logical and intentional',
          explanation:
            'When you answer “Why this role?” the interviewer is not just listening for interest. They are listening for whether the move makes sense. A strong answer should sound specific, connected to your background, and clear on why now.',
          example: {
            question: 'Why are you interested in this role?',
            badAnswer:
              'I’m interested in this role because it seems like a good opportunity, and I think it would be a strong next step for me. I’m ready for a new challenge and I think I could bring a lot to the position.',
            mediumAnswer:
              'What stood out to me is that the role seems fast-paced and cross-functional. I’ve done work like that before, and that definitely interests me.',
            goodAnswer:
              'What stands out to me is that this role sits close to the kind of coordination and follow-through work I’ve been doing already. That fits well with my background, because a lot of my recent work has involved keeping cross-functional work moving. The timing makes sense because I’m looking for a role where that work is more central and more directly owned.',
            breakdown: {
              SpecificInterest: 'Say what specifically stands out about the role.',
              Connection: 'Connect that interest to the work you have already been doing.',
              Timing: 'Explain why this move makes sense now, not just why you want change.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Specific interest',
                text: 'What stands out to me is that this role sits close to the kind of coordination and follow-through work I’ve been doing already.',
                detail: 'This points to something real about the role instead of relying on generic praise.',
              },
              {
                label: 'Connection',
                text: 'That fits well with my background, because a lot of my recent work has involved keeping cross-functional work moving.',
                detail: 'This explains why the role fits by connecting it to real background, not just broad potential.',
              },
              {
                label: 'Timing',
                text: 'The timing makes sense because I’m looking for a role where that work is more central and more directly owned.',
                detail: 'This makes the move sound intentional and logical, not just job-seeking.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer sounds more aligned?',
            options: [
              'I’m interested in this role because it seems like a great opportunity and I’m ready for a new challenge.',
              'I’m interested in this role because it sits close to the kind of coordination and follow-through work I’ve been doing already, and I’m looking for a role where that work is more central to what I do.',
            ],
            correctIndex: 1,
            explanation: 'It connects the role to the candidate’s background and explains why the move makes sense now.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest problem with this answer? “I’m interested in this role because it seems like a great next step and I think it would be a strong opportunity for growth.”',
            options: [
              'It sounds too detailed',
              'It sounds too narrow',
              'It sounds too generic',
              'It sounds too honest',
            ],
            correctIndex: 2,
            explanation: 'The answer sounds positive, but it could apply to almost any role.',
          },
          {
            type: 'multiple_choice',
            question: 'What is missing here? “What stood out to me is that the role seems fast-paced and cross-functional. I’ve done work like that before, and that definitely interests me.”',
            options: [
              'A clearer reason why now',
              'More company history',
              'A longer explanation of strengths',
              'A more formal tone',
            ],
            correctIndex: 0,
            explanation: 'The answer gestures toward fit, but it does not explain why this move makes sense now.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision creates a stronger connection to background?',
            options: [
              'I think I’d be a strong candidate for this kind of opportunity.',
              'That connects well to my background, because a lot of my recent work has involved keeping moving pieces aligned across teams.',
              'I believe I have the right skills to grow in this position.',
              'That seems like a role where I could contribute quickly.',
            ],
            correctIndex: 1,
            explanation: 'It makes the fit concrete instead of just claiming transferability.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision makes the timing sound more intentional?',
            options: [
              'I’m excited to take the next step in my career.',
              'The timing makes sense because I’m looking for a role where this kind of work is more central and more directly owned.',
              'I feel like it’s time for me to grow.',
              'I’m ready to move into something new.',
            ],
            correctIndex: 1,
            explanation: 'It explains why the move makes sense now instead of just expressing restlessness.',
          },
          {
            type: 'multiple_choice',
            question: 'Which answer sounds least like you would take anything?',
            options: [
              'I’m looking for a strong next opportunity where I can keep growing.',
              'This feels like a logical next step because it builds directly on the kind of work I’ve already been doing.',
              'I’m open to a lot of roles right now, and this one stood out.',
              'I think this would be a good challenge for me at this point.',
            ],
            correctIndex: 1,
            explanation: 'A stronger answer sounds chosen and specific, not broadly job-seeking.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Rewrite the answer so the move sounds more specific, connected, and intentional.',
            coachingTip: 'Say what specifically stands out about the role, connect it to your background, and explain why the timing makes sense now. This is a place where answer structure can help. A simple shape like Observation / Fit / Timing can organize the answer, but the substance still needs to feel specific and believable.',
            evaluationType: 'career_alignment',
            fields: [
              {
                label: 'What specifically stands out about the role?',
                placeholder: 'Point to something real about the role that interests you.',
                helper: 'Avoid generic praise or broad language that could apply anywhere.',
                minWords: 10,
                avoidWords: ['great opportunity', 'strong next step', 'new challenge'],
              },
              {
                label: 'How does that connect to your background?',
                placeholder: 'Explain how your recent work or strengths line up with that part of the role.',
                helper: 'Make the connection concrete instead of just claiming your skills transfer.',
                minWords: 12,
                avoidWords: ['my skills would transfer', 'strong candidate', 'learn quickly'],
              },
              {
                label: 'Why does this move make sense now?',
                placeholder: 'Explain why the timing feels intentional and logical.',
                helper: 'Make this sound like a coherent next step, not broad job-seeking.',
                minWords: 12,
                avoidWords: ['ready for something new', 'next challenge', 'time for me to grow'],
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
  'Professional Story': 'professional_story',
  'Answer Structure and Conciseness': 'professional_story',
  'Specific Examples and Evidence': 'lack_of_specificity',
  'Preparation / Curiosity': 'questions_about_company',
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
  const normalizedCriterion = normalizePracticeCriterion(criterion)
  const mappedRootCause = CRITERION_TO_ROOT_CAUSE[normalizedCriterion]
  if (mappedRootCause) return mappedRootCause
  if (explicitRootCause) return explicitRootCause
  return 'poor_structure'
}

export function getPracticeDisplayNameForCriterion(criterion: string, explicitRootCause?: string): string {
  const normalizedCriterion = normalizePracticeCriterion(criterion)
  const criterionDisplayNames: Record<string, string> = {
    'Professional Story': 'Professional Story',
    'Specific Examples and Evidence': 'Specificity / Proof',
    'Preparation / Curiosity': 'Preparation / Curiosity',
    'Handling Uncertain/Difficult Questions': 'Handling Uncertainty',
    'Alignment of Career Goals with Position': 'Career Alignment',
    'Pace and Conversation Flow': 'Pace / Natural Delivery',
  }

  if (criterionDisplayNames[normalizedCriterion]) return criterionDisplayNames[normalizedCriterion]

  const rootCause = getRootCauseForCriterion(normalizedCriterion, explicitRootCause)
  return getBundleForRootCause(rootCause).displayName
}

export type AnswerStructureTemplate =
  | 'star'
  | 'present_past_future'
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
    return 'present_past_future'
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
    case 'present_past_future':
      return {
        title: 'Professional Story',
        difficulty: 'easy',
        teach: {
          title: 'Turn your background into a clear professional story',
          explanation: 'In this lesson, you’ll learn how to turn a scattered background into a clear, focused answer you can actually use. A strong answer explains what you do now, shows the background that led you here, and makes it clear where you are headed next.',
          example: {
            question: 'Can you tell me about yourself?',
            badAnswer: 'I started my career in customer support, then moved into operations, and before that I also spent some time in account work and a few other roles where I learned a lot. Over time I picked up experience across different environments, and now I am looking for a new challenge where I can keep growing.',
            goodAnswer: 'Right now, most of my work is focused on coordinating projects across teams and making sure priorities stay aligned as work moves forward. Before that, I built my foundation in support and operations roles where I had to stay organized, adjust quickly, and keep work moving across shifting priorities. Going forward, I want to keep building in that kind of coordination work in a role where I can take on more ownership.',
            breakdown: {
              Present: 'Start with what you do now and define your professional lane clearly.',
              Past: 'Show the background that led you here without turning it into a timeline.',
              Future: 'Explain where you want to go next in a way that sounds specific and logical.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Present',
                text: 'Right now, most of my work is focused on coordinating projects across teams and making sure priorities stay aligned as work moves forward.',
                detail: 'This clearly defines the candidate’s lane right now instead of just naming a title.',
              },
              {
                label: 'Past',
                text: 'Before that, I built my foundation in support and operations roles where I had to stay organized, adjust quickly, and keep work moving across shifting priorities.',
                detail: 'This gives a through-line instead of walking job by job through a resume.',
              },
              {
                label: 'Future',
                text: 'Going forward, I want to keep building in that kind of coordination work in a role where I can take on more ownership.',
                detail: 'This gives a specific direction instead of vague growth language.',
              },
            ],
          },
        },
        exercises: [
          {
            title: 'Drill 1 — What is this question really asking?',
            type: 'multiple_choice',
            question: 'When an interviewer says, “Can you walk me through your background?”, what are they usually looking for?',
            options: [
              'A chronological summary of the most relevant roles you’ve held, usually starting with the earlier experience that built your foundation and ending with why this opportunity interests you now.',
              'A summary of what you do now, the experience that led you there, and an explanation of where you want to go next.',
              'A brief explanation of why you’re interested in this role right now, followed by an overview of the parts of your background that are most relevant to the position.',
              'A chance to understand who you are as a person first, with professional experience used mainly as supporting context for your character and work style.',
            ],
            correctIndex: 1,
            explanation: 'B is the strongest because it matches the actual job of the question: give the interviewer a clear professional story. A is tempting because it sounds organized and relevant, but it still leans too chronological. C is tempting because interest in the role matters, but that is more of a Why this role? answer than a true background summary. D reflects what some candidates do, but this question is mainly about professional identity, not personality.',
          },
          {
            title: 'Drill 2',
            type: 'sentence_builder',
            instruction: 'Build the strongest answer to: “Tell me about yourself.” Choose the best Present, best Past, and best Future.',
            slotLabels: ['Present', 'Past', 'Future'],
            options: [
              'Right now, most of my work is focused on coordinating projects across teams and making sure priorities stay aligned as work moves forward.',
              'I graduated in 2020 and started my career with a manufacturer working in customer success before moving into operations-focused roles.',
              'Going forward, I want to keep building in that kind of coordination work in a role where I can take on more ownership.',
              'Early in my career, I was hyper-focused on improving operating systems and learning how teams work together more efficiently.',
              'What interests me about this position is that it feels like a strong match for the direction I want to keep growing in.',
              'Right now, I work in operations and have learned a lot about how to support teams effectively.',
              'Before that, I built my foundation in support and operations roles where I had to stay organized, adjust quickly, and keep work moving across shifting priorities.',
              'As I got more comfortable in similar roles, I started to get more responsibility and broader exposure to the business.',
              'I’m someone who has always been hardworking, dependable, and willing to do whatever the team needs.',
              'Going forward, I’m looking for growth and a new challenge where I can continue developing professionally.',
              'Right now, I’m in a role that gives me exposure to a lot of different parts of the business and helps me build transferable skills.',
              'As that evolved, I became more interested in work that depends on coordination, follow-through, and keeping different moving parts on track.',
            ],
            correctOrder: [
              'Right now, most of my work is focused on coordinating projects across teams and making sure priorities stay aligned as work moves forward.',
              'Before that, I built my foundation in support and operations roles where I had to stay organized, adjust quickly, and keep work moving across shifting priorities.',
              'Going forward, I want to keep building in that kind of coordination work in a role where I can take on more ownership.',
            ],
            explanation: 'Present: 1. Past: 7. Future: 3. 1 clearly defines the current lane. 7 gives a through-line, not a timeline. 3 names a specific next direction. The others are realistic mistakes: too chronological, too vague, too trait-led, or too early on why-this-role.',
            displayMode: 'sequence',
          },
          {
            title: 'Drill 3 — Reorder the answer',
            type: 'sentence_builder',
            instruction: 'A candidate gave these four parts in a weak order. Rearrange them into the strongest answer to: “Tell me about yourself.”',
            slotLabels: ['1', '2', '3', '4'],
            options: [
              'Going forward, I want to keep building in that kind of operations work in a role where I can take on more ownership and have a bigger impact on execution.',
              'Before that, I built my foundation in support and coordination roles where I had to stay organized, communicate clearly, and keep work moving when priorities changed.',
              'That’s what made this role stand out to me, because it feels like a natural next step in the kind of work I’ve been building toward.',
              'Right now, most of my work is focused on coordinating projects across teams and making sure priorities stay aligned as work moves forward.',
            ],
            correctOrder: [
              'Right now, most of my work is focused on coordinating projects across teams and making sure priorities stay aligned as work moves forward.',
              'Before that, I built my foundation in support and coordination roles where I had to stay organized, communicate clearly, and keep work moving when priorities changed.',
              'Going forward, I want to keep building in that kind of operations work in a role where I can take on more ownership and have a bigger impact on execution.',
              'That’s what made this role stand out to me, because it feels like a natural next step in the kind of work I’ve been building toward.',
            ],
            explanation: 'Correct order: D → B → A → C.',
            displayMode: 'sequence',
          },
          {
            title: 'Drill 4 — Cut 2 of 6 lines',
            type: 'tap_select',
            instruction: 'A candidate gave this answer to: “Tell me about yourself.” Two lines weaken the answer most. Remove the 2 lines that should be cut first.',
            items: [
              'A. Right now, I work as an Operations Coordinator at a regional logistics company, where most of my time is spent keeping projects moving, aligning teams, and making sure priorities stay on track.',
              'B. Earlier in my career, I worked in mostly project support roles at companies like Grainger and C.H. Robinson, where I learned how to manage competing priorities, communicate clearly, and keep work moving under pressure.',
              'C. Before that, I built my foundation in customer support and project support roles where I had to stay organized, communicate clearly, and adapt quickly when plans changed.',
              'D. People have always told me I’m dependable, hardworking, and easy to work with, which I think has helped me succeed in every role I’ve had.',
              'E. Going forward, I want to keep building in operations and coordination work in a role where I can take on more ownership and contribute at a higher level.',
              'F. That mix of support and coordination experience is a big part of why I’ve gravitated toward fast-moving, cross-functional work.',
            ],
            correctIndices: [2, 3],
            explanation: 'Correct cuts: C and D. C is now the weaker Past because it says basically the same thing as B, but in a more generic way. D is still trait-led and adds the least value. B is stronger because it sounds more like how a real candidate would talk and gives more concrete credibility.',
          },
          {
            title: 'Drill 4 — Multi-select',
            type: 'tap_select',
            context: 'Answer:\nI started my career as a Customer Success Representative at Grainger, where I spent four years working with clients and learning the business. After that, I joined Salesforce as a Customer Success Manager overseeing a small team of three account coordinators. I’ve been there ever since, and it’s been a great experience, but now I’m looking to join a SaaS company where I can keep building the things I’m good at while focusing more directly on the software industry.',
            instruction: 'Read this answer to: “Tell me about yourself.” Then select the 2 biggest problems.',
            items: [
              'A. It starts with earlier career history instead of clearly anchoring who the candidate is professionally right now.',
              'B. It spends too much time on leadership experience and should say less about team oversight.',
              'C. It reads more like a career timeline than a clear professional summary.',
              'D. It is too specific because it uses real company names instead of staying broad.',
              'E. It makes the candidate’s future direction too specific for an HR screen.',
            ],
            correctIndices: [0, 2],
            explanation: 'Correct: A and C. A: no clear present identity. C: too timeline-driven. The others are believable, but not the real problem.',
          },
          {
            title: 'Drill 5 — Highlight the weak parts',
            type: 'tap_select',
            instruction: 'Read this answer to: “Can you walk me through your background?” Tap the 3 parts that make this sound more like a resume walk-through than a strong professional summary.',
            items: [
              '1. I started my career as a Sales Coordinator at Grainger after graduating from Michigan State in 2018.',
              '2. After about three years there, I moved into an Account Manager role with Cintas, where I worked with a larger book of business.',
              '3. Over time, I took on more responsibility and got exposure to more complex client relationships.',
              '4. Right now, most of my work is focused on managing client accounts, solving day-to-day issues, and making sure customers stay supported over time.',
              '5. What I’ve really built over that time is a foundation in client-facing work that depends on communication, follow-through, and long-term relationship management.',
              '6. Going forward, I want to keep building in that kind of account and client success work in a role where I can take on more ownership.',
            ],
            correctIndices: [0, 1, 2],
            explanation: 'Correct highlights: 1, 2, and 3. 1 starts too far back and opens in pure chronology. 2 continues the timeline instead of summarizing the pattern. 3 is realistic, but still keeps the answer in timeline mode. 4, 5, and 6 are closer to a strong professional summary: current lane, through-line, future direction.',
          },
          {
            title: 'Drill 6 — Sentence surgery',
            type: 'multiple_choice',
            context: 'Current opening line:\nRight now, I work in finance and have learned a lot in my current role.\n\nRest of answer:\nEarlier in my career, I worked in accounting support roles where I had to stay organized, work carefully under deadlines, and catch small issues before they became bigger problems. Going forward, I want to keep building in that kind of detail-oriented financial work in a role where I can take on more responsibility.',
            question: 'This answer starts too broadly. Choose the best replacement for the opening line.',
            options: [
              'Right now, I work as a Financial Analyst, where I support reporting, help review data for accuracy, and make sure the financial side of the business stays organized and reliable.',
              'Right now, I work as a Financial Analyst, and over the past few years I’ve built a strong foundation in reporting, accuracy, and detail-oriented work.',
              'Right now, I work in a finance role that sits pretty close to reporting and analysis, and a lot of what I’ve learned has come from working carefully with numbers and deadlines.',
              'Right now, I work in finance, mainly in a role that’s given me more exposure to reporting, analysis, and the kinds of details that matter in keeping things accurate.',
            ],
            correctIndex: 0,
            explanation: 'A is best because it clearly defines the current lane through actual work. B is strong, but leans a little too much into summary over present-day function. C sounds natural, but is softer and less clear. D is plausible, but still too broad.',
          },
        ],
        workshop: {
          type: 'professional_story',
        },
      }
    case 'noticed_fit_now':
      return {
        title: 'Observation, Fit, Timing',
        difficulty: 'easy',
        teach: {
          title: 'Use Observation, Fit, Timing',
          explanation: 'Do not just say you want the role. Explain what you noticed, why it fits, and why now makes sense. This framework works best for motivation and alignment questions, where the interviewer is listening for logic, not just enthusiasm.',
          example: {
            question: 'Why are you interested in this role?',
            badAnswer: 'I am really excited about this opportunity. The company seems great, and I think this role would be a strong next step for me.',
            mediumAnswer: 'What stood out to me is that this looks like a strong opportunity. I think my background is relevant, and the timing feels right for my next move.',
            goodAnswer: 'What stood out to me is that this role sits close to the kind of coordination and follow-through work I have been doing already. That fits well with my background, because a lot of my recent work has involved keeping moving pieces organized across teams. The timing makes sense because I am looking for a role where that kind of work is more central to the job.',
            breakdown: {
              Observation: 'What specifically stood out to you about the role or company?',
              Fit: 'Why does that connect to your background?',
              Timing: 'Why does this move make sense now?',
            },
            annotatedStrongAnswer: [
              { label: 'Observation', text: 'What stood out to me is that this role sits close to the kind of coordination and follow-through work I have been doing already.', detail: 'A strong Observation points to something real about the role instead of generic praise.' },
              { label: 'Fit', text: 'That fits well with my background, because a lot of my recent work has involved keeping moving pieces organized across teams.', detail: 'Fit explains the connection between the opportunity and your actual background.' },
              { label: 'Timing', text: 'The timing makes sense because I am looking for a role where that kind of work is more central to the job.', detail: 'Timing explains why this move makes sense now, not just why you want change.' },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is the strongest response to: "Why are you interested in this role?"',
            options: [
              'I am really excited about this opportunity. The company seems great, and I think this role would be a strong next step for me.',
              'What stood out to me is that this looks like a strong opportunity. I think my background is relevant, and the timing feels right for my next move.',
              'What stood out to me is that this role sits close to the kind of coordination and follow-through work I have been doing already. That fits well with my background, because a lot of my recent work has involved keeping moving pieces organized across teams. The timing makes sense because I am looking for a role where that kind of work is more central to the job.',
            ],
            correctIndex: 2,
            explanation: 'A is flattering and generic, B has the shape but still feels broad, and C is specific, connected, and well-timed.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "I am interested in this role because the company has a strong reputation and the position seems like a great opportunity. I think I would be a good fit, and I am excited about the possibility."',
            options: ['The Observation is too specific', 'The Fit is too detailed', 'The answer is too flattering and generic', 'The Timing is too long'],
            correctIndex: 2,
            explanation: 'This answer sounds interested, but not convincing. It praises the opportunity without explaining anything real about the role, fit, or timing.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "What stood out to me is that this role involves a lot of coordination across teams. That connects well to my background, because I have done similar work before. The timing makes sense because I am ready for a new challenge."',
            options: ['The Observation is missing', 'The Fit is too specific', 'The Timing is too generic', 'The answer is too short'],
            correctIndex: 2,
            explanation: 'Ready for a new challenge is common and weak. It does not explain why this move makes sense now.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves the Observation? Weak line: "This role seems like a great opportunity."',
            options: [
              'This role seems exciting, and I would love the chance to be considered.',
              'What stood out to me is that this role sits close to execution and follow-through, rather than just planning.',
              'This role looks like it has a lot of potential for the right person.',
              'This opportunity seems like a strong fit for someone with my interest level.',
            ],
            correctIndex: 1,
            explanation: 'A strong Observation points to a real feature of the role. It does not just praise the opportunity.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves the Timing? Weak line: "The timing feels right because I am ready for a new challenge."',
            options: [
              'The timing feels right because I want to keep growing in my career.',
              'The timing feels right because I am excited to take on something different.',
              'The timing feels right because I am looking for a role where this kind of work is more central to what I do each day.',
              'The timing feels right because I think this would be a valuable next step.',
            ],
            correctIndex: 2,
            explanation: 'Good Timing is about logic and direction, not just desire for change.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each line by the job it is doing in the answer.',
            segments: [
              { text: 'What stood out to me is that this role is closely tied to cross-functional execution.', correctLabel: 'Observation' },
              { text: 'That connects well to my background, because a lot of my recent work has involved keeping work aligned across teams.', correctLabel: 'Fit' },
              { text: 'The timing makes sense because I am looking for a role where that kind of work is more central.', correctLabel: 'Timing' },
            ],
          },
          {
            type: 'sentence_builder',
            instruction: 'Build the strongest answer by choosing one Observation, one Fit, and one Timing line.',
            slotLabels: ['Observation', 'Fit', 'Timing'],
            correctOrder: [
              'What stood out to me is that this role sits close to day-to-day execution and coordination.',
              'That fits well with my background, because I have spent a lot of time keeping work organized across moving priorities and people.',
              'The timing makes sense because I am looking for a role where this kind of work is more central to what I do.',
            ],
            options: [
              'This role seems like a great opportunity.',
              'What stood out to me is that this role sits close to day-to-day execution and coordination.',
              'The company seems impressive and well regarded.',
              'I think my background would transfer well here.',
              'That fits well with my background, because I have spent a lot of time keeping work organized across moving priorities and people.',
              'I believe I have the skills to succeed in this kind of role.',
              'The timing feels right because I am ready for something new.',
              'The timing makes sense because I am looking for a role where this kind of work is more central to what I do.',
              'The timing feels good because I think this would be a great next step.',
            ],
            explanation: 'The strongest answer points to something real, explains the match, and gives a logical reason the move makes sense now.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your own answer using Observation, Fit, and Timing.',
            coachingTip: 'Do not just say you want the role. Point to something real, explain why it fits your background, and explain why the timing makes sense now.',
            evaluationType: 'noticed_fit_now',
            fields: [
              { label: 'Observation', placeholder: 'What specifically stood out to you about the role or company?', helper: 'Point to something real, not generic praise.', minWords: 6, avoidWords: ['great opportunity', 'great company', 'excited', 'strong reputation'] },
              { label: 'Fit', placeholder: 'Why does that connect to your background?', helper: 'Explain the match clearly.', minWords: 8, avoidWords: ['my skills would transfer', 'good fit', 'relevant background'] },
              { label: 'Timing', placeholder: 'Why does this move make sense now?', helper: 'Make the timing feel logical, not generic.', minWords: 8, avoidWords: ['new challenge', 'next step', 'grow in my career'] },
            ],
          },
        ],
      }
    case 'answer_reason_example':
      return {
        title: 'Answer, Reason, Example',
        difficulty: 'easy',
        teach: {
          title: 'Use Answer, Reason, Example',
          explanation: 'Answer first. Then explain why. Then prove it briefly. This framework is for judgment, preference, or approach questions that do not need a full story.',
          example: {
            question: 'What kind of manager do you work best with?',
            badAnswer: 'I have worked with different kinds of managers, and I think you can learn something from all of them.',
            mediumAnswer: 'I work well with managers who communicate clearly. That is important to me, and I have found that it usually leads to better work.',
            goodAnswer: 'I work best with managers who are clear about priorities but give people room to execute. That helps me stay focused on what matters most without losing momentum. In my last few roles, I did my best work when expectations were clear up front and follow-up stayed focused on blockers rather than constant oversight.',
            breakdown: {
              Answer: 'Say your answer clearly.',
              Reason: 'Explain why.',
              Example: 'Support it with a short proof or real example.',
            },
            annotatedStrongAnswer: [
              { label: 'Answer', text: 'I work best with managers who are clear about priorities but give people room to execute.', detail: 'A strong answer takes a position early instead of circling the topic.' },
              { label: 'Reason', text: 'That helps me stay focused on what matters most without losing momentum.', detail: 'Reason explains the logic behind the answer instead of leaving it as a preference with no explanation.' },
              { label: 'Example', text: 'In my last few roles, I did my best work when expectations were clear up front and follow-up stayed focused on blockers rather than constant oversight.', detail: 'A short, believable example makes the answer feel grounded and interview-ready.' },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            question: 'Which answer is the strongest response to: "What kind of manager do you work best with?"',
            options: [
              'I have worked with different kinds of managers, and I think you can learn something from all of them.',
              'I work well with managers who communicate clearly. That is important to me, and I have found that it usually leads to better work.',
              'I work best with managers who are clear about priorities but give people room to execute. That helps me stay focused on what matters most without losing momentum. In my last few roles, I did my best work when expectations were clear up front and follow-up stayed focused on blockers rather than constant oversight.',
            ],
            correctIndex: 2,
            explanation: 'A is vague, B has the structure but still sounds broad, and C is direct, explained, and supported.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "I think feedback is important, and I always try to stay open to it because that helps people improve."',
            options: ['The Answer is too specific', 'The Reason is too detailed', 'The Example is missing', 'The answer is too long'],
            correctIndex: 2,
            explanation: 'This answer gives a position and a reason, but no proof or concrete support.',
          },
          {
            type: 'multiple_choice',
            question: 'What is the biggest weakness in this answer? "When priorities compete, I try to stay organized and keep moving. In one role, I was balancing several requests at once and had to make sure everything stayed on track."',
            options: ['The direct Answer is missing', 'The Example is too short', 'The Reason is too specific', 'The answer is too confident'],
            correctIndex: 0,
            explanation: 'The answer moves into explanation and example without clearly answering the question first.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves the Answer? Weak line: "I would say it kind of depends, but I usually like collaborative environments."',
            options: [
              'I have worked in different kinds of environments and learned from all of them.',
              'I usually do best in collaborative environments where people share context early and stay aligned as work moves.',
              'I think collaboration can be very important in the right setting.',
              'I would say I am flexible depending on the situation.',
            ],
            correctIndex: 1,
            explanation: 'A strong Answer is direct and specific.',
          },
          {
            type: 'multiple_choice',
            question: 'Which revision best improves the Example? Weak line: "I have seen that this works well in the past."',
            options: [
              'That has been helpful to me before.',
              'I have had positive experiences with that kind of setup.',
              'In a recent role, I handled work most effectively when priorities were set clearly at the start and check-ins focused on removing blockers.',
              'That has generally worked better for me over time.',
            ],
            correctIndex: 2,
            explanation: 'The Example should feel real, but still stay short.',
          },
          {
            type: 'label_sort',
            instruction: 'Label each line by the job it is doing in the answer.',
            segments: [
              { text: 'I work best in environments where priorities are clear and communication stays direct.', correctLabel: 'Answer' },
              { text: 'That helps me move faster and make better decisions without unnecessary confusion.', correctLabel: 'Reason' },
              { text: 'In my last role, I was most effective when goals were set clearly at the start of a project and follow-up focused on the real blockers.', correctLabel: 'Example' },
            ],
          },
          {
            type: 'sentence_builder',
            instruction: 'Build the strongest answer by choosing one Answer, one Reason, and one Example.',
            slotLabels: ['Answer', 'Reason', 'Example'],
            correctOrder: [
              'I work best in environments where priorities are clear and people communicate directly.',
              'That helps me stay focused, make decisions faster, and avoid wasted motion.',
              'In my last role, I was most effective when goals were clear at the start and follow-up stayed focused on blockers instead of constant check-ins.',
            ],
            options: [
              'I think it depends on the situation.',
              'I work best in environments where priorities are clear and people communicate directly.',
              'I have worked in different kinds of environments over time.',
              'That tends to work better for me.',
              'That helps me stay focused, make decisions faster, and avoid wasted motion.',
              'I have just always preferred that style.',
              'I have seen that before in a few roles.',
              'In my last role, I was most effective when goals were clear at the start and follow-up stayed focused on blockers instead of constant check-ins.',
              'That usually creates a better experience overall.',
            ],
            explanation: 'A strong answer takes a position, explains it, and supports it briefly.',
          },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your own answer using Answer, Reason, and Example.',
            coachingTip: 'Answer first. Then explain why. Then prove it briefly.',
            evaluationType: 'answer_reason_example',
            fields: [
              { label: 'Answer', placeholder: 'What is your direct answer?', helper: 'Take a position early.', minWords: 5, avoidWords: ['it depends', 'kind of', 'usually maybe'] },
              { label: 'Reason', placeholder: 'Why is that true for you?', helper: 'Explain the logic behind the answer.', minWords: 6, avoidWords: ['just works better', 'that is just me', 'i prefer it'] },
              { label: 'Example', placeholder: 'What short proof or real example supports it?', helper: 'Keep it brief, but make it believable.', minWords: 8, avoidWords: ['i have seen that', 'that has happened before', 'it works well'] },
            ],
          },
        ],
      }
    case 'star':
    default:
      return {
        title: 'STAR',
        difficulty: 'easy',
        teach: {
          title: 'Use STAR, but put the weight in the right place',
          explanation: 'STAR helps only if each part does its job. Situation should be short. Task should make your responsibility clear. Action should carry the most weight because that is where interviewers decide whether you are credible. Result should show what changed because of your actions.',
          example: {
            question: 'Tell me about a time you had to solve a problem under pressure.',
            badAnswer: 'There was a time when things were moving quickly and a lot was going on. I had to step up and help, and it was a good learning experience for me.',
            mediumAnswer: 'In one role, a project was falling behind close to a deadline. My responsibility was to help get things back on track. I worked with the team to improve communication and stay organized, and in the end we were able to finish successfully.',
            goodAnswer: 'In one role, a key deliverable was at risk a few days before deadline because ownership across teams was unclear. I was responsible for pulling the work back into a clear plan and making sure nothing critical got missed. I mapped the remaining tasks, reassigned open items to the right owners, and set short check-ins so issues surfaced early instead of the deadline. We submitted on time, and the process we used became the model for the next project.',
            breakdown: {
              Situation: 'Give only the context the interviewer needs. Do not let the setup eat the answer.',
              Task: 'Make your responsibility clear so the interviewer knows what you owned.',
              Action: 'This is the engine of the answer. Show what you noticed, decided, changed, or prioritized.',
              Result: 'Close on the outcome or consequence so the story proves value.',
            },
            annotatedStrongAnswer: [
              { label: 'Situation', text: 'In one role, a key deliverable was at risk a few days before deadline because ownership across teams was unclear.', detail: 'This is enough context to understand the pressure without spending too long in setup.' },
              { label: 'Task', text: 'I was responsible for pulling the work back into a clear plan and making sure nothing critical got missed.', detail: 'This makes ownership clear and tells the interviewer what problem you had to solve.' },
              { label: 'Action', text: 'I mapped the remaining tasks, reassigned open items to the right owners, and set short check-ins so issues surfaced early instead of the deadline.', detail: 'This is the most important part. It shows concrete decisions and execution that sound owned.' },
              { label: 'Result', text: 'We submitted on time, and the process we used became the model for the next project.', detail: 'This shows consequence. It did not just work out. Something changed because of the action.' },
            ],
          },
        },
        exercises: [
          { type: 'multiple_choice', question: 'Which answer is the strongest response to: "Tell me about a time you had to solve a problem under pressure."', options: ['There was a time when things were moving quickly and a lot was going on. I had to step up and help, and it was a good learning experience for me.', 'In one role, a project was falling behind close to a deadline. My responsibility was to help get things back on track. I worked with the team to improve communication and stay organized, and in the end we were able to finish successfully.', 'In one role, a key deliverable was at risk a few days before deadline because ownership across teams was unclear. I was responsible for pulling the work back into a clear plan and making sure nothing critical got missed. I mapped the remaining tasks, reassigned open items to the right owners, and set short check-ins so issues surfaced early instead of at the deadline. We submitted on time, and the process we used became the model for the next project.'], correctIndex: 2, explanation: 'A is weak, B is structured but weak, and C is strong because the Action is specific and the Result shows consequence.' },
          { type: 'multiple_choice', question: 'What is the biggest weakness in this answer? "In one role, a client request changed late in the process. My job was to help the team respond. I communicated with everyone involved and worked hard to keep things moving. In the end, the client was happy."', options: ['The Situation is too short', 'The Task is too specific', 'The Action is too vague', 'The Result is too long'], correctIndex: 2, explanation: 'Communicated and worked hard do not tell the interviewer what the candidate actually did.' },
          { type: 'multiple_choice', question: 'What is the biggest weakness in this answer? "At one point, our team was handling several overlapping requests during a busy period, and one project became more complicated when priorities shifted and more people got involved than expected. I was responsible for helping the team manage the situation. I created a clearer handoff process and flagged blockers earlier. The work moved forward more smoothly after that."', options: ['The Situation is too long', 'The Task is too vague', 'The Action is missing', 'The Result is unrealistic'], correctIndex: 0, explanation: 'The setup is not terrible, but it takes too long to get to the point. Situation and Task should not eat the clock.' },
          { type: 'multiple_choice', question: 'Which revision best improves the Action section?', options: ['I stayed involved and made sure we all stayed in touch throughout the process.', 'I tried to be proactive and support the group however I could.', 'I created a simple tracker for open issues, assigned clear owners, and set short daily check-ins so decisions did not stall.', 'I focused on teamwork and kept a positive attitude while we worked through it.'], correctIndex: 2, explanation: 'Strong Action sounds owned. It shows decisions and steps another person could not have described generically.' },
          { type: 'multiple_choice', question: 'Which revision best improves the Result section?', options: ['In the end, everyone felt good about the outcome.', 'In the end, the work was completed on time, and the process reduced confusion on similar projects afterward.', 'In the end, it was a valuable experience for all of us.', 'In the end, we learned a lot from the situation.'], correctIndex: 1, explanation: 'A good Result shows consequence, not just positive vibes.' },
          { type: 'multiple_choice', question: 'Which Action best proves ownership in this situation? Situation: A deadline was at risk because work across several people was not clearly owned. Task: You were responsible for getting the project back on track.', options: ['I stayed calm, worked hard, and communicated with the team.', 'I checked in with everyone and did my best to support the process.', 'I identified the unfinished work, reassigned each item to a clear owner, and created short check-ins to catch blockers before they delayed the timeline.'], correctIndex: 2, explanation: 'The Action section carries the answer. This one sounds operational, specific, and clearly owned.' },
          { type: 'sentence_builder', instruction: 'Build the strongest answer by choosing one Situation, one Task, one Action, and one Result.', slotLabels: ['Situation', 'Task', 'Action', 'Result'], correctOrder: ['A deliverable was at risk because responsibilities across several people were unclear.', 'I was responsible for bringing structure to the remaining work and making sure critical items were covered.', 'I created a list of open items, assigned owners, and used short check-ins to surface blockers early.', 'We met the deadline, and the clearer ownership reduced confusion in later work too.'], options: ['A project became stressful near the deadline.', 'A deliverable was at risk because responsibilities across several people were unclear.', 'There was a lot going on and the team was under pressure.', 'I needed to help however I could.', 'I was responsible for bringing structure to the remaining work and making sure critical items were covered.', 'My role was to stay involved and support the team.', 'I communicated often and tried to keep everyone aligned.', 'I created a list of open items, assigned owners, and used short check-ins to surface blockers early.', 'I worked hard and stayed organized throughout the process.', 'In the end, things worked out.', 'We met the deadline, and the clearer ownership reduced confusion in later work too.', 'Everyone appreciated the effort.'], explanation: 'A strong STAR answer keeps the setup short, makes ownership clear, puts the most detail into Action, and closes on a meaningful Result.' },
          {
            type: 'apply_to_yourself',
            instruction: 'Draft your own STAR answer. Keep the setup short. Put the most detail into the Action.',
            coachingTip: 'Situation and Task should be brief. Action is the engine of the answer. If someone else could have said your Action, it is probably too vague. Result should show what changed because of your actions.',
            evaluationType: 'star',
            fields: [
              { label: 'Situation', placeholder: 'What was happening?', helper: 'Keep this short. Give only the context the interviewer needs.', minWords: 5, avoidWords: ['a lot was going on', 'it was busy', 'things were moving quickly'] },
              { label: 'Task', placeholder: 'What were you responsible for?', helper: 'Make your responsibility explicit.', minWords: 5, avoidWords: ['help however i could', 'support the team', 'do my part'] },
              { label: 'Action', placeholder: 'What did you actually do? Be specific.', helper: 'Use real decisions and steps, not generic effort words.', minWords: 8, avoidWords: ['worked hard', 'communicated', 'helped the team', 'stayed organized'] },
              { label: 'Result', placeholder: 'What changed because of your actions?', helper: 'Show outcome or consequence, not just that it went well.', minWords: 8, avoidWords: ['it worked out', 'it went well', 'everyone was happy', 'we learned a lot'] },
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
