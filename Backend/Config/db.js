require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const useSsl = /sslmode=require/i.test(connectionString ?? '') || /\.neon\.tech/i.test(connectionString ?? '');

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
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
