-- Create RPC functions for assessment usage management

-- Function to get assessment usage for a user
CREATE OR REPLACE FUNCTION get_assessment_usage(_user_id UUID)
RETURNS TABLE (
  assessments_used INTEGER,
  assessments_limit INTEGER,
  assessments_remaining INTEGER,
  can_create_new BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.assessments_used, 0) as assessments_used,
    COALESCE(us.assessments_limit, 0) as assessments_limit,
    GREATEST(0, COALESCE(us.assessments_limit, 0) - COALESCE(us.assessments_used, 0)) as assessments_remaining,
    CASE 
      WHEN us.status = 'active' AND COALESCE(us.assessments_used, 0) < COALESCE(us.assessments_limit, 3)
      THEN TRUE 
      ELSE FALSE 
    END as can_create_new
  FROM user_subscriptions us
  WHERE us.user_id = _user_id 
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no active subscription found, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 0 as assessments_used, 0 as assessments_limit, 0 as assessments_remaining, FALSE as can_create_new;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create assessment
CREATE OR REPLACE FUNCTION can_create_assessment(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN := FALSE;
BEGIN
  SELECT 
    CASE 
      WHEN us.status = 'active' AND COALESCE(us.assessments_used, 0) < COALESCE(us.assessments_limit, 3)
      THEN TRUE 
      ELSE FALSE 
    END INTO result
  FROM user_subscriptions us
  WHERE us.user_id = _user_id 
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(result, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment assessment usage
CREATE OR REPLACE FUNCTION increment_assessment_usage(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE user_subscriptions 
  SET 
    assessments_used = COALESCE(assessments_used, 0) + 1,
    updated_at = NOW()
  WHERE user_id = _user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND COALESCE(assessments_used, 0) < COALESCE(assessments_limit, 3);
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;