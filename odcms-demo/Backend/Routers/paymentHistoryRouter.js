const express = require('express');
const router  = express.Router();
const {
  getPayments,
  getPayment,
  addPayment,
  removePayment,
  getRevenueSummary,
} = require('../Controllers/PaymentHistoryController');

router.get   ('/revenue', getRevenueSummary); // GET  /api/payments/revenue[?months=12]
router.get   ('/',    getPayments);           // GET  /api/payments[?vehicle_id=&owner_type=&limit=]
router.get   ('/:id', getPayment);            // GET  /api/payments/:id
router.post  ('/',    addPayment);    // POST /api/payments
router.delete('/:id', removePayment); // DELETE /api/payments/:id

module.exports = router;
