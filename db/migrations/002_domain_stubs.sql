-- Extension progressive du schéma métier (inventaire legacy → PostgreSQL).
-- Les tables ci-dessous sont des stubs structurants ; enrichir colonne par colonne
-- depuis db/legacy-migrations-ref sans réintroduire de RLS Supabase.

CREATE TABLE IF NOT EXISTS profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name       TEXT,
  company_name    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_modules (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (organization_id, module_id)
);

CREATE TABLE IF NOT EXISTS collect_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',
  period_start    DATE,
  period_end      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbam_installations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  country_code    CHAR(2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventaire complet des noms legacy : db/TABLE_INVENTORY.txt (154 tables).
-- Porter une table = migration numérotée + tests d'isolation org + endpoint API.
