const pool   = require('../Config/db');
const crypto = require('crypto');

const { getAllPlans } = require('../Models/Subscription');

function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

const isScientific = (val) => /^[0-9.]+[eE]\+[0-9]+$/.test(String(val));

/** Strip invisible chars + trim whitespace from any value */
function clean(val) {
  if (val == null) return '';
  return val.toString().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
}

/**
 * POST /api/bulk-import
 */
async function bulkImport(req, res) {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'rows array is required and must not be empty.' });
  }

  const dbPlans = await getAllPlans();
  const PLAN_AMOUNTS = {};
  for (const p of dbPlans) {
    PLAN_AMOUNTS[p.name.trim().toLowerCase()] = { originalName: p.name, price: parseFloat(p.price) };
  }

  let imported = 0;
  let importedIndividuals = 0;
  let importedCompanies = 0;
  const skipped = [];
  const errors  = [];

  const client = await pool.connect();
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Clean all values
      const customerName    = clean(row.customerName);
      const phone           = clean(row.phone);
      const customerType    = clean(row.customerType) || 'individual';
      const plateNumber     = clean(row.plateNumber);
      const imei            = clean(row.imei);
      const plan            = clean(row.plan);
      const installationDate = clean(row.installationDate);
      const expiryDate      = clean(row.expiryDate);

      if (!customerName || !phone || !plateNumber || !imei || !plan || !expiryDate) {
        errors.push({ row: rowNum, message: 'Missing required field(s): customerName, phone, plateNumber, imei, plan, expiryDate' });
        continue;
      }
      if (!['individual', 'company'].includes(customerType)) {
        errors.push({ row: rowNum, message: `Invalid customerType "${customerType}"` });
        continue;
      }
      if (isScientific(imei) || isScientific(phone) || isScientific(plateNumber)) {
        errors.push({ row: rowNum, message: 'Scientific notation detected. Format Excel columns as Text.' });
        continue;
      }

      const planKey = plan.toLowerCase();
      if (!PLAN_AMOUNTS[planKey]) {
        errors.push({ row: rowNum, message: `Unknown plan "${plan}" — available: ${Object.values(PLAN_AMOUNTS).map(p => p.originalName).join(', ')}` });
        continue;
      }

      const normalizedPhone = normalizePhone(phone);

      try {
        await client.query('BEGIN');

        let individualCustomerId = null;
        let companyId = null;

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
          const otherTable = customerType === 'individual' ? 'companies' : 'individual_customers';
          const otherCol   = customerType === 'individual' ? 'contact_phone' : 'phone';

          let crossMatch = await client.query(
            `SELECT id FROM ${otherTable} WHERE RIGHT(regexp_replace(${otherCol}, '\\D', '', 'g'), 9) = $1 LIMIT 1`,
            [normalizedPhone]
          );

          if (crossMatch.rows.length > 0) {
            if (customerType === 'individual') companyId = crossMatch.rows[0].id;
            else individualCustomerId = crossMatch.rows[0].id;
          } else {
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

        // Check for duplicate vehicle (IMEI or plate)
        const vehicleCheck = await client.query(
          "SELECT imei, plate_number FROM subscriptions WHERE TRIM(imei) = $1 OR TRIM(plate_number) = $2 LIMIT 1",
          [imei, plateNumber]
        );
        if (vehicleCheck.rows.length > 0) {
          const v = vehicleCheck.rows[0];
          const reason = v.imei.trim() === imei ? `IMEI ${imei} already registered` : `Plate ${plateNumber} already registered`;
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
          [vehicleId, plateNumber, imei, finalPlanName, monthly_amount, expiryDate, installationDate || null, individualCustomerId, companyId]
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
 */
async function bulkValidate(req, res) {
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ success: false, message: 'rows array is required' });

  const dbPlans = await getAllPlans();
  const PLAN_AMOUNTS = {};
  for (const p of dbPlans) {
    PLAN_AMOUNTS[p.name.trim().toLowerCase()] = { originalName: p.name, price: parseFloat(p.price) };
  }

  const results = [];
  const seenPhones = new Map();
  const seenIMEIs  = new Map();
  const seenPlates = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Use _rowNum from frontend if provided (matches CSV row number), otherwise fallback
    const rowNum = row._rowNum || (i + 1);

    // Clean all values
    const customerName = clean(row.customerName);
    const phone        = clean(row.phone);
    const customerType = clean(row.customerType) || 'individual';
    const plateNumber  = clean(row.plateNumber);
    const imei         = clean(row.imei);
    const plan         = clean(row.plan);
    const expiryDate   = clean(row.expiryDate || row.expiry_date);

    let customerStatus = 'New';
    let vehicleStatus = 'Available';
    let duplicateReason = '';
    let matchedCustomerName = '';
    let valid = true;

    // Basic validation
    const missing = [];
    if (!customerName) missing.push('customerName');
    if (!phone)        missing.push('phone');
    if (!plateNumber)  missing.push('plateNumber');
    if (!imei)         missing.push('imei');
    if (!plan)         missing.push('plan');
    if (!expiryDate)   missing.push('expiryDate');
    if (missing.length > 0) {
      results.push({ rowNum, customerName, valid: false, error: `Missing: ${missing.join(', ')}` });
      continue;
    }

    if (isScientific(imei) || isScientific(phone) || isScientific(plateNumber)) {
      results.push({ rowNum, customerName, valid: false, vehicleStatus: 'Invalid Format', duplicateReason: 'Excel scientific notation detected. Format columns as Text.' });
      continue;
    }

    const normalizedPhone = normalizePhone(phone);

    // Check if same customer already seen in this batch
    if (seenPhones.has(normalizedPhone)) {
      const prev = seenPhones.get(normalizedPhone);
      customerStatus = 'Existing (Batch)';
      matchedCustomerName = prev.name;
    }

    try {
      // 1. Check Customer in DB (only if not already found in batch)
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

      if (!seenPhones.has(normalizedPhone)) {
        seenPhones.set(normalizedPhone, { name: customerName, rowNum });
      }

      // 2. Check Vehicle — batch duplicates first, then DB
      if (seenIMEIs.has(imei)) {
        vehicleStatus = 'Duplicate';
        duplicateReason = `IMEI ${imei} same as row ${seenIMEIs.get(imei)}`;
        valid = false;
      }
      if (vehicleStatus === 'Available' && seenPlates.has(plateNumber)) {
        vehicleStatus = 'Duplicate';
        duplicateReason = `Plate ${plateNumber} same as row ${seenPlates.get(plateNumber)}`;
        valid = false;
      }
      if (vehicleStatus === 'Available') {
        const vehicleCheck = await pool.query(
          "SELECT imei, plate_number FROM subscriptions WHERE TRIM(imei) = $1 OR TRIM(plate_number) = $2 LIMIT 1",
          [imei, plateNumber]
        );
        if (vehicleCheck.rows.length > 0) {
          vehicleStatus = 'Duplicate';
          const v = vehicleCheck.rows[0];
          duplicateReason = v.imei.trim() === imei ? `IMEI ${imei} already in system` : `Plate ${plateNumber} already in system`;
          valid = false;
        }
      }
      seenIMEIs.set(imei, rowNum);
      seenPlates.set(plateNumber, rowNum);

      // 3. Check Plan
      const planKey = plan.toLowerCase();
      if (!PLAN_AMOUNTS[planKey]) {
        vehicleStatus = 'Invalid Plan';
        duplicateReason = `Unknown plan "${plan}"`;
        valid = false;
      }

      results.push({
        rowNum,
        customerStatus,
        customerName,
        matchedCustomerName,
        vehicleStatus,
        duplicateReason,
        valid
      });
    } catch (err) {
      results.push({ rowNum, valid: false, error: err.message });
    }
  }

  res.json({ success: true, rows: results });
}

module.exports = { bulkImport, bulkValidate };
