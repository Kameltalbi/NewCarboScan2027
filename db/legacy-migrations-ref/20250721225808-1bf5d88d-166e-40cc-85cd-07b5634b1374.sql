-- Ajouter 'bilan_carbone' comme type de questionnaire valide
ALTER TABLE public.questionnaire_responses 
DROP CONSTRAINT questionnaire_responses_questionnaire_type_check;

ALTER TABLE public.questionnaire_responses 
ADD CONSTRAINT questionnaire_responses_questionnaire_type_check 
CHECK (questionnaire_type = ANY (ARRAY['carbo_start'::text, 'carbo_pro'::text, 'basic_calculator'::text, 'bilan_carbone'::text]));