/**
 * Capital Pyre — SME Controller
 * Adapted from IAMS organisationsController.js
 * Approval flow mirrors IAMS organisation approval pattern exactly.
 */

const db = require('../utils/db');
const { sendEmail, emailTemplates } = require('../utils/mailer');
const { createNotification } = require('../utils/notifications');

// ── GET /api/sme ──────────────────────────────────────────
// Search approved, published SME profiles
exports.search = async (req, res, next) => {
  try {
    const { industry, revenue_band, min_crs, q, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT sp.*, u.firstname, u.lastname, u.email, u.avatar_path, u.is_verified
      FROM sme_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.approval_status = 'approved' AND sp.is_published = TRUE AND u.is_active = TRUE
    `;
    const params = [];

    if (industry)    { sql += ' AND sp.industry = ?';       params.push(industry); }
    if (revenue_band){ sql += ' AND sp.revenue_band = ?';   params.push(revenue_band); }
    if (min_crs)     { sql += ' AND sp.crs_score >= ?';     params.push(parseFloat(min_crs)); }
    if (q)           { sql += ' AND (sp.business_name LIKE ? OR sp.description LIKE ?)';
                       params.push(`%${q}%`, `%${q}%`); }

    sql += ' ORDER BY sp.crs_score DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/sme/:id ──────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT sp.*, u.firstname, u.lastname, u.email, u.avatar_path, u.is_verified
       FROM sme_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'SME profile not found.' });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/sme/me ───────────────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT sp.*, u.firstname, u.lastname, u.email
       FROM sme_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = ?`,
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'SME profile not found.' });

    // Also fetch their uploaded documents
    const [docs] = await db.query(
      'SELECT * FROM sme_documents WHERE sme_id = ? ORDER BY uploaded_at DESC',
      [rows[0].id]
    );

    return res.json({ success: true, data: { ...rows[0], documents: docs } });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/sme/me ───────────────────────────────────────
exports.updateMyProfile = async (req, res, next) => {
  try {
    const {
      business_name, industry, address, website, description,
      year_established, employee_count, revenue_band, required_skills,
      funding_ask, currency, cipa_reg_no,
    } = req.body;

    const fields = {
      business_name, industry, address, website, description,
      year_established, employee_count, revenue_band, required_skills,
      funding_ask, currency, cipa_reg_no,
    };
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

    if (!Object.keys(clean).length)
      return res.status(400).json({ success: false, message: 'No fields to update.' });

    const setClauses = Object.keys(clean).map(k => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE sme_profiles SET ${setClauses} WHERE user_id = ?`,
      [...Object.values(clean), req.user.id]
    );

    return res.json({ success: true, message: 'SME profile updated.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/sme/me/documents ────────────────────────────
// Upload a financial document (triggers CRS recompute on backend)
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const { doc_type } = req.body;
    if (!doc_type)
      return res.status(400).json({ success: false, message: 'doc_type is required.' });

    const [smeRows] = await db.query(
      'SELECT id FROM sme_profiles WHERE user_id = ?', [req.user.id]
    );
    if (!smeRows.length)
      return res.status(404).json({ success: false, message: 'SME profile not found.' });

    const smeId = smeRows[0].id;

    await db.query(
      `INSERT INTO sme_documents (sme_id, doc_type, filename, file_path, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [smeId, doc_type, req.file.originalname, req.file.path, req.file.size]
    );

    return res.status(201).json({
      success: true,
      message: 'Document uploaded. Your Capital Readiness Score will be updated shortly.',
      file: { filename: req.file.originalname, path: req.file.path, size: req.file.size },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/sme/:id/approve  (admin only) ───────
// Mirrors IAMS organisation approval flow exactly
exports.adminApprove = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });

    const [rows] = await db.query(
      `SELECT sp.*, u.email, u.firstname
       FROM sme_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE sp.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'SME profile not found.' });

    const sme = rows[0];

    await db.query(
      `UPDATE sme_profiles
       SET approval_status = ?, approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [status, req.user.id, sme.id]
    );

    // Notify the SME owner
    const notifMsg = status === 'approved'
      ? 'Your SME profile has been approved. You are now visible to investors.'
      : `Your SME profile was not approved. ${reason ? 'Reason: ' + reason : 'Please contact support.'}`;

    await createNotification(sme.user_id, 'SME Profile Update', notifMsg, status === 'approved' ? 'success' : 'warning');

    // Send email
    if (status === 'approved') {
      const { subject, html } = emailTemplates.smeApproved(sme.business_name);
      sendEmail(sme.email, subject, html).catch(console.error);
    } else {
      const { subject, html } = emailTemplates.smeRejected(sme.business_name, reason);
      sendEmail(sme.email, subject, html).catch(console.error);
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, ?, 'sme_profiles', ?, ?)`,
      [req.user.id, `sme_${status}`, sme.id, JSON.stringify({ reason })]
    );

    return res.json({ success: true, message: `SME profile ${status}.` });
  } catch (err) {
    next(err);
  }
};
