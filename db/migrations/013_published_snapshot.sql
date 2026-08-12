-- =============================================================================
-- 013 — Snapshot immuable à la publication d'un run (P5)
-- =============================================================================

ALTER TABLE calculation_runs
  ADD COLUMN IF NOT EXISTS published_snapshot JSONB;

COMMENT ON COLUMN calculation_runs.published_snapshot IS
  'Freeze à publish : lignes ledger, facteurs, preuves, méthodologie, engine, hypothèses/exclusions';
