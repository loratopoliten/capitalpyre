const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../utils/db');

// GET /api/reports/deals  — CSV-exportable deal summary
router.get('/deals', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.stage, d.amount, d.currency, d.created_at, d.closed_at,
              m.match_score, m.target_type
       FROM deals d JOIN matches m ON m.id = d.match_id
       ORDER BY d.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
