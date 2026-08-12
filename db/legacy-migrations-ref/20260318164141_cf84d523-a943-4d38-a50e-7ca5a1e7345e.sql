
-- ============================================================
-- MODULE FOURNISSEURS — Schéma complet Scope 3 Amont
-- ============================================================

-- 1. ENUMS
-- ============================================================
CREATE TYPE public.supplier_score AS ENUM ('A+', 'A', 'B', 'C', 'D', 'E');
CREATE TYPE public.supplier_engagement_status AS ENUM ('not_contacted', 'invited', 'account_created', 'data_submitted', 'scored', 'engaged');
CREATE TYPE public.supplier_data_method AS ENUM ('monetary', 'physical', 'hybrid', 'acv');
CREATE TYPE public.supplier_invitation_status AS ENUM ('pending', 'opened', 'completed', 'expired');
CREATE TYPE public.supplier_questionnaire_status AS ENUM ('draft', 'sent', 'partially_answered', 'completed', 'expired');

-- 2. TABLE PRINCIPALE — FOURNISSEURS
-- ============================================================
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Identité
  name TEXT NOT NULL,
  siret TEXT,
  siren TEXT,
  naf_code TEXT,           -- Code NAF/NACE (secteur d'activité)
  nace_code TEXT,          -- Code NACE européen
  legal_form TEXT,
  
  -- Localisation
  country TEXT NOT NULL DEFAULT 'FR',
  city TEXT,
  address TEXT,
  postal_code TEXT,
  
  -- Contact principal
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_role TEXT,
  
  -- Classification achats
  purchase_category TEXT,       -- Catégorie d'achat principale
  purchase_subcategory TEXT,    -- Sous-catégorie
  scope3_ghg_category INTEGER DEFAULT 1,  -- Catégorie GHG Scope 3 (1=Achats, 4=Transport, etc.)
  
  -- Scoring & Maturité
  carbon_score public.supplier_score,
  carbon_intensity_kgco2e NUMERIC(15, 4),  -- kgCO2e par unité fonctionnelle
  confidence_index INTEGER DEFAULT 0 CHECK (confidence_index >= 0 AND confidence_index <= 100),
  engagement_status public.supplier_engagement_status DEFAULT 'not_contacted',
  data_method public.supplier_data_method DEFAULT 'monetary',
  
  -- Certifications & engagements
  has_carbon_footprint BOOLEAN DEFAULT FALSE,
  has_sbti_target BOOLEAN DEFAULT FALSE,
  sbti_target_year INTEGER,
  has_cdp_disclosure BOOLEAN DEFAULT FALSE,
  cdp_score TEXT,               -- A, A-, B, B-, C, C-, D, D-
  has_iso14001 BOOLEAN DEFAULT FALSE,
  has_ecovadis BOOLEAN DEFAULT FALSE,
  ecovadis_score INTEGER,       -- 0-100
  certifications JSONB DEFAULT '[]'::JSONB,
  
  -- Volume d'affaire
  annual_spend NUMERIC(15, 2),       -- Volume d'achats annuel (€)
  annual_spend_currency TEXT DEFAULT 'EUR',
  annual_spend_year INTEGER,
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  
  -- Métadonnées
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_data_update TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX idx_suppliers_country ON public.suppliers(country);
CREATE INDEX idx_suppliers_score ON public.suppliers(carbon_score);
CREATE INDEX idx_suppliers_engagement ON public.suppliers(engagement_status);

-- 3. TABLE CONTACTS FOURNISSEURS (multiples contacts)
-- ============================================================
CREATE TABLE public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,             -- ex: "Responsable RSE", "Directeur achats"
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_contacts_supplier ON public.supplier_contacts(supplier_id);

-- 4. TABLE ACHATS / DÉPENSES (spend-based)
-- ============================================================
CREATE TABLE public.supplier_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  -- Données de flux
  purchase_date DATE NOT NULL,
  reference_year INTEGER NOT NULL,
  description TEXT,
  
  -- Montant monétaire
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Quantité physique (optionnel, pour méthode hybride/physique)
  quantity NUMERIC(15, 4),
  quantity_unit TEXT,       -- kg, kWh, m3, tkm, etc.
  
  -- Classification
  purchase_category TEXT NOT NULL,   -- ex: "Matières premières", "Transport", "Services"
  purchase_subcategory TEXT,
  naf_code TEXT,
  ghg_scope3_category INTEGER DEFAULT 1,
  
  -- Facteur d'émission appliqué
  emission_factor_id UUID,
  emission_factor_value NUMERIC(15, 6),   -- kgCO2e/€ ou kgCO2e/unité
  emission_factor_unit TEXT DEFAULT 'kgCO2e/EUR',
  emission_factor_source TEXT,             -- ADEME, ecoinvent, fournisseur
  emission_factor_year INTEGER,
  
  -- Résultat du calcul
  calculated_emissions_kgco2e NUMERIC(15, 4),
  data_method public.supplier_data_method DEFAULT 'monetary',
  uncertainty_percent NUMERIC(5, 2),  -- % d'incertitude (élevé si monétaire ~50%, faible si ACV ~10%)
  
  -- Traçabilité
  source_document TEXT,     -- référence facture, FEC, etc.
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'fec_import', 'erp_import', 'api')),
  is_validated BOOLEAN DEFAULT FALSE,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_purchases_org ON public.supplier_purchases(organization_id);
