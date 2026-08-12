-- Table des presets secteur : catégories Scope 3 à activer par secteur d'activité
-- Quand un tenant choisit un secteur (ex. Concession automobile), on charge ce preset
-- pour activer les bonnes catégories sans toucher aux données existantes.

CREATE TABLE public.sector_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scope3_category_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sector_presets_code ON public.sector_presets(code);

COMMENT ON TABLE public.sector_presets IS 'Presets par secteur : quelles catégories Scope 3 afficher/activer (organizations.sector = code)';

-- Lecture ouverte aux utilisateurs authentifiés (catalogue global)
ALTER TABLE public.sector_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sector presets"
  ON public.sector_presets FOR SELECT
  TO authenticated
  USING (true);

-- Écriture réservée au service / superadmin (migrations ou back-office)
CREATE POLICY "Service role can manage sector presets"
  ON public.sector_presets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed : Concession automobile (15 catégories Scope 3)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'concession_automobile',
  'Concession automobile',
  ARRAY[
    'cat1_purchased_goods',
    'cat2_capital_goods',
    'cat3_fuel_energy',
    'cat4_upstream_transport',
    'cat5_waste',
    'cat6_business_travel',
    'cat7_commuting',
    'cat8_upstream_leased',
    'cat9_downstream_transport',
    'cat10_processing',
    'cat11_use_of_products',
    'cat12_end_of_life',
    'cat13_downstream_leased',
    'cat14_franchises',
    'cat15_investments'
  ]
)
ON CONFLICT (code) DO NOTHING;
