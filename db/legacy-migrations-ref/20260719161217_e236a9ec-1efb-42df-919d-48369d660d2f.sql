
-- Simulate 7 days of realistic residential readings for KTC Maison
-- General meter: talon 120W (~2.9 kWh/night) + usage (~10 kWh/day) => ~13 kWh/day
-- Clim meter: summer usage ~8h @ 1.5 kW => ~12 kWh/day
-- STEG residential blended tariff ~0.230 TND/kWh
WITH days AS (
  SELECT (CURRENT_DATE - INTERVAL '1 day' * gs)::date AS d
  FROM generate_series(1, 7) gs
)
INSERT INTO public.wattbim_readings (organization_id, meter_id, period_start, period_end, value, unit, cost_amount, currency, source, is_validated, notes)
SELECT
  'c29398ab-18e3-433e-b951-88725af490e7'::uuid,
  'c3fb8b2f-f5ba-4470-89d1-90f438aab243'::uuid,
  d, d,
  ROUND((12 + random()*4)::numeric, 2),
  'kWh',
  ROUND(((12 + random()*4) * 0.230)::numeric, 3),
  'TND', 'shelly-em-sim', true,
  'Simulation résidentielle — talon nocturne ~120W'
FROM days
UNION ALL
SELECT
  'c29398ab-18e3-433e-b951-88725af490e7'::uuid,
  '694ce750-1551-4a72-a018-69785e003aa8'::uuid,
  d, d,
  ROUND((10 + random()*6)::numeric, 2),
  'kWh',
  ROUND(((10 + random()*6) * 0.230)::numeric, 3),
  'TND', 'shelly-em-sim', true,
  'Simulation clim été — pic après-midi ~1.8 kW'
FROM days;
