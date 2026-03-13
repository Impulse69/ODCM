const pool   = require('../Config/db');
const crypto = require('crypto');

const { getAllPlans } = require('../Models/Subscription');

function generateId(prefix) {
  // 6 hex chars = 16^6 = 16 million combinations — essentially collision-proof for batch imports
  return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * POST /api/bulk-import
 *
 * Expects JSON body: { rows: BulkRow[] }
 *
 * BulkRow shape:
 *   customerName  string  – individual name OR company name
 *   phone         string
 *   customerType  "individual" | "company"
 *   plateNumber   string
 *   imei          string
 *   plan          "Basic" | "Standard" | "Premium"
 *   installationDate  string (YYYY-MM-DD) – optional
 *   expiryDate    string (YYYY-MM-DD)
 *
 * Strategy (per row, inside a transaction):
 *   1. Look up or create the customer (individual or company) by phone number
 *   2. Create the vehicle (subscriptions row), skip if IMEI already exists
 *
 * Returns: { success, imported, skipped, errors }
 */
async function bulkImport(req, res) {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'rows array is required and must not be empty.' });
  }

  // Build plan name → price map from DB
  const dbPlans = await getAllPlans();
  const PLAN_AMOUNTS = {};
  for (const p of dbPlans) PLAN_AMOUNTS[p.name] = parseFloat(p.price);

  let imported           = 0;
  let importedIndividuals = 0;
  let importedCompanies   = 0;
  const skipped = [];
  const errors  = [];

  const client = await pool.connect();
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const {
        customerName,
        phone,
        customerType = 'individual',
        plateNumber,
        imei,
        plan,
        installationDate,
        expiryDate,
      } = row;

      // ── Basic validation ──────────────────────────────────────────────────
      if (!customerName || !phone || !plateNumber || !imei || !plan || !expiryDate) {
        errors.push({ row: rowNum, message: 'Missing required field(s): customerName, phone, plateNumber, imei, plan, expiryDate' });
        continue;
      }
      if (!['individual', 'company'].includes(customerType)) {
        errors.push({ row: rowNum, message: `Invalid customerType "${customerType}" — must be "individual" or "company"` });
        continue;
      }
      if (!PLAN_AMOUNTS[plan]) {
        errors.push({ row: rowNum, message: `Unknown plan "${plan}" — must be Basic, Standard, or Premium` });
        continue;
      }

      try {
        await client.query('BEGIN');

        let individualCustomerId = null;
        let companyId            = null;

        if (customerType === 'individual') {
          // Find by phone, or create
          const existing = await client.query(
            'SELECT id FROM individual_customers WHERE phone = $1 LIMIT 1',
            [phone]
          );
          if (existing.rows.length > 0) {
            individualCustomerId = existing.rows[0].id;
          } else {
            const newId = generateId('CUST');
            await client.query(
              'INSERT INTO individual_customers (id, name, phone) VALUES ($1, $2, $3)',
              [newId, customerName, phone]
            );
            individualCustomerId = newId;
          }
        } else {
          // Find by phone (contact_phone), or create
          const existing = await client.query(
            'SELECT id FROM companies WHERE contact_phone = $1 LIMIT 1',
            [phone]
          );
          if (existing.rows.length > 0) {
            companyId = existing.rows[0].id;
          } else {
            const newId = generateId('CO');
            await client.query(
              'INSERT INTO companies (id, company_name, contact_phone) VALUES ($1, $2, $3)',
              [newId, customerName, phone]
            );
            companyId = newId;
          }
        }

        // Check if IMEI already exists
        const imeiCheck = await client.query(
          "SELECT id FROM subscriptions WHERE imei = $1 LIMIT 1",
          [imei]
        );
        if (imeiCheck.rows.length > 0) {
          skipped.push({ row: rowNum, imei, reason: 'IMEI already registered' });
          await client.query('ROLLBACK');
          continue;
        }

        const vehicleId      = generateId('SUB');
        const monthly_amount = PLAN_AMOUNTS[plan];

        await client.query(
          `INSERT INTO subscriptions
             (id, plate_number, imei, plan, monthly_amount, expiry_date,
              installation_date, status, trakzee_status,
              individual_customer_id, company_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'Active','Active',$8,$9)`,
          [
            vehicleId,
            plateNumber,
            imei,
            plan,
            monthly_amount,
            expiryDate,
            installationDate || null,
            individualCustomerId,
            companyId,
          ]
        );

        await client.query('COMMIT');
        imported++;
        if (individualCustomerId) importedIndividuals++;
        else importedCompanies++;
      } catch (rowErr) {
        await client.query('ROLLBACK');
        errors.push({ row: rowNum, message: rowErr.message });
      }
    }
  } finally {
    client.release();
  }

  res.json({
    success: true,
    imported,
    importedIndividuals,
    importedCompanies,
    skipped: skipped.length,
    skippedDetails: skipped,
    errors: errors.length,
    errorDetails: errors,
  });
}

module.exports = { bulkImport };
