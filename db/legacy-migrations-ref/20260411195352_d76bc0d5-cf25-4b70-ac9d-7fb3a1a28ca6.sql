-- Add study_mode to pcf_studies
ALTER TABLE public.pcf_studies
  ADD COLUMN IF NOT EXISTS study_mode text NOT NULL DEFAULT 'pcf';

-- Add multi-indicator result columns (used in ACV mode)
ALTER TABLE public.pcf_studies
  ADD COLUMN IF NOT EXISTS total_energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_materials
ALTER TABLE public.pcf_materials
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_manufacturing
ALTER TABLE public.pcf_manufacturing
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_transport
ALTER TABLE public.pcf_transport
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_wastes
ALTER TABLE public.pcf_wastes
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_packaging
ALTER TABLE public.pcf_packaging
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_usage
ALTER TABLE public.pcf_usage
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_end_of_life
ALTER TABLE public.pcf_end_of_life
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator columns to pcf_subcontracting
ALTER TABLE public.pcf_subcontracting
  ADD COLUMN IF NOT EXISTS energy_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_factor_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_kgso2e numeric DEFAULT NULL;

-- Add multi-indicator breakdown to pcf_results
ALTER TABLE public.pcf_results
  ADD COLUMN IF NOT EXISTS total_energy_mj numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_water_m3 numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_acidification_kgso2e numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS energy_breakdown jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_breakdown jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acidification_breakdown jsonb DEFAULT NULL;

-- Add index for study_mode filtering
CREATE INDEX IF NOT EXISTS idx_pcf_studies_study_mode ON public.pcf_studies (study_mode);