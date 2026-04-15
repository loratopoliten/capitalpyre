/**
 * Capital Pyre — Messages Controller
 * Real-time messages between matched users via Socket.IO.
 */

const db = require('../utils/db');
const { emitMessage } = require('../utils/socket');

// ── GET /api/messages/:threadId ───────────────────────────
exports.getThread = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { limit = 50, before } = req.query;

    let sql = `SELECT m.*, u.firstname, u.lastname, u.avatar_path
               FROM messages m JOIN users u ON u.id = m.sender_id
               WHERE m.thread_id = ?`;
    const params = [threadId];

    if (before) { sql += ' AND m.sent_at < ?'; params.push(before); }
    sql += ' ORDER BY m.sent_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.query(sql, params);

    // Mark as read for this user
    await db.query(
      `UPDATE messages SET is_read = TRUE
       WHERE thread_id = ? AND receiver_id = ? AND is_read = FALSE`,
      [threadId, req.user.id]
    );

    return res.json({ success: true, data: rows.reverse() });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/messages ────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { thread_id, receiver_id, content } = req.body;
    if (!thread_id || !receiver_id || !content)
      return res.status(400).json({ success: false, message: 'thread_id, receiver_id, and content are required.' });

    const [result] = await db.query(
      `INSERT INTO messages (thread_id, sender_id, receiver_id, content)
       VALUES (?, ?, ?, ?)`,
      [thread_id, req.user.id, receiver_id, content]
    );

    const message = {
      id: result.insertId,
      thread_id,
      sender_id: req.user.id,
      receiver_id,
      content,
      sent_at: new Date().toISOString(),
    };

    // Emit real-time via Socket.IO
    emitMessage(thread_id, message);

    return res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};
