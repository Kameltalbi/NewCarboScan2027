
-- 1. wattbim_buildings
CREATE TABLE public.wattbim_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  building_type TEXT NOT NULL DEFAULT 'office',
  surface_m2 NUMERIC,
  employees_count INTEGER,
  year_built INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wattbim_buildings TO authenticated;
GRANT ALL ON public.wattbim_buildings TO service_role;
ALTER TABLE public.wattbim_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wattbim_buildings_select" ON public.wattbim_buildings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "wattbim_buildings_insert" ON public.wattbim_buildings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_buildings_update" ON public.wattbim_buildings
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_buildings_delete" ON public.wattbim_buildings
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

-- 2. wattbim_meters
CREATE TABLE public.wattbim_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  building_id UUID NOT NULL REFERENCES public.wattbim_buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meter_type TEXT NOT NULL DEFAULT 'elec',
  unit TEXT NOT NULL DEFAULT 'kWh',
  provider TEXT,
  contract_ref TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wattbim_meters TO authenticated;
GRANT ALL ON public.wattbim_meters TO service_role;
ALTER TABLE public.wattbim_meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wattbim_meters_select" ON public.wattbim_meters
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "wattbim_meters_insert" ON public.wattbim_meters
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_meters_update" ON public.wattbim_meters
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_meters_delete" ON public.wattbim_meters
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

-- 3. wattbim_readings
CREATE TABLE public.wattbim_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  meter_id UUID NOT NULL REFERENCES public.wattbim_meters(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_amount NUMERIC,
  currency TEXT DEFAULT 'TND',
  source TEXT NOT NULL DEFAULT 'manual',
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  activity_data_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wattbim_readings TO authenticated;
GRANT ALL ON public.wattbim_readings TO service_role;
ALTER TABLE public.wattbim_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wattbim_readings_select" ON public.wattbim_readings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "wattbim_readings_insert" ON public.wattbim_readings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_readings_update" ON public.wattbim_readings
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_readings_delete" ON public.wattbim_readings
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE INDEX idx_wattbim_readings_meter_period ON public.wattbim_readings(meter_id, period_start DESC);
CREATE INDEX idx_wattbim_readings_org ON public.wattbim_readings(organization_id);

-- 4. wattbim_alerts
CREATE TABLE public.wattbim_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  building_id UUID REFERENCES public.wattbim_buildings(id) ON DELETE CASCADE,
  meter_id UUID REFERENCES public.wattbim_meters(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  value_observed NUMERIC,
  value_expected NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wattbim_alerts TO authenticated;
GRANT ALL ON public.wattbim_alerts TO service_role;
ALTER TABLE public.wattbim_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wattbim_alerts_select" ON public.wattbim_alerts
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "wattbim_alerts_insert" ON public.wattbim_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_alerts_update" ON public.wattbim_alerts
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_alerts_delete" ON public.wattbim_alerts
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

-- 5. wattbim_savings
CREATE TABLE public.wattbim_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  building_id UUID REFERENCES public.wattbim_buildings(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  baseline_kwh NUMERIC,
  actual_kwh NUMERIC,
  savings_kwh NUMERIC,
  savings_amount NUMERIC,
  currency TEXT DEFAULT 'TND',
  calculation_method TEXT DEFAULT 'simple',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wattbim_savings TO authenticated;
GRANT ALL ON public.wattbim_savings TO service_role;
ALTER TABLE public.wattbim_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wattbim_savings_select" ON public.wattbim_savings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "wattbim_savings_insert" ON public.wattbim_savings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_savings_update" ON public.wattbim_savings
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "wattbim_savings_delete" ON public.wattbim_savings
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'superadmin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_wattbim_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_wattbim_buildings_updated_at BEFORE UPDATE ON public.wattbim_buildings FOR EACH ROW EXECUTE FUNCTION public.update_wattbim_updated_at();
CREATE TRIGGER trg_wattbim_meters_updated_at BEFORE UPDATE ON public.wattbim_meters FOR EACH ROW EXECUTE FUNCTION public.update_wattbim_updated_at();
CREATE TRIGGER trg_wattbim_readings_updated_at BEFORE UPDATE ON public.wattbim_readings FOR EACH ROW EXECUTE FUNCTION public.update_wattbim_updated_at();
CREATE TRIGGER trg_wattbim_alerts_updated_at BEFORE UPDATE ON public.wattbim_alerts FOR EACH ROW EXECUTE FUNCTION public.update_wattbim_updated_at();
CREATE TRIGGER trg_wattbim_savings_updated_at BEFORE UPDATE ON public.wattbim_savings FOR EACH ROW EXECUTE FUNCTION public.update_wattbim_updated_at();

-- Carbon sync trigger: validated readings -> activity_data
CREATE OR REPLACE FUNCTION public.sync_wattbim_reading_to_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meter_type TEXT;
  v_category activity_category_enum;
  v_subcategory TEXT;
  v_activity_id UUID;
BEGIN
  IF NEW.is_validated IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT meter_type INTO v_meter_type FROM public.wattbim_meters WHERE id = NEW.meter_id;

  IF v_meter_type = 'elec' THEN
    v_category := 'scope2';
    v_subcategory := 'electricity';
  ELSIF v_meter_type = 'gaz' THEN
    v_category := 'scope1';
    v_subcategory := 'natural_gas';
  ELSE
    RETURN NEW; -- water etc. not synced
  END IF;

  IF NEW.activity_data_id IS NOT NULL THEN
    UPDATE public.activity_data
    SET quantity = NEW.value,
        unit = NEW.unit,
        period_start = NEW.period_start,
        period_end = NEW.period_end,
        subcategory = v_subcategory,
        category = v_category,
        updated_at = now()
    WHERE id = NEW.activity_data_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_data (
    organization_id, activity_type, category, subcategory,
    quantity, unit, period_start, period_end,
    data_quality, source_document, created_by, notes
  ) VALUES (
    NEW.organization_id, 'energy', v_category, v_subcategory,
    NEW.value, NEW.unit, NEW.period_start, NEW.period_end,
    'real', 'wattbim:' || NEW.id::text, NEW.created_by,
    'Synchronisé depuis WattBim'
  ) RETURNING id INTO v_activity_id;

  UPDATE public.wattbim_readings SET activity_data_id = v_activity_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_wattbim_to_activity
AFTER INSERT OR UPDATE OF is_validated, value, period_start, period_end ON public.wattbim_readings
FOR EACH ROW EXECUTE FUNCTION public.sync_wattbim_reading_to_activity();
