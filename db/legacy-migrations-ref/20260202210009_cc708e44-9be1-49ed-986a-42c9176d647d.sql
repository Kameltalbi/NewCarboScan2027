-- Ajouter les facteurs d'émission pour les voyages d'affaires (Scope 3 Cat 6)
INSERT INTO emission_factors (slug, factor_name, nom_affiche, category, subcategory, emission_factor, unit, source, year)
VALUES 
  -- Vol court courrier (< 1500 km) - ADEME Base Carbone
  ('cat6_flight_short', 'Vol avion court-courrier', 'Avion court-courrier (<1500km)', 'business_travel', 'cat6_business_travel:cat6_flight_short', 0.255, 'kg CO₂e/km.passager', 'ADEME Base Carbone 2023', 2023),
  -- Vol moyen courrier (1500-3500 km)
  ('cat6_flight_medium', 'Vol avion moyen-courrier', 'Avion moyen-courrier (1500-3500km)', 'business_travel', 'cat6_business_travel:cat6_flight_medium', 0.187, 'kg CO₂e/km.passager', 'ADEME Base Carbone 2023', 2023),
  -- Vol long courrier (> 3500 km)
  ('cat6_flight_long', 'Vol avion long-courrier', 'Avion long-courrier (>3500km)', 'business_travel', 'cat6_business_travel:cat6_flight_long', 0.152, 'kg CO₂e/km.passager', 'ADEME Base Carbone 2023', 2023),
  -- Train
  ('cat6_train', 'Train voyages affaires', 'Train', 'business_travel', 'cat6_business_travel:cat6_train', 0.0036, 'kg CO₂e/km.passager', 'ADEME Base Carbone 2023', 2023),
  -- Voiture de location
  ('cat6_rental_car', 'Voiture de location', 'Voiture de location', 'business_travel', 'cat6_business_travel:cat6_rental_car', 0.193, 'kg CO₂e/km', 'ADEME Base Carbone 2023', 2023),
  -- Taxi
  ('cat6_taxi', 'Taxi voyages affaires', 'Taxi', 'business_travel', 'cat6_business_travel:cat6_taxi', 0.193, 'kg CO₂e/km', 'ADEME Base Carbone 2023', 2023),
  -- Hôtel
  ('cat6_hotel', 'Nuitée hôtel', 'Hôtel', 'business_travel', 'cat6_business_travel:cat6_hotel', 6.9, 'kg CO₂e/nuit', 'ADEME Base Carbone 2023', 2023)
ON CONFLICT (slug) DO NOTHING;