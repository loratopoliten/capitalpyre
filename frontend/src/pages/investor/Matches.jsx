import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { useState } from 'react'

const STATUS_BADGE = { pending:'badge-gold', accepted:'badge-green', rejected:'badge-red', closed:'badge-gray' }
const TABS = ['all','pending','accepted','rejected']

export default function InvMatches() {
  const [tab, setTab] = useState('all')
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['inv-matches'],
    queryFn: () => api.get('/matches').then(r => r.data.data),
  })
  const filtered = tab === 'all' ? matches : matches.filter(m => m.status === tab)

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">My Matches</h1>
        <p className="section-sub">Track your outreach and active deals.</p>
      </div>
      <div className="flex gap-1 bg-pyre-navy rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all
              ${tab === t ? 'bg-pyre-blue text-white' : 'text-pyre-muted hover:text-white'}`}>
            {t} <span className="ml-1 opacity-60">{t==='all' ? matches.length : matches.filter(m=>m.status===t).length}</span>
          </button>
        ))}
      </div>
      {isLoading ? <p className="text-pyre-muted text-sm">Loading…</p> :
        filtered.length === 0 ? <div className="card text-center py-12"><p className="text-pyre-muted text-sm">No {tab} matches.</p></div> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m => (
            <div key={m.id} className="card-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{m.target_type === 'entrepreneur' ? 'Entrepreneur' : 'SME'} · Target #{m.target_id}</p>
                  <p className="text-xs text-pyre-muted">{new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                  <p className="text-xs text-pyre-gold font-bold mt-1">{m.match_score}/100</p>
                </div>
              </div>
              {m.status === 'accepted' && (
                <Link to={`/investor/deals/${m.deal_id}`} className="text-xs text-pyre-gold hover:underline">
                  Open Deal Room →
                </Link>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  )
}
