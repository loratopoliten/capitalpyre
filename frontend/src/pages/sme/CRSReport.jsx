import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'
import CRSGauge from '../../components/ui/CRSGauge'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MAX = { financial_health: 25, governance: 20, track_record: 20, documentation: 20, pitch_quality: 15 }

export default function SmeCRS() {
  const qc = useQueryClient()

  const { data: crs, isLoading } = useQuery({
    queryKey: ['crs-me'],
    queryFn: () => api.get('/crs/me').then(r => r.data.data),
  })

  const { data: benchmarks } = useQuery({
    queryKey: ['crs-benchmarks'],
    queryFn: () => api.get('/crs/benchmarks?role=sme').then(r => r.data.data),
  })

  const compute = useMutation({
    mutationFn: () => api.post('/crs/compute'),
    onSuccess: (res) => {
      qc.setQueryData(['crs-me'], old => ({
        ...(old || {}),
        crs_score: res.data.crs_score,
        crs_breakdown: res.data.breakdown,
        crs_computed_at: new Date().toISOString(),
        tips: res.data.tips,
      }))
      qc.invalidateQueries({ queryKey: ['crs-me'] })
    },
  })

  const score     = crs?.crs_score || 0
  const breakdown = crs?.crs_breakdown || {}
  const tips      = compute.data?.data?.tips || []
  const history   = (crs?.history || []).map(h => ({
    date: new Date(h.computed_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    score: parseFloat(h.crs_score),
  }))

  const TOOLTIP_STYLE = {
    contentStyle: { background: '#243B55', border: '1px solid rgba(239,191,4,0.2)', borderRadius: 8 },
    labelStyle: { color: '#fff', fontSize: 11 },
    itemStyle: { color: '#EFBF04', fontSize: 11 },
  }

  return (
    <div className="space-y-6 page-enter max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Capital Readiness Score</h1>
          <p className="section-sub">Your investability rating — updated every time you improve your profile.</p>
        </div>
        <button
          onClick={() => compute.mutate()}
          disabled={compute.isPending}
          className="btn-secondary text-xs"
        >
          {compute.isPending ? 'Computing…' : '↻ Recompute'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading your score…</p>
      ) : (
        <>
          {/* Score card + benchmark */}
          <div className="card flex flex-col md:flex-row items-center gap-8">
            <CRSGauge score={score} size={160} />
            <div className="flex-1 space-y-2">
              <p className={`text-sm font-semibold ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-pyre-gold' : 'text-red-400'}`}>
                {score >= 70 ? 'High readiness — eligible for institutional investor matching.'
                 : score >= 40 ? 'Medium readiness — improve your score to unlock more investors.'
                               : 'Low readiness — complete your profile and upload documents to get started.'}
              </p>
              {benchmarks && benchmarks.avg_crs && (
                <div className="flex gap-4 pt-2">
                  <div>
                    <p className="text-[10px] text-pyre-muted uppercase tracking-wide">Platform avg</p>
                    <p className="text-sm font-semibold text-white">{Math.round(benchmarks.avg_crs)}/100</p>
                  </div>
                  {benchmarks.funded_avg_crs && (
                    <div>
                      <p className="text-[10px] text-pyre-muted uppercase tracking-wide">Funded avg</p>
                      <p className="text-sm font-semibold text-pyre-gold">{Math.round(benchmarks.funded_avg_crs)}/100</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-pyre-muted uppercase tracking-wide">Your score</p>
                    <p className={`text-sm font-semibold ${score >= (benchmarks.avg_crs || 0) ? 'text-green-400' : 'text-red-400'}`}>
                      {Math.round(score)}/100
                      <span className="text-[10px] text-pyre-muted ml-1">
                        {score >= benchmarks.avg_crs ? '▲ above avg' : '▼ below avg'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-pyre-muted">
                Last computed: {crs?.crs_computed_at ? new Date(crs.crs_computed_at).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Actionable tips — from scoring engine */}
          {tips.length > 0 && (
            <div className="card border-pyre-gold/30 bg-pyre-gold/5">
              <p className="text-sm font-semibold text-pyre-gold mb-3">How to improve your score</p>
              <div className="space-y-2">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-pyre-gold text-xs mt-0.5 flex-shrink-0">→</span>
                    <p className="text-xs text-gray-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score breakdown bars */}
          <div className="card space-y-5">
            <p className="text-sm font-semibold text-white">Score Breakdown</p>
            {Object.entries(breakdown).map(([key, val]) => {
              const max  = MAX[key] || 20
              const pct  = Math.round((val / max) * 100)
              const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-pyre-gold' : 'bg-red-500'
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-pyre-muted capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white font-semibold">{val} / {max}</span>
                  </div>
                  <div className="h-2 bg-pyre-input rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* CRS history chart */}
          {history.length > 1 && (
            <div className="card">
              <p className="text-sm font-semibold text-white mb-4">Score History</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history} margin={{ left: -20 }}>
                  <XAxis dataKey="date" tick={{ fill: '#7A9AB5', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#7A9AB5', fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="score" stroke="#EFBF04" strokeWidth={2}
                    dot={{ fill: '#EFBF04', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
