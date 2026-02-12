'use client'

import { useState } from 'react'
import { Lock, Zap, Crown, CheckCircle, ArrowRight } from 'lucide-react'

interface PurchaseFlowProps {
  onClose: () => void
  userEmail?: string
}

const PRODUCTS = [
  {
    id: 'single_hm',
    name: 'Hiring Manager',
    price: '$4.99',
    description: 'Includes initial attempt + 2 retakes',
    popular: false,
  },
  {
    id: 'bundle_3',
    name: 'Full Interview Prep',
    price: '$11.99',
    description: 'All 3 stages with 2 retakes each',
    popular: true,
    savings: 'Save $3',
    stages: ['Hiring Manager', 'Culture Fit', 'Final Round'],
  },
  {
    id: 'single_fr',
    name: 'Final Round',
    price: '$5.99',
    description: 'Includes initial attempt + 2 retakes',
    popular: false,
  },
]

export default function PurchaseFlow({ onClose, userEmail }: PurchaseFlowProps) {
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Continue Your Interview Prep</h2>
          <p className="text-gray-600 mt-2">
            You crushed the HR Screen. Now unlock the rounds that really matter.
          </p>
        </div>

        {/* Products */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCTS.map(product => (
              <div
                key={product.id}
                className={`relative rounded-xl border-2 p-5 transition-all ${
                  product.popular
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {product.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                      Best Value
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{product.price}</p>
                  {product.savings && (
                    <span className="text-sm text-green-600 font-medium">{product.savings}</span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                </div>

                {product.stages && (
                  <div className="mb-4 space-y-1">
                    {product.stages.map(stage => (
                      <div key={stage} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-gray-700">{stage}</span>
                      </div>
                    ))}

                    {/* Skip Culture Fit option */}
                    {product.id === 'bundle_3' && (
                      <label className="flex items-center space-x-2 text-sm mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skipCultureFit}
                          onChange={e => setSkipCultureFit(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-600">
                          Skip Culture Fit (-$2)
                        </span>
                      </label>
                    )}
                  </div>
                )}

                <button
                  onClick={() => handlePurchase(product.id)}
                  disabled={loading !== null}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    product.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {loading === product.id ? 'Processing...' : 'Unlock Now'}
                </button>
              </div>
            ))}
          </div>

          {/* Culture Fit individual */}
          <div className="mt-4 text-center">
            <button
              onClick={() => handlePurchase('single_cf')}
              disabled={loading !== null}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Or unlock Culture Fit only ($3.99)
            </button>
          </div>

          {/* Subscription option */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-sm font-medium text-gray-900">Interview a lot?</p>
            <p className="text-xs text-gray-600 mt-1">Get unlimited access for $24.99/month (up to 5 full processes)</p>
            <button
              onClick={() => handlePurchase('subscription_monthly')}
              disabled={loading !== null}
              className="mt-2 px-4 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-medium disabled:opacity-50"
            >
              {loading === 'subscription_monthly' ? 'Processing...' : 'Subscribe Monthly'}
            </button>
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
          <p className="text-xs text-gray-400">Secure payment via Stripe</p>
        </div>
      </div>
    </div>
  )
}
