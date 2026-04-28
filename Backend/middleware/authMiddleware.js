const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set in environment.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

function normalizeRole(role) {
  return String(role ?? '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
}

function isSuperAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'super admin';
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!isSuperAdminRole(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only super admin users can access inventory.' });
  }

  next();
}

module.exports = { authenticateToken, requireSuperAdmin, isSuperAdminRole };
