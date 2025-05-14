import type { ReactNode } from 'react'

interface AuditReportProps {
  report: string
}

export default function AuditReport({ report }: AuditReportProps) {
  // Parse markdown-style formatting
  const renderContent = () => {
    const lines = report.split('\n')
    const elements: ReactNode[] = []
    let listItems: string[] = []
    let listKey = 0

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="space-y-2 mb-4">
            {listItems.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-yellow-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )
        listItems = []
      }
    }

    lines.forEach((line, i) => {
      const trimmed = line.trim()

      // Skip empty lines
      if (!trimmed) {
        flushList()
        return
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        flushList()
        elements.push(
          <h4 key={i} className="text-sm font-semibold text-yellow-500 uppercase tracking-wider mt-4 mb-2">
            {trimmed.replace('### ', '')}
          </h4>
        )
        return
      }

      if (trimmed.startsWith('## ')) {
        flushList()
        elements.push(
          <h3 key={i} className="text-base font-semibold text-zinc-100 mt-4 mb-2 pb-1 border-b border-zinc-800">
            {trimmed.replace('## ', '')}
          </h3>
        )
        return
      }

      if (trimmed.startsWith('# ')) {
        flushList()
        elements.push(
          <h2 key={i} className="text-lg font-bold text-zinc-100 mt-4 mb-3">
            {trimmed.replace('# ', '')}
          </h2>
        )
        return
      }

      // List items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '')
        listItems.push(content)
        return
      }

      // Bold text within paragraphs
      const withBold = trimmed.split(/\*\*(.*?)\*\*/).map((part, j) => {
        if (j % 2 === 1) {
          return <strong key={j} className="text-zinc-100">{part}</strong>
        }
        return part
      })

      // Regular paragraph
      flushList()
      elements.push(
        <p key={i} className="text-sm text-zinc-400 mb-3">
          {withBold}
        </p>
      )
    })

    flushList()
    return elements
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-semibold">SXO Analysis Report</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="bg-zinc-800/50 px-4 py-2 border-t border-zinc-700">
        <p className="text-[10px] text-zinc-500 text-center">
          Powered by Gemini 2.0 Flash Vision
        </p>
      </div>
    </div>
  )
}
