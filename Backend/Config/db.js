// Load environment variables from .env file
require('dotenv').config();
// Database configuration for PostgreSQL using 'pg' package
const { Pool } = require('pg');

let pool;
try {
	pool = new Pool({
		user: process.env.PGUSER || 'your_db_user',
		host: process.env.PGHOST || 'localhost',
		database: process.env.PGDATABASE || 'your_db_name',
		password: process.env.PGPASSWORD || 'your_db_password',
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
