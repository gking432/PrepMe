// DetailedHmRubricReport.tsx
// Hiring Manager interview detailed report - mirrors DetailedRubricReport for HM stage

import React, { useEffect } from 'react'

interface HmRubricData {
  rubric_version?: string;
  interview_type?: string;
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
    likelihood_to_advance: string;
    key_strengths: Array<string | { title: string; description: string }>;
    key_weaknesses: Array<string | { title: string; description: string }>;
    summary: string;
  };
  hiring_manager_criteria: {
    scores: Record<string, number>;
    feedback: Record<string, string>;
  };
  role_specific_criteria?: {
    criteria_identified: Array<{
      name: string;
      score: number;
      feedback: string;
    }>;
  };
  hiring_manager_six_areas?: {
    what_went_well: Array<{
      criterion: string;
      feedback: string;
      evidence?: Array<{ question_id?: string; timestamp?: string; excerpt?: string }>;
    }>;
    what_needs_improve: Array<{
      criterion: string;
      feedback: string;
      evidence?: Array<{ question_id?: string; timestamp?: string; excerpt?: string }>;
    }>;
  };
  cross_stage_progress?: {
    improvement_from_hr_screen: string;
    consistent_strengths: string[];
    persistent_weaknesses: string[];
    new_concerns: string[];
  };
  time_management_analysis?: {
    per_question_timing?: Array<{
      question_id?: string;
      question_text?: string;
      candidate_response_time?: string;
      assessment?: string;
      target_range?: string;
    }>;
    overall_pace?: string;
    total_interview_duration?: string;
    target_duration?: string;
    questions_asked?: number;
    pacing_feedback?: string;
    time_per_question?: Array<{
      question_id?: string;
      question_text?: string;
      candidate_response_time?: string;
      assessment?: string;
      target_range?: string;
    }>;
  };
  comparative_analysis?: {
    resume_vs_interview?: string;
    job_requirements_gaps?: string[];
    standout_qualities?: string[];
    common_weaknesses_avoided?: string[];
    percentile_estimate?: number;
  };
  next_steps_preparation?: {
    ready_for_next_round?: boolean;
    confidence_level?: string;
    improvement_suggestions?: string[];
    practice_recommendations?: {
      immediate_focus_areas?: string[];
    };
    areas_to_study?: Array<{
      topic: string;
      reason: string;
      preparation_tip: string;
    }>;
    predicted_next_round_questions?: string[];
  };
  grading_metadata?: {
    graded_by_agent: string;
    grading_timestamp: string;
    confidence_in_assessment: string;
  };
}

// Criterion display names mapping
const criterionDisplayNames: Record<string, { name: string; description: string }> = {
  depth_of_knowledge: { name: 'Depth of Knowledge', description: 'Mastery vs. surface-level understanding, ability to explain "why"' },
  problem_solving: { name: 'Problem-Solving Approach', description: 'Structured thinking, clarifying questions, tradeoff analysis' },
  impact_and_results: { name: 'Impact & Results', description: 'Quantified achievements, outcomes over activities, specific contribution' },
  role_alignment: { name: 'Role Alignment', description: 'Skills match to job description, critical vs. nice-to-have gaps' },
  growth_and_self_awareness: { name: 'Growth & Self-Awareness', description: 'Learning from failures, knowing strengths/weaknesses, growth mindset' },
  red_flags: { name: 'Red Flags & Concerns', description: 'Inconsistencies, blame-shifting, vagueness, signs of exaggeration' },
}

