-- Craftric CRM schema
-- Run in SQL Editor (Dashboard > SQL Editor) after creating a project.
-- ============================================

-- Users (for auth and app users)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'manager')),
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_modified_by BIGINT REFERENCES users(id),
  last_modified_at TIMESTAMPTZ
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost', 'converted')),
  source TEXT NOT NULL DEFAULT '',
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by BIGINT NOT NULL REFERENCES users(id),
  last_modified_by BIGINT REFERENCES users(id),
  last_modified_at TIMESTAMPTZ
);

-- Customers (companies)
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  lead_id BIGINT REFERENCES leads(id),
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_modified_by BIGINT REFERENCES users(id),
  last_modified_at TIMESTAMPTZ
);

-- Contacts (belong to customer)
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT '',
  last_modified_by BIGINT REFERENCES users(id),
  last_modified_at TIMESTAMPTZ
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_modified_by BIGINT REFERENCES users(id),
  last_modified_at TIMESTAMPTZ
);

-- Models (variants of a product)
CREATE TABLE IF NOT EXISTS models (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  last_modified_by BIGINT REFERENCES users(id),
  last_modified_at TIMESTAMPTZ
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_models_product_id ON models(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);

-- Create your first admin user via the API: POST /api/auth/signup with body { "name": "Admin", "email": "admin@example.com", "password": "your-password", "role": "admin" }
-- Or use the app's Users page (after logging in with an existing user) to add users.
