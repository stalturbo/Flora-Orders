-- FloraOrders Database Init Script
-- Run this to create all tables from scratch

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('OWNER', 'MANAGER', 'FLORIST', 'COURIER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('NOT_PAID', 'ADVANCE', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_source AS ENUM ('PHONE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE business_expense_category AS ENUM ('TAXES', 'RENT', 'SALARY', 'SUPPLIES', 'MARKETING', 'TRANSPORT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE geo_status AS ENUM ('NONE', 'PENDING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assistant_role AS ENUM ('FLORIST', 'COURIER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  plain_password TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'MANAGER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS users_org_idx ON users(organization_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number INTEGER,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  delivery_date_time BIGINT NOT NULL,
  delivery_date_time_end BIGINT,
  amount INTEGER NOT NULL,
  status order_status NOT NULL DEFAULT 'NEW',
  manager_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  florist_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  courier_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  external_florist_name TEXT,
  external_florist_phone TEXT,
  external_courier_name TEXT,
  external_courier_phone TEXT,
  comment TEXT,
  payment_status payment_status DEFAULT 'NOT_PAID',
  payment_method TEXT,
  payment_details TEXT,
  client_source client_source DEFAULT 'PHONE',
  client_source_id TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geo_status geo_status DEFAULT 'NONE',
  geo_updated_at TIMESTAMP,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS orders_org_idx ON orders(organization_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_delivery_idx ON orders(delivery_date_time);

CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'PHOTO',
  uri TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS attachments_order_idx ON attachments(order_id);

CREATE TABLE IF NOT EXISTS order_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  changed_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  note TEXT
);
CREATE INDEX IF NOT EXISTS history_order_idx ON order_history(order_id);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS order_expenses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS expenses_order_idx ON order_expenses(order_id);

CREATE TABLE IF NOT EXISTS business_expenses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category business_expense_category NOT NULL,
  amount INTEGER NOT NULL,
  comment TEXT NOT NULL,
  date BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS biz_expenses_org_idx ON business_expenses(organization_id);
CREATE INDEX IF NOT EXISTS biz_expenses_date_idx ON business_expenses(date);

CREATE TABLE IF NOT EXISTS order_assistants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role assistant_role NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);
CREATE INDEX IF NOT EXISTS assistants_order_idx ON order_assistants(order_id);
CREATE INDEX IF NOT EXISTS assistants_user_idx ON order_assistants(user_id);

CREATE TABLE IF NOT EXISTS courier_location_latest (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  courier_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  active_order_id VARCHAR
);
CREATE UNIQUE INDEX IF NOT EXISTS courier_loc_latest_org_user_idx ON courier_location_latest(organization_id, courier_user_id);
CREATE INDEX IF NOT EXISTS courier_loc_latest_org_idx ON courier_location_latest(organization_id);

CREATE TABLE IF NOT EXISTS courier_locations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  courier_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  active_order_id VARCHAR
);
CREATE INDEX IF NOT EXISTS courier_loc_history_org_user_time_idx ON courier_locations(organization_id, courier_user_id, recorded_at);
CREATE INDEX IF NOT EXISTS courier_loc_history_org_idx ON courier_locations(organization_id);

CREATE TABLE IF NOT EXISTS dev_settings (
  id VARCHAR PRIMARY KEY DEFAULT 'default',
  dev_login TEXT NOT NULL DEFAULT 'developer',
  dev_password TEXT NOT NULL DEFAULT '20242024',
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

INSERT INTO dev_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