export default function DetailedHmRubricReport({ data }: { data: HmRubricData }) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 8) return 'from-green-500 to-emerald-500';
    if (score >= 6) return 'from-blue-500 to-indigo-500';
    if (score >= 4) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 9) return 'Excellent';
    if (score >= 8) return 'Very Good';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Average';
    if (score >= 3) return 'Below Average';
    return 'Poor';
  };

  // Normalize strength/weakness items
  const normalizeItem = (item: string | { title: string; description: string }) => {
    if (typeof item === 'string') return { title: item, description: item };
    return item;
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

  const timingData = data.time_management_analysis?.time_per_question || data.time_management_analysis?.per_question_timing || [];

  return (
    <div className="max-w-5xl mx-auto bg-gray-50 p-6">
      {/* Report Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-indigo-600">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Detailed Performance Report
            </h1>
            <p className="text-gray-600">Hiring Manager Interview Analysis</p>
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
              <div className={`text-3xl font-bold ${getScoreColor(data.overall_assessment.overall_score)}`}>
                {data.overall_assessment.overall_score}/10
              </div>
              <div className="text-sm text-gray-700 mt-1 capitalize">
                {data.overall_assessment.likelihood_to_advance === 'likely' && 'Likely to Advance'}
                {data.overall_assessment.likelihood_to_advance === 'marginal' && 'Marginal - Needs Improvement'}
                {data.overall_assessment.likelihood_to_advance === 'unlikely' && 'Unlikely to Advance'}
              </div>
            </div>
            <div className="text-right max-w-2xl">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Executive Summary:</strong> {data.overall_assessment.summary}
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
            {(data.overall_assessment.key_strengths || []).map((item, idx) => {
              const s = normalizeItem(item);
              return (
                <li key={idx} className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                  </svg>
                  <div>
                    <div className="font-semibold text-gray-900">{s.title}</div>
                    {s.description !== s.title && <div className="text-sm text-gray-600">{s.description}</div>}
                  </div>
                </li>
              );
            })}
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
            {(data.overall_assessment.key_weaknesses || []).map((item, idx) => {
              const w = normalizeItem(item);
              return (
                <li key={idx} className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                  </svg>
                  <div>
                    <div className="font-semibold text-gray-900">{w.title}</div>
                    {w.description !== w.title && <div className="text-sm text-gray-600">{w.description}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Universal Hiring Manager Criteria (Tier 1) */}
      {data.hiring_manager_criteria && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"/>
            </svg>
            Universal Hiring Manager Criteria
          </h2>
          <p className="text-sm text-gray-600 mb-6">6 core competencies evaluated across all candidates regardless of role</p>

          <div className="space-y-6">
            {Object.entries(data.hiring_manager_criteria.scores || {}).map(([key, score]) => {
              const feedbackText = data.hiring_manager_criteria.feedback?.[key] || '';
              const meta = criterionDisplayNames[key] || { name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), description: '' };
              const numScore = typeof score === 'number' ? score : 0;
              const colorClass = getScoreBgColor(numScore);
              const borderColor = numScore >= 8 ? 'border-green-500' : numScore >= 6 ? 'border-blue-500' : numScore >= 4 ? 'border-yellow-500' : 'border-red-500';

              return (
                <div key={key} className={`border-l-4 ${borderColor} pl-6 py-4`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{meta.name}</h3>
                      <p className="text-sm text-gray-600">{meta.description}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(numScore)}`}>
                        {numScore}/10
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {getScoreLabel(numScore)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`score-meter bg-gradient-to-r ${colorClass} h-2 rounded-full transition-all duration-1000`}
                      style={{ width: `${numScore * 10}%` }}
                    ></div>
                  </div>
                  {feedbackText && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <strong>Analysis:</strong> {feedbackText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role-Specific Criteria (Tier 2) */}
      {data.role_specific_criteria?.criteria_identified && data.role_specific_criteria.criteria_identified.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <svg className="w-7 h-7 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"/>
              <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
            </svg>
            Role-Specific Competencies
          </h2>
          <p className="text-sm text-gray-600 mb-6">Competencies identified from your job description - unique to your target role</p>

          <div className="grid md:grid-cols-2 gap-6">
            {data.role_specific_criteria.criteria_identified.map((criterion, idx) => {
              const score = criterion.score || 0;
              const isStrong = score >= 7;
              const borderColor = isStrong ? 'border-green-400' : 'border-orange-400';
              const bgColor = isStrong ? 'bg-green-50' : 'bg-orange-50';

              return (
                <div key={idx} className={`rounded-xl border-2 ${borderColor} ${bgColor} p-5`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{criterion.name}</h3>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}/10
                    </div>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`score-meter bg-gradient-to-r ${getScoreBgColor(score)} h-2 rounded-full transition-all duration-1000`}
                      style={{ width: `${score * 10}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{criterion.feedback}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6-Area Detailed Breakdown */}
      {data.hiring_manager_six_areas && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
            Evidence-Based Assessment
          </h2>

          {/* What Went Well */}
          {data.hiring_manager_six_areas.what_went_well && data.hiring_manager_six_areas.what_went_well.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-lg text-green-700 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                What Went Well
              </h3>
              <div className="space-y-4">
                {data.hiring_manager_six_areas.what_went_well.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.criterion}</h4>
                    <p className="text-sm text-gray-700 mb-2">{item.feedback}</p>
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="space-y-1">
                        {item.evidence.map((ev, eidx) => (
                          <div key={eidx} className="text-xs bg-white border border-green-200 rounded p-2">
                            <span className="font-semibold text-green-700">
                              {ev.question_id && `${ev.question_id}`}{ev.timestamp && ` (${ev.timestamp})`}:
                            </span>{' '}
                            <span className="text-gray-600 italic">"{ev.excerpt}"</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What Needs Improvement */}
          {data.hiring_manager_six_areas.what_needs_improve && data.hiring_manager_six_areas.what_needs_improve.length > 0 && (
            <div>
              <h3 className="font-bold text-lg text-orange-700 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                </svg>
                What Needs Improvement
              </h3>
              <div className="space-y-4">
                {data.hiring_manager_six_areas.what_needs_improve.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-orange-500 pl-4 py-3 bg-orange-50 rounded-r-lg">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.criterion}</h4>
                    <p className="text-sm text-gray-700 mb-2">{item.feedback}</p>
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="space-y-1">
                        {item.evidence.map((ev, eidx) => (
                          <div key={eidx} className="text-xs bg-white border border-orange-200 rounded p-2">
                            <span className="font-semibold text-orange-700">
                              {ev.question_id && `${ev.question_id}`}{ev.timestamp && ` (${ev.timestamp})`}:
                            </span>{' '}
                            <span className="text-gray-600 italic">"{ev.excerpt}"</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cross-Stage Progress */}
      {data.cross_stage_progress && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"/>
            </svg>
            Progress from HR Screen
          </h2>

          {data.cross_stage_progress.improvement_from_hr_screen && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">Overall Progress</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{data.cross_stage_progress.improvement_from_hr_screen}</p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {data.cross_stage_progress.consistent_strengths && data.cross_stage_progress.consistent_strengths.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-green-700 mb-2">Consistent Strengths</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {data.cross_stage_progress.consistent_strengths.map((s, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-green-600 flex-shrink-0">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.cross_stage_progress.persistent_weaknesses && data.cross_stage_progress.persistent_weaknesses.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-orange-700 mb-2">Persistent Weaknesses</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {data.cross_stage_progress.persistent_weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-orange-600 flex-shrink-0">!</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.cross_stage_progress.new_concerns && data.cross_stage_progress.new_concerns.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-red-700 mb-2">New Concerns</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {data.cross_stage_progress.new_concerns.map((c, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-red-600 flex-shrink-0">-</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Management Analysis */}
      {data.time_management_analysis && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
            </svg>
            Time Management & Pacing Analysis
          </h2>

          {(data.time_management_analysis.total_interview_duration || data.time_management_analysis.questions_asked) && (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {data.time_management_analysis.total_interview_duration && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                  <div className="text-sm text-gray-600 mb-1">Total Duration</div>
                  <div className="text-3xl font-bold text-indigo-600">{data.time_management_analysis.total_interview_duration}</div>
                </div>
              )}
              {data.time_management_analysis.questions_asked != null && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
                  <div className="text-sm text-gray-600 mb-1">Questions Asked</div>
                  <div className="text-3xl font-bold text-blue-600">{data.time_management_analysis.questions_asked}</div>
                </div>
              )}
              {data.time_management_analysis.overall_pace && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
                  <div className="text-sm text-gray-600 mb-1">Overall Pace</div>
                  <div className="text-lg font-bold text-purple-600">{data.time_management_analysis.overall_pace}</div>
                </div>
              )}
            </div>
          )}

          {timingData.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 mb-3">Response Length Analysis</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timingData.map((q: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {q.question_id || `Q${idx + 1}`}: {q.question_text || q.question || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">
                          {q.candidate_response_time || q.response_time || q.duration || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            q.assessment === 'appropriate' ? 'bg-green-100 text-green-800' :
                            q.assessment === 'too_long' ? 'bg-orange-100 text-orange-800' :
                            q.assessment === 'too_short' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {q.assessment === 'appropriate' ? 'Appropriate' :
                             q.assessment === 'too_long' ? 'Slightly Long' :
                             q.assessment === 'too_short' ? 'Too Short' :
                             q.assessment || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(data.time_management_analysis.pacing_feedback || data.time_management_analysis.overall_pace) && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
                </svg>
                Pacing Feedback
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {data.time_management_analysis.pacing_feedback || data.time_management_analysis.overall_pace}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comparative Analysis */}
      {data.comparative_analysis && data.comparative_analysis.percentile_estimate != null && (
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
            <p className="text-sm text-gray-700 mb-4">
              You performed better than {data.comparative_analysis.percentile_estimate}% of candidates at the hiring manager interview stage.
            </p>
            <div className="bg-white rounded-lg p-4">
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

          {data.comparative_analysis.resume_vs_interview && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Resume vs. Interview Performance</h4>
              <p className="text-sm text-gray-700">{data.comparative_analysis.resume_vs_interview}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {data.comparative_analysis.standout_qualities && data.comparative_analysis.standout_qualities.length > 0 && (
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
                      <span className="text-green-600 flex-shrink-0">+</span>
                      <span>{quality}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.comparative_analysis.job_requirements_gaps && data.comparative_analysis.job_requirements_gaps.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                  </svg>
                  Job Requirements Gaps
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {data.comparative_analysis.job_requirements_gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-orange-600 flex-shrink-0">-</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Steps Preparation */}
      {data.next_steps_preparation && (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg p-8 mb-6 text-white">
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"/>
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Next Step</span>
                <h2 className="text-2xl font-bold mt-1">Preparing for the Next Round</h2>
              </div>
            </div>

            {/* Readiness Assessment */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/30">
                  <div className="text-sm text-white/80 mb-1">Ready for Next Round?</div>
                  <div className="text-2xl font-bold">{data.next_steps_preparation.ready_for_next_round ? 'Yes' : 'Not Yet'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/30">
                  <div className="text-sm text-white/80 mb-1">Confidence Level</div>
                  <div className="text-2xl font-bold capitalize">{data.next_steps_preparation.confidence_level || 'N/A'}</div>
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
                  Areas to Study Before Next Interview
                </h3>
                <div className="space-y-3">
                  {data.next_steps_preparation.areas_to_study.map((area, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                      <h4 className="font-semibold mb-2">{idx + 1}. {area.topic}</h4>
                      <p className="text-sm text-white/90 mb-2"><strong>Why:</strong> {area.reason}</p>
                      <p className="text-sm text-white/80"><strong>Prep tip:</strong> {area.preparation_tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Predicted Questions */}
            {data.next_steps_preparation.predicted_next_round_questions && data.next_steps_preparation.predicted_next_round_questions.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
                  </svg>
                  Predicted Next Round Questions
                </h3>
                <div className="space-y-2">
                  {data.next_steps_preparation.predicted_next_round_questions.map((question, idx) => (
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
              <div><strong>Graded by:</strong> {data.grading_metadata?.graded_by_agent || 'Claude Sonnet 4'}</div>
              <div><strong>Grading completed:</strong> {data.grading_metadata?.grading_timestamp ? formatDate(data.grading_metadata.grading_timestamp) : 'N/A'}</div>
              {data.rubric_version && <div><strong>Rubric version:</strong> {data.rubric_version}</div>}
              <div><strong>Confidence in assessment:</strong> {data.grading_metadata?.confidence_in_assessment || 'High'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
