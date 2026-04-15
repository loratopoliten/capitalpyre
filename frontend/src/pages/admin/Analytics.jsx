// ── Admin Analytics ───────────────────────────────────────
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#243B55', border: '1px solid rgba(239,191,4,0.2)', borderRadius: 8 },
  labelStyle:   { color: '#fff', fontSize: 11 },
  itemStyle:    { color: '#EFBF04', fontSize: 11 },
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data.data),
  })

  if (isLoading) return <p className="text-pyre-muted text-sm">Loading analytics…</p>

  const d = data || {}
  const crsData = [
    { name: 'Low',    value: parseInt(d.crs_distribution?.low)    || 0, fill: '#f87171' },
    { name: 'Medium', value: parseInt(d.crs_distribution?.medium) || 0, fill: '#EFBF04' },
    { name: 'High',   value: parseInt(d.crs_distribution?.high)   || 0, fill: '#4ade80' },
  ]

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Platform Analytics</h1>
        <p className="section-sub">Capital Pyre performance overview</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Capital Deployed', value: d.deals?.total_capital ? `BWP ${Number(d.deals.total_capital).toLocaleString()}` : '—' },
          { label: 'Match Acceptance Rate',  value: d.matches?.total ? `${Math.round((d.matches.accepted/d.matches.total)*100)}%` : '—' },
          { label: 'Platform Users',         value: d.users?.total },
          { label: 'BSE-Listed Bonds',       value: d.bonds?.listed },
        ].map(s => (
          <div key={s.label} className="card-sm text-center">
            <p className="font-display font-bold text-2xl text-pyre-gold">{s.value ?? '—'}</p>
            <p className="text-xs text-pyre-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deals over time */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Deals Created — Last 6 Months</p>
          {d.deals_by_month?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={d.deals_by_month} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4A6B" />
                <XAxis dataKey="month" tick={{ fill: '#7A9AB5', fontSize: 10 }} />
                <YAxis tick={{ fill: '#7A9AB5', fontSize: 10 }} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#EFBF04" strokeWidth={2} dot={{ fill: '#EFBF04', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-pyre-muted text-xs py-10 text-center">No data yet.</p>}
        </div>

        {/* CRS pie */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">CRS Score Distribution</p>
          {crsData.some(c => c.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={crsData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                  {crsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: '#7A9AB5', fontSize: 11 }}>{v}</span>} />
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-pyre-muted text-xs py-10 text-center">No CRS data yet.</p>}
        </div>

        {/* User roles bar */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Users by Role</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { role: 'Entrepreneurs', count: d.entrepreneurs?.total || 0 },
                { role: 'SMEs',          count: d.smes?.total          || 0 },
                { role: 'Investors',     count: d.investors?.total     || 0 },
              ]}
              margin={{ left: -20 }}
            >
              <XAxis dataKey="role" tick={{ fill: '#7A9AB5', fontSize: 10 }} />
              <YAxis tick={{ fill: '#7A9AB5', fontSize: 10 }} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#175291" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Deal Funnel</p>
          <div className="space-y-3">
            {[
              { label: 'Matches made',    value: d.matches?.total    || 0, max: d.matches?.total    || 1, color: 'bg-pyre-blue' },
              { label: 'Matches accepted',value: d.matches?.accepted || 0, max: d.matches?.total    || 1, color: 'bg-pyre-gold' },
              { label: 'Deals closed',    value: d.deals?.closed     || 0, max: d.matches?.total    || 1, color: 'bg-green-500' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-pyre-muted">{row.label}</span>
                  <span className="text-white font-semibold">{row.value}</span>
                </div>
                <div className="h-2.5 bg-pyre-input rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${row.color}`}
                    style={{ width: `${Math.min((row.value / row.max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Note: AdminAnalytics already imported above — this export is just additional data shown
// The deal funnel and CRS distribution charts already consume the updated analytics endpoint.
