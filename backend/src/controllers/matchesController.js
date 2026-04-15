/**
 * Capital Pyre — Matches Controller
 * Matching algorithm + commitment signal enforcement + pass reason capture.
 */

const db = require('../utils/db');
const { sendEmail, emailTemplates } = require('../utils/mailer');
const { createNotification } = require('../utils/notifications');

const computeMatchScore = (investorProfile, targetProfile) => {
  let score = 0;
  const breakdown = {};

  const investorSectors = JSON.parse(investorProfile.sectors || '[]');
  if (investorSectors.length && targetProfile.sector &&
      investorSectors.map(s => s.toLowerCase()).includes(targetProfile.sector.toLowerCase())) {
    score += 30; breakdown.sector = 30;
  } else { breakdown.sector = 0; }

  const preferredStages = JSON.parse(investorProfile.preferred_stage || '[]');
  if (preferredStages.length && targetProfile.stage &&
      preferredStages.map(s => s.toLowerCase()).includes(targetProfile.stage.toLowerCase())) {
    score += 25; breakdown.stage = 25;
  } else { breakdown.stage = 0; }

  if (targetProfile.funding_ask && investorProfile.min_ticket && investorProfile.max_ticket) {
    const ask = parseFloat(targetProfile.funding_ask);
    const min = parseFloat(investorProfile.min_ticket);
    const max = parseFloat(investorProfile.max_ticket);
    if (ask >= min && ask <= max)      { score += 20; breakdown.ticket_size = 20; }
    else if (ask >= min * 0.7 && ask <= max * 1.3) { score += 10; breakdown.ticket_size = 10; }
    else { breakdown.ticket_size = 0; }
  } else { breakdown.ticket_size = 0; }

  const targetCRS = parseFloat(targetProfile.crs_score || 0);
  const minCRS    = parseFloat(investorProfile.min_crs_score || 0);
  if (targetCRS >= minCRS) {
    const pts = targetCRS >= 70 ? 15 : targetCRS >= 40 ? 8 : 5;
    score += pts; breakdown.crs_score = pts;
  } else { breakdown.crs_score = 0; }

  const riskMap = { idea: 'high', 'pre-seed': 'high', seed: 'medium', 'series-a': 'medium', growth: 'low' };
  const tRisk = riskMap[targetProfile.stage] || 'medium';
  const iRisk = investorProfile.risk_appetite || 'medium';
  if (tRisk === iRisk) { score += 10; breakdown.risk = 10; }
  else if ((tRisk === 'high' && iRisk === 'medium') || (tRisk === 'medium' && iRisk === 'high')) {
    score += 5; breakdown.risk = 5;
  } else { breakdown.risk = 0; }

  return { score: Math.min(Math.round(score), 100), breakdown };
};

const PASS_MESSAGES = {
  too_early:                  'The investor felt the venture is too early-stage for their current focus.',
  wrong_sector:               "The investor's sector focus did not align with your industry.",
  crs_below_threshold:        'Your Capital Readiness Score was below this investor\'s threshold. Improving your CRS will unlock more investors.',
  documentation_insufficient: 'The investor cited insufficient documentation. Upload your financial statements and business plan.',
  ticket_size_mismatch:       "Your funding ask falls outside this investor's ticket size range.",
  already_funded:             "The investor's current portfolio capacity is full.",
  no_longer_available:        'The entrepreneur is no longer seeking funding at this time.',
  other:                      'The investor passed on this match.',
};

exports.getSuggestions = async (req, res, next) => {
  try {
    const table = req.user.role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [pRows] = await db.query(`SELECT * FROM ${table} WHERE user_id = ?`, [req.user.id]);
    if (!pRows.length) return res.status(404).json({ success: false, message: 'Profile not found.' });
    const profile = pRows[0];

    const [investors] = await db.query(
      `SELECT ip.*, u.firstname, u.lastname FROM investor_profiles ip
       JOIN users u ON u.id = ip.user_id
       WHERE u.is_active = TRUE AND ip.min_ticket IS NOT NULL AND ip.max_ticket IS NOT NULL
         AND ip.id NOT IN (SELECT investor_id FROM matches WHERE target_id = ? AND target_type = ?)`,
      [profile.id, req.user.role]
    );

    const suggestions = investors
      .map(inv => {
        const { score, breakdown } = computeMatchScore(inv, profile);
        return { investor_id: inv.id, investor_name: `${inv.firstname} ${inv.lastname}`,
                 firm_name: inv.firm_name, investor_type: inv.investor_type, match_score: score, breakdown };
      })
      .filter(s => s.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5);

    return res.json({ success: true, data: suggestions });
  } catch (err) { next(err); }
};

exports.getPreview = async (req, res, next) => {
  try {
    const table = req.user.role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [pRows] = await db.query(`SELECT crs_score FROM ${table} WHERE user_id = ?`, [req.user.id]);
    if (!pRows.length) return res.json({ success: true, count: 0, is_preview: true });
    const [investors] = await db.query(
      'SELECT COUNT(*) AS cnt FROM investor_profiles ip JOIN users u ON u.id = ip.user_id WHERE u.is_active = TRUE AND ip.min_ticket IS NOT NULL'
    );
    const estimate = Math.max(1, Math.floor(investors[0].cnt * (parseFloat(pRows[0].crs_score || 20) / 100) * 0.4));
    return res.json({ success: true, count: estimate, is_preview: true });
  } catch (err) { next(err); }
};

