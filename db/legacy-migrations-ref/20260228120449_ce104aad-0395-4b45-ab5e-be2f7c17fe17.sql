
ALTER TABLE public.organization_emission_factors
  DROP CONSTRAINT organization_emission_factors_created_by_fkey,
  ADD CONSTRAINT organization_emission_factors_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
