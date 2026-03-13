const express = require('express');
const router  = express.Router();
const { bulkImport } = require('../Controllers/BulkImportController');

router.post('/', bulkImport); // POST /api/bulk-import

module.exports = router;
