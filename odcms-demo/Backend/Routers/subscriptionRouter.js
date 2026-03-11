const express = require('express');
const router  = express.Router();
const { getPlans, getPlan, addPlan, editPlan, removePlan } = require('../Controllers/SubscriptionController');

router.get   ('/',     getPlans);    // GET    /api/plans
router.get   ('/:id',  getPlan);     // GET    /api/plans/:id
router.post  ('/',     addPlan);     // POST   /api/plans
router.patch ('/:id',  editPlan);    // PATCH  /api/plans/:id
router.delete('/:id',  removePlan);  // DELETE /api/plans/:id

module.exports = router;
