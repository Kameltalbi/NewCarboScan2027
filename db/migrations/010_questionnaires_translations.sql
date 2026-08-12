-- =============================================================================
-- 010 — Compléments inventaire (questionnaires + translations)
-- test_collect_table volontairement non porté (table de test legacy).
-- =============================================================================

ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS scope INT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS question_key TEXT,
  ADD COLUMN IF NOT EXISTS input_type TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS emission_factor_slug TEXT,
  ADD COLUMN IF NOT EXISTS options JSONB,
  ADD COLUMN IF NOT EXISTS order_index INT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS conditional_logic JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_questionnaires_question_key
  ON questionnaires (question_key)
  WHERE question_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS questionnaire_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  question_text TEXT NOT NULL,
  description TEXT,
  help_text TEXT,
  placeholder TEXT,
  legacy_source TEXT,
  legacy_id TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  imported_at TIMESTAMPTZ,
  raw_legacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (questionnaire_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_translations_lang
  ON questionnaire_translations (language_code);

INSERT INTO import_entity_catalog (entity_type, target_table, depends_on, sort_order, preserve_uuid, org_scoped, description)
VALUES
  ('questionnaires', 'questionnaires', '{}', 880, true, false, 'Questionnaires CarboStart/Plus/Pro'),
  ('questionnaire_translations', 'questionnaire_translations', '{questionnaires}', 881, true, false, 'Traductions questionnaires'),
  ('questionnaire_responses', 'questionnaire_responses', '{questionnaires,organizations}', 882, true, true, 'Réponses questionnaires')
ON CONFLICT (entity_type) DO UPDATE
SET target_table = EXCLUDED.target_table,
    depends_on = EXCLUDED.depends_on,
    sort_order = EXCLUDED.sort_order,
    description = EXCLUDED.description,
    enabled = true;
