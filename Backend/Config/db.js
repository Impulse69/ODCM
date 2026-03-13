// Load environment variables from .env file
require('dotenv').config();
// Database configuration for PostgreSQL using 'pg' package
const { Pool } = require('pg');

let pool;
try {
	if (!process.env.PGUSER || !process.env.PGPASSWORD || !process.env.PGDATABASE) {
		console.error('[FATAL] Missing required database environment variables (PGUSER, PGPASSWORD, PGDATABASE).');
		console.error('Please create a .env file in the Backend directory. See .env.example for reference.');
		process.exit(1);
	}

	pool = new Pool({
		user: process.env.PGUSER,
		host: process.env.PGHOST || 'localhost',
		database: process.env.PGDATABASE,
		password: process.env.PGPASSWORD,
		port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
	});
	// Test connection immediately
	pool.connect()
		.then(client => {
			client.release();
			console.log('PostgreSQL connected successfully.');
		})
		.catch(err => {
			console.error('PostgreSQL connection error:', err.message);
		});
} catch (err) {
	console.error('Failed to initialize PostgreSQL pool:', err.message);
}

module.exports = pool;
