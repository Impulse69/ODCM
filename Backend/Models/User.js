const pool = require('../Config/db');
const bcrypt = require('bcrypt');

const VALID_ROLES = ['Admin', 'Super Admin'];

function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toLowerCase().replace(/[\s_]+/g, ' ');
  if (!normalized) return 'Admin';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'super admin') return 'Super Admin';
  return null;
}

function buildInitials(name) {
  const nameParts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!nameParts.length) return 'NA';
  return nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : nameParts[0].substring(0, 2).toUpperCase();
}

async function createUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      email       VARCHAR(150) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      name        VARCHAR(150) NOT NULL,
      phone       VARCHAR(30),
      role        VARCHAR(50)  NOT NULL DEFAULT 'Admin',
      is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
      initials    VARCHAR(5),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Add columns if missing (for existing tables)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  console.log('Users table created (or already exists).');
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}

async function createUser({ email, password, name, role }) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw new Error(`Invalid role. Use one of: ${VALID_ROLES.join(', ')}`);
  }

  const hashed = await bcrypt.hash(password, 10);
  const initials = buildInitials(name);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password, name, role, initials) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, initials, phone, is_active, created_at`,
    [email, hashed, name, normalizedRole, initials]
  );
  return rows[0];
}

async function getAllUsers() {
  const { rows } = await pool.query(
    'SELECT id, email, name, phone, role, is_active, initials, created_at, updated_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function getActiveAdminUsersWithPhone() {
  const { rows } = await pool.query(
    `SELECT id, email, name, phone, role
     FROM users
     WHERE is_active = TRUE
       AND phone IS NOT NULL
       AND TRIM(phone) <> ''
       AND LOWER(role) IN ('admin', 'super admin')
     ORDER BY created_at DESC`
  );
  return rows;
}

async function createManagedUser({ email, password, name, role, phone, is_active = true }) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw new Error(`Invalid role. Use one of: ${VALID_ROLES.join(', ')}`);
  }

  const plainPassword = password || `${Math.random().toString(36).slice(-10)}A1!`;
  const hashed = await bcrypt.hash(plainPassword, 10);
  const initials = buildInitials(name);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password, name, phone, role, is_active, initials)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, name, phone, role, is_active, initials, created_at`,
    [email, hashed, name, phone || null, normalizedRole, Boolean(is_active), initials]
  );

  return { user: rows[0], tempPassword: password ? null : plainPassword };
}

async function updateManagedUser(id, { name, email, phone, role, password, is_active }) {
  const current = await findById(id);
  const updates = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
  if (email !== undefined) { updates.push(`email = $${idx++}`); values.push(email); }
  if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
  if (role !== undefined) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) throw new Error(`Invalid role. Use one of: ${VALID_ROLES.join(', ')}`);
    updates.push(`role = $${idx++}`);
    values.push(normalizedRole);
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(Boolean(is_active));
  }
  if (password !== undefined && password) {
    const hashed = await bcrypt.hash(password, 10);
    updates.push(`password = $${idx++}`);
    values.push(hashed);
  }

  if (!updates.length) {
    return current;
  }

  if (name !== undefined) {
    updates.push(`initials = $${idx++}`);
    values.push(buildInitials(name));
  }
  updates.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, phone, role, is_active, initials, created_at, updated_at`,
    values
  );
  return rows[0] ?? null;
}

async function deleteUserById(id) {
  const { rows } = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, email, name, phone, role, is_active, initials, created_at, updated_at',
    [id]
  );
  return rows[0] ?? null;
}

async function seedDefaultAdmin() {
  const existing = await findByEmail('admin@odg.com.gh');
  if (!existing) {
    await createUser({ email: 'admin@odg.com.gh', password: 'admin123', name: 'System Administrator', role: 'Super Admin' });
    console.log('Default admin seeded.');
  }
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function updateUser(id, { name, email, phone }) {
  const nameParts = name.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : nameParts[0].substring(0, 2).toUpperCase();

  const { rows } = await pool.query(
    `UPDATE users SET name = $1, email = $2, phone = $3, initials = $4 WHERE id = $5 RETURNING id, email, name, phone, role, is_active, initials`,
    [name, email, phone, initials, id]
  );
  return rows[0];
}

async function changePassword(id, hashedPassword) {
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
}

async function setOtp(id, code, expiresAt) {
  await pool.query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [code, expiresAt, id]);
}

async function clearOtp(id) {
  await pool.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [id]);
}

module.exports = {
  createUsersTable,
  findByEmail,
  findById,
  createUser,
  getAllUsers,
  getActiveAdminUsersWithPhone,
  createManagedUser,
  updateManagedUser,
  deleteUserById,
  updateUser,
  changePassword,
  setOtp,
  clearOtp,
  seedDefaultAdmin,
};