CREATE INDEX idx_supplier_purchases_supplier ON public.supplier_purchases(supplier_id);
CREATE INDEX idx_supplier_purchases_year ON public.supplier_purchases(reference_year);
CREATE INDEX idx_supplier_purchases_category ON public.supplier_purchases(purchase_category);

-- 5. FACTEURS D'ÉMISSION MONÉTAIRES (ratios kgCO2e/€)
-- ============================================================
CREATE TABLE public.supplier_monetary_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  purchase_category TEXT NOT NULL,
  purchase_subcategory TEXT,
  naf_code TEXT,
  
  emission_factor NUMERIC(15, 6) NOT NULL,  -- kgCO2e/€
  unit TEXT DEFAULT 'kgCO2e/EUR',
  
  source TEXT NOT NULL,          -- 'ADEME', 'ecoinvent', 'custom'
  source_version TEXT,
  source_year INTEGER,
  country TEXT DEFAULT 'FR',
  
  uncertainty_percent NUMERIC(5, 2) DEFAULT 50,  -- Incertitude typique monétaire ~50%
  
  is_default BOOLEAN DEFAULT TRUE,
  organization_id UUID REFERENCES public.organizations(id),  -- NULL = facteur global
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_monetary_factors_category ON public.supplier_monetary_factors(purchase_category);
CREATE INDEX idx_supplier_monetary_factors_naf ON public.supplier_monetary_factors(naf_code);

-- 6. QUESTIONNAIRES CLIMAT FOURNISSEURS
-- ============================================================
CREATE TABLE public.supplier_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  template_version INTEGER DEFAULT 1,
  
  -- Structure du questionnaire (questions en JSONB)
  questions JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Format: [{ "key": "has_bilan", "label": "...", "type": "boolean|text|number|select", "required": true, "options": [...] }]
  
  is_template BOOLEAN DEFAULT FALSE,  -- template réutilisable
  
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ENVOIS DE QUESTIONNAIRES
-- ============================================================
CREATE TABLE public.supplier_questionnaire_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.supplier_questionnaires(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  status public.supplier_questionnaire_status DEFAULT 'draft',
  
  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  next_reminder_at TIMESTAMPTZ,
  
  -- Réponses du fournisseur
  responses JSONB DEFAULT '{}'::JSONB,
  responded_at TIMESTAMPTZ,
  
  -- Lien magique (sans mot de passe)
  magic_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  
  due_date DATE,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_questionnaire_sends_supplier ON public.supplier_questionnaire_sends(supplier_id);
CREATE INDEX idx_supplier_questionnaire_sends_org ON public.supplier_questionnaire_sends(organization_id);
CREATE INDEX idx_supplier_questionnaire_sends_token ON public.supplier_questionnaire_sends(magic_token);

-- 8. INVITATIONS FOURNISSEURS (portail dédié)
-- ============================================================
CREATE TABLE public.supplier_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  -- Invitation
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  magic_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status public.supplier_invitation_status DEFAULT 'pending',
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  
  -- Suivi
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_invitations_token ON public.supplier_invitations(magic_token);
CREATE INDEX idx_supplier_invitations_org ON public.supplier_invitations(organization_id);

-- 9. SCORING HISTORIQUE (audit trail des scores)
-- ============================================================
CREATE TABLE public.supplier_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  reference_year INTEGER NOT NULL,
  
  -- Scores détaillés
  overall_score public.supplier_score NOT NULL,
  carbon_intensity_score NUMERIC(5, 2),     -- Score intensité carbone (0-100)
  engagement_score NUMERIC(5, 2),           -- Score engagement climat (0-100)
  data_quality_score NUMERIC(5, 2),         -- Score qualité des données (0-100)
  trajectory_score NUMERIC(5, 2),           -- Score trajectoire de réduction (0-100)
  
  -- Détails du calcul
  total_emissions_kgco2e NUMERIC(15, 4),
  total_spend NUMERIC(15, 2),
  emission_intensity NUMERIC(15, 6),   -- kgCO2e/€
  
  data_method public.supplier_data_method,
  confidence_index INTEGER DEFAULT 0,
  
  calculation_details JSONB DEFAULT '{}'::JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by UUID
);

