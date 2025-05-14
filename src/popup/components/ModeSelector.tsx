import { AnalysisMode } from '../../utils/api'

interface ModeSelectorProps {
  mode: AnalysisMode
  onChange: (mode: AnalysisMode) => void
}

const modes: { value: AnalysisMode; label: string; description: string }[] = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Accessibility & Usability',
  },
  {
    value: 'conversion',
    label: 'Conversion',
    description: 'CTAs & Trust Signals',
  },
  {
    value: 'roast',
    label: 'The Roast',
    description: 'Brutal & Funny',
  },
]

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Analysis Mode
      </label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              mode === m.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`text-sm font-medium ${mode === m.value ? 'text-blue-700' : 'text-gray-900'}`}>
              {m.label}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {m.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
