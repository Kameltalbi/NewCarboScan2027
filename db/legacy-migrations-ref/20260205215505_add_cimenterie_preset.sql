-- Ajout du preset "Cimenterie" - secteur très intensif en carbone
-- Catégories Scope 3 spécifiques à l'industrie cimentière

INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'cimenterie',
  'Cimenterie',
  ARRAY[
    'cat1_purchased_goods',      -- Calcaire, argile, gypse, additifs, clinker importé
    'cat2_capital_goods',        -- Fours rotatifs, broyeurs, équipements lourds
    'cat3_fuel_energy',          -- Combustibles (MAJEUR : charbon, pet coke, déchets)
    'cat4_upstream_transport',   -- Transport matières premières (carrières)
    'cat5_waste',                -- Poussières, déchets industriels
    'cat6_business_travel',      -- Déplacements professionnels
    'cat7_commuting',            -- Trajets domicile-travail
    'cat9_downstream_transport', -- Transport ciment vers clients (SIGNIFICATIF)
    'cat10_processing',          -- Transformation par tiers (béton prêt à l'emploi)
    'cat11_use_of_products',     -- Utilisation du ciment (construction)
    'cat12_end_of_life'          -- Fin de vie des ouvrages en béton
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();
