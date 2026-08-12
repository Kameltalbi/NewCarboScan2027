-- Clear existing carbo_start data first
DELETE FROM public.questionnaire_translations 
WHERE questionnaire_id IN (
  SELECT id FROM public.questionnaires WHERE plan_type = 'carbo_start'
);

DELETE FROM public.questionnaires WHERE plan_type = 'carbo_start';

-- Insert CarboTrack Scope 1 & 2 questions
-- 🏢 Informations générales (6 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, question_key, input_type, order_index) VALUES
('carbo_start', NULL, 'general', 'company_name', 'text', 1),
('carbo_start', NULL, 'general', 'main_sector', 'select', 2),
('carbo_start', NULL, 'general', 'employee_count', 'number', 3),
('carbo_start', NULL, 'general', 'site_count', 'number', 4),
('carbo_start', NULL, 'general', 'site_locations', 'text', 5),
('carbo_start', NULL, 'general', 'total_surface', 'number', 6);

-- 🔥 Scope 1 – Émissions directes
-- A. Combustion fixe (10 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, subcategory, question_key, input_type, unit, order_index, options) VALUES
('carbo_start', 1, 'combustion_fixe', 'heating', 'heating_fuels', 'multiselect', NULL, 7, '["gaz", "fioul", "biomasse", "gpl", "electricite"]'::jsonb),
('carbo_start', 1, 'combustion_fixe', 'heating', 'natural_gas_consumption', 'number', 'm³', 8, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'fuel_oil_consumption', 'number', 'litres', 9, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'lpg_consumption', 'number', 'kg', 10, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'biomass_consumption', 'number', 'kg', 11, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'has_dedicated_boilers', 'boolean', NULL, 12, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'boiler_efficiency', 'number', '%', 13, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'has_cogeneration', 'boolean', NULL, 14, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'cogeneration_consumption', 'number', 'kWh', 15, NULL),
('carbo_start', 1, 'combustion_fixe', 'heating', 'backup_generators_consumption', 'number', 'litres', 16, NULL);

-- B. Combustion mobile (flotte interne) (12 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, subcategory, question_key, input_type, unit, order_index, options) VALUES
('carbo_start', 1, 'combustion_mobile', 'fleet', 'total_vehicles', 'number', NULL, 17, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'vehicle_breakdown', 'multiselect', NULL, 18, '["voitures", "utilitaires", "poids_lourds", "engins"]'::jsonb),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'fuel_types_by_category', 'multiselect', NULL, 19, '["essence", "diesel", "gpl", "electrique"]'::jsonb),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'gasoline_consumption', 'number', 'litres', 20, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'diesel_consumption', 'number', 'litres', 21, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'lpg_vehicle_consumption', 'number', 'litres', 22, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'electric_vehicle_consumption', 'number', 'kWh', 23, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'light_vehicle_mileage', 'number', 'km', 24, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'utility_vehicle_mileage', 'number', 'km', 25, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'heavy_vehicle_mileage', 'number', 'km', 26, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'has_gps_tracking', 'boolean', NULL, 27, NULL),
('carbo_start', 1, 'combustion_mobile', 'fleet', 'has_low_carbon_plan', 'boolean', NULL, 28, NULL);

-- C. Gaz réfrigérants (5 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, subcategory, question_key, input_type, unit, order_index, options) VALUES
('carbo_start', 1, 'gaz_refrigerants', 'cooling', 'has_individual_ac', 'boolean', NULL, 29, NULL),
('carbo_start', 1, 'gaz_refrigerants', 'cooling', 'has_centralized_cooling', 'boolean', NULL, 30, NULL),
('carbo_start', 1, 'gaz_refrigerants', 'cooling', 'refrigerant_types', 'multiselect', NULL, 31, '["R410A", "R134a", "R404A", "R32", "autre"]'::jsonb),
('carbo_start', 1, 'gaz_refrigerants', 'cooling', 'total_refrigerant_charge', 'number', 'kg', 32, NULL),
('carbo_start', 1, 'gaz_refrigerants', 'cooling', 'annual_refrigerant_leakage', 'number', 'kg', 33, NULL);

