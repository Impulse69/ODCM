-- Migration: 001_create_schema_postgres.sql
-- PostgreSQL schema for admin, companies, customers, vehicles, plans, subscriptions, invoices, sessions, audit_logs
-- Run with your psql client: `psql -U user -d database -f migrations/001_create_schema_postgres.sql`

-- Extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM ('admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_enum') THEN
    CREATE TYPE account_status_enum AS ENUM ('active','inactive','suspended','pending');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status_enum') THEN
    CREATE TYPE vehicle_status_enum AS ENUM ('active','inactive','maintenance','retired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE subscription_status_enum AS ENUM ('active','paused','cancelled','expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
    CREATE TYPE invoice_status_enum AS ENUM ('unpaid','paid','overdue');
  END IF;
END $$;

-- Admins (authentication for internal users)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role role_enum NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ NULL
);

-- Companies (corporate accounts)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  billing_contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  tax_id VARCHAR(100),
  status account_status_enum DEFAULT 'active',
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers (individual clients). A customer may optionally be linked to a company.
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Client sheet fields
  client_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(30),
  company_id UUID NULL REFERENCES companies(id) ON DELETE RESTRICT,
  status account_status_enum DEFAULT 'active',
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles (belong to either a customer or a company)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NULL REFERENCES customers(id) ON DELETE RESTRICT,
  company_id UUID NULL REFERENCES companies(id) ON DELETE RESTRICT,
  plate_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_model VARCHAR(150),
  year_of_manufacture INT,
  -- Device details
  device_model VARCHAR(150),
  device_code VARCHAR(150),
  imei VARCHAR(50) UNIQUE,
  sim_number VARCHAR(50),
  vin VARCHAR(50),
  status vehicle_status_enum DEFAULT 'active',
  installation_date DATE,
  -- Additional hardware/features (use booleans in Postgres)
  engine_immobilizer BOOLEAN NOT NULL DEFAULT FALSE,
  delays_key BOOLEAN NOT NULL DEFAULT FALSE,
  fuel_sensor BOOLEAN NOT NULL DEFAULT FALSE,
  installed_by VARCHAR(255),
  checked_by VARCHAR(255),
  client_signature TEXT,
  odg_tack_signature TEXT,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_owner_xor CHECK (
    (customer_id IS NOT NULL AND company_id IS NULL) OR
    (customer_id IS NULL AND company_id IS NOT NULL)
  )
);

-- Plans (pricing options)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  description TEXT
);

-- Subscriptions (link vehicle to a plan / billing contract)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  plan_id UUID NULL REFERENCES plans(id) ON DELETE SET NULL,
  start_date DATE,
  expiry_date DATE,
  monthly_amount NUMERIC(10,2),
  status subscription_status_enum DEFAULT 'active',
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_date_check CHECK (expiry_date IS NULL OR expiry_date >= start_date)
);

-- Invoices / Payments (optional billing records)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NULL REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ NULL,
  status invoice_status_enum DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions (for server-side session tracking)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs (optional)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID NULL REFERENCES admins(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_imei ON vehicles (imei);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (company_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions (expiry_date);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers (company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles (company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles (customer_id);

-- Partial unique indexes to allow email reuse after soft delete
CREATE UNIQUE INDEX IF NOT EXISTS unique_companies_email_active
  ON companies(email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_customers_email_active
  ON customers(email)
  WHERE deleted_at IS NULL;

-- Example admin seed (run manually after replacing PASSWORD_HASH with a bcrypt hash):
-- INSERT INTO admins (id,name,email,password_hash,role) VALUES (gen_random_uuid(),'Admin User','admin@example.com','$2b$10$...bcrypt...', 'admin');

-- Notes:
-- - Enums are used for roles and status fields to constrain allowed values.
-- - Boolean fields are used for hardware feature flags (`engine_immobilizer`, `delays_key`, `fuel_sensor`).
-- - UUID primary keys use `gen_random_uuid()` from `pgcrypto`.
