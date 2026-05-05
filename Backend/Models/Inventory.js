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
			client_name   TEXT NOT NULL,
			vehicle_number TEXT NOT NULL,
			location      TEXT NOT NULL,
			used_at       TIMESTAMP DEFAULT NOW()
		)
	`);

	await pool.query(`ALTER TABLE inventory_usage ADD COLUMN IF NOT EXISTS client_name TEXT`);
	await pool.query(`ALTER TABLE inventory_usage ADD COLUMN IF NOT EXISTS vehicle_number TEXT`);
	await pool.query(`ALTER TABLE inventory_usage ADD COLUMN IF NOT EXISTS location TEXT`);
	await pool.query(`UPDATE inventory_usage SET client_name = COALESCE(NULLIF(client_name, ''), 'Unknown Client') WHERE client_name IS NULL OR client_name = ''`);
	await pool.query(`UPDATE inventory_usage SET vehicle_number = COALESCE(NULLIF(vehicle_number, ''), 'Unknown Vehicle') WHERE vehicle_number IS NULL OR vehicle_number = ''`);
	await pool.query(`UPDATE inventory_usage SET location = COALESCE(NULLIF(location, ''), 'Unknown Location') WHERE location IS NULL OR location = ''`);
	await pool.query(`ALTER TABLE inventory_usage ALTER COLUMN client_name SET NOT NULL`);
	await pool.query(`ALTER TABLE inventory_usage ALTER COLUMN vehicle_number SET NOT NULL`);
	await pool.query(`ALTER TABLE inventory_usage ALTER COLUMN location SET NOT NULL`);

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

async function getAllTypes(categoryName) {
	const params = [];
	const where = [];
	if (categoryName) {
		params.push(categoryName);
		where.push(`category_name = $${params.length}`);
	}

	const { rows } = await pool.query(
		`SELECT * FROM inventory_types ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name ASC`,
		params
	);
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

async function getAllItems({ category, type } = {}) {
	const params = [];
	const where = [];

	if (category) {
		params.push(category);
		where.push(`category = $${params.length}`);
	}
	if (type) {
		params.push(type);
		where.push(`type = $${params.length}`);
	}

	const { rows } = await pool.query(
		`SELECT * FROM inventory ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
		params
	);
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
		[category, imei_number, type, quantity ?? 1]
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

async function useItem({ inventory_id, installed_by, client_name, vehicle_number, location }) {
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

		// Insert usage record
		const { rows: usageRows } = await client.query(
			`INSERT INTO inventory_usage (inventory_id, category, imei_number, type, installed_by, client_name, vehicle_number, location)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
			[inventory_id, item.category, item.imei_number, item.type, installed_by, client_name, vehicle_number, location]
		);

		await client.query('DELETE FROM inventory WHERE id = $1', [inventory_id]);

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
