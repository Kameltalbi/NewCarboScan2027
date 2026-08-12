-- Lecture globale strictement limitée aux données affichées dans le centre de pilotage.
CREATE POLICY "Financeurs can read companies"
  ON public.companies FOR SELECT
  USING (public.has_role(auth.uid(), 'financeur'::public.app_role));

CREATE POLICY "Financeurs can read profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'financeur'::public.app_role));

CREATE POLICY "Financeurs can read orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'financeur'::public.app_role));

CREATE POLICY "Financeurs can read contact requests"
  ON public.contact_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'financeur'::public.app_role));

-- Aucune policy INSERT/UPDATE/DELETE globale n'est accordée au rôle financeur.
-- Ses écritures dans l'application cliente restent limitées à ses propres données
-- par les policies utilisateur existantes.
