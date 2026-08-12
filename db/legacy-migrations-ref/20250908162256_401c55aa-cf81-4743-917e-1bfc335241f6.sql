-- Mettre à jour les questions avec les facteurs d'émissions appropriés
UPDATE public.questionnaires 
SET emission_factor_slug = 'natural_gas' 
WHERE question_key = 'natural_gas_consumption';

UPDATE public.questionnaires 
SET emission_factor_slug = 'diesel' 
WHERE question_key = 'fuel_oil_consumption';

UPDATE public.questionnaires 
SET emission_factor_slug = 'diesel' 
WHERE question_key IN ('gasoline_consumption', 'diesel_consumption');

UPDATE public.questionnaires 
SET emission_factor_slug = 'electricite_france' 
WHERE question_key = 'total_electricity_consumption';

UPDATE public.questionnaires 
SET emission_factor_slug = 'gaz_froid_r134a' 
WHERE question_key IN ('total_refrigerant_charge', 'annual_refrigerant_leakage');