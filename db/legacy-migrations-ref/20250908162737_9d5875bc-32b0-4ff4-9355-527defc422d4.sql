-- Mettre à jour les traductions avec de meilleures options pour les secteurs
UPDATE public.questionnaire_translations 
SET description = 'Agriculture, Industrie, BTP, Commerce, Transport, Restauration, Services, Santé, Éducation, Technologie, Finance, Immobilier, Énergie, Administration, Autre'
WHERE questionnaire_id = (
  SELECT id FROM public.questionnaires WHERE question_key = 'main_sector'
) AND language_code = 'fr';