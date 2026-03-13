const {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanSubscriberCounts,
} = require('../Models/Subscription');

// ─── Helper ───────────────────────────────────────────────────────────────────

function generatePlanId(name) {
  return `plan_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
}

// ─── GET /api/plans ───────────────────────────────────────────────────────────

async function getPlans(req, res) {
  try {
    const [plans, counts] = await Promise.all([getAllPlans(), getPlanSubscriberCounts()]);
    const data = plans.map((p) => ({ ...p, subscriber_count: counts[p.name] ?? 0 }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/plans/:id ───────────────────────────────────────────────────────

async function getPlan(req, res) {
  try {
    const plan = await getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── POST /api/plans ──────────────────────────────────────────────────────────

async function addPlan(req, res) {
  try {
    const { name, price, description, features, popular, is_active } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'name and price are required.' });
    }
    const id = generatePlanId(name);
    const plan = await createPlan({ id, name, price, description, features, popular, is_active });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A plan with this name already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PATCH /api/plans/:id ─────────────────────────────────────────────────────

async function editPlan(req, res) {
  try {
    const { name, price, description, features, popular, is_active } = req.body;
    const updated = await updatePlan(req.params.id, { name, price, description, features, popular, is_active });
    if (!updated) return res.status(404).json({ success: false, message: 'Plan not found.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A plan with this name already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── DELETE /api/plans/:id ────────────────────────────────────────────────────

async function removePlan(req, res) {
  try {
    await deletePlan(req.params.id);
    res.json({ success: true, message: 'Plan deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getPlans, getPlan, addPlan, editPlan, removePlan };
