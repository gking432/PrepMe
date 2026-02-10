// Test endpoint: seeds a complete Hiring Manager interview + feedback so you can
// preview the feedback page display without running a real interview.
//
// Usage:  POST /api/test/hiring-manager-feedback
//         (or visit in browser — we support GET too for convenience)
//
// After hitting this endpoint, go to /interview/feedback and the Hiring Manager
// tab should show the full display with realistic mock data.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ── Mock data ──────────────────────────────────────────────────────────────

const testResume = `Sarah Johnson
Senior Software Engineer
Email: sarah.johnson@example.com | Phone: (555) 234-5678 | LinkedIn: linkedin.com/in/sarahjohnson

EXPERIENCE:
Senior Software Engineer | CloudScale Inc | 2021 - Present
- Architected and led migration from monolith to microservices, reducing deploy times by 70%
- Designed real-time data pipeline processing 2M+ events/day using Kafka and Flink
- Led team of 8 engineers, conducted code reviews, and established engineering standards
- Reduced infrastructure costs by 40% through Kubernetes optimization
- Technologies: Go, Python, React, AWS, Kubernetes, Kafka, PostgreSQL

Software Engineer | DataFlow Systems | 2018 - 2021
- Built distributed task scheduling system handling 500K+ daily jobs
- Implemented API gateway with rate limiting serving 10M+ requests/day
- Developed monitoring dashboards reducing incident response time by 50%
- Technologies: Java, Spring Boot, React, GCP, Redis, Elasticsearch

Junior Developer | WebStart Agency | 2016 - 2018
- Developed full-stack web applications for 15+ clients
- Built reusable component library adopted by entire frontend team

EDUCATION:
MS Computer Science | MIT | 2016
BS Computer Science | UC Berkeley | 2014

SKILLS:
Go, Python, Java, TypeScript, React, AWS, GCP, Kubernetes, Docker, Kafka, PostgreSQL, Redis, System Design, Technical Leadership`

const testJobDescription = `Company: TechForward Inc
Position: Staff Software Engineer

TechForward is a Series C startup building the next generation of developer tools. We're looking for a Staff Software Engineer to lead our platform team.

RESPONSIBILITIES:
- Design and build scalable distributed systems serving millions of developers
- Lead technical architecture decisions and drive engineering best practices
- Mentor senior engineers and contribute to engineering culture
- Own end-to-end delivery of critical platform features
- Collaborate with product and design on technical strategy

REQUIREMENTS:
- 6+ years of software engineering experience
- Deep expertise in distributed systems and microservices architecture
- Strong experience with cloud platforms (AWS/GCP)
- Track record of technical leadership and mentoring
- Experience with high-throughput, low-latency systems
- Strong communication skills and ability to influence cross-functional teams

PREFERRED:
- Experience at high-growth startups
- Contributions to open-source projects
- Experience with developer tools or platform engineering`

