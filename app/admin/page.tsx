'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Prompt {
  id: string
  stage: string
  system_prompt: string
  question_set: string[]
  tone: string
  depth_level: string
}

interface EvaluationCriteria {
  id: string
  assessment_area: string
  area_name: string
  description: string
  evaluation_guidelines: string
  rubric: string
  weight: number
  is_active: boolean
}

interface EvaluationSettings {
  id: string
  honesty_level: string
  evaluation_instructions: string
  require_job_alignment: boolean
  require_specific_examples: boolean
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([])
  const [settings, setSettings] = useState<EvaluationSettings | null>(null)
  const [activeTab, setActiveTab] = useState<'prompts' | 'criteria' | 'settings' | 'test'>('prompts')
  const [testFeedback, setTestFeedback] = useState<any>(null)
  const [testingFeedback, setTestingFeedback] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isTestMode = searchParams?.get('test') === 'true'

  useEffect(() => {
    checkAdminAccess()
    loadPrompts()
    loadCriteria()
    loadSettings()
  }, [])

  const checkAdminAccess = async () => {
    // Allow test mode access without authentication
    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    if (isTestMode || isDev) {
      console.log('🔓 Admin access granted (test/development mode)')
      setUser({ email: 'test@prepme.com' }) // Dummy user for test mode
      setLoading(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }

    // Check if user is admin (simple check - in production, use proper role-based access)
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
    // Allow access in development mode or if email matches admin email
    if (process.env.NODE_ENV !== 'development' && session.user.email !== adminEmail) {
      alert('Access denied. Admin only.')
      router.push('/dashboard')
      return
    }

    setUser(session.user)
    setLoading(false)
  }

  const loadPrompts = async () => {
    try {
      // Only load HR screen prompt for now (other stages coming soon)
      const { data, error } = await supabase
        .from('interview_prompts')
        .select('*')
        .eq('stage', 'hr_screen')
        .order('stage')

      if (error) throw error
      if (data) {
        setPrompts(data)
      }
    } catch (error) {
      console.error('Error loading prompts:', error)
      alert('Failed to load prompts')
    }
  }

  const updatePrompt = (index: number, field: keyof Prompt, value: any) => {
    const updated = [...prompts]
    if (field === 'question_set') {
      updated[index] = { ...updated[index], [field]: value.split('\n').filter((q: string) => q.trim()) }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setPrompts(updated)
  }

  const loadCriteria = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_evaluation_criteria')
        .select('*')
        .order('area_name')

      if (error) throw error
      if (data) {
        setCriteria(data)
      }
    } catch (error) {
      console.error('Error loading criteria:', error)
      alert('Failed to load evaluation criteria')
    }
  }

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_evaluation_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const updateCriteria = (index: number, field: keyof EvaluationCriteria, value: any) => {
    const updated = [...criteria]
    if (field === 'weight') {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 1.0 }
    } else if (field === 'is_active') {
      updated[index] = { ...updated[index], [field]: value }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setCriteria(updated)
  }

  const addNewCriteria = () => {
    const newCriteria: EvaluationCriteria = {
      id: `new-${Date.now()}`,
      assessment_area: '',
      area_name: '',
      description: '',
      evaluation_guidelines: '',
      rubric: '',
      weight: 1.0,
      is_active: true,
    }
    setCriteria([...criteria, newCriteria])
  }

  const removeCriteria = async (index: number) => {
    const item = criteria[index]
    if (!item.id.startsWith('new-')) {
      // Delete from database
      const { error } = await supabase
        .from('feedback_evaluation_criteria')
        .delete()
        .eq('id', item.id)
      
      if (error) {
        alert('Failed to delete criteria')
        return
      }
    }
    setCriteria(criteria.filter((_, i) => i !== index))
  }

