'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import FileUpload from '@/components/FileUpload'
import Link from 'next/link'
import { LogOut, Settings, Play, CheckCircle, Upload, Globe, FileText, Target, User } from 'lucide-react'

type InterviewStage = 'hr_screen' | 'hiring_manager' | 'team_interview'

const STAGE_NAMES: Record<InterviewStage, string> = {
  hr_screen: 'HR Phone Screen',
  hiring_manager: 'Hiring Manager',
  team_interview: 'Team Interview',
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<InterviewStage>('hr_screen')
  const [interviewData, setInterviewData] = useState({
    resumeFile: null as { name: string; text: string } | null,
    resumeText: '',
    jobDescriptionFile: null as { name: string; text: string } | null,
    jobDescriptionText: '',
    jobDescriptionUrl: '',
    companyName: '',
    positionTitle: '',
    companyWebsite: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [fetchingJobDescription, setFetchingJobDescription] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [createAccountChecked, setCreateAccountChecked] = useState(true)
  const [extractedUserInfo, setExtractedUserInfo] = useState<{
    email: string | null
    name: string | null
    phone: string | null
  }>({ email: null, name: null, phone: null })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadInterviewData()
  }, [])

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
    }
    setLoading(false)
  }

  const loadInterviewData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      // Allow access but don't load saved data if not logged in
      return
    }

    const { data: dataArray, error } = await supabase
      .from('user_interview_data')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error loading interview data:', error)
      return
    }

    const data = dataArray && dataArray.length > 0 ? dataArray[0] : null

    if (!data) {
      console.log('No interview data found for user')
      return
    }

    if (data) {
      console.log('Loaded interview data:', {
        hasResumeText: !!data.resume_text && data.resume_text.length > 0,
        hasJobDescriptionText: !!data.job_description_text && data.job_description_text.length > 0,
        resumeTextLength: data.resume_text?.length || 0,
        jobDescriptionTextLength: data.job_description_text?.length || 0,
        companyWebsite: data.company_website,
      })
      
      // Parse company name and position title from job description text if formatted
      const parsed = parseJobDescriptionText(data.job_description_text || '')
      
      setInterviewData({
        resumeFile: data.resume_file_url
          ? { name: 'Resume.pdf', text: data.resume_text || '' }
          : null,
        resumeText: data.resume_text || '',
        jobDescriptionFile: data.job_description_file_url
          ? { name: 'Job Description.pdf', text: data.job_description_text || '' }
          : null,
        jobDescriptionText: parsed.jobDescriptionText,
        jobDescriptionUrl: '',
        companyName: parsed.companyName,
        positionTitle: parsed.positionTitle,
        companyWebsite: data.company_website || '',
        notes: data.notes || '',
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleSave = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    // If no session and checkbox is checked, create account first
    if (!session && createAccountChecked && extractedUserInfo.email) {
      await createAccountFromResume()
      // Wait a moment for account creation, then get new session
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { data: { session: newSession } } = await supabase.auth.getSession()
      if (!newSession) {
        alert('Account creation in progress. Please check your email to complete setup.')
        return
      }
    }
    
    if (!session) return

    setSaving(true)

    try {
      let resumeFileUrl = null
      let jobDescriptionFileUrl = null

      // Format job description text with company name and position title if they exist
      let formattedJobDescriptionText = interviewData.jobDescriptionText
      if (interviewData.companyName || interviewData.positionTitle) {
        // Check if already formatted
        if (!interviewData.jobDescriptionText.includes('Company:') && !interviewData.jobDescriptionText.includes('Position:')) {
          formattedJobDescriptionText = formatJobDescriptionText(interviewData.jobDescriptionText)
        }
      }

      console.log('Saving interview data:', {
        resumeTextLength: interviewData.resumeText.length,
        jobDescriptionTextLength: formattedJobDescriptionText.length,
        companyName: interviewData.companyName,
        positionTitle: interviewData.positionTitle,
        companyWebsite: interviewData.companyWebsite,
      })
      
      const { data: savedData, error } = await supabase
        .from('user_interview_data')
        .upsert({
          user_id: session.user.id,
          resume_text: interviewData.resumeText,
          resume_file_url: resumeFileUrl,
          job_description_text: formattedJobDescriptionText,
          job_description_file_url: jobDescriptionFileUrl,
          company_website: interviewData.companyWebsite,
          notes: interviewData.notes,
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error('Error saving interview data:', error)
        throw error
      }

      console.log('Interview data saved successfully:', savedData)
      alert('Interview data saved successfully!')
    } catch (error: any) {
      console.error('Error saving data:', error)
      alert('Error saving data. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatJobDescriptionText = (text: string) => {
    const parts: string[] = []
    
    if (interviewData.companyName) {
      parts.push(`Company: ${interviewData.companyName}`)
    }
    
    if (interviewData.positionTitle) {
      parts.push(`Position: ${interviewData.positionTitle}`)
    }
    
    if (parts.length > 0) {
      parts.push('') // Empty line separator
      parts.push('---')
      parts.push('') // Empty line separator
    }
    
    parts.push(text)
    
    return parts.join('\n')
  }

  const parseJobDescriptionText = (text: string) => {
    // Try to extract company name and position title from formatted text
    const companyMatch = text.match(/^Company:\s*(.+)$/m)
    const positionMatch = text.match(/^Position:\s*(.+)$/m)
    
    let companyName = ''
    let positionTitle = ''
    let jobDescriptionText = text
    
    if (companyMatch || positionMatch) {
      // Extract company name and position title
      if (companyMatch) {
        companyName = companyMatch[1].trim()
      }
      
      if (positionMatch) {
        positionTitle = positionMatch[1].trim()
      }
      
      // Remove the formatted header if it exists
      const headerEnd = text.indexOf('---')
      if (headerEnd > -1) {
        jobDescriptionText = text.substring(headerEnd + 3).trim()
      } else {
        // If no separator, try to remove the header lines
        const lines = text.split('\n')
        const filteredLines: string[] = []
        let foundHeader = false
        for (const line of lines) {
          if (line.startsWith('Company:') || line.startsWith('Position:')) {
            foundHeader = true
            continue
          }
          if (foundHeader && line.trim() === '') {
            continue // Skip empty line after header
          }
          if (foundHeader) {
            filteredLines.push(line)
          } else if (!foundHeader) {
            filteredLines.push(line)
          }
        }
        jobDescriptionText = filteredLines.join('\n').trim()
      }
    }
    
    return { companyName, positionTitle, jobDescriptionText }
  }

  const getDomainName = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      const hostname = urlObj.hostname.replace('www.', '')
      // Extract main domain (e.g., "indeed.com" from "jobs.indeed.com")
      const parts = hostname.split('.')
      if (parts.length >= 2) {
        return parts[parts.length - 2] + '.' + parts[parts.length - 1]
      }
      return hostname
    } catch {
      return 'this website'
    }
  }

  const extractUserInfoFromResume = (text: string) => {
    if (!text || text.trim().length === 0) {
      setExtractedUserInfo({ email: null, name: null, phone: null })
      return
    }

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emails = text.match(emailRegex)
    const email = emails && emails.length > 0 ? emails[0] : null

    // Extract phone number (various formats)
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
    const phones = text.match(phoneRegex)
    const phone = phones && phones.length > 0 ? phones[0].replace(/\s+/g, '-') : null

    // Extract name (usually at the beginning of resume, before email/phone)
    // Look for lines that look like names (2-4 words, capitalized)
    const lines = text.split('\n').slice(0, 10) // Check first 10 lines
    let name = null
    for (const line of lines) {
      const trimmed = line.trim()
      // Check if line looks like a name (2-4 words, mostly capitalized, no special chars except hyphens/apostrophes)
      if (trimmed && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(trimmed) && trimmed.length < 50) {
        // Make sure it's not an email or phone
        if (!trimmed.includes('@') && !/\d{3}/.test(trimmed)) {
          name = trimmed
          break
        }
      }
    }

    setExtractedUserInfo({ email, name, phone })
  }

  const createAccountFromResume = async () => {
    if (!createAccountChecked || !extractedUserInfo.email) {
      return
    }

    try {
      // TODO: Implement account creation logic
      // For now, we'll use Supabase's signUp with a temporary password
      // and send a password reset email, or use magic link
      // Password logic will be handled later as requested
      
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!'
      
      const { data, error } = await supabase.auth.signUp({
        email: extractedUserInfo.email,
        password: tempPassword,
        options: {
          data: {
            full_name: extractedUserInfo.name || '',
            phone: extractedUserInfo.phone || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        // If user already exists, try to sign in with magic link
        if (error.message.includes('already registered')) {
          // Send magic link instead
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: extractedUserInfo.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
          if (magicLinkError) {
            console.error('Error sending magic link:', magicLinkError)
          }
        } else {
          console.error('Error creating account:', error)
        }
        return
      }

      if (data.user) {
        // Update user profile with extracted info
        await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: extractedUserInfo.email,
            full_name: extractedUserInfo.name || '',
          })

        // Send password reset email so user can set their own password
        await supabase.auth.resetPasswordForEmail(extractedUserInfo.email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        // Refresh the page to update user state
        router.refresh()
      }
    } catch (error) {
      console.error('Error creating account from resume:', error)
    }
  }

  const handleFetchJobDescription = async () => {
    if (!interviewData.jobDescriptionUrl || !interviewData.jobDescriptionUrl.trim()) {
      setFetchError('Please enter a job description URL')
      return
    }

    setFetchError(null)
    setFetchingJobDescription(true)
    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: interviewData.jobDescriptionUrl }),
      })

      const data = await response.json()
      
      if (data.success && data.content && data.content.trim().length > 0) {
        // Format the job description with company name and position title
        const formattedText = formatJobDescriptionText(data.content)
        setInterviewData({
          ...interviewData,
          jobDescriptionText: formattedText,
        })
        setFetchError(null) // Clear any previous errors
      } else {
        // If the API returned an error or empty content, show a helpful message
        const errorMsg = data.error || 'Failed to extract job description from URL'
        const is403 = errorMsg.includes('403') || errorMsg.includes('Access denied')
        const is404 = errorMsg.includes('404')
        
        const domainName = getDomainName(interviewData.jobDescriptionUrl)
        let userMessage = ''
        
        if (is403) {
          userMessage = `${domainName.charAt(0).toUpperCase() + domainName.slice(1)} blocks automated access. Please copy and paste the job description manually into the text area below.`
        } else if (is404) {
          userMessage = `The URL could not be found. Please check the URL and try again, or paste the job description manually.`
        } else {
          userMessage = `${errorMsg}. You can still paste the job description manually into the text area below.`
        }
        
        setFetchError(userMessage)
      }
    } catch (error: any) {
      console.error('Error fetching job description:', error)
      const domainName = getDomainName(interviewData.jobDescriptionUrl)
      const errorMessage = error.message || 'Network error. Please check your connection and try again.'
      setFetchError(`${domainName.charAt(0).toUpperCase() + domainName.slice(1)}: ${errorMessage}. You can still paste the job description manually into the text area below.`)
    } finally {
      setFetchingJobDescription(false)
    }
  }

  const canStartInterview = () => {
    return (
      (interviewData.resumeText.length > 0 || interviewData.resumeFile) &&
      interviewData.jobDescriptionText.length > 0
    )
  }

  const handleStartInterview = async (stage: InterviewStage = selectedStage) => {
    if (!canStartInterview()) {
      alert('Please fill in your resume and job description before starting the interview.')
      return
    }

    // For HR screen, allow starting without account
    // Account creation will be handled after interview completion if checkbox is checked
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    // If no session, we'll create a temporary/anonymous session or handle it in the interview flow
    // For now, allow proceeding - the interview API will handle anonymous sessions
    if (!session) {
      // Store interview data temporarily in localStorage for anonymous users
      // This will be used when creating the session during the interview
      localStorage.setItem('temp_interview_data', JSON.stringify({
        resumeText: interviewData.resumeText,
        jobDescriptionText: interviewData.jobDescriptionText,
        companyName: interviewData.companyName,
        positionTitle: interviewData.positionTitle,
        companyWebsite: interviewData.companyWebsite,
        notes: interviewData.notes,
        createAccountChecked: createAccountChecked,
        extractedUserInfo: extractedUserInfo,
      }))
    }

    try {
      // Format job description text with company name and position title if they exist
      let formattedJobDescriptionText = interviewData.jobDescriptionText
      if (interviewData.companyName || interviewData.positionTitle) {
        // Check if already formatted
        if (!interviewData.jobDescriptionText.includes('Company:') && !interviewData.jobDescriptionText.includes('Position:')) {
          formattedJobDescriptionText = formatJobDescriptionText(interviewData.jobDescriptionText)
        }
      }

      // If user has a session, save to database
      if (session) {
        console.log('Auto-saving interview data before starting interview:', {
          resumeTextLength: interviewData.resumeText.length,
          jobDescriptionTextLength: formattedJobDescriptionText.length,
          companyName: interviewData.companyName,
          positionTitle: interviewData.positionTitle,
          companyWebsite: interviewData.companyWebsite,
        })

        let resumeFileUrl = null
        let jobDescriptionFileUrl = null

        const { data: savedData, error } = await supabase
          .from('user_interview_data')
          .upsert({
            user_id: session.user.id,
            resume_text: interviewData.resumeText,
            resume_file_url: resumeFileUrl,
            job_description_text: formattedJobDescriptionText,
            job_description_file_url: jobDescriptionFileUrl,
            company_website: interviewData.companyWebsite,
            notes: interviewData.notes,
            updated_at: new Date().toISOString(),
          })
          .select()

        if (error) {
          console.error('Error saving interview data:', error)
          // Don't block - continue to interview even if save fails
        } else {
          console.log('Interview data saved successfully, starting interview:', savedData)
        }
      }

      // Navigate to interview page with the selected stage (will handle anonymous sessions there)
      router.push(`/interview?stage=${stage}`)
    } catch (error: any) {
      console.error('Error starting interview:', error)
      alert('Error starting interview. Please try again.')
    }
  }

  const getCompletionStatus = () => {
    const hasResume = interviewData.resumeText.length > 0 || interviewData.resumeFile
    const hasJobDesc = interviewData.jobDescriptionText.length > 0
    const total = 2
    const completed = (hasResume ? 1 : 0) + (hasJobDesc ? 1 : 0)
    return { completed, total, percentage: (completed / total) * 100 }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const status = getCompletionStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <img
                src="/logo.svg"
                alt="PrepMe"
                className="h-12 w-auto"
              />
            </Link>
            <div className="flex items-center space-x-4">
              {user?.email && (
                <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              )}
              {user && (
                <Link
                  href="/profile"
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              )}
              <Link
                href="/interview/feedback"
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Feedback</span>
              </Link>
              <Link
                href="/admin?test=true"
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              {user?.email && (
                <Link
                  href="/admin"
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors hidden"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-700 hover:text-primary-500 font-medium transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {user ? 'Welcome back! 👋' : 'Welcome to PrepMe! 👋'}
          </h2>
          <p className="text-lg text-gray-600">
            {user 
              ? "Let's prepare you for your next big opportunity"
              : "Let's prepare you for your next big opportunity. Get started by uploading your resume and job description."}
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-br from-primary-500 to-accent-400 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-1">Your Progress</p>
              <p className="text-2xl font-bold">{status.completed} of {status.total} steps completed</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(status.percentage)}%</span>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${status.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Start interview card - show first when user is ready (resume + JD on file) */}
        {canStartInterview() && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border-2 border-primary-100">
            <div className="p-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    You&apos;re ready to practice
                  </h3>
                  <p className="text-gray-600">
                    Your resume and job description are set. Choose a stage and start the interview.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                  {(['hr_screen', 'hiring_manager', 'team_interview'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedStage(s)}
                      className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                        selectedStage === s
                          ? 'bg-white text-primary-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {STAGE_NAMES[s]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleStartInterview(selectedStage)}
                  disabled={saving}
                  className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-primary-500 to-accent-400 hover:from-primary-600 hover:to-accent-500 shadow-lg transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Begin {STAGE_NAMES[selectedStage]} Interview</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Setup Your Interview
                </h3>
                <p className="text-gray-600">
                  Fill in the details below to get started
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Resume Upload */}
              <div className="group">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    {interviewData.resumeFile || interviewData.resumeText ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <label className="text-lg font-semibold text-gray-900">
                    Resume <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="pl-10">
                  <FileUpload
                    label=""
                    onFileUploaded={(file, text) => {
                      setInterviewData({
                        ...interviewData,
                        resumeFile: { name: file.name, text },
                        resumeText: text,
                      })
                      // Extract user info from resume
                      extractUserInfoFromResume(text)
                    }}
                    onFileRemoved={() => {
                      setInterviewData({
                        ...interviewData,
                        resumeFile: null,
                        resumeText: '',
                      })
                      setExtractedUserInfo({ email: null, name: null, phone: null })
                    }}
                    currentFile={interviewData.resumeFile || undefined}
                  />
                  {!interviewData.resumeFile && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Or paste your resume text</p>
                      <textarea
                        value={interviewData.resumeText}
                        onChange={(e) => {
                          setInterviewData({ ...interviewData, resumeText: e.target.value })
                          // Extract user info from resume
                          extractUserInfoFromResume(e.target.value)
                        }}
                        rows={6}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Paste your resume text here..."
                      />
                    </div>
                  )}
                  {/* Create Account Checkbox - Only show if user is not logged in */}
                  {!user && (interviewData.resumeFile || interviewData.resumeText) && (
                    <div className="mt-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createAccountChecked}
                          onChange={(e) => setCreateAccountChecked(e.target.checked)}
                          className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {extractedUserInfo.email 
                            ? `Use ${extractedUserInfo.email} to create my free account`
                            : 'Create a free account with my resume information'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description URL */}
              <div className="group">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    {interviewData.jobDescriptionText ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Globe className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <label className="text-lg font-semibold text-gray-900">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="pl-10">
                  <div className="space-y-4">
                    {/* Job Description URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Description URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={interviewData.jobDescriptionUrl || ''}
                          onChange={(e) => {
                            setInterviewData({
                              ...interviewData,
                              jobDescriptionUrl: e.target.value,
                            })
                            // Clear error when user changes URL
                            if (fetchError) setFetchError(null)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleFetchJobDescription()
                            }
                          }}
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="https://example.com/job-posting or https://linkedin.com/jobs/view/..."
                        />
                        <button
                          onClick={handleFetchJobDescription}
                          disabled={!interviewData.jobDescriptionUrl || fetchingJobDescription}
                          className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                        >
                          {fetchingJobDescription ? 'Fetching...' : 'Fetch'}
                        </button>
                      </div>
                      {fetchError ? (
                        <p className="mt-2 text-xs text-red-600 font-medium">
                          {fetchError}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">
                          Enter the URL of the job posting and click Fetch to extract the job description
                        </p>
                      )}
                    </div>

                    {/* Company Name and Position Title */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={interviewData.companyName || ''}
                          onChange={(e) => {
                            setInterviewData({
                              ...interviewData,
                              companyName: e.target.value,
                            })
                            // Clear error when user starts typing
                            if (fetchError) setFetchError(null)
                          }}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                            fetchError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="e.g., Google, Microsoft"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position Title
                        </label>
                        <input
                          type="text"
                          value={interviewData.positionTitle || ''}
                          onChange={(e) => {
                            setInterviewData({
                              ...interviewData,
                              positionTitle: e.target.value,
                            })
                            // Clear error when user starts typing
                            if (fetchError) setFetchError(null)
                          }}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                            fetchError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="e.g., Software Engineer, Product Manager"
                        />
                      </div>
                    </div>

                    {interviewData.jobDescriptionText && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Extracted Job Description</p>
                          <button
                            onClick={() => {
                              setInterviewData({
                                ...interviewData,
                                jobDescriptionText: '',
                                jobDescriptionUrl: '',
                              })
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Clear
                          </button>
                        </div>
                        <textarea
                          value={interviewData.jobDescriptionText}
                          onChange={(e) => {
                            setInterviewData({
                              ...interviewData,
                              jobDescriptionText: e.target.value,
                            })
                            // Clear error when user starts typing
                            if (fetchError) setFetchError(null)
                          }}
                          rows={8}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                            fetchError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="Job description will appear here after fetching..."
                        />
                      </div>
                    )}
                    {!interviewData.jobDescriptionText && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Or paste the job description manually</p>
                        <textarea
                          value={interviewData.jobDescriptionText}
                          onChange={(e) => {
                            setInterviewData({
                              ...interviewData,
                              jobDescriptionText: e.target.value,
                            })
                            // Clear error when user starts typing
                            if (fetchError) setFetchError(null)
                          }}
                          rows={6}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                            fetchError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="Paste the job description here..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Website */}
              <div className="group">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <label className="text-lg font-semibold text-gray-900">
                    Company Website <span className="text-gray-400 text-sm font-normal">(optional)</span>
                  </label>
                </div>
                <div className="pl-10">
                  <input
                    type="url"
                    value={interviewData.companyWebsite}
                    onChange={(e) =>
                      setInterviewData({ ...interviewData, companyWebsite: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="https://company.com"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="group">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-500" />
                  </div>
                  <label className="text-lg font-semibold text-gray-900">
                    Additional Notes <span className="text-gray-400 text-sm font-normal">(optional)</span>
                  </label>
                </div>
                <div className="pl-10">
                  <textarea
                    value={interviewData.notes}
                    onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Any additional information about the role or company..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-semibold transition-all"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>

              {/* Interview stage tabs + Begin button */}
              {canStartInterview() && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Start an interview</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                      {(['hr_screen', 'hiring_manager', 'team_interview'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedStage(s)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            selectedStage === s
                              ? 'bg-white text-primary-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {STAGE_NAMES[s]}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleStartInterview(selectedStage)}
                      disabled={saving}
                      className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-primary-500 to-accent-400 hover:from-primary-600 hover:to-accent-500 shadow-lg transition-all"
                    >
                      <Play className="w-4 h-4" />
                      <span>Begin {STAGE_NAMES[selectedStage]} Interview</span>
                    </button>
                  </div>
                </div>
              )}
              {!canStartInterview() && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  Complete resume and job description above to start an interview
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Previous Interviews */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Interview History</h3>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No previous interviews yet</p>
            <p className="text-sm text-gray-400 mt-1">Your completed interviews will appear here</p>
          </div>
        </div>
      </main>
    </div>
  )
}