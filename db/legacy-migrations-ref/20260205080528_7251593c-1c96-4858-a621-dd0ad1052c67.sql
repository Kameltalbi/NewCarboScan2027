-- Ajouter le FE CAPEX Équipements & Moyens Généraux
INSERT INTO public.emission_factors (
  factor_name,
  category,
  subcategory,
  emission_factor,
  unit,
  source,
  slug
) VALUES (
  'CAPEX Équipements & Moyens Généraux',
  'scope3_capital_goods',
  'cat2_capex_general',
  0.350,
  'kgCO2e/TND',
  'Estimation sectorielle',
  'cat2_capex_general'
);