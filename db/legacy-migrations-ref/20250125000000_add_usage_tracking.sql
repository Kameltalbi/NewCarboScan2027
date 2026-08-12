-- Migration to add usage tracking and subscription limits
-- Add usage tracking columns to user_subscriptions table

-- Add columns for tracking usage
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS assessments_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assessments_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS annual_fee DECIMAL(10,2) DEFAULT 2500.00;

-- Create function to check if user can create new assessment
CREATE OR REPLACE FUNCTION public.can_create_assessment(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    JOIN public.orders o ON o.user_id = us.user_id
    WHERE us.user_id = _user_id
      AND us.status = 'active'
      AND o.status = 'validated'
      AND us.assessments_used < us.assessments_limit
      AND (us.expires_at IS NULL OR us.expires_at > now())
  )
$$;

-- Create function to increment assessment usage
CREATE OR REPLACE FUNCTION public.increment_assessment_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_subscriptions 
  SET assessments_used = assessments_used + 1,
      updated_at = now()
  WHERE user_id = _user_id 
    AND status = 'active';
END;
$$;

-- Create function to get user assessment usage
CREATE OR REPLACE FUNCTION public.get_assessment_usage(_user_id uuid)
RETURNS TABLE(
  assessments_used integer,
  assessments_limit integer,
  assessments_remaining integer,
  can_create_new boolean
) 
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    us.assessments_used,
    us.assessments_limit,
    (us.assessments_limit - us.assessments_used) as assessments_remaining,
    public.can_create_assessment(_user_id) as can_create_new
  FROM public.user_subscriptions us
  JOIN public.orders o ON o.user_id = us.user_id
  WHERE us.user_id = _user_id
    AND us.status = 'active'
    AND o.status = 'validated'
  ORDER BY us.created_at DESC
  LIMIT 1;
$$;

-- Update existing subscriptions to have proper limits
UPDATE public.user_subscriptions 
SET assessments_limit = 3,
    assessments_used = 0,
    annual_fee = 2500.00
WHERE assessments_limit IS NULL;

-- Create trigger to automatically create subscription when order is validated
CREATE OR REPLACE FUNCTION public.create_subscription_on_order_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create subscription when order is validated
  IF NEW.status = 'validated' AND OLD.status != 'validated' THEN
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
      NEW.validated_at + INTERVAL '1 year', -- 1 year subscription
      0, -- Start with 0 assessments used
      3, -- Limit of 3 assessments
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
      assessments_used = 0, -- Reset usage when renewing
      assessments_limit = 3;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS create_subscription_on_validation ON public.orders;
CREATE TRIGGER create_subscription_on_validation
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_subscription_on_order_validation(); 