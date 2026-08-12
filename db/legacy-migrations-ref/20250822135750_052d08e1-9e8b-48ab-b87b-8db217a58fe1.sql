-- Corriger les fonctions avec search_path pour la sécurité
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip_address INET)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_ips
    WHERE ip_address = _ip_address
      AND unblocked_at > now()
  )
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  _ip_address INET,
  _email TEXT DEFAULT NULL,
  _success BOOLEAN DEFAULT false,
  _user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INTEGER;
BEGIN
  -- Enregistrer la tentative
  INSERT INTO public.login_attempts (ip_address, email, success, user_agent)
  VALUES (_ip_address, _email, _success, _user_agent);
  
  -- Si la tentative a échoué, vérifier s'il faut bloquer l'IP
  IF NOT _success THEN
    -- Compter les tentatives échouées dans les dernières 24 heures
    SELECT COUNT(*)
    INTO failed_attempts
    FROM public.login_attempts
    WHERE ip_address = _ip_address
      AND success = false
      AND attempt_time > now() - INTERVAL '24 hours';
    
    -- Si 3 tentatives ou plus, bloquer l'IP
    IF failed_attempts >= 3 THEN
      INSERT INTO public.blocked_ips (ip_address, unblocked_at, attempts_count)
      VALUES (_ip_address, now() + INTERVAL '24 hours', failed_attempts)
      ON CONFLICT (ip_address) DO UPDATE SET
        blocked_at = now(),
        unblocked_at = now() + INTERVAL '24 hours',
        attempts_count = failed_attempts;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_ip(_ip_address INET)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.blocked_ips WHERE ip_address = _ip_address;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_attempts 
  WHERE attempt_time < now() - INTERVAL '30 days';
  
  DELETE FROM public.blocked_ips 
  WHERE unblocked_at < now();
$$;