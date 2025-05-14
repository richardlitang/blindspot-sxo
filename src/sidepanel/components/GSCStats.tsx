interface GSCData {
  clicks: number
  impressions: number
  ctr: number
  position: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number }>
}

interface GSCStatsProps {
  data: GSCData | null
  error: string | null
  onRefresh: () => void
}

export default function GSCStats({ data, error, onRefresh }: GSCStatsProps) {
  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider">Search Console Data</h3>
          <button onClick={onRefresh} className="text-xs text-yellow-500 hover:text-yellow-400">
            Retry
          </button>
        </div>
        <p className="text-sm text-zinc-400">{error}</p>
        <p className="text-xs text-zinc-600 mt-2">
          Make sure this domain is verified in your Search Console.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full" />
          <span className="text-sm text-zinc-400">Loading GSC data...</span>
        </div>
      </div>
    )
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const formatCTR = (ctr: number) => `${(ctr * 100).toFixed(1)}%`
  const formatPosition = (pos: number) => pos.toFixed(1)

  return (
    <div className="space-y-3">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Clicks"
          value={formatNumber(data.clicks)}
          color="yellow"
        />
        <StatCard
          label="Impressions"
          value={formatNumber(data.impressions)}
          color="zinc"
        />
        <StatCard
          label="Avg CTR"
          value={formatCTR(data.ctr)}
          color={data.ctr < 0.02 ? 'red' : data.ctr < 0.05 ? 'yellow' : 'green'}
        />
        <StatCard
          label="Avg Position"
          value={formatPosition(data.position)}
          color={data.position > 20 ? 'red' : data.position > 10 ? 'yellow' : 'green'}
        />
      </div>

      {/* Top Queries */}
      {data.topQueries.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider">Top Keywords</h3>
            <button onClick={onRefresh} className="text-xs text-zinc-600 hover:text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {data.topQueries.slice(0, 5).map((query, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{query.query}</p>
                  <p className="text-xs text-zinc-500">
                    {query.clicks} clicks · {query.impressions} impr
                  </p>
                </div>
                <div className="text-right ml-3">
                  <span
                    className={`text-sm font-medium ${
                      query.ctr < 0.02 ? 'text-red-400' : query.ctr < 0.05 ? 'text-yellow-400' : 'text-green-400'
                    }`}
                  >
                    {formatCTR(query.ctr)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data freshness note */}
      <p className="text-[10px] text-zinc-600 text-center">
        Last 28 days · Data may be delayed up to 48h
      </p>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: 'yellow' | 'zinc' | 'red' | 'green'
}) {
  const colorClasses = {
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    zinc: 'border-zinc-700 bg-zinc-800/50',
    red: 'border-red-500/30 bg-red-500/5',
    green: 'border-green-500/30 bg-green-500/5',
  }

  const valueClasses = {
    yellow: 'text-yellow-500',
    zinc: 'text-zinc-100',
    red: 'text-red-400',
    green: 'text-green-400',
  }

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClasses[color]}`}>{value}</p>
    </div>
  )
}
