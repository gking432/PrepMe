/**
 * Mock feedback data for admin preview.
 * Allows viewing the post-interview UI without completing an actual interview.
 */

const ADMIN_EMAIL = 'gunnarneuman60@gmail.com'

export function isAdminPreview(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL
}

export const MOCK_FEEDBACK = {
  overall_score: 6.2,
  strengths: [
    'Clear communication style with professional tone',
    'Demonstrated genuine enthusiasm for the role',
    'Asked thoughtful questions about team structure',
  ],
  weaknesses: [
    'Answers lacked specific examples and metrics',
    'Rambling responses without clear structure',
    'Limited knowledge of company products and market position',
  ],
  detailed_feedback:
    'You showed strong interpersonal skills and genuine interest in the role. However, several answers lacked the specificity interviewers look for — you spoke in generalities rather than citing concrete accomplishments. Structuring your answers using the STAR method would significantly improve your impact.',
  hr_screen_six_areas: {
    what_went_well: [
      {
        criterion: 'Pace and Conversation Flow',
        feedback:
          'You maintained a natural conversational rhythm throughout. No awkward pauses or rushing.',
        score: 8,
        evidence: [
          {
            question_id: 'q1',
            timestamp: '0:45',
            excerpt:
              'The candidate maintained a comfortable pace and demonstrated active listening by referencing the interviewer\'s earlier comments.',
          },
        ],
      },
      {
        criterion: 'Preparation / Curiosity',
        feedback:
          'You asked insightful questions about team dynamics and growth opportunities that showed genuine research.',
        score: 7.5,
        evidence: [
          {
            question_id: 'q7',
            timestamp: '12:30',
            excerpt:
              'Asked how the sanctuary plans volunteer coverage and animal transfers during seasonal intake surges.',
          },
        ],
      },
      {
        criterion: 'Alignment of Career Goals with Position',
        feedback:
          'Your explanation of why this role fits your trajectory was convincing and well-articulated.',
        score: 7,
        evidence: [
          {
            question_id: 'q2',
            timestamp: '2:15',
            excerpt:
              'Connected wildlife intake and care-record experience to the operations responsibilities of this role.',
          },
        ],
      },
    ],
    what_needs_improve: [
      {
        criterion: 'Professional Story',
        feedback:
          'Your answers tended to ramble without a clear beginning, middle, and end. The interviewer had to redirect you twice.',
        score: 4,
        rootCause: 'professional_story',
        rewrite_method: 'Present, Past, Future',
        rewritten_answer:
          'Right now, my work centers on keeping wildlife intake and daily care operations safe and organized. I built that foundation in hands-on animal-care roles where accurate records, calm decisions, and reliable shift handoffs mattered every day. I am now looking for a sanctuary role where I can take broader ownership of intake coordination, volunteer coverage, and care routines.',
        rewrite_explanation:
          'This keeps the same details but turns them into Present, Past, Future instead of a long challenge story.',
        evidence: [
          {
            question_id: 'q3',
            timestamp: '4:20',
            excerpt:
              'When asked about a challenging project, the response went on for over 3 minutes without a clear conclusion or result.',
            question: 'Tell me about a time you faced a significant challenge at work. How did you handle it?',
          },
        ],
      },
      {
        criterion: 'Specific Examples and Evidence',
        feedback:
          'You used phrases like "I usually" and "I tend to" instead of citing specific instances with measurable outcomes.',
        score: 3.5,
        rootCause: 'lack_of_specificity',
        rewrite_method: 'STAR with concrete metrics',
        original_answer: 'I\'m generally good at managing multiple priorities. I usually just make a list and work through things.',
        rewritten_answer:
          'During a spring intake surge, an injured heron arrived while two animal transfers and a medication round were already underway. I reassigned volunteer coverage, confirmed the transfer paperwork, and created a visible priority board for the care team. Every animal received its scheduled care, and both transfers left on time with complete records.',
        rewrite_explanation:
          'This replaces vague habits with a specific situation, clear actions, and measurable results the interviewer can verify.',
        evidence: [
          {
            question_id: 'q4',
            timestamp: '6:10',
            excerpt:
              'Said "I\'m generally good at managing multiple priorities" without giving a concrete example of when this was tested.',
            question: 'How do you prioritize when you have multiple competing deadlines?',
          },
        ],
      },
      {
        criterion: 'Handling Uncertain/Difficult Questions',
        feedback:
          'When asked about a gap in your experience, you deflected rather than addressing it directly with transferable skills.',
        score: 4.5,
        rootCause: 'off_topic',
        rewrite_method: 'Acknowledge, Bridge, Prove',
        original_answer: 'I have not handled large raptor transfers directly, but I have helped with several smaller wildlife transports.',
        rewritten_answer:
          'I have not led a large raptor transfer yet, so I would not overstate that experience. I have coordinated smaller wildlife transports using species-specific checklists, complete medical records, and confirmed receiving staff. I would bring that same discipline while learning Moonrise\'s raptor protocols from the licensed care team.',
        rewrite_explanation:
          'Instead of deflecting to personal projects, this names the gap honestly and immediately bridges to transferable proof the interviewer can trust.',
        evidence: [
          {
            question_id: 'q5',
            timestamp: '8:45',
            excerpt:
              'When asked about large raptor transfers, spoke generally about transport work without clearly naming the experience gap.',
            question: 'What experience do you have coordinating large raptor transfers?',
          },
        ],
      },
    ],
  },
  full_rubric: {
    overall_assessment: {
      overall_score: 6.2,
      likelihood_to_advance: 'likely',
      summary:
        'The candidate shows strong interpersonal skills and genuine interest but needs to sharpen answer specificity and structure. With targeted practice on the STAR method and example mining, they would be a stronger candidate.',
    },
    traditional_hr_criteria: {
      communication_skills: {
        score: 4,
        max: 5,
        components: {
          clarity: 4,
          articulation: 4,
          pacing: 5,
          tone: 4,
          listening: 4,
          language: 3,
        },
        feedback: 'Generally clear and professional, but occasionally verbose.',
      },
      professionalism: {
        passed: true,
        components: {
          greeting: true,
          closing: true,
          tone: true,
          environment: true,
          etiquette: true,
        },
      },
      basic_qualifications: {
        score: 6,
        max: 10,
        alignment: {
          met: ['Wildlife intake', 'Care-team communication', 'Volunteer scheduling'],
          missing: ['Large raptor transfer leadership', 'State permit reporting'],
          transferable: ['Animal-care recordkeeping', 'Emergency intake coordination'],
        },
      },
      interest_enthusiasm: {
        score: 4,
        max: 5,
        indicators: {
          company_knowledge: 'moderate',
          energy_level: 'high',
          follow_up_questions: 3,
        },
      },
      culture_fit: {
        passed: true,
        components: {
          work_style: 'collaborative',
          values_alignment: 'good',
          collaboration: true,
        },
      },
      response_quality: {
        score: 3,
        max: 5,
        metrics: {
          directness: 2,
          example_strength: 2,
          vagueness_count: 4,
          avg_response_length: 'long',
        },
      },
      red_flags: {
        present: false,
        flags: [],
      },
    },
  },
}

