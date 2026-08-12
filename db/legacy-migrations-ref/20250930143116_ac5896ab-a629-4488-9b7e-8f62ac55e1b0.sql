-- Ajouter les questions manquantes pour l'année d'étude et le CA annuel

-- Question pour l'année d'étude (après employee_count, avant site_count)
INSERT INTO questionnaires (
  plan_type,
  category,
  subcategory,
  question_key,
  input_type,
  unit,
  order_index,
  is_required
) VALUES (
  'carbo_start',
  'general',
  NULL,
  'study_year',
  'number',
  'année',
  4,
  true
);

-- Question pour le chiffre d'affaires annuel (après study_year, avant site_count)
INSERT INTO questionnaires (
  plan_type,
  category,
  subcategory,
  question_key,
  input_type,
  unit,
  order_index,
  is_required
) VALUES (
  'carbo_start',
  'general',
  NULL,
  'annual_revenue',
  'number',
  'TND',
  5,
  true
);

-- Mettre à jour les order_index des questions suivantes pour faire de la place
UPDATE questionnaires 
SET order_index = order_index + 2
WHERE plan_type = 'carbo_start' 
AND order_index >= 4
AND question_key NOT IN ('study_year', 'annual_revenue');

-- Ajouter les traductions en français pour l'année d'étude
INSERT INTO questionnaire_translations (
  questionnaire_id,
  language_code,
  question_text,
  description,
  help_text,
  placeholder
) 
SELECT 
  id,
  'fr',
  'Année d''étude pour le bilan carbone',
  'Indiquez l''année de référence pour laquelle vous souhaitez calculer votre bilan carbone',
  'Généralement l''année précédente (N-1)',
  'Ex: 2024'
FROM questionnaires 
WHERE question_key = 'study_year';

-- Ajouter les traductions en anglais pour l'année d'étude
INSERT INTO questionnaire_translations (
  questionnaire_id,
  language_code,
  question_text,
  description,
  help_text,
  placeholder
) 
SELECT 
  id,
  'en',
  'Study year for carbon assessment',
  'Indicate the reference year for which you want to calculate your carbon footprint',
  'Usually the previous year (N-1)',
  'Ex: 2024'
FROM questionnaires 
WHERE question_key = 'study_year';

-- Ajouter les traductions en français pour le CA annuel
INSERT INTO questionnaire_translations (
  questionnaire_id,
  language_code,
  question_text,
  description,
  help_text,
  placeholder
) 
SELECT 
  id,
  'fr',
  'Chiffre d''affaires de l''année étudiée',
  'Indiquez le chiffre d''affaires réalisé pendant l''année de référence',
  'Permet de calculer l''intensité carbone par CA',
  'Ex: 1500000'
FROM questionnaires 
WHERE question_key = 'annual_revenue';

-- Ajouter les traductions en anglais pour le CA annuel
INSERT INTO questionnaire_translations (
  questionnaire_id,
  language_code,
  question_text,
  description,
  help_text,
  placeholder
) 
SELECT 
  id,
  'en',
  'Annual revenue for study year',
  'Indicate the revenue generated during the reference year',
  'Used to calculate carbon intensity per revenue',
  'Ex: 1500000'
FROM questionnaires 
WHERE question_key = 'annual_revenue';