-- Ajouter les facteurs d'émission manquants pour les questions d'électricité du Scope 2

-- Mettre à jour les questions qui modifient le calcul des émissions d'électricité
UPDATE questionnaires 
SET emission_factor_slug = 'electricite'
WHERE question_key IN ('green_electricity_percentage', 'has_solar_panels');

-- Insérer des facteurs d'émission spéciaux pour l'électricité verte
INSERT INTO emission_factors (slug, factor_name, nom_affiche, category, subcategory, emission_factor, unit, source, year)
VALUES 
  ('electricite_verte', 'Électricité verte certifiée', 'Électricité verte certifiée', 'energy', 'renewable', 0.050, 'kg CO₂e/kWh', 'ADEME', 2023),
  ('solaire_autoconsommation', 'Production solaire autoconsommation', 'Production solaire autoconsommation', 'energy', 'renewable', 0.020, 'kg CO₂e/kWh', 'ADEME', 2023)
ON CONFLICT (slug) DO NOTHING;

-- Mettre à jour la question des panneaux solaires pour utiliser le facteur solaire
UPDATE questionnaires 
SET emission_factor_slug = 'solaire_autoconsommation'
WHERE question_key = 'has_solar_panels';