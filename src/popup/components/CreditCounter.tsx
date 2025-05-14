interface CreditCounterProps {
  credits: number // -1 = unlimited (agency)
  tier: string
  onGetCredits?: () => void
}

export default function CreditCounter({ credits, tier, onGetCredits }: CreditCounterProps) {
  const isUnlimited = credits === -1 || tier === 'agency'
  const isLow = !isUnlimited && credits <= 3

  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Credits</span>
        {isLow && !isUnlimited && (
          <span className="text-xs text-orange-600 font-medium">Low</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${credits === 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {isUnlimited ? '∞' : credits}
        </span>
        {isLow && onGetCredits && (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </div>
    </>
  )

  if (isLow && onGetCredits) {
    return (
      <button
        onClick={onGetCredits}
        className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
      {content}
    </div>
  )
}
