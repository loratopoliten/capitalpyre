import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
})

export const connectSocket = (userId) => {
  if (!socket.connected) {
    socket.connect()
    socket.emit('join_user', userId)
  }
}

export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect()
}
