require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

pool.connect()
  .then(client => {
    client.release();
    console.log('PostgreSQL connected successfully.');
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err.message);
  });

module.exports = pool;