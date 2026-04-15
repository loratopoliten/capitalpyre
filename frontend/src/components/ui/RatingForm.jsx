/**
 * RatingForm — captures interaction-level reputation after a match.
 * Investors rate: responsiveness, clarity, preparedness.
 * Entrepreneurs rate: seriousness, communication, follow_through.
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../utils/api'

const INVESTOR_DIMS = [
  { key: 'responsiveness', label: 'Responsiveness', hint: 'How quickly did they reply?' },
  { key: 'clarity',        label: 'Clarity',        hint: 'Were they clear about their plans?' },
  { key: 'preparedness',   label: 'Preparedness',   hint: 'Were their documents and pitch ready?' },
]

const ENTREPRENEUR_DIMS = [
  { key: 'seriousness',    label: 'Seriousness',    hint: 'Did they seem genuinely interested?' },
  { key: 'communication',  label: 'Communication',  hint: 'Were they easy to communicate with?' },
  { key: 'follow_through', label: 'Follow-through', hint: 'Did they do what they said they would?' },
]

const StarRow = ({ label, hint, value, onChange }) => (
  <div className="flex items-center justify-between py-2 border-b border-pyre-gold/5">
    <div>
      <p className="text-xs font-medium text-white">{label}</p>
      <p className="text-[10px] text-pyre-muted">{hint}</p>
    </div>
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-lg transition-colors ${n <= value ? 'text-pyre-gold' : 'text-pyre-muted/30'}`}
        >
          ★
        </button>
      ))}
    </div>
  </div>
)

export default function RatingForm({ matchId, role, rateeId, onClose }) {
  const dims = role === 'investor' ? INVESTOR_DIMS : ENTREPRENEUR_DIMS
  const [scores,  setScores]  = useState({})
  const [comment, setComment] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post('/ratings', {
      match_id: matchId,
      ratee_id: rateeId,
      comment: comment || undefined,
      ...scores,
    }),
    onSuccess: onClose,
  })

  const avg = Object.values(scores).length
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1)
    : '—'

  return (
    <div style={{ minHeight: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100 }}>
      <div className="card w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Rate this interaction</p>
          <button onClick={onClose} className="text-pyre-muted hover:text-white text-lg leading-none">×</button>
        </div>

        <p className="text-xs text-pyre-muted mb-4">
          Your rating is used to build platform reputation scores. It is not shared as a direct review.
        </p>

        <div className="space-y-0">
          {dims.map(d => (
            <StarRow
              key={d.key}
              label={d.label}
              hint={d.hint}
              value={scores[d.key] || 0}
              onChange={v => setScores(p => ({ ...p, [d.key]: v }))}
            />
          ))}
        </div>

        {Object.keys(scores).length === dims.length && (
          <div className="mt-3 py-2 text-center">
            <span className="font-display font-bold text-2xl text-pyre-gold">{avg}</span>
            <span className="text-xs text-pyre-muted ml-1">/ 5 overall</span>
          </div>
        )}

        <div className="form-group mt-4">
          <label className="label">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            className="input text-sm"
            placeholder="Any specific feedback…"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || Object.keys(scores).length < dims.length}
            className="btn-primary flex-1 text-xs"
          >
            {submit.isPending ? 'Submitting…' : 'Submit rating'}
          </button>
          <button onClick={onClose} className="btn-ghost flex-1 text-xs">Skip</button>
        </div>

        {submit.isSuccess && (
          <p className="text-xs text-green-400 text-center mt-2">Rating submitted. Thank you.</p>
        )}
      </div>
    </div>
  )
}
