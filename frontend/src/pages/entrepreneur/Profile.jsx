import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'
import CRSGauge from '../../components/ui/CRSGauge'

const SECTORS   = ['Technology','Agriculture','Health','Education','Finance','Retail','Energy','Manufacturing','Tourism','Other']
const STAGES    = ['idea','pre-seed','seed','series-a','growth']
const TIMELINES = [
  { value: 'immediate',   label: 'Immediately'       },
  { value: '1-3months',   label: 'Within 1–3 months'  },
  { value: '3-6months',   label: 'Within 3–6 months'  },
  { value: '6-12months',  label: 'Within 6–12 months' },
  { value: 'exploring',   label: 'Just exploring'     },
]

export default function EntProfile() {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['ent-profile'],
    queryFn: () => api.get('/entrepreneurs/me').then(r => r.data.data),
  })

  const { data: crsData } = useQuery({
    queryKey: ['crs-me'],
    queryFn: () => api.get('/crs/me').then(r => r.data.data),
  })

  const { data: benchmarks } = useQuery({
    queryKey: ['crs-benchmarks-ent'],
    queryFn: () => api.get('/crs/benchmarks?role=entrepreneur').then(r => r.data.data),
  })

  useEffect(() => { if (profile) reset(profile) }, [profile, reset])

  const save = useMutation({
    mutationFn: (data) => api.put('/entrepreneurs/me', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ent-profile'] }),
  })

  const computeCRS = useMutation({
    mutationFn: () => api.post('/crs/compute'),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ['ent-profile'] })
      qc.invalidateQueries({ queryKey: ['crs-me'] })
    },
  })

  const publish = useMutation({
    mutationFn: () => api.patch('/entrepreneurs/me/publish'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ent-profile'] }),
  })

  if (isLoading) return <p className="text-pyre-muted text-sm">Loading profile…</p>

  // Surface tips from last compute or crsData
  const tips = computeCRS.data?.data?.tips || []

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">My Profile</h1>
          <p className="section-sub">Complete your profile to improve your Capital Readiness Score.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${profile?.is_published ? 'badge-green' : 'badge-gray'}`}>
            {profile?.is_published ? 'Published' : 'Draft'}
          </span>
          <button
            onClick={() => publish.mutate()}
            disabled={publish.isPending}
            className={profile?.is_published ? 'btn-ghost text-xs' : 'btn-secondary text-xs'}
          >
            {profile?.is_published ? 'Unpublish' : 'Publish to Investors'}
          </button>
        </div>
      </div>

      {publish.isError && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
          {publish.error?.response?.data?.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CRS panel */}
        <div className="card flex flex-col items-center gap-4">
          <CRSGauge score={profile?.crs_score || 0} size={130} />

          {/* Benchmark comparison */}
          {benchmarks?.avg_crs && (
            <div className="w-full text-center">
              <p className="text-[10px] text-pyre-muted">Platform average</p>
              <p className="text-xs text-white font-semibold">{Math.round(benchmarks.avg_crs)}/100</p>
              <p className={`text-[10px] mt-0.5 ${profile?.crs_score >= benchmarks.avg_crs ? 'text-green-400' : 'text-pyre-gold'}`}>
                {profile?.crs_score >= benchmarks.avg_crs ? 'Above average' : 'Below average — see tips below'}
              </p>
            </div>
          )}

          {/* Dimension breakdown */}
          {profile?.crs_breakdown && (
            <div className="w-full space-y-1.5">
              {Object.entries(profile.crs_breakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-pyre-muted capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => computeCRS.mutate()}
            disabled={computeCRS.isPending}
            className="btn-secondary text-xs py-1.5 w-full"
          >
            {computeCRS.isPending ? 'Computing…' : 'Recompute Score'}
          </button>
        </div>

        {/* Profile form */}
        <div className="md:col-span-2 space-y-4">
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Business name</label>
                <input {...register('business_name')} className="input" />
              </div>
              <div className="form-group">
                <label className="label">Website</label>
                <input {...register('website')} className="input" placeholder="https://" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Sector</label>
                <select {...register('sector')} className="input">
                  <option value="">Select sector</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Stage</label>
                <select {...register('stage')} className="input">
                  {STAGES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Funding ask (BWP)</label>
                <input {...register('funding_ask')} type="number" className="input" placeholder="500000" />
              </div>
              <div className="form-group">
                <label className="label">Funding timeline <span className="text-pyre-gold">commitment signal</span></label>
                <select {...register('funding_timeline')} className="input">
                  {TIMELINES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Market size</label>
              <input {...register('market_size')} className="input" placeholder="e.g. P50M TAM in Botswana" />
            </div>

            <div className="form-group">
              <label className="label">Pitch summary <span className="text-pyre-gold text-[10px]">↑ CRS</span></label>
              <textarea {...register('pitch_summary')} rows={3} className="input" placeholder="One paragraph that captures your venture…" />
            </div>

            <div className="form-group">
              <label className="label">Problem statement <span className="text-pyre-gold text-[10px]">↑ CRS</span></label>
              <textarea {...register('problem_statement')} rows={2} className="input" placeholder="What problem does your venture solve?" />
            </div>

            <div className="form-group">
              <label className="label">Solution <span className="text-pyre-gold text-[10px]">↑ CRS</span></label>
              <textarea {...register('solution')} rows={2} className="input" placeholder="How does your product/service solve it?" />
            </div>

            <div className="form-group">
              <label className="label">Revenue model <span className="text-pyre-gold text-[10px]">↑ CRS</span></label>
              <textarea {...register('revenue_model')} rows={2} className="input" placeholder="How do you make money?" />
            </div>

            <div className="form-group">
              <label className="label">Traction <span className="text-pyre-gold text-[10px]">↑ CRS</span></label>
              <textarea {...register('traction')} rows={2} className="input" placeholder="Customers, revenue, partnerships, pilots…" />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={save.isPending || !isDirty} className="btn-primary">
                {save.isPending ? 'Saving…' : 'Save profile'}
              </button>
              {save.isSuccess && <span className="text-xs text-green-400 self-center">Saved ✓</span>}
            </div>
          </form>

          {/* Tips panel — shown after CRS compute */}
          {tips.length > 0 && (
            <div className="card border-pyre-gold/30 bg-pyre-gold/5">
              <p className="text-xs font-semibold text-pyre-gold mb-2">How to improve your score</p>
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-pyre-gold text-xs mt-0.5">→</span>
                  <p className="text-xs text-gray-300">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
