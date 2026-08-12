-- Mettre à jour le facteur d'émission de l'électricité à 0,58 kg CO₂e/kWh
UPDATE emission_factors 
SET emission_factor = 0.58, 
    updated_at = now()
WHERE slug = 'electricite';