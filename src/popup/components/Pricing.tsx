import { useState } from 'react'
import { openCheckout, PRICING, PriceType } from '../../utils/lemonsqueezy'

interface PricingProps {
  currentTier: string
  onBack: () => void
}

export default function Pricing({ currentTier, onBack }: PricingProps) {
  const [loading, setLoading] = useState<PriceType | null>(null)
  const [error, setError] = useState('')

  const handlePurchase = async (priceType: PriceType) => {
    setLoading(priceType)
    setError('')

    const result = await openCheckout(priceType)

    if (!result.success) {
      setError(result.error || 'Failed to start checkout')
    }

    setLoading(null)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Get Credits</h2>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="space-y-3">
        {/* Builder Pack */}
        <div className={`border-2 rounded-xl p-4 ${currentTier === 'builder' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{PRICING.builder.name}</h3>
              <p className="text-xs text-gray-500">Best for indie hackers</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">{PRICING.builder.price}</span>
              <span className="text-sm text-gray-500"> {PRICING.builder.priceDetail}</span>
            </div>
          </div>

          <ul className="space-y-1.5 mb-4">
            {PRICING.builder.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handlePurchase('builder')}
            disabled={loading !== null}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'builder' ? 'Loading...' : 'Buy Credits'}
          </button>
        </div>

        {/* Agency Pro */}
        <div className={`border-2 rounded-xl p-4 relative ${currentTier === 'agency' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
          {currentTier !== 'agency' && (
            <span className="absolute -top-2 right-4 px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
              BEST VALUE
            </span>
          )}

          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{PRICING.agency.name}</h3>
              <p className="text-xs text-gray-500">Best for agencies</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">{PRICING.agency.price}</span>
              <span className="text-sm text-gray-500">{PRICING.agency.priceDetail}</span>
            </div>
          </div>

          <ul className="space-y-1.5 mb-4">
            {PRICING.agency.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          {currentTier === 'agency' ? (
            <button
              disabled
              className="w-full py-2.5 px-4 bg-gray-200 text-gray-600 rounded-lg font-medium cursor-not-allowed"
            >
              Current Plan
            </button>
          ) : (
            <button
              onClick={() => handlePurchase('agency')}
              disabled={loading !== null}
              className="w-full py-2.5 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'agency' ? 'Loading...' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center">
        Secure payment via Stripe. Cancel anytime.
      </p>
    </div>
  )
}
