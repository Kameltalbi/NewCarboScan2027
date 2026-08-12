-- Ajouter tous les facteurs d'impact manquants pour l'analyse ACV

-- Aluminium avec unité 't' (en plus de 'ton')
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Aluminum', 't', 'Materiaux', 8100, 85, 20);

-- Verre avec unité 't' (en plus de 'ton') 
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Glass', 't', 'Materiaux', 850, 12, 1.5);

-- Bois
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Wood', 'm³', 'Materiaux', 120, 1.2, 0.5);

-- Plastique PP
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Plastic_PP', 'kg', 'Materiaux', 1.9, 0.008, 0.002);

-- Carton
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Cardboard', 'kg', 'Materiaux', 0.7, 0.004, 0.015);

-- Gaz naturel
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Natural_Gas', 'm³', 'Energie', 2.0, 0.001, 0.0005);

-- Transport par camion
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Truck_tkm', 't.km', 'Transport', 0.062, 0.0003, 0.00001);

-- Eau du robinet
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Tap_Water', 'm³', 'Eau', 0.3, 0.001, 1.0);