-- Améliorer la fonction get_user_role pour retourner 'user' par défaut au lieu de NULL
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role
     FROM public.user_roles
     WHERE user_id = _user_id
     ORDER BY CASE 
       WHEN role = 'superadmin' THEN 1
       WHEN role = 'admin' THEN 2
       WHEN role = 'user' THEN 3
     END
     LIMIT 1),
    'user'::app_role
  )
$$;

