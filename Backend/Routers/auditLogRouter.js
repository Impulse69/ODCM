const express = require('express');
const router = express.Router();
const { listAuditLogs } = require('../Controllers/AuditLogController');

router.get('/', listAuditLogs);

module.exports = router;