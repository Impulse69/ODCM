const {
  getAllPayments,
  getPaymentById,
  createPayment,
  deletePayment,
  getMonthlyRevenue,
} = require('../Models/PaymentHistory');

// ─── GET /api/payments ────────────────────────────────────────────────────────
// Optional query params: ?vehicle_id=&owner_type=&limit=
async function getPayments(req, res) {
  try {
    const { vehicle_id, owner_type, limit } = req.query;
    const data = await getAllPayments({
      vehicle_id,
      owner_type,
      limit: limit ? parseInt(limit) : 200,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/payments/:id ────────────────────────────────────────────────────
async function getPayment(req, res) {
  try {
    const record = await getPaymentById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/payments ───────────────────────────────────────────────────────
// Body: { id, vehicle_id, vehicle_plate, owner_name, owner_type, plan_name, year, months, amount_ghs }
async function addPayment(req, res) {
  try {
    const { id, vehicle_id, vehicle_plate, owner_name, owner_type, plan_name, year, months, amount_ghs, paid_at } = req.body;

    if (!id || !vehicle_plate || !owner_name || !owner_type || !year || !months || !amount_ghs) {
      return res.status(400).json({
        success: false,
        message: 'id, vehicle_plate, owner_name, owner_type, year, months, and amount_ghs are required.',
      });
    }
    if (!['individual', 'company'].includes(owner_type)) {
      return res.status(400).json({ success: false, message: 'owner_type must be "individual" or "company".' });
    }

    const record = await createPayment({ id, vehicle_id, vehicle_plate, owner_name, owner_type, plan_name, year, months, amount_ghs, paid_at });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.code === '23505') {
      // duplicate id — idempotent: just return success
      return res.json({ success: true, message: 'Payment already recorded.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── DELETE /api/payments/:id ─────────────────────────────────────────────────
async function removePayment(req, res) {
  try {
    await deletePayment(req.params.id);
    res.json({ success: true, message: 'Payment record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// ─── GET /api/payments/revenue ─────────────────────────────────────────────
// Optional query param: ?months=12
async function getRevenueSummary(req, res) {
  try {
    const months = parseInt(req.query.months) || 12;
    const data = await getMonthlyRevenue(months);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getPayments,
  getPayment,
  addPayment,
  removePayment,
  getRevenueSummary,
};
