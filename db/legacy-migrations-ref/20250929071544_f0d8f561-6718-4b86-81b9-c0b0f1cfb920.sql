-- Modifier la politique d'insertion des commandes pour permettre les demandes Pro sans connexion
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Nouvelle politique permettant l'insertion avec ou sans user_id pour les plans Pro
CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  -- Utilisateur connecté peut créer ses propres commandes
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  -- Utilisateurs non connectés peuvent créer des demandes Pro (user_id sera NULL)
  (auth.uid() IS NULL AND plan_type = 'pro' AND user_id IS NULL)
);

-- Modifier la colonne user_id pour autoriser NULL dans certains cas
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;