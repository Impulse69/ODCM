const {
	getAllCategories,
	createCategory,
	deleteCategory,
	getAllItems,
	getItemById,
	createItem,
	updateItem,
	deleteItem,
	useItem,
	getUsageHistory,
	getAllTypes,
	createType,
	deleteType,
} = require('../Models/Inventory');

// ─── Categories ────────────────────────────────────────────────────────────────

async function getCategories(req, res) {
	try {
		const data = await getAllCategories();
		res.json({ success: true, data });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

async function addCategory(req, res) {
	try {
		const { name } = req.body;
		if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
		const category = await createCategory(name);
		res.status(201).json({ success: true, data: category });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'Category already exists.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function removeCategory(req, res) {
	try {
		await deleteCategory(req.params.id);
		res.json({ success: true, message: 'Category deleted.' });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Types ─────────────────────────────────────────────────────────────────────

async function getTypes(req, res) {
	try {
		const data = await getAllTypes();
		res.json({ success: true, data });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

async function addType(req, res) {
	try {
		const { category_name, name } = req.body;
		if (!category_name || !name) return res.status(400).json({ success: false, message: 'Category name and type name are required.' });
		const type = await createType(category_name, name);
		res.status(201).json({ success: true, data: type });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'Type already exists.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function removeType(req, res) {
	try {
		await deleteType(req.params.id);
		res.json({ success: true, message: 'Type deleted.' });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Inventory Items ───────────────────────────────────────────────────────────

async function getInventory(req, res) {
	try {
		const data = await getAllItems();
		res.json({ success: true, data });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

async function getInventoryItem(req, res) {
	try {
		const item = await getItemById(req.params.id);
		if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
		res.json({ success: true, data: item });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

async function addInventoryItem(req, res) {
	try {
		const { category, imei_number, type, quantity } = req.body;
		if (!category || !imei_number || !type || quantity === undefined) {
			return res.status(400).json({ success: false, message: 'Missing required fields.' });
		}
		const item = await createItem({ category, imei_number, type, quantity });
		res.status(201).json({ success: true, data: item });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'IMEI already exists.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function editInventoryItem(req, res) {
	try {
		const updated = await updateItem(req.params.id, req.body);
		if (!updated) return res.status(404).json({ success: false, message: 'Item not found.' });
		res.json({ success: true, data: updated });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'IMEI already in use.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function removeInventoryItem(req, res) {
	try {
		await deleteItem(req.params.id);
		res.json({ success: true, message: 'Item deleted.' });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Use Item & Usage History ──────────────────────────────────────────────────

async function recordUsage(req, res) {
	try {
		const { inventory_id, installed_by, quantity_used } = req.body;
		if (!inventory_id || !installed_by || !quantity_used) {
			return res.status(400).json({ success: false, message: 'Missing required fields (inventory_id, installed_by, quantity_used).' });
		}
		if (quantity_used <= 0) {
			return res.status(400).json({ success: false, message: 'Quantity used must be > 0.' });
		}

		const usage = await useItem({ inventory_id, installed_by, quantity_used });
		res.status(201).json({ success: true, data: usage });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

async function viewUsageHistory(req, res) {
	try {
		const data = await getUsageHistory();
		res.json({ success: true, data });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
	getCategories, addCategory, removeCategory,
	getInventory, getInventoryItem, addInventoryItem, editInventoryItem, removeInventoryItem,
	recordUsage, viewUsageHistory,
	getTypes, addType, removeType,
};
