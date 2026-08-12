-- Migration pour ajouter le rôle superadmin à un utilisateur spécifique
-- Remplacez l'UUID ci-dessous par l'ID de l'utilisateur superadmin

-- Option 1: Ajouter le rôle superadmin à un utilisateur spécifique (remplacez l'UUID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('f0df88c8-cb72-47a6-8631-5cc09627a38d', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2: Si vous voulez ajouter le rôle superadmin basé sur l'email
-- Remplacez 'admin@carboscan.com' par l'email du superadmin
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'superadmin'::app_role
-- FROM auth.users
-- WHERE email = 'admin@carboscan.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

