export interface MultipleChoiceExercise {
  type: 'multiple_choice'
  title?: string
  context?: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  followUp?: {
    title?: string
    context?: string
    instruction: string
    items: string[]
    correctIndices: number[]
    explanation: string
  }
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
  type: 'professional_story' | 'star_proof' | 'career_alignment' | 'handling_uncertainty' | 'pace_delivery' | 'preparation_curiosity'
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

export interface ImprovementTip {
  title: string
  summary: string
  bullets: string[]
  retryPrompt: string
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
            question: 'What is the biggest weakness in this fictional answer? "During a wildlife intake, the arrival time changed late. My job was to help the sanctuary respond. I communicated with everyone involved and worked hard to keep things moving. In the end, the animal arrived safely."',
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
              { text: 'A wildlife rescue team was losing intake notes across paper forms.', correctLabel: 'Situation' },
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
              'Animal-care and transport teams disagreed on the timing of a habitat move, which risked disrupting treatment routines. My goal was to get agreement on a safe transfer sequence without formal authority over either team. I collected the care constraints, paired them with transport requirements, and proposed a phased move with welfare checkpoints. Both teams adopted the plan, and every animal moved safely on schedule.',
            breakdown: {
              EdgeCase: 'This only works if the influence move is specific, not generic.',
              Situation: 'Animal-care and transport teams disagreed on habitat-move timing.',
              Action: 'Collected constraints, mapped requirements, proposed a phased move.',
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
              'An urgent animal transfer reached our sanctuary, I owned the intake plan, coordinated care and transport, and the animal arrived safely.',
              'The habitat move was complex and high-visibility. I worked closely with everyone and kept communication strong. In the end, leadership was pleased.',
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
              'The sanctuary completed all 24 transfers without a missed care record.',
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
              'The intake-process change finished one week early and missing care records dropped 15%.',
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
        workshop: {
          type: 'star_proof',
        },
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
          title: 'Fix weak proof with stronger STAR',
          explanation:
            'What usually sounds vague in an interview is not a separate framework problem. It is a STAR problem. A STAR answer can look organized on the surface and still fail if the Action is broad, the Result is thin, or the Situation stays too generic to mean anything. The fix is not to add random detail everywhere. The fix is to make ownership clearer, actions more visible, and results more meaningful.',
          example: {
            question: 'Tell me about a time you had to manage pressure across multiple priorities.',
            badAnswer:
              'Things got very busy during seasonal wildlife intake, and I had to help keep everything on track. I stayed organized, communicated with the care team, and made sure we got through it successfully.',
            mediumAnswer:
              'During a seasonal intake week, several arrival changes came in across care and transport teams. My job was to help keep requests organized and make sure nothing important slipped. I tracked updates, and we got through the week without major issues.',
            goodAnswer:
              'During a seasonal intake week, arrival changes were coming in from care, transport, and volunteer teams, and handoffs were starting to slip because requests were tracked in different places. I was responsible for keeping intake organized and moving urgent cases first. I pulled every open arrival into one tracker, reset owners and times, and flagged blockers in short check-ins twice a day. We finished the week without missing a critical care handoff, and the tracker became the template for the next intake surge.',
            breakdown: {
              Situation: 'Give enough context to make the problem real, but do not stay broad or drift into a long setup.',
              Task: 'Make your responsibility clear so the interviewer knows what you owned inside the situation.',
              Action: 'This is where proof usually lives. Show the real moves you made, not just traits like “I stayed organized.”',
              Result: 'Close with what changed, improved, or got protected because of your actions.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Situation',
                text: 'During a seasonal intake week, arrival changes were coming in from care, transport, and volunteer teams, and handoffs were starting to slip because requests were tracked in different places.',
                detail: 'This gives enough context to make the pressure real. It is specific without becoming a long backstory.',
              },
              {
                label: 'Task',
                text: 'I was responsible for keeping the work organized and making sure the most urgent changes moved first.',
                detail: 'This makes ownership clear. The interviewer knows what the candidate personally had to solve.',
              },
              {
                label: 'Action',
                text: 'I pulled all open requests into one tracker, reset owners and deadlines, and flagged blockers in short check-ins twice a day so issues surfaced before they delayed downstream teams.',
                detail: 'This is the proof. You can see what the candidate actually did instead of hearing a summary like “I stayed organized.”',
              },
              {
                label: 'Result',
                text: 'We finished the week without missing a critical care handoff, and the shared tracker became the template for the next intake surge.',
                detail: 'This makes the value visible. It shows both the immediate outcome and why the action mattered.',
              },
            ],
          },
        },
        exercises: [
          {
            title: 'Drill 1 - What is actually wrong?',
            type: 'multiple_choice',
            question: 'When an answer sounds vague or unconvincing in a behavioral interview, what is the most common real problem?',
            options: [
              'The candidate should stop using STAR and answer more conversationally.',
              'The answer usually has the right broad story, but the STAR proof is weak, especially in Action or Result.',
              'The main issue is that the answer does not include enough personality or self-promotion.',
              'The candidate needs to add more history so the interviewer understands the full background first.',
            ],
            correctIndex: 1,
            explanation: 'Most weak proof problems are really weak STAR execution. The story may have the right topic, but if Action stays generic or Result stays empty, the answer still does not feel believable.',
          },
          {
            title: 'Drill 2 - Best tool',
            type: 'multiple_choice',
            question: 'What is the best tool for fixing a behavioral answer that sounds structured but still does not prove enough?',
            options: [
              'Add a stronger personal claim at the beginning so the interviewer knows the point.',
              'Use STAR again, but put more weight into ownership, specific Action, and meaningful Result.',
              'Keep the story short and broad so the interviewer can infer the details.',
              'Swap the story for a summary of how you usually work across roles.',
            ],
            correctIndex: 1,
            explanation: 'The fix is not a new answer structure. It is better STAR execution. Strong proof usually comes from clearer ownership, visible actions, and a result that actually demonstrates value.',
          },
          {
            title: 'Drill 3 - Which STAR proves more?',
            type: 'multiple_choice',
            question: 'Which STAR answer gives the interviewer stronger proof?',
            options: [
              'Our reporting process got messy before a deadline, and I needed to help. I stayed on top of the work, communicated with people, and we were able to fix things in time.',
              'Before a reporting deadline, two teams were using different source files and the numbers stopped matching. I owned the final submission, so I reconciled the file versions, rebuilt the comparison sheet, and set a same-day review with both owners so we could lock one source before cutoff. We submitted on time without sending incorrect numbers.',
              'There was a busy period where I had to be proactive. I noticed issues, worked hard, and made sure the team stayed aligned through the process.',
              'The main thing I would say is that I am someone who catches problems early and stays calm when deadlines are involved.',
            ],
            correctIndex: 1,
            explanation: 'The strongest answer makes the problem, ownership, actions, and outcome visible. The others stay in summary language or self-description, which sounds organized but does not really prove much.',
            followUp: {
              title: 'Drill 3 - Why is it stronger?',
              instruction: 'Select all the reasons the strongest STAR works better.',
              items: [
                'It makes ownership clear.',
                'It names visible actions the interviewer can picture.',
                'It stays broad enough to fit almost any example.',
                'It ends with a concrete outcome instead of a generic success line.',
              ],
              correctIndices: [0, 1, 3],
              explanation: 'The answer is stronger because the interviewer can see what the candidate owned, what they actually did, and what changed because of it. Broad flexibility is not the goal here.',
            },
          },
          {
            title: 'Drill 4 - Spot the weak section',
            type: 'multiple_choice',
            context: 'Fictional answer:\nSituation: During a multi-animal transfer, care and transport teams had open dependencies and timing was slipping.\nTask: I needed to keep the move coordinated and protect each care handoff.\nAction: I worked closely with the teams, stayed organized, and communicated proactively.\nResult: We completed the transfer safely.',
            question: 'This answer uses STAR on the surface, but one section is doing the most damage. Which section is the real problem?',
            options: [
              'Situation',
              'Task',
              'Action',
              'Result',
            ],
            correctIndex: 2,
            explanation: 'The Action is where the proof should live, and here it collapses into summary language like “worked closely” and “communicated proactively.” The answer uses STAR labels, but the engine of the story is still vague.',
            followUp: {
              title: 'Drill 4 - Why is Action the issue?',
              instruction: 'Select all the reasons the Action section is weak.',
              items: [
                'It describes traits instead of showing decisions or moves.',
                'It hides what the candidate personally changed.',
                'It is too short to count as Action at all.',
                'It gives no visible detail the interviewer can picture.',
              ],
              correctIndices: [0, 1, 3],
              explanation: 'Weak Action is usually summary language pretending to be proof. The issue is not just length. The issue is that we still cannot see what the person actually did.',
            },
          },
          {
            title: 'Drill 5 - Improve the Action',
            type: 'multiple_choice',
            question: 'Which Action line gives the strongest proof?',
            options: [
              'I stayed organized and worked with everyone to keep things moving.',
              'I communicated regularly and made sure people were aligned.',
              'I built one tracker for open dependencies, reassigned owners on delayed items, and ran 10-minute check-ins each morning so blockers surfaced before they slowed the rollout.',
              'I took initiative and stayed proactive throughout the project.',
            ],
            correctIndex: 2,
            explanation: 'Strong Action makes the proof visible. It shows concrete moves, not traits or summaries.',
          },
          {
            title: 'Drill 6 - Improve the Result',
            type: 'multiple_choice',
            question: 'Which Result line does the best job of proving value?',
            options: [
              'It was a really valuable experience for me.',
              'We completed the work successfully in the end.',
              'The animal transfer finished on schedule, and the tracker was reused for the next two intake events.',
              'Everyone appreciated the support I gave during the project.',
            ],
            correctIndex: 2,
            explanation: 'A strong Result shows what changed because of the candidate’s work. “Successful” is too thin by itself. The stronger version makes the outcome and value visible.',
          },
          {
            title: 'Drill 7 - Summary vs proof',
            type: 'multiple_choice',
            question: 'Which line is still summarizing instead of proving?',
            options: [
              'I reset the handoff list, reassigned open owners, and flagged unresolved dependencies before the deadline meeting.',
              'The issue involved animal-care, transport, and volunteer teams, all of which were waiting on different inputs.',
              'I am someone who stays organized and works well across teams when things get busy.',
              'The final handoff went out on time and the error rate dropped after the process change.',
            ],
            correctIndex: 2,
            explanation: 'That line sounds positive, but it is still self-description. The other lines either establish context, show action, or show result.',
          },
        ],
        workshop: {
          type: 'star_proof',
        },
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
              'Interviewer: "Tell me a bit about your background." Candidate: "Sure—right now I work in animal-care operations, mostly around intake records and safe handoffs..."',
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
        workshop: {
          type: 'pace_delivery',
        },
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
              'What stands out to me is your focus on shortening animal intake time without sacrificing record accuracy. In this fictional example, I redesigned intake steps and cut the average handoff from 21 minutes to 12. That is why the role makes sense: the sanctuary is solving a problem I have already improved in practice.',
            breakdown: {
              TheirPriority: 'Shortening animal intake time without sacrificing accuracy.',
              YourEvidence: 'Cut the average care handoff from 21 minutes to 12.',
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
              'I noticed you opened a new rehabilitation habitat, and that seems exciting.',
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
              { text: 'Your sanctuary is prioritizing faster intake while preserving care-record accuracy.', correctLabel: 'Their priority' },
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
              'I coordinated a habitat move across animal-care and transport teams.',
              'Your sanctuary photos look polished.',
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
            'Edge case: candidates sometimes cite random facts that do not matter to the role. Strong research focuses on operating priorities, service needs, or team goals that your experience can actually address.',
          example: {
            question: 'Why are you interested in this company?',
            badAnswer:
              'I know you were founded a few years ago, raised funding recently, and have been growing quickly. Those are all really interesting signs to me that the company is heading in a strong direction.',
            goodAnswer:
              'I noticed your recent hiring push in volunteer education, which suggests consistent care routines are a core priority. In this fictional example, I built a training-to-shift handoff that improved first-week readiness for new volunteers. That is the bridge for me: the operating need you are investing in is one I have already helped solve.',
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
              'A recent note that the sanctuary is reducing wildlife intake time',
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
              { text: 'You have recently expanded your volunteer education team.', correctLabel: 'Their priority' },
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
              'Their director gave a talk about wildlife release readiness',
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
              'You are investing in volunteer onboarding quality, and in this fictional example I improved training speed and consistency in that exact environment.',
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
        workshop: {
          type: 'preparation_curiosity',
        },
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
              'From what I saw, the fictional sanctuary rehabilitates native wildlife and is focused on making intake safer and more consistent. What stood out to me is how often care-record accuracy and dependable handoffs appeared in the role materials, because those are the responsibilities I want to deepen.',
            breakdown: {
              Basics: 'Know what the company does, who it serves, and one thing that stood out.',
              NoGenericPraise: 'Saying the company seems great is not the same as showing preparation.',
              ConnectInterest: 'Say what stood out, then explain why it matters to you.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Know',
                text: 'From what I saw, the fictional sanctuary rehabilitates native wildlife and is focused on making intake safer and more consistent.',
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
              'From what I saw, the fictional sanctuary rehabilitates native wildlife and is focused on making intake safer and more consistent. What stood out to me is how often care-record accuracy and dependable handoffs appeared in the role materials, because those are the responsibilities I want to deepen.',
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
              'From what I saw, the fictional sanctuary focuses on safe wildlife intake and dependable care records.',
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
        workshop: {
          type: 'preparation_curiosity',
        },
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
          title: 'Use Answer, Reason, Example when you are unsure',
          explanation:
            'Sometimes the question is fine, but you do not have a strong answer immediately. In that moment, do not ramble while you search. Pause, choose one grounded answer, explain why, and then support it with a short real example.',
          example: {
            question: 'Tell me about an area where you are still developing professionally.',
            badAnswer:
              'That is a good question. I think there are probably a few areas, and it kind of depends on how you define development. I am always trying to improve, so it is hard to pick just one thing.',
            mediumAnswer:
              'One area I am still working on is getting faster at making decisions when not everything is fully clear yet.',
            goodAnswer:
              'One area I am still developing is getting faster at making decisions when the path is not fully clear. I have gotten much better at it, but I still push myself to get to a clear call faster instead of over-processing. For example, in one role I had to reset a project plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty.',
            breakdown: {
              Answer: 'Give one clear answer early so the interviewer knows where the response is going.',
              Reason: 'Explain why that answer makes sense instead of circling the topic.',
              Example: 'Ground it with a short real example so the answer sounds credible and lived-in.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Answer',
                text: 'One area I am still developing is getting faster at making decisions when the path is not fully clear.',
                detail: 'This gives one direct answer early instead of rambling while searching for a point.',
              },
              {
                label: 'Reason',
                text: 'I have gotten much better at it, but I still push myself to get to a clear call faster instead of over-processing.',
                detail: 'This explains the logic behind the answer instead of leaving it as a vague instinct.',
              },
              {
                label: 'Example',
                text: 'For example, in one role I had to reset a project plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty.',
                detail: 'This makes the answer believable by showing what the approach looked like in a real situation.',
              },
            ],
          },
        },
        exercises: [
          {
            type: 'multiple_choice',
            title: 'Drill 1 - What is actually going wrong?',
            question: 'When someone gets a normal interview question and starts rambling, what is usually the real problem?',
            options: [
              'They are trying to sound thoughtful, but they have not chosen a clear answer yet.',
              'They do not have enough stories in their background to answer the question well.',
              'They are trying to avoid sounding overconfident, which usually helps in HR screens.',
              'They need more detail immediately, even before they know their main point.',
            ],
            correctIndex: 0,
            explanation: 'The main issue is not a lack of words. It is that the candidate has not chosen a clear answer yet, so they start thinking out loud instead of responding directly.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 2 - Best tool',
            question: 'What is the best recovery tool when you do not know your full answer immediately?',
            options: [
              'Talk through the possibilities until you land somewhere reasonable.',
              'Pause, give one clear answer, explain why, and support it with a short example.',
              'Buy time by saying the question depends on context, then stay broad.',
              'Start with the example first so you do not have to commit to an answer.',
            ],
            correctIndex: 1,
            explanation: 'The recovery move is not to keep talking while you think. It is to pause, choose a direct answer, explain it, and ground it briefly.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 3 - What is the job of the Answer?',
            question: 'In this lesson, what is the job of the Answer?',
            options: [
              'Show that you are being careful not to overstate anything.',
              'Give the interviewer one clear position early so they know where the response is going.',
              'Summarize the whole situation before you commit to a point.',
              'Prove you have thought deeply about the question before answering it.',
            ],
            correctIndex: 1,
            explanation: 'The Answer should tell the interviewer where the response is going right away. Without that, the rest of the response sounds like searching.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 4 - Which answer is stronger?',
            question: 'Which answer is stronger for: "Tell me about an area where you are still developing professionally?"',
            options: [
              'That is a good question. I think there are probably a few areas, and it kind of depends on how you define development. I am always trying to improve, so it is hard to pick just one thing.',
              'One area I am still developing is getting faster at making decisions when the path is not fully clear. I have gotten much better at it, but I still push myself to get to a clear call faster instead of over-processing. For example, in one role I had to reset a project plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty.',
              'I would say I am generally very self-aware, so I am always looking for ways to keep growing and improving over time.',
              'There are a lot of areas you can always keep developing, but I try to stay open-minded and keep learning.',
            ],
            correctIndex: 1,
            explanation: 'The stronger answer chooses one clear development area, explains why it is real, and proves it with a short example. The others sound polished, but still avoid a direct answer.',
            followUp: {
              title: 'Drill 4 - Why does the stronger answer work?',
              instruction: 'Select all the reasons the stronger answer works better.',
              items: [
                'It gives one clear answer early.',
                'It explains why that answer is true.',
                'It supports the answer with a real example.',
                'It avoids sounding too confident or overprepared.',
              ],
              correctIndices: [0, 1, 2],
              explanation: 'The answer works because it answers directly, explains the logic, and grounds it with a real example. That is the recovery move this lesson is teaching.',
            },
          },
          {
            type: 'multiple_choice',
            title: 'Drill 5 - Spot the real problem',
            question: 'What is the biggest problem in this answer? "That is a really interesting question. I think it probably depends a lot on the person and the situation. I have worked on a lot of things over time, so it is hard to choose just one area."',
            options: [
              'The answer is too specific for an HR screen.',
              'The direct Answer is missing.',
              'The Example is too detailed.',
              'The candidate is being too honest too early.',
            ],
            correctIndex: 1,
            explanation: 'The candidate never chooses one clear answer. The response sounds reflective, but it never really begins.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 6 - Which opening recovers best?',
            question: 'Which opening does the best job of recovering when you need a second to think?',
            options: [
              'That is a really interesting question, and I think there are a few different ways to think about it.',
              'Good question. One area I am still working on is getting faster at making decisions when things are not fully clear.',
              'I have a lot of thoughts on that, so let me try to organize them.',
              'It probably depends a little on the context, but I will do my best to answer.',
            ],
            correctIndex: 1,
            explanation: 'A brief pause phrase is fine, but the key move is that the candidate immediately chooses a clear answer instead of continuing to buy time.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 7 - Which line is the best Reason?',
            question: 'Which line works best as the Reason?',
            options: [
              'I think that is just something that matters in a lot of roles.',
              'That is an area I care about, and I know it is important.',
              'I have improved a lot there, but I still push myself to get to a clear call faster instead of over-processing.',
              'That is something I have definitely thought about over time.',
            ],
            correctIndex: 2,
            explanation: 'A strong Reason explains why the answer is true in a specific way. The other lines sound sincere, but they do not really explain anything.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 8 - Which line is the best Example?',
            question: 'Which line works best as the Example?',
            options: [
              'I have seen that this matters in real situations.',
              'That has definitely come up for me before in the past.',
              'For example, in one role I had to reset a project plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty.',
              'I have had a few experiences that taught me that lesson.',
            ],
            correctIndex: 2,
            explanation: 'The Example should feel real without taking over the answer. The stronger line is concrete, brief, and believable.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 9 - What still sounds like panic?',
            question: 'Which line still sounds like the candidate is filling space instead of answering?',
            options: [
              'One area I am still developing is getting faster at making decisions when the path is not fully clear.',
              'I have gotten much better at that, but I still work on it intentionally.',
              'There are probably a few different areas, and I think it depends on how you define development.',
              'For example, in one role I had to make a call before every variable was fully settled.',
            ],
            correctIndex: 2,
            explanation: 'That line still sounds like searching out loud. It gestures toward thoughtfulness, but it does not actually choose an answer.',
          },
          {
            type: 'label_sort',
            title: 'Drill 10 - Build the strongest recovery',
            instruction: 'Label each line by the job it is doing in the answer.',
            segments: [
              {
                text: 'One area I am still developing is getting faster at making decisions when things are not fully clear.',
                correctLabel: 'Answer',
              },
              {
                text: 'I have gotten much better at it, but I still push myself to make the call faster instead of over-processing.',
                correctLabel: 'Reason',
              },
              {
                text: 'For example, in one role I had to reset a plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty.',
                correctLabel: 'Example',
              },
            ],
          },
        ],
        workshop: {
          type: 'handling_uncertainty',
        },
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
            title: 'Drill 1 - What is this question really testing?',
            question: 'When an interviewer asks "Why are you interested in this role?", what are they usually trying to understand?',
            options: [
              'Whether you can speak positively enough about the role that your enthusiasm feels genuine and motivating.',
              'Whether the move sounds specific, connected to your background, and logical right now.',
              'Whether you know enough company facts to show you prepared and took the interview seriously.',
              'Whether you can describe your longer-term career direction in a way that sounds ambitious and polished.',
            ],
            correctIndex: 1,
            explanation: 'Candidates often think this question is mainly about enthusiasm, prep, or ambition. The deeper test is whether the move sounds specific, connected, and logical now.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 2 - Best tool',
            question: 'What is the best tool for answering this question in a way that sounds chosen instead of generic?',
            options: [
              'Start with why you want change, then explain why the role seems exciting and like a good next step.',
              'Use Observation, Fit, Timing to explain what stands out, why it connects to you, and why the move makes sense now.',
              'Focus on your strongest transferable skills and the value you could bring to the team right away.',
              'Lead with growth and long-term goals so the interviewer sees ambition and forward momentum.',
            ],
            correctIndex: 1,
            explanation: 'The other options are things real candidates do, but they tend to sound broad or incomplete. Observation, Fit, Timing gives the answer a real logic chain.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 3 - What is the job of Observation?',
            question: 'In this answer, what is Observation supposed to do?',
            options: [
              'Show that you already understand the company’s history and market position well enough to sound informed.',
              'Point to something real about the role or opportunity that specifically stands out to you.',
              'Introduce your strongest background qualification before you explain why the role would be a good fit.',
              'Show that you are serious by sounding formal, intentional, and well-prepared at the beginning.',
            ],
            correctIndex: 1,
            explanation: 'Observation should point to something real about the role. It is not just a place to sound impressed, formal, or well-researched.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 4 - Why does the stronger answer work?',
            question: 'Which answer is stronger for "Why are you interested in this role?"',
            options: [
              'I’m interested because this seems like a strong next step for me. I’m ready for something new, and I think the role would give me a chance to keep growing in the right direction.',
              'What stands out to me is that the role sits close to the kind of coordination work I’ve been doing already. That fits well with my background, and the timing makes sense because I’m looking for a role where that work is more central to what I do.',
              'I’m drawn to the role because I know it would challenge me, help me build new skills, and give me a chance to work in a fast-paced environment.',
              'This role stood out because I’ve been wanting to find a company where I can contribute quickly, keep moving forward, and continue building on the work I’ve done so far.',
            ],
            correctIndex: 1,
            explanation: 'The stronger answer points to something specific, ties it to real background, and explains why the move makes sense now. The others sound polished, but still broad.',
            followUp: {
              title: 'Drill 4 - Why does the stronger answer work?',
              instruction: 'Select all the reasons the stronger answer works better.',
              items: [
                'It points to something specific instead of generic praise.',
                'It connects the role to real background.',
                'It explains why the timing makes sense now.',
                'It sounds chosen instead of broadly job-seeking.',
              ],
              correctIndices: [0, 1, 2],
              explanation: 'The answer works because it names something real, connects it to background, and explains why the move makes sense now. That is the logic the interviewer is listening for.',
            },
          },
          {
            type: 'multiple_choice',
            title: 'Drill 5 - Spot the broken section',
            question: 'What is the biggest problem in this answer? “What stood out to me is that the role seems cross-functional and fast-paced. That connects to some of the work I’ve done before, and it definitely interests me. I’m ready for something new at this point in my career.”',
            options: [
              'The Observation is too narrow and makes the answer sound overly tailored.',
              'The Fit is too narrow and overstates how closely the role matches their background.',
              'The Timing is weak and generic.',
              'The answer spends too much time describing the role instead of the candidate.',
            ],
            correctIndex: 2,
            explanation: 'The answer is not a disaster. It has some shape. But the ending still collapses into generic job-seeking language instead of explaining why this move makes sense now.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 6 - Which Observation actually follows the lesson?',
            question: 'Which Observation line best follows the lesson?',
            options: [
              'What stood out to me is that this seems like a strong opportunity where I could keep growing in a collaborative environment.',
              'What stood out to me is that the role seems fast-paced and collaborative, which is the kind of environment where I usually do my best work.',
              'What stood out to me is how central the role is to keeping cross-functional work aligned as priorities move.',
              'What stood out to me is that the company has a strong reputation and this looks like a meaningful next step in the kind of work I want to keep doing.',
            ],
            correctIndex: 2,
            explanation: 'The others sound believable, but they are still broad enough to fit almost anything. The stronger line points to a real part of the work.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 7 - Improve the Fit',
            question: 'Which line creates the strongest Fit to your background?',
            options: [
              'That fits my background because I know I have transferable skills that would help me succeed in this kind of environment.',
              'That connects well to my background because I’ve spent a lot of time coordinating moving pieces across teams and keeping follow-through tight when priorities shift.',
              'That fits me well because I’m confident I could grow into the role quickly and add value as I get up to speed.',
              'That aligns with my background because I’ve consistently been drawn to this kind of work and have built toward it over time.',
            ],
            correctIndex: 1,
            explanation: 'The stronger line makes the fit concrete. The others claim fit, but do not really prove it.',
          },
          {
            type: 'multiple_choice',
            title: 'Drill 8 - Improve the Timing',
            question: 'Which Timing line sounds most intentional and logical?',
            options: [
              'I’m ready for something new, and this feels like a good next challenge at this point in my career.',
              'At this point, I’m looking for a role where this kind of coordination work is more directly owned and more central to the job.',
              'I’ve learned a lot where I am, and I think it’s time for me to keep growing in a new environment.',
              'I wanted to start exploring roles where I could bring my skills into a new environment and keep building on them.',
            ],
            correctIndex: 1,
            explanation: 'The stronger line explains why the move makes sense now. The others still sound like broad movement language.',
          },
        ],
        workshop: {
          type: 'career_alignment',
        },
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
              'I am usually very collaborative and try to keep everyone aligned. In one fictional situation I was involved in a habitat move across several teams, and we eventually worked through the differences.',
            goodAnswer:
              'In this fictional example, my manager wanted to keep a habitat opening date even though animal-care documentation was incomplete. I reviewed recent intake errors, showed where volunteers were getting stuck, and recommended delaying the opening by one week so the team could finish the materials. We made the change, opened the following week, and saw fewer avoidable care escalations.',
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
              'I missed an animal-transfer handoff, owned the miss, and changed the checklist.',
              'I care a lot about quality in everything I do.',
              'One volunteer training session underperformed, so I reviewed completion data and revised the training plan.',
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
              'In this fictional example, a clinic refrigeration unit failed and we did not yet know the root cause, but I still had to decide whether incoming medical supplies could be accepted safely. I paused deliveries for 24 hours, set a communication cadence with veterinary and facilities teams, and used temperature thresholds to decide when it was safe to resume. Once readings stabilized, we reopened deliveries with less risk to animal care.',
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
              'I once led a successful wildlife habitat move.',
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
        workshop: {
          type: 'handling_uncertainty',
        },
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
              'In this fictional example, I led a medical-supply inventory migration for a sanctuary that was struggling with duplicate records. The work mattered because the care team was spending hours correcting counts each week. I mapped failure points, set a phased cutover plan, and partnered with veterinary staff on reconciliation checks. After the change, duplicate records dropped sharply and weekly inventory became faster. The experience taught me to front-load risk reviews before a system change touches animal care.',
            breakdown: {
              Claim: 'I led a medical-supply inventory migration.',
              Context: 'Duplicate records were creating extra work for animal-care staff.',
              Action: 'Mapped failure points, planned a phased cutover, and partnered on checks.',
              Outcome: 'Record errors dropped and weekly inventory became faster.',
              Reflection: 'Front-load risk reviews when a system change touches animal care.',
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
              'In this fictional example, I improved the handoff between rescue transport and animal care because key intake details were being lost on arrival. I added required fields to the transfer form, built a one-page intake summary, and reviewed the first ten handoffs with both teams. Care staff received animals with fewer surprises, and I learned that process fixes stick faster when both teams help design the checklist.',
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
              'In this fictional example, I noticed new volunteers were recording the same feeding exception inconsistently, which frustrated animal-care staff. I drafted a one-page decision guide, tested it with two senior caregivers, and added it to onboarding. Record corrections dropped the following month, reinforcing that small documentation fixes can create outsized care consistency.',
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
              'I noticed repeated feeding-record errors, created a one-page guide for volunteers, reduced corrections, and learned that small workflow tools can stabilize animal care quickly.',
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
              { text: 'I redesigned the volunteer guide for our most common intake questions.', correctLabel: 'Claim' },
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
        workshop: {
          type: 'star_proof',
        },
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

function takeLeadingSentences(text: string, maxSentences: number) {
  const cleaned = text.trim()
  if (!cleaned) return ''
  const matches = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned]
  return matches.slice(0, maxSentences).join(' ').trim()
}

