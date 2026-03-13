const express = require('express');
const router  = express.Router();
const {
  getConfig,
  saveConfig,
  testSms,
  testEmail,
  sendSmsForVehicle,
  runSmsJob,
  getSmsStats,
} = require('../Controllers/SmsController');

router.get ('/config',            getConfig);         // GET  /api/sms/config
router.post('/config',            saveConfig);        // POST /api/sms/config
router.post('/test',              testSms);           // POST /api/sms/test
router.post('/test-email',        testEmail);         // POST /api/sms/test-email
router.post('/run-job',           runSmsJob);         // POST /api/sms/run-job
router.get ('/stats',             getSmsStats);       // GET  /api/sms/stats
router.post('/send/:vehicleId',   sendSmsForVehicle); // POST /api/sms/send/:vehicleId

module.exports = router;
