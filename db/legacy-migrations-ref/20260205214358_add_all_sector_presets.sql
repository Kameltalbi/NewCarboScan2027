-- Ajout de tous les presets secteurs d'activité
-- Catégories Scope 3 pertinentes pour chaque secteur

-- 1. Finance et assurance (Banque, Assurance)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'finance_assurance',
  'Finance et assurance',
  ARRAY[
    'cat1_purchased_goods',    -- Achats IT, bureautique, conseil
    'cat2_capital_goods',      -- Immobilier de bureau, serveurs, data centers
    'cat3_fuel_energy',        -- Énergie indirecte
    'cat5_waste',              -- Déchets papier, DEEE
    'cat6_business_travel',    -- Voyages d'affaires (significatif)
    'cat7_commuting',          -- Trajets domicile-travail
    'cat8_upstream_leased',    -- Bureaux et équipements loués
    'cat13_downstream_leased', -- Immobilier locatif
    'cat15_investments'        -- Investissements (MAJEUR : 80-95% des émissions)
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 2. Agriculture
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'agriculture',
  'Agriculture',
  ARRAY[
    'cat1_purchased_goods',    -- Semences, engrais, phytosanitaires
    'cat2_capital_goods',      -- Machines agricoles, bâtiments
    'cat3_fuel_energy',        -- Carburants tracteurs, énergie
    'cat4_upstream_transport', -- Transport intrants
    'cat5_waste',              -- Déchets agricoles
    'cat9_downstream_transport', -- Transport produits
    'cat10_processing',        -- Transformation produits
    'cat11_use_of_products',   -- Utilisation produits vendus
    'cat12_end_of_life'        -- Fin de vie produits
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 3. Industrie manufacturière
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'industrie_manufacturiere',
  'Industrie manufacturière',
  ARRAY[
    'cat1_purchased_goods',    -- Matières premières, composants
    'cat2_capital_goods',      -- Machines, équipements industriels
    'cat3_fuel_energy',        -- Énergie process
    'cat4_upstream_transport', -- Transport matières premières
    'cat5_waste',              -- Déchets industriels
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail
    'cat9_downstream_transport', -- Transport produits finis
    'cat10_processing',        -- Transformation par tiers
    'cat11_use_of_products',   -- Utilisation produits vendus
    'cat12_end_of_life'        -- Fin de vie produits
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 4. Construction (BTP)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'construction',
  'Construction',
  ARRAY[
    'cat1_purchased_goods',    -- Matériaux de construction
    'cat2_capital_goods',      -- Engins de chantier
    'cat3_fuel_energy',        -- Carburants engins, énergie chantier
    'cat4_upstream_transport', -- Transport matériaux
    'cat5_waste',              -- Déchets de chantier
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail
    'cat11_use_of_products',   -- Bâtiments construits (usage)
    'cat12_end_of_life'        -- Démolition
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 5. Commerce (Distribution, Retail)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'commerce',
  'Commerce',
  ARRAY[
    'cat1_purchased_goods',    -- Marchandises achetées pour revente
    'cat2_capital_goods',      -- Magasins, équipements
    'cat3_fuel_energy',        -- Énergie magasins
    'cat4_upstream_transport', -- Transport marchandises entrantes
    'cat5_waste',              -- Emballages, déchets
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail
    'cat9_downstream_transport', -- Livraisons clients
    'cat12_end_of_life'        -- Fin de vie produits vendus
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 6. Transport et logistique
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'transport_logistique',
  'Transport et logistique',
  ARRAY[
    'cat1_purchased_goods',    -- Pièces, maintenance
    'cat2_capital_goods',      -- Véhicules, entrepôts
    'cat3_fuel_energy',        -- Carburants (MAJEUR)
    'cat4_upstream_transport', -- Sous-traitance transport
    'cat5_waste',              -- Déchets, huiles usagées
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail
    'cat8_upstream_leased',    -- Véhicules/entrepôts loués
    'cat9_downstream_transport' -- Transport pour compte de tiers
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 7. Services (aux entreprises)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'services',
  'Services',
  ARRAY[
    'cat1_purchased_goods',    -- Fournitures, sous-traitance
    'cat2_capital_goods',      -- Bureaux, équipements IT
    'cat3_fuel_energy',        -- Énergie bureaux
    'cat5_waste',              -- Déchets de bureau
    'cat6_business_travel',    -- Déplacements professionnels (significatif)
    'cat7_commuting',          -- Trajets domicile-travail
    'cat8_upstream_leased'     -- Bureaux loués
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 8. Énergie (Production, Utilities)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'energie',
  'Énergie',
  ARRAY[
    'cat1_purchased_goods',    -- Combustibles, équipements
    'cat2_capital_goods',      -- Centrales, infrastructures
    'cat3_fuel_energy',        -- Énergie autoconsommée
    'cat4_upstream_transport', -- Transport combustibles
    'cat5_waste',              -- Déchets, cendres
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail
    'cat9_downstream_transport', -- Distribution énergie
    'cat11_use_of_products'    -- Utilisation énergie vendue (MAJEUR)
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 9. Technologies de l'information (IT, Numérique)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'technologies_information',
  'Technologies de l''information',
  ARRAY[
    'cat1_purchased_goods',    -- Matériel IT, licences, cloud
    'cat2_capital_goods',      -- Data centers, serveurs
    'cat3_fuel_energy',        -- Énergie data centers (significatif)
    'cat5_waste',              -- DEEE
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail / télétravail
    'cat8_upstream_leased',    -- Équipements loués, cloud
    'cat11_use_of_products'    -- Utilisation logiciels/services
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 10. Santé (Hôpitaux, Cliniques, Pharma)
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'sante',
  'Santé',
  ARRAY[
    'cat1_purchased_goods',    -- Médicaments, consommables médicaux
    'cat2_capital_goods',      -- Équipements médicaux, bâtiments
    'cat3_fuel_energy',        -- Énergie bâtiments
    'cat4_upstream_transport', -- Transport fournitures
    'cat5_waste',              -- Déchets médicaux (DASRI)
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting',          -- Trajets domicile-travail
    'cat9_downstream_transport', -- Transport patients/produits
    'cat12_end_of_life'        -- Fin de vie équipements
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();

-- 11. Éducation
INSERT INTO public.sector_presets (code, name, scope3_category_ids)
VALUES (
  'education',
  'Éducation',
  ARRAY[
    'cat1_purchased_goods',    -- Fournitures, manuels, IT
    'cat2_capital_goods',      -- Bâtiments, équipements
    'cat3_fuel_energy',        -- Énergie bâtiments
    'cat5_waste',              -- Déchets
    'cat6_business_travel',    -- Déplacements professionnels
    'cat7_commuting'           -- Trajets domicile-travail (étudiants + personnel)
  ]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope3_category_ids = EXCLUDED.scope3_category_ids,
  updated_at = now();
