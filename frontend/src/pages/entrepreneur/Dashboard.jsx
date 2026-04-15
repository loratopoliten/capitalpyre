import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { selectUser } from '../../store/authSlice'
import CRSGauge from '../../components/ui/CRSGauge'
import MatchCard from '../../components/ui/MatchCard'
import OnboardingChecklist from '../../components/ui/OnboardingChecklist'
import MatchPreview from '../../components/ui/MatchPreview'

export default function EntDashboard() {
  const user = useSelector(selectUser)
  const qc   = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['ent-profile'],
    queryFn: () => api.get('/entrepreneurs/me').then(r => r.data.data),
  })

  const { data: matches = [], refetch: refetchMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get('/matches').then(r => r.data.data),
  })

  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => api.get('/matches/suggestions').then(r => r.data.data),
    enabled: !!profile?.is_published,
  })

  const pending  = matches.filter(m => m.status === 'pending')
  const accepted = matches.filter(m => m.status === 'accepted')

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Good to see you, {user?.firstname} 🔥</h1>
        <p className="section-sub">Here's where your funding journey stands today.</p>
      </div>

      {/* Onboarding checklist — hidden once complete */}
      <OnboardingChecklist />

      {/* Match preview — hidden once published */}
      <MatchPreview isPublished={profile?.is_published} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CRS Score',       value: profile?.crs_score ? Math.round(profile.crs_score) : '—', sub: '/ 100' },
          { label: 'Match Requests',  value: pending.length,   sub: 'pending'   },
          { label: 'Active Deals',    value: accepted.length,  sub: 'open'      },
          { label: 'Top Suggestions', value: suggestions.length, sub: 'investors' },
        ].map(s => (
          <div key={s.label} className="card-sm text-center">
            <p className="font-display font-bold text-2xl text-pyre-gold">
              {s.value}<span className="text-sm text-pyre-muted font-normal ml-1">{s.sub}</span>
            </p>
            <p className="text-xs text-pyre-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CRS gauge */}
        <div className="card flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-white w-full">Capital Readiness</p>
          <CRSGauge score={profile?.crs_score || 0} size={140} />
          {!profile?.is_published && profile?.crs_score < 20 && (
            <p className="text-[10px] text-pyre-muted text-center">Score 20+ to publish your profile</p>
          )}
          <Link to="/entrepreneur/profile" className="btn-secondary text-xs py-1.5 w-full text-center">
            Improve my score →
          </Link>
        </div>

        {/* Pending matches */}
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Pending Match Requests</p>
            <Link to="/entrepreneur/matches" className="text-xs text-pyre-gold hover:underline">View all</Link>
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-pyre-muted mb-2">No pending requests yet.</p>
              {!profile?.is_published && (
                <Link to="/entrepreneur/profile" className="text-xs text-pyre-gold hover:underline">
                  Publish your profile to get discovered →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 3).map(m => (
                <MatchCard key={m.id} match={m} onRespond={refetchMatches} showPassReason />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top investor suggestions */}
      {suggestions.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">🔥 Top Investor Matches for You</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {suggestions.slice(0, 3).map(s => (
              <div key={s.investor_id} className="card-sm hover:border-pyre-gold/40 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.investor_name}</p>
                    <p className="text-xs text-pyre-muted capitalize">{s.investor_type}</p>
                    {s.firm_name && <p className="text-xs text-pyre-muted">{s.firm_name}</p>}
                  </div>
                  <span className="font-display font-bold text-xl text-pyre-gold">{s.match_score}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-pyre-gold/10 grid grid-cols-2 gap-1">
                  {Object.entries(s.breakdown || {}).map(([k, v]) => (
                    <div key={k} className="text-[10px] text-pyre-muted">
                      {k.replace(/_/g, ' ')}: <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
