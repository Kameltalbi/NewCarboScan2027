-- Créer une table pour gérer les commandes et paiements
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'carbo_start',
  payment_method TEXT NOT NULL, -- 'virement', 'carte', 'cheque', 'espece', 'intermediaire'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'TND',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- SuperAdmin qui valide
  validated_at TIMESTAMPTZ,
  payment_details JSONB, -- Détails spécifiques au type de paiement
  user_data JSONB NOT NULL, -- Nom, email, téléphone, adresse de l'utilisateur
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all orders" 
ON public.orders 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update all orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Fonction pour vérifier si un utilisateur a un abonnement actif validé
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.user_id = _user_id
      AND o.status = 'validated'
      AND (
        -- Vérifier si l'abonnement n'est pas expiré (pour les abonnements futurs)
        o.validated_at IS NOT NULL
      )
  )
$$;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();