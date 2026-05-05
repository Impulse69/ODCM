const jwt = require('jsonwebtoken');
const { findById } = require('../Models/User');

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

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'This account is inactive. Please contact your administrator.' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      initials: user.initials,
      is_active: user.is_active,
    };
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
    return res.status(403).json({ success: false, message: 'Only super admin users can access this resource.' });
  }

  next();
}

module.exports = { authenticateToken, requireSuperAdmin, isSuperAdminRole };
