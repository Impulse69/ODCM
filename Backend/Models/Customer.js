// Find company by name only
async function findCompanyByName(company_name) {
  const { rows } = await pool.query('SELECT * FROM companies WHERE company_name = $1', [company_name]);
  return rows[0] ?? null;
}
// Find individual by name
async function findIndividualByName(name) {
  const { rows } = await pool.query('SELECT * FROM individual_customers WHERE name = $1', [name]);
  return rows[0] ?? null;
}
// Find individual by phone
async function findIndividualByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM individual_customers WHERE phone = $1', [phone]);
  return rows[0] ?? null;
}

// Find company by name or email
async function findCompanyByNameOrEmail(company_name, email) {
  const { rows } = await pool.query(
    'SELECT * FROM companies WHERE company_name = $1 OR (email IS NOT NULL AND email = $2)',
    [company_name, email]
  );
  return rows[0] ?? null;
}
const pool = require('../Config/db');

// ─── Create Tables ────────────────────────────────────────────────────────────

async function createTables() {
  // Create ENUM types safely (no IF NOT EXISTS for types in PostgreSQL)
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE subscription_status AS ENUM ('Active', 'Due Soon', 'Overdue', 'Suspended', 'Expired', 'Removed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE trakzee_status AS ENUM ('Active', 'Deactivated');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  // Add missing enum values to existing DBs (ALTER TYPE is idempotent with IF NOT EXISTS)
  await pool.query(`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'Expired'`);
  await pool.query(`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'Removed'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS individual_customers (
      id           VARCHAR(20)   PRIMARY KEY,            -- e.g. "CUST-001"
      name         VARCHAR(150)  NOT NULL,
      phone        VARCHAR(30)   NOT NULL,
      initials     VARCHAR(5)    GENERATED ALWAYS AS (
                     upper(
                       left(split_part(name, ' ', 1), 1) ||
                       left(split_part(name, ' ', 2), 1)
                     )
                   ) STORED,
      created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS companies (
      id                   VARCHAR(20)   PRIMARY KEY,    -- e.g. "CO-001"
      company_name         VARCHAR(200)  NOT NULL,
      billing_contact_name VARCHAR(150),
      contact_phone        VARCHAR(30),
      email                VARCHAR(150),
      address              TEXT,
      tax_id               VARCHAR(50),
      status               subscription_status NOT NULL DEFAULT 'Active',
      total_accounts       INTEGER       NOT NULL DEFAULT 0,
      created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id                    VARCHAR(20)         PRIMARY KEY,   -- e.g. "SUB-001"
      plate_number          VARCHAR(30)         NOT NULL,
      imei                  VARCHAR(20)         NOT NULL UNIQUE,
      plan                  VARCHAR(50)         NOT NULL,
      monthly_amount        NUMERIC(10, 2)      NOT NULL,
      expiry_date           DATE                NOT NULL,
      installation_date     DATE,
      status                subscription_status NOT NULL DEFAULT 'Active',
      trakzee_status        trakzee_status      NOT NULL DEFAULT 'Active',

      -- Owner: one of these two must be set (enforced by check constraint)
      individual_customer_id VARCHAR(20) REFERENCES individual_customers(id) ON DELETE CASCADE,
      company_id             VARCHAR(20) REFERENCES companies(id)             ON DELETE CASCADE,

      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT subscription_owner_check CHECK (
        (individual_customer_id IS NOT NULL AND company_id IS NULL) OR
        (individual_customer_id IS NULL     AND company_id IS NOT NULL)
      )
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_subscriptions_individual ON subscriptions(individual_customer_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_company    ON subscriptions(company_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry     ON subscriptions(expiry_date);
  `);

  // ── Individual extra columns (idempotent ALTERs) ─────────────────────────────
  await pool.query(`
    ALTER TABLE individual_customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150) DEFAULT NULL;
    ALTER TABLE individual_customers ADD COLUMN IF NOT EXISTS email          VARCHAR(150) DEFAULT NULL;
    ALTER TABLE individual_customers ADD COLUMN IF NOT EXISTS address        TEXT         DEFAULT NULL;
    ALTER TABLE individual_customers ADD COLUMN IF NOT EXISTS city           VARCHAR(100) DEFAULT NULL;
    ALTER TABLE individual_customers ADD COLUMN IF NOT EXISTS postal_code    VARCHAR(20)  DEFAULT NULL;
  `);

  // ── Company extra columns (idempotent ALTERs) ─────────────────────────────────
  await pool.query(`
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS city        VARCHAR(100) DEFAULT NULL;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)  DEFAULT NULL;
  `);

  // ── SMS columns (idempotent ALTERs) ──────────────────────────────────────────
  await pool.query(`
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sms_status    VARCHAR(20)  DEFAULT NULL;
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sms_sent_at   TIMESTAMPTZ  DEFAULT NULL;
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_sms_type VARCHAR(20)  DEFAULT NULL;
  `);

  // ── SMS configuration key-value store ────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_settings (
      key   VARCHAR(50) PRIMARY KEY,
      value TEXT        NOT NULL DEFAULT ''
    );
  `);

  console.log('Customer tables created (or already exist).');
}

// ─── Individual Customers ─────────────────────────────────────────────────────

async function getAllIndividuals() {
  const { rows } = await pool.query(`
    SELECT
      c.*,
      COUNT(s.id)::INT                    AS vehicle_count,
      COALESCE(SUM(
        CASE 
          WHEN s.expiry_date < CURRENT_DATE AND s.trakzee_status = 'Active' THEN 
            CEIL(
              EXTRACT(DAY FROM (NOW() - s.expiry_date)) / 30.0
            ) * s.monthly_amount
          ELSE 0 
        END
      ), 0)                               AS total_owed,
      MIN(
        CASE s.status
          WHEN 'Suspended' THEN 1
          WHEN 'Overdue'   THEN 2
          WHEN 'Due Soon'  THEN 3
          ELSE 4
        END
      )                                   AS worst_priority
    FROM individual_customers c
    LEFT JOIN subscriptions s ON s.individual_customer_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
  return rows;
}

