ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT ARRAY['read:activity']::text[],
  ADD COLUMN IF NOT EXISTS env text NOT NULL DEFAULT 'live' CHECK (env IN ('test','live')),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON public.api_keys(key_hash);