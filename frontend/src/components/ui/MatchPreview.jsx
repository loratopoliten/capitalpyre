/**
 * MatchPreview — motivational component shown on dashboard
 * before profile is complete/published.
 * Shows an estimated (blurred) count of potential investor matches.
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../../utils/api'
import { selectRole } from '../../store/authSlice'

export default function MatchPreview({ isPublished }) {
  const role = useSelector(selectRole)

  const { data } = useQuery({
    queryKey: ['match-preview', role],
    queryFn: () => api.get('/matches/preview').then(r => r.data),
    enabled: !isPublished,
  })

  if (isPublished || !data) return null

  return (
    <div className="card border-dashed border-pyre-gold/40 text-center py-8 mb-6 relative overflow-hidden">
      {/* Blurred number overlay */}
      <div className="relative inline-block">
        <p className="font-display font-bold text-6xl text-pyre-gold" style={{ filter: 'blur(8px)', userSelect: 'none' }}>
          {data.count}
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-pyre-card/80 rounded-lg px-3 py-1">
            <p className="text-xs font-semibold text-pyre-gold">investors</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-pyre-muted mt-3 mb-1">could match your profile right now</p>
      <p className="text-xs text-pyre-muted mb-5">
        Complete your profile to reveal your matches and get discovered.
      </p>

      <Link
        to={role === 'entrepreneur' ? '/entrepreneur/profile' : '/sme/profile'}
        className="btn-primary text-xs"
      >
        Complete profile to unlock →
      </Link>
    </div>
  )
}
