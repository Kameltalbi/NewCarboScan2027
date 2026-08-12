-- Fix: the custom emission factor was inserted for the wrong organization_id
-- It must match activity_data.organization_id (used by the dashboard calculators)

UPDATE public.organization_emission_factors
SET organization_id = 'f6be0e09-d6a6-4aa6-b6ae-13f05d92232b',
    updated_at = now()
WHERE id = 'c4b7835f-6c60-4db6-ab86-513bd07b583e';

-- Safety check: ensure the activity unit remains t.km for the t·km FE
UPDATE public.activity_data
SET unit = 't.km',
    updated_at = now()
WHERE id = 'b8384859-bfb5-4015-b3f9-a65f4a5643ad';