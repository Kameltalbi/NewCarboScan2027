-- Tables minimales pour pages publiques (leads + blog enrichi)
-- Portage complet des tables métier reporté volontairement.

CREATE TABLE IF NOT EXISTS contact_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type    TEXT NOT NULL,
  email           CITEXT NOT NULL,
  phone           TEXT,
  company_name    TEXT,
  full_name       TEXT,
  message         TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id         UUID REFERENCES users(id),
  ip              INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_type ON contact_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON contact_requests(created_at DESC);

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT;

-- content legacy alias: prefer body_html_sanitized for render
UPDATE blog_posts
SET content = body_html_sanitized
WHERE content IS NULL OR content = '';
