const pool = require('../Config/db');

// ─── Create table ─────────────────────────────────────────────────────────────

async function createPaymentHistoryTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_history (
      id            VARCHAR(60)  PRIMARY KEY,
      vehicle_id    VARCHAR(40)  REFERENCES subscriptions(id) ON DELETE SET NULL,
      vehicle_plate VARCHAR(20)  NOT NULL,
      owner_name    VARCHAR(200) NOT NULL,
      owner_type    VARCHAR(20)  NOT NULL CHECK (owner_type IN ('individual', 'company')),
      year          INTEGER      NOT NULL,
      months        INTEGER      NOT NULL CHECK (months BETWEEN 1 AND 36),
      amount_ghs    NUMERIC(10,2) NOT NULL CHECK (amount_ghs > 0),
      paid_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // Widen months constraint for existing tables (24 → 36)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_months_check;
      ALTER TABLE payment_history ADD CONSTRAINT payment_history_months_check CHECK (months BETWEEN 1 AND 36);
    EXCEPTION WHEN others THEN NULL;
    END $$
  `);

  // Index for fast lookups by vehicle
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_history_vehicle_id ON payment_history(vehicle_id)
  `);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getAllPayments({ vehicle_id, owner_type, limit = 200 } = {}) {
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (vehicle_id)  { conditions.push(`vehicle_id = $${idx++}`);  values.push(vehicle_id); }
  if (owner_type)  { conditions.push(`owner_type = $${idx++}`);  values.push(owner_type); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit);

  const { rows } = await pool.query(
    `SELECT * FROM payment_history ${where} ORDER BY paid_at DESC LIMIT $${idx}`,
    values
  );
  return rows;
}

async function getPaymentById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM payment_history WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

async function createPayment({ id, vehicle_id, vehicle_plate, owner_name, owner_type, year, months, amount_ghs }) {
  const { rows } = await pool.query(
    `INSERT INTO payment_history
       (id, vehicle_id, vehicle_plate, owner_name, owner_type, year, months, amount_ghs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, vehicle_id ?? null, vehicle_plate, owner_name, owner_type, year, months, amount_ghs]
  );
  return rows[0];
}

async function deletePayment(id) {
  await pool.query('DELETE FROM payment_history WHERE id = $1', [id]);
}

// ─── Revenue aggregation ─────────────────────────────────────────────────────

async function getMonthlyRevenue(monthsBack = 12) {
  const { rows } = await pool.query(
    `SELECT
       TO_CHAR(paid_at, 'YYYY-MM') AS month,
       SUM(amount_ghs)::NUMERIC(12,2) AS total
     FROM payment_history
     WHERE paid_at >= NOW() - INTERVAL '1 month' * $1
     GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
     ORDER BY month ASC`,
    [monthsBack]
  );
  return rows;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createPaymentHistoryTable,
  getAllPayments,
  getPaymentById,
  createPayment,
  deletePayment,
  getMonthlyRevenue,
};
