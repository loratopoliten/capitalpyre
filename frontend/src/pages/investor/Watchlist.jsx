import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../utils/api'

export default function InvWatchlist() {
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.get('/investors/me/watchlist').then(r => r.data.data),
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/investors/me/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="section-title">Watchlist</h1>
        <p className="section-sub">Saved profiles you want to revisit.</p>
      </div>
      {isLoading ? <p className="text-pyre-muted text-sm">Loading…</p> :
        items.length === 0 ? <div className="card text-center py-12">
          <p className="text-pyre-muted text-sm">Your watchlist is empty. Browse opportunities and save profiles.</p>
        </div> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className="card-sm flex justify-between items-center">
              <div>
                <p className="text-xs text-pyre-muted capitalize">{item.target_type}</p>
                <p className="text-sm font-semibold text-white">Profile #{item.target_id}</p>
                <p className="text-xs text-pyre-muted">{new Date(item.saved_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => remove.mutate(item.target_id)} className="btn-ghost text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
