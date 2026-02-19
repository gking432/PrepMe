// API route to generate interview feedback
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { deductCredit } from '@/lib/credit-check'
import OpenAI from 'openai'
import { gradeHrScreenWithRetry, gradeHiringManagerWithRetry, gradeCultureFitWithRetry, gradeFinalRoundWithRetry, GradingMaterials } from '@/lib/claude-client'
import { validateHrScreenRubric, validateHiringManagerRubric, validateCultureFitRubric, validateFinalRoundRubric } from '@/lib/rubric-validator'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, transcript: providedTranscript } = await request.json()

    if (!sessionId) {
      console.error('Missing sessionId')
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Fetch transcript from database if not provided
    let transcript = providedTranscript
    if (!transcript) {
      const { data: sessionData, error: transcriptError } = await supabaseAdmin
        .from('interview_sessions')
        .select('transcript')
        .eq('id', sessionId)
        .maybeSingle() // Use maybeSingle() to handle missing sessions gracefully
      
      if (transcriptError) {
        console.error('Error fetching transcript from database:', transcriptError)
        console.error('  - SessionId:', sessionId)
        console.error('  - Error details:', transcriptError.message)
      }
      
      if (sessionData?.transcript && sessionData.transcript.trim().length > 0) {
        transcript = sessionData.transcript
      } else {
        console.error('No transcript found in database or request')
        console.error('  - SessionId:', sessionId)
        console.error('  - Session exists?', !!sessionData)
        console.error('  - Transcript value:', sessionData?.transcript ? `"${sessionData.transcript.substring(0, 100)}..."` : 'null/undefined')
        console.error('  - Transcript length:', sessionData?.transcript?.length || 0)
        return NextResponse.json(
          { error: 'No transcript found. Please complete the interview first.' },
          { status: 404 }
        )
      }
    }

    // Fetch interview session to get user_interview_data_id
    // Use supabaseAdmin to bypass RLS and ensure access
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('user_interview_data_id, stage')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      console.error('Session fetch error:', sessionError)
      console.error('Session data:', sessionData)
      return NextResponse.json(
        { error: 'Interview session not found', details: sessionError?.message },
        { status: 404 }
      )
    }

    // Stage gating: non-HR stages require authentication
    const stage = sessionData.stage
    if (stage && stage !== 'hr_screen') {
      const supabaseAuth = createRouteHandlerClient({ cookies })
      const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
      if (!authSession) {
        return NextResponse.json(
          { error: 'Authentication required to grade this interview stage.' },
          { status: 401 }
        )
      }
    }

    // Fetch job description, resume, and company website
    // Use supabaseAdmin to bypass RLS
    let jobDescription = ''
    let resume = ''
    let companyWebsite = ''
    if (sessionData.user_interview_data_id) {
      const { data: interviewData, error: dataError } = await supabaseAdmin
        .from('user_interview_data')
        .select('job_description_text, resume_text, company_website')
        .eq('id', sessionData.user_interview_data_id)
        .single()

      if (dataError) {
        console.error('Error fetching interview data:', dataError)
      } else if (interviewData) {
        jobDescription = interviewData.job_description_text || ''
        resume = interviewData.resume_text || ''
        companyWebsite = interviewData.company_website || ''
      }
    } else {
      console.warn('No user_interview_data_id in session')
    }
    
    // Fetch structured transcript and observer notes for graded stages
    let structuredTranscript = null
    let observerNotes = null
    if (['hr_screen', 'hiring_manager', 'culture_fit', 'final'].includes(sessionData.stage)) {
      const { data: sessionWithData } = await supabaseAdmin
        .from('interview_sessions')
        .select('transcript_structured, observer_notes, user_id')
        .eq('id', sessionId)
        .single()

      structuredTranscript = sessionWithData?.transcript_structured || null
      observerNotes = sessionWithData?.observer_notes || null
    }

    // Delete any existing feedback for this session before generating new (prevent duplicates)
    await supabaseAdmin
      .from('interview_feedback')
      .delete()
      .eq('interview_session_id', sessionId)

    // Fetch HR screen feedback for cross-stage intelligence (hiring_manager and later stages)
    let hrScreenFeedback = null
    if (sessionData.stage === 'hiring_manager') {
      // Get user_id from session
      const { data: sessionForUser } = await supabaseAdmin
        .from('interview_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single()

      if (sessionForUser?.user_id) {
        // Find the most recent completed HR screen for this user
        const { data: hrSession } = await supabaseAdmin
          .from('interview_sessions')
          .select('id')
          .eq('user_id', sessionForUser.user_id)
          .eq('stage', 'hr_screen')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (hrSession) {
          const { data: hrFeedbackRows } = await supabaseAdmin
            .from('interview_feedback')
            .select('overall_score, strengths, weaknesses, suggestions')
            .eq('interview_session_id', hrSession.id)
            .order('created_at', { ascending: false })
            .limit(1)
          const hrFeedbackData = hrFeedbackRows?.[0] || null

          if (hrFeedbackData) {
            hrScreenFeedback = {
              overall_score: hrFeedbackData.overall_score,
              strengths: hrFeedbackData.strengths || [],
              weaknesses: hrFeedbackData.weaknesses || [],
              suggestions: hrFeedbackData.suggestions || [],
            }
          }
        }
      }
    }

    // Fetch company website content for grader
    let websiteContent = null
    if (['hr_screen', 'hiring_manager', 'culture_fit', 'final'].includes(sessionData.stage) && companyWebsite) {
      try {
        const websiteResponse = await fetch(`${request.nextUrl.origin}/api/scrape-website`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: companyWebsite }),
        })
        
        if (websiteResponse.ok) {
          const websiteData = await websiteResponse.json()
          if (websiteData.success && websiteData.content) {
            websiteContent = websiteData.content
          }
        }
      } catch (error) {
        console.error('Error fetching website content for grader:', error)
        // Continue without website content
      }
    }

    // Fetch evaluation criteria
    // Use supabaseAdmin to bypass RLS for all feedback-related queries
    const { data: criteriaData, error: criteriaError } = await supabaseAdmin
      .from('feedback_evaluation_criteria')
      .select('*')
      .eq('is_active', true)
      .order('area_name')

    const criteria = criteriaData || []

    // Fetch stage-specific instructions (if they exist)
    const { data: stageInstructions, error: stageInstructionsError } = await supabaseAdmin
      .from('feedback_stage_instructions')
      .select('*')
      .eq('stage', stage)
      .maybeSingle()

    // Fetch global evaluation settings (fallback)
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('feedback_evaluation_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const settings = settingsData || {
      honesty_level: 'tough',
      evaluation_instructions: 'Provide honest, constructive feedback.',
      require_job_alignment: true,
      require_specific_examples: true,
    }

    // Use stage-specific instructions if available, otherwise use global
    const evaluationInstructions = stageInstructions?.evaluation_instructions || settings.evaluation_instructions

    // Build comprehensive system prompt
    let systemPrompt = evaluationInstructions || 'You are a rigorous, honest interview evaluator.'
    
    // Add stage context if stage-specific instructions exist
    if (stageInstructions) {
      systemPrompt += `\n\nINTERVIEW STAGE: ${stage.replace('_', ' ').toUpperCase()}`
      if (stageInstructions.focus_areas && stageInstructions.focus_areas.length > 0) {
        systemPrompt += `\n\nFOCUS AREAS FOR THIS STAGE: ${stageInstructions.focus_areas.join(', ')}`
      }
      if (stageInstructions.excluded_areas && stageInstructions.excluded_areas.length > 0) {
        systemPrompt += `\n\nAREAS TO DE-EMPHASIZE: ${stageInstructions.excluded_areas.join(', ')}`
      }
    }

    // For HR screen: Add 6-area evaluation instructions
    if (stage === 'hr_screen') {
      systemPrompt += `\n\n=== HR SCREEN 6-AREA EVALUATION ===
You are evaluating an HR phone screen interview. You will receive:
- Job description
- Candidate's resume
${websiteContent ? '- Company website content' : ''}
- Full interview transcript${structuredTranscript ? ' (structured with question IDs)' : ''}

Your task is to assess the candidate on 6 specific criteria. For each criterion, determine whether it belongs in "What Went Well" or "What Needs to Improve" and provide a brief (1-2 sentence) explanation with evidence.

EVALUATION CRITERIA:

1. Answer Structure and Conciseness
   - "What Went Well" if: Answers are structured (e.g., situation-action-result), stay on topic, typically 30-90 seconds worth of content, and directly address the question
   - "Needs to Improve" if: Answers ramble beyond 2 minutes, jump between topics, are overly brief (one sentence when more detail expected), or fail to actually answer what was asked

2. Specific Examples and Evidence
   - "What Went Well" if: Uses at least 2-3 specific examples with details (companies, projects, metrics, outcomes) when discussing experience or skills
   - "Needs to Improve" if: Primarily uses generic statements like "I'm good at..." or "I usually..." without backing them up, or only provides vague examples without details

3. Questions Asked About the Role/Company
   - "What Went Well" if: Asks 2+ questions that demonstrate research (references company info, role specifics) or show strategic thinking about the position
   - "Needs to Improve" if: Asks no questions, only asks about logistics easily found online (salary, benefits, hours), or asks questions that show they didn't read the job description

4. Handling Uncertain/Difficult Questions
   - "What Went Well" if: Acknowledges gaps honestly ("I haven't done X, but I have done Y which is similar") and pivots to relevant strengths or learning ability
   - "Needs to Improve" if: Becomes defensive, tries to bluff through obvious knowledge gaps, gives contradictory information, or completely avoids answering

5. Alignment of Career Goals with Position
   - "What Went Well" if: Articulates clear connection between their background/goals and this specific role, mentions company mission/values, or explains what they hope to achieve/learn
   - "Needs to Improve" if: Gives generic reasons that could apply to any job ("it seems interesting"), focuses only on what they want to get out of it without mentioning contribution, or appears to be applying indiscriminately

6. Pace and Conversation Flow
   - "What Went Well" if: Responses flow naturally with appropriate pauses for thought (2-5 seconds), candidate doesn't interrupt, uses conversational transitions, and there's good back-and-forth
   - "Needs to Improve" if: Frequent awkward silences (10+ seconds), interrupts the interviewer multiple times, rushes through answers without pausing, or treats it like an interrogation rather than a conversation

IMPORTANT GUIDELINES:
- Be balanced: Not all 6 should go in the same category
- Be specific: Reference actual quotes or moments from the transcript
- Be fair: Consider the candidate's experience level based on their resume
- Be actionable: If something needs improvement, the feedback should indicate what specifically to work on
- Use question IDs and timestamps from structured transcript when available for evidence

OUTPUT FORMAT FOR 6 AREAS:
You MUST include a "hr_screen_six_areas" field in your JSON response with this structure:
{
  "hr_screen_six_areas": {
    "what_went_well": [
      {
        "criterion": "Answer Structure and Conciseness",
        "feedback": "[1-2 sentence explanation with specific reference to transcript]",
        "evidence": [
          {
            "question_id": "q2",
            "timestamp": "3:45",
            "excerpt": "candidate's response excerpt here..."
          }
        ]
      }
    ],
    "what_needs_improve": [
      {
        "criterion": "Specific Examples and Evidence",
        "feedback": "[1-2 sentence explanation with specific reference to transcript]",
        "evidence": [
          {
            "question_id": "q3",
            "timestamp": "5:20",
            "excerpt": "candidate's response excerpt here..."
          }
        ]
      }
    ]
  }
}

Each of the 6 criteria should appear in either "what_went_well" or "what_needs_improve" (not both).
`
      
      if (websiteContent) {
        systemPrompt += `\n\nCOMPANY WEBSITE CONTENT:
${websiteContent}
`
      }
      
      if (structuredTranscript) {
        systemPrompt += `\n\nSTRUCTURED TRANSCRIPT WITH QUESTION TRACKING:
${JSON.stringify(structuredTranscript, null, 2)}

Use the question IDs and timestamps from this structured transcript when providing evidence for your assessments.
`
      }
    }

    systemPrompt += '\n\nYOUR EVALUATION APPROACH:'
    systemPrompt += `\n- Honesty Level: ${settings.honesty_level.toUpperCase()}`
    systemPrompt += `\n- ${settings.require_job_alignment ? 'MUST' : 'Should'} compare responses directly against job requirements`
    systemPrompt += `\n- ${settings.require_specific_examples ? 'MUST' : 'Should'} reference specific examples from the transcript`

    if (jobDescription) {
      systemPrompt += '\n\nJOB DESCRIPTION:'
      systemPrompt += `\n${jobDescription}`
      systemPrompt += '\n\nYou MUST evaluate how well the candidate\'s responses align with these requirements. Be specific about gaps.'
    }

    if (resume) {
      systemPrompt += '\n\nCANDIDATE RESUME:'
      systemPrompt += `\n${resume}`
      systemPrompt += '\n\nUse this to understand the candidate\'s background and evaluate if their interview responses are consistent with their experience.'
    }

    // Apply stage-specific weight overrides if they exist
    const criteriaWithWeights = criteria.map((criterion) => {
      let weight = criterion.weight || 1.0
      
      // Apply stage-specific weight override if it exists
      if (stageInstructions?.weight_overrides && stageInstructions.weight_overrides[criterion.assessment_area] !== undefined) {
        weight = stageInstructions.weight_overrides[criterion.assessment_area]
      }
      
      return {
        ...criterion,
        weight: weight
      }
    })

    if (criteriaWithWeights.length > 0) {
      systemPrompt += '\n\nASSESSMENT AREAS AND CRITERIA:'
      criteriaWithWeights.forEach((criterion) => {
        systemPrompt += `\n\n${criterion.area_name} (Weight: ${criterion.weight}):`
        systemPrompt += `\nDescription: ${criterion.description}`
        systemPrompt += `\nEvaluation Guidelines: ${criterion.evaluation_guidelines}`
        systemPrompt += `\nScoring Rubric: ${criterion.rubric}`
      })
    }

    systemPrompt += '\n\nYOUR RESPONSE FORMAT:'
    systemPrompt += '\nYou MUST respond with valid JSON in this exact format:'
    systemPrompt += '\n{'
    systemPrompt += '\n  "overall_assessment": {'
    systemPrompt += '\n    "overall_score": <number 1-10>,'
    systemPrompt += '\n    "likelihood_to_advance": "<likely|unlikely|marginal>",'
    systemPrompt += '\n    "key_strengths": [<array of 3-5 key strengths with specific examples>],'
    systemPrompt += '\n    "key_weaknesses": [<array of 2-4 areas for improvement with specific examples>],'
    systemPrompt += '\n    "summary": "<comprehensive overall feedback paragraph>"'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "traditional_hr_criteria": {'
    systemPrompt += '\n    "scores": {'
    systemPrompt += '\n      "communication_skills": <number 1-10>,'
    systemPrompt += '\n      "professionalism": <number 1-10>,'
    systemPrompt += '\n      "basic_qualifications_match": <number 1-10>,'
    systemPrompt += '\n      "interest_and_enthusiasm": <number 1-10>,'
    systemPrompt += '\n      "culture_fit_indicators": <number 1-10>,'
    systemPrompt += '\n      "response_quality": <number 1-10>,'
    systemPrompt += '\n      "red_flags": <number 1-10>'
    systemPrompt += '\n    },'
    systemPrompt += '\n    "feedback": {'
    systemPrompt += '\n      "communication_skills": "<detailed feedback for communication skills, with specific examples from transcript>",'
    systemPrompt += '\n      "professionalism": "<detailed feedback for professionalism (greeting, closing, tone, environment, etiquette), with specific examples>",'
    systemPrompt += '\n      "basic_qualifications_match": "<detailed feedback on how well candidate matches basic job requirements (experience, skills, authorization, availability), with specific examples>",'
    systemPrompt += '\n      "interest_and_enthusiasm": "<detailed feedback on candidate interest and enthusiasm (company knowledge, energy level, questions asked), with specific examples>",'
    systemPrompt += '\n      "culture_fit_indicators": "<detailed feedback on culture fit (work style, values alignment, collaboration), with specific examples>",'
    systemPrompt += '\n      "response_quality": "<detailed feedback on response quality (relevance, specificity, honesty, conciseness), with specific examples>",'
    systemPrompt += '\n      "red_flags": "<detailed assessment of any red flags (concerning behavior, inconsistencies, inappropriate comments), with specific examples if any>"'
    systemPrompt += '\n    }'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "time_management_analysis": {'
    systemPrompt += '\n    "per_question_timing": [<array of timing objects with question_id, question_text, candidate_response_time, duration_seconds, assessment, target_range>],'
    systemPrompt += '\n    "total_interview_duration": "<formatted duration like 15:32>",'
    systemPrompt += '\n    "target_duration": "<target duration like 15-20 minutes>",'
    systemPrompt += '\n    "variance": "<variance from target, e.g., +2:15 or -0:45>",'
    systemPrompt += '\n    "questions_asked": <number of questions asked>,'
    systemPrompt += '\n    "overall_pace": "<detailed assessment of pacing with specific feedback>"'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "question_analysis": {'
    systemPrompt += '\n    "questions": [<array of question-level analysis objects>]'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "next_steps_preparation": {'
    systemPrompt += '\n    "ready_for_hiring_manager": <boolean - true if candidate should advance, false if not ready>,'
    systemPrompt += '\n    "confidence_level": "<string - Low|Medium-Low|Medium|Medium-High|High - confidence in readiness assessment>",'
    systemPrompt += '\n    "improvement_suggestions": [<array of actionable improvement suggestions>],'
    systemPrompt += '\n    "practice_recommendations": {'
    systemPrompt += '\n      "immediate_focus_areas": [<array of areas to practice>]'
    systemPrompt += '\n    },'
    systemPrompt += '\n    "areas_to_study": [<array of objects with topic, reason, and preparation_tip for each area>],'
    systemPrompt += '\n    "predicted_hiring_manager_questions": [<array of likely questions the hiring manager will ask>]'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "comparative_analysis": {'
    systemPrompt += '\n    "resume_vs_interview": "<detailed comparison text between resume claims and interview performance>",'
    systemPrompt += '\n    "job_requirements_gaps": [<array of specific gaps identified between candidate and job requirements>],'
    systemPrompt += '\n    "standout_qualities": [<array of 2-4 specific qualities that made this candidate stand out compared to typical candidates>],'
    systemPrompt += '\n    "common_weaknesses_avoided": [<array of 2-4 common interview mistakes that this candidate avoided>],'
    systemPrompt += '\n    "percentile_estimate": <number 0-100 - your best estimate of what percentile this candidate falls into based on typical HR screen performance>'
    systemPrompt += '\n  }'
    if (stage === 'hr_screen') {
      systemPrompt += ',\n  "hr_screen_six_areas": {<the 6-area assessment structure as described above>}'
    }
    systemPrompt += '\n}'
    
    systemPrompt += '\n\nCRITICAL: You MUST include ALL of these top-level fields in your JSON response:'
    systemPrompt += '\n- overall_assessment (with overall_score, likelihood_to_advance, key_strengths, key_weaknesses, summary)'
    systemPrompt += '\n- traditional_hr_criteria (with scores and feedback objects containing ALL 7 required criteria listed above)'
    systemPrompt += '\n- time_management_analysis'
    systemPrompt += '\n- question_analysis'
    systemPrompt += '\n- next_steps_preparation'
    systemPrompt += '\n- comparative_analysis'
    if (stage === 'hr_screen') {
      systemPrompt += '\n- hr_screen_six_areas (with what_went_well and what_needs_improve arrays)'
    }

    systemPrompt += '\n\nMANDATORY REQUIREMENTS FOR traditional_hr_criteria:'
    systemPrompt += '\nYou MUST include ALL 7 criteria in both "scores" and "feedback" objects with these EXACT names:'
    systemPrompt += '\n1. communication_skills'
    systemPrompt += '\n2. professionalism'
    systemPrompt += '\n3. basic_qualifications_match'
    systemPrompt += '\n4. interest_and_enthusiasm'
    systemPrompt += '\n5. culture_fit_indicators'
    systemPrompt += '\n6. response_quality'
    systemPrompt += '\n7. red_flags'
    systemPrompt += '\n\nDO NOT use alternative names like "communication", "cultural_fit", "job_alignment", etc.'
    systemPrompt += '\nDO NOT omit any of these 7 criteria. Every single one must be present with both a score and feedback text.'
    systemPrompt += '\nIf you cannot assess a criterion due to limited data, provide your best assessment based on available information, but you MUST still include it.'
    
    systemPrompt += '\n\nMANDATORY REQUIREMENTS FOR comparative_analysis:'
    systemPrompt += '\nYou MUST include ALL of these fields:'
    systemPrompt += '\n- resume_vs_interview: Detailed comparison text'
    systemPrompt += '\n- job_requirements_gaps: Array of specific gaps (can be empty array if no gaps)'
    systemPrompt += '\n- standout_qualities: Array of 2-4 specific qualities that made this candidate stand out'
    systemPrompt += '\n- common_weaknesses_avoided: Array of 2-4 common interview mistakes this candidate avoided'
    systemPrompt += '\n- percentile_estimate: Your best estimate (0-100) of where this candidate ranks compared to typical HR screen candidates'
    systemPrompt += '\n\nDO NOT calculate percentile from overall_score. Provide your honest assessment based on typical candidate performance.'
    systemPrompt += '\nDO NOT create generic placeholder text. All fields must contain real, specific assessments.'

    systemPrompt += '\n\nSCORING SCALE (STRICT - SCORES MUST ALIGN WITH YOUR ANALYSIS):'
    systemPrompt += '\nAll scores use a 1-10 scale. Your scores MUST match the severity and quality described in your analysis. Do not inflate scores.'
    systemPrompt += '\n\nScore Definitions (applies to ALL criteria):'
    systemPrompt += '\n- 1-2: Poor/Unacceptable - Major issues, significant gaps, does NOT meet basic requirements or expectations'
    systemPrompt += '\n- 3-4: Below Average - Noticeable problems, substantial gaps, partially meets requirements but has important deficiencies'
    systemPrompt += '\n- 5-6: Average/Adequate - Meets basic requirements, acceptable performance with some gaps or areas for improvement'
    systemPrompt += '\n- 7: Good - Exceeds basic expectations, solid performance with minor areas for improvement'
    systemPrompt += '\n- 8: Very Good - Strong performance, clearly above average, demonstrates clear competency'
    systemPrompt += '\n- 9: Excellent - Outstanding performance, exceptional demonstration of skills and fit'
    systemPrompt += '\n- 10: Exceptional - Perfect or near-perfect performance, exemplary in all areas'
    systemPrompt += '\n\nCRITICAL SCORING PRINCIPLE:'
    systemPrompt += '\nYour scores MUST match the severity and quality described in your analysis, regardless of which criterion you are evaluating.'
    systemPrompt += '\n- If your analysis describes poor performance, significant gaps, or failure to meet requirements → score MUST be 1-2/10'
    systemPrompt += '\n- If your analysis describes below-average performance or important deficiencies → score should be 3-4/10'
    systemPrompt += '\n- If your analysis describes adequate performance that meets basic requirements → score should be 5-6/10'
    systemPrompt += '\n- If your analysis describes good performance that exceeds expectations → score should be 7-8/10'
    systemPrompt += '\n- If your analysis describes excellent or outstanding performance → score should be 9-10/10'
    systemPrompt += '\n\nDO NOT inflate scores. A score must accurately reflect what your analysis describes:'
    systemPrompt += '\n- "Significant gaps" + "has none" of required qualifications → 1-2/10 (not 3-4/10)'
    systemPrompt += '\n- "Meets basic requirements" → 5-6/10 (fair score for competent users)'
    systemPrompt += '\n- "Exceeds expectations" → 7-8/10 (encouraging score for good performance)'
    systemPrompt += '\n\nRemember: You can write encouraging, constructive feedback text (this is a coaching tool), but the scores must honestly reflect the performance level described in your analysis.'

    systemPrompt += '\n\nCRITICAL INSTRUCTIONS:'
    systemPrompt += '\n- Be HONEST and DIRECT. Do not sugarcoat weaknesses.'
    systemPrompt += '\n- Reference SPECIFIC quotes or examples from the transcript.'
    systemPrompt += '\n- Compare responses to job requirements explicitly.'
    systemPrompt += '\n- If a candidate performed poorly, state it clearly with evidence.'
    systemPrompt += '\n- Balance honesty with constructive guidance - be tough but fair.'
    systemPrompt += '\n- Calculate overall_score as a weighted average of area_scores using the weights provided.'
    systemPrompt += '\n- Remember: You can write encouraging, actionable feedback while still giving honest scores that match your analysis.'

    // HR Screen: Use Claude Grader (three-agent architecture)
    if (stage === 'hr_screen') {
      try {
        // Build grading materials
        // Pass the full system prompt as gradingInstructions so Claude gets all the requirements
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt, // Pass the full system prompt with all requirements
        }

        // Call Claude grader with retry logic
        const rubric = await gradeHrScreenWithRetry(gradingMaterials, 3)

        // Validate rubric
        if (!validateHrScreenRubric(rubric)) {
          console.error('Rubric validation failed, falling back to OpenAI')
          console.error('Rubric structure:', JSON.stringify(rubric, null, 2).substring(0, 500))
          throw new Error('Invalid rubric structure from Claude')
        }

        // Derive fields from rubric for backwards compatibility
        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: rubric.traditional_hr_criteria.scores,
          area_feedback: rubric.traditional_hr_criteria.feedback,
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
          hr_screen_six_areas: rubric.hr_screen_six_areas || {
            what_went_well: [],
            what_needs_improve: [],
          },
        }

        // Save feedback to database (both full rubric and derived fields)
        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric, // Store complete rubric (includes hr_screen_six_areas)
        }

        // Only add hr_screen_six_areas as separate column if it exists in schema
        // If column doesn't exist, it's stored in full_rubric.hr_screen_six_areas anyway
        // Try to add it, but don't fail if column doesn't exist
        try {
          insertData.hr_screen_six_areas = feedback.hr_screen_six_areas
        } catch (e) {
          console.warn('Could not add hr_screen_six_areas to insert (column may not exist), storing in full_rubric only')
        }

        // Use supabaseAdmin to bypass RLS for insert
        let savedFeedback: any = null
        const { data: insertResult, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          // If error is about hr_screen_six_areas column, retry without it
          if (dbError.message?.includes('hr_screen_six_areas')) {
            console.warn('hr_screen_six_areas column not found, retrying without it (data stored in full_rubric)')
            const insertDataWithoutColumn = { ...insertData }
            delete insertDataWithoutColumn.hr_screen_six_areas
            
            const { data: retryResult, error: retryError } = await supabaseAdmin
              .from('interview_feedback')
              .insert(insertDataWithoutColumn)
              .select()
              .single()
            
            if (retryError) {
              console.error('Error saving feedback to database (retry):', retryError)
              return NextResponse.json(
                { error: 'Failed to save feedback', details: retryError.message },
                { status: 500 }
              )
            }
            
            savedFeedback = retryResult
          } else {
            console.error('Error saving feedback to database:', dbError)
            return NextResponse.json(
              { error: 'Failed to save feedback', details: dbError.message },
              { status: 500 }
            )
          }
        } else {
          savedFeedback = insertResult
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            hr_screen_six_areas: feedback.hr_screen_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude grading failed:', claudeError)
        console.error('Claude error message:', claudeError?.message)
        console.error('Claude error stack:', claudeError?.stack)
        console.warn('Falling back to OpenAI grader')
        console.warn('WARNING: OpenAI grader does NOT generate full_rubric - detailed report will not be available')
        // Fall through to OpenAI path below
      }
    }

    // Hiring Manager: Use Claude Grader with two-tier system
    if (stage === 'hiring_manager') {
      try {
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt,
          hrScreenFeedback: hrScreenFeedback || undefined,
        }

        const rubric = await gradeHiringManagerWithRetry(gradingMaterials, 3)

        // Validate rubric
        if (!validateHiringManagerRubric(rubric)) {
          console.error('Hiring Manager rubric validation failed, falling back to OpenAI')
          throw new Error('Invalid rubric structure from Claude')
        }

        // Derive fields from rubric for backwards compatibility
        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: rubric.hiring_manager_criteria?.scores || {},
          area_feedback: rubric.hiring_manager_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
          hiring_manager_six_areas: rubric.hiring_manager_six_areas || {
            what_went_well: [],
            what_needs_improve: [],
          },
        }

        // Save feedback to database
        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric,
        }

        const { data: savedFeedback, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving Hiring Manager feedback to database:', dbError)
          return NextResponse.json(
            { error: 'Failed to save feedback', details: dbError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            hiring_manager_six_areas: feedback.hiring_manager_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude Hiring Manager grading failed:', claudeError)
        console.error('Error message:', claudeError?.message)
        console.warn('Falling back to OpenAI grader for Hiring Manager')
        // Fall through to OpenAI path below
      }
    }

    // Culture Fit grading via Claude
    if (stage === 'culture_fit') {
      try {
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt,
          hrScreenFeedback: hrScreenFeedback || undefined,
        }

        const rubric = await gradeCultureFitWithRetry(gradingMaterials, 3)

        if (!validateCultureFitRubric(rubric)) {
          console.error('Culture Fit rubric validation failed, falling back to OpenAI')
          throw new Error('Invalid rubric structure from Claude')
        }

        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: (rubric as any).culture_fit_criteria?.scores || {},
          area_feedback: (rubric as any).culture_fit_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
        }

        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric,
        }

        const { data: savedFeedback, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving Culture Fit feedback:', dbError)
          return NextResponse.json({ error: 'Failed to save feedback', details: dbError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            culture_fit_six_areas: (rubric as any).culture_fit_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude Culture Fit grading failed:', claudeError?.message)
        console.warn('Falling back to OpenAI grader')
      }
    }

    // Final Round grading via Claude
    if (stage === 'final') {
      try {
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt,
          hrScreenFeedback: hrScreenFeedback || undefined,
        }

        const rubric = await gradeFinalRoundWithRetry(gradingMaterials, 3)

        if (!validateFinalRoundRubric(rubric)) {
          console.error('Final Round rubric validation failed, falling back to OpenAI')
          throw new Error('Invalid rubric structure from Claude')
        }

        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: (rubric as any).final_round_criteria?.scores || {},
          area_feedback: (rubric as any).final_round_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
        }

        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric,
        }

        const { data: savedFeedback, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving Final Round feedback:', dbError)
          return NextResponse.json({ error: 'Failed to save feedback', details: dbError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            final_round_six_areas: (rubric as any).final_round_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude Final Round grading failed:', claudeError?.message)
        console.warn('Falling back to OpenAI grader')
      }
    }

    // Non-HR/non-HM stages or Claude fallback: Use OpenAI (existing path)
    // Build user message with transcript
    const transcriptText = Array.isArray(transcript) ? transcript.join('\n') : transcript
    const userMessage = `Please analyze this interview transcript and provide honest, job-specific feedback:\n\n${transcriptText}`

    // Generate feedback using ChatGPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
    })

    const feedbackText = completion.choices[0]?.message?.content || '{}'
    
    // Try to parse as JSON
    let feedback: any
    try {
      feedback = JSON.parse(feedbackText)
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', parseError)
      // Fallback: create structured response
      feedback = {
        overall_score: 5,
        area_scores: {},
        area_feedback: {},
        strengths: [],
        weaknesses: [],
        suggestions: [],
        detailed_feedback: feedbackText,
      }
      
      // Try to extract area scores from text if criteria exist
      criteria.forEach((criterion) => {
        feedback.area_scores[criterion.assessment_area] = 5
        feedback.area_feedback[criterion.assessment_area] = 'Unable to parse detailed feedback for this area.'
      })
    }

    // Ensure all required fields exist
    if (!feedback.area_scores) feedback.area_scores = {}
    if (!feedback.area_feedback) feedback.area_feedback = {}
    if (!feedback.strengths) feedback.strengths = []
    if (!feedback.weaknesses) feedback.weaknesses = []
    if (!feedback.suggestions) feedback.suggestions = []
    if (!feedback.detailed_feedback) feedback.detailed_feedback = ''
    
    // For HR screen: Ensure hr_screen_six_areas exists
    if (stage === 'hr_screen') {
      if (!feedback.hr_screen_six_areas) {
        feedback.hr_screen_six_areas = {
          what_went_well: [],
          what_needs_improve: []
        }
      }
      // Ensure both arrays exist
      if (!feedback.hr_screen_six_areas.what_went_well) {
        feedback.hr_screen_six_areas.what_went_well = []
      }
      if (!feedback.hr_screen_six_areas.what_needs_improve) {
        feedback.hr_screen_six_areas.what_needs_improve = []
      }
    }

    // Calculate overall score if not provided or if area scores exist
    // Use criteriaWithWeights (which includes stage-specific overrides) for calculation
    if (!feedback.overall_score || Object.keys(feedback.area_scores).length > 0) {
      const totalWeight = criteriaWithWeights.reduce((sum, c) => sum + (c.weight || 1.0), 0)
      const weightedSum = criteriaWithWeights.reduce((sum, c) => {
        const score = feedback.area_scores[c.assessment_area] || 5
        return sum + (score * (c.weight || 1.0))
      }, 0)
      feedback.overall_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 5
    }

    // Save feedback to database
    const insertData: any = {
      interview_session_id: sessionId,
      overall_score: Math.round(feedback.overall_score),
      strengths: feedback.strengths || [],
      weaknesses: feedback.weaknesses || [],
      suggestions: feedback.suggestions || [],
      detailed_feedback: feedback.detailed_feedback || '',
      area_scores: feedback.area_scores || {},
      area_feedback: feedback.area_feedback || {},
    }
    
    // Add hr_screen_six_areas for HR screen
    if (stage === 'hr_screen' && feedback.hr_screen_six_areas) {
      insertData.hr_screen_six_areas = feedback.hr_screen_six_areas
    }
    
    const { data: savedFeedback, error: dbError } = await supabase
      .from('interview_feedback')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error('Error saving feedback to database:', dbError)
      return NextResponse.json(
        { error: 'Failed to save feedback', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('Feedback saved successfully:', savedFeedback?.id)

    const responseFeedback: any = {
      overall_score: Math.round(feedback.overall_score),
      area_scores: feedback.area_scores || {},
      area_feedback: feedback.area_feedback || {},
      strengths: feedback.strengths || [],
      weaknesses: feedback.weaknesses || [],
      suggestions: feedback.suggestions || [],
      detailed_feedback: feedback.detailed_feedback || '',
    }
    
    // Add hr_screen_six_areas for HR screen
    if (stage === 'hr_screen' && feedback.hr_screen_six_areas) {
      responseFeedback.hr_screen_six_areas = feedback.hr_screen_six_areas
    }
    
    // Track HR screen completions for authenticated users
    if (stage === 'hr_screen') {
      try {
        const supabaseAuth = createRouteHandlerClient({ cookies })
        const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
        if (authSession) {
          await supabaseAdmin.rpc('increment_hr_completions', { user_id_param: authSession.user.id })
        }
      } catch (hrTrackError) {
        console.error('Error tracking HR completion:', hrTrackError)
      }
    }

    // Deduct credit for completed paid interview
    if (stage && stage !== 'hr_screen') {
      try {
        const supabaseAuth = createRouteHandlerClient({ cookies })
        const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
        if (authSession) {
          await deductCredit(authSession.user.id, stage)
        }
      } catch (creditError) {
        console.error('Error deducting credit:', creditError)
        // Don't fail the request — feedback was already saved
      }
    }

    return NextResponse.json({
      success: true,
      feedback: responseFeedback,
    })
  } catch (error) {
    console.error('Error generating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    )
  }
}