async function getIndividualById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM individual_customers WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

async function createIndividual({ id, name, phone, contact_person, email, address, city, postal_code }) {
  const { rows } = await pool.query(
    `INSERT INTO individual_customers (id, name, phone, contact_person, email, address, city, postal_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, name, phone, contact_person ?? null, email ?? null, address ?? null, city ?? null, postal_code ?? null]
  );
  return rows[0];
}

async function updateIndividual(id, fields) {
  const allowed = ['name', 'phone', 'contact_person', 'email', 'address', 'city', 'postal_code'];
  const updates = [];
  const values  = [];
  let   idx     = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(fields[key]);
    }
  }
  if (!updates.length) return getIndividualById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE individual_customers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

async function deleteIndividual(id) {
  await pool.query('DELETE FROM individual_customers WHERE id = $1', [id]);
}

// ─── Companies ────────────────────────────────────────────────────────────────

async function getAllCompanies() {
  const { rows } = await pool.query(`
    SELECT
      c.*,
      COUNT(s.id)::INT                    AS vehicle_count,
      COALESCE(SUM(
        CASE 
          WHEN s.expiry_date < CURRENT_DATE AND s.trakzee_status = 'Active' THEN 
            CEIL(
              EXTRACT(DAY FROM (NOW() - s.expiry_date)) / 30.0
            ) * s.monthly_amount
          ELSE 0 
        END
      ), 0)                               AS total_owed,
      MIN(
        CASE s.status
          WHEN 'Suspended' THEN 1
          WHEN 'Overdue'   THEN 2
          WHEN 'Due Soon'  THEN 3
          ELSE 4
        END
      )                                   AS worst_priority
    FROM companies c
    LEFT JOIN subscriptions s ON s.company_id = c.id
    GROUP BY c.id
    ORDER BY c.company_name
  `);
  return rows;
}

async function getCompanyById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM companies WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

async function createCompany({ id, company_name, billing_contact_name, contact_phone, email, address, city, postal_code, tax_id, status, total_accounts }) {
  const { rows } = await pool.query(
    `INSERT INTO companies
       (id, company_name, billing_contact_name, contact_phone, email, address, city, postal_code, tax_id, status, total_accounts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, company_name, billing_contact_name ?? null, contact_phone ?? null,
     email ?? null, address ?? null, city ?? null, postal_code ?? null,
     tax_id ?? null, status ?? 'Active', total_accounts ?? 0]
  );
  return rows[0];
}

async function updateCompany(id, fields) {
  const allowed = ['company_name','billing_contact_name','contact_phone','email','address','city','postal_code','tax_id','status','total_accounts'];
  const updates = [];
  const values  = [];
  let   idx     = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(fields[key]);
    }
  }
  if (!updates.length) return getCompanyById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE companies SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

async function deleteCompany(id) {
  await pool.query('DELETE FROM companies WHERE id = $1', [id]);
}

// ─── Subscriptions (Vehicles) ─────────────────────────────────────────────────

async function getAllSubscriptions() {
  const { rows } = await pool.query(`
    SELECT s.*,
           c.name  AS individual_name,
           c.phone AS individual_phone,
           co.company_name,
           co.contact_phone AS company_phone
    FROM subscriptions s
    LEFT JOIN individual_customers c  ON c.id  = s.individual_customer_id
    LEFT JOIN companies            co ON co.id = s.company_id
    ORDER BY s.expiry_date
  `);
  return rows;
}

async function getSubscriptionsByIndividual(individualId) {
  const { rows } = await pool.query(
    `SELECT * FROM subscriptions WHERE individual_customer_id = $1 ORDER BY expiry_date`,
    [individualId]
  );
  return rows;
}

async function getSubscriptionsByCompany(companyId) {
  const { rows } = await pool.query(
    `SELECT * FROM subscriptions WHERE company_id = $1 ORDER BY expiry_date`,
    [companyId]
  );
  return rows;
}

async function createSubscription({
  id, plate_number, imei, plan, monthly_amount,
  expiry_date, installation_date, status, trakzee_status,
  individual_customer_id, company_id,
}) {
  const { rows } = await pool.query(
    `INSERT INTO subscriptions
       (id, plate_number, imei, plan, monthly_amount, expiry_date,
        installation_date, status, trakzee_status, individual_customer_id, company_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      id, plate_number, imei, plan, monthly_amount, expiry_date,
      installation_date ?? null,
      status ?? 'Active',
      trakzee_status ?? 'Active',
      individual_customer_id ?? null,
      company_id ?? null,
    ]
  );
  return rows[0];
}

async function updateSubscription(id, fields) {
  const allowed = [
    'plate_number','imei','plan','monthly_amount','expiry_date',
    'installation_date','status','trakzee_status',
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
  if (!updates.length) return (await pool.query('SELECT * FROM subscriptions WHERE id = $1', [id])).rows[0];

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

async function deleteSubscription(id) {
  await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
      findCompanyByName,
    findIndividualByName,
  createTables,

  // Individuals
  getAllIndividuals,
  getIndividualById,
  createIndividual,
  updateIndividual,
  deleteIndividual,

  // Companies
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,

  // Subscriptions
  getAllSubscriptions,
  getSubscriptionsByIndividual,
  getSubscriptionsByCompany,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  // Duplicate check helpers
  findIndividualByPhone,
  findCompanyByNameOrEmail,
};
