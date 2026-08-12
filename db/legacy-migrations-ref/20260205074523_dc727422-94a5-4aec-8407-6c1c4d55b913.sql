-- Corriger le facteur d'émission "Achat de services externes" à 0.180 kgCO2e/TND
UPDATE emission_factors
SET 
  emission_factor = 0.180,
  unit = 'kgCO2e/TND',
  updated_at = now()
WHERE id = 'e98360a6-3b7d-41da-8365-923dacb8e783';