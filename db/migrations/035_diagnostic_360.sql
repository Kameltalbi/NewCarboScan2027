-- 035 — Diagnostic Carbone 360 (pré-diagnostic de maturité)
-- Ne remplace pas free-bilan/calculate : ce service reste, hors de ce parcours.
-- Les sessions anonymes n'ont pas d'organization_id (033 force le RLS
-- sur toute table qui porte cette colonne, et ncs_app ne le contourne pas).
-- Le lien vers une organisation est une table séparée, seule table tenant.
-- Le résultat fige les scores ET les recommandations de la version utilisée.
-- Le consentement commercial est facultatif et distinct de la demande de rapport.

CREATE TABLE diagnostic_templates (
  version       TEXT PRIMARY KEY,
  title_fr      TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE diagnostic_axes (
  template_version TEXT NOT NULL REFERENCES diagnostic_templates(version),
  axis_id          TEXT NOT NULL,
  position         INTEGER NOT NULL,
  label_fr         TEXT NOT NULL,
  label_en         TEXT NOT NULL,
  PRIMARY KEY (template_version, axis_id)
);

CREATE TABLE diagnostic_thresholds (
  template_version TEXT NOT NULL REFERENCES diagnostic_templates(version),
  kind             TEXT NOT NULL,
  max_inclusive    INTEGER NOT NULL,
  level            TEXT NOT NULL,
  PRIMARY KEY (template_version, kind, level)
);

CREATE TABLE diagnostic_questions (
  template_version          TEXT NOT NULL REFERENCES diagnostic_templates(version),
  code                      TEXT NOT NULL,
  axis_id                   TEXT,
  position                  INTEGER NOT NULL,
  question_type             TEXT NOT NULL,
  weight                    INTEGER NOT NULL,
  maturity_max              INTEGER,
  data_max                  INTEGER,
  unknown_excludes_maturity BOOLEAN NOT NULL DEFAULT true,
  visibility                TEXT NOT NULL,
  label_fr                  TEXT NOT NULL,
  label_en                  TEXT NOT NULL,
  PRIMARY KEY (template_version, code)
);

CREATE TABLE diagnostic_options (
  template_version TEXT NOT NULL,
  question_code    TEXT NOT NULL,
  value            TEXT NOT NULL,
  position         INTEGER NOT NULL,
  maturity_points  INTEGER,
  data_points      INTEGER,
  label_fr         TEXT NOT NULL,
  label_en         TEXT NOT NULL,
  PRIMARY KEY (template_version, question_code, value),
  FOREIGN KEY (template_version, question_code)
    REFERENCES diagnostic_questions(template_version, code)
);

CREATE TABLE diagnostic_rules (
  template_version TEXT NOT NULL REFERENCES diagnostic_templates(version),
  rule_id          TEXT NOT NULL,
  axis_id          TEXT NOT NULL,
  priority         TEXT NOT NULL,
  module           TEXT NOT NULL,
  condition_key    TEXT NOT NULL,
  title_fr         TEXT NOT NULL,
  title_en         TEXT NOT NULL,
  PRIMARY KEY (template_version, rule_id)
);

CREATE TABLE diagnostic_jurisdictions (
  template_version TEXT NOT NULL REFERENCES diagnostic_templates(version),
  country_code     TEXT NOT NULL,
  topic            TEXT NOT NULL,
  body_fr          TEXT,
  source           TEXT,
  effective_date   DATE,
  last_reviewed_at DATE,
  status           TEXT NOT NULL DEFAULT 'draft',
  PRIMARY KEY (template_version, country_code, topic),
  CHECK (status IN ('draft', 'reviewed'))
);

-- Réservé. Aucune médiane n'est publiée tant qu'un échantillon défendable n'existe pas.
CREATE TABLE diagnostic_benchmark_slots (
  template_version TEXT NOT NULL REFERENCES diagnostic_templates(version),
  sector           TEXT NOT NULL,
  axis_id          TEXT NOT NULL,
  sample_size      INTEGER NOT NULL DEFAULT 0,
  median_score     NUMERIC,
  published        BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (template_version, sector, axis_id),
  CHECK (published = false OR (sample_size >= 30 AND median_score IS NOT NULL))
);

CREATE TABLE diagnostic_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version      TEXT NOT NULL REFERENCES diagnostic_templates(version),
  resume_token_hash     TEXT NOT NULL,
  user_id               UUID REFERENCES users(id),
  language              TEXT NOT NULL DEFAULT 'fr',
  status                TEXT NOT NULL DEFAULT 'in_progress',
  country               TEXT,
  sector                TEXT,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  maturity_score        INTEGER,
  data_readiness_score  INTEGER,
  reliability           TEXT,
  CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  CHECK (reliability IS NULL OR reliability IN ('high', 'medium', 'low'))
);

