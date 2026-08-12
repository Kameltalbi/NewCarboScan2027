-- Fix RLS policies on report_quota and report_generations
-- The original policies used incorrect profile-based lookups.
-- This aligns them with the standard pattern used across the app.

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their org quota" ON report_quota;
DROP POLICY IF EXISTS "Users can update their org quota" ON report_quota;
DROP POLICY IF EXISTS "Users can insert quota for their org" ON report_quota;
DROP POLICY IF EXISTS "Users can view their org generations" ON report_generations;
DROP POLICY IF EXISTS "Users can insert generations for their org" ON report_generations;

-- report_quota: SELECT
CREATE POLICY "Users can view their org quota"
  ON report_quota FOR SELECT
  USING (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- report_quota: INSERT
CREATE POLICY "Users can insert quota for their org"
  ON report_quota FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- report_quota: UPDATE
CREATE POLICY "Users can update their org quota"
  ON report_quota FOR UPDATE
  USING (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- report_generations: SELECT
CREATE POLICY "Users can view their org generations"
  ON report_generations FOR SELECT
  USING (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- report_generations: INSERT
CREATE POLICY "Users can insert generations for their org"
  ON report_generations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
