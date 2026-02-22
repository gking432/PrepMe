// DetailedRubricReport.tsx
// This component takes the AI grader's JSON output and renders the professional report

import React, { useEffect } from 'react'

interface RubricData {
  rubric_version: string;
  interview_type: string;
  session_metadata: {
    session_id: string;
    candidate_name: string;
    position: string;
    company: string;
    interview_date: string;
    interview_duration_seconds: number;
  };
  overall_assessment: {
    overall_score: number;
    likelihood_to_advance: 'likely' | 'unlikely' | 'marginal';
    key_strengths: Array<{
      title: string;
      description: string;
    }>;
    key_weaknesses: Array<{
      title: string;
      description: string;
    }>;
    executive_summary: string;
  };
  traditional_hr_criteria: {
    communication_skills: {
      score: number;
      scale: string;
      components: {
        clarity: number;
        articulation: number;
        pacing: number;
        tone_appropriateness: number;
        active_listening: number;
        professional_language: number;
      };
      feedback: string;
    };
    professionalism: {
      score: 'pass' | 'fail';
      scale: string;
      components: {
        appropriate_greeting: boolean;
        appropriate_closing: boolean;
        respectful_tone: boolean;
        prepared_environment: boolean;
        phone_etiquette: boolean;
      };
      feedback: string;
      issues_detected?: string[];
    };
    basic_qualifications_match: {
      score: number;
      scale: string;
      components: Record<string, any>;
      feedback: string;
      alignment_details: {
        job_requirements_met: string[];
        job_requirements_missing: string[];
        transferable_skills_identified: string[];
      };
    };
    interest_and_enthusiasm: {
      score: number;
      scale: string;
      components: Record<string, number>;
      feedback: string;
      enthusiasm_indicators: {
        mentioned_specific_company_details: boolean;
        tone_was_enthusiastic: boolean;
        company_knowledge: string;
        energy_level: string;
        tone_enthusiasm: string;
        follow_up_questions: string;
      };
    };
    culture_fit_indicators?: {
      score: 'pass' | 'fail';
      scale: string;
      components: {
        work_style_preferences_align: string;
        values_alignment: string;
        team_collaboration_mentions: string;
      };
      feedback: string;
      notes: string;
    };
    response_quality: {
      score: number;
      scale: string;
      components: Record<string, number>;
      feedback: string;
      quality_metrics: {
        questions_answered_directly: string;
        questions_with_strong_examples: string;
        questions_with_vague_answers: string;
        avg_length: string;
      };
    };
    red_flags: {
      present: boolean;
      scale: string;
      detected_flags: Array<{
        flag_type: string;
        severity: string;
        question_id: string;
        timestamp: string;
        description: string;
        excerpt?: string;
      }>;
      feedback: string;
    };
  };
  time_management_analysis: {
    total_interview_duration: string;
    target_duration: string;
    variance: string;
    questions_asked: number;
    time_per_question: Array<{
      question_id: string;
      question_text: string;
      candidate_response_time: string;
      assessment: 'too_long' | 'appropriate' | 'too_short';
      target_range: string;
    }>;
    pacing_feedback: string;
  };
  observer_notes?: {
    overall_impression: string;
    confidence_level: string;
    engagement: string;
    authenticity: string;
    best_moment: {
      question_id: string;
      timestamp: string;
      description: string;
    };
    weakest_moment: {
      question_id: string;
      timestamp: string;
      description: string;
    };
    interesting_note: {
      question_id: string;
      timestamp: string;
      description: string;
    };
    missed_opportunity: {
      question_id: string;
      timestamp: string;
      description: string;
    };
    additional_observations: string[];
  };
  next_steps_preparation: {
    ready_for_hiring_manager: boolean;
    confidence_level: string;
    areas_to_study: Array<{
      topic: string;
      reason: string;
      preparation_tip: string;
    }>;
    predicted_hiring_manager_questions: string[];
    skills_to_highlight_more: Array<{
      skill: string;
      current_coverage: string;
      job_requirement_level: string;
      action: string;
    }>;
  };
  comparative_analysis: {
    percentile_estimate: number;
    standout_qualities: string[];
    common_weaknesses_avoided: string[];
  };
  grading_metadata: {
    graded_by_agent: string;
    grading_timestamp: string;
    confidence_in_assessment: string;
  };
}

