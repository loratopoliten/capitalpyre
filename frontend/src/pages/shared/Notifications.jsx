import { useQuery, useMutation } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import api from '../../utils/api'
import { setNotifications, markRead } from '../../store/notificationsSlice'
import { selectNotifications } from '../../store/notificationsSlice'

const TYPE_ICON = { match:'⚡', deal:'◈', success:'✓', warning:'⚠', system:'◉', info:'◎', deadline:'⏰' }
const TYPE_COLOR = { match:'text-pyre-gold', deal:'text-blue-400', success:'text-green-400', warning:'text-yellow-400', system:'text-gray-400', info:'text-pyre-muted' }

export default function Notifications() {
  const dispatch       = useDispatch()
  const notifications  = useSelector(selectNotifications)

  const { isLoading } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=50')
      dispatch(setNotifications(data))
      return data
    },
  })

  const read = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onMutate:   (id) => dispatch(markRead(id)),
  })

  const readAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess:  () => dispatch(setNotifications({
      data: notifications.map(n => ({...n, is_read: true})),
      unread_count: 0
    })),
  })

  return (
    <div className="space-y-4 page-enter max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="section-sub">Stay on top of your matches, deals, and updates.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button onClick={() => readAll.mutate()} className="btn-ghost text-xs">Mark all read</button>
        )}
      </div>

      {isLoading ? <p className="text-pyre-muted text-sm">Loading…</p> :
        notifications.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-pyre-muted text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && read.mutate(n.id)}
                className={`card-sm flex gap-4 cursor-pointer hover:border-pyre-gold/40 transition-all
                  ${!n.is_read ? 'border-pyre-gold/30 bg-pyre-blue/5' : 'opacity-70'}`}
              >
                <span className={`text-xl mt-0.5 flex-shrink-0 ${TYPE_COLOR[n.type]}`}>
                  {TYPE_ICON[n.type] || '◎'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-pyre-gold rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-pyre-muted mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-pyre-muted/60 mt-1.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
