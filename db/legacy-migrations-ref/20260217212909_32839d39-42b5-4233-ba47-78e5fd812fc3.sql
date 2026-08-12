-- Attribuer l'année 2025 (incluse/gratuite) à toutes les organisations existantes
INSERT INTO public.organization_years (organization_id, year, is_included)
SELECT id, 2025, true FROM public.organizations
ON CONFLICT (organization_id, year) DO NOTHING;