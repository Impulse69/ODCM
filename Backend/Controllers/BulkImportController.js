const pool   = require('../Config/db');
const crypto = require('crypto');

const { getAllPlans } = require('../Models/Subscription');

function generateId(prefix) {
  // 6 hex chars = 16^6 = 16 million combinations — essentially collision-proof for batch imports
  return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Normalizes phone numbers by removing spaces, dashes, parentheses and the plus sign.
 * This ensures "024 123 4567" matches "0241234567".
 */
function normalizePhone(phone) {
  if (!phone) return '';
  // Strip everything except digits, then take last 9 digits (handles 054..., 23354..., 54... cases)
  const digits = phone.toString().replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

const isScientific = (val) => /^[0-9.]+[eE]\+[0-9]+$/.test(String(val));

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
 *   1. Look up or create the customer (individual or company) by normalized phone number
 *   2. Create the vehicle (subscriptions row), skip if IMEI already exists
 *
 * Returns: { success, imported, skipped, errors }
 */
async function bulkImport(req, res) {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'rows array is required and must not be empty.' });
  }

  // Build plan name → price map from DB (case-insensitive keys)
  const dbPlans = await getAllPlans();
  const PLAN_AMOUNTS = {};
  for (const p of dbPlans) {
    const name = p.name.trim().toLowerCase();
    PLAN_AMOUNTS[name] = { originalName: p.name, price: parseFloat(p.price) };
  }

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
      
      if (isScientific(imei) || isScientific(phone) || isScientific(plateNumber)) {
        errors.push({ row: rowNum, message: 'Scientific notation detected in Phone/IMEI/Plate. Please format your Excel columns as Text.' });
        continue;
      }

      const cleanPlan = (plan || "").toString().trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
      const planKey = cleanPlan.toLowerCase();
      
      if (!PLAN_AMOUNTS[planKey]) {
        errors.push({ row: rowNum, message: `Unknown plan "${cleanPlan}" — available: ${Object.values(PLAN_AMOUNTS).map(p => p.originalName).join(', ')}` });
        continue;
      }

      const normalizedPhone = normalizePhone(phone.toString().trim());

      try {
        await client.query('BEGIN');

        let individualCustomerId = null;
        let companyId            = null;

        // ── 1. Determine Customer ID (Cross-table check) ─────────────────────
        // First check preferred table
        const prefTable = customerType === 'individual' ? 'individual_customers' : 'companies';
        const prefCol   = customerType === 'individual' ? 'phone' : 'contact_phone';
        
        let existing = await client.query(
          `SELECT id FROM ${prefTable} WHERE RIGHT(regexp_replace(${prefCol}, '\\D', '', 'g'), 9) = $1 LIMIT 1`,
          [normalizedPhone]
        );

        if (existing.rows.length > 0) {
          if (customerType === 'individual') individualCustomerId = existing.rows[0].id;
          else companyId = existing.rows[0].id;
        } else {
          // Check the OTHER table (maybe they are registered as the other type?)
          const otherTable = customerType === 'individual' ? 'companies' : 'individual_customers';
          const otherCol   = customerType === 'individual' ? 'contact_phone' : 'phone';
          
          let crossMatch = await client.query(
            `SELECT id FROM ${otherTable} WHERE RIGHT(regexp_replace(${otherCol}, '\\D', '', 'g'), 9) = $1 LIMIT 1`,
            [normalizedPhone]
          );

          if (crossMatch.rows.length > 0) {
            // Found them, but they are the "wrong" type. Link them anyway rather than duplicate.
            if (customerType === 'individual') companyId = crossMatch.rows[0].id;
            else individualCustomerId = crossMatch.rows[0].id;
          } else {
            // New customer
            if (customerType === 'individual') {
              const newId = generateId('CUST');
              await client.query('INSERT INTO individual_customers (id, name, phone) VALUES ($1, $2, $3)', [newId, customerName, phone]);
              individualCustomerId = newId;
            } else {
              const newId = generateId('CO');
              await client.query('INSERT INTO companies (id, company_name, contact_phone) VALUES ($1, $2, $3)', [newId, customerName, phone]);
              companyId = newId;
            }
          }
        }

        // ── 2. Check for Duplicate Vehicle (Plate or IMEI) ────────────────────
        const vehicleCheck = await client.query(
          "SELECT imei, plate_number FROM subscriptions WHERE imei = $1 OR plate_number = $2 LIMIT 1",
          [imei, plateNumber]
        );
        if (vehicleCheck.rows.length > 0) {
          const v = vehicleCheck.rows[0];
          const reason = v.imei === imei ? `IMEI ${imei} already registered` : `Plate ${plateNumber} already registered`;
          skipped.push({ row: rowNum, imei, plateNumber, reason });
          await client.query('ROLLBACK');
          continue;
        }

        const vehicleId      = generateId('SUB');
        const planData       = PLAN_AMOUNTS[planKey];
        const monthly_amount = planData.price;
        const finalPlanName  = planData.originalName;

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
            finalPlanName,
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

/**
 * POST /api/bulk-import/validate
 * 
 * Checks rows for customer existence and vehicle duplicates without inserting anything.
 */
async function bulkValidate(req, res) {
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ success: false, message: 'rows array is required' });

  // Build plan name → price map from DB
  const dbPlans = await getAllPlans();
  const PLAN_AMOUNTS = {};
  for (const p of dbPlans) {
    const name = p.name.trim().toLowerCase();
    PLAN_AMOUNTS[name] = { originalName: p.name, price: parseFloat(p.price) };
  }

  const results = [];
  const seenPhones = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const { customerName, phone, customerType = 'individual', plateNumber, imei, plan } = row;

    let customerStatus = 'New';
    let vehicleStatus = 'Available';
    let duplicateReason = '';

    // Basic validation for required fields
    if (!phone || !imei || !plateNumber) {
      results.push({ rowNum, error: 'Target fields missing (phone/imei/plate)' });
      continue;
    }

    // Scientific notation check - if found, record error and skip row
    if (isScientific(imei) || isScientific(phone) || isScientific(plateNumber)) {
        results.push({ rowNum, customerName, vehicleStatus: 'Invalid Format', duplicateReason: 'Excel scientific notation detected. Format columns as Text.' });
        continue;
    }

    const normalizedPhone = normalizePhone(phone.toString().trim());
    
    // Check if we already "met" this customer earlier in this specific batch
    if (customerStatus === 'New' && seenPhones.has(normalizedPhone)) {
      customerStatus = 'Existing (Batch)';
    }

    try {
      // 1. Check Customer (if not already found in this batch)
      if (customerStatus === 'New') {
        const prefTable = customerType === 'individual' ? 'individual_customers' : 'companies';
        const prefCol   = customerType === 'individual' ? 'phone' : 'contact_phone';
        
        const existing = await pool.query(
          `SELECT id FROM ${prefTable} WHERE RIGHT(regexp_replace(${prefCol}, '\\D', '', 'g'), 9) = $1 LIMIT 1`,
          [normalizedPhone]
        );

        if (existing.rows.length > 0) {
          customerStatus = 'Existing';
        } else {
          const otherTable = customerType === 'individual' ? 'companies' : 'individual_customers';
          const otherCol   = customerType === 'individual' ? 'contact_phone' : 'phone';
          
          const crossMatch = await pool.query(
            `SELECT id FROM ${otherTable} WHERE RIGHT(regexp_replace(${otherCol}, '\\D', '', 'g'), 9) = $1 LIMIT 1`,
            [normalizedPhone]
          );
          if (crossMatch.rows.length > 0) customerStatus = 'Cross-Type';
        }
      }

      // Mark as seen for subsequent rows in this batch
      seenPhones.add(normalizedPhone);

      // 2. Check Vehicle
      if (vehicleStatus === 'Available') {
        const vehicleCheck = await pool.query(
          "SELECT imei, plate_number FROM subscriptions WHERE imei = $1 OR plate_number = $2 LIMIT 1",
          [imei, plateNumber]
        );
        if (vehicleCheck.rows.length > 0) {
          vehicleStatus = 'Duplicate';
          const v = vehicleCheck.rows[0];
          duplicateReason = v.imei === imei ? `IMEI ${imei} already registered` : `Plate ${plateNumber} already registered`;
        }
      }

      // 3. Check Plan
      const cleanPlan = (row.plan || "").toString().trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
      if (cleanPlan && !PLAN_AMOUNTS[cleanPlan.toLowerCase()]) {
        vehicleStatus = 'Invalid Plan';
        duplicateReason = `Unknown plan "${cleanPlan}"`;
      }

      results.push({
        rowNum,
        customerStatus,
        customerName,
        vehicleStatus,
        duplicateReason
      });
    } catch (err) {
      results.push({
        rowNum,
        error: err.message
      });
    }
  }

  res.json({ success: true, rows: results });
}

module.exports = { bulkImport, bulkValidate };
