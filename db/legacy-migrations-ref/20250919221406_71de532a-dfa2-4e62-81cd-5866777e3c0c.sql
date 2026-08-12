-- Synchroniser les facteurs d'impact avec les items d'inventaire et valeurs fournies

-- Aluminium (t)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Aluminum', 't', 'Materiaux', 8000, 85, 20)
ON CONFLICT (item) DO UPDATE SET
  unit = 't',
  category = 'Materiaux',
  climate_co2e = EXCLUDED.climate_co2e,
  acidification_so2e = EXCLUDED.acidification_so2e,
  water_m3 = EXCLUDED.water_m3;

-- Verre (t)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Glass', 't', 'Materiaux', 600, 12, 1.5)
ON CONFLICT (item) DO UPDATE SET
  unit = 't',
  category = 'Materiaux',
  climate_co2e = EXCLUDED.climate_co2e,
  acidification_so2e = EXCLUDED.acidification_so2e,
  water_m3 = EXCLUDED.water_m3;

-- Bois (m³)
UPDATE impact_factors SET unit = 'm³', category = 'Materiaux', climate_co2e = 400
WHERE item IN ('Bois','Wood');

-- Plastique PP (kg)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Plastic_PP', 'kg', 'Materiaux', 2.0, 0.008, 0.002)
ON CONFLICT (item) DO NOTHING;

-- Carton (kg)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Cardboard', 'kg', 'Materiaux', 1.1, 0.004, 0.015)
ON CONFLICT (item) DO NOTHING;

-- Gaz naturel (m3)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Natural_Gas', 'm3', 'Energie', 2.0, 0.001, 0.0005)
ON CONFLICT (item) DO UPDATE SET
  unit = 'm3', category = 'Energie', climate_co2e = 2.0, acidification_so2e = 0.001, water_m3 = 0.0005;

-- Transport routier (t.km)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Truck_tkm', 't.km', 'Transport', 0.12, 0.0003, 0.00001)
ON CONFLICT (item) DO UPDATE SET
  unit = 't.km', category = 'Transport', climate_co2e = 0.12, acidification_so2e = 0.0003, water_m3 = 0.00001;

-- Eau du robinet (m3)
INSERT INTO impact_factors (item, unit, category, climate_co2e, acidification_so2e, water_m3)
VALUES ('Tap_Water', 'm3', 'Eau', 0.3, 0.001, 1.0)
ON CONFLICT (item) DO UPDATE SET
  unit = 'm3', category = 'Eau', climate_co2e = 0.3, acidification_so2e = 0.001, water_m3 = 1.0;