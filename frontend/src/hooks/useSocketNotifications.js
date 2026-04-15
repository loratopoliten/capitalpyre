import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { socket } from '../utils/socket'
import { addNotification } from '../store/notificationsSlice'
import { selectUser } from '../store/authSlice'

export default function useSocketNotifications() {
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)

  useEffect(() => {
    if (!user) return

    const handleNotification = (notif) => {
      dispatch(addNotification(notif))
    }

    socket.on('new_notification', handleNotification)
    return () => socket.off('new_notification', handleNotification)
  }, [user, dispatch])
}
