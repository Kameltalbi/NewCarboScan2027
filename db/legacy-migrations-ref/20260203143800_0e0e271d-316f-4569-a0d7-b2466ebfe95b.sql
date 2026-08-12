-- Créer une table pour les sous-catégories personnalisées par organisation
CREATE TABLE public.organization_scope3_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope3_category_id TEXT NOT NULL, -- ex: 'cat1_purchased_goods'
  value TEXT NOT NULL, -- clé unique: 'custom_imported_parts_abc123'
  label TEXT NOT NULL, -- ex: 'Pièces moteur BMW'
  default_unit TEXT NOT NULL DEFAULT 't',
  alternative_units TEXT[] DEFAULT ARRAY['kg', 'TND'],
  input_type TEXT NOT NULL DEFAULT 'mass', -- 'mass', 'monetary', 'quantity'
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contrainte d'unicité par organisation
  UNIQUE (organization_id, value)
);

-- Index pour les performances
CREATE INDEX idx_org_scope3_subcategories_org ON public.organization_scope3_subcategories(organization_id);
CREATE INDEX idx_org_scope3_subcategories_category ON public.organization_scope3_subcategories(scope3_category_id);

-- Activer RLS
ALTER TABLE public.organization_scope3_subcategories ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their org subcategories"
ON public.organization_scope3_subcategories
FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create org subcategories"
ON public.organization_scope3_subcategories
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can update org subcategories"
ON public.organization_scope3_subcategories
FOR UPDATE
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can delete org subcategories"
ON public.organization_scope3_subcategories
FOR DELETE
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_org_scope3_subcategories_updated_at
  BEFORE UPDATE ON public.organization_scope3_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activity_data_updated_at();