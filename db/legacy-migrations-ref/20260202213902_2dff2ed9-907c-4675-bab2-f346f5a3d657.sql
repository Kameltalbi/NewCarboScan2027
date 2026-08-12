-- Mettre à jour le facteur cat6_flight_short avec la bonne valeur 0.158
UPDATE emission_factors 
SET emission_factor = 0.158,
    updated_at = now()
WHERE slug = 'cat6_flight_short';

-- Supprimer le doublon vol_court_courrier_km car cat6_flight_short est utilisé par le système
-- DELETE FROM emission_factors WHERE slug = 'vol_court_courrier_km';