-- ⚡ Scope 2 – Émissions indirectes
-- A. Électricité achetée (6 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, subcategory, question_key, input_type, unit, order_index) VALUES
('carbo_start', 2, 'electricite', 'purchased', 'total_electricity_consumption', 'number', 'kWh', 34),
('carbo_start', 2, 'electricite', 'purchased', 'electricity_by_site', 'text', NULL, 35),
('carbo_start', 2, 'electricite', 'purchased', 'has_sub_meters', 'boolean', NULL, 36),
('carbo_start', 2, 'electricite', 'purchased', 'has_green_electricity_option', 'boolean', NULL, 37),
('carbo_start', 2, 'electricite', 'purchased', 'green_electricity_percentage', 'number', '%', 38),
('carbo_start', 2, 'electricite', 'purchased', 'has_solar_panels', 'boolean', NULL, 39);

-- B. Autres énergies achetées (2 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, subcategory, question_key, input_type, unit, order_index) VALUES
('carbo_start', 2, 'autres_energies', 'purchased', 'buys_heat_steam_cooling', 'boolean', NULL, 40),
('carbo_start', 2, 'autres_energies', 'purchased', 'heat_steam_cooling_quantity', 'number', 'MWh', 41);

-- 🗂️ Données complémentaires (3 questions)
INSERT INTO public.questionnaires (plan_type, scope, category, question_key, input_type, order_index) VALUES
('carbo_start', NULL, 'donnees_complementaires', 'has_automated_monitoring', 'boolean', 42),
('carbo_start', NULL, 'donnees_complementaires', 'has_centralized_billing', 'boolean', 43),
('carbo_start', NULL, 'donnees_complementaires', 'wants_ratios', 'boolean', 44);

