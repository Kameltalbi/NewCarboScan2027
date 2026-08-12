-- Ajouter subcategory_key pour lier les FE personnalisés aux activity_data
ALTER TABLE public.organization_emission_factors 
ADD COLUMN subcategory_key VARCHAR(100);

-- Index pour recherche rapide
CREATE INDEX idx_org_emission_factors_subcategory_key 
ON public.organization_emission_factors(organization_id, subcategory_key);

-- Commentaire explicatif
COMMENT ON COLUMN public.organization_emission_factors.subcategory_key IS 
'Clé de correspondance avec activity_data.subcategory (ex: essence_sans_plomb, gasoil)';