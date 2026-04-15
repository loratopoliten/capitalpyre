/**
 * Capital Pyre — Investor Controller
 */

const db = require('../utils/db');

// ── GET /api/investors/me ─────────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ip.*, u.firstname, u.lastname, u.email, u.avatar_path, u.is_verified
       FROM investor_profiles ip
       JOIN users u ON u.id = ip.user_id
       WHERE ip.user_id = ?`,
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Investor profile not found.' });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/investors/:id ────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ip.*, u.firstname, u.lastname, u.email, u.avatar_path, u.is_verified
       FROM investor_profiles ip
       JOIN users u ON u.id = ip.user_id
       WHERE ip.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Investor not found.' });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/investors/me ─────────────────────────────────
exports.updateMyProfile = async (req, res, next) => {
  try {
    const {
      investor_type, firm_name, bio, min_ticket, max_ticket,
      currency, sectors, preferred_stage, risk_appetite,
      min_crs_score, website, linkedin,
    } = req.body;

    const fields = {
      investor_type, firm_name, bio, min_ticket, max_ticket,
      currency, risk_appetite, min_crs_score, website, linkedin,
      ...(sectors        && { sectors: JSON.stringify(sectors) }),
      ...(preferred_stage && { preferred_stage: JSON.stringify(preferred_stage) }),
    };

    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

    if (!Object.keys(clean).length)
      return res.status(400).json({ success: false, message: 'No fields to update.' });

    const setClauses = Object.keys(clean).map(k => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE investor_profiles SET ${setClauses} WHERE user_id = ?`,
      [...Object.values(clean), req.user.id]
    );

    return res.json({ success: true, message: 'Investor profile updated.' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/investors/me/watchlist ───────────────────────
exports.getWatchlist = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT w.*, w.target_type, w.saved_at FROM watchlist w WHERE w.investor_id = ?`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/investors/me/watchlist ──────────────────────
exports.addToWatchlist = async (req, res, next) => {
  try {
    const { target_id, target_type } = req.body;
    if (!target_id || !['entrepreneur', 'sme'].includes(target_type))
      return res.status(400).json({ success: false, message: 'target_id and valid target_type required.' });

    await db.query(
      `INSERT IGNORE INTO watchlist (investor_id, target_id, target_type) VALUES (?, ?, ?)`,
      [req.user.id, target_id, target_type]
    );

    return res.status(201).json({ success: true, message: 'Added to watchlist.' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/investors/me/watchlist/:targetId ──────────
exports.removeFromWatchlist = async (req, res, next) => {
  try {
    await db.query(
      `DELETE FROM watchlist WHERE investor_id = ? AND target_id = ?`,
      [req.user.id, req.params.targetId]
    );
    return res.json({ success: true, message: 'Removed from watchlist.' });
  } catch (err) {
    next(err);
  }
};
