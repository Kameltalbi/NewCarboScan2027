-- Créer la table pour tracker les tentatives de connexion
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table pour les IP bloquées
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unblocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur les tables
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les superadmins seulement
CREATE POLICY "Superadmins can view all login attempts" 
ON public.login_attempts 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can manage blocked IPs" 
ON public.blocked_ips 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Fonction pour vérifier si une IP est bloquée
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip_address INET)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_ips
    WHERE ip_address = _ip_address
      AND unblocked_at > now()
  )
$$;

-- Fonction pour enregistrer une tentative de connexion
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  _ip_address INET,
  _email TEXT DEFAULT NULL,
  _success BOOLEAN DEFAULT false,
  _user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Fonction pour débloquer une IP (pour les admins)
CREATE OR REPLACE FUNCTION public.unblock_ip(_ip_address INET)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.blocked_ips WHERE ip_address = _ip_address;
$$;

-- Index pour améliorer les performances
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempt_time DESC);
CREATE INDEX idx_blocked_ips_unblock_time ON public.blocked_ips(unblocked_at);

-- Nettoyage automatique des anciennes tentatives (garde 30 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.login_attempts 
  WHERE attempt_time < now() - INTERVAL '30 days';
  
  DELETE FROM public.blocked_ips 
  WHERE unblocked_at < now();
$$;