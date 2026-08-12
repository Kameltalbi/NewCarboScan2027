-- Migration: Création de la table net_zero_trajectories
-- Stocke les configurations de trajectoire Net Zero alignée SBTi

CREATE TABLE IF NOT EXISTS public.net_zero_trajectories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_trajectory UNIQUE(organization_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_net_zero_trajectories_org_id 
  ON public.net_zero_trajectories(organization_id);

-- Enable RLS
ALTER TABLE public.net_zero_trajectories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Les membres de l'organisation peuvent lire leur trajectoire
CREATE POLICY "Users can view their organization's net zero trajectory"
  ON public.net_zero_trajectories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = net_zero_trajectories.organization_id
      AND (
        o.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id
          AND om.user_id = auth.uid()
        )
      )
    )
  );

-- Les propriétaires et admins peuvent modifier
CREATE POLICY "Owners and admins can update net zero trajectory"
  ON public.net_zero_trajectories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      LEFT JOIN public.organization_members om ON om.organization_id = o.id AND om.user_id = auth.uid()
      WHERE o.id = net_zero_trajectories.organization_id
      AND (
        o.user_id = auth.uid()
        OR (om.role IN ('owner', 'admin'))
      )
    )
  );

-- Les propriétaires et admins peuvent créer
CREATE POLICY "Owners and admins can create net zero trajectory"
  ON public.net_zero_trajectories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      LEFT JOIN public.organization_members om ON om.organization_id = o.id AND om.user_id = auth.uid()
      WHERE o.id = organization_id
      AND (
        o.user_id = auth.uid()
        OR (om.role IN ('owner', 'admin'))
      )
    )
  );

