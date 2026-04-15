import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../../utils/api'

const ROLES = ['','entrepreneur','sme','investor','admin']
const ROLE_BADGE = {
  entrepreneur: 'badge-blue',
  sme:          'badge-gold',
  investor:     'badge-green',
  admin:        'badge-red',
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [role,       setRole]       = useState('')
  const [verified,   setVerified]   = useState(params.get('is_verified') || '')
  const [active,     setActive]     = useState('')
  const [q,          setQ]          = useState('')
  const [confirmId,  setConfirmId]  = useState(null)
  const [confirmAct, setConfirmAct] = useState(null) // 'verify' | 'deactivate'

  const qs = new URLSearchParams()
  if (role)     qs.set('role',         role)
  if (verified) qs.set('is_verified',  verified)
  if (active)   qs.set('is_active',    active)
  if (q)        qs.set('q',            q)

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users', role, verified, active, q],
    queryFn: () => api.get(`/admin/users?${qs}`).then(r => r.data.data),
  })

  const verifyUser = useMutation({
    mutationFn: ({ id, verified }) => api.patch(`/admin/users/${id}/verify`, { verified }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirmId(null) },
  })

  const toggleActive = useMutation({
    mutationFn: (id) => api.patch(`/admin/users/${id}/toggle-active`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirmId(null) },
  })

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">User Management</h1>
        <p className="section-sub">Review, verify, and manage all platform users.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          className="input w-48 text-sm" placeholder="Search name or email…"
        />
        <select value={role} onChange={e => setRole(e.target.value)} className="input w-36 text-sm">
          <option value="">All roles</option>
          {ROLES.filter(Boolean).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <select value={verified} onChange={e => setVerified(e.target.value)} className="input w-36 text-sm">
          <option value="">All KYC</option>
          <option value="false">Unverified</option>
          <option value="true">Verified</option>
        </select>
        <select value={active} onChange={e => setActive(e.target.value)} className="input w-36 text-sm">
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {(q || role || verified || active) && (
          <button onClick={() => { setQ(''); setRole(''); setVerified(''); setActive('') }}
            className="btn-ghost text-xs">Clear</button>
        )}
      </div>

      {/* Confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm">
            <p className="text-sm font-semibold text-white mb-2">
              {confirmAct === 'verify' ? 'Approve KYC for this user?' : 'Toggle account status?'}
            </p>
            <p className="text-xs text-pyre-muted mb-5">This action will be logged in the audit trail.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirmAct === 'verify') verifyUser.mutate({ id: confirmId, verified: true })
                  else toggleActive.mutate(confirmId)
                }}
                className="btn-primary flex-1 text-xs"
                disabled={verifyUser.isPending || toggleActive.isPending}
              >
                {verifyUser.isPending || toggleActive.isPending ? 'Processing…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmId(null)} className="btn-ghost flex-1 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading users…</p>
      ) : users.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-pyre-muted text-sm">No users found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pyre-gold/10 bg-pyre-navy/40">
                  {['User','Role','KYC','Status','Joined','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-pyre-muted px-4 py-3 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}
                    className={`border-b border-pyre-gold/5 hover:bg-pyre-blue/10 transition-colors
                      ${i % 2 === 0 ? '' : 'bg-pyre-navy/20'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{u.firstname} {u.lastname}</p>
                      <p className="text-xs text-pyre-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'} capitalize`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_verified ? 'badge-green' : 'badge-gray'}`}>
                        {u.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-pyre-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!u.is_verified && u.role !== 'admin' && (
                          <button
                            onClick={() => { setConfirmId(u.id); setConfirmAct('verify') }}
                            className="text-xs text-pyre-gold hover:underline"
                          >
                            Approve KYC
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => { setConfirmId(u.id); setConfirmAct('toggle') }}
                            className={`text-xs hover:underline ${u.is_active ? 'text-red-400' : 'text-green-400'}`}
                          >
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-pyre-gold/5">
            <p className="text-xs text-pyre-muted">{users.length} result{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
