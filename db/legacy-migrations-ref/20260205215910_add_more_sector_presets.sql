-- Ajout de nouveaux presets secteurs d'activité

-- 1. Agroalimentaire (Transformation alimentaire)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'agroalimentaire',
  'Agroalimentaire',
  ARRAY[
    'cat1_purchased_goods',      -- Matières premières agricoles, ingrédients, emballages
    'cat2_capital_goods',        -- Équipements de production, chaîne du froid
    'cat3_fuel_energy',          -- Énergie process, froid industriel
    'cat4_upstream_transport',   -- Transport matières premières
    'cat5_waste',                -- Déchets alimentaires, emballages (SIGNIFICATIF)
    'cat6_business_travel',      -- Déplacements professionnels
    'cat7_commuting',            -- Trajets domicile-travail
    'cat9_downstream_transport', -- Distribution produits finis (chaîne du froid)
    'cat10_processing',          -- Transformation par tiers
    'cat11_use_of_products',     -- Conservation, cuisson par consommateurs
    'cat12_end_of_life'          -- Emballages, déchets alimentaires
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 2. Hôtellerie / Restauration (CHR)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'hotellerie_restauration',
  'Hôtellerie / Restauration',
  ARRAY[
    'cat1_purchased_goods',      -- Alimentation, boissons, linge, produits d'entretien
    'cat2_capital_goods',        -- Bâtiments, équipements cuisine, mobilier
    'cat3_fuel_energy',          -- Énergie bâtiments, cuisson, chauffage/clim
    'cat5_waste',                -- Déchets alimentaires (MAJEUR), emballages
    'cat6_business_travel',      -- Déplacements professionnels
    'cat7_commuting',            -- Trajets domicile-travail
    'cat8_upstream_leased'       -- Locaux loués
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 3. Chimie / Pharmacie
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'chimie_pharmacie',
  'Chimie / Pharmacie',
  ARRAY[
    'cat1_purchased_goods',      -- Matières premières chimiques, principes actifs
    'cat2_capital_goods',        -- Équipements industriels, laboratoires
    'cat3_fuel_energy',          -- Énergie process industriel
    'cat4_upstream_transport',   -- Transport matières dangereuses
    'cat5_waste',                -- Déchets dangereux, effluents (RÉGLEMENTÉ)
    'cat6_business_travel',      -- Déplacements professionnels, R&D
    'cat7_commuting',            -- Trajets domicile-travail
    'cat9_downstream_transport', -- Distribution produits
    'cat10_processing',          -- Sous-traitance fabrication
    'cat11_use_of_products',     -- Utilisation médicaments/produits chimiques
    'cat12_end_of_life'          -- Fin de vie produits (médicaments, chimie)
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 4. Textile / Mode
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'textile_mode',
  'Textile / Mode',
  ARRAY[
    'cat1_purchased_goods',      -- Tissus, fibres, accessoires (MAJEUR : 70-80% émissions)
    'cat2_capital_goods',        -- Machines, équipements production
    'cat3_fuel_energy',          -- Énergie production
    'cat4_upstream_transport',   -- Transport matières (souvent international)
    'cat5_waste',                -- Chutes textiles, emballages
    'cat6_business_travel',      -- Déplacements (sourcing, salons)
    'cat7_commuting',            -- Trajets domicile-travail
    'cat9_downstream_transport', -- Distribution vers retail
    'cat11_use_of_products',     -- Lavage, entretien vêtements (SIGNIFICATIF)
    'cat12_end_of_life'          -- Fin de vie textiles
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 5. Télécommunications
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'telecommunications',
  'Télécommunications',
  ARRAY[
    'cat1_purchased_goods',      -- Équipements réseau, terminaux, câbles
    'cat2_capital_goods',        -- Antennes, data centers, infrastructures
    'cat3_fuel_energy',          -- Énergie réseau, data centers (MAJEUR)
    'cat5_waste',                -- DEEE, équipements obsolètes
    'cat6_business_travel',      -- Déplacements professionnels
    'cat7_commuting',            -- Trajets domicile-travail
    'cat8_upstream_leased',      -- Infrastructures louées
    'cat11_use_of_products',     -- Utilisation équipements vendus (box, téléphones)
    'cat12_end_of_life'          -- Fin de vie équipements
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 6. Coworking / Espaces partagés
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'coworking',
  'Coworking',
  ARRAY[
    'cat1_purchased_goods',      -- Mobilier, fournitures, café/snacks
    'cat2_capital_goods',        -- Aménagements, équipements IT
    'cat3_fuel_energy',          -- Énergie bâtiments (MAJEUR)
    'cat5_waste',                -- Déchets de bureau
    'cat6_business_travel',      -- Déplacements équipe
    'cat7_commuting',            -- Trajets membres (SIGNIFICATIF - à reporter ou non)
    'cat8_upstream_leased',      -- Locaux loués
    'cat13_downstream_leased'    -- Espaces sous-loués aux membres
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();
