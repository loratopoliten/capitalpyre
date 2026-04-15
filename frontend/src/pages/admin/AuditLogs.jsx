import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api'

const ACTION_BADGE = {
  sme_approved:        'badge-green',
  sme_rejected:        'badge-red',
  user_verified:       'badge-green',
  user_unverified:     'badge-red',
  user_deactivated:    'badge-red',
  user_activated:      'badge-green',
  bond_pool_created:   'badge-blue',
  bond_bse_listed:     'badge-gold',
}

export default function AdminAuditLogs() {
  const [q, setQ] = useState('')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs?limit=200').then(r => r.data.data),
    refetchInterval: 30000,
  })

  const filtered = q
    ? logs.filter(l =>
        l.action?.includes(q.toLowerCase()) ||
        l.email?.toLowerCase().includes(q.toLowerCase()) ||
        String(l.target_id).includes(q)
      )
    : logs

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Audit Logs</h1>
        <p className="section-sub">Full trail of all admin actions across Capital Pyre.</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          className="input w-64 text-sm" placeholder="Filter by action, email, or ID…"
        />
        <span className="text-xs text-pyre-muted">{filtered.length} entries</span>
      </div>

      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading audit logs…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-pyre-muted text-sm">No audit logs found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-pyre-gold/10 bg-pyre-navy/40">
                  {['Time','Admin','Action','Table','Target ID','Details'].map(h => (
                    <th key={h} className="text-left font-semibold text-pyre-muted px-4 py-3 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id}
                    className={`border-b border-pyre-gold/5 hover:bg-pyre-blue/10 transition-colors
                      ${i % 2 === 0 ? '' : 'bg-pyre-navy/20'}`}>
                    <td className="px-4 py-2.5 text-pyre-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.firstname ? (
                        <div>
                          <p className="text-white font-medium">{log.firstname} {log.lastname}</p>
                          <p className="text-pyre-muted text-[10px]">{log.email}</p>
                        </div>
                      ) : <span className="text-pyre-muted">System</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${ACTION_BADGE[log.action] || 'badge-gray'}`}>
                        {log.action?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-pyre-muted">{log.target_table || '—'}</td>
                    <td className="px-4 py-2.5 text-pyre-muted">{log.target_id || '—'}</td>
                    <td className="px-4 py-2.5 text-pyre-muted max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
