/**
 * Capital Pyre — Deals Controller
 * Includes: deadline tracking, deal_events logging, inactive close.
 */

const db = require('../utils/db');
const { createNotification } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/mailer');

const STAGE_DEADLINES_DAYS = { intro: 5, nda: 7, due_diligence: 14, term_sheet: 10 };
const STAGES = ['intro','nda','due_diligence','term_sheet','closed','terminated'];

const verifyDealParty = async (userId, role, deal) => {
  if (role === 'investor') {
    const [r] = await db.query('SELECT id FROM investor_profiles WHERE id = ? AND user_id = ?', [deal.investor_id, userId]);
    return r.length > 0;
  }
  const table = role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
  const [r] = await db.query(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`, [deal.target_id, userId]);
  return r.length > 0;
};

const getDealPartyUserIds = async (deal) => {
  const ids = [];
  const [inv] = await db.query('SELECT user_id FROM investor_profiles WHERE id = ?', [deal.investor_id]);
  if (inv.length) ids.push(inv[0].user_id);
  const table = deal.target_type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
  const [tgt] = await db.query(`SELECT user_id FROM ${table} WHERE id = ?`, [deal.target_id]);
  if (tgt.length) ids.push(tgt[0].user_id);
  return ids;
};

exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, m.target_id, m.target_type, m.match_score, m.investor_id
       FROM deals d JOIN matches m ON m.id = d.match_id WHERE d.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Deal not found.' });
    const deal = rows[0];

    const isParty = await verifyDealParty(req.user.id, req.user.role, deal);
    if (!isParty && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const [docs] = await db.query(
      `SELECT dd.*, u.firstname, u.lastname FROM deal_documents dd
       JOIN users u ON u.id = dd.uploaded_by WHERE dd.deal_id = ? ORDER BY dd.uploaded_at DESC`, [deal.id]);
    const [logbooks] = await db.query(
      'SELECT * FROM logbooks WHERE deal_id = ? ORDER BY week_number ASC', [deal.id]);
    const [events] = await db.query(
      `SELECT de.*, u.firstname, u.lastname FROM deal_events de
       LEFT JOIN users u ON u.id = de.actor_id
       WHERE de.deal_id = ? ORDER BY de.created_at ASC`, [deal.id]);

    return res.json({ success: true, data: { ...deal, documents: docs, logbooks, events } });
  } catch (err) { next(err); }
};

exports.getMyDeals = async (req, res, next) => {
  try {
    let sql, params;
    if (req.user.role === 'investor') {
      sql = `SELECT d.*, m.target_id, m.target_type, m.match_score
             FROM deals d JOIN matches m ON m.id = d.match_id
             JOIN investor_profiles ip ON ip.id = m.investor_id
             WHERE ip.user_id = ? ORDER BY d.created_at DESC`;
      params = [req.user.id];
    } else {
      const table = req.user.role === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
      const [pRows] = await db.query(`SELECT id FROM ${table} WHERE user_id = ?`, [req.user.id]);
      if (!pRows.length) return res.json({ success: true, data: [] });
      sql = `SELECT d.*, m.target_id, m.target_type, m.match_score
             FROM deals d JOIN matches m ON m.id = d.match_id
             WHERE m.target_id = ? AND m.target_type = ? ORDER BY d.created_at DESC`;
      params = [pRows[0].id, req.user.role];
    }
    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.advanceStage = async (req, res, next) => {
  try {
    const { stage, stage_notes } = req.body;
    if (!STAGES.includes(stage))
      return res.status(400).json({ success: false, message: `Stage must be one of: ${STAGES.join(', ')}.` });

    const [rows] = await db.query(
      `SELECT d.*, m.target_id, m.target_type, m.investor_id
       FROM deals d JOIN matches m ON m.id = d.match_id WHERE d.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Deal not found.' });
    const deal = rows[0];

    const isParty = await verifyDealParty(req.user.id, req.user.role, deal);
    if (!isParty && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    // Calculate new deadline for the next stage
    const deadlineDays = STAGE_DEADLINES_DAYS[stage];
    const deadline = deadlineDays ? new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000) : null;

    const closedAt = stage === 'closed' ? 'NOW()' : 'NULL';
    await db.query(
      `UPDATE deals SET stage = ?, stage_notes = ?, deadline_at = ?, last_activity_at = NOW(),
       ${stage === 'closed' ? 'closed_at = NOW(),' : ''} updated_at = NOW() WHERE id = ?`,
      [stage, stage_notes || null, deadline, deal.id]
    );

    // Log the stage event
    await db.query(
      `INSERT INTO deal_events (deal_id, actor_id, event_type, stage_from, stage_to, notes)
       VALUES (?, ?, 'stage_advanced', ?, ?, ?)`,
      [deal.id, req.user.id, deal.stage, stage, stage_notes || null]
    );

    // Notify both parties
    const partyIds = await getDealPartyUserIds(deal);
    for (const uid of partyIds) {
      if (uid !== req.user.id) {
        await createNotification(uid,
          `Deal Update: ${stage.replace('_', ' ').toUpperCase()}`,
          `A deal has moved to the ${stage.replace('_', ' ')} stage. Log in to your Deal Room for next steps.`,
          'deal'
        );
      }
    }

    return res.json({ success: true, message: `Deal advanced to ${stage}.`, deadline });
  } catch (err) { next(err); }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const { doc_type } = req.body;
    const [rows] = await db.query(
      `SELECT d.*, m.target_id, m.target_type, m.investor_id
       FROM deals d JOIN matches m ON m.id = d.match_id WHERE d.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Deal not found.' });
    const deal = rows[0];

    const isParty = await verifyDealParty(req.user.id, req.user.role, deal);
    if (!isParty && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    await db.query(
      `INSERT INTO deal_documents (deal_id, uploaded_by, doc_type, filename, file_path, file_size, access_roles)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deal.id, req.user.id, doc_type || 'other',
       req.file.originalname, req.file.path, req.file.size,
       JSON.stringify(['investor', 'entrepreneur', 'sme', 'admin'])]
    );

    // Log document upload event + update last_activity
    await db.query(
      `INSERT INTO deal_events (deal_id, actor_id, event_type) VALUES (?, ?, 'document_uploaded')`,
      [deal.id, req.user.id]
    );
    await db.query('UPDATE deals SET last_activity_at = NOW() WHERE id = ?', [deal.id]);

    return res.status(201).json({ success: true, message: 'Document uploaded to Deal Room.' });
  } catch (err) { next(err); }
};

