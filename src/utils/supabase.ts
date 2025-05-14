import { createClient } from '@supabase/supabase-js'

// These will be set from chrome.storage or environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type Profile = {
  id: string
  credits_balance: number
  tier: 'free' | 'builder' | 'agency'
  stripe_customer_id: string | null
  created_at: string
}

export type AuditResult = {
  grade: string
  summary: string
  roasts: Array<{
    title: string
    complaint: string
    fix: string
    code?: string
  }>
}

export type Audit = {
  id: string
  user_id: string
  url: string
  grade: string
  mode: string
  json_result: AuditResult
  created_at: string
}
