/**
 * OnboardingChecklist — guides users from signup to first match.
 * Shows inline on dashboards until all steps are complete.
 */

import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { selectRole } from '../../store/authSlice'
import api from '../../utils/api'

const STEPS = {
  entrepreneur: [
    { key: 'business_name', label: 'Name your venture',        path: '/entrepreneur/profile', check: p => !!p?.business_name },
    { key: 'sector',        label: 'Set your sector & stage',  path: '/entrepreneur/profile', check: p => !!p?.sector && !!p?.stage },
    { key: 'pitch_summary', label: 'Write your pitch summary', path: '/entrepreneur/profile', check: p => p?.pitch_summary?.length > 30 },
    { key: 'funding_ask',   label: 'Set your funding ask',     path: '/entrepreneur/profile', check: p => !!p?.funding_ask },
    { key: 'crs',           label: 'Compute your CRS score',   path: '/entrepreneur/profile', check: p => p?.crs_score > 0 },
    { key: 'published',     label: 'Publish your profile',     path: '/entrepreneur/profile', check: p => !!p?.is_published },
  ],
  sme: [
    { key: 'business_name', label: 'Set your business name',   path: '/sme/profile',  check: p => !!p?.business_name },
    { key: 'cipa_reg_no',   label: 'Add your CIPA number',     path: '/sme/profile',  check: p => !!p?.cipa_reg_no },
    { key: 'revenue_band',  label: 'Set your revenue band',    path: '/sme/profile',  check: p => !!p?.revenue_band },
    { key: 'documents',     label: 'Upload a financial document', path: '/sme/profile', check: (_, docs) => docs?.length > 0 },
    { key: 'crs',           label: 'Compute your CRS score',   path: '/sme/crs',      check: p => p?.crs_score > 0 },
  ],
  investor: [
    { key: 'bio',           label: 'Complete your profile',    path: '/investor/dashboard', check: p => !!p?.bio },
    { key: 'sectors',       label: 'Set sector preferences',   path: '/investor/dashboard', check: p => JSON.parse(p?.sectors || '[]').length > 0 },
    { key: 'tickets',       label: 'Set your ticket range',    path: '/investor/dashboard', check: p => !!p?.min_ticket && !!p?.max_ticket },
    { key: 'browse',        label: 'Browse your first match',  path: '/investor/browse',    check: () => false }, // always nudges to browse
  ],
}

export default function OnboardingChecklist() {
  const role = useSelector(selectRole)
  const steps = STEPS[role]
  if (!steps) return null

  const endpoint = role === 'entrepreneur' ? '/entrepreneurs/me'
                 : role === 'sme'          ? '/sme/me'
                 : '/investors/me'

  const { data: profile } = useQuery({
    queryKey: ['profile-onboarding', role],
    queryFn: () => api.get(endpoint).then(r => r.data.data),
  })

  if (!profile) return null

  const docs = profile?.documents || []
  const evaluated = steps.map(s => ({ ...s, done: s.check(profile, docs) }))
  const completed  = evaluated.filter(s => s.done).length
  const total      = evaluated.length
  const pct        = Math.round((completed / total) * 100)
  const nextStep   = evaluated.find(s => !s.done)

  if (completed === total) return null  // all done — hide

  return (
    <div className="card border-pyre-gold/40 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">Complete your setup</p>
          <p className="text-xs text-pyre-muted">{completed} of {total} steps done</p>
        </div>
        <span className="font-display font-bold text-2xl text-pyre-gold">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-pyre-input rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-pyre-gold rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {evaluated.map(step => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
              ${step.done
                ? 'bg-green-500/20 text-green-400'
                : 'bg-pyre-input text-pyre-muted border border-pyre-gold/20'}`}>
              {step.done ? '✓' : ''}
            </div>
            <span className={`text-xs ${step.done ? 'text-pyre-muted line-through' : 'text-gray-300'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {nextStep && (
        <Link to={nextStep.path} className="btn-primary text-xs py-1.5 mt-4 block text-center">
          Next: {nextStep.label} →
        </Link>
      )}
    </div>
  )
}
