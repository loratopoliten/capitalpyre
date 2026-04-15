/**
 * CRSGauge — Circular Capital Readiness Score visualizer.
 * Color bands: red <40, amber 40–69, green ≥70
 */
export default function CRSGauge({ score = 0, size = 120, showLabel = true }) {
  const r        = (size / 2) - 10
  const circ     = 2 * Math.PI * r
  const progress = ((Math.min(score, 100) / 100) * circ)
  const color    = score >= 70 ? '#4ade80' : score >= 40 ? '#EFBF04' : '#f87171'
  const band     = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#2A4A6B" strokeWidth={8}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>

      {/* Center label — we rotate back */}
      <div className={`-mt-${size / 2 + 8} flex flex-col items-center`} style={{ marginTop: -(size * 0.65) }}>
        <span className="font-display font-bold text-white" style={{ fontSize: size * 0.22 }}>
          {Math.round(score)}
        </span>
        <span className="text-pyre-muted" style={{ fontSize: size * 0.1 }}>/100</span>
      </div>

      {showLabel && (
        <div className="flex flex-col items-center -mt-1">
          <span className="text-xs font-semibold" style={{ color }}>{band} Readiness</span>
          <span className="text-[10px] text-pyre-muted">Capital Readiness Score</span>
        </div>
      )}
    </div>
  )
}
