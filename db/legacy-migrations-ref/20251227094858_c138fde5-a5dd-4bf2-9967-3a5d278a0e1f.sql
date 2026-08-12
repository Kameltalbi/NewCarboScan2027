-- Supprimer le rôle superadmin de kameltalbi.tn@gmail.com
-- Cet utilisateur est propriétaire de l'organisation KAT, pas un superadmin
DELETE FROM public.user_roles 
WHERE user_id = 'f0df88c8-cb72-47a6-8631-5cc09627a38d' 
AND role = 'superadmin';