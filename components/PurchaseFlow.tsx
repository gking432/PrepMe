'use client'

import { useState } from 'react'
import { Lock, Crown, CheckCircle, Briefcase, Users, Award, X, Zap } from 'lucide-react'

interface PurchaseFlowProps {
  onClose: () => void
  userEmail?: string
  highlightStage?: string // Optional: which stage to highlight (e.g. 'hiring_manager')
}

const INDIVIDUAL_STAGES = [
  {
    id: 'single_hm',
    stage: 'hiring_manager',
    name: 'Hiring Manager Interview',
    price: '$4.99',
    priceCents: 499,
    description: '30-minute deep-dive with your future boss. Covers technical skills, problem-solving, and role fit.',
    icon: Briefcase,
    color: 'indigo',
    attempts: '3 attempts (1 initial + 2 retakes)',
  },
  {
    id: 'single_cf',
    stage: 'culture_fit',
    name: 'Culture Fit Interview',
    price: '$3.99',
    priceCents: 399,
    description: 'Team & values alignment with a senior team member. Covers teamwork, communication, and adaptability.',
    icon: Users,
    color: 'purple',
    attempts: '3 attempts (1 initial + 2 retakes)',
  },
  {
    id: 'single_fr',
    stage: 'final',
    name: 'Final Round Interview',
    price: '$5.99',
    priceCents: 599,
    description: 'Executive-level evaluation with a VP/director. Covers strategic thinking, leadership, and decision-making.',
    icon: Award,
    color: 'amber',
    attempts: '3 attempts (1 initial + 2 retakes)',
  },
]

export default function PurchaseFlow({ onClose, userEmail, highlightStage }: PurchaseFlowProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [skipCultureFit, setSkipCultureFit] = useState(false)

  const handlePurchase = async (productType: string) => {
    setLoading(productType)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: skipCultureFit && productType === 'bundle_3' ? 'bundle_2_no_cf' : productType,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const totalIndividual = 499 + 399 + 599 // $14.97
  const bundlePrice = 1199 // $11.99
  const savingsAmount = ((totalIndividual - bundlePrice) / 100).toFixed(0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-3">
              <CheckCircle className="w-4 h-4" />
              HR Screen: Free forever
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Unlock Paid Interview Stages</h2>
            <p className="text-gray-600 mt-2">
              Practice with AI interviewers that adapt to your resume and job description.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Individual Stages */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Individual Stages</h3>
            <div className="space-y-3">
              {INDIVIDUAL_STAGES.map(stage => {
                const Icon = stage.icon
                const isHighlighted = highlightStage === stage.stage

                return (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      isHighlighted
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isHighlighted ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${isHighlighted ? 'text-indigo-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{stage.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{stage.attempts}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{stage.price}</p>
                      <button
                        onClick={() => handlePurchase(stage.id)}
                        disabled={loading !== null}
                        className={`mt-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                          isHighlighted
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {loading === stage.id ? 'Processing...' : 'Unlock'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bundle Deal */}
          <div className="relative">
            <div className="absolute -top-3 left-4">
              <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-sm">
                Best Value — Save ${savingsAmount}
              </span>
            </div>
            <div className="border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-white rounded-xl p-5 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">Full Interview Prep Bundle</h3>
                  <p className="text-sm text-gray-600 mt-1">All 3 paid stages with 3 attempts each</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['Hiring Manager', 'Culture Fit', 'Final Round'].map(s => (
                      <div key={s} className="flex items-center gap-1.5 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-gray-700">{s}</span>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipCultureFit}
                      onChange={e => setSkipCultureFit(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-500">
                      Skip Culture Fit ({skipCultureFit ? '$9.99' : '-$2.00'})
                    </span>
                  </label>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-sm text-gray-400 line-through">$14.97</p>
                  <p className="text-3xl font-bold text-gray-900">{skipCultureFit ? '$9.99' : '$11.99'}</p>
                  <button
                    onClick={() => handlePurchase('bundle_3')}
                    disabled={loading !== null}
                    className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {loading === 'bundle_3' || loading === 'bundle_2_no_cf' ? 'Processing...' : 'Get Bundle'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Subscription */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-gray-900">Monthly Unlimited</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Up to 5 full interview processes per month. All stages included.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Perfect for active job seekers applying to multiple roles.
                </p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-2xl font-bold text-gray-900">$24.99</p>
                <p className="text-xs text-gray-500">/month</p>
                <button
                  onClick={() => handlePurchase('subscription_monthly')}
                  disabled={loading !== null}
                  className="mt-2 px-5 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-semibold transition-colors disabled:opacity-50"
                >
                  {loading === 'subscription_monthly' ? 'Processing...' : 'Subscribe'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Maybe later
          </button>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            Secure payment via Stripe
          </div>
        </div>
      </div>
    </div>
  )
}
