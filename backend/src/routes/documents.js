const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const db = require('../utils/db');

router.get('/deal/:dealId', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM deal_documents WHERE deal_id = ?', [req.params.dealId]);
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
