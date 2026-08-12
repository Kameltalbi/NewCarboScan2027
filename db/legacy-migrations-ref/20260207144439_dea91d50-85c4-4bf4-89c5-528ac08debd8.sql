-- Ajouter la sous-catégorie personnalisée "Fin de vie des véhicules vendus (VHU)"
INSERT INTO public.organization_scope3_subcategories (
  organization_id,
  scope3_category_id,
  value,
  label,
  default_unit,
  alternative_units,
  input_type,
  description,
  is_active
) VALUES (
  'f6be0e09-d6a6-4aa6-b6ae-13f05d92232b',
  'cat12_end_of_life',
  'custom_cat12_vhu_vehicles',
  'Fin de vie des véhicules vendus (VHU)',
  'kg',
  ARRAY['t'],
  'mass',
  'Traitement en fin de vie des véhicules hors d''usage vendus',
  true
);

-- Ajouter le facteur d'émission correspondant
INSERT INTO public.organization_emission_factors (
  organization_id,
  base_factor_id,
  custom_value,
  custom_unit,
  custom_source,
  notes,
  subcategory_key
) VALUES (
  'f6be0e09-d6a6-4aa6-b6ae-13f05d92232b',
  NULL,
  0.03,
  'kgCO2e/kg',
  'Fin de vie des véhicules vendus (VHU)',
  'scope:3|category:cat12_end_of_life|custom_subcategory:custom_cat12_vhu_vehicles',
  'custom_cat12_vhu_vehicles'
);