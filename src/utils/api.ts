import { supabase, AuditResult } from './supabase'

export type AnalysisMode = 'professional' | 'conversion' | 'roast'

export interface AnalyzeRequest {
  screenshot: string // base64
  mode: AnalysisMode
  url: string
  context?: {
    title?: string
    description?: string
    h1?: string
  }
}

export interface AnalyzeResponse {
  success: boolean
  result?: AuditResult
  error?: string
  credits_remaining?: number
}

export async function analyzeScreenshot(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase.functions.invoke('analyze', {
    body: request,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return data as AnalyzeResponse
}

export async function getCredits(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return 0

  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance, tier')
    .eq('id', session.user.id)
    .single()

  if (error || !data) return 0

  // Agency tier has unlimited credits
  if (data.tier === 'agency') return -1 // -1 = unlimited

  return data.credits_balance
}
