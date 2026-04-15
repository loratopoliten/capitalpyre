/**
 * Capital Pyre — Logbooks Controller
 * Reused directly from IAMS logbooksController.js.
 * Entrepreneurs post weekly progress reports within active deals.
 */

const db = require('../utils/db');
const { createNotification } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/mailer');

// ── GET /api/logbooks?deal_id=:id ─────────────────────────
exports.getLogbooks = async (req, res, next) => {
  try {
    const { deal_id } = req.query;
    if (!deal_id)
      return res.status(400).json({ success: false, message: 'deal_id is required.' });

    const [rows] = await db.query(
      `SELECT lb.*, u.firstname, u.lastname
       FROM logbooks lb JOIN users u ON u.id = lb.user_id
       WHERE lb.deal_id = ? ORDER BY lb.week_number ASC`,
      [deal_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/logbooks ────────────────────────────────────
exports.submitLogbook = async (req, res, next) => {
  try {
    const { deal_id, week_number, activities, milestones, challenges, next_steps } = req.body;

    if (!deal_id || !week_number || !activities)
      return res.status(400).json({ success: false, message: 'deal_id, week_number, and activities are required.' });

    // Verify deal exists and user is the entrepreneur party
    const [dealRows] = await db.query(
      `SELECT d.id, m.target_id, m.target_type FROM deals d
       JOIN matches m ON m.id = d.match_id WHERE d.id = ?`,
      [deal_id]
    );
    if (!dealRows.length)
      return res.status(404).json({ success: false, message: 'Deal not found.' });

    const deal = dealRows[0];

    // Confirm the requesting user owns the entrepreneur/sme profile on this deal
    const table = deal.target_type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [pRows] = await db.query(
      `SELECT id FROM ${table} WHERE id = ? AND user_id = ?`,
      [deal.target_id, req.user.id]
    );
    if (!pRows.length)
      return res.status(403).json({ success: false, message: 'You are not the entrepreneur on this deal.' });

    await db.query(
      `INSERT INTO logbooks (user_id, deal_id, week_number, activities, milestones, challenges, next_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         activities = VALUES(activities),
         milestones = VALUES(milestones),
         challenges = VALUES(challenges),
         next_steps = VALUES(next_steps),
         updated_at = NOW()`,
      [req.user.id, deal_id, week_number, activities,
       milestones || null, challenges || null, next_steps || null]
    );

    return res.status(201).json({ success: true, message: `Week ${week_number} logbook submitted.` });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/logbooks/:id/review ─────────────────────────
// Investor reviews a logbook entry (from IAMS logbook_reviews)
exports.reviewLogbook = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment)
      return res.status(400).json({ success: false, message: 'Comment is required.' });

    const [lbRows] = await db.query('SELECT * FROM logbooks WHERE id = ?', [req.params.id]);
    if (!lbRows.length)
      return res.status(404).json({ success: false, message: 'Logbook entry not found.' });

    await db.query(
      `INSERT INTO logbook_reviews (logbook_id, reviewer_id, reviewer_type, comment)
       VALUES (?, ?, 'investor', ?)`,
      [req.params.id, req.user.id, comment]
    );

    // Notify entrepreneur
    const lb = lbRows[0];
    await createNotification(
      lb.user_id,
      `Week ${lb.week_number} Log Reviewed`,
      'Your investor has reviewed your progress logbook. Log in to read their feedback.',
      'info'
    );

    const [entUser] = await db.query('SELECT firstname, email FROM users WHERE id = ?', [lb.user_id]);
    const { subject, html } = emailTemplates.logbookReviewed(entUser[0].firstname, lb.week_number);
    sendEmail(entUser[0].email, subject, html).catch(console.error);

    return res.status(201).json({ success: true, message: 'Review submitted.' });
  } catch (err) {
    next(err);
  }
};
