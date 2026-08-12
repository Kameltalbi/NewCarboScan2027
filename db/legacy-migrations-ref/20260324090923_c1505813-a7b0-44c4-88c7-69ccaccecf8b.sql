
-- Table pour les clés API externes (SoftFacture, etc.)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  app_name TEXT NOT NULL DEFAULT 'SoftFacture',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- ex: 'cs_live_abc...' pour affichage
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour lookup rapide par hash
CREATE UNIQUE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage api keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Table pour stocker les résultats de calcul carbone des factures
CREATE TABLE public.invoice_carbon_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL, -- ID facture côté SoftFacture
  invoice_date TIMESTAMPTZ,
  client_name TEXT,
  total_kgco2e NUMERIC(12,4) NOT NULL DEFAULT 0,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_text TEXT, -- Texte à afficher sur la facture
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_carbon_org ON public.invoice_carbon_results(organization_id);
CREATE INDEX idx_invoice_carbon_invoice ON public.invoice_carbon_results(invoice_id);

-- RLS
ALTER TABLE public.invoice_carbon_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invoice results"
  ON public.invoice_carbon_results FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service can insert invoice results"
  ON public.invoice_carbon_results FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
