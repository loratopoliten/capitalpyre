import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'
import CRSGauge from '../../components/ui/CRSGauge'

const SECTORS = ['Technology','Agriculture','Health','Education','Finance','Retail','Energy','Manufacturing','Tourism','Other']
const STAGES  = ['idea','pre-seed','seed','series-a','growth']
const TABS    = ['entrepreneurs','smes']

export default function InvBrowse() {
  const qc = useQueryClient()
  const [tab,    setTab]    = useState('entrepreneurs')
  const [sector, setSector] = useState('')
  const [stage,  setStage]  = useState('')
  const [minCRS, setMinCRS] = useState('')
  const [q,      setQ]      = useState('')
  const [sent,   setSent]   = useState({})

  const params = new URLSearchParams()
  if (sector) params.set('sector',  sector)
  if (stage)  params.set('stage',   stage)
  if (minCRS) params.set('min_crs', minCRS)
  if (q)      params.set('q',       q)

  const endpoint = tab === 'entrepreneurs'
    ? `/entrepreneurs?${params}`
    : `/sme?${params}`

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['browse', tab, sector, stage, minCRS, q],
    queryFn: () => api.get(endpoint).then(r => r.data.data),
  })

  const requestMatch = useMutation({
    mutationFn: ({ target_id, target_type }) =>
      api.post('/matches', { target_id, target_type }),
    onSuccess: (_, vars) => {
      setSent(p => ({ ...p, [vars.target_id]: true }))
      qc.invalidateQueries({ queryKey: ['inv-matches'] })
    },
  })

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Browse Opportunities</h1>
        <p className="section-sub">Discover entrepreneurs and SMEs matched to your investment profile.</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-pyre-navy rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-md text-xs font-medium capitalize transition-all
              ${tab === t ? 'bg-pyre-blue text-white' : 'text-pyre-muted hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={e => setQ(e.target.value)}
          className="input w-48 text-sm" placeholder="Search…" />

        <select value={sector} onChange={e => setSector(e.target.value)} className="input w-40 text-sm">
          <option value="">All sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {tab === 'entrepreneurs' && (
          <select value={stage} onChange={e => setStage(e.target.value)} className="input w-36 text-sm">
            <option value="">All stages</option>
            {STAGES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        )}

        <input value={minCRS} onChange={e => setMinCRS(e.target.value)}
          type="number" min="0" max="100"
          className="input w-32 text-sm" placeholder="Min CRS" />

        {(q || sector || stage || minCRS) && (
          <button onClick={() => { setQ(''); setSector(''); setStage(''); setMinCRS('') }}
            className="btn-ghost text-xs">Clear filters</button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading…</p>
      ) : results.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-pyre-muted text-sm">No results found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(item => (
            <div key={item.id} className="card hover:border-pyre-gold/40 transition-colors flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.business_name}</p>
                  <p className="text-xs text-pyre-muted capitalize">
                    {item.sector || item.industry} {item.stage && `· ${item.stage}`}
                  </p>
                  {item.is_verified && (
                    <span className="badge badge-green text-[10px] mt-1">Verified</span>
                  )}
                </div>
                <CRSGauge score={item.crs_score || 0} size={56} showLabel={false} />
              </div>

              {item.pitch_summary || item.description ? (
                <p className="text-xs text-pyre-muted line-clamp-2">
                  {item.pitch_summary || item.description}
                </p>
              ) : null}

              {item.funding_ask && (
                <p className="text-xs text-pyre-muted">
                  Seeking: <span className="text-pyre-gold font-semibold">
                    BWP {Number(item.funding_ask).toLocaleString()}
                  </span>
                </p>
              )}

              <button
                onClick={() => requestMatch.mutate({
                  target_id:   item.id,
                  target_type: tab === 'entrepreneurs' ? 'entrepreneur' : 'sme',
                })}
                disabled={sent[item.id] || requestMatch.isPending}
                className="btn-primary text-xs py-1.5 mt-auto"
              >
                {sent[item.id] ? 'Request Sent ✓' : '⚡ Send Match Request'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
