import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectNotifications, selectUnread, markRead } from '../../store/notificationsSlice'
import { useQuery } from '@tanstack/react-query'
import { setNotifications } from '../../store/notificationsSlice'
import api from '../../utils/api'

export default function NotificationBell() {
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)
  const dispatch          = useDispatch()
  const navigate          = useNavigate()
  const notifications     = useSelector(selectNotifications)
  const unread            = useSelector(selectUnread)

  // Fetch on mount
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=15')
      dispatch(setNotifications(data))
      return data
    },
    refetchInterval: 30000,
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRead = async (n) => {
    if (!n.is_read) {
      dispatch(markRead(n.id))
      await api.patch(`/notifications/${n.id}/read`).catch(() => {})
    }
  }

  const TYPE_DOT = {
    match:   'bg-pyre-gold',
    deal:    'bg-blue-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    system:  'bg-gray-400',
    info:    'bg-pyre-muted',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-pyre-muted hover:text-white transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-pyre-crimson rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-pyre-card border border-pyre-gold/20 rounded-xl shadow-card z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pyre-gold/10">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <button
                onClick={async () => {
                  await api.patch('/notifications/read-all').catch(() => {})
                  dispatch(setNotifications({ data: notifications.map(n => ({...n, is_read: true})), unread_count: 0 }))
                }}
                className="text-xs text-pyre-muted hover:text-pyre-gold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-pyre-muted text-sm py-8">No notifications yet</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-pyre-blue/20 transition-colors border-b border-pyre-gold/5 ${!n.is_read ? 'bg-pyre-blue/10' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_DOT[n.type] || 'bg-pyre-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{n.title}</p>
                    <p className="text-xs text-pyre-muted mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-pyre-muted/60 mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