CREATE INDEX idx_supplier_score_history_supplier ON public.supplier_score_history(supplier_id);
CREATE INDEX idx_supplier_score_history_year ON public.supplier_score_history(reference_year);

-- 10. PLANS D'ACTION FOURNISSEURS
-- ============================================================
CREATE TABLE public.supplier_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Objectif de réduction
  target_reduction_percent NUMERIC(5, 2),   -- ex: 30%
  target_year INTEGER,                      -- ex: 2030
  baseline_year INTEGER,
  baseline_emissions_kgco2e NUMERIC(15, 4),
  
  -- Suivi
  current_progress_percent NUMERIC(5, 2) DEFAULT 0,
  current_emissions_kgco2e NUMERIC(15, 4),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'on_track', 'at_risk', 'completed', 'abandoned')),
  
  -- Milestones en JSONB
  milestones JSONB DEFAULT '[]'::JSONB,
  
  start_date DATE,
  last_review_date DATE,
  next_review_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_action_plans_supplier ON public.supplier_action_plans(supplier_id);
CREATE INDEX idx_supplier_action_plans_org ON public.supplier_action_plans(organization_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_suppliers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();

CREATE TRIGGER trg_supplier_purchases_updated_at BEFORE UPDATE ON public.supplier_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();

CREATE TRIGGER trg_supplier_monetary_factors_updated_at BEFORE UPDATE ON public.supplier_monetary_factors
  FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();

CREATE TRIGGER trg_supplier_questionnaires_updated_at BEFORE UPDATE ON public.supplier_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();

CREATE TRIGGER trg_supplier_questionnaire_sends_updated_at BEFORE UPDATE ON public.supplier_questionnaire_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();

CREATE TRIGGER trg_supplier_action_plans_updated_at BEFORE UPDATE ON public.supplier_action_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_monetary_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_questionnaire_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_action_plans ENABLE ROW LEVEL SECURITY;

-- SUPPLIERS: membres de l'org peuvent lire, admins peuvent modifier
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- SUPPLIER_CONTACTS
CREATE POLICY "supplier_contacts_select" ON public.supplier_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.is_org_member(auth.uid(), s.organization_id)));

CREATE POLICY "supplier_contacts_insert" ON public.supplier_contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.is_org_admin(auth.uid(), s.organization_id)));

CREATE POLICY "supplier_contacts_update" ON public.supplier_contacts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.is_org_admin(auth.uid(), s.organization_id)));

CREATE POLICY "supplier_contacts_delete" ON public.supplier_contacts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.is_org_admin(auth.uid(), s.organization_id)));

-- SUPPLIER_PURCHASES
CREATE POLICY "supplier_purchases_select" ON public.supplier_purchases FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_purchases_insert" ON public.supplier_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_purchases_update" ON public.supplier_purchases FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_purchases_delete" ON public.supplier_purchases FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- SUPPLIER_MONETARY_FACTORS (facteurs globaux lisibles par tous, custom par org)
CREATE POLICY "supplier_monetary_factors_select" ON public.supplier_monetary_factors FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_monetary_factors_insert" ON public.supplier_monetary_factors FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_monetary_factors_update" ON public.supplier_monetary_factors FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id));