const testTranscript = `Interviewer: Thanks for coming in Sarah. I'm Mark, the VP of Engineering. I've reviewed your resume and I'm really excited to dig deeper into your experience. Let's start — can you walk me through the microservices migration you led at CloudScale?

Candidate: Absolutely. When I joined CloudScale, we had a monolithic Ruby application that was becoming a bottleneck. Deployments took 4 hours and any change risked breaking unrelated features. I proposed and led the migration to a microservices architecture over 18 months. We identified 12 bounded contexts, created a migration roadmap, and used the strangler fig pattern to incrementally extract services. The key challenge was maintaining data consistency — we implemented an event-driven architecture using Kafka for inter-service communication, which also gave us the foundation for our real-time data pipeline.

Interviewer: That's impressive. What was the hardest technical decision you had to make during that migration?

Candidate: The hardest decision was around data ownership. Several services needed access to user data, and the team was split between a shared database approach and full data independence. I pushed for eventual consistency with domain events, which was controversial because it meant accepting slightly stale data in some contexts. I built a proof-of-concept showing the latency was under 200ms for 99th percentile, and the team agreed. In hindsight, it was the right call — it let each team deploy independently and we went from weekly deploys to multiple daily deploys.

Interviewer: How did you handle the team dynamics when there was disagreement?

Candidate: I've learned that strong opinions loosely held is the way to go. When there was pushback on eventual consistency, I didn't just argue my position — I organized a design review where each approach was presented with tradeoffs. I also built that POC I mentioned, because data speaks louder than opinions. Once people saw the latency numbers and the deployment independence, the consensus shifted. I think the key is making it safe to disagree and letting evidence guide decisions rather than hierarchy.

Interviewer: Tell me about a time something went wrong in production. How did you handle it?

Candidate: During the migration, we had a nasty incident where our event pipeline backed up and we lost about 2 hours of order data. It was during Black Friday weekend, so the stakes were high. I led the incident response — first we failover to the legacy system which was still running in parallel (that was a deliberate safety net I'd insisted on). Then I identified the root cause: our Kafka consumers were hitting a serialization bug with a specific message format we hadn't tested. We fixed it, replayed events from the dead letter queue, and had full data recovery within 6 hours. After that, I implemented chaos engineering practices — we now regularly inject failures to test our resilience.

Interviewer: You mentioned leading a team of 8. How do you approach mentoring engineers who are less experienced than you?

Candidate: I believe in giving people slightly more challenge than they think they can handle, with a strong safety net. For example, I had a junior engineer who was nervous about owning a service extraction. Instead of doing it myself, I paired with her on the design, gave her ownership of the implementation, and scheduled daily 15-minute check-ins. She knocked it out of the park and it became her biggest confidence booster. I also run weekly architecture sessions where anyone can propose a design and get feedback — it's not about seniority, it's about ideas.

Interviewer: Where do you see yourself technically in the next 3-5 years?

Candidate: I'm at a point where I want to have broader impact. I'm drawn to staff-plus roles where I can shape technical strategy, not just execute it. I want to build platforms that make other engineers more productive — that's what excites me about TechForward's mission. I also want to keep my hands in the code. I've seen too many senior engineers become pure managers and lose touch with the technical reality. I want to be the person who can both design the system and debug the gnarly production issue at 2am.

Interviewer: That aligns well with what we're looking for. Last question — what questions do you have for me about TechForward?

Candidate: I'd love to understand the current technical architecture and where the biggest scaling challenges are. Also, what does the engineering culture look like day-to-day? And honestly — what keeps you up at night as VP of Engineering?`

