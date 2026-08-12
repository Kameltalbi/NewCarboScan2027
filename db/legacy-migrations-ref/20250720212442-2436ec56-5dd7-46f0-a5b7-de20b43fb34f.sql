-- Ajouter une contrainte unique sur user_id dans la table companies
-- pour permettre l'upsert et s'assurer qu'un utilisateur n'a qu'une seule entreprise
ALTER TABLE public.companies 
ADD CONSTRAINT companies_user_id_unique UNIQUE (user_id);