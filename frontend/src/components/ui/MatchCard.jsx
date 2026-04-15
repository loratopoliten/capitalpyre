import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

const STATUS_BADGE = {
  pending:   'badge-gold',
  accepted:  'badge-green',
  rejected:  'badge-red',
  suggested: 'badge-blue',
  closed:    'badge-gray',
}

const PASS_REASONS = [
  { value: 'too_early',                 label: 'Too early stage'             },
  { value: 'wrong_sector',              label: 'Wrong sector'                },
  { value: 'crs_below_threshold',       label: 'CRS score too low'           },
  { value: 'documentation_insufficient',label: 'Insufficient documentation'  },
  { value: 'ticket_size_mismatch',      label: 'Ticket size mismatch'        },
  { value: 'already_funded',            label: 'Portfolio currently full'    },
  { value: 'other',                     label: 'Other'                       },
]

export default function MatchCard({ match, onRespond, showPassReason = false }) {
  const qc = useQueryClient()
  const [declining,   setDeclining]   = useState(false)
  const [passReason,  setPassReason]  = useState('')
  const [passNote,    setPassNote]    = useState('')

  const respond = useMutation({
    mutationFn: (payload) => api.patch(`/matches/${match.id}/respond`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] })
      setDeclining(false)
      onRespond?.()
    },
  })

  const score = match.match_score ?? 0
  const scoreColor = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-pyre-gold' : 'text-red-400'

  return (
    <div className="card-sm hover:border-pyre-gold/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white truncate">
              {match.firm_name || `${match.firstname} ${match.lastname}`}
            </p>
            <span className={`badge ${STATUS_BADGE[match.status] || 'badge-gray'}`}>
              {match.status}
            </span>
          </div>
          <p className="text-xs text-pyre-muted capitalize">{match.target_type} match</p>
          <p className="text-xs text-pyre-muted mt-0.5">{new Date(match.created_at).toLocaleDateString()}</p>
        </div>

        <div className="text-center flex-shrink-0">
          <p className={`font-display font-bold text-xl ${scoreColor}`}>{score}</p>
          <p className="text-[10px] text-pyre-muted">/ 100</p>
        </div>
      </div>

      {/* Score breakdown — expandable */}
      {match.score_breakdown && (
        <div className="mt-2 pt-2 border-t border-pyre-gold/5 grid grid-cols-3 gap-1">
          {Object.entries(typeof match.score_breakdown === 'string'
            ? JSON.parse(match.score_breakdown)
            : match.score_breakdown
          ).map(([k, v]) => (
            <div key={k} className="text-[10px] text-pyre-muted">
              {k.replace(/_/g, ' ')}: <span className="text-white">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending actions — entrepreneur/SME side */}
      {match.status === 'pending' && showPassReason && !declining && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-pyre-gold/10">
          <button
            onClick={() => respond.mutate({ status: 'accepted' })}
            disabled={respond.isPending}
            className="btn-primary flex-1 py-1.5 text-xs"
          >
            Accept
          </button>
          <button
            onClick={() => setDeclining(true)}
            className="btn-ghost flex-1 py-1.5 text-xs hover:bg-red-500/20 hover:text-red-400"
          >
            Decline
          </button>
        </div>
      )}

      {/* Pending actions — no pass reason required */}
      {match.status === 'pending' && !showPassReason && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-pyre-gold/10">
          <button
            onClick={() => respond.mutate({ status: 'accepted' })}
            disabled={respond.isPending}
            className="btn-primary flex-1 py-1.5 text-xs"
          >
            {respond.isPending ? 'Processing…' : 'Accept'}
          </button>
          <button
            onClick={() => respond.mutate({ status: 'rejected' })}
            disabled={respond.isPending}
            className="btn-ghost flex-1 py-1.5 text-xs hover:bg-red-500/20 hover:text-red-400"
          >
            Decline
          </button>
        </div>
      )}

      {/* Decline flow with pass reason */}
      {declining && (
        <div className="mt-3 pt-3 border-t border-pyre-gold/10 space-y-3">
          <p className="text-xs font-semibold text-white">Why are you declining?</p>
          <p className="text-[10px] text-pyre-muted">
            Your feedback is shared as coaching — it helps the investor improve their approach.
          </p>
          <select
            value={passReason}
            onChange={e => setPassReason(e.target.value)}
            className="input text-xs py-2"
          >
            <option value="">Select a reason (optional but helpful)</option>
            {PASS_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {passReason === 'other' && (
            <textarea
              value={passNote}
              onChange={e => setPassNote(e.target.value)}
              rows={2}
              className="input text-xs"
              placeholder="Brief note (optional)…"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => respond.mutate({ status: 'rejected', pass_reason: passReason || undefined, pass_note: passNote || undefined })}
              disabled={respond.isPending}
              className="btn-ghost flex-1 text-xs py-1.5 text-red-400 hover:text-red-300"
            >
              {respond.isPending ? 'Declining…' : 'Confirm decline'}
            </button>
            <button onClick={() => setDeclining(false)} className="btn-ghost flex-1 text-xs py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deal Room link for accepted matches */}
      {match.status === 'accepted' && match.deal_id && (
        <div className="mt-3 pt-3 border-t border-pyre-gold/10">
          <Link to={`../deals/${match.deal_id}`} className="text-xs text-pyre-gold hover:underline">
            Open Deal Room →
          </Link>
        </div>
      )}
    </div>
  )
}
