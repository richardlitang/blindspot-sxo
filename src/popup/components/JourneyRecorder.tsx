import { useState, useEffect } from 'react'

interface JourneyStep {
  step: number
  url: string
  title: string
  screenshot: string
  timestamp: number
}

interface JourneySession {
  id: string
  steps: JourneyStep[]
  startTime: number
  isRecording: boolean
}

interface JourneyRecorderProps {
  onAnalyze: (session: JourneySession) => void
  onBack: () => void
  hasCredits: boolean
}

export default function JourneyRecorder({ onAnalyze, onBack, hasCredits }: JourneyRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [session, setSession] = useState<JourneySession | null>(null)
  const [error, setError] = useState('')

  // Check recording status on mount
  useEffect(() => {
    checkStatus()
  }, [])

  // Poll for step count while recording
  useEffect(() => {
    if (!isRecording) return

    const interval = setInterval(async () => {
      const response = await chrome.runtime.sendMessage({ type: 'JOURNEY_STATUS' })
      if (response) {
        setStepCount(response.stepCount)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording])

  const checkStatus = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'JOURNEY_STATUS' })
    if (response) {
      setIsRecording(response.isRecording)
      setStepCount(response.stepCount)
    }
  }

  const startRecording = async () => {
    if (!hasCredits) {
      setError('No credits remaining. Flow audits cost 5 credits.')
      return
    }

    setError('')
    const response = await chrome.runtime.sendMessage({ type: 'JOURNEY_START' })
    if (response.success) {
      setIsRecording(true)
      setStepCount(1) // Initial capture
    }
  }

  const stopRecording = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'JOURNEY_STOP' })
    if (response.success && response.session) {
      setIsRecording(false)
      setSession(response.session)
    }
  }

  const captureManually = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'JOURNEY_CAPTURE_MANUAL' })
    if (response.success) {
      setStepCount(prev => prev + 1)
    }
  }

  const formatUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      return parsed.pathname === '/' ? parsed.hostname : parsed.pathname
    } catch {
      return url.slice(0, 30)
    }
  }

  // Show captured session for review before analysis
  if (session && !isRecording) {
    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSession(null)
              onBack()
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">Review Journey</h2>
        </div>

        {/* Steps preview */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Captured {session.steps.length} steps. Review before analyzing:
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {session.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {step.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {formatUrl(step.url)}
                  </div>
                </div>
                {/* Thumbnail */}
                <img
                  src={step.screenshot}
                  alt={`Step ${step.step}`}
                  className="w-12 h-8 object-cover rounded border border-gray-200"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Cost warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Cost:</span> This analysis uses {session.steps.length} credits (1 per step)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAnalyze(session)}
            disabled={session.steps.length < 2}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Analyze Flow ({session.steps.length} steps)
          </button>
          <button
            onClick={() => setSession(null)}
            className="py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Discard
          </button>
        </div>
      </div>
    )
  }

  // Recording UI
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded"
          disabled={isRecording}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Flow Audit</h2>
        {isRecording && (
          <span className="ml-auto flex items-center gap-1.5 text-red-600 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording
          </span>
        )}
      </div>

      {/* Instructions */}
      {!isRecording ? (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Start Recording" below</li>
              <li>Navigate through your site (click links, buttons)</li>
              <li>Each page change is automatically captured</li>
              <li>Click "Stop & Analyze" when done</li>
            </ol>
          </div>

          <p className="text-sm text-gray-600">
            Best for: Signup flows, checkout funnels, onboarding sequences
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={startRecording}
            disabled={!hasCredits}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              hasCredits
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Recording
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Step counter */}
          <div className="text-center py-8">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {stepCount}
            </div>
            <p className="text-gray-600">
              {stepCount === 1 ? 'step captured' : 'steps captured'}
            </p>
          </div>

          {/* Instructions while recording */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">
              Navigate to different pages. Each page load is captured automatically.
            </p>
          </div>

          {/* Manual capture button */}
          <button
            onClick={captureManually}
            className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📸 Capture Current Page
          </button>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            disabled={stepCount < 2}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              stepCount >= 2
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {stepCount < 2 ? 'Need at least 2 steps' : 'Stop & Analyze'}
          </button>
        </div>
      )}
    </div>
  )
}
