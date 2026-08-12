-- Mettre à jour les facteurs d'impact avec les valeurs correctes

-- Mettre à jour Aluminium (t)
UPDATE impact_factors 
SET climate_co2e = 8000, acidification_so2e = 85, water_m3 = 20
WHERE item = 'Aluminum_t' AND unit = 't';

-- Mettre à jour Verre (t)
UPDATE impact_factors 
SET climate_co2e = 600, acidification_so2e = 12, water_m3 = 1.5
WHERE item = 'Glass_t' AND unit = 't';

-- Mettre à jour Bois (m³)
UPDATE impact_factors 
SET climate_co2e = 400, acidification_so2e = 2.5, water_m3 = 0.8, unit = 'm³'
WHERE item = 'Bois';

-- Mettre à jour Plastique PP (kg)
UPDATE impact_factors 
SET climate_co2e = 2.0, acidification_so2e = 0.008, water_m3 = 0.002
WHERE item = 'Plastic_PP' AND unit = 'kg';

-- Mettre à jour Carton (kg)
UPDATE impact_factors 
SET climate_co2e = 1.1, acidification_so2e = 0.004, water_m3 = 0.015
WHERE item = 'Cardboard' AND unit = 'kg';

-- Mettre à jour Transport routier (t.km)
UPDATE impact_factors 
SET climate_co2e = 0.12, acidification_so2e = 0.0003, water_m3 = 0.00001
WHERE item = 'Truck_tkm' AND unit = 't.km';