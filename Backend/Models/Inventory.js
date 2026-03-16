const pool = require('../Config/db');

// ─── Table creation ────────────────────────────────────────────────────────────

async function createInventoryTables() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS inventory_categories (
			id    SERIAL PRIMARY KEY,
			name  TEXT NOT NULL UNIQUE,
			created_at TIMESTAMP DEFAULT NOW()
		)
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS inventory_types (
			id            SERIAL PRIMARY KEY,
			category_name TEXT NOT NULL,
			name          TEXT NOT NULL UNIQUE,
			created_at    TIMESTAMP DEFAULT NOW()
		)
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS inventory (
			id           SERIAL PRIMARY KEY,
			category     TEXT NOT NULL,
			imei_number  TEXT NOT NULL UNIQUE,
			type         TEXT NOT NULL,
			quantity     INTEGER NOT NULL DEFAULT 1,
			created_at   TIMESTAMP DEFAULT NOW(),
			updated_at   TIMESTAMP DEFAULT NOW()
		)
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS inventory_usage (
			id            SERIAL PRIMARY KEY,
			inventory_id  INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
			category      TEXT NOT NULL,
			imei_number   TEXT NOT NULL,
			type          TEXT NOT NULL,
			installed_by  TEXT NOT NULL,
			quantity_used INTEGER NOT NULL DEFAULT 1,
			used_at       TIMESTAMP DEFAULT NOW()
		)
	`);

}

// ─── Categories ────────────────────────────────────────────────────────────────

async function getAllCategories() {
	const { rows } = await pool.query('SELECT * FROM inventory_categories ORDER BY name ASC');
	return rows;
}

async function createCategory(name) {
	const { rows } = await pool.query(
		'INSERT INTO inventory_categories (name) VALUES ($1) RETURNING *',
		[name]
	);
	return rows[0];
}

async function deleteCategory(id) {
	await pool.query('DELETE FROM inventory_categories WHERE id = $1', [id]);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

async function getAllTypes() {
	const { rows } = await pool.query('SELECT * FROM inventory_types ORDER BY name ASC');
	return rows;
}

async function createType(category_name, name) {
	const { rows } = await pool.query(
		'INSERT INTO inventory_types (category_name, name) VALUES ($1, $2) RETURNING *',
		[category_name, name]
	);
	return rows[0];
}

async function deleteType(id) {
	await pool.query('DELETE FROM inventory_types WHERE id = $1', [id]);
}

// ─── Inventory Items ───────────────────────────────────────────────────────────

async function getAllItems() {
	const { rows } = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
	return rows;
}

async function getItemById(id) {
	const { rows } = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
	return rows[0] ?? null;
}

async function createItem({ category, imei_number, type, quantity }) {
	const { rows } = await pool.query(
		`INSERT INTO inventory (category, imei_number, type, quantity)
		 VALUES ($1, $2, $3, $4) RETURNING *`,
		[category, imei_number, type, quantity]
	);
	return rows[0];
}

async function updateItem(id, { category, imei_number, type, quantity }) {
	const updates = [];
	const values = [];
	let idx = 1;

	if (category !== undefined)    { updates.push(`category = $${idx++}`);    values.push(category); }
	if (imei_number !== undefined) { updates.push(`imei_number = $${idx++}`); values.push(imei_number); }
	if (type !== undefined)        { updates.push(`type = $${idx++}`);        values.push(type); }
	if (quantity !== undefined)    { updates.push(`quantity = $${idx++}`);    values.push(quantity); }

	if (!updates.length) return getItemById(id);

	updates.push('updated_at = NOW()');
	values.push(id);

	const { rows } = await pool.query(
		`UPDATE inventory SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
		values
	);
	return rows[0] ?? null;
}

async function deleteItem(id) {
	await pool.query('DELETE FROM inventory WHERE id = $1', [id]);
}

// ─── Use Item (transactional) ──────────────────────────────────────────────────

async function useItem({ inventory_id, installed_by, quantity_used }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		// Lock the row and check stock
		const { rows: itemRows } = await client.query(
			'SELECT * FROM inventory WHERE id = $1 FOR UPDATE',
			[inventory_id]
		);
		if (!itemRows.length) throw new Error('Inventory item not found.');
		const item = itemRows[0];

		if (item.quantity < quantity_used) {
			throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${quantity_used}`);
		}

		// Decrement quantity
		await client.query(
			'UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
			[quantity_used, inventory_id]
		);

		// Insert usage record
		const { rows: usageRows } = await client.query(
			`INSERT INTO inventory_usage (inventory_id, category, imei_number, type, installed_by, quantity_used)
			 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
			[inventory_id, item.category, item.imei_number, item.type, installed_by, quantity_used]
		);

		await client.query('COMMIT');
		return usageRows[0];
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

// ─── Usage History ─────────────────────────────────────────────────────────────

async function getUsageHistory() {
	const { rows } = await pool.query('SELECT * FROM inventory_usage ORDER BY used_at DESC');
	return rows;
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
	createInventoryTables,
	getAllCategories,
	createCategory,
	deleteCategory,
	getAllTypes,
	createType,
	deleteType,
	getAllItems,
	getItemById,
	createItem,
	updateItem,
	deleteItem,
	useItem,
	getUsageHistory,
};
