const pool = require('../Config/db');

// ─── Create Table ─────────────────────────────────────────────────────────────

async function createPlansTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id          VARCHAR(40)   PRIMARY KEY,          -- e.g. "plan_001"
      name        VARCHAR(100)  NOT NULL UNIQUE,       -- e.g. "Basic"
      price       NUMERIC(10,2) NOT NULL,
      description TEXT          NOT NULL DEFAULT '',
      features    TEXT[]        NOT NULL DEFAULT '{}',
      popular     BOOLEAN       NOT NULL DEFAULT FALSE,
      is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
  `);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getAllPlans() {
  const { rows } = await pool.query(
    `SELECT * FROM plans ORDER BY price ASC`
  );
  return rows;
}

async function getPlanById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM plans WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function createPlan({ id, name, price, description, features, popular, is_active }) {
  const { rows } = await pool.query(
    `INSERT INTO plans (id, name, price, description, features, popular, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, name, price, description ?? '', features ?? [], popular ?? false, is_active ?? true]
  );
  return rows[0];
}

async function updatePlan(id, { name, price, description, features, popular, is_active }) {
  const updates = [];
  const values  = [];
  let   idx     = 1;

  if (name        !== undefined) { updates.push(`name = $${idx++}`);        values.push(name); }
  if (price       !== undefined) { updates.push(`price = $${idx++}`);       values.push(price); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
  if (features    !== undefined) { updates.push(`features = $${idx++}`);    values.push(features); }
  if (popular     !== undefined) { updates.push(`popular = $${idx++}`);     values.push(popular); }
  if (is_active   !== undefined) { updates.push(`is_active = $${idx++}`);   values.push(is_active); }

  if (!updates.length) return getPlanById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE plans SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

async function deletePlan(id) {
  await pool.query('DELETE FROM plans WHERE id = $1', [id]);
}

// Return subscriber counts per plan name by querying the subscriptions table
async function getPlanSubscriberCounts() {
  const { rows } = await pool.query(`
    SELECT plan, COUNT(*) AS count
    FROM   subscriptions
    GROUP  BY plan
  `);
  const counts = {};
  for (const row of rows) counts[row.plan] = parseInt(row.count, 10);
  return counts;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createPlansTable,
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanSubscriberCounts,
};
