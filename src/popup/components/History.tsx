import { useState, useEffect } from 'react'
import { supabase, Audit, AuditResult } from '../../utils/supabase'

interface HistoryProps {
  userId: string
  onViewAudit: (result: AuditResult, url: string) => void
  onBack: () => void
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-green-500',
  'A': 'bg-green-500',
  'A-': 'bg-green-400',
  'B+': 'bg-lime-500',
  'B': 'bg-lime-500',
  'B-': 'bg-lime-400',
  'C+': 'bg-yellow-500',
  'C': 'bg-yellow-500',
  'C-': 'bg-yellow-400',
  'D+': 'bg-orange-500',
  'D': 'bg-orange-500',
  'D-': 'bg-orange-400',
  'F': 'bg-red-500',
}

const modeLabels: Record<string, string> = {
  professional: 'Pro',
  conversion: 'CRO',
  roast: '🔥',
}

export default function History({ userId, onViewAudit, onBack }: HistoryProps) {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAudits()
  }, [userId])

  const fetchAudits = async () => {
    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setAudits(data as Audit[])
    }
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const formatUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      return parsed.hostname.replace('www.', '')
    } catch {
      return url.slice(0, 30)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Audit History</h2>
      </div>

      {audits.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No audits yet</p>
          <p className="text-sm mt-1">Run your first audit to see it here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {audits.map((audit) => (
            <button
              key={audit.id}
              onClick={() => onViewAudit(audit.json_result, audit.url)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Grade badge */}
              <div className={`w-10 h-10 rounded-lg ${gradeColors[audit.grade] || 'bg-gray-400'} flex items-center justify-center text-white font-bold text-sm`}>
                {audit.grade}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {formatUrl(audit.url)}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{formatDate(audit.created_at)}</span>
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                    {modeLabels[audit.mode] || audit.mode}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
