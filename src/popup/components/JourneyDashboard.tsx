import { JourneyResult } from '../../utils/journeyApi'
import { exportJourneyToPDF } from '../../utils/pdfExport'

interface JourneyDashboardProps {
  result: JourneyResult
  stepCount: number
  onBack: () => void
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-green-500 text-white',
  'A': 'bg-green-500 text-white',
  'A-': 'bg-green-400 text-white',
  'B+': 'bg-lime-500 text-white',
  'B': 'bg-lime-500 text-white',
  'B-': 'bg-lime-400 text-white',
  'C+': 'bg-yellow-500 text-black',
  'C': 'bg-yellow-500 text-black',
  'C-': 'bg-yellow-400 text-black',
  'D+': 'bg-orange-500 text-white',
  'D': 'bg-orange-500 text-white',
  'D-': 'bg-orange-400 text-white',
  'F': 'bg-red-500 text-white',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100
  const color = score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{score}/10</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function JourneyDashboard({ result, stepCount, onBack }: JourneyDashboardProps) {
  const gradeClass = gradeColors[result.grade] || 'bg-gray-500 text-white'

  return (
    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold">Flow Audit Results</h2>
          <p className="text-xs text-gray-500">{stepCount} steps analyzed</p>
        </div>
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

      {/* Flow Scores */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Flow Scores</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <ScoreBar label="Clarity" score={result.flowScore.clarity} />
          <ScoreBar label="Consistency" score={result.flowScore.consistency} />
          <ScoreBar label="Low Friction" score={result.flowScore.friction} />
          <ScoreBar label="Trust Flow" score={result.flowScore.trustFlow} />
        </div>
      </div>

      {/* Drop-off Risk */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <h4 className="font-medium text-red-800 mb-1">⚠️ Highest Drop-off Risk</h4>
        <p className="text-sm text-red-700">{result.dropOffRisk}</p>
      </div>

      {/* Issues */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Friction Points</h3>
        {result.roasts.map((issue, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{issue.title}</h4>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Step {issue.step}
              </span>
            </div>
            <p className="text-sm text-gray-600">{issue.complaint}</p>
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <p className="text-sm text-green-800">
                <span className="font-medium">Fix:</span> {issue.fix}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          New Analysis
        </button>
        <button
          onClick={() => exportJourneyToPDF(result, stepCount)}
          className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export PDF
        </button>
      </div>
    </div>
  )
}
