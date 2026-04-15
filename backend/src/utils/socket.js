/**
 * Capital Pyre — Socket.IO Initializer
 * Handles real-time messaging between matched users.
 */

let io;

const initSocketIO = (socketIoInstance) => {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join a private room for direct messaging
    socket.on('join_thread', (threadId) => {
      socket.join(`thread_${threadId}`);
    });

    // Leave thread room
    socket.on('leave_thread', (threadId) => {
      socket.leave(`thread_${threadId}`);
    });

    // Join personal notification room
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit a real-time message to a specific thread room.
 * Called from messagesController after saving to DB.
 */
const emitMessage = (threadId, message) => {
  if (io) io.to(`thread_${threadId}`).emit('new_message', message);
};

/**
 * Emit a notification to a specific user's room.
 * Called from notificationsController after saving to DB.
 */
const emitNotification = (userId, notification) => {
  if (io) io.to(`user_${userId}`).emit('new_notification', notification);
};

module.exports = { initSocketIO, emitMessage, emitNotification };
