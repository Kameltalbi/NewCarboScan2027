-- Mettre à jour les facteurs d'émission pour les questions d'électricité
UPDATE questionnaires 
SET emission_factor_slug = 'electricite' 
WHERE question_key = 'total_electricity_consumption';

-- Si le slug 'electricite' n'existe pas, utiliser un slug existant
UPDATE questionnaires 
SET emission_factor_slug = 'electricite_mix' 
WHERE question_key = 'total_electricity_consumption' 
  AND emission_factor_slug IS NULL;