-- SUPPLIER_QUESTIONNAIRES
CREATE POLICY "supplier_questionnaires_select" ON public.supplier_questionnaires FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_questionnaires_insert" ON public.supplier_questionnaires FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_questionnaires_update" ON public.supplier_questionnaires FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_questionnaires_delete" ON public.supplier_questionnaires FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- SUPPLIER_QUESTIONNAIRE_SENDS
CREATE POLICY "supplier_questionnaire_sends_select" ON public.supplier_questionnaire_sends FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_questionnaire_sends_insert" ON public.supplier_questionnaire_sends FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_questionnaire_sends_update" ON public.supplier_questionnaire_sends FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Accès public par magic token (pour les fournisseurs non authentifiés)
CREATE POLICY "supplier_questionnaire_sends_token_select" ON public.supplier_questionnaire_sends FOR SELECT TO anon
  USING (magic_token IS NOT NULL AND token_expires_at > now());

CREATE POLICY "supplier_questionnaire_sends_token_update" ON public.supplier_questionnaire_sends FOR UPDATE TO anon
  USING (magic_token IS NOT NULL AND token_expires_at > now());

-- SUPPLIER_INVITATIONS
CREATE POLICY "supplier_invitations_select" ON public.supplier_invitations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_invitations_insert" ON public.supplier_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Accès public par token
CREATE POLICY "supplier_invitations_token_select" ON public.supplier_invitations FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > now());

