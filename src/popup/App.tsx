import { useState } from 'react'
import { useAuth, useProfile } from './hooks/useSupabase'
import { analyzeScreenshot, AnalysisMode } from '../utils/api'
import { analyzeJourney, JourneyResult, JourneySession } from '../utils/journeyApi'
import { AuditResult } from '../utils/supabase'
import { LOADING_QUIPS } from '../utils/prompts'
import Auth from './components/Auth'
import ModeSelector from './components/ModeSelector'
import CreditCounter from './components/CreditCounter'
import Dashboard from './components/Dashboard'
import History from './components/History'
import Settings from './components/Settings'
import JourneyRecorder from './components/JourneyRecorder'
import JourneyDashboard from './components/JourneyDashboard'
import Pricing from './components/Pricing'

type View = 'main' | 'loading' | 'result' | 'history' | 'settings' | 'journey' | 'journey-loading' | 'journey-result' | 'pricing'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, refreshProfile } = useProfile(user?.id)

  const [view, setView] = useState<View>('main')
  const [mode, setMode] = useState<AnalysisMode>('professional')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [resultUrl, setResultUrl] = useState('')
  const [error, setError] = useState('')
  const [loadingQuip, setLoadingQuip] = useState('')
  const [fullPageCapture] = useState(true) // TODO: Add toggle in settings
  const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null)
  const [journeyStepCount, setJourneyStepCount] = useState(0)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  const credits = profile?.credits_balance ?? 0
  const tier = profile?.tier ?? 'free'
  const hasCredits = tier === 'agency' || credits > 0

  const runAnalysis = async () => {
    if (!hasCredits) {
      setError('No credits remaining. Please purchase more.')
      return
    }

    setView('loading')
    setError('')

    // Cycle through quips
    const quips = LOADING_QUIPS[mode]
    let quipIndex = 0
    setLoadingQuip(quips[0])
    const quipInterval = setInterval(() => {
      quipIndex = (quipIndex + 1) % quips.length
      setLoadingQuip(quips[quipIndex])
    }, 2000)

    try {
      // Get screenshot from background script
      const screenshotResponse = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        fullPage: fullPageCapture,
      })
      if (screenshotResponse.error) {
        throw new Error(screenshotResponse.error)
      }

      // Get page context
      const contextResponse = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' })
      const context = contextResponse.context || {}

      // Call API
      const response = await analyzeScreenshot({
        screenshot: screenshotResponse.screenshot,
        mode,
        url: context.url || '',
        context: {
          title: context.title,
          description: context.description,
          h1: context.h1,
        },
      })

      clearInterval(quipInterval)

      if (!response.success) {
        throw new Error(response.error || 'Analysis failed')
      }

      setResult(response.result!)
      setResultUrl(context.url || '')
      setView('result')
      await refreshProfile()
    } catch (err) {
      clearInterval(quipInterval)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setView('main')
    }
  }

  // Handle journey analysis
  const handleJourneyAnalyze = async (session: JourneySession) => {
    setView('journey-loading')
    setJourneyStepCount(session.steps.length)
    setError('')

    // Loading quips for journey
    const quips = [
      'Analyzing user flow...',
      'Checking transition logic...',
      'Finding friction points...',
      'Evaluating consistency...',
      'Hunting for drop-off risks...',
    ]
    let quipIndex = 0
    setLoadingQuip(quips[0])
    const quipInterval = setInterval(() => {
      quipIndex = (quipIndex + 1) % quips.length
      setLoadingQuip(quips[quipIndex])
    }, 2000)

    try {
      const response = await analyzeJourney(session)

      clearInterval(quipInterval)

      if (!response.success) {
        throw new Error(response.error || 'Journey analysis failed')
      }

      setJourneyResult(response.result!)
      setView('journey-result')
      await refreshProfile()
    } catch (err) {
      clearInterval(quipInterval)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setView('journey')
    }
  }

  // View: Journey Recorder
  if (view === 'journey') {
    return (
      <JourneyRecorder
        onAnalyze={handleJourneyAnalyze}
        onBack={() => setView('main')}
        hasCredits={hasCredits}
      />
    )
  }

  // View: Journey Loading
  if (view === 'journey-loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-sm text-gray-600 animate-pulse">{loadingQuip}</p>
        <p className="text-xs text-gray-400 mt-2">Analyzing {journeyStepCount} steps...</p>
      </div>
    )
  }

  // View: Journey Result
  if (view === 'journey-result' && journeyResult) {
    return (
      <JourneyDashboard
        result={journeyResult}
        stepCount={journeyStepCount}
        onBack={() => {
          setJourneyResult(null)
          setView('main')
        }}
      />
    )
  }

  // View: History
  if (view === 'history') {
    return (
      <History
        userId={user.id}
        onViewAudit={(auditResult, url) => {
          setResult(auditResult)
          setResultUrl(url)
          setView('result')
        }}
        onBack={() => setView('main')}
      />
    )
  }

  // View: Settings
  if (view === 'settings') {
    return (
      <Settings
        profile={profile}
        email={user.email || ''}
        onBack={() => setView('main')}
        onSignOut={signOut}
        onGetCredits={() => setView('pricing')}
      />
    )
  }

  // View: Pricing
  if (view === 'pricing') {
    return (
      <Pricing
        currentTier={tier}
        onBack={() => setView('main')}
      />
    )
  }

  if (view === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-sm text-gray-600 animate-pulse">{loadingQuip}</p>
      </div>
    )
  }

  if (view === 'result' && result) {
    return (
      <Dashboard
        result={result}
        url={resultUrl}
        mode={mode}
        onNewAudit={() => {
          setResult(null)
          setResultUrl('')
          setView('main')
        }}
      />
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Blindspot</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('history')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="History"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setView('settings')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Settings"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Credits */}
      <CreditCounter credits={credits} tier={tier} onGetCredits={() => setView('pricing')} />

      {/* Mode Selector */}
      <ModeSelector mode={mode} onChange={setMode} />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={runAnalysis}
        disabled={!hasCredits}
        className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
          hasCredits
            ? mode === 'roast'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {mode === 'roast' ? '🔥 ROAST THIS SITE' : 'Analyze This Page'}
      </button>

      {/* Journey Recorder */}
      <button
        onClick={() => setView('journey')}
        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Record User Flow
      </button>

      {!hasCredits && (
        <button
          onClick={() => setView('pricing')}
          className="block w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700"
        >
          Get More Credits →
        </button>
      )}
    </div>
  )
}
