-- Create remaining tables that don't exist yet
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('carbo_start', 'carbo_pro', 'carbo_omnibus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  features JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create questionnaire responses table
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_type TEXT NOT NULL CHECK (questionnaire_type IN ('carbo_start', 'carbo_pro', 'basic_calculator')),
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on questionnaire_responses
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Questionnaire responses policies
CREATE POLICY "Users can view their own responses" ON public.questionnaire_responses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own responses" ON public.questionnaire_responses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses" ON public.questionnaire_responses
FOR UPDATE USING (auth.uid() = user_id);

-- Create carbon assessments table
CREATE TABLE IF NOT EXISTS public.carbon_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_response_id UUID REFERENCES public.questionnaire_responses(id) ON DELETE SET NULL,
  total_emissions DECIMAL(12,2) NOT NULL,
  scope1_emissions DECIMAL(12,2) NOT NULL DEFAULT 0,
  scope2_emissions DECIMAL(12,2) NOT NULL DEFAULT 0,
  scope3_emissions DECIMAL(12,2) NOT NULL DEFAULT 0,
  category_breakdown JSONB,
  majority_scope INTEGER CHECK (majority_scope IN (1, 2, 3)),
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_generated BOOLEAN NOT NULL DEFAULT false,
  report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on carbon_assessments
ALTER TABLE public.carbon_assessments ENABLE ROW LEVEL SECURITY;

-- Carbon assessments policies
CREATE POLICY "Users can view their own assessments" ON public.carbon_assessments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments" ON public.carbon_assessments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments" ON public.carbon_assessments
FOR UPDATE USING (auth.uid() = user_id);

-- Create emission factors table (public reference data)
CREATE TABLE IF NOT EXISTS public.emission_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  factor_name TEXT NOT NULL,
  emission_factor DECIMAL(10,6) NOT NULL,
  unit TEXT NOT NULL,
  source TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on emission_factors
ALTER TABLE public.emission_factors ENABLE ROW LEVEL SECURITY;

-- Emission factors policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view emission factors" ON public.emission_factors
FOR SELECT TO authenticated USING (true);

-- Create activity sectors table
CREATE TABLE IF NOT EXISTS public.activity_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sector_name TEXT NOT NULL UNIQUE,
  description TEXT,
  typical_emissions_range JSONB,
  specific_factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_sectors
ALTER TABLE public.activity_sectors ENABLE ROW LEVEL SECURITY;

-- Activity sectors policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view activity sectors" ON public.activity_sectors
FOR SELECT TO authenticated USING (true);

-- Create contact requests table
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  request_type TEXT CHECK (request_type IN ('general', 'quote', 'demo', 'support')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contact_requests
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Contact requests policies
CREATE POLICY "Users can view their own contact requests" ON public.contact_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert contact requests" ON public.contact_requests
FOR INSERT WITH CHECK (true);

-- Create training registrations table
CREATE TABLE IF NOT EXISTS public.training_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  training_type TEXT NOT NULL CHECK (training_type IN ('bilan_carbone', 'sensibilisation', 'ateliers_internes')),
  preferred_dates JSONB,
  participants_count INTEGER DEFAULT 1,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on training_registrations
ALTER TABLE public.training_registrations ENABLE ROW LEVEL SECURITY;

-- Training registrations policies
CREATE POLICY "Users can view their own training registrations" ON public.training_registrations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert training registrations" ON public.training_registrations
FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON public.questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_carbon_assessments_user_id ON public.carbon_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_user_id ON public.contact_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_training_registrations_user_id ON public.training_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_emission_factors_category ON public.emission_factors(category);

-- Insert some basic emission factors
INSERT INTO public.emission_factors (category, subcategory, factor_name, emission_factor, unit, source, year) VALUES
('transport', 'vehicles', 'Diesel', 2.52, 'kg CO2e/litre', 'ADEME', 2024),
('transport', 'vehicles', 'Essence', 2.28, 'kg CO2e/litre', 'ADEME', 2024),
('transport', 'vehicles', 'Électrique', 0.012, 'kg CO2e/km', 'ADEME', 2024),
('energy', 'electricity', 'France Mix', 0.057, 'kg CO2e/kWh', 'ADEME', 2024),
('energy', 'electricity', 'Renewable', 0.02, 'kg CO2e/kWh', 'ADEME', 2024),
('energy', 'heating', 'Gaz naturel', 0.234, 'kg CO2e/kWh', 'ADEME', 2024),
('travel', 'flights', 'Court courrier', 280, 'kg CO2e/vol', 'ADEME', 2024),
('travel', 'flights', 'Moyen courrier', 600, 'kg CO2e/vol', 'ADEME', 2024),
('travel', 'flights', 'Long courrier', 1200, 'kg CO2e/vol', 'ADEME', 2024)
ON CONFLICT (category, subcategory, factor_name) DO NOTHING;

-- Insert basic activity sectors
INSERT INTO public.activity_sectors (sector_name, description, typical_emissions_range) VALUES
('Services', 'Secteur tertiaire et services', '{"min": 1000, "max": 5000, "unit": "kg CO2e/employee"}'),
('Industrie', 'Secteur industriel et manufacturier', '{"min": 5000, "max": 20000, "unit": "kg CO2e/employee"}'),
('Commerce', 'Commerce et distribution', '{"min": 2000, "max": 8000, "unit": "kg CO2e/employee"}'),
('Transport', 'Transport et logistique', '{"min": 8000, "max": 25000, "unit": "kg CO2e/employee"}'),
('Agriculture', 'Agriculture et agroalimentaire', '{"min": 3000, "max": 15000, "unit": "kg CO2e/employee"}'),
('Construction', 'BTP et construction', '{"min": 4000, "max": 12000, "unit": "kg CO2e/employee"}'),
('Énergie', 'Production et distribution d''énergie', '{"min": 10000, "max": 50000, "unit": "kg CO2e/employee"}')
ON CONFLICT (sector_name) DO NOTHING;