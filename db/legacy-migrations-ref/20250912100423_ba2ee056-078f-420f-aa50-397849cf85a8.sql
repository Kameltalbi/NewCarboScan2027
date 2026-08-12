-- Créer les abonnements manquants pour les utilisateurs qui ont payé
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
SELECT 
  o.user_id,
  o.plan_type,
  'active',
  o.validated_at,
  o.validated_at + INTERVAL '1 year',
  0,
  CASE 
    WHEN o.plan_type = 'essential' THEN 3
    WHEN o.plan_type = 'carbo_start' THEN 3
    WHEN o.plan_type = 'carbo_plus' THEN 10
    WHEN o.plan_type = 'carbo_pro' THEN 50
    ELSE 3
  END,
  jsonb_build_object(
    'carbon_assessments', true,
    'detailed_reports', true,
    'email_support', true
  )
FROM public.orders o
LEFT JOIN public.user_subscriptions us ON o.user_id = us.user_id
WHERE o.status = 'validated' 
  AND us.user_id IS NULL
ON CONFLICT (user_id, plan_type) DO NOTHING;

-- Créer le trigger qui manquait pour les futures commandes
CREATE OR REPLACE FUNCTION public.create_subscription_on_order_validation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create subscription when order is validated for the first time
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger s'il n'existe pas déjà
DROP TRIGGER IF EXISTS trigger_create_subscription_on_validation ON public.orders;
CREATE TRIGGER trigger_create_subscription_on_validation
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_subscription_on_order_validation();