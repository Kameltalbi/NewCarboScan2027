-- Ajouter les options pour le secteur d'activité principal
UPDATE public.questionnaires 
SET options = '[
  "agriculture", 
  "industrie", 
  "btp", 
  "commerce", 
  "transport", 
  "restauration", 
  "services", 
  "sante", 
  "education", 
  "technologie", 
  "finance", 
  "immobilier", 
  "energie", 
  "administration", 
  "autre"
]'::jsonb
WHERE question_key = 'main_sector';