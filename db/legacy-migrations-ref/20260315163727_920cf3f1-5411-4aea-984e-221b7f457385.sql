-- Add annual revenue field for intensity calculation (ESRS E1 compliance)
ALTER TABLE public.climate_scenarios
  ADD COLUMN IF NOT EXISTS annual_revenue_eur numeric DEFAULT NULL;

-- Add revenue and intensity to scenario results for year-by-year tracking
ALTER TABLE public.climate_scenario_results
  ADD COLUMN IF NOT EXISTS projected_revenue_eur numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intensity_tco2e_per_meur numeric DEFAULT NULL;