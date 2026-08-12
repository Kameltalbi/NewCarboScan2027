
-- 1. Révoquer l'abonnement frauduleux
DELETE FROM public.user_subscriptions WHERE user_id = 'd46e3946-0ecd-48c9-8d48-4a07f0d8f882';

-- 2. Révoquer les modules activés frauduleusement  
DELETE FROM public.organization_modules WHERE org_id = 'e5c20e42-698e-4e77-862a-471d9fce4973';

-- 3. Nettoyer le validated_at des ordres annulés
UPDATE public.orders SET validated_at = NULL WHERE user_id = 'd46e3946-0ecd-48c9-8d48-4a07f0d8f882' AND status = 'cancelled';

-- 4. GARDE-FOU : Trigger qui révoque automatiquement l'abonnement quand une commande est annulée
CREATE OR REPLACE FUNCTION public.revoke_subscription_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si le statut passe à 'cancelled', révoquer l'abonnement et les modules
  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    -- Désactiver l'abonnement
    UPDATE public.user_subscriptions
    SET status = 'cancelled', updated_at = now()
    WHERE user_id = NEW.user_id
      AND plan_type = NEW.plan_type
      AND status = 'active';

    -- Désactiver les modules liés à l'organisation de cet utilisateur
    UPDATE public.organization_modules
    SET active = false, updated_at = now()
    WHERE org_id IN (
      SELECT id FROM public.organizations WHERE user_id = NEW.user_id
    )
    AND expires_at IS NOT NULL; -- Ne toucher qu'aux modules avec expiration (liés à un abonnement)
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attacher le trigger sur la table orders
DROP TRIGGER IF EXISTS trg_revoke_on_order_cancel ON public.orders;
CREATE TRIGGER trg_revoke_on_order_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_subscription_on_order_cancel();
