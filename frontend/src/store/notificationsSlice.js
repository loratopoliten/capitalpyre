import { createSlice } from '@reduxjs/toolkit'

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unread: 0 },
  reducers: {
    setNotifications(state, { payload }) {
      state.items  = payload.data
      state.unread = payload.unread_count
    },
    addNotification(state, { payload }) {
      state.items.unshift(payload)
      state.unread += 1
    },
    markRead(state, { payload: id }) {
      const n = state.items.find(n => n.id === id)
      if (n && !n.is_read) { n.is_read = true; state.unread = Math.max(0, state.unread - 1) }
    },
    clearUnread(state) { state.unread = 0 },
  },
})

export const { setNotifications, addNotification, markRead, clearUnread } = notificationsSlice.actions
export const selectNotifications = s => s.notifications.items
export const selectUnread        = s => s.notifications.unread
export default notificationsSlice.reducer
