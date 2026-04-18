const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../utils/db');

router.get('/deal/:dealId', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM assessments WHERE deal_id = ?', [req.params.dealId]);
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { deal_id, criteria_json, total_score, grade, comments } = req.body;
    const [result] = await db.query(
      'INSERT INTO assessments (deal_id, reviewer_id, criteria_json, total_score, grade, comments) VALUES (?,?,?,?,?,?)',
      [deal_id, req.user.id, JSON.stringify(criteria_json||{}), total_score, grade, comments]
    );
    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { next(err); }
});

module.exports = router;
