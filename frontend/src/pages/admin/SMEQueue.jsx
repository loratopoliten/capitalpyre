import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'

export default function AdminSMEQueue() {
  const qc = useQueryClient()
  const [selected, setSelected]   = useState(null)
  const [action,   setAction]     = useState(null)  // 'approved' | 'rejected'
  const [reason,   setReason]     = useState('')

  const { data: smes = [], isLoading } = useQuery({
    queryKey: ['sme-queue'],
    queryFn: () => api.get('/admin/sme/pending').then(r => r.data.data),
  })

  const approve = useMutation({
    mutationFn: ({ id, status, reason }) =>
      api.patch(`/sme/admin/${id}/approve`, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sme-queue'] })
      setSelected(null)
      setReason('')
    },
  })

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">SME Approval Queue</h1>
        <p className="section-sub">
          Review and approve SME profiles before they become visible to institutional investors.
        </p>
      </div>

      {/* Action panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md space-y-4">
            <p className="text-sm font-semibold text-white">
              {action === 'approved' ? '✅ Approve' : '❌ Reject'} — {selected.business_name}
            </p>
            {action === 'rejected' && (
              <div className="form-group mb-0">
                <label className="label">Rejection reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3} className="input"
                  placeholder="Explain to the SME what needs to be corrected…"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => approve.mutate({ id: selected.id, status: action, reason })}
                disabled={approve.isPending}
                className={`flex-1 text-xs ${action === 'approved' ? 'btn-primary' : 'btn-ghost text-red-400 hover:text-red-300'}`}
              >
                {approve.isPending ? 'Processing…' : `Confirm ${action}`}
              </button>
              <button onClick={() => { setSelected(null); setReason('') }} className="btn-ghost flex-1 text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats badge */}
      <div className="inline-flex items-center gap-2 bg-pyre-gold/10 border border-pyre-gold/20 rounded-full px-4 py-1.5">
        <span className="w-2 h-2 bg-pyre-gold rounded-full animate-pulse" />
        <span className="text-xs font-medium text-pyre-gold">{smes.length} pending approval</span>
      </div>

      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading queue…</p>
      ) : smes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-pyre-muted text-sm">All clear — no pending SME approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {smes.map(sme => (
            <div key={sme.id} className="card hover:border-pyre-gold/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{sme.business_name}</p>
                    <span className="badge badge-gold">Pending</span>
                  </div>
                  <p className="text-xs text-pyre-muted">
                    {sme.firstname} {sme.lastname} · {sme.email}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {[
                      ['Industry',    sme.industry],
                      ['CIPA No.',    sme.cipa_reg_no || '—'],
                      ['Revenue',     sme.revenue_band?.replace(/-/g,' ') || '—'],
                      ['Employees',   sme.employee_count || '—'],
                      ['Est.',        sme.year_established || '—'],
                      ['CRS Score',   `${Math.round(sme.crs_score || 0)}/100`],
                      ['Registered',  new Date(sme.user_created_at).toLocaleDateString()],
                      ['Applied',     new Date(sme.created_at).toLocaleDateString()],
                    ].filter(([,v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-pyre-muted uppercase tracking-wide">{k}</p>
                        <p className="text-xs text-white capitalize">{v}</p>
                      </div>
                    ))}
                  </div>

                  {sme.description && (
                    <p className="text-xs text-pyre-muted mt-3 line-clamp-2">{sme.description}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setSelected(sme); setAction('approved') }}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setSelected(sme); setAction('rejected') }}
                    className="btn-ghost text-xs py-1.5 px-4 text-red-400 hover:text-red-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
