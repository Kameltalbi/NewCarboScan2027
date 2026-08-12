-- 1. Créer une organisation pour chaque utilisateur avec abonnement actif qui n'en a pas
INSERT INTO public.organizations (user_id, name)
SELECT DISTINCT us.user_id, COALESCE(p.company_name, 'Mon Organisation')
FROM public.user_subscriptions us
LEFT JOIN public.profiles p ON p.user_id = us.user_id
WHERE us.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.user_id = us.user_id
  );

-- 2. Récupérer l'ID du module bilan-carbone
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE slug = 'bilan-carbone';
  
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Module bilan-carbone not found';
  END IF;
  
  -- 3. Lier toutes les organisations des utilisateurs avec abonnement actif au module bilan-carbone
  INSERT INTO public.organization_modules (org_id, module_id, active, started_at, expires_at)
  SELECT 
    o.id,
    v_module_id,
    true,
    COALESCE(us.started_at, now()),
    us.expires_at
  FROM public.organizations o
  JOIN public.user_subscriptions us ON us.user_id = o.user_id
  WHERE us.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_modules om 
      WHERE om.org_id = o.id AND om.module_id = v_module_id
    );
END $$;

-- 4. Créer un trigger pour automatiquement lier les nouveaux abonnés au module bilan-carbone
CREATE OR REPLACE FUNCTION public.auto_link_bilan_carbone_on_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_module_id UUID;
BEGIN
  -- Ne traiter que les abonnements actifs
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer ou créer l'organisation
  SELECT id INTO v_org_id FROM public.organizations WHERE user_id = NEW.user_id;
  
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (user_id, name)
    SELECT NEW.user_id, COALESCE(p.company_name, 'Mon Organisation')
    FROM public.profiles p WHERE p.user_id = NEW.user_id
    UNION ALL
    SELECT NEW.user_id, 'Mon Organisation' WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id
    )
    LIMIT 1
    RETURNING id INTO v_org_id;
  END IF;
  
  -- Récupérer l'ID du module bilan-carbone
  SELECT id INTO v_module_id FROM public.modules WHERE slug = 'bilan-carbone';
  
  IF v_module_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    -- Lier au module bilan-carbone
    INSERT INTO public.organization_modules (org_id, module_id, active, started_at, expires_at)
    VALUES (v_org_id, v_module_id, true, NEW.started_at, NEW.expires_at)
    ON CONFLICT (org_id, module_id) DO UPDATE SET
      active = true,
      started_at = EXCLUDED.started_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Créer le trigger
DROP TRIGGER IF EXISTS on_subscription_created_link_bilan_carbone ON public.user_subscriptions;
CREATE TRIGGER on_subscription_created_link_bilan_carbone
  AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_bilan_carbone_on_subscription();