-- Remplir subcategory_key depuis custom_source pour les facteurs existants
UPDATE public.organization_emission_factors
SET subcategory_key = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(custom_source, 'àâäéèêëïîôùûüç', 'aaaeeeeiioouuc'),
      '[^a-zA-Z0-9]+', '_', 'g'
    ),
    '^_|_$', '', 'g'
  )
)
WHERE subcategory_key IS NULL AND custom_source IS NOT NULL;