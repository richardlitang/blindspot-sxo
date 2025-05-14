import { useState } from 'react'
import { Profile } from '../../utils/supabase'

interface SettingsProps {
  profile: Profile | null
  email: string
  onBack: () => void
  onSignOut: () => void
  onGetCredits?: () => void
}

export default function Settings({ profile, email, onBack, onSignOut, onGetCredits }: SettingsProps) {
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false)

  const tierInfo = {
    free: {
      name: 'Free',
      description: 'Started with 3 free credits',
      color: 'bg-gray-100 text-gray-700',
    },
    builder: {
      name: 'Builder Pack',
      description: '20 credits purchased',
      color: 'bg-blue-100 text-blue-700',
    },
    agency: {
      name: 'Agency Pro',
      description: 'Unlimited audits + PDF export',
      color: 'bg-purple-100 text-purple-700',
    },
  }

  const currentTier = tierInfo[profile?.tier || 'free']
  const credits = profile?.credits_balance ?? 0
  const isUnlimited = profile?.tier === 'agency'

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      {/* Account Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Account
          </h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-900">{email}</div>
            <div className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${currentTier.color}`}>
              {currentTier.name}
            </div>
          </div>
        </div>

        {/* Credits Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Credits
          </h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Remaining</span>
              <span className="text-2xl font-bold text-gray-900">
                {isUnlimited ? '∞' : credits}
              </span>
            </div>
            {!isUnlimited && credits < 5 && onGetCredits && (
              <button
                onClick={onGetCredits}
                className="block w-full mt-3 text-center py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Get More Credits
              </button>
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Capture Settings
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Full-page capture</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked={true}
                />
                <div className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition-transform"></div>
              </div>
            </label>
            <p className="text-xs text-gray-500">
              Capture the entire page instead of just the visible area
            </p>
          </div>
        </div>

        {/* Upgrade CTA */}
        {profile?.tier !== 'agency' && onGetCredits && (
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 text-white">
            <h3 className="font-semibold">Upgrade to Agency Pro</h3>
            <p className="text-sm text-purple-100 mt-1">
              Unlimited audits, PDF exports, and whitelabeling
            </p>
            <button
              onClick={onGetCredits}
              className="inline-block mt-3 px-4 py-2 bg-white text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50"
            >
              $49/month →
            </button>
          </div>
        )}

        {/* Links */}
        <div className="space-y-2 pt-2">
          <a
            href="https://blindspot.app/help"
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Help & Support
          </a>
          <a
            href="https://blindspot.app/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Privacy Policy
          </a>
        </div>

        {/* Sign Out */}
        <div className="pt-4 border-t border-gray-200">
          {showConfirmSignOut ? (
            <div className="flex gap-2">
              <button
                onClick={onSignOut}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Confirm Sign Out
              </button>
              <button
                onClick={() => setShowConfirmSignOut(false)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmSignOut(true)}
              className="w-full py-2 px-4 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
