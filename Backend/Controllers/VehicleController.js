const {
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
} = require('../Models/Vehicle');
const { getAllPlans } = require('../Models/Subscription');

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

    const plans = await getAllPlans();
    const matchedPlan = plans.find(p => p.name === plan);
    if (!matchedPlan) {
      return res.status(400).json({ success: false, message: `Unknown plan "${plan}".` });
    }
    const monthly_amount = parseFloat(matchedPlan.price);
    const id = generateId();

    const vehicle = await createVehicle({
      id, plate_number, imei, plan, monthly_amount,
      expiry_date, installation_date,
      status: status ?? 'Active',
      trakzee_status: trakzee_status ?? 'Active',
      individual_customer_id: individual_customer_id ?? null,
      company_id: company_id ?? null,
    });

    res.status(201).json({ success: true, data: vehicle });
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
    const updateBody = { ...req.body };

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

    const updated = await updateVehicle(req.params.id, updateBody);
    if (!updated) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── DELETE /api/vehicles/:id  (soft-delete → status = 'Removed') ─────────────
async function removeVehicle(req, res) {
  try {
    await deleteVehicle(req.params.id);
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
