import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import { selectUser } from '../../store/authSlice'
import CRSGauge from '../../components/ui/CRSGauge'
import OnboardingChecklist from '../../components/ui/OnboardingChecklist'
import MatchPreview from '../../components/ui/MatchPreview'

export default function SmeDashboard() {
  const user = useSelector(selectUser)
  const qc   = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['sme-profile'],
    queryFn: () => api.get('/sme/me').then(r => r.data.data),
  })

  const computeCRS = useMutation({
    mutationFn: () => api.post('/crs/compute'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['sme-profile'] }),
  })

  const statusBadge = { approved: 'badge-green', pending: 'badge-gold', rejected: 'badge-red' }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">{profile?.business_name || 'Your SME'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge ${statusBadge[profile?.approval_status] || 'badge-gray'}`}>
              {profile?.approval_status || 'pending'}
            </span>
            <p className="text-xs text-pyre-muted">SME Profile Status</p>
          </div>
        </div>
        <Link to="/sme/profile" className="btn-ghost text-xs">Edit Profile →</Link>
      </div>

      <OnboardingChecklist />
      <MatchPreview isPublished={profile?.is_published} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-white w-full">Capital Readiness Score</p>
          <CRSGauge score={profile?.crs_score || 0} size={140} />
          <button
            onClick={() => computeCRS.mutate()}
            disabled={computeCRS.isPending}
            className="btn-secondary text-xs py-1.5 w-full"
          >
            {computeCRS.isPending ? 'Computing…' : 'Recompute Score'}
          </button>
          <Link to="/sme/crs" className="text-xs text-pyre-gold hover:underline">View full breakdown →</Link>
        </div>

        <div className="card md:col-span-2 space-y-3">
          <p className="text-sm font-semibold text-white">Profile Summary</p>
          {[
            ['CIPA Reg No.',    profile?.cipa_reg_no],
            ['Industry',        profile?.industry],
            ['Revenue Band',    profile?.revenue_band?.replace(/-/g, ' ')],
            ['Employees',       profile?.employee_count],
            ['Year Established',profile?.year_established],
            ['Documents',       `${profile?.documents?.length || 0} uploaded`],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm border-b border-pyre-gold/5 pb-2">
              <span className="text-pyre-muted">{k}</span>
              <span className="text-white capitalize">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {profile?.approval_status === 'pending' && (
        <div className="card border-pyre-gold/40 bg-pyre-gold/5">
          <p className="text-sm font-semibold text-pyre-gold mb-1">⏳ Awaiting Admin Approval</p>
          <p className="text-xs text-pyre-muted">Your profile is under review. You'll be notified once approved and visible to investors.</p>
        </div>
      )}

      {profile?.approval_status === 'rejected' && (
        <div className="card border-red-500/40 bg-red-900/10">
          <p className="text-sm font-semibold text-red-400 mb-1">Profile Not Approved</p>
          <p className="text-xs text-pyre-muted">Your profile was not approved. Please update your information and resubmit.</p>
        </div>
      )}
    </div>
  )
}
