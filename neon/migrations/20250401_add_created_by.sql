-- Run in Neon SQL Editor if your database was created before created_by / contact+model created_at columns.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
ALTER TABLE models ADD COLUMN IF NOT EXISTS created_at DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE models ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
