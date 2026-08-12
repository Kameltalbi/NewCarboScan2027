-- Adapter les tables MySQL pour PostgreSQL/Supabase

-- Table entreprises (adaptation vers companies)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_entreprise TEXT NOT NULL,
  secteur TEXT,
  ca_annuel DECIMAL(15,2),
  collaborateurs INTEGER,
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own companies" ON public.companies
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" ON public.companies
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON public.companies
FOR UPDATE USING (auth.uid() = user_id);

-- Table bilans_carbone (adaptation)
CREATE TABLE IF NOT EXISTS public.bilans_carbone (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  date_bilan TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_emission DECIMAL(15,2) NOT NULL,
  scope1_emission DECIMAL(15,2) NOT NULL DEFAULT 0,
  scope2_emission DECIMAL(15,2) NOT NULL DEFAULT 0,
  scope3_emission DECIMAL(15,2) NOT NULL DEFAULT 0,
  analyse_commentaire TEXT,
  fichier_pdf TEXT,
  questionnaire_data JSONB,
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bilans_carbone ENABLE ROW LEVEL SECURITY;

-- Bilans carbone policies
CREATE POLICY "Users can view their own bilans" ON public.bilans_carbone
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bilans" ON public.bilans_carbone
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bilans" ON public.bilans_carbone
FOR UPDATE USING (auth.uid() = user_id);

-- Table postes_emission (adaptation)
CREATE TABLE IF NOT EXISTS public.postes_emission (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bilan_id UUID NOT NULL REFERENCES public.bilans_carbone(id) ON DELETE CASCADE,
  poste_nom TEXT NOT NULL,
  scope INTEGER NOT NULL CHECK (scope IN (1, 2, 3)),
  emission_valeur DECIMAL(15,2) NOT NULL,
  unite TEXT,
  facteur_utilise DECIMAL(15,5),
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.postes_emission ENABLE ROW LEVEL SECURITY;

-- Postes emission policies (accessible via le bilan parent)
CREATE POLICY "Users can view emission posts via bilans" ON public.postes_emission
FOR SELECT USING (
  bilan_id IN (
    SELECT id FROM public.bilans_carbone 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert emission posts via bilans" ON public.postes_emission
FOR INSERT WITH CHECK (
  bilan_id IN (
    SELECT id FROM public.bilans_carbone 
    WHERE user_id = auth.uid()
  )
);

-- Table parametres_emission (données de référence - fusion avec emission_factors existants)
CREATE TABLE IF NOT EXISTS public.parametres_emission (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poste_nom TEXT NOT NULL,
  facteur_emission DECIMAL(15,5) NOT NULL,
  unite TEXT NOT NULL,
  scope INTEGER NOT NULL CHECK (scope IN (1, 2, 3)),
  category TEXT,
  subcategory TEXT,
  source TEXT DEFAULT 'ADEME',
  year INTEGER DEFAULT 2024,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parametres_emission ENABLE ROW LEVEL SECURITY;

-- Parametres emission policies (lecture seule pour tous les utilisateurs authentifiés)
CREATE POLICY "Authenticated users can view emission parameters" ON public.parametres_emission
FOR SELECT TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_bilans_carbone_user_id ON public.bilans_carbone(user_id);
CREATE INDEX IF NOT EXISTS idx_bilans_carbone_company_id ON public.bilans_carbone(company_id);
CREATE INDEX IF NOT EXISTS idx_postes_emission_bilan_id ON public.postes_emission(bilan_id);
CREATE INDEX IF NOT EXISTS idx_postes_emission_scope ON public.postes_emission(scope);
CREATE INDEX IF NOT EXISTS idx_parametres_emission_poste_nom ON public.parametres_emission(poste_nom);
CREATE INDEX IF NOT EXISTS idx_parametres_emission_scope ON public.parametres_emission(scope);

-- Triggers pour les timestamps
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bilans_carbone_updated_at
  BEFORE UPDATE ON public.bilans_carbone
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parametres_emission_updated_at
  BEFORE UPDATE ON public.parametres_emission
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer quelques paramètres d'émission de base
INSERT INTO public.parametres_emission (poste_nom, facteur_emission, unite, scope, category, subcategory) VALUES
('Transport véhicule diesel', 2.52000, 'kg CO2e/litre', 1, 'transport', 'vehicles'),
('Transport véhicule essence', 2.28000, 'kg CO2e/litre', 1, 'transport', 'vehicles'), 
('Transport véhicule électrique', 0.01200, 'kg CO2e/km', 1, 'transport', 'vehicles'),
('Électricité France', 0.05700, 'kg CO2e/kWh', 2, 'energy', 'electricity'),
('Électricité renouvelable', 0.02000, 'kg CO2e/kWh', 2, 'energy', 'electricity'),
('Chauffage gaz naturel', 0.23400, 'kg CO2e/kWh', 2, 'energy', 'heating'),
('Vol court courrier', 280.00000, 'kg CO2e/vol', 3, 'travel', 'flights'),
('Vol moyen courrier', 600.00000, 'kg CO2e/vol', 3, 'travel', 'flights'),
('Vol long courrier', 1200.00000, 'kg CO2e/vol', 3, 'travel', 'flights'),
('Transport domicile-travail voiture', 0.20000, 'kg CO2e/km', 3, 'transport', 'commuting'),
('Transport domicile-travail transport public', 0.05000, 'kg CO2e/km', 3, 'transport', 'commuting'),
('Ordinateur portable', 60.00000, 'kg CO2e/unité/an', 3, 'equipment', 'it'),
('Téléphone mobile', 28.33000, 'kg CO2e/unité/an', 3, 'equipment', 'it'),
('Déchets non triés', 0.80000, 'kg CO2e/kg', 3, 'waste', 'general'),
('Déchets triés et valorisés', 0.30000, 'kg CO2e/kg', 3, 'waste', 'recycled')
ON CONFLICT DO NOTHING;