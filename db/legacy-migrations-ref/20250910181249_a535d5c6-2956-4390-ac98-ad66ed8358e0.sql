-- Créer une table pour suivre l'utilisation des analyses ACV
CREATE TABLE public.acv_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  analyses_limit INTEGER NOT NULL DEFAULT 2,
  contact_form_filled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acv_usage ENABLE ROW LEVEL SECURITY;

-- Policies pour permettre aux utilisateurs de gérer leurs propres données
CREATE POLICY "Users can view their own ACV usage" 
ON public.acv_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ACV usage" 
ON public.acv_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ACV usage" 
ON public.acv_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Superadmins peuvent voir toutes les données
CREATE POLICY "Superadmins can view all ACV usage" 
ON public.acv_usage 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Fonction pour obtenir l'utilisation ACV d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_acv_usage(_user_id UUID)
RETURNS TABLE(
  analyses_used INTEGER,
  analyses_limit INTEGER,
  analyses_remaining INTEGER,
  can_create_new BOOLEAN,
  contact_form_filled BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  usage_record RECORD;
BEGIN
  -- Chercher l'enregistrement d'utilisation existant
  SELECT 
    u.analyses_used,
    u.analyses_limit,
    u.contact_form_filled
  INTO usage_record
  FROM public.acv_usage u
  WHERE u.user_id = _user_id
  LIMIT 1;

  -- Si aucun enregistrement trouvé, créer un nouveau
  IF NOT FOUND THEN
    INSERT INTO public.acv_usage (user_id, analyses_used, analyses_limit, contact_form_filled)
    VALUES (_user_id, 0, 2, false)
    RETURNING analyses_used, analyses_limit, contact_form_filled INTO usage_record;
  END IF;

  -- Retourner les résultats
  RETURN QUERY SELECT 
    usage_record.analyses_used::INTEGER,
    usage_record.analyses_limit::INTEGER,
    GREATEST(usage_record.analyses_limit - usage_record.analyses_used, 0)::INTEGER,
    (usage_record.analyses_used < usage_record.analyses_limit)::BOOLEAN,
    usage_record.contact_form_filled::BOOLEAN;
END;
$$;

-- Fonction pour incrémenter l'utilisation ACV
CREATE OR REPLACE FUNCTION public.increment_acv_usage(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.acv_usage (user_id, analyses_used, analyses_limit, contact_form_filled)
  VALUES (_user_id, 1, 2, false)
  ON CONFLICT (user_id) DO UPDATE SET
    analyses_used = acv_usage.analyses_used + 1,
    updated_at = now()
  WHERE acv_usage.user_id = _user_id;
END;
$$;

-- Fonction pour marquer le formulaire de contact comme rempli
CREATE OR REPLACE FUNCTION public.mark_contact_form_filled(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.acv_usage (user_id, analyses_used, analyses_limit, contact_form_filled)
  VALUES (_user_id, 0, 2, true)
  ON CONFLICT (user_id) DO UPDATE SET
    contact_form_filled = true,
    updated_at = now()
  WHERE acv_usage.user_id = _user_id;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_acv_usage_updated_at
BEFORE UPDATE ON public.acv_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter un index unique sur user_id
CREATE UNIQUE INDEX idx_acv_usage_user_id ON public.acv_usage(user_id);