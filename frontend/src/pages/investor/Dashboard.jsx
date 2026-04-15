import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import api from '../../utils/api'
import { selectUser } from '../../store/authSlice'

export default function InvDashboard() {
  const user  = useSelector(selectUser)
  const qc    = useQueryClient()
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm()

  const { data: profile } = useQuery({
    queryKey: ['inv-profile'],
    queryFn: () => api.get('/investors/me').then(r => r.data.data),
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['inv-matches'],
    queryFn: () => api.get('/matches').then(r => r.data.data),
  })

  const { data: bonds = [] } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => api.get('/bonds').then(r => r.data.data),
  })

  useEffect(() => { if (profile) reset(profile) }, [profile, reset])

  const save = useMutation({
    mutationFn: (data) => api.put('/investors/me', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv-profile'] }),
  })

  const pending   = matches.filter(m => m.status === 'pending')
  const active    = matches.filter(m => m.status === 'accepted')
  const liveBonds = bonds.filter(b => b.bse_listed)

  // Commitment signal check
  const hasCommitted = profile?.min_ticket && profile?.max_ticket &&
    parseFloat(profile.min_ticket) > 0 && parseFloat(profile.max_ticket) > 0

  const SECTORS = ['Technology','Agriculture','Health','Education','Finance','Retail','Energy','Manufacturing','Tourism','Other']
  const STAGES  = ['idea','pre-seed','seed','series-a','growth']

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Welcome, {user?.firstname}</h1>
        <p className="section-sub">Your Capital Pyre investor overview.</p>
      </div>

      {/* Commitment signal banner — shown until ticket range set */}
      {!hasCommitted && (
        <div className="card border-pyre-gold/50 bg-pyre-gold/5">
          <p className="text-sm font-semibold text-pyre-gold mb-1">Set your ticket range to start matching</p>
          <p className="text-xs text-pyre-muted mb-3">
            Your minimum and maximum investment ticket size is required before you can browse profiles or send match requests.
            This helps us surface you to the right opportunities.
          </p>
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex gap-3 items-end">
            <div className="form-group mb-0 flex-1">
              <label className="label">Min ticket (BWP)</label>
              <input {...register('min_ticket')} type="number" className="input text-sm" placeholder="50000" />
            </div>
            <div className="form-group mb-0 flex-1">
              <label className="label">Max ticket (BWP)</label>
              <input {...register('max_ticket')} type="number" className="input text-sm" placeholder="500000" />
            </div>
            <button type="submit" disabled={save.isPending} className="btn-primary text-xs">
              {save.isPending ? 'Saving…' : 'Save & unlock'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Requests Sent', value: pending.length  },
          { label: 'Active Deals',  value: active.length   },
          { label: 'BSE Bonds',     value: liveBonds.length },
          { label: 'Bond Pools',    value: bonds.length     },
        ].map(s => (
          <div key={s.label} className="card-sm text-center">
            <p className="font-display font-bold text-3xl text-pyre-gold">{s.value}</p>
            <p className="text-xs text-pyre-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between mb-4">
            <p className="text-sm font-semibold text-white">Active Deals</p>
            <Link to="/investor/matches" className="text-xs text-pyre-gold hover:underline">View all</Link>
          </div>
          {active.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-pyre-muted mb-3">No active deals yet.</p>
              {hasCommitted
                ? <Link to="/investor/browse" className="btn-secondary text-xs">Browse opportunities →</Link>
                : <p className="text-xs text-pyre-muted">Set your ticket range above to start browsing.</p>
              }
            </div>
          ) : active.slice(0, 4).map(m => (
            <div key={m.id} className="flex justify-between items-center py-2 border-b border-pyre-gold/5 text-sm">
              <span className="text-white">{m.firm_name || `${m.firstname} ${m.lastname}`}</span>
              <span className="badge badge-green">{m.status}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex justify-between mb-4">
            <p className="text-sm font-semibold text-white">Live Bond Pools</p>
            <Link to="/investor/bonds" className="text-xs text-pyre-gold hover:underline">View all</Link>
          </div>
          {liveBonds.length === 0
            ? <p className="text-sm text-pyre-muted text-center py-6">No BSE-listed bonds available yet.</p>
            : liveBonds.slice(0, 4).map(b => (
              <div key={b.id} className="flex justify-between items-center py-2 border-b border-pyre-gold/5 text-sm">
                <span className="text-white">{b.pool_name}</span>
                <span className="text-pyre-gold font-semibold">{b.coupon_rate}%</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
