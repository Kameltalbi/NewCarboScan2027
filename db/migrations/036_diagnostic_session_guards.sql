-- Guards for public diagnostic sessions. Does not change diag-360-2026.1 questions or scores.

CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_sessions_resume_token_hash_uidx
  ON diagnostic_sessions (resume_token_hash);

ALTER TABLE diagnostic_results
  DROP CONSTRAINT IF EXISTS diagnostic_results_snapshot_maturity_level_chk,
  DROP CONSTRAINT IF EXISTS diagnostic_results_snapshot_reliability_limited_chk,
  DROP CONSTRAINT IF EXISTS diagnostic_results_snapshot_presentation_chk,
  DROP CONSTRAINT IF EXISTS diagnostic_results_snapshot_applicable_answers_chk;

ALTER TABLE diagnostic_results
  ADD CONSTRAINT diagnostic_results_snapshot_maturity_level_chk
    CHECK (snapshot ? 'maturityLevel'),
  ADD CONSTRAINT diagnostic_results_snapshot_reliability_limited_chk
    CHECK (snapshot ? 'reliabilityLimited'),
  ADD CONSTRAINT diagnostic_results_snapshot_presentation_chk
    CHECK (snapshot ? 'presentation'),
  ADD CONSTRAINT diagnostic_results_snapshot_applicable_answers_chk
    CHECK (snapshot ? 'applicableAnswers');
