/**
 * sync.js — Run this once to create all ODCMS tables in PostgreSQL.
 * Usage:  node sync.js
 */
require('dotenv').config();
const { createTables } = require('./Models/Customer');

(async () => {
  try {
    console.log('Connecting to PostgreSQL...');
    await createTables();
    console.log('✔  All tables are ready in pgAdmin4.');
    process.exit(0);
  } catch (err) {
    console.error('✘  Sync failed:', err.message);
    process.exit(1);
  }
})();