export default function DetailedRubricReport({ data }: { data: RubricData }) {
  // Helper functions
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoDate: string): string => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (score: number, max: number = 5) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(max)].map((_, i) => (
          <span key={i} className={i < score ? 'text-yellow-500' : 'text-gray-300'}>★</span>
        ))}
      </div>
    );
  };

  // Animate score meters on load
  useEffect(() => {
    const meters = document.querySelectorAll('.score-meter');
    meters.forEach((meter) => {
      const width = (meter as HTMLElement).style.width;
      (meter as HTMLElement).style.width = '0%';
      setTimeout(() => {
        (meter as HTMLElement).style.width = width;
      }, 500);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto bg-gray-50 p-6">
      {/* Report Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-indigo-600">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Detailed Performance Report
            </h1>
            <p className="text-gray-600">HR Phone Screen Interview Analysis</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Interview Date</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDate(data.session_metadata.interview_date)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Duration: {formatDuration(data.session_metadata.interview_duration_seconds)}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-indigo-900 mb-1">OVERALL ASSESSMENT</div>
              <div className="text-3xl font-bold text-indigo-600">
                {Math.round(data.overall_assessment.overall_score * 10)}/100
              </div>
              <div className="text-sm text-gray-700 mt-1 capitalize">
                {data.overall_assessment.likelihood_to_advance === 'likely' && 'Likely to Advance'}
                {data.overall_assessment.likelihood_to_advance === 'marginal' && 'Marginal - Needs Improvement'}
                {data.overall_assessment.likelihood_to_advance === 'unlikely' && 'Unlikely to Advance'}
              </div>
            </div>
            <div className="text-right max-w-2xl">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Executive Summary:</strong> {data.overall_assessment.executive_summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Key Strengths</h2>
          </div>
          <ul className="space-y-3">
            {data.overall_assessment.key_strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <div>
                  <div className="font-semibold text-gray-900">{strength.title}</div>
                  <div className="text-sm text-gray-600">{strength.description}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Areas to Improve</h2>
          </div>
          <ul className="space-y-3">
            {data.overall_assessment.key_weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                </svg>
                <div>
                  <div className="font-semibold text-gray-900">{weakness.title}</div>
                  <div className="text-sm text-gray-600">{weakness.description}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Traditional HR Criteria */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"/>
          </svg>
          Standard HR Phone Screen Criteria
        </h2>

        <div className="space-y-6">
          {/* Communication Skills */}
          <div className="border-l-4 border-indigo-500 pl-6 py-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Communication Skills</h3>
                <p className="text-sm text-gray-600">Clarity, articulation, pacing, tone, active listening, professional language</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600">
                  {data.traditional_hr_criteria.communication_skills.score}/10
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {data.traditional_hr_criteria.communication_skills.score >= 8 ? 'Strong' :
                   data.traditional_hr_criteria.communication_skills.score >= 5 ? 'Adequate' : 'Needs Work'}
                </div>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="score-meter bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(data.traditional_hr_criteria.communication_skills.score / 10) * 100}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {Object.entries(data.traditional_hr_criteria.communication_skills.components).map(([key, value]) => (
                <div key={key} className="bg-indigo-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold text-indigo-600">{value as number}/10</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${((value as number) / 10) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Analysis:</strong> {data.traditional_hr_criteria.communication_skills.feedback}
            </p>
          </div>

          {/* Professionalism */}
          {data.traditional_hr_criteria.professionalism && (
            <div className="border-l-4 border-green-500 pl-6 py-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Professionalism</h3>
                  <p className="text-sm text-gray-600">Greeting, closing, respectful tone, environment, etiquette</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 ${
                    data.traditional_hr_criteria.professionalism.score === 'pass'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}>
                    {data.traditional_hr_criteria.professionalism.score === 'pass' ? '✓ PASS' : '✗ FAIL'}
                  </span>
                </div>
              </div>
              <div className={`border rounded-lg p-4 ${
                data.traditional_hr_criteria.professionalism.score === 'pass'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <ul className="space-y-2 text-sm">
                  {Object.entries(data.traditional_hr_criteria.professionalism.components || {}).map(([key, value]) => (
                    <li key={key} className="flex items-center space-x-2">
                      <svg className={`w-5 h-5 ${value ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        {value ? (
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                        ) : (
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                        )}
                      </svg>
                      <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                <strong>Analysis:</strong> {data.traditional_hr_criteria.professionalism.feedback || 'Professionalism assessment not available.'}
              </p>
            </div>
          )}

          {/* Basic Qualifications Match */}
          {data.traditional_hr_criteria.basic_qualifications_match && (
            <div className="border-l-4 border-blue-500 pl-6 py-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Basic Qualifications Match</h3>
                  <p className="text-sm text-gray-600">Experience, skills, authorization, availability, salary expectations</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {data.traditional_hr_criteria.basic_qualifications_match.score}/10
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {data.traditional_hr_criteria.basic_qualifications_match.score >= 8 ? 'Strong Match' :
                     data.traditional_hr_criteria.basic_qualifications_match.score >= 6 ? 'Good Match' : 'Gaps Present'}
                  </div>
                </div>
              </div>
              <div className="bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="score-meter bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(data.traditional_hr_criteria.basic_qualifications_match.score / 10) * 100}%` }}
                ></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Requirements Met</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {(data.traditional_hr_criteria.basic_qualifications_match.alignment_details?.job_requirements_met || []).map((req, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="text-green-600">✓</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Gaps Identified</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {(data.traditional_hr_criteria.basic_qualifications_match.alignment_details?.job_requirements_missing || []).map((gap, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="text-orange-600">○</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                    {(data.traditional_hr_criteria.basic_qualifications_match.alignment_details?.transferable_skills_identified || []).length > 0 && (
                      <li className="flex items-center space-x-2 mt-2 pt-2 border-t border-orange-200">
                        <span className="text-green-600">✓</span>
                        <span>Transferable skills present</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Analysis:</strong> {data.traditional_hr_criteria.basic_qualifications_match.feedback || 'Basic qualifications assessment not available.'}
              </p>
            </div>
          )}

          {/* Interest and Enthusiasm */}
          {data.traditional_hr_criteria.interest_and_enthusiasm && (
            <div className="border-l-4 border-purple-500 pl-6 py-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Interest and Enthusiasm</h3>
                  <p className="text-sm text-gray-600">Company knowledge, energy level, genuine interest, thoughtful questions</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">
                    {data.traditional_hr_criteria.interest_and_enthusiasm.score}/10
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {data.traditional_hr_criteria.interest_and_enthusiasm.score >= 8 ? 'Strong' :
                     data.traditional_hr_criteria.interest_and_enthusiasm.score >= 5 ? 'Moderate' : 'Low'}
                  </div>
                </div>
              </div>
              <div className="bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="score-meter bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(data.traditional_hr_criteria.interest_and_enthusiasm.score / 10) * 100}%` }}
                ></div>
              </div>
              {data.traditional_hr_criteria.interest_and_enthusiasm.enthusiasm_indicators && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Enthusiasm Indicators</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Company Knowledge</span>
                      <span className="font-semibold text-purple-700">{data.traditional_hr_criteria.interest_and_enthusiasm.enthusiasm_indicators.company_knowledge || 'Not Assessed'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Energy Level</span>
                      <span className="font-semibold text-purple-700">{data.traditional_hr_criteria.interest_and_enthusiasm.enthusiasm_indicators.energy_level || 'Not Assessed'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Tone Enthusiasm</span>
                      <span className="font-semibold text-purple-700">{data.traditional_hr_criteria.interest_and_enthusiasm.enthusiasm_indicators.tone_enthusiasm || 'Not Assessed'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Follow-up Questions</span>
                      <span className="font-semibold text-orange-600">{data.traditional_hr_criteria.interest_and_enthusiasm.enthusiasm_indicators.follow_up_questions || 'Not Assessed'}</span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Analysis:</strong> {data.traditional_hr_criteria.interest_and_enthusiasm.feedback || 'Interest and enthusiasm assessment not available.'}
              </p>
            </div>
          )}

          {/* Culture Fit Indicators removed - assessed in dedicated Culture Fit interview stage */}

          {/* Response Quality */}
          {data.traditional_hr_criteria.response_quality && (
            <div className="border-l-4 border-amber-500 pl-6 py-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Response Quality</h3>
                  <p className="text-sm text-gray-600">Relevance, specificity, honesty, appropriate conciseness</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-amber-600">
                    {data.traditional_hr_criteria.response_quality.score}/10
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {data.traditional_hr_criteria.response_quality.score >= 8 ? 'Strong' :
                     data.traditional_hr_criteria.response_quality.score >= 5 ? 'Adequate' : 'Needs Work'}
                  </div>
                </div>
              </div>
              <div className="bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="score-meter bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(data.traditional_hr_criteria.response_quality.score / 10) * 100}%` }}
                ></div>
              </div>
              {data.traditional_hr_criteria.response_quality.quality_metrics && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Quality Metrics</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-600 text-xs mb-1">Answered Directly</span>
                      <span className="font-semibold text-gray-900">{data.traditional_hr_criteria.response_quality.quality_metrics.questions_answered_directly || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-600 text-xs mb-1">With Strong Examples</span>
                      <span className="font-semibold text-gray-900">{data.traditional_hr_criteria.response_quality.quality_metrics.questions_with_strong_examples || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-600 text-xs mb-1">Vague Answers</span>
                      <span className="font-semibold text-orange-700">{data.traditional_hr_criteria.response_quality.quality_metrics.questions_with_vague_answers || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-600 text-xs mb-1">Avg Length</span>
                      <span className="font-semibold text-gray-900">{data.traditional_hr_criteria.response_quality.quality_metrics.avg_length || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Analysis:</strong> {data.traditional_hr_criteria.response_quality.feedback || 'Response quality assessment not available.'}
              </p>
            </div>
          )}

          {/* Red Flags */}
          {data.traditional_hr_criteria.red_flags && (
            <div className="border-l-4 border-gray-400 pl-6 py-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Red Flags Assessment</h3>
                  <p className="text-sm text-gray-600">Concerning behavior, inconsistencies, inappropriate comments</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 ${
                    !data.traditional_hr_criteria.red_flags.present
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}>
                    {!data.traditional_hr_criteria.red_flags.present ? '✓ NONE DETECTED' : '⚠ FLAGS DETECTED'}
                  </span>
                </div>
              </div>
              <div className={`border rounded-lg p-4 ${
                !data.traditional_hr_criteria.red_flags.present
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {data.traditional_hr_criteria.red_flags.detected_flags && data.traditional_hr_criteria.red_flags.detected_flags.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {data.traditional_hr_criteria.red_flags.detected_flags.map((flag: any, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2 text-sm">
                        <span className={`font-semibold shrink-0 ${
                          flag.severity === 'high' ? 'text-red-600' :
                          flag.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          {flag.severity === 'high' ? '!!!' : flag.severity === 'medium' ? '!!' : '!'}
                        </span>
                        <div>
                          <span className="font-medium text-gray-900">{flag.flag_type}: </span>
                          <span className="text-gray-700">{flag.description}</span>
                          {flag.evidence && <p className="text-xs text-gray-500 mt-0.5 italic">{flag.evidence}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>Assessment:</strong> {data.traditional_hr_criteria.red_flags.feedback || 'Red flags assessment not available.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Management Analysis */}
      {data.time_management_analysis && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
            </svg>
            Time Management & Pacing Analysis
          </h2>

          {data.time_management_analysis.total_interview_duration && (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                <div className="text-sm text-gray-600 mb-1">Total Duration</div>
                <div className="text-3xl font-bold text-indigo-600">
                  {data.time_management_analysis.total_interview_duration}
                </div>
                {data.time_management_analysis.target_duration && (
                  <div className={`text-xs mt-1 ${
                    (data.time_management_analysis as any).duration_assessment === 'within_target'
                      ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {(data.time_management_analysis as any).duration_assessment === 'within_target' ? '✓' : '⚠'} Target: {data.time_management_analysis.target_duration}
                    {data.time_management_analysis.variance && ` (${data.time_management_analysis.variance})`}
                  </div>
                )}
              </div>
              {data.time_management_analysis.questions_asked !== null && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
                  <div className="text-sm text-gray-600 mb-1">Questions Asked</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {data.time_management_analysis.questions_asked}
                  </div>
                  <div className={`text-xs mt-1 ${
                    (data.time_management_analysis as any).questions_assessment === 'within_target'
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}>
                    {(data.time_management_analysis as any).questions_assessment === 'within_target' ? '✓' : '⚠'} Target: {(data.time_management_analysis as any).questions_target || '6-8'}
                  </div>
                </div>
              )}
              {data.time_management_analysis.time_per_question && data.time_management_analysis.time_per_question.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
                  <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {(() => {
                      const times = data.time_management_analysis.time_per_question
                        .map((q: any) => q.candidate_response_time)
                        .filter((t: string) => t && t !== 'N/A')
                      if (times.length === 0) return 'N/A'
                      return 'See breakdown below'
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Target: 60-90 seconds</div>
                </div>
              )}
            </div>
          )}

        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 mb-3">Response Length Analysis</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.time_management_analysis.time_per_question.map((q, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{q.question_id}: {q.question_text}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{q.candidate_response_time}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        q.assessment === 'appropriate' ? 'bg-green-100 text-green-800' :
                        q.assessment === 'too_long' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {q.assessment === 'appropriate' ? 'Appropriate' :
                         q.assessment === 'too_long' ? 'Slightly Long' : 'Too Short'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{q.target_range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

          {data.time_management_analysis.pacing_feedback && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
                </svg>
                Pacing Feedback
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {data.time_management_analysis.pacing_feedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Observer Notes */}
      {data.observer_notes && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
            </svg>
            Real-Time Observer Notes
          </h2>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Overall Impression from Real-Time Observation</h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {data.observer_notes.overall_impression}
                </p>
                <div className="flex items-center space-x-6 text-sm">
                  <div>
                    <span className="text-gray-600">Confidence Level:</span>
                    <span className="font-semibold text-indigo-600 ml-2">{data.observer_notes.confidence_level}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Engagement:</span>
                    <span className="font-semibold text-indigo-600 ml-2">{data.observer_notes.engagement}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Authenticity:</span>
                    <span className="font-semibold text-indigo-600 ml-2">{data.observer_notes.authenticity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⭐</div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Best Moment</h4>
                  <p className="text-sm text-gray-700"><strong>{data.observer_notes.best_moment.question_id} ({data.observer_notes.best_moment.timestamp}):</strong> {data.observer_notes.best_moment.description}</p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50 rounded-r-lg">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Weakest Moment</h4>
                  <p className="text-sm text-gray-700"><strong>{data.observer_notes.weakest_moment.question_id} ({data.observer_notes.weakest_moment.timestamp}):</strong> {data.observer_notes.weakest_moment.description}</p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-lg">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">💡</div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Interesting Note</h4>
                  <p className="text-sm text-gray-700"><strong>{data.observer_notes.interesting_note.question_id} ({data.observer_notes.interesting_note.timestamp}):</strong> {data.observer_notes.interesting_note.description}</p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4 py-3 bg-yellow-50 rounded-r-lg">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">❌</div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Missed Opportunity</h4>
                  <p className="text-sm text-gray-700"><strong>{data.observer_notes.missed_opportunity.question_id} ({data.observer_notes.missed_opportunity.timestamp}):</strong> {data.observer_notes.missed_opportunity.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3">Additional Observations</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {data.observer_notes.additional_observations.map((obs, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-indigo-600 flex-shrink-0 mt-0.5">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Comparative Analysis */}
      {data.comparative_analysis && data.comparative_analysis.percentile_estimate !== null && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
            </svg>
            How You Compare
          </h2>
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Percentile Ranking</h3>
              <div className="text-right">
                <div className="text-4xl font-bold text-indigo-600">{data.comparative_analysis.percentile_estimate}th</div>
                <div className="text-sm text-gray-600">percentile</div>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">You performed better than {data.comparative_analysis.percentile_estimate}% of candidates at the HR phone screen stage.{' '}
              {data.comparative_analysis.percentile_estimate >= 75 ? 'This is a strong showing and indicates good fit for moving forward.' :
               data.comparative_analysis.percentile_estimate >= 50 ? 'This is an average performance with room for improvement.' :
               data.comparative_analysis.percentile_estimate >= 25 ? 'This is below average — review the feedback below to improve.' :
               'This indicates significant areas for improvement before your next interview.'}
            </p>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">All Candidates</span>
              <span className="text-xs text-gray-600">You</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div className="absolute h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full" style={{ width: '100%' }}></div>
              <div 
                className="absolute h-4 w-1 bg-indigo-600 rounded" 
                style={{ left: `${data.comparative_analysis.percentile_estimate}%`, top: '-4px', boxShadow: '0 0 0 4px white' }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Bottom 25%</span>
              <span>Average</span>
              <span>Top 25%</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              What Made You Stand Out
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {data.comparative_analysis.standout_qualities.map((quality, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-green-600 flex-shrink-0">✓</span>
                  <span>{quality}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
              </svg>
              Common Mistakes You Avoided
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {data.comparative_analysis.common_weaknesses_avoided && data.comparative_analysis.common_weaknesses_avoided.length > 0 ? (
                data.comparative_analysis.common_weaknesses_avoided.map((mistake, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-orange-600 flex-shrink-0">✓</span>
                    <span>{mistake}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 italic">No specific common mistakes avoided were identified.</li>
              )}
            </ul>
          </div>
        </div>
        </div>
      )}

      {/* Preparing for the Hiring Manager Round */}
      {data.next_steps_preparation && (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg p-8 mb-6 text-white">
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"/>
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                <h2 className="text-2xl font-bold mt-1">Preparing for the Hiring Manager Round</h2>
              </div>
            </div>

            {/* Readiness Assessment */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"/>
                    <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Readiness Assessment</h3>
                  <p className="text-white/80 text-sm">Based on your HR screen performance</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/30">
                  <div className="text-sm text-white/80 mb-1">Ready for Next Round?</div>
                  <div className="text-2xl font-bold">{data.next_steps_preparation.ready_for_hiring_manager ? 'Yes' : 'Not Yet'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/30">
                  <div className="text-sm text-white/80 mb-1">Confidence Level</div>
                  <div className="text-2xl font-bold capitalize">{data.next_steps_preparation.confidence_level}</div>
                </div>
              </div>
            </div>

            {/* Areas to Study */}
            {data.next_steps_preparation.areas_to_study && data.next_steps_preparation.areas_to_study.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
                  </svg>
                  Areas to Study Before Hiring Manager Interview
                </h3>
                <div className="space-y-3">
                  {data.next_steps_preparation.areas_to_study.map((area, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                      <h4 className="font-semibold mb-2">{idx + 1}. {area.topic}</h4>
                      <p className="text-sm text-white/90 mb-2">
                        <strong>Why:</strong> {area.reason}
                      </p>
                      <p className="text-sm text-white/80">
                        <strong>Prep tip:</strong> {area.preparation_tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predicted Questions */}
            {data.next_steps_preparation.predicted_hiring_manager_questions && data.next_steps_preparation.predicted_hiring_manager_questions.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                  </svg>
                  Predicted Hiring Manager Questions
                </h3>
                <p className="text-sm text-white/80 mb-3">Based on your resume, the job description, and your HR screen responses, expect these questions:</p>
                <div className="space-y-2">
                  {data.next_steps_preparation.predicted_hiring_manager_questions.map((question, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md rounded-lg p-3 text-sm border border-white/20">
                      <span className="font-bold mr-2">{idx + 1}.</span>
                      <span>"{question}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grading Metadata */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Report Metadata</h3>
            <div className="space-y-1">
              <div><strong>Graded by:</strong> {data.grading_metadata.graded_by_agent}</div>
              <div><strong>Grading completed:</strong> {formatDate(data.grading_metadata.grading_timestamp)}</div>
              <div><strong>Rubric version:</strong> {data.rubric_version}</div>
              <div><strong>Confidence in assessment:</strong> {data.grading_metadata.confidence_in_assessment}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
