/**
 * Capital Pyre — Auth Middleware
 * Adapted directly from IAMS (UB CSI341).
 *
 * Roles: entrepreneur | sme | investor | admin
 * (replaces IAMS roles: student | organisation | attachment_supervisor | industrial_supervisor | coordinator)
 */

const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches decoded payload to req.user on success.
 * { id, email, role, firstname }
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token. Please log in again.';
    return res.status(401).json({ success: false, message: msg });
  }
};

/**
 * Factory: allow only specific roles.
 * Usage: authorize('admin')
 *        authorize('entrepreneur', 'investor')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role(s): ${roles.join(', ')}.`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };
