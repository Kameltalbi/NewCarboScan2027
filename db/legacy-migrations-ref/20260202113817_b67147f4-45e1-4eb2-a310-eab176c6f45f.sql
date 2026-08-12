-- Ajouter le facteur d'émission pour les véhicules loués (Catégorie 13 Scope 3)
-- 0.180 kgCO2e/km = valeur IPCC pour véhicule essence moyen

INSERT INTO organization_emission_factors (
  organization_id,
  subcategory_key,
  custom_value,
  custom_unit,
  custom_source,
  notes
) VALUES (
  'f6be0e09-d6a6-4aa6-b6ae-13f05d92232b',
  'cat13_leased_vehicles_km',
  0.180,
  'kgCO2e/km',
  'IPCC',
  'Facteur d''émission véhicule essence moyen pour location longue durée (Scope 3 Cat 13)'
) ON CONFLICT DO NOTHING;