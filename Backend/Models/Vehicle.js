const pool = require('../Config/db');

// ─── Shared SELECT ────────────────────────────────────────────────────────────
// Returns a flat row identical to the Subscription interface used by the frontend:
//   id, plate_number, imei, plan, monthly_amount, expiry_date,
//   installation_date, status, trakzee_status,
//   customer_name, phone,
//   individual_customer_id, company_id

const BASE_SELECT = `
  SELECT
    s.id,
    s.plate_number,
    s.imei,
    s.plan,
    s.monthly_amount,
    s.expiry_date,
    s.installation_date,
    s.status,
    s.trakzee_status,
    s.individual_customer_id,
    s.company_id,
    s.created_at,
    s.updated_at,
    s.sms_status,
    s.sms_sent_at,
    s.last_sms_type,
    COALESCE(ic.name,  co.company_name)    AS customer_name,
    COALESCE(ic.phone, co.contact_phone)   AS phone
  FROM subscriptions s
  LEFT JOIN individual_customers ic ON ic.id = s.individual_customer_id
  LEFT JOIN companies            co ON co.id = s.company_id
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getAllVehicles({ status, plan, trakzee_status } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  // Always exclude soft-deleted vehicles
  conditions.push(`s.status != 'Removed'`);

  if (status)         { conditions.push(`s.status = $${idx++}`);         values.push(status); }
  if (plan)           { conditions.push(`s.plan = $${idx++}`);            values.push(plan); }
  if (trakzee_status) { conditions.push(`s.trakzee_status = $${idx++}`); values.push(trakzee_status); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await pool.query(
    `${BASE_SELECT} ${where} ORDER BY s.created_at DESC`,
    values
  );
  return rows;
}

async function getVehicleById(id) {
  const { rows } = await pool.query(
    `${BASE_SELECT} WHERE s.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function searchVehicles(term) {
  const like = `%${term}%`;
  const { rows } = await pool.query(
    `${BASE_SELECT}
     WHERE  s.plate_number ILIKE $1
        OR  s.imei         ILIKE $1
        OR  ic.name        ILIKE $1
        OR  co.company_name ILIKE $1
     ORDER BY s.created_at DESC`,
    [like]
  );
  return rows;
}

async function createVehicle({
  id,
  plate_number,
  imei,
  plan,
  monthly_amount,
  expiry_date,
  installation_date,
  status,
  trakzee_status,
  individual_customer_id,
  company_id,
}) {
  const { rows } = await pool.query(
    `INSERT INTO subscriptions
       (id, plate_number, imei, plan, monthly_amount, expiry_date,
        installation_date, status, trakzee_status,
        individual_customer_id, company_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      id,
      plate_number,
      imei,
      plan,
      monthly_amount,
      expiry_date,
      installation_date ?? null,
      status ?? 'Active',
      trakzee_status ?? 'Active',
      individual_customer_id ?? null,
      company_id ?? null,
    ]
  );
  return rows[0];
}

async function updateVehicle(id, fields) {
  const allowed = [
    'plate_number', 'imei', 'plan', 'monthly_amount',
    'expiry_date', 'installation_date', 'status', 'trakzee_status',
    'sms_status', 'sms_sent_at', 'last_sms_type',
  ];
  const updates = [];
  const values  = [];
  let   idx     = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(fields[key]);
    }
  }
  if (!updates.length) return getVehicleById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

// Soft-delete: marks the vehicle as Removed instead of destroying the row
async function deleteVehicle(id) {
  await pool.query(
    `UPDATE subscriptions
     SET status = 'Removed', trakzee_status = 'Deactivated', updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

// Returns all soft-deleted vehicles (status = 'Removed')
async function getRemovedVehicles() {
  const { rows } = await pool.query(
    `${BASE_SELECT} WHERE s.status = 'Removed' ORDER BY s.updated_at DESC`
  );
  return rows;
}

// Restore: recalculate status from expiry date and mark active/expired
async function restoreVehicle(id) {
  const vehicle = await getVehicleById(id);
  if (!vehicle) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(vehicle.expiry_date);
  const restoredStatus = expiry < today ? 'Expired' : 'Active';
  const { rows } = await pool.query(
    `UPDATE subscriptions
     SET status = $1, trakzee_status = 'Active', updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [restoredStatus, id]
  );
  return rows[0] ?? null;
}

// ─── Deactivate / reactivate on Trakzee ──────────────────────────────────────

async function setTrakzeeStatus(id, trakzee_status) {
  const { rows } = await pool.query(
    `UPDATE subscriptions
     SET trakzee_status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [trakzee_status, id]
  );
  return rows[0] ?? null;
}

// Suspend all vehicles whose expiry_date has passed and are not already suspended
async function suspendExpired() {
  const { rows } = await pool.query(`
    UPDATE subscriptions
    SET    status = 'Suspended', trakzee_status = 'Deactivated', updated_at = NOW()
    WHERE  expiry_date < CURRENT_DATE
      AND  status != 'Suspended'
    RETURNING id, plate_number, expiry_date
  `);
  return rows;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getAllVehicles,
  getVehicleById,
  getRemovedVehicles,
  restoreVehicle,
  searchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  setTrakzeeStatus,
  suspendExpired,
};
