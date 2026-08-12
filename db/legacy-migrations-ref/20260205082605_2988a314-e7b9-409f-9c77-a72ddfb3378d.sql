-- Ajouter le facteur d'émission pour Transport routier marchandises (local)
INSERT INTO public.emission_factors (
  factor_name,
  category,
  subcategory,
  emission_factor,
  unit,
  source,
  slug
) VALUES (
  'Transport routier marchandises (local)',
  'scope3_upstream_transport',
  'cat4_road_freight_local',
  0.150,
  'kgCO2e/t.km',
  'ADEME Base Carbone',
  'cat4_road_freight_local'
);