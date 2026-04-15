/**
 * Capital Pyre — CRS Controller
 * Adds: crs_history logging, benchmark endpoint.
 */

const axios = require('axios');
const db    = require('../utils/db');
const { createNotification } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/mailer');

const CRS_URL = process.env.CRS_SERVICE_URL || 'http://localhost:8000';

exports.compute = async (req, res, next) => {
  try {
    const role = req.user.role;
    if (!['entrepreneur', 'sme'].includes(role))
      return res.status(403).json({ success: false, message: 'Only entrepreneurs and SMEs can compute a CRS score.' });

    const table = role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE user_id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found.' });
    const profile = rows[0];

    let documents = [];
    if (role === 'sme') {
      [documents] = await db.query('SELECT doc_type FROM sme_documents WHERE sme_id = ?', [profile.id]);
    }

    const payload = {
      role,
      profile: {
        business_name:     profile.business_name,
        sector:            profile.sector || profile.industry,
        stage:             profile.stage,
        pitch_summary:     profile.pitch_summary || profile.description,
        problem_statement: profile.problem_statement,
        solution:          profile.solution,
        market_size:       profile.market_size,
        revenue_model:     profile.revenue_model,
        traction:          profile.traction,
        funding_ask:       profile.funding_ask,
        year_established:  profile.year_established,
        employee_count:    profile.employee_count,
        revenue_band:      profile.revenue_band,
        cipa_reg_no:       profile.cipa_reg_no,
        website:           profile.website,
      },
      documents: documents.map(d => d.doc_type),
    };

    let scoringResult;
    try {
      const response = await axios.post(`${CRS_URL}/compute`, payload, { timeout: 10000 });
      scoringResult = response.data;
    } catch (serviceErr) {
      console.error('[CRS] Scoring service error:', serviceErr.message);
      return res.status(503).json({ success: false, message: 'Scoring service unavailable. Please try again.' });
    }

    const { crs_score, breakdown, tips } = scoringResult;

    // Update profile
    await db.query(
      `UPDATE ${table} SET crs_score = ?, crs_breakdown = ?, crs_computed_at = NOW() WHERE user_id = ?`,
      [crs_score, JSON.stringify(breakdown), req.user.id]
    );

    // ── Store history — the data moat ──────────────────────
    await db.query(
      'INSERT INTO crs_history (user_id, role, crs_score, breakdown) VALUES (?, ?, ?, ?)',
      [req.user.id, role, crs_score, JSON.stringify(breakdown)]
    );

    await createNotification(req.user.id, 'Capital Readiness Score Updated',
      `Your new CRS score is ${crs_score}/100. Log in to see your full breakdown and improvement tips.`, 'success');

    const [user] = await db.query('SELECT firstname, email FROM users WHERE id = ?', [req.user.id]);
    const { subject, html } = emailTemplates.crsUpdated(user[0].firstname, crs_score);
    sendEmail(user[0].email, subject, html).catch(console.error);

    return res.json({ success: true, crs_score, breakdown, tips });
  } catch (err) { next(err); }
};

exports.getMyCRS = async (req, res, next) => {
  try {
    const table = req.user.role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [rows] = await db.query(
      `SELECT crs_score, crs_breakdown, crs_computed_at FROM ${table} WHERE user_id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found.' });

    // Fetch history
    const [history] = await db.query(
      'SELECT crs_score, computed_at FROM crs_history WHERE user_id = ? ORDER BY computed_at ASC LIMIT 30',
      [req.user.id]
    );

    return res.json({ success: true, data: { ...rows[0], history } });
  } catch (err) { next(err); }
};

// GET /api/crs/benchmarks — aggregate CRS comparisons by sector+stage
exports.getBenchmarks = async (req, res, next) => {
  try {
    const { sector, stage, role = 'entrepreneur' } = req.query;
    const table = role === 'sme' ? 'sme_profiles' : 'entrepreneur_profiles';

    let sql = `SELECT AVG(crs_score) AS avg_crs, MIN(crs_score) AS min_crs,
               MAX(crs_score) AS max_crs, COUNT(*) AS sample_size FROM ${table} WHERE crs_score > 0`;
    const params = [];

    if (sector && role !== 'sme') { sql += ' AND sector = ?'; params.push(sector); }
    if (sector && role === 'sme') { sql += ' AND industry = ?'; params.push(sector); }
    if (stage && role !== 'sme') { sql += ' AND stage = ?'; params.push(stage); }

    const [benchmarks] = await db.query(sql, params);

    // Also get funded subset (deals that closed)
    const fundedSql = `
      SELECT AVG(ep.crs_score) AS funded_avg_crs
      FROM ${table} ep
      JOIN matches m ON m.target_id = ep.id AND m.target_type = ?
      JOIN deals d ON d.match_id = m.id
      WHERE d.stage = 'closed' AND ep.crs_score > 0
      ${sector ? (role === 'sme' ? 'AND ep.industry = ?' : 'AND ep.sector = ?') : ''}
      ${stage && role !== 'sme' ? 'AND ep.stage = ?' : ''}
    `;
    const fundedParams = [role, ...(sector ? [sector] : []), ...(stage && role !== 'sme' ? [stage] : [])];
    const [funded] = await db.query(fundedSql, fundedParams);

    return res.json({
      success: true,
      data: {
        ...benchmarks[0],
        funded_avg_crs: funded[0]?.funded_avg_crs || null,
        filters: { sector, stage, role },
      }
    });
  } catch (err) { next(err); }
};
