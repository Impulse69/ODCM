const pool = require('../Config/db');
const {
  getAllVehicles,
  getVehicleById,
  getRemovedVehicles,
  restoreVehicle,
  searchVehicles,
  updateVehicle,
  deleteVehicle,
  setTrakzeeStatus,
  suspendExpired,
  findVehicleByPlateOrImei,
} = require('../Models/Vehicle');
const { getAllPlans } = require('../Models/Subscription');

const { recordAuditLog } = require('../Models/AuditLog');

async function consumeInventoryItem(client, { inventory_id, installed_by, client_name, vehicle_number, location }) {
  const { rows: itemRows } = await client.query(
    'SELECT * FROM inventory WHERE id = $1 FOR UPDATE',
    [inventory_id]
  );
  if (!itemRows.length) {
    throw new Error('Selected inventory item was not found in current stock.');
  }

  const item = itemRows[0];
  const { rows: usageRows } = await client.query(
    `INSERT INTO inventory_usage (
      inventory_id, category, imei_number, type, installed_by, client_name, vehicle_number, location
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [inventory_id, item.category, item.imei_number, item.type, installed_by, client_name, vehicle_number, location]
  );

  await client.query('DELETE FROM inventory WHERE id = $1', [inventory_id]);
  return { item, usage: usageRows[0] };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateId() {
  return `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ─── GET /api/vehicles ────────────────────────────────────────────────────────
// Optional query params: ?status=Active&plan=Premium&trakzee_status=Deactivated
async function getVehicles(req, res) {
  try {
    const { status, plan, trakzee_status, q } = req.query;
    let data;
    if (q) {
      data = await searchVehicles(q);
    } else {
      data = await getAllVehicles({ status, plan, trakzee_status });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/vehicles/:id ────────────────────────────────────────────────────
async function getVehicle(req, res) {
  try {
    const vehicle = await getVehicleById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/vehicles ───────────────────────────────────────────────────────
async function addVehicle(req, res) {
  try {
    const {
      plate_number, imei, plan,
      expiry_date, installation_date,
      status, trakzee_status,
      individual_customer_id, company_id,
      inventory_id, sim_inventory_id, owner_name, installation_location,
      sim_imei,
      sim_number,
    } = req.body;

    if (!plate_number || !imei || !plan || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: 'plate_number, imei, plan, and expiry_date are required.',
      });
    }
    if ((!individual_customer_id && !company_id) || (individual_customer_id && company_id)) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one of individual_customer_id or company_id must be provided.',
      });
    }

    // ─── Duplicate Check ───
    const existing = await findVehicleByPlateOrImei(plate_number, imei);
    if (existing) {
      if (existing.status === 'Removed') {
        return res.status(409).json({
          success: false,
          message: `Vehicle with plate ${plate_number} or IMEI ${imei} was previously removed. Please restore it from the Removed Vehicles list instead of re-registering.`,
        });
      }
      const conflictField = existing.plate_number === plate_number ? 'Plate Number' : 'IMEI';
      return res.status(409).json({
        success: false,
        message: `A vehicle with this ${conflictField} is already registered to ${existing.customer_name}.`,
      });
    }

    const plans = await getAllPlans();
    const matchedPlan = plans.find(p => p.name === plan);
    if (!matchedPlan) {
      return res.status(400).json({ success: false, message: `Unknown plan "${plan}".` });
    }
    const monthly_amount = parseFloat(matchedPlan.price);
    const id = generateId();
    const installerName = req.user?.name ?? req.user?.email ?? 'System';
    const clientName = String(owner_name ?? '').trim();
    const location = String(installation_location ?? '').trim();

    // inventory_id is optional — if provided we'll consume that stock item,
    // otherwise the caller can supply an IMEI manually (no stock consumption).
    if (!clientName || !location) {
      return res.status(400).json({ success: false, message: 'Owner name and installation location are required.' });
    }
    if (sim_inventory_id && Number(sim_inventory_id) === Number(inventory_id)) {
      return res.status(400).json({ success: false, message: 'Tracker IMEI and SIM IMEI must be different stock items.' });
    }

    const client = await pool.connect();
    let vehicle;
    try {
      await client.query('BEGIN');
        let simImei = sim_imei ?? null;
        let trackerImeiFromStock = null;
        if (inventory_id) {
          const trackerResult = await consumeInventoryItem(client, {
            inventory_id: Number(inventory_id),
            installed_by: installerName,
            client_name: clientName,
            vehicle_number: plate_number,
            location,
          });

          trackerImeiFromStock = trackerResult.item.imei_number;

          if (trackerImeiFromStock !== imei) {
            throw new Error('Selected tracker IMEI no longer matches the stock item. Please reselect it.');
          }
        }

      if (sim_inventory_id) {
        const simResult = await consumeInventoryItem(client, {
          inventory_id: Number(sim_inventory_id),
          installed_by: installerName,
          client_name: clientName,
          vehicle_number: plate_number,
          location,
        });
        simImei = simResult.item.imei_number;
      }

      const { rows } = await client.query(
        `INSERT INTO subscriptions
           (id, plate_number, imei, sim_imei, plan, monthly_amount, expiry_date,
            installation_date, installation_location, sim_number, status, trakzee_status,
            individual_customer_id, company_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          id,
          plate_number,
          imei,
          simImei,
          plan,
          monthly_amount,
          expiry_date,
          installation_date ?? null,
          location,
          sim_number ?? null,
          status ?? 'Active',
          trakzee_status ?? 'Active',
          individual_customer_id ?? null,
          company_id ?? null,
        ]
      );
      vehicle = rows[0];
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json({ success: true, data: vehicle });

    // Background audit log
    recordAuditLog({
      actorUserId: req.user?.id,
      actorName: req.user?.name || req.user?.email || 'System',
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'CREATE',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      section: 'Vehicles',
      title: `Registered Vehicle: ${plate_number}`,
      afterData: vehicle,
    }).catch(err => console.error('Audit Log Error:', err));

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A vehicle with this IMEI already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PATCH /api/vehicles/:id ──────────────────────────────────────────────────
async function editVehicle(req, res) {
  try {
    const userId = req.params.id;
    const updateBody = { ...req.body };

    const before = await getVehicleById(userId);
    if (!before) return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    // When expiry_date is extended past the reminder window, reset SMS so new
    // reminders fire correctly for the renewed subscription cycle.
    if (req.body.expiry_date) {
      const newExpiry = new Date(req.body.expiry_date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((newExpiry - today) / 86400000);
      if (daysLeft > 7) {
        updateBody.sms_status    = null;
        updateBody.sms_sent_at   = null;
        updateBody.last_sms_type = null;
      }
    }

    // Map frontend keys to backend keys if necessary
    const mappedUpdates = {};
    if (req.body.plate_number !== undefined) mappedUpdates.plate_number = req.body.plate_number;
    if (req.body.imei !== undefined) mappedUpdates.imei = req.body.imei;
    if (req.body.sim_imei !== undefined) mappedUpdates.sim_imei = req.body.sim_imei;
    if (req.body.plan !== undefined) mappedUpdates.plan = req.body.plan;
    if (req.body.expiry_date !== undefined) mappedUpdates.expiry_date = req.body.expiry_date;
    if (req.body.installation_date !== undefined) mappedUpdates.installation_date = req.body.installation_date;
    if (req.body.installation_location !== undefined) mappedUpdates.installation_location = req.body.installation_location;
    if (req.body.sim_number !== undefined) mappedUpdates.sim_number = req.body.sim_number;
    if (req.body.status !== undefined) mappedUpdates.status = req.body.status;
    if (req.body.trakzee_status !== undefined) mappedUpdates.trakzee_status = req.body.trakzee_status;
    if (req.body.individual_customer_id !== undefined) mappedUpdates.individual_customer_id = req.body.individual_customer_id;
    if (req.body.company_id !== undefined) mappedUpdates.company_id = req.body.company_id;
    
    // Also merge existing updateBody (sms_status etc)
    Object.assign(mappedUpdates, updateBody);

    const updated = await updateVehicle(userId, mappedUpdates);
    
    // Record Audit Log
    recordAuditLog({
      actorUserId: req.user?.id,
      actorName: req.user?.name || req.user?.email || 'System',
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'UPDATE',
      entityType: 'Vehicle',
      entityId: userId,
      section: 'Vehicles',
      title: `Updated Vehicle: ${updated?.plate_number || before.plate_number}`,
      beforeData: before,
      afterData: updated,
    }).catch(err => console.error('Audit Log Error:', err));

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── DELETE /api/vehicles/:id  (soft-delete → status = 'Removed') ─────────────
async function removeVehicle(req, res) {
  try {
    const vehicle = await getVehicleById(req.params.id);
    await deleteVehicle(req.params.id);

    if (vehicle) {
      await recordAuditLog({
        actorUserId: req.user?.id,
        actorName: req.user?.name || req.user?.email || 'System',
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: 'DELETE',
        entityType: 'Vehicle',
        entityId: req.params.id,
        section: 'Vehicles',
        title: `Deleted Vehicle: ${vehicle.plate_number}`,
        beforeData: vehicle,
      });
    }

    res.json({ success: true, message: 'Vehicle removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/vehicles/removed ────────────────────────────────────────────────
async function getRemoved(req, res) {
  try {
    const data = await getRemovedVehicles();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PATCH /api/vehicles/:id/restore ─────────────────────────────────────────
async function restoreVehicleHandler(req, res) {
  try {
    const updated = await restoreVehicle(req.params.id);
    if (!updated) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PATCH /api/vehicles/:id/trakzee ─────────────────────────────────────────
// Body: { trakzee_status: "Active" | "Deactivated" }
async function updateTrakzee(req, res) {
  try {
    const { trakzee_status } = req.body;
    if (!['Active', 'Deactivated'].includes(trakzee_status)) {
      return res.status(400).json({ success: false, message: 'trakzee_status must be "Active" or "Deactivated".' });
    }
    const updated = await setTrakzeeStatus(req.params.id, trakzee_status);
    if (!updated) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/vehicles/suspend-expired ──────────────────────────────────────
// Bulk-suspend all overdue vehicles
async function bulkSuspendExpired(req, res) {
  try {
    const suspended = await suspendExpired();
    res.json({ success: true, count: suspended.length, data: suspended });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getVehicles,
  getVehicle,
  addVehicle,
  editVehicle,
  removeVehicle,
  getRemoved,
  restoreVehicleHandler,
  updateTrakzee,
  bulkSuspendExpired,
};
