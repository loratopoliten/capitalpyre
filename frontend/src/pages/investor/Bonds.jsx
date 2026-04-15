import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api'

export default function InvBonds() {
  const { data: bonds = [], isLoading } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => api.get('/bonds').then(r => r.data.data),
  })

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Bond Pools</h1>
        <p className="section-sub">Pooled SME bond instruments — structured for institutional capital.</p>
      </div>
      {isLoading ? <p className="text-pyre-muted text-sm">Loading…</p> :
        bonds.length === 0 ? <div className="card text-center py-12"><p className="text-pyre-muted text-sm">No bond pools available yet.</p></div> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bonds.map(b => (
            <div key={b.id} className="card hover:border-pyre-gold/40 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">{b.pool_name}</p>
                  <p className="text-xs text-pyre-muted">{b.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {b.bse_listed && <span className="badge badge-green">BSE Listed</span>}
                  <span className={`badge ${b.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{b.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Total Value', `BWP ${Number(b.total_value||0).toLocaleString()}`],
                  ['Coupon Rate', `${b.coupon_rate || '—'}%`],
                  ['Bond Rating', b.bond_rating || '—'],
                  ['Maturity',    b.maturity_date ? new Date(b.maturity_date).toLocaleDateString() : '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <p className="text-pyre-muted">{k}</p>
                    <p className="text-white font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-pyre-gold/10">
                <p className="text-xs text-pyre-muted">
                  {JSON.parse(b.sme_ids || '[]').length} SMEs in pool
                </p>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
