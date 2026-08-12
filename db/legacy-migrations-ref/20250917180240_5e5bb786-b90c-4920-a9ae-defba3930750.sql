-- Create impact factors table for ACV calculations
CREATE TABLE public.impact_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- 'acidification', 'eutrophisation', 'consommation_eau', 'toxicite_humaine', 'appauvrissement_ozone', etc.
  impact_name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'kg SO2 eq', 'm3 H2O', 'kg PM2.5 eq', etc.
  description TEXT,
  source TEXT DEFAULT 'USER_INPUT', -- Indique que c'est saisi par l'utilisateur
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user impact factors table (user-specific impact factors)
CREATE TABLE public.user_impact_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  impact_factor_id UUID NOT NULL REFERENCES public.impact_factors(id),
  material_or_process TEXT NOT NULL, -- Nom du matériau ou processus
  impact_value NUMERIC NOT NULL, -- Valeur du facteur d'impact
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_impact UNIQUE(user_id, impact_factor_id, material_or_process)
);

-- Create ACV impact results table
CREATE TABLE public.acv_impact_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  calculation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  impact_category TEXT NOT NULL,
  phase_breakdown JSONB NOT NULL DEFAULT '{}', -- {'materials': 0, 'manufacturing': 0, 'transport': 0, 'usage': 0, 'end_of_life': 0}
  total_impact NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  raw_data JSONB, -- Données brutes de calcul pour traçabilité
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impact_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_impact_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acv_impact_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for impact_factors
CREATE POLICY "Authenticated users can view impact factors" 
ON public.impact_factors FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can manage impact factors" 
ON public.impact_factors FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for user_impact_factors
CREATE POLICY "Users can manage their own impact factors" 
ON public.user_impact_factors FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all user impact factors" 
ON public.user_impact_factors FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for acv_impact_results
CREATE POLICY "Users can manage their own impact results" 
ON public.acv_impact_results FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all impact results" 
ON public.acv_impact_results FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Insert default impact categories
INSERT INTO public.impact_factors (category, impact_name, unit, description) VALUES
  ('acidification', 'Potentiel d''acidification', 'kg SO2 eq', 'Mesure l''impact sur l''acidification des sols et des eaux'),
  ('eutrophisation', 'Potentiel d''eutrophisation', 'kg PO4 eq', 'Mesure l''enrichissement des milieux aquatiques en nutriments'),
  ('consommation_eau', 'Consommation d''eau', 'm3 H2O', 'Quantité d''eau consommée dans le processus'),
  ('toxicite_humaine', 'Toxicité humaine', 'kg PM2.5 eq', 'Impact sur la santé humaine'),
  ('appauvrissement_ozone', 'Appauvrissement de l''ozone stratosphérique', 'kg CFC-11 eq', 'Impact sur la couche d''ozone'),
  ('formation_ozone_photochimique', 'Formation d''ozone photochimique', 'kg NMVOC eq', 'Formation d''ozone troposphérique'),
  ('utilisation_sols', 'Utilisation des sols', 'm2*an', 'Surface de sol utilisée pendant une année'),
  ('epuisement_ressources_abiotiques', 'Épuisement des ressources abiotiques', 'kg Sb eq', 'Épuisement des ressources minérales'),
  ('epuisement_ressources_fossiles', 'Épuisement des ressources fossiles', 'MJ', 'Épuisement des combustibles fossiles');

-- Add update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_impact_factors_updated_at
  BEFORE UPDATE ON public.impact_factors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_impact_factors_updated_at
  BEFORE UPDATE ON public.user_impact_factors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();