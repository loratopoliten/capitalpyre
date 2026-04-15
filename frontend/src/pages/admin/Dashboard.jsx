import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const CRS_COLORS = ['#f87171', '#EFBF04', '#4ade80']

const StatCard = ({ label, value, sub, to }) => (
  <Link to={to || '#'} className={`card-sm text-center hover:border-pyre-gold/40 transition-colors ${to ? 'cursor-pointer' : ''}`}>
    <p className="font-display font-bold text-3xl text-pyre-gold">{value ?? '—'}</p>
    {sub && <p className="text-xs text-pyre-gold/60 -mt-0.5">{sub}</p>}
    <p className="text-xs text-pyre-muted mt-1">{label}</p>
  </Link>
)

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data.data),
  })

  if (isLoading) return (
    <div className="flex items-center gap-2 text-pyre-muted text-sm">
      <span className="animate-spin">◎</span> Loading analytics…
    </div>
  )

  const d = data || {}

  const crsData = [
    { name: 'Low (<40)',    value: parseInt(d.crs_distribution?.low)    || 0 },
    { name: 'Medium (40–69)', value: parseInt(d.crs_distribution?.medium) || 0 },
    { name: 'High (≥70)',   value: parseInt(d.crs_distribution?.high)   || 0 },
  ]

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="section-sub">Capital Pyre platform overview</p>
      </div>

      {/* User stats */}
      <div>
        <p className="text-xs font-semibold text-pyre-muted uppercase tracking-widest mb-3">Users</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"     value={d.users?.total}      to="/admin/users" />
          <StatCard label="Verified"        value={d.users?.verified}   to="/admin/users?is_verified=true" />
          <StatCard label="Entrepreneurs"   value={d.entrepreneurs?.total} />
          <StatCard label="Investors"       value={d.investors?.total} />
        </div>
      </div>

      {/* SME stats */}
      <div>
        <p className="text-xs font-semibold text-pyre-muted uppercase tracking-widest mb-3">SMEs</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total SMEs"      value={d.smes?.total}    to="/admin/sme-queue" />
          <StatCard label="Approved"        value={d.smes?.approved} />
          <StatCard label="Avg CRS (SMEs)"  value={d.smes?.avg_crs ? Math.round(d.smes.avg_crs) : '—'} sub="/ 100" />
          <StatCard label="Avg CRS (Ent.)"  value={d.entrepreneurs?.avg_crs ? Math.round(d.entrepreneurs.avg_crs) : '—'} sub="/ 100" />
        </div>
      </div>

      {/* Deal + bond stats */}
      <div>
        <p className="text-xs font-semibold text-pyre-muted uppercase tracking-widest mb-3">Deals & Capital</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Matches"   value={d.matches?.total} />
          <StatCard label="Accepted Matches" value={d.matches?.accepted} />
          <StatCard label="Deals Closed"    value={d.deals?.closed} />
          <StatCard label="Bond Pools"      value={d.bonds?.total}   to="/admin/bonds" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Deals by month */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Deals Created — Last 6 Months</p>
          {d.deals_by_month?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.deals_by_month} margin={{ left: -20 }}>
                <XAxis dataKey="month" tick={{ fill: '#7A9AB5', fontSize: 10 }} />
                <YAxis tick={{ fill: '#7A9AB5', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#243B55', border: '1px solid rgba(239,191,4,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#EFBF04' }}
                />
                <Bar dataKey="count" fill="#EFBF04" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-pyre-muted text-xs text-center py-10">No deal data yet.</p>
          )}
        </div>

        {/* CRS distribution */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">CRS Score Distribution</p>
          {crsData.some(c => c.value > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={crsData}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={75}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {crsData.map((_, i) => <Cell key={i} fill={CRS_COLORS[i]} />)}
                </Pie>
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: '#7A9AB5', fontSize: 11 }}>{v}</span>}
                />
                <Tooltip
                  contentStyle={{ background: '#243B55', border: '1px solid rgba(239,191,4,0.2)', borderRadius: 8 }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-pyre-muted text-xs text-center py-10">No CRS data yet.</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Review KYC Queue',  to: '/admin/users?is_verified=false', icon: '◉' },
          { label: 'Approve SMEs',      to: '/admin/sme-queue',               icon: '⏳' },
          { label: 'Create Bond Pool',  to: '/admin/bonds',                   icon: '◈' },
          { label: 'View Audit Logs',   to: '/admin/audit-logs',              icon: '◎' },
          { label: 'Force-Match Users',  to: '/admin/users',                   icon: '⚡' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="card-sm flex items-center gap-3 hover:border-pyre-gold/50 transition-colors group">
            <span className="text-xl text-pyre-muted group-hover:text-pyre-gold transition-colors">{l.icon}</span>
            <span className="text-xs font-medium text-pyre-muted group-hover:text-white transition-colors">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