// The mock rubric that Claude would generate
const mockHiringManagerRubric = {
  rubric_version: '2.0',
  interview_type: 'hiring_manager',
  session_metadata: {
    session_id: 'test-hm-session',
    candidate_name: 'Sarah Johnson',
    position: 'Staff Software Engineer',
    company: 'TechForward Inc',
    interview_date: new Date().toISOString(),
    interview_duration_seconds: 1800,
  },
  overall_assessment: {
    overall_score: 8.5,
    likelihood_to_advance: 'likely',
    key_strengths: [
      'Exceptional depth in distributed systems — demonstrated real architectural decision-making with the Kafka/eventual consistency approach',
      'Strong leadership skills — evidence of empowering team members rather than micromanaging',
      'Excellent incident response methodology with proactive safety nets (parallel legacy system)',
      'Clear growth trajectory aligned with the Staff Engineer role',
    ],
    key_weaknesses: [
      'Could have provided more specific metrics on team velocity improvements',
      'Limited discussion of cross-functional collaboration beyond engineering',
      'Did not address experience with developer tools specifically (core to role)',
    ],
    executive_summary: 'Sarah is a strong candidate for the Staff Software Engineer role. She demonstrated deep technical expertise in distributed systems, strong leadership through evidence-based decision-making, and excellent incident management. Her career trajectory aligns well with the role. Minor gaps in addressing developer tools experience and cross-functional collaboration could be explored in subsequent rounds.',
    summary: 'Sarah is a strong candidate for the Staff Software Engineer role. She demonstrated deep technical expertise in distributed systems, strong leadership through evidence-based decision-making, and excellent incident management. Her career trajectory aligns well with the role.',
  },
  hiring_manager_criteria: {
    scores: {
      depth_of_knowledge: 9,
      problem_solving: 8,
      impact_and_results: 8,
      role_alignment: 7,
      growth_and_self_awareness: 9,
      red_flags: 9,
    },
    feedback: {
      depth_of_knowledge: 'Sarah demonstrated exceptional depth in distributed systems. Her explanation of the strangler fig migration pattern, Kafka event-driven architecture, and eventual consistency tradeoffs showed mastery, not just familiarity. She could explain the "why" behind every decision.',
      problem_solving: 'Strong structured thinking demonstrated in the migration approach (identify bounded contexts → roadmap → incremental extraction). The incident response showed excellent prioritization (failover first, root cause second, prevention third). Could have been more specific about how she evaluates multiple solution approaches.',
      impact_and_results: 'Good quantification — 70% deploy time reduction, 2M+ events/day, 40% cost reduction. The Black Friday incident recovery was well-articulated with timeline. Would have liked to see more metrics around team velocity and developer satisfaction improvements.',
      role_alignment: 'Strong alignment on distributed systems, technical leadership, and mentoring — all critical for Staff role. Gap: did not specifically address developer tools experience, which is TechForward\'s core domain. Her platform engineering experience is relevant but the connection could have been more explicit.',
      growth_and_self_awareness: 'Excellent self-awareness about career trajectory. The comment about senior engineers losing touch with code shows thoughtful reflection. Her mentoring philosophy ("slightly more challenge with a safety net") demonstrates mature leadership thinking. She clearly knows what she wants and why.',
      red_flags: 'No significant concerns. Answers were specific and consistent with resume claims. No blame-shifting — took ownership of both successes and the production incident. The one minor note: she was slightly defensive when discussing the eventual consistency pushback, but this is very minor.',
    },
  },
  role_specific_criteria: {
    criteria_identified: [
      {
        name: 'Distributed Systems Architecture',
        score: 9,
        feedback: 'Deep expertise demonstrated through the microservices migration story. Understanding of event-driven architecture, eventual consistency, and the strangler fig pattern shows real-world mastery. The Kafka implementation handling 2M+ events/day is directly relevant to TechForward\'s scale requirements.',
      },
      {
        name: 'Technical Leadership & Influence',
        score: 8,
        feedback: 'Strong evidence of leading through influence rather than authority. The design review approach and POC-driven decision-making show Staff-level leadership. The mentoring example with the junior engineer was particularly compelling. Could demonstrate more cross-functional influence beyond engineering.',
      },
      {
        name: 'Production Operations & Reliability',
        score: 9,
        feedback: 'The Black Friday incident response was textbook excellent — failover to safety net, root cause analysis, data recovery, and then proactive chaos engineering implementation. This shows someone who thinks about reliability as a first-class concern, not an afterthought.',
      },
      {
        name: 'Developer Tools / Platform Experience',
        score: 6,
        feedback: 'While Sarah has strong platform engineering skills (CI/CD, monitoring, infrastructure), she did not directly address experience building developer tools — which is TechForward\'s core product. Her experience is transferable but the gap should be explored further.',
      },
    ],
  },
  time_management_analysis: {
    per_question_timing: [
      { question: 'Microservices migration walkthrough', estimated_duration: '3 min', quality: 'excellent' },
      { question: 'Hardest technical decision', estimated_duration: '2.5 min', quality: 'excellent' },
      { question: 'Team disagreement handling', estimated_duration: '2 min', quality: 'good' },
      { question: 'Production incident', estimated_duration: '3 min', quality: 'excellent' },
      { question: 'Mentoring approach', estimated_duration: '2 min', quality: 'good' },
      { question: 'Career trajectory', estimated_duration: '2 min', quality: 'good' },
      { question: 'Questions for interviewer', estimated_duration: '1 min', quality: 'good' },
    ],
    overall_pace: 'Well-paced. Longer answers on technical depth questions were appropriate given the complexity. Could have elaborated more on mentoring and career questions.',
  },
  question_analysis: {
    questions: [
      {
        question_id: 'q1',
        question: 'Walk me through the microservices migration at CloudScale',
        quality: 'excellent',
        notes: 'Comprehensive answer covering motivation, approach, timeline, and technical details. Used the STAR method naturally.',
      },
      {
        question_id: 'q2',
        question: 'Hardest technical decision during migration',
        quality: 'excellent',
        notes: 'Showed strong decision-making framework — evaluated tradeoffs, built POC for evidence, and reflected on the outcome.',
      },
      {
        question_id: 'q3',
        question: 'Handling team disagreement',
        quality: 'good',
        notes: 'Good answer about evidence-based decision making and psychological safety. Could have provided more specifics on navigating interpersonal dynamics.',
      },
      {
        question_id: 'q4',
        question: 'Production incident handling',
        quality: 'excellent',
        notes: 'Textbook incident response: failover → root cause → fix → prevent. Bonus points for the proactive chaos engineering implementation.',
      },
      {
        question_id: 'q5',
        question: 'Mentoring approach',
        quality: 'good',
        notes: 'Good philosophy and specific example. Could have discussed mentoring more senior engineers, which is critical for Staff role.',
      },
      {
        question_id: 'q6',
        question: 'Career trajectory',
        quality: 'good',
        notes: 'Clear vision aligned with the role. Thoughtful about staying technical. Could have connected more explicitly to TechForward\'s mission.',
      },
    ],
  },
  next_steps_preparation: {
    ready_for_next_round: true,
    confidence_level: 'high',
    improvement_suggestions: [
      'Prepare specific examples of building developer tools or platform products — this is TechForward\'s core business',
      'Quantify team velocity improvements and developer satisfaction metrics from your leadership',
      'Prepare examples of cross-functional collaboration (with product, design, business stakeholders)',
      'Research TechForward\'s specific technical architecture to show deeper interest in the role',
    ],
    practice_recommendations: {
      immediate_focus_areas: [
        'Developer tools experience — bridge the gap between platform engineering and developer tooling',
        'Cross-functional influence — examples of working with non-engineering stakeholders',
        'Metrics-driven leadership — quantify your impact on team productivity, not just system performance',
      ],
    },
    areas_to_study: [
      {
        topic: 'Developer Experience (DX) best practices',
        reason: 'TechForward builds developer tools, so understanding DX principles is critical',
        preparation_tip: 'Read about how companies like Vercel, Stripe, and GitHub think about developer experience',
      },
      {
        topic: 'Platform engineering vs. developer tools',
        reason: 'You have strong platform experience but need to articulate how it translates to building developer-facing products',
        preparation_tip: 'Prepare a story about how your platform work improved developer productivity and how you measured it',
      },
    ],
    predicted_next_round_questions: [
      'How would you design a CI/CD platform that serves 100K+ developers?',
      'Tell me about a time you had to influence a product direction without direct authority',
      'How do you balance platform stability with shipping new features quickly?',
      'What\'s your approach to building a strong engineering culture from scratch?',
    ],
  },
  comparative_analysis: {
    resume_vs_interview: 'Resume claims were well-supported by interview answers. The microservices migration, team leadership, and production incident stories were all consistent with and more detailed than resume bullet points. The only gap was the developer tools angle — resume focuses on infrastructure/platform, and interview didn\'t bridge this to developer tooling.',
    job_requirements_gaps: [
      'Developer tools experience — has platform engineering experience but didn\'t specifically address building developer-facing tools',
      'Cross-functional collaboration — demonstrated strong engineering leadership but limited examples of working with product/design/business',
    ],
    standout_qualities: [
      'Evidence-based decision making — consistently used data and POCs to drive decisions',
      'Proactive engineering — safety nets, chaos engineering, and scalable architecture show forward-thinking',
      'Empowering leadership style — grows the team rather than being the bottleneck',
    ],
    common_weaknesses_avoided: [
      'Did not blame others for the production incident',
      'Did not give vague or generic answers — every response had specific details',
      'Did not oversell — acknowledged gaps honestly',
    ],
    percentile_estimate: 85,
  },
  cross_stage_progress: {
    improvement_from_hr_screen: 'Sarah showed significantly more depth and confidence in the Hiring Manager round compared to her HR Screen. Her technical storytelling was stronger, with more specific metrics and clearer narrative structure. The leadership examples were new and compelling.',
    consistent_strengths: [
      'Excellent communication skills — articulate, concise, and structured',
      'Strong alignment with company mission and role requirements',
      'Genuine enthusiasm and engagement throughout the interview',
    ],
    persistent_weaknesses: [
      'Tendency to focus on technical achievements over people/business impact',
      'Could be more explicit about connecting past experience to the specific role',
    ],
    new_concerns: [
      'Developer tools experience gap was not apparent in HR Screen but became clear in the deeper technical discussion',
    ],
  },
  hiring_manager_six_areas: {
    what_went_well: [
      {
        criterion: 'Depth of Knowledge',
        feedback: 'Sarah demonstrated exceptional mastery of distributed systems, explaining complex concepts like the strangler fig pattern and eventual consistency with specific implementation details and measured outcomes.',
        evidence: [
          {
            question_id: 'q1',
            timestamp: '1:30',
            excerpt: 'We identified 12 bounded contexts, created a migration roadmap, and used the strangler fig pattern to incrementally extract services.',
          },
        ],
      },
      {
        criterion: 'Growth & Self-Awareness',
        feedback: 'Clear articulation of career goals and mature self-reflection about staying technical while increasing impact. The mentoring philosophy showed deep leadership thinking.',
        evidence: [
          {
            question_id: 'q6',
            timestamp: '18:00',
            excerpt: 'I\'ve seen too many senior engineers become pure managers and lose touch with the technical reality. I want to be the person who can both design the system and debug the gnarly production issue at 2am.',
          },
        ],
      },
      {
        criterion: 'Red Flags & Concerns',
        feedback: 'No red flags detected. Sarah was transparent about challenges, took ownership of both successes and failures, and provided consistent, specific answers throughout.',
        evidence: [
          {
            question_id: 'q4',
            timestamp: '12:00',
            excerpt: 'We had a nasty incident where our event pipeline backed up and we lost about 2 hours of order data. It was during Black Friday weekend.',
          },
        ],
      },
    ],
    what_needs_improve: [
      {
        criterion: 'Impact & Results',
        feedback: 'While technical metrics were strong (70% deploy time reduction, 2M+ events/day), Sarah could have better quantified her leadership impact — team velocity improvements, developer satisfaction scores, or hiring/retention outcomes.',
        evidence: [
          {
            question_id: 'q5',
            timestamp: '15:00',
            excerpt: 'I paired with her on the design, gave her ownership of the implementation, and scheduled daily 15-minute check-ins. She knocked it out of the park.',
          },
        ],
      },
      {
        criterion: 'Role Alignment',
        feedback: 'Strong alignment on distributed systems and leadership, but did not directly address experience building developer tools — TechForward\'s core product. The connection between platform engineering and developer tooling should have been made more explicit.',
        evidence: [
          {
            question_id: 'q6',
            timestamp: '18:00',
            excerpt: 'I want to build platforms that make other engineers more productive — that\'s what excites me about TechForward\'s mission.',
          },
        ],
      },
      {
        criterion: 'Problem-Solving Approach',
        feedback: 'Good structured thinking demonstrated, but could have been more explicit about how she evaluates multiple solution approaches and involves the team in decision-making frameworks beyond the one example given.',
        evidence: [
          {
            question_id: 'q2',
            timestamp: '5:00',
            excerpt: 'I pushed for eventual consistency with domain events, which was controversial because it meant accepting slightly stale data in some contexts.',
          },
        ],
      },
    ],
  },
}

