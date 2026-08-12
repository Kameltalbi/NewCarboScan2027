-- Migration: Création de la structure modulaire pour CarboScan Suite
-- Date: 2025-01-31
-- Description: Tables et fonctions pour gérer les modules achetés par organisation

-- Table des modules disponibles
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  route TEXT NOT NULL, -- Route principale du module
  category TEXT, -- 'core', 'addon', 'landing'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison organisation-modules
CREATE TABLE IF NOT EXISTS organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, module_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_organization_modules_org_id ON organization_modules(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_module_id ON organization_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_active ON organization_modules(org_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_modules_slug ON modules(slug);
CREATE INDEX IF NOT EXISTS idx_modules_active ON modules(is_active) WHERE is_active = true;

-- Fonction RPC pour récupérer les modules actifs d'une organisation
CREATE OR REPLACE FUNCTION get_organization_modules(p_org_id UUID)
RETURNS TABLE (
  module_id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  icon TEXT,
  route TEXT,
  category TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id AS module_id,
    m.slug,
    m.name,
    m.description,
    m.icon,
    m.route,
    m.category,
    om.started_at,
    om.expires_at
  FROM modules m
  INNER JOIN organization_modules om ON om.module_id = m.id
  WHERE om.org_id = p_org_id
    AND om.active = true
    AND m.is_active = true
    AND (om.expires_at IS NULL OR om.expires_at > NOW())
  ORDER BY m.name;
END;
$$;

-- Fonction pour activer un module pour une organisation
CREATE OR REPLACE FUNCTION activate_module_for_organization(
  p_org_id UUID,
  p_module_slug TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
  v_org_module_id UUID;
BEGIN
  -- Récupérer l'ID du module
  SELECT id INTO v_module_id
  FROM modules
  WHERE slug = p_module_slug AND is_active = true;
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Module % not found or inactive', p_module_slug;
  END IF;
  
  -- Insérer ou mettre à jour l'activation
  INSERT INTO organization_modules (org_id, module_id, active, expires_at)
  VALUES (p_org_id, v_module_id, true, p_expires_at)
  ON CONFLICT (org_id, module_id)
  DO UPDATE SET
    active = true,
    expires_at = COALESCE(p_expires_at, organization_modules.expires_at),
    updated_at = NOW()
  RETURNING id INTO v_org_module_id;
  
  RETURN v_org_module_id;
END;
$$;

-- Fonction pour désactiver un module pour une organisation
CREATE OR REPLACE FUNCTION deactivate_module_for_organization(
  p_org_id UUID,
  p_module_slug TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Récupérer l'ID du module
  SELECT id INTO v_module_id
  FROM modules
  WHERE slug = p_module_slug;
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Module % not found', p_module_slug;
  END IF;
  
  -- Désactiver le module
  UPDATE organization_modules
  SET active = false, updated_at = NOW()
  WHERE org_id = p_org_id AND module_id = v_module_id;
  
  RETURN FOUND;
END;
$$;

-- Insertion des modules disponibles
INSERT INTO modules (slug, name, description, icon, route, category) VALUES
  ('bilan-carbone', 'Bilan Carbone', 'Module principal de calcul de bilan carbone organisationnel', 'BarChart3', '/bilan-carbone', 'core'),
  ('acv', 'Analyse du Cycle de Vie', 'Module d''analyse du cycle de vie des produits', 'Leaf', '/acv', 'addon'),
  ('empreinte-produit', 'Empreinte Carbone Produit', 'Landing page pour l''empreinte carbone produit', 'Package', '/empreinte-produit', 'landing'),
  ('empreinte-produit-calculator', 'Calculateur Empreinte Produit', 'Calculateur d''empreinte carbone produit', 'Calculator', '/empreinte-produit-calculator', 'addon'),
  ('empreinte-produit-report', 'Rapports Empreinte Produit', 'Génération de rapports d''empreinte carbone produit', 'FileText', '/empreinte-produit-report', 'addon'),
  ('cbam-calculator', 'Calculateur CBAM', 'Calculateur pour le mécanisme d''ajustement carbone aux frontières', 'Shield', '/cbam-calculator', 'addon'),
  ('energy', 'CarboScan Energy', 'Module de suivi énergétique', 'Zap', '/energy', 'addon'),
  ('decarbotech', 'Decarbotech', 'Module de réduction carbone et Net Zero', 'Target', '/decarbotech', 'addon'),
  ('collect', 'CarboScan Collect', 'Module de collecte de données carbone', 'Database', '/collect', 'addon')
ON CONFLICT (slug) DO NOTHING;

-- RLS (Row Level Security)
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour modules (lecture publique des modules actifs)
CREATE POLICY "Modules are viewable by everyone"
  ON modules FOR SELECT
  USING (is_active = true);

-- Politique RLS pour organization_modules (lecture par les membres de l'organisation)
CREATE POLICY "Organization modules are viewable by organization members"
  ON organization_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_modules.org_id
      AND om.user_id = auth.uid()
    )
  );

-- Politique RLS pour l'insertion (seulement pour les admins d'organisation)
CREATE POLICY "Organization admins can activate modules"
  ON organization_modules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_modules.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Politique RLS pour la mise à jour (seulement pour les admins d'organisation)
CREATE POLICY "Organization admins can update modules"
  ON organization_modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_modules.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Commentaires
COMMENT ON TABLE modules IS 'Liste des modules disponibles dans CarboScan Suite';
COMMENT ON TABLE organization_modules IS 'Modules activés pour chaque organisation';
COMMENT ON FUNCTION get_organization_modules IS 'Récupère les modules actifs d''une organisation';
COMMENT ON FUNCTION activate_module_for_organization IS 'Active un module pour une organisation';
COMMENT ON FUNCTION deactivate_module_for_organization IS 'Désactive un module pour une organisation';

