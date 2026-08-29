/**
 * Mock feedback data for admin preview.
 * Allows viewing the post-interview UI without completing an actual interview.
 */

const ADMIN_EMAIL = 'gunnarneuman60@gmail.com'

export function isAdminPreview(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL
}

export const MOCK_FEEDBACK = {
  overall_score: 3.4,
  strengths: [],
  weaknesses: [
    'Answers lacked specific examples and observable outcomes',
    'Responses wandered without a clear structure',
    'Company preparation and end-of-interview curiosity were missing',
  ],
  detailed_feedback:
    'This fictional demo interview intentionally flags all six HR-screen areas so every coaching workshop can be explored.',
  hr_screen_six_areas: {
    what_went_well: [],
    what_needs_improve: [
      {
        criterion: 'Professional Story',
        feedback:
          'Your opening moved through job history without giving the interviewer a clear present, past, and future through-line.',
        score: 3.5,
        rootCause: 'professional_story',
        practice_focus_id: 'professional_story',
        rewrite_method: 'Present, Past, Future',
        original_answer:
          'I started at a small field hospital, then worked at a rescue center, and now I am looking around. I saw this posting and thought it looked interesting.',
        rewritten_answer:
          'Right now, my work centers on keeping wildlife intake and daily care operations safe and organized. I built that foundation in hands-on animal-care roles where accurate records, calm decisions, and reliable shift handoffs mattered every day. I am now looking for a sanctuary role where I can take broader ownership of intake coordination, volunteer coverage, and care routines.',
        rewrite_explanation:
          'This turns a chronological résumé summary into a focused Present, Past, Future story.',
        evidence: [
          {
            question_id: 'q1',
            timestamp: '0:15',
            excerpt:
              'I started at a small field hospital, then worked at a rescue center, and now I am looking around.',
            question: 'Tell me about yourself and why you\'re interested in this role.',
          },
        ],
      },
      {
        criterion: 'Specific Examples and Evidence',
        feedback:
          'You used phrases like "I usually" and "I tend to" instead of citing specific instances with measurable outcomes.',
        score: 3,
        rootCause: 'specificity_proof',
        practice_focus_id: 'specificity_proof',
        rewrite_method: 'STAR with concrete metrics',
        original_answer:
          'There was a project with a tight deadline. I listened to everyone, helped however I could, and we got through it.',
        rewritten_answer:
          'During a spring intake surge, an injured heron arrived while two animal transfers and a medication round were already underway. I reassigned volunteer coverage, confirmed the transfer paperwork, and created a visible priority board for the care team. Every animal received its scheduled care, and both transfers left on time with complete records.',
        rewrite_explanation:
          'This replaces vague habits with a specific situation, clear actions, and measurable results the interviewer can verify.',
        evidence: [
          {
            question_id: 'q3',
            timestamp: '4:20',
            excerpt:
              'I tried to listen to everyone and then we came up with a plan. It was stressful but we got through it.',
            question: 'Tell me about a time you faced a significant challenge at work. How did you handle it?',
          },
        ],
      },
      {
        criterion: 'Preparation / Curiosity',
        feedback:
          'You did not ask a question or mention a specific detail that showed preparation for Moonrise or the role.',
        score: 2.5,
        rootCause: 'preparation_curiosity',
        practice_focus_id: 'preparation_curiosity',
        rewrite_method: 'What You Know, What Stood Out, Your Question',
        original_answer: 'No, I think you covered everything.',
        rewritten_answer:
          'I saw that Moonrise is expanding seasonal intake and transport coordination. How would this role divide responsibility between animal-care staff, transport partners, and volunteers during the busiest intake weeks?',
        rewrite_explanation:
          'This uses one specific role detail to ask a thoughtful, stage-appropriate question.',
        evidence: [
          {
            question_id: 'q7',
            timestamp: '12:30',
            excerpt: 'No, I think you covered everything.',
            question: 'What questions do you have for me about the team or the role?',
          },
        ],
      },
      {
        criterion: 'Handling Uncertain/Difficult Questions',
        feedback:
          'When asked about an experience gap, you minimized the difference instead of answering honestly and showing a safe learning approach.',
        score: 3,
        rootCause: 'handling_uncertainty',
        practice_focus_id: 'handling_uncertainty',
        rewrite_method: 'Acknowledge, Bridge, Prove',
        original_answer: 'I have not done that exact thing, but transport is transport, so I am sure I could handle it.',
        rewritten_answer:
          'I have not led a large raptor transfer yet, so I would not overstate that experience. I have coordinated smaller wildlife transports using species-specific checklists, complete medical records, and confirmed receiving staff. I would bring that same discipline while learning Moonrise\'s raptor protocols from the licensed care team.',
        rewrite_explanation:
          'Instead of deflecting to personal projects, this names the gap honestly and immediately bridges to transferable proof the interviewer can trust.',
        evidence: [
          {
            question_id: 'q5',
            timestamp: '8:45',
            excerpt:
              'I have not done that exact thing, but transport is transport, so I am sure I could handle it.',
            question: 'What experience do you have coordinating large raptor transfers?',
          },
        ],
      },
      {
        criterion: 'Alignment of Career Goals with Position',
        feedback:
          'Your reason for pursuing the role was generic and did not connect a specific responsibility to your background or timing.',
        score: 3,
        rootCause: 'career_alignment',
        practice_focus_id: 'career_alignment',
        rewrite_method: 'Observation, Fit, Timing',
        original_answer: 'It seems like a bigger opportunity, and I am ready for something new.',
        rewritten_answer:
          'What stood out is that this role owns both animal intake and care-record accuracy. That connects to my background supporting wildlife transfers and maintaining treatment notes. The timing makes sense because I am ready to take broader responsibility for those operations.',
        rewrite_explanation:
          'This identifies a real role responsibility, connects it to relevant experience, and explains why the move makes sense now.',
        evidence: [
          {
            question_id: 'q2',
            timestamp: '2:15',
            excerpt: 'It seems like a bigger opportunity, and I am ready for something new.',
            question: 'Why are you interested in moving from a small rescue center to a larger sanctuary?',
          },
        ],
      },
      {
        criterion: 'Pace and Conversation Flow',
        feedback:
          'Your answer used repeated hedge phrases and several overlapping explanations, making the main point difficult to follow.',
        score: 3.5,
        rootCause: 'pace_natural_delivery',
        practice_focus_id: 'pace_natural_delivery',
        rewrite_method: 'Clean Start, Main Point, Landing',
        original_answer:
          'I am generally good at managing multiple priorities. I tend to make lists and figure out what is most urgent versus important, and I usually check with everyone, and communication is really key, I think.',
        rewritten_answer:
          'I separate urgent work from important work, confirm the real deadlines, and tell people early when two priorities conflict. That keeps the plan realistic and makes the next decision clear.',
        rewrite_explanation:
          'This preserves the approach while removing hedges, repetition, and unnecessary setup.',
        evidence: [
          {
            question_id: 'q4',
            timestamp: '7:45',
            excerpt:
              'I tend to make lists and figure out what\'s most urgent versus what\'s most important. I usually check in with stakeholders.',
            question: 'How do you prioritize when you have multiple competing deadlines?',
          },
        ],
      },
    ],
  },
  full_rubric: {
    overall_assessment: {
      overall_score: 3.4,
      likelihood_to_advance: 'unlikely',
      summary:
        'This fictional demo intentionally routes all six HR-screen criteria into repair so every workshop can be explored.',
    },
    traditional_hr_criteria: {
      communication_skills: {
        score: 2.5,
        max: 5,
        components: {
          clarity: 3,
          articulation: 3,
          pacing: 2,
          tone: 4,
          listening: 3,
          language: 2,
        },
        feedback: 'The tone was professional, but hedging and long answers often obscured the main point.',
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
        score: 2,
        max: 5,
        indicators: {
          company_knowledge: 'low',
          energy_level: 'moderate',
          follow_up_questions: 0,
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
      text: 'I started at a small field hospital, then worked at a rescue center, and now I am looking around. I saw this posting and thought it looked interesting.',
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
      text: 'It seems like a bigger opportunity, and I am ready for something new.',
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
      text: 'I have not done that exact thing, but transport is transport, so I am sure I could handle it.',
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
      text: 'No, I think you covered everything.',
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
