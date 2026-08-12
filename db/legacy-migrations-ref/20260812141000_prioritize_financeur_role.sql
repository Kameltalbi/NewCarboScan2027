-- Garantit que get_user_role retourne le rôle Financeur lorsqu'il est présent.
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE
    WHEN role = 'superadmin' THEN 1
    WHEN role = 'financeur' THEN 2
    WHEN role = 'admin' THEN 3
    WHEN role = 'blog_editor' THEN 4
    WHEN role = 'user' THEN 5
    ELSE 6
  END
  LIMIT 1
$$;