-- SUPPLIER_SCORE_HISTORY
CREATE POLICY "supplier_score_history_select" ON public.supplier_score_history FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_score_history_insert" ON public.supplier_score_history FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- SUPPLIER_ACTION_PLANS
CREATE POLICY "supplier_action_plans_select" ON public.supplier_action_plans FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "supplier_action_plans_insert" ON public.supplier_action_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_action_plans_update" ON public.supplier_action_plans FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "supplier_action_plans_delete" ON public.supplier_action_plans FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Calculer les émissions d'un achat (spend-based)
CREATE OR REPLACE FUNCTION public.calculate_supplier_purchase_emissions(p_purchase_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_amount NUMERIC;
  v_ef_value NUMERIC;
  v_emissions NUMERIC;
BEGIN
  SELECT sp.amount, COALESCE(sp.emission_factor_value, smf.emission_factor, 0)
  INTO v_amount, v_ef_value
  FROM supplier_purchases sp
  LEFT JOIN supplier_monetary_factors smf 
    ON smf.purchase_category = sp.purchase_category
    AND (smf.organization_id = sp.organization_id OR smf.organization_id IS NULL)
  WHERE sp.id = p_purchase_id
  ORDER BY smf.organization_id DESC NULLS LAST  -- Priorité aux facteurs custom
  LIMIT 1;
  
  v_emissions := COALESCE(v_amount * v_ef_value, 0);
  
  UPDATE supplier_purchases
  SET calculated_emissions_kgco2e = v_emissions,
      emission_factor_value = v_ef_value,
      updated_at = now()
  WHERE id = p_purchase_id;
  
  RETURN v_emissions;
END; $$;

-- Calculer le score global d'un fournisseur
CREATE OR REPLACE FUNCTION public.calculate_supplier_score(p_supplier_id UUID, p_year INTEGER DEFAULT EXTRACT(YEAR FROM now())::INTEGER)
RETURNS public.supplier_score
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_org_id UUID;
  v_total_emissions NUMERIC;
  v_total_spend NUMERIC;
  v_intensity NUMERIC;
  v_engagement_points INTEGER := 0;
  v_score public.supplier_score;
  v_confidence INTEGER;
BEGIN
  SELECT organization_id INTO v_org_id FROM suppliers WHERE id = p_supplier_id;
  
  -- Calculer émissions totales de l'année
  SELECT COALESCE(SUM(calculated_emissions_kgco2e), 0), COALESCE(SUM(amount), 0)
  INTO v_total_emissions, v_total_spend
  FROM supplier_purchases
  WHERE supplier_id = p_supplier_id AND reference_year = p_year;
  
  -- Intensité carbone
  IF v_total_spend > 0 THEN
    v_intensity := v_total_emissions / v_total_spend;
  ELSE
    v_intensity := 0;
  END IF;
  
  -- Points d'engagement
  SELECT 
    CASE WHEN has_carbon_footprint THEN 15 ELSE 0 END +
    CASE WHEN has_sbti_target THEN 25 ELSE 0 END +
    CASE WHEN has_cdp_disclosure THEN 15 ELSE 0 END +
    CASE WHEN has_iso14001 THEN 10 ELSE 0 END +
    CASE WHEN has_ecovadis THEN 10 ELSE 0 END +
    CASE WHEN data_method IN ('physical', 'acv') THEN 25 ELSE 0 END
  INTO v_engagement_points
  FROM suppliers WHERE id = p_supplier_id;
  
  -- Déterminer le score final
  v_score := CASE
    WHEN v_engagement_points >= 80 THEN 'A+'
    WHEN v_engagement_points >= 60 THEN 'A'
    WHEN v_engagement_points >= 40 THEN 'B'
    WHEN v_engagement_points >= 25 THEN 'C'
    WHEN v_engagement_points >= 10 THEN 'D'
    ELSE 'E'
  END;
  
  -- Confiance
  v_confidence := CASE
    WHEN v_engagement_points >= 60 THEN 85 + (v_engagement_points - 60)
    WHEN v_engagement_points >= 30 THEN 50 + v_engagement_points
    ELSE 20 + v_engagement_points
  END;
  v_confidence := LEAST(v_confidence, 100);
  
  -- Mettre à jour le fournisseur
  UPDATE suppliers SET
    carbon_score = v_score,
    carbon_intensity_kgco2e = v_intensity,
    confidence_index = v_confidence,
    updated_at = now()
  WHERE id = p_supplier_id;
  
  -- Historiser
  INSERT INTO supplier_score_history (
    supplier_id, organization_id, reference_year, overall_score,
    engagement_score, total_emissions_kgco2e, total_spend,
    emission_intensity, data_method, confidence_index,
    calculation_details, calculated_by
  ) VALUES (
    p_supplier_id, v_org_id, p_year, v_score,
    v_engagement_points, v_total_emissions, v_total_spend,
    v_intensity, (SELECT data_method FROM suppliers WHERE id = p_supplier_id),
    v_confidence,
    jsonb_build_object('engagement_points', v_engagement_points, 'intensity', v_intensity),
    auth.uid()
  );
  
  RETURN v_score;
END; $$;

-- Statistiques globales fournisseurs pour le dashboard
CREATE OR REPLACE FUNCTION public.get_supplier_dashboard_stats(p_org_id UUID)
RETURNS TABLE(
  total_suppliers BIGINT,
  engaged_suppliers BIGINT,
  scored_suppliers BIGINT,
  top_performers BIGINT,
  total_spend NUMERIC,
  total_emissions NUMERIC,
  avg_confidence INTEGER,
  questionnaires_sent BIGINT,
  questionnaires_completed BIGINT,
  countries_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_org_member(auth.uid(), p_org_id) AND NOT public.has_role(auth.uid(), 'superadmin') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE engagement_status IN ('data_submitted', 'scored', 'engaged'))::BIGINT,
    COUNT(*) FILTER (WHERE carbon_score IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE carbon_score IN ('A+', 'A'))::BIGINT,
    COALESCE(SUM(annual_spend), 0)::NUMERIC,
    COALESCE(SUM(carbon_intensity_kgco2e), 0)::NUMERIC,
    COALESCE(AVG(confidence_index), 0)::INTEGER,
    (SELECT COUNT(*) FROM supplier_questionnaire_sends WHERE organization_id = p_org_id AND sent_at IS NOT NULL)::BIGINT,
    (SELECT COUNT(*) FROM supplier_questionnaire_sends WHERE organization_id = p_org_id AND status = 'completed')::BIGINT,
    COUNT(DISTINCT country)::BIGINT
  FROM suppliers
  WHERE organization_id = p_org_id AND is_active = TRUE;
END; $$;
