/**
 * Capital Pyre — Notifications Controller
 * Reused directly from IAMS notificationsController.js
 */

const db = require('../utils/db');

// ── GET /api/notifications ────────────────────────────────
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { unread_only, limit = 30 } = req.query;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (unread_only === 'true') { sql += ' AND is_read = FALSE'; }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.query(sql, params);

    // Unread count
    const [countRow] = await db.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    return res.json({ success: true, data: rows, unread_count: countRow[0].unread });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/:id/read ────────────────────
exports.markRead = async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/read-all ────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};
