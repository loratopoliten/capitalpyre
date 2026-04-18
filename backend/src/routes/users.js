const router   = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const db       = require('../utils/db');

// GET /api/users/me — works for all roles including admin
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, firstname, lastname, email, role, phone, nationality, avatar_path, is_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/users/me — update basic profile fields
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { firstname, lastname, phone, nationality } = req.body;
    await db.query(
      'UPDATE users SET firstname = ?, lastname = ?, phone = ?, nationality = ? WHERE id = ?',
      [firstname, lastname, phone || null, nationality || null, req.user.id]
    );
    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) { next(err); }
});

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
