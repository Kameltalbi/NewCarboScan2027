-- Durable delivery of CBAM verifier internal notifications only. No existing rows are modified.
CREATE TABLE IF NOT EXISTS cbam_verifier_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES contact_requests(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('internal')),
  recipient TEXT NOT NULL,
  message JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  provider_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (lead_id, kind)
);
CREATE INDEX IF NOT EXISTS cbam_verifier_emails_pending_idx
  ON cbam_verifier_emails (next_attempt_at) WHERE status IN ('pending', 'sending');