// Also create a mock HR Screen feedback so cross-stage display works
const mockHrScreenFeedback = {
  overall_score: 8,
  strengths: [
    'Strong communication skills with clear and concise responses',
    'Good alignment between experience and role requirements',
    'Genuine enthusiasm for the company mission',
  ],
  weaknesses: [
    'Could provide more specific metrics when discussing achievements',
    'Limited discussion of cross-functional collaboration',
  ],
  suggestions: [
    'Prepare more quantified examples of impact',
    'Research the company more deeply before next round',
  ],
  detailed_feedback: 'Sarah performed well in the HR screen, demonstrating strong communication and genuine interest in the role.',
}

// ── Handler ────────────────────────────────────────────────────────────────

async function handler(request: NextRequest) {
  try {
    console.log('🧪 TEST: Seeding Hiring Manager feedback data...')

    // Find or create a test user
    let userId: string | null = null
    try {
      const { data: testUser } = await supabaseAdmin.auth.admin.listUsers()
      if (testUser?.users && testUser.users.length > 0) {
        userId = testUser.users[0].id
        console.log('Using existing user:', userId)
      }
    } catch {
      console.log('No existing users, using anonymous mode')
    }

    // 1. Create user_interview_data
    const { data: interviewData, error: dataError } = await supabaseAdmin
      .from('user_interview_data')
      .insert({
        user_id: userId,
        resume_text: testResume,
        job_description_text: testJobDescription,
        company_website: 'https://www.techforward.io',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dataError) {
      return NextResponse.json({ error: 'Failed to create interview data', details: dataError.message }, { status: 500 })
    }
    console.log('Created interview data:', interviewData.id)

    // 2. Create HR Screen session + feedback (for cross-stage)
    const { data: hrSession, error: hrSessionError } = await supabaseAdmin
      .from('interview_sessions')
      .insert({
        user_id: userId,
        user_interview_data_id: interviewData.id,
        stage: 'hr_screen',
        status: 'completed',
        transcript: 'HR Screen transcript...',
        completed_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        duration_seconds: 600,
      })
      .select()
      .single()

    if (hrSessionError) {
      return NextResponse.json({ error: 'Failed to create HR session', details: hrSessionError.message }, { status: 500 })
    }
    console.log('Created HR Screen session:', hrSession.id)

    const { error: hrFeedbackError } = await supabaseAdmin
      .from('interview_feedback')
      .insert({
        interview_session_id: hrSession.id,
        ...mockHrScreenFeedback,
      })

    if (hrFeedbackError) {
      console.warn('Warning: Could not create HR feedback (may already exist):', hrFeedbackError.message)
    }

    // 3. Create Hiring Manager session
    // Build structured transcript
    const messages: any[] = []
    const questions_asked: any[] = []
    const lines = testTranscript.split('\n').filter(l => l.trim())
    let qCount = 0
    let timeSeconds = 0

    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('Interviewer:')) {
        const text = trimmed.replace(/^Interviewer:\s*/, '')
        const isQuestion = text.includes('?') || text.toLowerCase().startsWith('tell me') || text.toLowerCase().startsWith('can you')
        const qId = isQuestion ? `q${++qCount}` : undefined
        const ts = `${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')}`
        messages.push({ speaker: 'interviewer', text, timestamp: ts, question_id: qId })
        if (isQuestion && qId) questions_asked.push({ id: qId, question: text, timestamp: ts })
        timeSeconds += 15
      } else if (trimmed.startsWith('Candidate:')) {
        const text = trimmed.replace(/^Candidate:\s*/, '')
        const ts = `${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')}`
        messages.push({ speaker: 'candidate', text, timestamp: ts })
        timeSeconds += 45
      }
    })

    const { data: hmSession, error: hmSessionError } = await supabaseAdmin
      .from('interview_sessions')
      .insert({
        user_id: userId,
        user_interview_data_id: interviewData.id,
        stage: 'hiring_manager',
        status: 'completed',
        transcript: testTranscript,
        transcript_structured: { messages, questions_asked, start_time: new Date().toISOString() },
        completed_at: new Date().toISOString(),
        duration_seconds: 1800,
      })
      .select()
      .single()

    if (hmSessionError) {
      return NextResponse.json({ error: 'Failed to create HM session', details: hmSessionError.message }, { status: 500 })
    }
    console.log('Created Hiring Manager session:', hmSession.id)

    // 4. Create Hiring Manager feedback with full rubric
    const { data: hmFeedback, error: hmFeedbackError } = await supabaseAdmin
      .from('interview_feedback')
      .insert({
        interview_session_id: hmSession.id,
        overall_score: Math.round(mockHiringManagerRubric.overall_assessment.overall_score),
        strengths: mockHiringManagerRubric.overall_assessment.key_strengths,
        weaknesses: mockHiringManagerRubric.overall_assessment.key_weaknesses,
        suggestions: mockHiringManagerRubric.next_steps_preparation.improvement_suggestions,
        detailed_feedback: mockHiringManagerRubric.overall_assessment.summary,
        area_scores: mockHiringManagerRubric.hiring_manager_criteria.scores,
        area_feedback: mockHiringManagerRubric.hiring_manager_criteria.feedback,
        full_rubric: mockHiringManagerRubric,
      })
      .select()
      .single()

    if (hmFeedbackError) {
      return NextResponse.json({ error: 'Failed to create HM feedback', details: hmFeedbackError.message }, { status: 500 })
    }
    console.log('Created Hiring Manager feedback:', hmFeedback.id)

    // Store session ID in response so frontend can pick it up
    const feedbackUrl = `/interview/feedback?stage=hiring_manager`

    return NextResponse.json({
      success: true,
      message: 'Mock Hiring Manager feedback seeded successfully!',
      data: {
        interviewDataId: interviewData.id,
        hrScreenSessionId: hrSession.id,
        hiringManagerSessionId: hmSession.id,
        feedbackId: hmFeedback.id,
      },
      next_step: `Visit ${feedbackUrl} to see the display. You may need to set localStorage: localStorage.setItem('last_interview_session_id', '${hmSession.id}')`,
      feedbackUrl,
    })
  } catch (error: any) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handler(request)
}

export async function GET(request: NextRequest) {
  return handler(request)
}
