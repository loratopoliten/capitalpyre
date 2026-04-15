/**
 * Capital Pyre — Admin Controller
 * Platform management: users, KYC, analytics, audit logs.
 * Adapted from IAMS reportsController.js and coordinators pattern.
 */

const db = require('../utils/db');
const { createNotification } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/mailer');

// ── GET /api/admin/users ──────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const { role, is_verified, is_active, q, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT id, firstname, lastname, email, role, is_verified, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (role)       { sql += ' AND role = ?';        params.push(role); }
    if (is_verified !== undefined) { sql += ' AND is_verified = ?'; params.push(is_verified === 'true'); }
    if (is_active !== undefined)   { sql += ' AND is_active = ?';   params.push(is_active === 'true'); }
    if (q)          { sql += ' AND (firstname LIKE ? OR lastname LIKE ? OR email LIKE ?)';
                      params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/users/:id/verify ────────────────────
// KYC approval — mirrors IAMS organisation approval pattern
exports.verifyUser = async (req, res, next) => {
  try {
    const { verified } = req.body;
    const [rows] = await db.query(
      'SELECT id, firstname, email, role FROM users WHERE id = ?', [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const user = rows[0];
    await db.query('UPDATE users SET is_verified = ? WHERE id = ?', [!!verified, user.id]);

    if (verified) {
      await createNotification(user.id, 'Account Verified ✅', 'Your identity has been verified. You now have full access to Capital Pyre.', 'success');
      const { subject, html } = emailTemplates.kycApproved(user.firstname);
      sendEmail(user.email, subject, html).catch(console.error);
    }

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id)
       VALUES (?, ?, 'users', ?)`,
      [req.user.id, verified ? 'user_verified' : 'user_unverified', user.id]
    );

    return res.json({ success: true, message: `User ${verified ? 'verified' : 'unverified'}.` });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/users/:id/toggle-active ─────────────
exports.toggleActive = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, is_active FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const newStatus = !rows[0].is_active;
    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id)
       VALUES (?, ?, 'users', ?)`,
      [req.user.id, newStatus ? 'user_activated' : 'user_deactivated', req.params.id]
    );

    return res.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'}.` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/sme/pending ────────────────────────────
exports.pendingSMEs = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT sp.*, u.firstname, u.lastname, u.email, u.created_at AS user_created_at
       FROM sme_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE sp.approval_status = 'pending'
       ORDER BY sp.created_at ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/analytics ──────────────────────────────
// Platform-wide stats — adapted from IAMS reportsController
exports.analytics = async (req, res, next) => {
  try {
    const [[ users ]]       = await db.query('SELECT COUNT(*) AS total, SUM(is_verified) AS verified FROM users WHERE role != "admin"');
    const [[ entrepreneurs ]] = await db.query('SELECT COUNT(*) AS total, AVG(crs_score) AS avg_crs FROM entrepreneur_profiles');
    const [[ smes ]]        = await db.query('SELECT COUNT(*) AS total, SUM(approval_status="approved") AS approved, AVG(crs_score) AS avg_crs FROM sme_profiles');
    const [[ investors ]]   = await db.query('SELECT COUNT(*) AS total FROM investor_profiles');
    const [[ matches ]]     = await db.query('SELECT COUNT(*) AS total, SUM(status="accepted") AS accepted FROM matches');
    const [[ deals ]]       = await db.query('SELECT COUNT(*) AS total, SUM(stage="closed") AS closed, SUM(amount) AS total_capital FROM deals');
    const [[ bonds ]]       = await db.query('SELECT COUNT(*) AS total, SUM(bse_listed) AS listed FROM bond_pools');

    // Deals by month (last 6 months)
    const [dealsByMonth] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM deals WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );

    // CRS distribution buckets
    const [crsDistribution] = await db.query(
      `SELECT
         SUM(crs_score < 40)              AS low,
         SUM(crs_score >= 40 AND crs_score < 70) AS medium,
         SUM(crs_score >= 70)             AS high
       FROM (
         SELECT crs_score FROM entrepreneur_profiles
         UNION ALL
         SELECT crs_score FROM sme_profiles
       ) AS all_scores`
    );

    return res.json({
      success: true,
      data: {
        users,
        entrepreneurs,
        smes,
        investors,
        matches,
        deals,
        bonds,
        deals_by_month: dealsByMonth,
        crs_distribution: crsDistribution[0],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/audit-logs ─────────────────────────────
exports.auditLogs = async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [rows] = await db.query(
      `SELECT al.*, u.firstname, u.lastname, u.email
       FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/force-match ───────────────────────────
exports.forceMatch = async (req, res, next) => {
  try {
    const { investor_profile_id, target_id, target_type } = req.body;
    if (!investor_profile_id || !target_id || !['entrepreneur','sme'].includes(target_type))
      return res.status(400).json({ success: false, message: 'investor_profile_id, target_id, and target_type required.' });

    const [existing] = await db.query(
      'SELECT id FROM matches WHERE investor_id = ? AND target_id = ? AND target_type = ?',
      [investor_profile_id, target_id, target_type]
    );
    if (existing.length)
      return res.status(409).json({ success: false, message: 'A match already exists between these parties.' });

    // Get both profiles for scoring
    const [invRows] = await db.query('SELECT * FROM investor_profiles WHERE id = ?', [investor_profile_id]);
    const table = target_type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [tgtRows] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [target_id]);

    if (!invRows.length || !tgtRows.length)
      return res.status(404).json({ success: false, message: 'One or both profiles not found.' });

    const [result] = await db.query(
      `INSERT INTO matches (investor_id, target_id, target_type, match_score, is_manual, requested_by, status)
       VALUES (?, ?, ?, 0, TRUE, ?, 'pending')`,
      [investor_profile_id, target_id, target_type, req.user.id]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, 'force_match', 'matches', ?, ?)`,
      [req.user.id, result.insertId, JSON.stringify({ investor_profile_id, target_id, target_type })]
    );

    return res.status(201).json({ success: true, message: 'Force match created.', match_id: result.insertId });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/spotlight/:type/:id ──────────────────
exports.toggleSpotlight = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (!['entrepreneur','sme'].includes(type))
      return res.status(400).json({ success: false, message: 'Type must be entrepreneur or sme.' });

    const table = type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [rows] = await db.query(`SELECT id, is_featured FROM ${table} WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const newFeatured = !rows[0].is_featured;
    await db.query(`UPDATE ${table} SET is_featured = ? WHERE id = ?`, [newFeatured, id]);

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, newFeatured ? 'profile_spotlighted' : 'profile_unspotlighted', table, id]
    );

    return res.json({ success: true, message: `Profile ${newFeatured ? 'spotlighted' : 'removed from spotlight'}.`, is_featured: newFeatured });
  } catch (err) { next(err); }
};
