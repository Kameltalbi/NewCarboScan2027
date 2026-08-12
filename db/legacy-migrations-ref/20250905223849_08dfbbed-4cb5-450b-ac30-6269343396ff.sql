-- Ajouter des facteurs d'émission spécifiques pour le calculateur CBAM
INSERT INTO public.emission_factors (slug, nom_affiche, factor_name, emission_factor, unit, category, subcategory, source, year) VALUES
-- Secteurs CBAM
('cbam_cement', 'Ciment (CBAM)', 'Production de ciment', 0.766, 'tCO2e/tonne', 'production', 'cbam_sectors', 'Commission Européenne - CBAM', 2024),
('cbam_steel', 'Acier (CBAM)', 'Production d''acier', 2.1, 'tCO2e/tonne', 'production', 'cbam_sectors', 'Commission Européenne - CBAM', 2024),
('cbam_aluminum', 'Aluminium (CBAM)', 'Production d''aluminium', 11.5, 'tCO2e/tonne', 'production', 'cbam_sectors', 'Commission Européenne - CBAM', 2024),
('cbam_fertilizer', 'Engrais (CBAM)', 'Production d''engrais', 3.5, 'tCO2e/tonne', 'production', 'cbam_sectors', 'Commission Européenne - CBAM', 2024),
('cbam_electricity', 'Électricité (CBAM)', 'Production d''électricité', 0.435, 'tCO2e/MWh', 'energy', 'cbam_sectors', 'Commission Européenne - CBAM', 2024),
('cbam_hydrogen', 'Hydrogène (CBAM)', 'Production d''hydrogène', 9.6, 'tCO2e/tonne', 'production', 'cbam_sectors', 'Commission Européenne - CBAM', 2024),

-- Électricité par pays
('electricity_tunisia', 'Électricité Tunisie', 'Mix électrique tunisien', 0.45, 'tCO2e/MWh', 'energy', 'electricity_mix', 'STEG - Données nationales', 2024),
('electricity_morocco', 'Électricité Maroc', 'Mix électrique marocain', 0.72, 'tCO2e/MWh', 'energy', 'electricity_mix', 'ONEE - Données nationales', 2024),
('electricity_turkey', 'Électricité Turquie', 'Mix électrique turc', 0.49, 'tCO2e/MWh', 'energy', 'electricity_mix', 'TEIAS - Données nationales', 2024),
('electricity_china', 'Électricité Chine', 'Mix électrique chinois', 0.57, 'tCO2e/MWh', 'energy', 'electricity_mix', 'China Electricity Council', 2024),
('electricity_default', 'Électricité (défaut)', 'Mix électrique moyen mondial', 0.55, 'tCO2e/MWh', 'energy', 'electricity_mix', 'IEA - World Energy Outlook', 2024),

-- Autres énergies
('natural_gas', 'Gaz naturel', 'Combustion gaz naturel', 0.184, 'tCO2e/MWh', 'energy', 'fossil_fuels', 'ADEME - Base Carbone', 2024),
('liquid_fuel', 'Combustibles liquides', 'Combustibles liquides moyens', 2.31, 'tCO2e/m3', 'energy', 'fossil_fuels', 'ADEME - Base Carbone', 2024),

-- Transport
('transport_truck', 'Transport routier', 'Fret routier', 0.000062, 'tCO2e/tonne/km', 'transport', 'freight', 'ADEME - Base Carbone', 2024),
('transport_ship', 'Transport maritime', 'Fret maritime', 0.000014, 'tCO2e/tonne/km', 'transport', 'freight', 'IMO - Maritime emissions', 2024),
('transport_air', 'Transport aérien', 'Fret aérien', 0.000602, 'tCO2e/tonne/km', 'transport', 'freight', 'ICAO - Aviation emissions', 2024)

ON CONFLICT (slug) DO UPDATE SET
  emission_factor = EXCLUDED.emission_factor,
  nom_affiche = EXCLUDED.nom_affiche,
  factor_name = EXCLUDED.factor_name,
  updated_at = now();