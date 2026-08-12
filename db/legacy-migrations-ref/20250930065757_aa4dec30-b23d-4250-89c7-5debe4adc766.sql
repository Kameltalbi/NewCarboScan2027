-- Fix the subscription creation trigger to handle null user_id for Pro plan orders
CREATE OR REPLACE FUNCTION public.create_subscription_on_order_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create subscription if user_id is not null
  -- This allows Pro plan orders without user accounts to be validated
  IF NEW.status = 'validated' 
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'validated')
     AND NEW.user_id IS NOT NULL THEN
    
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_type,
      status,
      started_at,
      expires_at,
      assessments_used,
      assessments_limit,
      features
    )
    VALUES (
      NEW.user_id,
      NEW.plan_type,
      'active',
      NEW.validated_at,
      NEW.validated_at + INTERVAL '1 year',
      0,
      CASE 
        WHEN NEW.plan_type = 'essential' THEN 3
        WHEN NEW.plan_type = 'carbo_start' THEN 3
        WHEN NEW.plan_type = 'carbo_plus' THEN 10
        WHEN NEW.plan_type = 'carbo_pro' THEN 50
        ELSE 3
      END,
      jsonb_build_object(
        'carbon_assessments', true,
        'detailed_reports', true,
        'email_support', true
      )
    )
    ON CONFLICT (user_id, plan_type) DO UPDATE SET
      status = 'active',
      started_at = NEW.validated_at,
      expires_at = NEW.validated_at + INTERVAL '1 year',
      assessments_used = 0;
  END IF;
  
  RETURN NEW;
END;
$function$;