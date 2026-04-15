import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '../../utils/api'

export default function AdminBonds() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [smeSearch,  setSmeSearch]  = useState('')
  const [selectedSMEs, setSelectedSMEs] = useState([])
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: bonds = [], isLoading } = useQuery({
    queryKey: ['admin-bonds'],
    queryFn: () => api.get('/bonds').then(r => r.data.data),
  })

  const { data: smes = [] } = useQuery({
    queryKey: ['approved-smes', smeSearch],
    queryFn: () => api.get(`/sme?limit=50${smeSearch ? `&q=${smeSearch}` : ''}`).then(r => r.data.data),
    enabled: showCreate,
  })

  const create = useMutation({
    mutationFn: (data) => api.post('/bonds', { ...data, sme_ids: selectedSMEs }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bonds'] })
      setShowCreate(false)
      setSelectedSMEs([])
      reset()
    },
  })

  const bseListed = useMutation({
    mutationFn: (id) => api.patch(`/bonds/${id}/bse-list`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bonds'] }),
  })

  const toggleSME = (id) => setSelectedSMEs(prev =>
    prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
  )

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Bond Pool Management</h1>
          <p className="section-sub">Create and manage pooled SME bond instruments.</p>
        </div>
        <button onClick={() => setShowCreate(s => !s)} className="btn-primary text-xs">
          {showCreate ? '✕ Cancel' : '+ Create Bond Pool'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card space-y-5">
          <p className="text-sm font-semibold text-white border-b border-pyre-gold/10 pb-3">New Bond Pool</p>

          <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Pool name *</label>
                <input {...register('pool_name', { required: true })} className="input" placeholder="Botswana SME Bond Pool I" />
              </div>
              <div className="form-group">
                <label className="label">Bond rating</label>
                <input {...register('bond_rating')} className="input" placeholder="BBB" />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Description</label>
              <textarea {...register('description')} rows={2} className="input" placeholder="Brief description of this bond pool…" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label className="label">Total value (BWP)</label>
                <input {...register('total_value')} type="number" className="input" placeholder="5000000" />
              </div>
              <div className="form-group">
                <label className="label">Coupon rate (%)</label>
                <input {...register('coupon_rate')} type="number" step="0.01" className="input" placeholder="8.5" />
              </div>
              <div className="form-group">
                <label className="label">Maturity date</label>
                <input {...register('maturity_date')} type="date" className="input" />
              </div>
            </div>

            {/* SME selector */}
            <div>
              <label className="label">Select SMEs for pool *</label>
              <input
                value={smeSearch}
                onChange={e => setSmeSearch(e.target.value)}
                className="input mb-3 text-sm"
                placeholder="Search approved SMEs…"
              />
              <div className="max-h-48 overflow-y-auto space-y-2 border border-pyre-gold/10 rounded-lg p-2">
                {smes.length === 0 ? (
                  <p className="text-xs text-pyre-muted text-center py-4">No approved SMEs found.</p>
                ) : smes.map(sme => (
                  <label key={sme.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                    ${selectedSMEs.includes(sme.id) ? 'bg-pyre-blue/30 border border-pyre-blue' : 'hover:bg-pyre-blue/10'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSMEs.includes(sme.id)}
                      onChange={() => toggleSME(sme.id)}
                      className="accent-pyre-gold"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">{sme.business_name}</p>
                      <p className="text-[10px] text-pyre-muted">{sme.industry} · CRS {Math.round(sme.crs_score || 0)}/100</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-pyre-muted mt-1">{selectedSMEs.length} SME{selectedSMEs.length !== 1 ? 's' : ''} selected</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={create.isPending || selectedSMEs.length === 0}
                className="btn-primary"
              >
                {create.isPending ? 'Creating…' : 'Create Bond Pool'}
              </button>
              {create.isError && (
                <p className="text-xs text-red-400 self-center">
                  {create.error?.response?.data?.message || 'Creation failed.'}
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Bond list */}
      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading bond pools…</p>
      ) : bonds.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-pyre-muted text-sm">No bond pools created yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bonds.map(b => (
            <div key={b.id} className="card hover:border-pyre-gold/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{b.pool_name}</p>
                    {b.bse_listed && <span className="badge badge-green">BSE Listed</span>}
                    <span className={`badge ${b.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{b.status}</span>
                  </div>
                  {b.description && <p className="text-xs text-pyre-muted mb-3">{b.description}</p>}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    {[
                      ['SMEs in pool', JSON.parse(b.sme_ids||'[]').length],
                      ['Total value',  `BWP ${Number(b.total_value||0).toLocaleString()}`],
                      ['Coupon rate',  b.coupon_rate ? `${b.coupon_rate}%` : '—'],
                      ['Rating',       b.bond_rating || '—'],
                      ['Maturity',     b.maturity_date ? new Date(b.maturity_date).toLocaleDateString() : '—'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <p className="text-pyre-muted">{k}</p>
                        <p className="text-white font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {!b.bse_listed && b.status === 'draft' && (
                  <button
                    onClick={() => bseListed.mutate(b.id)}
                    disabled={bseListed.isPending}
                    className="btn-secondary text-xs flex-shrink-0"
                  >
                    {bseListed.isPending ? 'Processing…' : 'Mark BSE Listed'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
