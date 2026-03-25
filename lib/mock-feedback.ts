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
        criterion: 'Questions Asked About Role/Company',
        feedback:
          'You asked insightful questions about team dynamics and growth opportunities that showed genuine research.',
        score: 7.5,
        evidence: [
          {
            question_id: 'q7',
            timestamp: '12:30',
            excerpt:
              'Asked about the team\'s current tech stack migration and how the role would contribute to it.',
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
              'Connected previous experience in project management to the leadership aspects of this new role.',
          },
        ],
      },
    ],
    what_needs_improve: [
      {
        criterion: 'Answer Structure and Conciseness',
        feedback:
          'Your answers tended to ramble without a clear beginning, middle, and end. The interviewer had to redirect you twice.',
        score: 4,
        rootCause: 'poor_structure',
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
        evidence: [
          {
            question_id: 'q5',
            timestamp: '8:45',
            excerpt:
              'When asked about experience with enterprise clients, pivoted to talking about personal projects instead of addressing the gap honestly.',
            question: 'What experience do you have working with enterprise-level clients?',
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
          met: ['Project management', 'Team collaboration', 'Agile methodology'],
          missing: ['Enterprise client experience', 'Budget management over $1M'],
          transferable: ['Startup leadership experience', 'Cross-functional coordination'],
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
      text: 'Of course! I\'ve been working in project management for about five years now. I started at a small startup where I wore a lot of hats — managing sprints, talking to customers, even doing some light development. What drew me to this role specifically is the opportunity to lead a larger team and work on products that have real enterprise scale. I\'ve been following your company\'s work in the developer tools space and I think my background in building internal tooling at my current company translates really well.',
      timestamp: '0:15',
      question_id: 'q1',
    },
    {
      speaker: 'interviewer',
      text: 'That\'s great context. What made you decide to transition from a startup environment to a larger organization?',
      timestamp: '1:45',
      question_id: 'q2',
    },
    {
      speaker: 'candidate',
      text: 'I loved the startup experience — the speed, the autonomy, the ability to see your impact immediately. But I realized that to grow as a leader, I need to learn how to operate within more complex systems. At a startup, you can just walk over to someone\'s desk and make a decision. At scale, you need to build consensus, navigate cross-functional dependencies, and think more strategically about resource allocation. That\'s the muscle I want to build next in my career.',
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
      text: 'What experience do you have working with enterprise-level clients?',
      timestamp: '9:15',
      question_id: 'q5',
    },
    {
      speaker: 'candidate',
      text: 'So I haven\'t directly managed enterprise accounts, but I\'ve done a lot of interesting things on the side that are relevant. I built a personal project that got some traction — a task management tool that a few hundred people use. And in my current role, I\'ve worked with some of our larger customers on feature requests, though they\'re more mid-market than true enterprise. I think the principles are similar though — understanding complex needs, managing expectations, building relationships.',
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
      text: 'I\'d love to know more about the team\'s current tech stack migration I read about in the blog post. How would this role contribute to that? And what does the typical career path look like for someone in this position over the next two to three years?',
      timestamp: '12:30',
      question_id: 'q7',
    },
  ],
  questions_asked: [
    { id: 'q1', question: 'Tell me about yourself and why you\'re interested in this role.' },
    { id: 'q2', question: 'What made you decide to transition from a startup to a larger organization?' },
    { id: 'q3', question: 'Tell me about a time you faced a significant challenge at work.' },
    { id: 'q4', question: 'How do you prioritize when you have multiple competing deadlines?' },
    { id: 'q5', question: 'What experience do you have working with enterprise-level clients?' },
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