export const MOCK_TRANSCRIPT = {
  messages: [
    {
      speaker: 'interviewer',
      text: 'Thanks for taking the time to speak with me today. Can you start by telling me a bit about yourself and why you\'re interested in this role?',
      timestamp: '0:00',
      question_id: 'q1',
    },
    {
      speaker: 'candidate',
      text: 'Of course! I have worked in wildlife intake and animal-care operations for about six years. I started in a small field hospital, where I prepared enclosures, maintained care logs, and supported safe transfers. What drew me to this role is the opportunity to coordinate those routines across a larger sanctuary and volunteer team.',
      timestamp: '0:15',
      question_id: 'q1',
    },
    {
      speaker: 'interviewer',
      text: 'That is helpful context. Why are you interested in moving from a small rescue center to a larger sanctuary?',
      timestamp: '1:45',
      question_id: 'q2',
    },
    {
      speaker: 'candidate',
      text: 'I value the hands-on experience I have gained at a small rescue, especially during urgent intakes. I am ready to learn a wider range of species protocols and take more ownership of volunteer scheduling, transport planning, and care records. A larger sanctuary would let me build those skills while staying close to daily animal care.',
      timestamp: '2:15',
      question_id: 'q2',
    },
    {
      speaker: 'interviewer',
      text: 'Tell me about a time you faced a significant challenge at work. How did you handle it?',
      timestamp: '3:50',
      question_id: 'q3',
    },
    {
      speaker: 'candidate',
      text: 'Oh, there have been so many challenges. I think one that stands out... well, there was this project where we had a really tight deadline and the team was feeling overwhelmed. And I had to kind of step in and figure out how to, you know, reprioritize things. It was challenging because everyone had different opinions about what was most important. So I tried to listen to everyone and then we came up with a plan. It was stressful but we got through it. I generally try to stay calm in those situations and focus on what matters most. The team appreciated that I was willing to roll up my sleeves and help out wherever needed.',
      timestamp: '4:20',
      question_id: 'q3',
    },
    {
      speaker: 'interviewer',
      text: 'How do you prioritize when you have multiple competing deadlines?',
      timestamp: '7:30',
      question_id: 'q4',
    },
    {
      speaker: 'candidate',
      text: 'I\'m generally good at managing multiple priorities. I tend to make lists and figure out what\'s most urgent versus what\'s most important. I usually check in with stakeholders to understand their expectations and then I work backwards from the deadline. I try to be transparent about what\'s realistic and what might need to slip. Communication is really key in those situations, I think.',
      timestamp: '7:45',
      question_id: 'q4',
    },
    {
      speaker: 'interviewer',
      text: 'What experience do you have coordinating large raptor transfers?',
      timestamp: '9:15',
      question_id: 'q5',
    },
    {
      speaker: 'candidate',
      text: 'I have not led a large raptor transfer directly. I have supported smaller bird and mammal transports by preparing carriers, confirming treatment notes, and coordinating arrival times with the receiving facility. I know the safety requirements become more specialized with large raptors, so I would want to learn Moonrise\'s exact protocol from the licensed team before taking ownership.',
      timestamp: '9:30',
      question_id: 'q5',
    },
    {
      speaker: 'interviewer',
      text: 'What questions do you have for me about the team or the role?',
      timestamp: '11:45',
      question_id: 'q7',
    },
    {
      speaker: 'candidate',
      text: 'I would love to know how Moonrise plans staffing and animal transfers during the spring intake surge. What would this coordinator own directly, and what would strong performance look like during the first six months?',
      timestamp: '12:30',
      question_id: 'q7',
    },
  ],
  questions_asked: [
    { id: 'q1', question: 'Tell me about yourself and why you\'re interested in this role.' },
    { id: 'q2', question: 'Why are you interested in moving from a small rescue center to a larger sanctuary?' },
    { id: 'q3', question: 'Tell me about a time you faced a significant challenge at work.' },
    { id: 'q4', question: 'How do you prioritize when you have multiple competing deadlines?' },
    { id: 'q5', question: 'What experience do you have coordinating large raptor transfers?' },
    { id: 'q7', question: 'What questions do you have for me about the team or the role?' },
  ],
}

export const MOCK_SESSION_DATA = {
  id: 'mock-session-preview',
  stage: 'hr_screen',
  completed_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  duration_seconds: 840, // 14 minutes
}
