
-- FAILLE 2 : carbon-reports - rendre privé (la policy SELECT existe déjà)
UPDATE storage.buckets SET public = false WHERE id = 'carbon-reports';

DROP POLICY IF EXISTS "Public can view carbon reports" ON storage.objects;

-- FAILLE 3 : acv_impact_factors
DROP POLICY IF EXISTS "Users can manage their own custom impact factors" ON public.acv_impact_factors;

CREATE POLICY "Users can manage their own custom impact factors" 
  ON public.acv_impact_factors 
  FOR ALL 
  TO public
  USING (auth.uid() = user_id AND user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);