exports.getMyMatches = async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'investor') {
      [rows] = await db.query(
        `SELECT m.*, ip.firm_name, u.firstname, u.lastname FROM matches m
         JOIN investor_profiles ip ON ip.id = m.investor_id JOIN users u ON u.id = ip.user_id
         WHERE ip.user_id = ? ORDER BY m.created_at DESC`, [req.user.id]);
    } else {
      const table = req.user.role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
      const [pRows] = await db.query(`SELECT id FROM ${table} WHERE user_id = ?`, [req.user.id]);
      if (!pRows.length) return res.json({ success: true, data: [] });
      [rows] = await db.query(
        `SELECT m.*, ip.firm_name, u.firstname, u.lastname FROM matches m
         JOIN investor_profiles ip ON ip.id = m.investor_id JOIN users u ON u.id = ip.user_id
         WHERE m.target_id = ? AND m.target_type = ? ORDER BY m.created_at DESC`,
        [pRows[0].id, req.user.role]);
    }
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.requestMatch = async (req, res, next) => {
  try {
    const { target_id, target_type } = req.body;
    if (!target_id || !['entrepreneur', 'sme'].includes(target_type))
      return res.status(400).json({ success: false, message: 'target_id and target_type required.' });

    const [invRows] = await db.query('SELECT * FROM investor_profiles WHERE user_id = ?', [req.user.id]);
    if (!invRows.length) return res.status(404).json({ success: false, message: 'Investor profile not found.' });
    const invProfile = invRows[0];

    // Commitment signal enforcement
    if (!invProfile.min_ticket || !invProfile.max_ticket || parseFloat(invProfile.min_ticket) <= 0) {
      return res.status(400).json({
        success: false, code: 'COMMITMENT_SIGNAL_REQUIRED',
        message: 'Please set your minimum and maximum ticket size in your investor profile before sending match requests.',
      });
    }

    const table = target_type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
    const [targetRows] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [target_id]);
    if (!targetRows.length) return res.status(404).json({ success: false, message: 'Target profile not found.' });

    const { score, breakdown } = computeMatchScore(invProfile, targetRows[0]);

    const [result] = await db.query(
      `INSERT INTO matches (investor_id, target_id, target_type, match_score, score_breakdown, requested_by, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [invProfile.id, target_id, target_type, score, JSON.stringify(breakdown), req.user.id]
    );

    await createNotification(targetRows[0].user_id, 'New Match Request',
      `An investor is interested in your profile. Match score: ${score}/100. Log in to review.`, 'match');

    const [tUser] = await db.query('SELECT firstname, email FROM users WHERE id = ?', [targetRows[0].user_id]);
    const [iUser] = await db.query('SELECT firstname, lastname FROM users WHERE id = ?', [req.user.id]);
    const { subject, html } = emailTemplates.matchReceived(tUser[0].firstname, `${iUser[0].firstname} ${iUser[0].lastname}`);
    sendEmail(tUser[0].email, subject, html).catch(console.error);

    return res.status(201).json({ success: true, message: 'Match request sent.',
      match: { id: result.insertId, match_score: score, breakdown } });
  } catch (err) { next(err); }
};

exports.respondToMatch = async (req, res, next) => {
  try {
    const { status, pass_reason, pass_note } = req.body;
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be accepted or rejected.' });

    const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found.' });
    const match = rows[0];

    await db.query(
      'UPDATE matches SET status = ?, pass_reason = ?, pass_note = ?, responded_at = NOW() WHERE id = ?',
      [status, pass_reason || null, pass_note || null, match.id]
    );

    if (status === 'accepted') {
      const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const [dealResult] = await db.query(
        "INSERT INTO deals (match_id, stage, deadline_at, last_activity_at) VALUES (?, 'intro', ?, NOW())",
        [match.id, deadline]
      );
      await db.query(
        "INSERT INTO deal_events (deal_id, actor_id, event_type, stage_to) VALUES (?, ?, 'created', 'intro')",
        [dealResult.insertId, req.user.id]
      );
      const [inv] = await db.query(
        'SELECT u.id, u.firstname, u.email FROM investor_profiles ip JOIN users u ON u.id = ip.user_id WHERE ip.id = ?',
        [match.investor_id]
      );
      await createNotification(inv[0].id, 'Match Accepted!', 'Your match request was accepted. Your Deal Room is now open.', 'match');
      const { subject, html } = emailTemplates.matchAccepted(inv[0].firstname, req.user.firstname);
      sendEmail(inv[0].email, subject, html).catch(console.error);

    } else if (status === 'rejected' && pass_reason) {
      const coaching = PASS_MESSAGES[pass_reason] || (pass_note ? pass_note : PASS_MESSAGES.other);
      const table = match.target_type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
      const [tProfile] = await db.query(`SELECT user_id FROM ${table} WHERE id = ?`, [match.target_id]);
      if (tProfile.length) {
        await createNotification(tProfile[0].user_id, 'Investor Feedback', coaching, 'info');
      }
    }

    return res.json({ success: true, message: `Match ${status}.` });
  } catch (err) { next(err); }
};
