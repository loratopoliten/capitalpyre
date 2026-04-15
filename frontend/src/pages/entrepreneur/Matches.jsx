import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'
import MatchCard from '../../components/ui/MatchCard'

const TABS = ['all','pending','accepted','rejected']

import { useState } from 'react'

export default function EntMatches() {
  const [tab, setTab] = useState('all')
  const qc = useQueryClient()

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches').then(r => r.data.data),
  })

  const filtered = tab === 'all' ? matches : matches.filter(m => m.status === tab)

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">My Matches</h1>
        <p className="section-sub">Investor interest in your venture.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-pyre-navy rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all
              ${tab === t ? 'bg-pyre-blue text-white' : 'text-pyre-muted hover:text-white'}`}
          >
            {t}
            <span className="ml-1.5 opacity-60">
              {t === 'all' ? matches.length : matches.filter(m => m.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-pyre-muted text-sm">Loading matches…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-pyre-muted text-sm">No {tab === 'all' ? '' : tab} matches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              onRespond={() => qc.invalidateQueries({ queryKey: ['matches'] })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
