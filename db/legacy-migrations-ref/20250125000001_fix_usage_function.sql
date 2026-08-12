-- Fix the get_assessment_usage function to properly return data
CREATE OR REPLACE FUNCTION public.get_assessment_usage(_user_id uuid)
RETURNS TABLE(
  assessments_used integer,
  assessments_limit integer,
  assessments_remaining integer,
  can_create_new boolean
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  subscription_record RECORD;
  has_valid_subscription BOOLEAN := FALSE;
BEGIN
  -- First, try to get subscription data
  SELECT 
    us.assessments_used,
    us.assessments_limit,
    us.status
  INTO subscription_record
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Check if we found a subscription
  IF FOUND THEN
    has_valid_subscription := TRUE;
  ELSE
    -- Check if user has validated order (fallback)
    SELECT TRUE INTO has_valid_subscription
    FROM public.orders o
    WHERE o.user_id = _user_id
      AND o.status = 'validated'
    LIMIT 1;
    
    -- Set default values if only order exists
    IF FOUND THEN
      subscription_record.assessments_used := 0;
      subscription_record.assessments_limit := 3;
    END IF;
  END IF;

  -- Return the results
  IF has_valid_subscription THEN
    RETURN QUERY SELECT 
      COALESCE(subscription_record.assessments_used, 0)::integer,
      COALESCE(subscription_record.assessments_limit, 3)::integer,
      GREATEST(COALESCE(subscription_record.assessments_limit, 3) - COALESCE(subscription_record.assessments_used, 0), 0)::integer,
      (COALESCE(subscription_record.assessments_used, 0) < COALESCE(subscription_record.assessments_limit, 3))::boolean;
  ELSE
    -- No subscription found
    RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, FALSE::boolean;
  END IF;
END;
$$; 