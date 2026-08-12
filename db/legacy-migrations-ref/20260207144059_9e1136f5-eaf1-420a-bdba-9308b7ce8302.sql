-- Supprimer le facteur d'émission personnalisé problématique
-- qui causait la confusion de calcul (mauvais organization_id initial)

DELETE FROM public.organization_emission_factors
WHERE id = 'c4b7835f-6c60-4db6-ab86-513bd07b583e';