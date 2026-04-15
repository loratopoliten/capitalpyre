const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const db = require('../utils/db');

// PATCH /api/users/me/avatar
router.patch('/me/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    await db.query('UPDATE users SET avatar_path = ? WHERE id = ?', [req.file.path, req.user.id]);
    return res.json({ success: true, avatar_path: req.file.path });
  } catch (err) { next(err); }
});

module.exports = router;
