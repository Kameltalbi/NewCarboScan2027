-- Ajouter le facteur d'impact pour le béton (Concrete) 
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Concrete', 'm³', 'Materiaux', 300, 0.15, 0.2);

-- Ajouter le facteur d'impact pour l'acier avec l'unité 't' (en plus de 'ton')
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3) VALUES
('Steel', 't', 'Materiaux', 1800, 4, 3);