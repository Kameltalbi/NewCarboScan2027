-- =============================================================================
-- 012 — Seed pack facteurs cœur (TN) pour calculs org certifiables
-- UUIDs stables pour tests / UI. Source : FREE_BILAN_FACTOR_PACK values.
-- =============================================================================

INSERT INTO factor_sources (id, name, license, homepage)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'Newcarboscan Core Pack TN',
  'internal-reference',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO emission_factor_versions (
  id, source_id, version_label, published_year, valid_from, gwp_set,
  source_dataset, checksum, status, approved_at, notes
)
VALUES (
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000001',
  'core-tn-2027.1',
  2027,
  '2027-01-01',
  'AR6',
  'free-bilan-2027.1',
  'sha256:core-tn-2027.1-seed',
  'approved',
  now(),
  'Pack de référence démarrage — remplacer par base officielle dès que disponible'
)
ON CONFLICT (source_id, version_label) DO NOTHING;

-- Facteurs (stable_factor_id = clé pack)
INSERT INTO emission_factors (
  id, version_id, stable_factor_id, version_number, external_code, name, category,
  geography, unit_numerator, unit_denominator, value, uncertainty_pct,
  selection_rule, status, checksum, approved_at, valid_from
) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'gas_m3', 1, 'gas_m3', 'Gaz naturel', 'scope1', 'TN', 'kgCO2e', 'm3', 2.056, 12, 'fuel_type=natural_gas', 'approved', 'seed:gas_m3', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'fuel_liters', 1, 'fuel_liters', 'Fioul / carburant', 'scope1', 'TN', 'kgCO2e', 'L', 2.68, 12, 'fuel_type=fuel_oil', 'approved', 'seed:fuel_liters', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'fleet_essence', 1, 'fleet_essence', 'Essence flotte', 'scope1', 'TN', 'kgCO2e', 'L', 2.31, 10, 'vehicle_fuel=essence', 'approved', 'seed:fleet_essence', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 'fleet_diesel', 1, 'fleet_diesel', 'Diesel flotte', 'scope1', 'TN', 'kgCO2e', 'L', 2.68, 10, 'vehicle_fuel=diesel', 'approved', 'seed:fleet_diesel', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'refrigerant_kg', 1, 'refrigerant_kg', 'Fluide frigorigène (proxy)', 'scope1', 'TN', 'kgCO2e', 'kg', 1345, 25, 'refrigerant=generic', 'approved', 'seed:refrigerant_kg', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000002', 'electricity_kwh', 1, 'electricity_kwh', 'Électricité location-based TN', 'scope2', 'TN', 'kgCO2e', 'kWh', 0.523, 15, 'grid=TN location-based', 'approved', 'seed:electricity_kwh', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000002', 'heat_kwh', 1, 'heat_kwh', 'Chaleur / vapeur', 'scope2', 'TN', 'kgCO2e', 'kWh', 0.2, 20, 'heat=district_proxy', 'approved', 'seed:heat_kwh', now(), '2027-01-01'),
  ('b1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000002', 'purchases_dt', 1, 'purchases_dt', 'Achats monétaires (proxy)', 'scope3', 'TN', 'kgCO2e', 'TND', 0.5, 50, 'monetary_proxy=TND', 'approved', 'seed:purchases_dt', now(), '2027-01-01')
ON CONFLICT (id) DO NOTHING;
