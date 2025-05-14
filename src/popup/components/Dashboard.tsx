import { useState } from 'react'
import { AuditResult } from '../../utils/supabase'
import { exportToPDF } from '../../utils/pdfExport'

interface DashboardProps {
  result: AuditResult
  url?: string
  mode?: string
  onNewAudit: () => void
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-grade-a text-white',
  'A': 'bg-grade-a text-white',
  'A-': 'bg-grade-a text-white',
  'B+': 'bg-grade-b text-white',
  'B': 'bg-grade-b text-white',
  'B-': 'bg-grade-b text-white',
  'C+': 'bg-grade-c text-black',
  'C': 'bg-grade-c text-black',
  'C-': 'bg-grade-c text-black',
  'D+': 'bg-grade-d text-white',
  'D': 'bg-grade-d text-white',
  'D-': 'bg-grade-d text-white',
  'F': 'bg-grade-f text-white',
}

const severityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
}

export default function Dashboard({ result, url, mode = 'professional', onNewAudit }: DashboardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const gradeClass = gradeColors[result.grade] || 'bg-gray-500 text-white'

  const formatUrl = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr)
      return parsed.hostname.replace('www.', '')
    } catch {
      return urlStr.slice(0, 40)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Severity based on position (issues are ordered by severity)
  const getSeverity = (index: number) => {
    if (index === 0) return { label: 'High', class: severityColors.high }
    if (index === 1) return { label: 'Medium', class: severityColors.medium }
    return { label: 'Low', class: severityColors.low }
  }

  return (
    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
      {/* Header with URL */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewAudit}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {url && (
          <span className="text-sm text-gray-500 truncate flex-1">{formatUrl(url)}</span>
        )}
      </div>

      {/* Grade */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold ${gradeClass} shadow-lg`}>
          {result.grade}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-700 italic">"{result.summary}"</p>
      </div>

      {/* Issues */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Issues Found</h3>
        {result.roasts.map((issue, index) => {
          const severity = getSeverity(index)
          return (
            <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{issue.title}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${severity.class}`}>
                  {severity.label}
                </span>
              </div>
              <p className="text-sm text-gray-600">{issue.complaint}</p>
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Fix:</span> {issue.fix}
                </p>
              </div>
              {issue.code && (
                <div className="bg-gray-900 rounded p-2 relative group">
                  <code className="text-xs text-green-400 break-all block pr-16">{issue.code}</code>
                  <button
                    onClick={() => copyToClipboard(issue.code!, index)}
                    className="absolute top-1 right-1 text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded transition-colors"
                  >
                    {copiedIndex === index ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onNewAudit}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          New Audit
        </button>
        <button
          onClick={() => exportToPDF(result, { url, mode })}
          className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export PDF
        </button>
      </div>
    </div>
  )
}
