import Link from 'next/link'
import { Sparkles, Target, Zap, Trophy, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200">
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
              <Link
                href="/auth/login"
                className="text-sm text-gray-700 hover:text-primary-500 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-lg font-medium hover:from-primary-600 hover:to-accent-500 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-primary-100 px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-primary-500">Practice with AI that knows the company</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Ace Your Next
              <span className="block bg-gradient-to-r from-primary-500 to-accent-400 bg-clip-text text-transparent">
                Job Interview
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Practice with an AI interviewer that has intimate knowledge of the company and job description. 
              Get feedback, practice specific questions, and run through the whole interview again until you're ready to land the job.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-400 text-white rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-accent-500 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-primary-500 hover:text-primary-500 transition-all">
                Watch Demo
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose PrepMe?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to prepare for your interview in one place
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-400 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Company-Specific Practice
              </h3>
              <p className="text-gray-600">
                Our AI has deep knowledge of the company and job description you're applying for. Get interview questions and feedback tailored to your specific role and company culture.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-400 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Practice & Improve
              </h3>
              <p className="text-gray-600">
                Get detailed feedback on your responses, then practice specific questions flagged for improvement directly in the dashboard. Run through the whole interview again until you're confident.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-400 rounded-xl flex items-center justify-center mb-6">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                One-Time Payment
              </h3>
              <p className="text-gray-600">
                Pay once, unlock all interview rounds with 3 practice attempts each. Land the job and never pay again. No subscription, no recurring fees.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-400 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Your Materials</h3>
                  <p className="text-gray-600">
                    Share your resume and the job description URL. Our AI will analyze both and gather company information to create an interviewer with intimate knowledge of the company and role you're applying for.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-400 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Practice Your Interview</h3>
                  <p className="text-gray-600">
                    Engage in a realistic mock interview with an AI that knows the company, role, and your background. Answer naturally and get real-time feedback on your responses.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-400 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Get Feedback & Practice Again</h3>
                  <p className="text-gray-600">
                    Receive detailed feedback on your responses. Practice specific questions flagged for improvement right in the dashboard, then run through the whole interview again. Repeat until you're ready to land the job.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20">
          <div className="bg-gradient-to-br from-primary-500 to-accent-400 rounded-3xl shadow-2xl p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Land Your Dream Job?
            </h2>
            <p className="text-xl text-primary-100 mb-4 max-w-2xl mx-auto">
              Practice with an AI that knows the company and role. Get feedback, improve, and practice again until you're confident.
            </p>
            <p className="text-lg text-primary-200 mb-8 max-w-2xl mx-auto">
              One-time payment • No subscription • Land the job and never pay again
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-500 rounded-xl font-semibold text-lg hover:bg-gray-50 shadow-xl transition-all transform hover:scale-105"
            >
              <span>Start Practicing Now</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Link href="/" className="flex items-center mb-4 md:mb-0">
              <img
                src="/logo.svg"
                alt="PrepMe"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-gray-600 text-sm">
              © 2025 PrepMe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
