/**
 * Capital Pyre — Entrepreneur Controller
 */

const db = require('../utils/db');
const path = require('path');

// ── GET /api/entrepreneurs ────────────────────────────────
// Search & filter published entrepreneur profiles (investors browse)
exports.search = async (req, res, next) => {
  try {
    const { sector, stage, min_crs, max_crs, q, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT ep.*, u.firstname, u.lastname, u.email, u.avatar_path
      FROM entrepreneur_profiles ep
      JOIN users u ON u.id = ep.user_id
      WHERE ep.is_published = TRUE AND u.is_active = TRUE
    `;
    const params = [];

    if (sector)  { sql += ' AND ep.sector = ?';              params.push(sector); }
    if (stage)   { sql += ' AND ep.stage = ?';               params.push(stage); }
    if (min_crs) { sql += ' AND ep.crs_score >= ?';          params.push(parseFloat(min_crs)); }
    if (max_crs) { sql += ' AND ep.crs_score <= ?';          params.push(parseFloat(max_crs)); }
    if (q)       { sql += ' AND (ep.business_name LIKE ? OR ep.pitch_summary LIKE ?)';
                   params.push(`%${q}%`, `%${q}%`); }

    sql += ' ORDER BY ep.crs_score DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/entrepreneurs/:id ────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ep.*, u.firstname, u.lastname, u.email, u.avatar_path, u.is_verified
       FROM entrepreneur_profiles ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Profile not found.' });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/entrepreneurs/me ─────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT ep.*, u.firstname, u.lastname, u.email, u.avatar_path, u.is_verified
       FROM entrepreneur_profiles ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.user_id = ?`,
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Profile not found.' });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/entrepreneurs/me ─────────────────────────────
exports.updateMyProfile = async (req, res, next) => {
  try {
    const {
      business_name, sector, stage, pitch_summary, problem_statement,
      solution, market_size, revenue_model, traction, funding_ask,
      currency, website, linkedin,
    } = req.body;

    const pitch_deck_path = req.file ? req.file.path : undefined;

    const fields = {
      business_name, sector, stage, pitch_summary, problem_statement,
      solution, market_size, revenue_model, traction, funding_ask,
      currency, website, linkedin,
      ...(pitch_deck_path && { pitch_deck_path }),
    };

    // Remove undefined values
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

    if (!Object.keys(clean).length)
      return res.status(400).json({ success: false, message: 'No fields to update.' });

    const setClauses = Object.keys(clean).map(k => `${k} = ?`).join(', ');
    const values     = [...Object.values(clean), req.user.id];

    await db.query(
      `UPDATE entrepreneur_profiles SET ${setClauses} WHERE user_id = ?`,
      values
    );

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/entrepreneurs/me/publish ───────────────────
exports.togglePublish = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, is_published, crs_score FROM entrepreneur_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Profile not found.' });

    const profile = rows[0];

    // Must have a minimum CRS score to publish
    if (!profile.is_published && profile.crs_score < 20)
      return res.status(400).json({
        success: false,
        message: 'Your Capital Readiness Score must be at least 20 to publish your profile. Complete your profile to improve your score.',
      });

    await db.query(
      'UPDATE entrepreneur_profiles SET is_published = ? WHERE user_id = ?',
      [!profile.is_published, req.user.id]
    );

    return res.json({
      success: true,
      message: profile.is_published ? 'Profile unpublished.' : 'Profile published and visible to investors.',
      is_published: !profile.is_published,
    });
  } catch (err) {
    next(err);
  }
};
