/**
 * Capital Pyre — Notifications Utility
 * Shared helper called from any controller to create an in-app notification.
 * Also emits real-time event via Socket.IO.
 */

const db = require('./db');
const { emitNotification } = require('./socket');

/**
 * Create a notification record and emit it in real-time.
 * @param {number} userId
 * @param {string} title
 * @param {string} message
 * @param {string} type  info | warning | deadline | success | system | match | deal
 */
const createNotification = async (userId, title, message, type = 'info') => {
  const [result] = await db.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES (?, ?, ?, ?)`,
    [userId, title, message, type]
  );

  const notification = { id: result.insertId, user_id: userId, title, message, type, is_read: false };
  emitNotification(userId, notification);

  return notification;
};

module.exports = { createNotification };
