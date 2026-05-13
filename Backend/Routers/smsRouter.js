const express = require('express');
const router  = express.Router();
const {
  getConfig,
  saveConfig,
  testSms,
  testLowStockSms,
  testEmail,
  sendSmsForVehicle,
  sendExpiredSmsToRemovedVehicles,
  runSmsJob,
  getSmsStats,
  getRecentSmsLogs,
} = require('../Controllers/SmsController');

router.get ('/config',            getConfig);         // GET  /api/sms/config
router.post('/config',            saveConfig);        // POST /api/sms/config
router.post('/test',              testSms);           // POST /api/sms/test
router.post('/test-low-stock',    testLowStockSms);   // POST /api/sms/test-low-stock
router.post('/test-email',        testEmail);         // POST /api/sms/test-email
router.post('/run-job',           runSmsJob);         // POST /api/sms/run-job
router.get ('/stats',             getSmsStats);       // GET  /api/sms/stats
router.get ('/recent-logs',       getRecentSmsLogs);  // GET  /api/sms/recent-logs
router.post('/send/:vehicleId',   sendSmsForVehicle); // POST /api/sms/send/:vehicleId
router.post('/send-removed-expired', sendExpiredSmsToRemovedVehicles); // POST /api/sms/send-removed-expired

module.exports = router;
