/**
 * Capital Pyre — Deal Momentum Cron
 * Runs periodically to nudge stale deals and send deadline reminders.
 * Call via: node src/utils/nudgeCron.js
 * Or schedule with setInterval in server.js for always-on nudging.
 */

require('dotenv').config();
const db = require('./db');
const { createNotification } = require('./notifications');
const { sendEmail } = require('./mailer');

const NUDGE_DAYS = { intro: 3, nda: 5, due_diligence: 10, term_sheet: 7 };

const getDealPartyUserIds = async (deal) => {
  const ids = [];
  const [inv] = await db.query(
    'SELECT user_id FROM investor_profiles WHERE id = ?', [deal.investor_id]);
  if (inv.length) ids.push(inv[0].user_id);
  const table = deal.target_type === 'entrepreneur' ? 'entrepreneur_profiles' : 'sme_profiles';
  const [tgt] = await db.query(`SELECT user_id FROM ${table} WHERE id = ?`, [deal.target_id]);
  if (tgt.length) ids.push(tgt[0].user_id);
  return ids;
};

const runNudges = async () => {
  console.log('[Nudge Cron] Running at', new Date().toISOString());

  try {
    // 1. Deals approaching deadline (within 2 days)
    const [approaching] = await db.query(
      `SELECT d.*, m.target_id, m.target_type, m.investor_id
       FROM deals d JOIN matches m ON m.id = d.match_id
       WHERE d.stage NOT IN ('closed','terminated')
         AND d.deadline_at IS NOT NULL
         AND d.deadline_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 DAY)`
    );

    for (const deal of approaching) {
      const partyIds = await getDealPartyUserIds(deal);
      for (const uid of partyIds) {
        await createNotification(
          uid,
          `Deal Deadline Approaching`,
          `Your deal in the ${deal.stage.replace('_',' ')} stage has a deadline in under 2 days. Log in to take action.`,
          'deadline'
        );
      }
      console.log(`[Nudge] Deadline nudge sent for deal ${deal.id}`);
    }

    // 2. Deals past deadline — mark inactive warning
    const [overdue] = await db.query(
      `SELECT d.*, m.target_id, m.target_type, m.investor_id
       FROM deals d JOIN matches m ON m.id = d.match_id
       WHERE d.stage NOT IN ('closed','terminated')
         AND d.deadline_at IS NOT NULL
         AND d.deadline_at < NOW()
         AND d.last_activity_at < DATE_SUB(NOW(), INTERVAL 3 DAY)`
    );

    for (const deal of overdue) {
      const partyIds = await getDealPartyUserIds(deal);
      for (const uid of partyIds) {
        await createNotification(
          uid,
          'Deal Overdue — Action Required',
          `A deal in the ${deal.stage.replace('_',' ')} stage is past its deadline and has had no activity for 3+ days. If no action is taken within 48 hours, it will be auto-closed.`,
          'warning'
        );
      }
      console.log(`[Nudge] Overdue warning sent for deal ${deal.id}`);
    }

    // 3. Auto-close deals with no activity for 14+ days past deadline
    const [stale] = await db.query(
      `SELECT d.id, d.match_id FROM deals d
       WHERE d.stage NOT IN ('closed','terminated')
         AND d.deadline_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
         AND d.last_activity_at < DATE_SUB(NOW(), INTERVAL 14 DAY)`
    );

    for (const deal of stale) {
      await db.query(
        "UPDATE deals SET stage = 'terminated', updated_at = NOW() WHERE id = ?", [deal.id]);
      await db.query(
        "UPDATE matches SET status = 'closed', updated_at = NOW() WHERE id = ?", [deal.match_id]);
      await db.query(
        `INSERT INTO deal_events (deal_id, event_type, stage_from, stage_to, notes)
         VALUES (?, 'marked_inactive', NULL, 'terminated', 'Auto-closed by system after 14 days of inactivity past deadline')`,
        [deal.id]
      );
      console.log(`[Nudge] Auto-closed stale deal ${deal.id}`);
    }

    // 4. Profile completeness nudges — SME/entrepreneur with low CRS
    const [lowCRS] = await db.query(
      `SELECT ep.user_id, ep.crs_score, ep.crs_computed_at, u.email, u.firstname
       FROM entrepreneur_profiles ep JOIN users u ON u.id = ep.user_id
       WHERE ep.crs_score < 40 AND ep.crs_computed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
         AND u.is_active = TRUE
       UNION
       SELECT sp.user_id, sp.crs_score, sp.crs_computed_at, u.email, u.firstname
       FROM sme_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE sp.crs_score < 40 AND sp.crs_computed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
         AND u.is_active = TRUE`
    );

    for (const profile of lowCRS) {
      // Check they haven't already received a nudge in the last 7 days
      const [recent] = await db.query(
        `SELECT id FROM notifications WHERE user_id = ? AND title LIKE '%Readiness%'
         AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 1`,
        [profile.user_id]
      );
      if (!recent.length) {
        await createNotification(
          profile.user_id,
          'Improve Your Capital Readiness Score',
          `Your CRS is ${Math.round(profile.crs_score)}/100. Uploading your financial documents could unlock significantly more investor matches. Log in to see exactly what to improve.`,
          'info'
        );
        console.log(`[Nudge] Low CRS nudge sent to user ${profile.user_id}`);
      }
    }

    console.log('[Nudge Cron] Complete. Processed:',
      approaching.length, 'approaching,',
      overdue.length, 'overdue,',
      stale.length, 'auto-closed,',
      lowCRS.length, 'CRS nudges'
    );
  } catch (err) {
    console.error('[Nudge Cron] Error:', err.message);
  }
};

// If run directly
if (require.main === module) {
  runNudges().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runNudges };
