/**
 * Capital Pyre — Auth Controller
 * Adapted from IAMS authController.js (UB CSI341).
 *
 * Changes from IAMS:
 * - Roles: entrepreneur | sme | investor | admin
 * - Creates role-specific profile row on register
 * - Added rate limiting (applied at route level)
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { validationResult } = require('express-validator');
const db      = require('../utils/db');
const { sendEmail, emailTemplates } = require('../utils/mailer');

// ── Helper: sign JWT ──────────────────────────────────────
const signToken = (user, remember = false) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, firstname: user.firstname },
    process.env.JWT_SECRET,
    { expiresIn: remember ? '30d' : (process.env.JWT_EXPIRES_IN || '7d') }
  );

// ── POST /api/auth/register ───────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ success: false, errors: errors.array() });

    const { firstname, lastname, email, password, role, phone, nationality, date_of_birth } = req.body;

    // Prevent self-registration as admin
    if (role === 'admin')
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be self-registered.' });

    // Check email uniqueness
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });

    const password_hash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      `INSERT INTO users (firstname, lastname, email, password_hash, role, phone, nationality, date_of_birth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstname, lastname, email, password_hash, role,
       phone || null, nationality || null, date_of_birth || null]
    );

    const userId = result.insertId;

    // Create role-specific profile row
    if (role === 'entrepreneur') {
      const { business_name, sector, stage } = req.body;
      await db.query(
        `INSERT INTO entrepreneur_profiles (user_id, business_name, sector, stage)
         VALUES (?, ?, ?, ?)`,
        [userId, business_name || `${firstname}'s Venture`, sector || null, stage || 'idea']
      );
    }

    if (role === 'sme') {
      const { business_name, industry, cipa_reg_no } = req.body;
      await db.query(
        `INSERT INTO sme_profiles (user_id, business_name, industry, cipa_reg_no)
         VALUES (?, ?, ?, ?)`,
        [userId, business_name || `${firstname}'s Business`, industry || null, cipa_reg_no || null]
      );
    }

    if (role === 'investor') {
      const { investor_type, firm_name } = req.body;
      await db.query(
        `INSERT INTO investor_profiles (user_id, investor_type, firm_name)
         VALUES (?, ?, ?)`,
        [userId, investor_type || 'angel', firm_name || null]
      );
    }

    // Send welcome email (non-blocking)
    const { subject, html } = emailTemplates.welcomeUser(firstname, role);
    sendEmail(email, subject, html).catch(console.error);

    const token = signToken({ id: userId, email, role, firstname });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: userId, firstname, lastname, email, role, is_verified: false },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ success: false, errors: errors.array() });

    const { email, password, remember = false } = req.body;

    const [rows] = await db.query(
      'SELECT id, firstname, lastname, email, password_hash, role, is_verified, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = rows[0];

    if (!user.is_active)
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });

    const token = signToken(user, remember);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/forgot-password ───────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query('SELECT id, firstname FROM users WHERE email = ?', [email]);

    // Always respond 200 to prevent email enumeration
    if (!rows.length)
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    const { subject, html } = emailTemplates.passwordReset(user.firstname, resetUrl);
    sendEmail(email, subject, html).catch(console.error);

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password ────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ success: false, errors: errors.array() });

    const { token, password } = req.body;

    const [rows] = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (!rows.length)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    const prt = rows[0];
    const password_hash = await bcrypt.hash(password, 12);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, prt.user_id]);
    await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [prt.id]);

    return res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────
exports.me = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, firstname, lastname, email, role, is_verified, is_active, avatar_path, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'User not found.' });

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
};