// PATCH /api/deals/:id/close-inactive
exports.closeInactive = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, m.target_id, m.target_type, m.investor_id
       FROM deals d JOIN matches m ON m.id = d.match_id WHERE d.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Deal not found.' });
    const deal = rows[0];

    const isParty = await verifyDealParty(req.user.id, req.user.role, deal);
    if (!isParty && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    await db.query(
      "UPDATE deals SET stage = 'terminated', updated_at = NOW() WHERE id = ?", [deal.id]);
    await db.query(
      "UPDATE matches SET status = 'closed', updated_at = NOW() WHERE id = ?", [deal.match_id]);
    await db.query(
      `INSERT INTO deal_events (deal_id, actor_id, event_type, stage_from, stage_to)
       VALUES (?, ?, 'marked_inactive', ?, 'terminated')`,
      [deal.id, req.user.id, deal.stage]
    );

    // Notify both parties
    const partyIds = await getDealPartyUserIds(deal);
    for (const uid of partyIds) {
      await createNotification(uid,
        'Deal Closed — Inactive',
        'A deal has been closed due to inactivity. Both parties are now available for new matches.',
        'info'
      );
    }

    return res.json({ success: true, message: 'Deal closed. Both parties released for new matching.' });
  } catch (err) { next(err); }
};
