const pool = require('../Config/db');
const bcrypt = require('bcrypt');

async function createUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      email       VARCHAR(150) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      name        VARCHAR(150) NOT NULL,
      phone       VARCHAR(30),
      role        VARCHAR(50)  NOT NULL DEFAULT 'Staff',
      initials    VARCHAR(5),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Add phone column if missing (for existing tables)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
  console.log('Users table created (or already exists).');
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}

async function createUser({ email, password, name, role }) {
  const hashed = await bcrypt.hash(password, 10);
  const nameParts = name.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : nameParts[0].substring(0, 2).toUpperCase();

  const { rows } = await pool.query(
    `INSERT INTO users (email, password, name, role, initials) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, initials`,
    [email, hashed, name, role ?? 'Staff', initials]
  );
  return rows[0];
}

async function seedDefaultAdmin() {
  const existing = await findByEmail('admin@odg.com.gh');
  if (!existing) {
    await createUser({ email: 'admin@odg.com.gh', password: 'admin123', name: 'System Administrator', role: 'ODG Master' });
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
    `UPDATE users SET name = $1, email = $2, phone = $3, initials = $4 WHERE id = $5 RETURNING id, email, name, phone, role, initials`,
    [name, email, phone, initials, id]
  );
  return rows[0];
}

async function changePassword(id, hashedPassword) {
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
}

module.exports = { createUsersTable, findByEmail, findById, createUser, updateUser, changePassword, seedDefaultAdmin };
