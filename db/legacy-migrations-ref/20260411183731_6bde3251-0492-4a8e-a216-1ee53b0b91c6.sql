-- Add scrap_rate to pcf_materials (percentage of material lost during production)
ALTER TABLE public.pcf_materials 
ADD COLUMN IF NOT EXISTS scrap_rate numeric DEFAULT 0 CHECK (scrap_rate >= 0 AND scrap_rate <= 100);

-- Add HS code to pcf_studies for CBAM compliance
ALTER TABLE public.pcf_studies 
ADD COLUMN IF NOT EXISTS hs_code text;

-- Add comment for documentation
COMMENT ON COLUMN public.pcf_materials.scrap_rate IS 'Percentage of material lost during production (0-100). Actual quantity = quantity * (1 + scrap_rate/100)';
COMMENT ON COLUMN public.pcf_studies.hs_code IS 'Harmonized System code for CBAM compliance';