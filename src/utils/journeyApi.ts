import { supabase } from './supabase'

export interface JourneyStep {
  step: number
  url: string
  title: string
  screenshot: string
  timestamp: number
}

export interface JourneySession {
  id: string
  steps: JourneyStep[]
  startTime: number
  isRecording: boolean
}

export interface FlowScore {
  clarity: number
  consistency: number
  friction: number
  trustFlow: number
}

export interface JourneyRoast {
  step: number
  title: string
  complaint: string
  fix: string
}

export interface JourneyResult {
  grade: string
  summary: string
  flowScore: FlowScore
  dropOffRisk: string
  roasts: JourneyRoast[]
}

export interface AnalyzeJourneyResponse {
  success: boolean
  result?: JourneyResult
  error?: string
  credits_remaining?: number
}

export async function analyzeJourney(session: JourneySession): Promise<AnalyzeJourneyResponse> {
  const { data: { session: authSession } } = await supabase.auth.getSession()

  if (!authSession) {
    return { success: false, error: 'Not authenticated' }
  }

  // Prepare screenshots (just the base64 data, not full data URLs)
  const steps = session.steps.map(step => ({
    step: step.step,
    url: step.url,
    title: step.title,
    screenshot: step.screenshot,
  }))

  const { data, error } = await supabase.functions.invoke('analyze-journey', {
    body: { steps },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return data as AnalyzeJourneyResponse
}
