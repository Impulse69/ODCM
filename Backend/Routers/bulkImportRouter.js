const express = require('express');
const router  = express.Router();
const { bulkImport, bulkValidate } = require('../Controllers/BulkImportController');

router.post('/', bulkImport);          // POST /api/bulk-import
router.post('/validate', bulkValidate); // POST /api/bulk-import/validate

module.exports = router;
