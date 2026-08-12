UPDATE public.organization_modules om
SET expires_at = now() + interval '1 year'
FROM public.modules m
WHERE m.id = om.module_id
  AND om.active = true
  AND om.expires_at IS NOT NULL
  AND om.expires_at <= now();