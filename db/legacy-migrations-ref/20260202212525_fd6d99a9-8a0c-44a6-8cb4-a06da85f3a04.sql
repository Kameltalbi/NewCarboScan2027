-- Ajouter les facteurs d'émission pour les vols basés sur les km (ADEME)
INSERT INTO emission_factors (factor_name, nom_affiche, slug, emission_factor, unit, category, subcategory, source, year)
VALUES 
  ('Vol court-courrier (par km)', 'Vol court-courrier (par km)', 'vol_court_courrier_km', 0.158, 'kg CO₂e/km', 'travel', 'business_travel', 'ADEME', 2024),
  ('Vol moyen-courrier (par km)', 'Vol moyen-courrier (par km)', 'vol_moyen_courrier_km', 0.151, 'kg CO₂e/km', 'travel', 'business_travel', 'ADEME', 2024),
  ('Vol long-courrier (par km)', 'Vol long-courrier (par km)', 'vol_long_courrier_km', 0.150, 'kg CO₂e/km', 'travel', 'business_travel', 'ADEME', 2024)
ON CONFLICT (slug) DO UPDATE SET
  emission_factor = EXCLUDED.emission_factor,
  unit = EXCLUDED.unit,
  source = EXCLUDED.source,
  year = EXCLUDED.year,
  updated_at = now();