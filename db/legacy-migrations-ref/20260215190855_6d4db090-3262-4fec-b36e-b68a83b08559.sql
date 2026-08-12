
-- Drop and recreate consume_report_token with p_tokens_cost support
CREATE OR REPLACE FUNCTION public.consume_report_token(
  p_organization_id uuid,
  p_user_id uuid,
  p_year integer,
  p_generation_type text DEFAULT 'generation',
  p_pages_count integer DEFAULT 0,
  p_tokens_cost integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quota RECORD;
  v_tokens_remaining INTEGER;
  v_actual_cost INTEGER;
BEGIN
  -- Cost of 0 means free generation (first 2)
  v_actual_cost := GREATEST(p_tokens_cost, 0);

  -- Upsert quota
  INSERT INTO report_quota (organization_id, year, tokens_total, tokens_used)
  VALUES (p_organization_id, p_year, 20, 0)
  ON CONFLICT (organization_id, year) DO NOTHING;

  SELECT * INTO v_quota
  FROM report_quota
  WHERE organization_id = p_organization_id AND year = p_year
  FOR UPDATE;

  v_tokens_remaining := v_quota.tokens_total - v_quota.tokens_used;

  -- Check quota only if cost > 0
  IF v_actual_cost > 0 AND v_tokens_remaining < v_actual_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'quota_exceeded',
      'tokens_total', v_quota.tokens_total,
      'tokens_used', v_quota.tokens_used,
      'tokens_remaining', v_tokens_remaining
    );
  END IF;

  -- Update quota with actual cost
  UPDATE report_quota
  SET tokens_used = tokens_used + v_actual_cost, updated_at = now()
  WHERE id = v_quota.id;

  -- Record generation
  INSERT INTO report_generations (organization_id, user_id, year, generation_type, pages_count, tokens_consumed)
  VALUES (p_organization_id, p_user_id, p_year, p_generation_type, p_pages_count, v_actual_cost);

  RETURN jsonb_build_object(
    'success', true,
    'tokens_total', v_quota.tokens_total,
    'tokens_used', v_quota.tokens_used + v_actual_cost,
    'tokens_remaining', v_tokens_remaining - v_actual_cost
  );
END;
$function$;
