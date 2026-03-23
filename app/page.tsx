export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Header from '@/components/Header'
import { Sparkles, Target, Zap, Trophy, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

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
              <span className="block bg-primary-500 bg-clip-text text-transparent">
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
                className="group flex items-center space-x-2 px-8 py-4 bg-primary-500 text-white rounded-xl font-semibold text-lg hover:bg-primary-600 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
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
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Company-Specific Practice
              </h3>
              <p className="text-gray-600">
                The AI is briefed on the company, the role, and your resume. It asks the questions your actual interviewer will ask.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
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
              <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Pay per round, not per month
              </h3>
              <p className="text-gray-600">
                HR Screen is free. Unlock individual stages from $3.99 or get the full bundle for $11.99. Each purchase includes 3 attempts.
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
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Your Materials</h3>
                  <p className="text-gray-600">
                    Drop your resume and the job posting URL. We pull the company data, read the role requirements, and build an interviewer who knows exactly what they're looking for.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Practice Your Interview</h3>
                  <p className="text-gray-600">
                    Talk to an AI briefed on the company, the role, and you. Answer out loud. Get scored.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Get Feedback & Practice Again</h3>
                  <p className="text-gray-600">
                    See where you landed on every question. Drill the weak spots. Go again when you're ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20">
          <div className="bg-primary-500 rounded-3xl shadow-2xl p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              The interview is coming. Get ready.
            </h2>
            <p className="text-xl text-primary-100 mb-4 max-w-2xl mx-auto">
              One real practice round is worth more than two hours of reading interview tips.
            </p>
            <p className="text-lg text-primary-200 mb-8 max-w-2xl mx-auto">
              HR Screen free • Individual stages from $3.99 • Full bundle $11.99
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
              © 2026 PrepMe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
