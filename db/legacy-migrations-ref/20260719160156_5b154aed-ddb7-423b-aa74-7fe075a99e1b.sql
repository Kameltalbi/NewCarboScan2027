
-- Activer WattBim pour l'organisation KTC
INSERT INTO public.organization_modules (org_id, module_id, active, started_at)
VALUES ('c29398ab-18e3-433e-b951-88725af490e7', '87cc5f04-4c72-4a54-867a-f541ef40fbf0', true, now())
ON CONFLICT (org_id, module_id) DO UPDATE SET active = true;

-- Créer le bâtiment "Maison"
INSERT INTO public.wattbim_buildings (organization_id, name, building_type, is_active)
VALUES ('c29398ab-18e3-433e-b951-88725af490e7', 'Maison', 'mixed', true)
ON CONFLICT DO NOTHING;

-- Créer 2 compteurs Shelly EM (Général + Clim)
WITH b AS (
  SELECT id FROM public.wattbim_buildings
  WHERE organization_id = 'c29398ab-18e3-433e-b951-88725af490e7' AND name = 'Maison'
  LIMIT 1
)
INSERT INTO public.wattbim_meters (organization_id, building_id, name, meter_type, unit, provider, external_id, is_active)
SELECT 'c29398ab-18e3-433e-b951-88725af490e7', b.id, m.name, 'elec', 'kWh', 'STEG', m.ext, true
FROM b, (VALUES
  ('Général — arrivée STEG', 'maison-general'),
  ('Climatisation', 'maison-clim')
) AS m(name, ext)
ON CONFLICT DO NOTHING;

-- Clé API pour ingestion Shelly (hash SHA-256 du token en clair)
-- Token en clair : wbk_ktc_maison_9f4a7c2b8e1d3f5a
INSERT INTO public.wattbim_api_keys (organization_id, name, key_prefix, key_hash, is_active)
VALUES (
  'c29398ab-18e3-433e-b951-88725af490e7',
  'Maison — Shelly EM',
  'wbk_ktc_',
  encode(digest('wbk_ktc_maison_9f4a7c2b8e1d3f5a', 'sha256'), 'hex'),
  true
)
ON CONFLICT DO NOTHING;
