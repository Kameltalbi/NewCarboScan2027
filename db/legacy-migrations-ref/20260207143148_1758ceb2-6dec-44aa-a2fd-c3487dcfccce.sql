-- 1. Corriger l'unité de la donnée d'activité
UPDATE activity_data 
SET unit = 't.km',
    notes = 'Transport maritime Ro-Ro véhicules importés. 5 310 véhicules × 1,667 t × distance = 283 390 t·km. FE ADEME: 0,0191 kgCO₂e/t·km'
WHERE id = 'b8384859-bfb5-4015-b3f9-a65f4a5643ad';

-- 2. Ajouter le facteur d'émission personnalisé pour ce type de transport
INSERT INTO organization_emission_factors (
  organization_id,
  subcategory_key,
  custom_value,
  custom_unit,
  custom_source
)
SELECT 
  '69ec7061-faab-44f3-9a98-18be354637ba',
  'cat4_upstream_transport:cat4_vehicles_imported_roro',
  0.0191,
  'kgCO2e/t.km',
  'ADEME Base Carbone - Transport maritime Ro-Ro'
WHERE NOT EXISTS (
  SELECT 1 FROM organization_emission_factors 
  WHERE organization_id = '69ec7061-faab-44f3-9a98-18be354637ba'
    AND subcategory_key = 'cat4_upstream_transport:cat4_vehicles_imported_roro'
);