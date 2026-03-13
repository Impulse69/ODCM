#!/usr/bin/env node
require('dotenv').config();

const readline = require('readline');
const { createUsersTable, createUser, findByEmail } = require('./Models/User');
const pool = require('./Config/db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n=== ODCMS — Create User ===\n');

  await createUsersTable();

  const name     = await ask('Full name: ');
  const email    = (await ask('Email: ')).toLowerCase().trim();
  const password = await ask('Password: ');
  const role     = (await ask('Role (Staff / Admin / ODG Master) [Staff]: ')).trim() || 'Staff';

  const existing = await findByEmail(email);
  if (existing) {
    console.error(`\nError: A user with email "${email}" already exists.`);
    rl.close();
    await pool.end();
    process.exit(1);
  }

  const user = await createUser({ email, password, name: name.trim(), role });
  console.log('\nUser created successfully:');
  console.log(user);

  rl.close();
  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  rl.close();
  pool.end();
  process.exit(1);
});
