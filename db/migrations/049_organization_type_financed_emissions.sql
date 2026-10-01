-- Type d'organisation + feature flag émissions financées (PCAF).
-- Multi-tenant : stocké sur organizations, jamais sur users.
-- Ne détecte pas le type depuis le nom / l'email / le secteur.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS organization_type TEXT NOT NULL DEFAULT 'enterprise',
  ADD COLUMN IF NOT EXISTS financed_emissions_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE organizations
    ADD CONSTRAINT organizations_organization_type_check
    CHECK (organization_type IN ('enterprise', 'financial_institution'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN organizations.organization_type IS
  'enterprise | financial_institution — type de tenant, défini en paramètres';
COMMENT ON COLUMN organizations.financed_emissions_enabled IS
  'Feature flag PCAF / Émissions financées. Défaut : false (enterprise), true (financial_institution)';

-- Tenant de démo Banque Atlas uniquement (ID seed fixe) — pas de détection runtime par nom.
UPDATE organizations
SET
  organization_type = 'financial_institution',
  financed_emissions_enabled = true,
  updated_at = now()
WHERE id = 'a7a50000-0000-4000-8000-00000000b001'
   OR slug = 'banque-atlas-demo';
