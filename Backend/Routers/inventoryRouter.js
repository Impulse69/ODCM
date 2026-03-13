const express = require('express');
const router  = express.Router();
const {
	getCategories,
	addCategory,
	removeCategory,
	getInventory,
	addInventoryItem,
	editInventoryItem,
	removeInventoryItem,
	recordUsage,
	viewUsageHistory,
} = require('../Controllers/InventoryController');

// ─── Categories ────────────────────────────────────────────────────────────────
router.get   ('/categories',     getCategories);
router.post  ('/categories',     addCategory);
router.delete('/categories/:id', removeCategory);

// ─── Usage History ─────────────────────────────────────────────────────────────
router.get   ('/usage-history',  viewUsageHistory);
router.post  ('/use',            recordUsage);

// ─── Inventory Items ───────────────────────────────────────────────────────────
router.get   ('/',               getInventory);
router.post  ('/',               addInventoryItem);
router.patch ('/:id',            editInventoryItem);
router.delete('/:id',            removeInventoryItem);

module.exports = router;