  const updateSettings = (field: keyof EvaluationSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value })
    }
  }

  const savePrompts = async () => {
    setSaving(true)
    try {
      for (const prompt of prompts) {
        const { error } = await supabase
          .from('interview_prompts')
          .update({
            system_prompt: prompt.system_prompt,
            question_set: prompt.question_set,
            tone: prompt.tone,
            depth_level: prompt.depth_level,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prompt.id)

        if (error) throw error
      }
      alert('Prompts saved successfully!')
    } catch (error) {
      console.error('Error saving prompts:', error)
      alert('Failed to save prompts')
    } finally {
      setSaving(false)
    }
  }

  const saveCriteria = async () => {
    setSaving(true)
    try {
      for (const item of criteria) {
        if (item.id.startsWith('new-')) {
          // Insert new
          const { error } = await supabase
            .from('feedback_evaluation_criteria')
            .insert({
              assessment_area: item.assessment_area,
              area_name: item.area_name,
              description: item.description,
              evaluation_guidelines: item.evaluation_guidelines,
              rubric: item.rubric,
              weight: item.weight,
              is_active: item.is_active,
            })

          if (error) throw error
        } else {
          // Update existing
          const { error } = await supabase
            .from('feedback_evaluation_criteria')
            .update({
              area_name: item.area_name,
              description: item.description,
              evaluation_guidelines: item.evaluation_guidelines,
              rubric: item.rubric,
              weight: item.weight,
              is_active: item.is_active,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)

          if (error) throw error
        }
      }
      alert('Evaluation criteria saved successfully!')
      await loadCriteria() // Reload to get new IDs
    } catch (error) {
      console.error('Error saving criteria:', error)
      alert('Failed to save evaluation criteria')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('feedback_evaluation_settings')
        .upsert({
          id: settings.id,
          honesty_level: settings.honesty_level,
          evaluation_instructions: settings.evaluation_instructions,
          require_job_alignment: settings.require_job_alignment,
          require_specific_examples: settings.require_specific_examples,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      alert('Evaluation settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save evaluation settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Edit interview prompts and feedback evaluation settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('prompts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'prompts'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Interview Prompts
            </button>
            <button
              onClick={() => setActiveTab('criteria')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'criteria'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Evaluation Criteria
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Evaluation Settings
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Feedback
            </button>
          </nav>
        </div>

        {/* Prompts Tab */}
        {activeTab === 'prompts' && (
          <>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Currently editing HR Screen only. Other interview stages (Hiring Manager, Team Interview) will be available in a future update.
              </p>
            </div>
            <div className="space-y-6">
              {prompts.map((prompt, index) => (
                <div key={prompt.id} className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">
                    {prompt.stage.replace('_', ' ')}
                  </h2>

                  {/* System Prompt */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt
                    </label>
                    <textarea
                      value={prompt.system_prompt}
                      onChange={(e) => updatePrompt(index, 'system_prompt', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="System prompt for the AI interviewer..."
                    />
                  </div>

                  {/* Question Set - Optional/Deprecated */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Question Set (Optional - Not used in interviews)
                    </label>
                    <textarea
                      value={prompt.question_set.join('\n')}
                      onChange={(e) => updatePrompt(index, 'question_set', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                      placeholder="Optional: Reference questions (not used during interview)"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Note: The AI interviewer generates questions naturally based on responses. This field is for reference only and does not affect the interview.
                    </p>
                  </div>

                  {/* Tone and Depth */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tone
                      </label>
                      <select
                        value={prompt.tone}
                        onChange={(e) => updatePrompt(index, 'tone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="challenging">Challenging</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Depth Level
                      </label>
                      <select
                        value={prompt.depth_level}
                        onChange={(e) => updatePrompt(index, 'depth_level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="basic">Basic</option>
                        <option value="medium">Medium</option>
                        <option value="deep">Deep</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={savePrompts}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Prompts'}</span>
              </button>
            </div>
          </>
        )}

        {/* Evaluation Criteria Tab */}
        {activeTab === 'criteria' && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Configure assessment areas and evaluation guidelines for honest, job-specific feedback.
              </p>
              <button
                onClick={addNewCriteria}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Criteria</span>
              </button>
            </div>

            <div className="space-y-6">
              {criteria.map((item, index) => (
                <div key={item.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Assessment Area</h2>
                    <button
                      onClick={() => removeCriteria(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assessment Area Key (lowercase, underscores)
                      </label>
                      <input
                        type="text"
                        value={item.assessment_area}
                        onChange={(e) => updateCriteria(index, 'assessment_area', e.target.value)}
                        disabled={!item.id.startsWith('new-')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                        placeholder="e.g., technical_skills"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={item.area_name}
                        onChange={(e) => updateCriteria(index, 'area_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., Technical Skills"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateCriteria(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="What does this area assess?"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evaluation Guidelines
                    </label>
                    <textarea
                      value={item.evaluation_guidelines}
                      onChange={(e) => updateCriteria(index, 'evaluation_guidelines', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Detailed guidelines on how to evaluate this area..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scoring Rubric (1-10 scale)
                    </label>
                    <textarea
                      value={item.rubric}
                      onChange={(e) => updateCriteria(index, 'rubric', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="10: Excellent, 7-9: Good, 4-6: Adequate, 1-3: Poor"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (for overall score calculation)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.weight}
                        onChange={(e) => updateCriteria(index, 'weight', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          onChange={(e) => updateCriteria(index, 'is_active', e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveCriteria}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Criteria'}</span>
              </button>
            </div>
          </>
        )}

        {/* Evaluation Settings Tab */}
        {activeTab === 'settings' && settings && (
          <>
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Honesty Level
                </label>
                <select
                  value={settings.honesty_level}
                  onChange={(e) => updateSettings('honesty_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="lenient">Lenient - More forgiving, focuses on positives</option>
                  <option value="fair">Fair - Balanced assessment</option>
                  <option value="tough">Tough - Direct and honest, highlights gaps</option>
                  <option value="very_tough">Very Tough - Strict evaluation, no sugarcoating</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evaluation Instructions
                </label>
                <textarea
                  value={settings.evaluation_instructions}
                  onChange={(e) => updateSettings('evaluation_instructions', e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="Instructions for the AI evaluator..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  These instructions guide how ChatGPT evaluates interviews. Be specific about requiring honest, tough feedback.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_job_alignment}
                    onChange={(e) => updateSettings('require_job_alignment', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Require strict job alignment evaluation
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  When enabled, feedback must directly compare candidate responses to job requirements.
                </p>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_specific_examples}
                    onChange={(e) => updateSettings('require_specific_examples', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Require specific examples from transcript
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  When enabled, feedback must reference specific quotes or examples from the interview transcript.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Feedback Generation</h2>
            <p className="text-gray-600 mb-6">
              This will create a test interview session with sample data and generate feedback to verify the system is working correctly.
            </p>

            <button
              onClick={async () => {
                setTestingFeedback(true)
                setTestFeedback(null)
                try {
                  const response = await fetch('/api/test/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  })

                  const data = await response.json()

                  if (response.ok) {
                    // Store sessionId in localStorage so feedback page can find it
                    if (data.sessionId) {
                      localStorage.setItem('last_interview_session_id', data.sessionId)
                      console.log('✅ Stored sessionId in localStorage:', data.sessionId)
                    }
                    
                    // Automatically redirect to feedback page
                    window.location.href = '/interview/feedback'
                  } else {
                    console.error('Test feedback error:', data)
                    alert(`❌ Error: ${data.error || 'Failed to generate test feedback'}\n\nDetails: ${data.details || 'No details available'}\n\nCheck the browser console for more info.`)
                    setTestingFeedback(false)
                  }
                } catch (error: any) {
                  console.error('Error testing feedback:', error)
                  alert(`❌ Error: ${error.message || 'Failed to generate test feedback'}\n\nCheck the browser console and server logs for details.`)
                  setTestingFeedback(false)
                }
              }}
              disabled={testingFeedback}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {testingFeedback ? 'Generating Test Feedback...' : 'Generate Test Feedback'}
            </button>

            {testFeedback && (
              <div className="mt-8 space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>✅ Success!</strong> Test feedback generated for session: {testFeedback.sessionId}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Feedback</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Overall Score</h4>
                      <p className="text-3xl font-bold text-indigo-600">{testFeedback.feedback.overall_score}/10</p>
                    </div>

                    {testFeedback.feedback.strengths && testFeedback.feedback.strengths.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Strengths</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {testFeedback.feedback.strengths.map((strength: string, idx: number) => (
                            <li key={idx}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {testFeedback.feedback.weaknesses && testFeedback.feedback.weaknesses.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Areas for Improvement</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {testFeedback.feedback.weaknesses.map((weakness: string, idx: number) => (
                            <li key={idx}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {testFeedback.feedback.suggestions && testFeedback.feedback.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Suggestions</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {testFeedback.feedback.suggestions.map((suggestion: string, idx: number) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {testFeedback.feedback.detailed_feedback && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Detailed Feedback</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{testFeedback.feedback.detailed_feedback}</p>
                      </div>
                    )}

                    {testFeedback.feedback.area_scores && Object.keys(testFeedback.feedback.area_scores).length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Area Scores</h4>
                        <div className="space-y-2">
                          {Object.entries(testFeedback.feedback.area_scores).map(([area, score]: [string, any]) => (
                            <div key={area} className="flex justify-between items-center">
                              <span className="text-gray-600 capitalize">{area.replace(/_/g, ' ')}</span>
                              <span className="font-semibold text-indigo-600">{score}/10</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Link
                      href={`/interview/feedback`}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      View in Feedback Page
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

