/**
 * Capital Pyre — Bond Pools Controller
 * Admin creates and manages pooled SME bond instruments.
 */

const db = require('../utils/db');
const { createNotification } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/mailer');

// ── GET /api/bonds ────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM bond_pools WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/bonds/:id ────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM bond_pools WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Bond pool not found.' });

    const pool = rows[0];
    const smeIds = JSON.parse(pool.sme_ids || '[]');

    // Fetch SME profiles in this pool
    let smes = [];
    if (smeIds.length) {
      [smes] = await db.query(
        `SELECT sp.id, sp.business_name, sp.industry, sp.crs_score, sp.revenue_band
         FROM sme_profiles sp WHERE sp.id IN (?)`,
        [smeIds]
      );
    }

    return res.json({ success: true, data: { ...pool, sme_profiles: smes } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/bonds  (admin only) ─────────────────────────
exports.create = async (req, res, next) => {
  try {
    const {
      pool_name, description, sme_ids, total_value, currency,
      bond_rating, coupon_rate, maturity_date,
    } = req.body;

    if (!pool_name || !sme_ids || !Array.isArray(sme_ids) || !sme_ids.length)
      return res.status(400).json({ success: false, message: 'pool_name and sme_ids[] are required.' });

    // Verify all SME ids exist and are approved
    const [validSmes] = await db.query(
      `SELECT id, business_name, user_id FROM sme_profiles
       WHERE id IN (?) AND approval_status = 'approved'`,
      [sme_ids]
    );
    if (validSmes.length !== sme_ids.length)
      return res.status(400).json({ success: false, message: 'Some SME IDs are invalid or not approved.' });

    const [result] = await db.query(
      `INSERT INTO bond_pools
         (pool_name, description, sme_ids, total_value, currency, bond_rating, coupon_rate, maturity_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pool_name, description || null, JSON.stringify(sme_ids),
       total_value || null, currency || 'BWP',
       bond_rating || null, coupon_rate || null,
       maturity_date || null, req.user.id]
    );

    // Notify each SME owner
    for (const sme of validSmes) {
      await createNotification(
        sme.user_id,
        'Added to Bond Pool',
        `Your SME has been included in the "${pool_name}" bond pool.`,
        'success'
      );
      const [smeUser] = await db.query('SELECT firstname, email FROM users WHERE id = ?', [sme.user_id]);
      const { subject, html } = emailTemplates.addedToBondPool(smeUser[0].firstname, pool_name);
      sendEmail(smeUser[0].email, subject, html).catch(console.error);
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, 'bond_pool_created', 'bond_pools', ?, ?)`,
      [req.user.id, result.insertId, JSON.stringify({ pool_name, sme_count: sme_ids.length })]
    );

    return res.status(201).json({ success: true, message: 'Bond pool created.', id: result.insertId });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/bonds/:id/bse-list  (admin only) ───────────
exports.markBseListed = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE bond_pools SET bse_listed = TRUE, bse_listed_at = NOW(), status = 'active' WHERE id = ?`,
      [req.params.id]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id)
       VALUES (?, 'bond_bse_listed', 'bond_pools', ?)`,
      [req.user.id, req.params.id]
    );
    return res.json({ success: true, message: 'Bond pool marked as BSE-listed.' });
  } catch (err) {
    next(err);
  }
};