export function getImprovementTipForCriterion(criterion: string, explicitRootCause?: string): ImprovementTip {
  const rootCause = getRootCauseForCriterion(criterion, explicitRootCause)
  const bundle = getBundleForRootCause(rootCause)
  const lesson = bundle.lessons[0]
  const breakdownEntries = Object.entries(lesson?.teach?.example?.breakdown || {})
  const applyExercise = lesson?.exercises?.find((exercise) => exercise.type === 'apply_to_yourself')
  const retryPrompt =
    applyExercise?.type === 'apply_to_yourself'
      ? applyExercise.coachingTip
      : 'Try answering again with more ownership, more specificity, and a clearer result.'

  return {
    title: lesson?.teach?.title || `${bundle.displayName} tip`,
    summary: takeLeadingSentences(lesson?.teach?.explanation || bundle.description, 2),
    bullets: breakdownEntries.slice(0, 3).map(([, detail]) => String(detail)),
    retryPrompt: takeLeadingSentences(retryPrompt, 2),
  }
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
          explanation: 'In this lesson, you’ll learn how to turn a scattered background into a clear, focused answer you can actually use. A strong answer explains what you do now, shows the foundation that shaped you, and makes it clear where you are headed next. You do not need to strip out every real detail from your background. A [company], [role], [program], or [industry] can strengthen the answer when it helps explain your foundation. The problem is not specificity. The problem is detail without a job.',
          example: {
            question: 'Can you tell me about yourself?',
            badAnswer: 'I have held several roles around animal care and have learned a lot in each one. I am now looking for a new challenge where I can keep growing.',
            mediumAnswer: 'Right now, I support daily wildlife intake and care records. Earlier animal-care roles taught me to stay calm and accurate when priorities change. Next, I want to take broader ownership of sanctuary operations.',
            goodAnswer: 'Right now, I coordinate wildlife intake, treatment records, and volunteer coverage at the fictional Moonrise Wildlife Sanctuary. Before that, hands-on animal transport work taught me how much safe care depends on calm communication and accurate handoffs. I am now looking to take broader ownership of animal-care operations.',
            breakdown: {
              Present: 'Start with what you do now and define your professional lane clearly.',
              Past: 'Show the foundation that shaped you. Use specific details when they explain meaning, not when they just add chronology.',
              Future: 'Explain where you want to go next in a way that sounds specific and logical.',
            },
            annotatedStrongAnswer: [
              {
                label: 'Present',
                text: 'Right now, I coordinate wildlife intake, treatment records, and volunteer coverage at the fictional Moonrise Wildlife Sanctuary.',
                detail: 'This clearly defines the candidate’s lane right now instead of just naming a title.',
              },
              {
                label: 'Past',
                text: 'Before that, hands-on animal transport work taught me how much safe care depends on calm communication and accurate handoffs.',
                detail: 'This uses a specific fictional grounding detail to explain what shaped the candidate’s foundation instead of listing employers.',
              },
              {
                label: 'Future',
                text: 'I am now looking to take broader ownership of animal-care operations.',
                detail: 'This gives a specific direction instead of vague growth language.',
              },
            ],
          },
        },
        exercises: [
          {
            title: 'Drill 1 — What is this question really asking?',
            type: 'multiple_choice',
            question: 'When an interviewer says, “Tell me about yourself,” what are they really trying to understand?',
            options: [
              'Who you are outside of work, what your interests are, and whether your personality feels like a strong culture fit.',
              'Whether you can summarize your full resume clearly enough that they do not need to piece your history together themselves.',
              'What kind of professional you are, what shaped that direction, and where you want to go next.',
              'Whether you can sound confident and polished without needing a clear structure to guide the answer.',
            ],
            correctIndex: 2,
            explanation: 'This question is really asking for your professional story. The interviewer wants to know what kind of work defines you now, what shaped that path, and what direction makes sense next. The other answers reflect common candidate instincts, but they pull the answer toward personality, polish, or resume summary instead of professional identity.',
          },
          {
            title: 'Drill 2 — Best tool',
            type: 'multiple_choice',
            question: 'What is the best tool for answering this kind of question well?',
            options: [
              'List the most relevant jobs and projects from the last 5 years in a clean order, then close with why you are exploring this role.',
              'Start with your current lane, explain the background that built it, and show where you want to go next.',
              'Lead with why you want the role, mention a few strengths, and then summarize the parts of your background that support them.',
              'Start at the beginning of your career and walk forward until you reach the role you have now.',
            ],
            correctIndex: 1,
            explanation: 'Present -> Past -> Future is the repair tool for this question type. It keeps the answer anchored in who you are now, gives enough background to explain the pattern, and then points the story forward. The other options are common mistakes: timeline summaries, early why-this-role answers, or resume narration dressed up as relevance.',
          },
          {
            title: 'Drill 3 — What is the job of Past?',
            type: 'multiple_choice',
            question: 'In the Present -> Past -> Future tool, what is the main job of the Past section?',
            options: [
              'To prove you have worked at strong companies and held enough credible roles to deserve the opportunity.',
              'To explain the foundation that shaped how you work today.',
              'To give a full overview of the jobs that led from your early background to your current position.',
              'To show how many years of experience you have in the broad field you want to stay in.',
            ],
            correctIndex: 1,
            explanation: 'Past is not there to walk the interviewer through your whole resume. Its job is to explain what shaped your current lane. That is why selected details can help, but only when they explain meaning instead of turning the answer into chronology.',
          },
          {
            title: 'Drill 4 — Why does the stronger answer work?',
            type: 'multiple_choice',
            question: 'Which answer is the strongest response to: “Tell me about yourself?”',
            options: [
              'Outside of work, I’m someone who values strong relationships, balance, and being involved in my community. I tend to bring a steady, positive energy to teams, and that has shaped how I approach work in every environment I’ve been part of.',
              'I started as a weekend habitat assistant at the fictional Pine Hollow Bird Rescue, then handled animal transport at the fictional Bramble Creek Rescue, and later joined Moonrise Wildlife Sanctuary. Now I want a role with more responsibility.',
              'Right now, I coordinate wildlife intake and care records at the fictional Moonrise Wildlife Sanctuary. Earlier animal transport work taught me that safe care depends on calm communication and accurate handoffs. I am now looking to take broader ownership of animal-care operations.',
            ],
            correctIndex: 2,
            explanation: 'The strongest answer is the one that gives the interviewer a clear professional story: what you do now, what shaped that direction, and where you want to go next.',
            followUp: {
              title: 'Drill 4 — Why does the stronger answer work?',
              instruction: 'Select all the reasons that explain why the strongest answer works better.',
              items: [
                'It defines the candidate’s current lane clearly.',
                'It uses Past to explain foundation, not just movement.',
                'It sounds more polished and self-assured overall.',
                'It keeps the story broad enough to fit any opportunity.',
              ],
              correctIndices: [0, 1],
              explanation: 'The strongest answer works because it is structurally clear and each section does its real job. The wrong answers are tempting because polish and flexibility can sound positive, but those are not the main reasons the answer is better. It is better because the interviewer can quickly understand what the candidate does now, what shaped that path, and where that path is headed.',
            },
          },
          {
            title: 'Drill 5 — Spot the broken section',
            type: 'multiple_choice',
            context: 'Answer:\nRight now, I coordinate wildlife intake and care records. Before that, I worked at the fictional Pine Hollow Bird Rescue, then Bramble Creek Rescue, then Moonrise Wildlife Sanctuary. Going forward, I want broader ownership of animal-care operations.',
            question: 'This answer uses Present -> Past -> Future on the surface, but one section is still weak. Which section is the real problem?',
            options: [
              'Present',
              'Past',
              'Future',
              'None of them',
            ],
            correctIndex: 1,
            explanation: 'The answer uses the right slots, but the Past section is still doing the wrong job. It lists movement across roles instead of explaining what that experience built. That is exactly the difference between using the framework on the surface and using it well.',
            followUp: {
              title: 'Drill 5 — Why is Past the problem?',
              instruction: 'Select all the reasons that explain why the Past section is the weak part.',
              items: [
                'It lists role movement without explaining what the experience built.',
                'It uses chronology where the answer needs a clearer through-line.',
                'It should avoid mentioning companies in a Professional Story.',
                'It is too specific for an HR screen to follow comfortably.',
              ],
              correctIndices: [0, 1],
              explanation: 'Past is weak here because it is doing resume-summary work instead of foundation work. Mentioning real companies is not the issue by itself. The issue is that the details do not explain meaning or reinforce the pattern behind the candidate’s background.',
            },
          },
          {
            title: 'Drill 6 — Which Past sections actually follow the lesson?',
            type: 'tap_select',
            instruction: 'Select all the Past sections that follow the lesson.',
            items: [
              'Before that, I worked at the fictional Pine Hollow Bird Rescue, then Bramble Creek Rescue, then Moonrise Wildlife Sanctuary, and learned a lot along the way.',
              'Before that, animal transport work taught me to stay calm, communicate clearly, and protect accurate handoffs when conditions changed.',
              'Before that, my fictional role at Bramble Creek Rescue taught me how much safe animal care depends on precise records and dependable handoffs.',
              'Before that, I spent several years across different roles and gradually took on more responsibility as my career developed.',
            ],
            correctIndices: [1, 2],
            explanation: 'The correct choices are the two versions that explain foundation. One stays broad and one uses a grounding detail, but both do the real job of Past: show what the experience built. The wrong choices stay in timeline mode. They tell you where the candidate has been, but not what that history means.',
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
            goodAnswer: 'What stood out to me is that this role owns both animal intake and care-record accuracy. That fits my fictional Moonrise Wildlife Sanctuary background, where I coordinate intake details and volunteer coverage. The timing makes sense because I am ready to take broader ownership of animal-care operations.',
            breakdown: {
              Observation: 'What specifically stood out to you about the role or company?',
              Fit: 'Why does that connect to your background?',
              Timing: 'Why does this move make sense now?',
            },
            annotatedStrongAnswer: [
              { label: 'Observation', text: 'What stood out to me is that this role owns both animal intake and care-record accuracy.', detail: 'A strong Observation points to something real about the role instead of generic praise.' },
              { label: 'Fit', text: 'That fits my fictional Moonrise Wildlife Sanctuary background, where I coordinate intake details and volunteer coverage.', detail: 'Fit explains the connection between the opportunity and the fictional candidate’s background.' },
              { label: 'Timing', text: 'The timing makes sense because I am ready to take broader ownership of animal-care operations.', detail: 'Timing explains why this move makes sense now, not just why the candidate wants change.' },
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
              'What stood out to me is that this role owns both animal intake and care-record accuracy. That fits my fictional Moonrise Wildlife Sanctuary background, where I coordinate intake details and volunteer coverage. The timing makes sense because I am ready to take broader ownership of animal-care operations.',
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
          { type: 'multiple_choice', question: 'What is the biggest weakness in this fictional answer? "During a wildlife intake, the arrival time changed late. My job was to help the sanctuary respond. I communicated with everyone involved and worked hard to keep things moving. In the end, the animal arrived safely."', options: ['The Situation is too short', 'The Task is too specific', 'The Action is too vague', 'The Result is too long'], correctIndex: 2, explanation: 'Communicated and worked hard do not tell the interviewer what the candidate actually did.' },
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
