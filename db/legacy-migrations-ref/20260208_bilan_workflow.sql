-- Migration: Bilan Carbone Workflow (draft → submitted → validated → revision)
-- Adds status tracking, revision limits, and unique constraint per org+year

-- 1. Add workflow columns to bilans_carbone
ALTER TABLE bilans_carbone 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'submitted', 'validated', 'revision')),
  ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_revisions INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS reference_year INTEGER,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS locked_fields JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validated_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validated_pdf_url TEXT DEFAULT NULL;

-- 2. Backfill reference_year from date_bilan for existing records
UPDATE bilans_carbone 
SET reference_year = EXTRACT(YEAR FROM date_bilan::date)
WHERE reference_year IS NULL AND date_bilan IS NOT NULL;

-- 3. Unique constraint: 1 bilan per organization per year
-- Use a partial unique index to allow NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_bilans_unique_org_year 
  ON bilans_carbone (organization_id, reference_year) 
  WHERE organization_id IS NOT NULL AND reference_year IS NOT NULL;

-- 4. RPC: Submit bilan for expert validation
CREATE OR REPLACE FUNCTION submit_bilan_for_validation(_bilan_id UUID, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bilan RECORD;
BEGIN
  SELECT * INTO v_bilan FROM bilans_carbone WHERE id = _bilan_id AND user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilan non trouvé');
  END IF;
  
  IF v_bilan.status NOT IN ('draft', 'revision') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce bilan ne peut pas être soumis dans son état actuel (' || v_bilan.status || ')');
  END IF;
  
  UPDATE bilans_carbone 
  SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
  WHERE id = _bilan_id;
  
  RETURN jsonb_build_object('success', true, 'status', 'submitted');
END;
$$;

-- 5. RPC: Validate bilan (superadmin/admin only)
CREATE OR REPLACE FUNCTION validate_bilan(_bilan_id UUID, _admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bilan RECORD;
  v_role TEXT;
BEGIN
  -- Check admin role
  SELECT get_user_role(_admin_id) INTO v_role;
  IF v_role NOT IN ('admin', 'superadmin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission refusée');
  END IF;
  
  SELECT * INTO v_bilan FROM bilans_carbone WHERE id = _bilan_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilan non trouvé');
  END IF;
  
  IF v_bilan.status != 'submitted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce bilan doit être en statut "soumis" pour être validé');
  END IF;
  
  -- Lock key fields on validation
  UPDATE bilans_carbone 
  SET 
    status = 'validated', 
    validated_at = NOW(), 
    validated_by = _admin_id,
    locked_fields = jsonb_build_object(
      'reference_year', v_bilan.reference_year,
      'organization_id', v_bilan.organization_id,
      'user_id', v_bilan.user_id
    ),
    updated_at = NOW()
  WHERE id = _bilan_id;
  
  RETURN jsonb_build_object('success', true, 'status', 'validated');
END;
$$;

-- 6. RPC: Request revision (max 2)
CREATE OR REPLACE FUNCTION request_bilan_revision(_bilan_id UUID, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bilan RECORD;
BEGIN
  SELECT * INTO v_bilan FROM bilans_carbone WHERE id = _bilan_id AND user_id = _user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilan non trouvé');
  END IF;
  
  IF v_bilan.status != 'validated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul un bilan validé peut faire l''objet d''une demande de révision');
  END IF;
  
  IF v_bilan.revision_count >= v_bilan.max_revisions THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nombre maximum de révisions atteint (' || v_bilan.max_revisions || ')');
  END IF;
  
  UPDATE bilans_carbone 
  SET 
    status = 'revision', 
    revision_count = revision_count + 1,
    updated_at = NOW()
  WHERE id = _bilan_id;
  
  RETURN jsonb_build_object('success', true, 'status', 'revision', 'revision_count', v_bilan.revision_count + 1);
END;
$$;

-- 7. RPC: Check if user can create a new bilan for a given year
CREATE OR REPLACE FUNCTION can_create_bilan(_user_id UUID, _org_id UUID, _year INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  SELECT * INTO v_existing 
  FROM bilans_carbone 
  WHERE organization_id = _org_id AND reference_year = _year
  LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'can_create', false, 
      'reason', 'Un bilan existe déjà pour l''année ' || _year,
      'existing_bilan_id', v_existing.id,
      'existing_status', v_existing.status
    );
  END IF;
  
  RETURN jsonb_build_object('can_create', true);
END;
$$;

-- 8. RPC: Get bilan workflow status
CREATE OR REPLACE FUNCTION get_bilan_workflow_status(_bilan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bilan RECORD;
BEGIN
  SELECT id, status, revision_count, max_revisions, reference_year, 
         validated_at, submitted_at, created_at, updated_at
  INTO v_bilan 
  FROM bilans_carbone 
  WHERE id = _bilan_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'id', v_bilan.id,
    'status', v_bilan.status,
    'revision_count', v_bilan.revision_count,
    'max_revisions', v_bilan.max_revisions,
    'revisions_remaining', v_bilan.max_revisions - v_bilan.revision_count,
    'can_edit', v_bilan.status IN ('draft', 'revision'),
    'can_submit', v_bilan.status IN ('draft', 'revision'),
    'can_request_revision', v_bilan.status = 'validated' AND v_bilan.revision_count < v_bilan.max_revisions,
    'reference_year', v_bilan.reference_year,
    'validated_at', v_bilan.validated_at,
    'submitted_at', v_bilan.submitted_at,
    'validated_pdf_url', v_bilan.validated_pdf_url
  );
END;
$$;

-- 9. Storage bucket for validated PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('validated-reports', 'validated-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload to the bucket
CREATE POLICY "Admins can upload validated reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'validated-reports'
  AND (SELECT get_user_role(auth.uid())) IN ('admin', 'superadmin')
);

-- Allow admins to update/delete
CREATE POLICY "Admins can manage validated reports"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'validated-reports'
  AND (SELECT get_user_role(auth.uid())) IN ('admin', 'superadmin')
);

-- Allow users to read their own validated reports
CREATE POLICY "Users can read their validated reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'validated-reports'
);
