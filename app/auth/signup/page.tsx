'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

export default function SignupPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Pre-fill email from URL params or localStorage
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // Check localStorage for temp data
      const tempDataStr = localStorage.getItem('temp_interview_data')
      if (tempDataStr) {
        try {
          const tempData = JSON.parse(tempDataStr)
          if (tempData.extractedUserInfo?.email) {
            setEmail(tempData.extractedUserInfo.email)
          }
          if (tempData.extractedUserInfo?.name) {
            setFullName(tempData.extractedUserInfo.name)
          }
        } catch (e) {
          console.error('Error parsing temp data:', e)
        }
      }
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Migrate localStorage data to account
        await migrateLocalStorageToAccount()
        router.push('/interview/feedback')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  const migrateLocalStorageToAccount = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('No session found for migration')
      return
    }

    try {
      // Get temp data from localStorage
      const tempDataStr = localStorage.getItem('temp_interview_data')
      const lastSessionId = localStorage.getItem('last_interview_session_id')

      if (tempDataStr) {
        const tempData = JSON.parse(tempDataStr)

        // Format job description
        let formattedJobDescriptionText = tempData.jobDescriptionText
        if (tempData.companyName || tempData.positionTitle) {
          if (!tempData.jobDescriptionText.includes('Company:') && !tempData.jobDescriptionText.includes('Position:')) {
            const parts: string[] = []
            if (tempData.companyName) parts.push(`Company: ${tempData.companyName}`)
            if (tempData.positionTitle) parts.push(`Position: ${tempData.positionTitle}`)
            if (parts.length > 0) {
              parts.push('', '---', '')
            }
            parts.push(tempData.jobDescriptionText)
            formattedJobDescriptionText = parts.join('\n')
          }
        }

        // Save interview data to account
        const { error: saveError } = await supabase
          .from('user_interview_data')
          .upsert({
            user_id: session.user.id,
            resume_text: tempData.resumeText,
            job_description_text: formattedJobDescriptionText,
            company_website: tempData.companyWebsite,
            notes: tempData.notes,
            updated_at: new Date().toISOString(),
          })

        if (saveError) {
          console.error('Error saving interview data:', saveError)
          throw saveError
        }

        // Update interview session with user_id if we have a session ID
        if (lastSessionId) {
          await supabase
            .from('interview_sessions')
            .update({ user_id: session.user.id })
            .eq('id', lastSessionId)
        }

        // Clear localStorage
        localStorage.removeItem('temp_interview_data')
        localStorage.removeItem('last_interview_session_id')

        console.log('Successfully migrated interview data to account')
      }
    } catch (error) {
      console.error('Error migrating data:', error)
      // Don't throw - allow signup to complete even if migration fails
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google signup')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src="/logo.svg" alt="PrepMe" className="h-7 w-auto" />
          <span className="text-[17px] font-bold tracking-tight text-slate-900">PrepMe</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Real interview practice, built for your role.</p>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-3" onSubmit={handleSignup}>
            <div>
              <label htmlFor="fullName" className="text-xs font-semibold text-slate-700">Full name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="field-shell mt-1"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-shell mt-1"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-shell mt-1"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-coach-primary mt-2 flex w-full items-center justify-center px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-2 text-xs font-medium text-slate-400">or</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="btn-coach-secondary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-accent-600 hover:text-accent-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