-- Insert French translations
INSERT INTO public.questionnaire_translations (questionnaire_id, language_code, question_text, description, placeholder) 
SELECT id, 'fr', 
  CASE question_key
    -- Informations générales
    WHEN 'company_name' THEN 'Nom de l''entreprise'
    WHEN 'main_sector' THEN 'Secteur d''activité principal'
    WHEN 'employee_count' THEN 'Nombre de collaborateurs'
    WHEN 'site_count' THEN 'Nombre de sites (usines, bureaux, dépôts, points de vente, etc.)'
    WHEN 'site_locations' THEN 'Localisation des sites (ville/pays)'
    WHEN 'total_surface' THEN 'Surface totale occupée (m²)'
    
    -- Combustion fixe
    WHEN 'heating_fuels' THEN 'Quels combustibles utilisez-vous pour le chauffage ?'
    WHEN 'natural_gas_consumption' THEN 'Consommation annuelle de gaz naturel'
    WHEN 'fuel_oil_consumption' THEN 'Consommation annuelle de fioul domestique/fuel lourd'
    WHEN 'lpg_consumption' THEN 'Consommation annuelle de GPL'
    WHEN 'biomass_consumption' THEN 'Consommation annuelle de biomasse (bois, pellets, etc.)'
    WHEN 'has_dedicated_boilers' THEN 'Avez-vous des chaudières dédiées ?'
    WHEN 'boiler_efficiency' THEN 'Quel est leur rendement moyen ?'
    WHEN 'has_cogeneration' THEN 'Disposez-vous d''une cogénération ou centrale thermique interne ?'
    WHEN 'cogeneration_consumption' THEN 'Consommation annuelle associée à ces installations'
    WHEN 'backup_generators_consumption' THEN 'Consommation annuelle des générateurs de secours'
    
    -- Combustion mobile
    WHEN 'total_vehicles' THEN 'Nombre total de véhicules détenus par l''entreprise'
    WHEN 'vehicle_breakdown' THEN 'Répartition par catégorie'
    WHEN 'fuel_types_by_category' THEN 'Type de carburant par catégorie'
    WHEN 'gasoline_consumption' THEN 'Consommation annuelle en essence'
    WHEN 'diesel_consumption' THEN 'Consommation annuelle en diesel'
    WHEN 'lpg_vehicle_consumption' THEN 'Consommation annuelle en GPL'
    WHEN 'electric_vehicle_consumption' THEN 'Consommation annuelle en électricité pour véhicules'
    WHEN 'light_vehicle_mileage' THEN 'Kilométrage annuel moyen par véhicule léger'
    WHEN 'utility_vehicle_mileage' THEN 'Kilométrage annuel moyen par utilitaire'
    WHEN 'heavy_vehicle_mileage' THEN 'Kilométrage annuel moyen par poids lourd'
    WHEN 'has_gps_tracking' THEN 'Avez-vous un suivi GPS ou télématique pour suivre la flotte ?'
    WHEN 'has_low_carbon_plan' THEN 'Disposez-vous d''un plan de renouvellement vers véhicules bas-carbone ?'
    
    -- Gaz réfrigérants
    WHEN 'has_individual_ac' THEN 'Avez-vous des climatiseurs individuels ?'
    WHEN 'has_centralized_cooling' THEN 'Avez-vous des installations de froid centralisé ou chambres froides ?'
    WHEN 'refrigerant_types' THEN 'Type(s) de fluide(s) frigorigènes utilisés'
    WHEN 'total_refrigerant_charge' THEN 'Quantité totale de charge par type de fluide'
    WHEN 'annual_refrigerant_leakage' THEN 'Quantité moyenne de recharge ou fuite annuelle'
    
    -- Électricité
    WHEN 'total_electricity_consumption' THEN 'Consommation annuelle totale d''électricité'
    WHEN 'electricity_by_site' THEN 'Répartition de la consommation par site'
    WHEN 'has_sub_meters' THEN 'Disposez-vous de sous-compteurs pour identifier les postes ?'
    WHEN 'has_green_electricity_option' THEN 'Votre fournisseur propose-t-il une option "électricité verte" ?'
    WHEN 'green_electricity_percentage' THEN 'Quel pourcentage d''électricité verte est souscrit ?'
    WHEN 'has_solar_panels' THEN 'Disposez-vous de panneaux photovoltaïques ou d''énergies renouvelables en autoconsommation ?'
    
    -- Autres énergies
    WHEN 'buys_heat_steam_cooling' THEN 'Achetez-vous de la chaleur, vapeur ou froid auprès d''un tiers ?'
    WHEN 'heat_steam_cooling_quantity' THEN 'Quantité annuelle achetée'
    
    -- Données complémentaires
    WHEN 'has_automated_monitoring' THEN 'Disposez-vous d''un suivi énergétique automatisé ?'
    WHEN 'has_centralized_billing' THEN 'Vos factures énergétiques sont-elles centralisées par site ?'
    WHEN 'wants_ratios' THEN 'Souhaitez-vous calculer des ratios (kgCO₂e par m², par employé, par chiffre d''affaires) ?'
  END,
  CASE question_key
    WHEN 'heating_fuels' THEN 'Gaz, Fioul, Biomasse, GPL, etc.'
    WHEN 'vehicle_breakdown' THEN 'voitures, utilitaires, poids lourds, engins'
    WHEN 'fuel_types_by_category' THEN 'Essence/Diesel/GPL/Électrique'
    WHEN 'refrigerant_types' THEN 'R410A, R134a, etc.'
    ELSE NULL
  END,
  CASE question_key
    WHEN 'company_name' THEN 'Ex: Carbo Solutions SARL'
    WHEN 'employee_count' THEN 'Nombre exact'
    WHEN 'total_surface' THEN 'Surface en m²'
    WHEN 'natural_gas_consumption' THEN 'Consommation en m³ ou kWh'
    WHEN 'fuel_oil_consumption' THEN 'Consommation en litres ou tonnes'
    ELSE NULL
  END
FROM public.questionnaires 
WHERE plan_type = 'carbo_start';