CREATE TABLE diagnostic_answers (
  session_id    UUID NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  value         JSONB NOT NULL,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, question_code)
);

CREATE TABLE diagnostic_results (
  session_id         UUID PRIMARY KEY REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  template_version   TEXT NOT NULL,
  snapshot           JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (snapshot ? 'templateVersion'),
  CHECK (snapshot ? 'maturityScore'),
  CHECK (snapshot ? 'dataReadinessScore'),
  CHECK (snapshot ? 'reliability'),
  CHECK (snapshot ? 'recommendations')
);

CREATE TABLE diagnostic_org_links (
  session_id       UUID PRIMARY KEY REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by        UUID REFERENCES users(id),
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diagnostic_org_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_org_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON diagnostic_org_links
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR (
      current_setting('app.organization_id', true) <> ''
      AND organization_id::text = current_setting('app.organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR (
      current_setting('app.organization_id', true) <> ''
      AND organization_id::text = current_setting('app.organization_id', true)
    )
  );

-- Le rapport ne dépend pas de cette colonne. Défaut false : case non pré-cochée.
CREATE TABLE diagnostic_leads (
  session_id            UUID PRIMARY KEY REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  full_name             TEXT,
  company_name          TEXT,
  email                 CITEXT,
  marketing_consent     BOOLEAN NOT NULL DEFAULT false,
  marketing_consent_at  TIMESTAMPTZ,
  report_requested_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX diagnostic_sessions_status_idx ON diagnostic_sessions (status, started_at);
CREATE INDEX diagnostic_org_links_org_idx ON diagnostic_org_links (organization_id);

INSERT INTO diagnostic_templates (version, title_fr, title_en, active) VALUES
  ('diag-360-2026.1', 'Diagnostic Carbone 360', 'Carbon Diagnostic 360', true);

INSERT INTO diagnostic_axes (template_version, axis_id, position, label_fr, label_en) VALUES
  ('diag-360-2026.1', 'measure', 1, 'Mesure carbone', 'Carbon measurement'),
  ('diag-360-2026.1', 'energy', 2, 'Énergie', 'Energy'),
  ('diag-360-2026.1', 'mobility', 3, 'Mobilité et transport', 'Mobility and transport'),
  ('diag-360-2026.1', 'purchases', 4, 'Achats et chaîne de valeur', 'Purchasing and value chain'),
  ('diag-360-2026.1', 'steering', 5, 'Réduction et pilotage', 'Reduction and steering'),
  ('diag-360-2026.1', 'governance', 6, 'Gouvernance carbone', 'Carbon governance');

INSERT INTO diagnostic_thresholds (template_version, kind, max_inclusive, level) VALUES
  ('diag-360-2026.1', 'maturity', 20, 'initial'),
  ('diag-360-2026.1', 'maturity', 40, 'starting'),
  ('diag-360-2026.1', 'maturity', 60, 'structuring'),
  ('diag-360-2026.1', 'maturity', 80, 'managed'),
  ('diag-360-2026.1', 'maturity', 100, 'advanced'),
  ('diag-360-2026.1', 'reliability_unknown_count', 2, 'medium'),
  ('diag-360-2026.1', 'reliability_unknown_count', 4, 'low'),
  ('diag-360-2026.1', 'reliability_data', 40, 'low'),
  ('diag-360-2026.1', 'reliability_data', 60, 'medium');

INSERT INTO diagnostic_jurisdictions (template_version, country_code, topic, status) VALUES
  ('diag-360-2026.1', 'TN', 'energy', 'draft'),
  ('diag-360-2026.1', 'EU', 'cbam', 'draft'),
  ('diag-360-2026.1', 'CA', 'disclosure', 'draft');

INSERT INTO diagnostic_questions (
  template_version, code, axis_id, position, question_type, weight,
  maturity_max, data_max, unknown_excludes_maturity, visibility, label_fr, label_en
) VALUES
  ('diag-360-2026.1', 'country', NULL, 1, 'single', 0, NULL, NULL, false, 'always', 'Pays principal d''activité', 'Main country of operation'),
  ('diag-360-2026.1', 'sector', NULL, 2, 'single', 0, NULL, NULL, false, 'always', 'Secteur d''activité', 'Sector'),
  ('diag-360-2026.1', 'employees', NULL, 3, 'single', 0, NULL, NULL, false, 'always', 'Effectif approximatif', 'Approximate headcount'),
  ('diag-360-2026.1', 'export_status', NULL, 4, 'single', 0, NULL, NULL, false, 'always', 'Exportez-vous des services ou des marchandises ?', 'Do you export services or goods?'),
  ('diag-360-2026.1', 'has_fleet', NULL, 5, 'single', 0, NULL, NULL, false, 'always', 'Disposez-vous d''une flotte de véhicules ?', 'Do you operate a vehicle fleet?'),
  ('diag-360-2026.1', 'has_industrial_site', NULL, 6, 'single', 0, NULL, NULL, false, 'always', 'Exploitez-vous un site de production, un atelier ou une installation technique significative ?', 'Do you operate a production site, a workshop or a significant technical installation?'),
  ('diag-360-2026.1', 'carbon_assessment_status', 'measure', 7, 'single', 2, 3, NULL, true, 'always', 'Avez-vous déjà réalisé un bilan d''émissions de GES ?', 'Have you already completed a GHG inventory?'),
  ('diag-360-2026.1', 'scopes_covered', 'measure', 8, 'multi', 2, 4, NULL, true, 'assessment_exists', 'Quels périmètres ce bilan couvre-t-il ?', 'Which scopes does that inventory cover?'),
  ('diag-360-2026.1', 'assessment_data_basis', 'measure', 9, 'single', 2, 3, 3, true, 'assessment_exists', 'Sur quoi reposent principalement ces données ?', 'What are these data mainly based on?'),
  ('diag-360-2026.1', 'carbon_owner', 'measure', 10, 'single', 1, 2, NULL, true, 'always', 'Qui porte le sujet carbone en interne ?', 'Who owns the carbon topic internally?'),
  ('diag-360-2026.1', 'energy_tracking', 'energy', 11, 'single', 2, 3, 3, true, 'always', 'Comment suivez-vous vos consommations d''énergie ?', 'How do you track energy use?'),
  ('diag-360-2026.1', 'energy_target', 'energy', 12, 'single', 1, 2, NULL, true, 'no_industrial_site', 'Avez-vous un objectif de réduction d''énergie ?', 'Do you have an energy reduction target?'),
  ('diag-360-2026.1', 'energy_audit', 'energy', 13, 'single', 1, 2, NULL, true, 'industrial_site', 'Un audit énergétique a-t-il été réalisé ?', 'Has an energy audit been carried out?'),
  ('diag-360-2026.1', 'fleet_fuel_tracking', 'mobility', 14, 'single', 1, 2, 2, true, 'has_fleet', 'Comment suivez-vous les carburants de la flotte ?', 'How do you track fleet fuel?'),
  ('diag-360-2026.1', 'business_travel_tracking', 'mobility', 15, 'single', 1, 2, 2, true, 'no_fleet', 'Suivez-vous les déplacements professionnels ?', 'Do you track business travel?'),
  ('diag-360-2026.1', 'purchase_data', 'purchases', 16, 'single', 2, 3, 3, true, 'always', 'De quelles données achats disposez-vous ?', 'What purchasing data do you have?'),
  ('diag-360-2026.1', 'supplier_carbon', 'purchases', 17, 'single', 2, 2, 2, true, 'always', 'Disposez-vous de données carbone de vos fournisseurs ?', 'Do you have carbon data from suppliers?'),
  ('diag-360-2026.1', 'scope3_posture', 'purchases', 18, 'single', 2, 2, 2, true, 'scope3_slot', 'Comment traitez-vous le Scope 3 aujourd''hui ?', 'How do you handle Scope 3 today?'),
  ('diag-360-2026.1', 'review_cadence', 'steering', 19, 'single', 1, 2, NULL, true, 'review_slot', 'À quel rythme revoyez-vous vos données carbone ou énergie ?', 'How often do you review carbon or energy data?'),
  ('diag-360-2026.1', 'reduction_target', 'steering', 20, 'single', 2, 2, NULL, true, 'always', 'Avez-vous un objectif de réduction des émissions ?', 'Do you have an emissions reduction target?'),
  ('diag-360-2026.1', 'action_plan', 'steering', 21, 'single', 2, 2, NULL, true, 'always', 'Existe-t-il un plan d''actions ?', 'Is there an action plan?'),
  ('diag-360-2026.1', 'client_requirements', 'governance', 22, 'single', 0, NULL, NULL, false, 'always', 'Vos clients demandent-ils des informations carbone ?', 'Do customers ask for carbon information?'),
  ('diag-360-2026.1', 'cbam_exposure', 'governance', 23, 'single', 1, 2, NULL, true, 'cbam_slot', 'Vos marchandises exportées vers l''UE pourraient-elles relever des catégories couvertes par le MACF ?', 'Could your goods exported to the EU fall within CBAM covered categories?'),
  ('diag-360-2026.1', 'carbon_reporting', 'governance', 24, 'single', 1, 2, NULL, true, 'reporting_slot', 'Publiez-vous un suivi carbone ?', 'Do you report on carbon?');

INSERT INTO diagnostic_options (template_version, question_code, value, position, maturity_points, data_points, label_fr, label_en) VALUES
  ('diag-360-2026.1', 'country', 'TN', 1, NULL, NULL, 'Tunisie', 'Tunisia'),
  ('diag-360-2026.1', 'country', 'EU', 2, NULL, NULL, 'Union européenne', 'European Union'),
  ('diag-360-2026.1', 'country', 'CA', 3, NULL, NULL, 'Canada', 'Canada'),
  ('diag-360-2026.1', 'country', 'OTHER', 4, NULL, NULL, 'Autre', 'Other'),
  ('diag-360-2026.1', 'sector', 'services', 1, NULL, NULL, 'Services', 'Services'),
  ('diag-360-2026.1', 'sector', 'industry', 2, NULL, NULL, 'Industrie', 'Industry'),
  ('diag-360-2026.1', 'sector', 'construction', 3, NULL, NULL, 'Construction', 'Construction'),
  ('diag-360-2026.1', 'sector', 'trade', 4, NULL, NULL, 'Commerce', 'Trade'),
  ('diag-360-2026.1', 'sector', 'transport', 5, NULL, NULL, 'Transport', 'Transport'),
  ('diag-360-2026.1', 'sector', 'agrifood', 6, NULL, NULL, 'Agroalimentaire', 'Agri-food'),
  ('diag-360-2026.1', 'sector', 'finance', 7, NULL, NULL, 'Finance', 'Finance'),
  ('diag-360-2026.1', 'sector', 'other', 8, NULL, NULL, 'Autre', 'Other'),
  ('diag-360-2026.1', 'employees', 'lt10', 1, NULL, NULL, 'Moins de 10', 'Fewer than 10'),
  ('diag-360-2026.1', 'employees', '10_49', 2, NULL, NULL, '10 à 49', '10 to 49'),
  ('diag-360-2026.1', 'employees', '50_249', 3, NULL, NULL, '50 à 249', '50 to 249'),
  ('diag-360-2026.1', 'employees', '250_999', 4, NULL, NULL, '250 à 999', '250 to 999'),
  ('diag-360-2026.1', 'employees', 'ge1000', 5, NULL, NULL, '1 000 et plus', '1,000 or more'),
  ('diag-360-2026.1', 'export_status', 'none', 1, NULL, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'export_status', 'services_non_eu', 2, NULL, NULL, 'Services, hors Union européenne', 'Services, outside the EU'),
  ('diag-360-2026.1', 'export_status', 'services_eu', 3, NULL, NULL, 'Services, vers l''Union européenne', 'Services, to the EU'),
  ('diag-360-2026.1', 'export_status', 'goods_non_eu', 4, NULL, NULL, 'Marchandises, hors Union européenne', 'Goods, outside the EU'),
  ('diag-360-2026.1', 'export_status', 'goods_eu', 5, NULL, NULL, 'Marchandises, vers l''Union européenne', 'Goods, to the EU'),
  ('diag-360-2026.1', 'export_status', 'both_non_eu', 6, NULL, NULL, 'Services et marchandises, hors Union européenne', 'Services and goods, outside the EU'),
  ('diag-360-2026.1', 'export_status', 'both_eu', 7, NULL, NULL, 'Services et marchandises, vers l''Union européenne', 'Services and goods, to the EU'),
  ('diag-360-2026.1', 'has_fleet', 'yes', 1, NULL, NULL, 'Oui', 'Yes'),
  ('diag-360-2026.1', 'has_fleet', 'no', 2, NULL, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'has_industrial_site', 'yes', 1, NULL, NULL, 'Oui', 'Yes'),
  ('diag-360-2026.1', 'has_industrial_site', 'no', 2, NULL, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'carbon_assessment_status', 'never', 1, 0, NULL, 'Jamais', 'Never'),
  ('diag-360-2026.1', 'carbon_assessment_status', 'once', 2, 1, NULL, 'Une fois', 'Once'),
  ('diag-360-2026.1', 'carbon_assessment_status', 'regular', 3, 2, NULL, 'Régulièrement', 'Regularly'),
  ('diag-360-2026.1', 'carbon_assessment_status', 'multi_year', 4, 3, NULL, 'Série pluriannuelle', 'Multi-year series'),
  ('diag-360-2026.1', 'carbon_assessment_status', 'unknown', 5, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'scopes_covered', 's1', 1, 1, NULL, 'Scope 1', 'Scope 1'),
  ('diag-360-2026.1', 'scopes_covered', 's2', 2, 1, NULL, 'Scope 2', 'Scope 2'),
  ('diag-360-2026.1', 'scopes_covered', 's3', 3, 2, NULL, 'Scope 3', 'Scope 3'),
  ('diag-360-2026.1', 'assessment_data_basis', 'estimates', 1, 0, 1, 'Estimations', 'Estimates'),
  ('diag-360-2026.1', 'assessment_data_basis', 'invoices', 2, 1, 2, 'Factures ou dépenses', 'Invoices or spend'),
  ('diag-360-2026.1', 'assessment_data_basis', 'measured', 3, 2, 3, 'Mesures (compteurs, km, quantités)', 'Measurements'),
  ('diag-360-2026.1', 'assessment_data_basis', 'verified', 4, 3, 3, 'Mesures vérifiées', 'Verified measurements'),
  ('diag-360-2026.1', 'assessment_data_basis', 'unknown', 5, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'carbon_owner', 'none', 1, 0, NULL, 'Personne', 'No one'),
  ('diag-360-2026.1', 'carbon_owner', 'informal', 2, 1, NULL, 'Une personne, sans mandat formalisé', 'Someone, without a formal mandate'),
  ('diag-360-2026.1', 'carbon_owner', 'named', 3, 2, NULL, 'Un responsable désigné', 'A named owner'),
  ('diag-360-2026.1', 'carbon_owner', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'energy_tracking', 'none', 1, 0, 0, 'Pas de suivi', 'No tracking'),
  ('diag-360-2026.1', 'energy_tracking', 'annual', 2, 1, 1, 'Total annuel', 'Annual total'),
  ('diag-360-2026.1', 'energy_tracking', 'monthly', 3, 2, 2, 'Suivi mensuel', 'Monthly tracking'),
  ('diag-360-2026.1', 'energy_tracking', 'by_site', 4, 3, 3, 'Suivi mensuel par site', 'Monthly tracking by site'),
  ('diag-360-2026.1', 'energy_tracking', 'unknown', 5, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'energy_target', 'none', 1, 0, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'energy_target', 'qualitative', 2, 1, NULL, 'Oui, qualitatif', 'Yes, qualitative'),
  ('diag-360-2026.1', 'energy_target', 'quantified', 3, 2, NULL, 'Oui, chiffré', 'Yes, quantified'),
  ('diag-360-2026.1', 'energy_target', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'energy_audit', 'never', 1, 0, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'energy_audit', 'old', 2, 1, NULL, 'Oui, il y a plus de 3 ans', 'Yes, more than 3 years ago'),
  ('diag-360-2026.1', 'energy_audit', 'recent', 3, 2, NULL, 'Oui, depuis moins de 3 ans', 'Yes, within 3 years'),
  ('diag-360-2026.1', 'energy_audit', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'fleet_fuel_tracking', 'none', 1, 0, 0, 'Pas de suivi', 'No tracking'),
  ('diag-360-2026.1', 'fleet_fuel_tracking', 'invoices', 2, 1, 1, 'Factures de carburant', 'Fuel invoices'),
  ('diag-360-2026.1', 'fleet_fuel_tracking', 'km_and_fuel', 3, 2, 2, 'Kilomètres et litres', 'Kilometres and litres'),
  ('diag-360-2026.1', 'fleet_fuel_tracking', 'unknown', 4, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'business_travel_tracking', 'none', 1, 0, 0, 'Non', 'No'),
  ('diag-360-2026.1', 'business_travel_tracking', 'partial', 2, 1, 1, 'Partiellement', 'Partly'),
  ('diag-360-2026.1', 'business_travel_tracking', 'systematic', 3, 2, 2, 'Oui, de façon systématique', 'Yes, systematically'),
  ('diag-360-2026.1', 'business_travel_tracking', 'unknown', 4, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'purchase_data', 'none', 1, 0, 0, 'Aucune donnée exploitable', 'No usable data'),
  ('diag-360-2026.1', 'purchase_data', 'total_spend', 2, 1, 1, 'Dépense totale', 'Total spend'),
  ('diag-360-2026.1', 'purchase_data', 'by_category', 3, 2, 2, 'Dépense par catégorie', 'Spend by category'),
  ('diag-360-2026.1', 'purchase_data', 'by_supplier', 4, 3, 3, 'Dépense par fournisseur', 'Spend by supplier'),
  ('diag-360-2026.1', 'purchase_data', 'unknown', 5, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'supplier_carbon', 'none', 1, 0, 0, 'Non', 'No'),
  ('diag-360-2026.1', 'supplier_carbon', 'some', 2, 1, 1, 'Pour quelques fournisseurs', 'For a few suppliers'),
  ('diag-360-2026.1', 'supplier_carbon', 'systematic', 3, 2, 2, 'Oui, de façon systématique', 'Yes, systematically'),
  ('diag-360-2026.1', 'supplier_carbon', 'unknown', 4, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'scope3_posture', 'not_started', 1, 0, 0, 'Pas commencé', 'Not started'),
  ('diag-360-2026.1', 'scope3_posture', 'spend', 2, 1, 1, 'Approche par les dépenses', 'Spend-based'),
  ('diag-360-2026.1', 'scope3_posture', 'activity', 3, 2, 2, 'Approche par les quantités', 'Activity-based'),
  ('diag-360-2026.1', 'scope3_posture', 'unknown', 4, NULL, 0, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'review_cadence', 'never', 1, 0, NULL, 'Jamais', 'Never'),
  ('diag-360-2026.1', 'review_cadence', 'annual', 2, 1, NULL, 'Une fois par an', 'Once a year'),
  ('diag-360-2026.1', 'review_cadence', 'quarterly', 3, 2, NULL, 'Au moins chaque trimestre', 'At least quarterly'),
  ('diag-360-2026.1', 'review_cadence', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'reduction_target', 'none', 1, 0, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'reduction_target', 'qualitative', 2, 1, NULL, 'Oui, sans chiffre', 'Yes, without a figure'),
  ('diag-360-2026.1', 'reduction_target', 'quantified', 3, 2, NULL, 'Oui, chiffré', 'Yes, quantified'),
  ('diag-360-2026.1', 'reduction_target', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'action_plan', 'none', 1, 0, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'action_plan', 'list', 2, 1, NULL, 'Une liste d''actions', 'A list of actions'),
  ('diag-360-2026.1', 'action_plan', 'owned_budgeted', 3, 2, NULL, 'Actions avec responsable et budget', 'Actions with an owner and a budget'),
  ('diag-360-2026.1', 'action_plan', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'client_requirements', 'none', 1, NULL, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'client_requirements', 'occasional', 2, NULL, NULL, 'Parfois', 'Sometimes'),
  ('diag-360-2026.1', 'client_requirements', 'contractual', 3, NULL, NULL, 'Oui, de façon contractuelle', 'Yes, contractually'),
  ('diag-360-2026.1', 'client_requirements', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'cbam_exposure', 'not_examined', 1, 0, NULL, 'Pas encore examiné', 'Not examined yet'),
  ('diag-360-2026.1', 'cbam_exposure', 'possible', 2, 1, NULL, 'C''est possible, sans vérification aboutie', 'Possible, without a completed check'),
  ('diag-360-2026.1', 'cbam_exposure', 'mapped', 3, 2, NULL, 'Catégories vérifiées', 'Categories checked'),
  ('diag-360-2026.1', 'cbam_exposure', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know'),
  ('diag-360-2026.1', 'carbon_reporting', 'none', 1, 0, NULL, 'Non', 'No'),
  ('diag-360-2026.1', 'carbon_reporting', 'internal', 2, 1, NULL, 'Suivi interne', 'Internal reporting'),
  ('diag-360-2026.1', 'carbon_reporting', 'external', 3, 2, NULL, 'Communication externe', 'External reporting'),
  ('diag-360-2026.1', 'carbon_reporting', 'unknown', 4, NULL, NULL, 'Je ne sais pas', 'I don''t know');

INSERT INTO diagnostic_rules (template_version, rule_id, axis_id, priority, module, condition_key, title_fr, title_en) VALUES
  ('diag-360-2026.1', 'no_ghg_inventory', 'measure', 'high', 'bilan', 'assessment_never', 'Réaliser une première mesure structurée', 'Complete a first structured inventory'),
  ('diag-360-2026.1', 'cbam_verify_exposure', 'governance', 'high', 'cbam', 'goods_eu_exposure_unverified', 'Vérifier votre exposition au MACF', 'Check your CBAM exposure'),
  ('diag-360-2026.1', 'incomplete_scopes', 'measure', 'high', 'collect', 'scopes_without_s3', 'Couvrir le Scope 3 dans la mesure', 'Cover Scope 3 in the inventory'),
  ('diag-360-2026.1', 'scope3_gap', 'purchases', 'high', 'collect', 'weak_value_chain', 'Structurer les données achats et Scope 3', 'Structure purchasing and Scope 3 data'),
  ('diag-360-2026.1', 'no_reduction_target', 'steering', 'high', 'bilan', 'reduction_none', 'Poser un objectif de réduction après la mesure', 'Set a reduction target after measuring'),
  ('diag-360-2026.1', 'no_named_owner', 'measure', 'medium', 'bilan', 'owner_none', 'Désigner un responsable carbone', 'Name a carbon owner'),
  ('diag-360-2026.1', 'weak_activity_data', 'measure', 'medium', 'collect', 'basis_estimates', 'Remplacer les estimations par des données mesurées', 'Replace estimates with measured data'),
  ('diag-360-2026.1', 'energy_not_tracked', 'energy', 'medium', 'history', 'energy_none_or_unknown', 'Mettre en place un suivi énergétique périodique', 'Set up periodic energy tracking'),
  ('diag-360-2026.1', 'plan_not_owned', 'steering', 'medium', 'history', 'plan_list', 'Rattacher chaque action à un responsable', 'Attach each action to an owner'),
  ('diag-360-2026.1', 'no_periodic_review', 'steering', 'medium', 'history', 'review_never', 'Mettre en place un suivi périodique', 'Set up a periodic review'),
  ('diag-360-2026.1', 'maintain_cycle', 'steering', 'low', 'history', 'maturity_at_least_80_without_high', 'Tenir le rythme de mesure et de revue', 'Keep the measurement and review cycle');
