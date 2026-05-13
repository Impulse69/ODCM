const {
	getAllCategories,
	createCategory,
	deleteCategory,
	getAllItems,
	getItemById,
	createItem,
	updateItem,
	deleteItem,
	consumeItemAndGetLowStockStatus,
	getUsageHistory,
	getAllTypes,
	createType,
	deleteType,
	resetLowStockAlertIfRecovered,
} = require('../Models/Inventory');
const { findById } = require('../Models/User');
const { recordAuditLog } = require('../Models/AuditLog');
const { sendLowStockAlertToAdmins, getConfigFromDb } = require('./SmsController');

async function getActor(req) {
	const actor = req.user?.id ? await findById(req.user.id) : null;
	return {
		id: actor?.id ?? req.user?.id ?? null,
		name: actor?.name ?? req.user?.name ?? req.user?.email ?? 'System',
		email: actor?.email ?? req.user?.email ?? null,
		role: actor?.role ?? req.user?.role ?? null,
	};
}

async function getLowStockThreshold() {
	const cfg = await getConfigFromDb();
	const threshold = Number.parseInt(String(cfg.low_stock_threshold || '10'), 10);
	return Number.isInteger(threshold) && threshold > 0 ? threshold : 10;
}

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
		const actor = await getActor(req);
		await recordAuditLog({
			actorUserId: actor.id,
			actorName: actor.name,
			actorEmail: actor.email,
			actorRole: actor.role,
			action: 'create',
			entityType: 'inventory_category',
			entityId: String(category.id),
			section: 'inventory',
			title: `Created inventory category ${category.name}`,
			afterData: category,
		});
		res.status(201).json({ success: true, data: category });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'Category already exists.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function removeCategory(req, res) {
	try {
		const before = (await getAllCategories()).find((category) => String(category.id) === String(req.params.id));
		await deleteCategory(req.params.id);
		if (before) {
			const actor = await getActor(req);
			await recordAuditLog({
				actorUserId: actor.id,
				actorName: actor.name,
				actorEmail: actor.email,
				actorRole: actor.role,
				action: 'delete',
				entityType: 'inventory_category',
				entityId: String(before.id),
				section: 'inventory',
				title: `Deleted inventory category ${before.name}`,
				beforeData: before,
			});
		}
		res.json({ success: true, message: 'Category deleted.' });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Types ─────────────────────────────────────────────────────────────────────

async function getTypes(req, res) {
	try {
		const data = await getAllTypes(req.query.category ? String(req.query.category) : undefined);
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
		const actor = await getActor(req);
		await recordAuditLog({
			actorUserId: actor.id,
			actorName: actor.name,
			actorEmail: actor.email,
			actorRole: actor.role,
			action: 'create',
			entityType: 'inventory_type',
			entityId: String(type.id),
			section: 'inventory',
			title: `Created inventory type ${type.name}`,
			afterData: type,
		});
		res.status(201).json({ success: true, data: type });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'Type already exists.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function removeType(req, res) {
	try {
		const before = (await getAllTypes()).find((type) => String(type.id) === String(req.params.id));
		await deleteType(req.params.id);
		if (before) {
			const actor = await getActor(req);
			await recordAuditLog({
				actorUserId: actor.id,
				actorName: actor.name,
				actorEmail: actor.email,
				actorRole: actor.role,
				action: 'delete',
				entityType: 'inventory_type',
				entityId: String(before.id),
				section: 'inventory',
				title: `Deleted inventory type ${before.name}`,
				beforeData: before,
			});
		}
		res.json({ success: true, message: 'Type deleted.' });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Inventory Items ───────────────────────────────────────────────────────────

async function getInventory(req, res) {
	try {
		const { category, type } = req.query;
		const data = await getAllItems({
			category: category ? String(category) : undefined,
			type: type ? String(type) : undefined,
		});
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
		const { category, imei_number, type } = req.body;
		if (!category || !imei_number || !type) {
			return res.status(400).json({ success: false, message: 'Missing required fields.' });
		}
		const lowStockThreshold = await getLowStockThreshold();
		const item = await createItem({ category, imei_number, type, quantity: 1 });
		await resetLowStockAlertIfRecovered(category, type, lowStockThreshold);
		const actor = await getActor(req);
		await recordAuditLog({
			actorUserId: actor.id,
			actorName: actor.name,
			actorEmail: actor.email,
			actorRole: actor.role,
			action: 'create',
			entityType: 'inventory_item',
			entityId: String(item.id),
			section: 'inventory',
			title: `Added inventory item ${item.imei_number}`,
			afterData: item,
		});
		res.status(201).json({ success: true, data: item });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'IMEI already exists.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function editInventoryItem(req, res) {
	try {
		const before = await getItemById(req.params.id);
		const updated = await updateItem(req.params.id, req.body);
		if (!updated) return res.status(404).json({ success: false, message: 'Item not found.' });
		const actor = await getActor(req);
		await recordAuditLog({
			actorUserId: actor.id,
			actorName: actor.name,
			actorEmail: actor.email,
			actorRole: actor.role,
			action: 'update',
			entityType: 'inventory_item',
			entityId: String(updated.id),
			section: 'inventory',
			title: `Updated inventory item ${updated.imei_number}`,
			beforeData: before,
			afterData: updated,
		});
		res.json({ success: true, data: updated });
	} catch (err) {
		if (err.code === '23505') return res.status(409).json({ success: false, message: 'IMEI already in use.' });
		res.status(500).json({ success: false, message: err.message });
	}
}

async function removeInventoryItem(req, res) {
	try {
		const before = await getItemById(req.params.id);
		await deleteItem(req.params.id);
		if (before) {
			const actor = await getActor(req);
			await recordAuditLog({
				actorUserId: actor.id,
				actorName: actor.name,
				actorEmail: actor.email,
				actorRole: actor.role,
				action: 'delete',
				entityType: 'inventory_item',
				entityId: String(before.id),
				section: 'inventory',
				title: `Deleted inventory item ${before.imei_number}`,
				beforeData: before,
			});
		}
		res.json({ success: true, message: 'Item deleted.' });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
}

// ─── Use Item & Usage History ──────────────────────────────────────────────────

async function recordUsage(req, res) {
	try {
		const actor = await getActor(req);
		const { inventory_id, installed_by, client_name, vehicle_number, location } = req.body;
		const installerName = String(installed_by ?? actor.name ?? '').trim();
		const clientName = String(client_name ?? '').trim();
		const vehicleNumber = String(vehicle_number ?? '').trim();
		const usageLocation = String(location ?? '').trim();
		if (!inventory_id || !installerName || !clientName || !vehicleNumber || !usageLocation) {
			return res.status(400).json({ success: false, message: 'Missing required fields (inventory_id, installed_by, client_name, vehicle_number, location).' });
		}

		const lowStockThreshold = await getLowStockThreshold();
		const before = await getItemById(inventory_id);
		const result = await consumeItemAndGetLowStockStatus({
			inventory_id,
			installed_by: installerName,
			client_name: clientName,
			vehicle_number: vehicleNumber,
			location: usageLocation,
			threshold: lowStockThreshold,
		});
		const usage = result.usage;
		await recordAuditLog({
			actorUserId: actor.id,
			actorName: actor.name,
			actorEmail: actor.email,
			actorRole: actor.role,
			action: 'use',
			entityType: 'inventory_item',
			entityId: String(inventory_id),
			section: 'inventory',
			title: `Installed ${before?.imei_number ?? inventory_id} for ${clientName} (${vehicleNumber})`,
			beforeData: before,
			afterData: usage,
		});

		if (result.lowStock.shouldAlert) {
			sendLowStockAlertToAdmins(result.lowStock)
				.catch((alertErr) => console.error('[Inventory SMS] Low stock alert error:', alertErr.message));
		}

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
