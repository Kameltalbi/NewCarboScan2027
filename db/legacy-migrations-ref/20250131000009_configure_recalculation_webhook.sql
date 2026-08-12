-- Migration: Configuration de l'URL du webhook de recalcul automatique
-- Créé: 2026-01-26
-- Description: Configure l'URL de la Edge Function pour les recalculs automatiques

-- =========================
-- 1. CONFIGURATION DU WEBHOOK
-- =========================

-- Note: Cette valeur doit être mise à jour avec l'URL réelle de votre projet Supabase
-- Format: https://[PROJECT_REF].supabase.co/functions/v1/recalculate-on-activity-change

-- Pour le développement local:
-- ALTER DATABASE postgres SET app.settings.recalculation_webhook_url = 'http://localhost:54321/functions/v1/recalculate-on-activity-change';

-- Pour la production (à remplacer avec votre PROJECT_REF):
-- ALTER DATABASE postgres SET app.settings.recalculation_webhook_url = 'https://[PROJECT_REF].supabase.co/functions/v1/recalculate-on-activity-change';

-- Configuration temporaire (remplacez par votre URL réelle)
DO $$
BEGIN
  -- Essayer de configurer l'URL du webhook
  -- Cette valeur sera lue par le trigger trigger_recalculation_webhook()
  PERFORM set_config('app.settings.recalculation_webhook_url', 
    current_setting('SUPABASE_URL', true) || '/functions/v1/recalculate-on-activity-change', 
    false);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not set webhook URL. Please configure manually with:';
  RAISE NOTICE 'ALTER DATABASE postgres SET app.settings.recalculation_webhook_url = ''https://[YOUR_PROJECT_REF].supabase.co/functions/v1/recalculate-on-activity-change'';';
END$$;

-- =========================
-- 2. HELPER FUNCTION: Obtenir l'URL du webhook
-- =========================

CREATE OR REPLACE FUNCTION get_recalculation_webhook_url()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.settings.recalculation_webhook_url', true);
END;
$$;

COMMENT ON FUNCTION get_recalculation_webhook_url IS 'Retourne l''URL du webhook de recalcul configurée';

-- =========================
-- 3. VÉRIFICATION
-- =========================

-- Pour vérifier la configuration:
-- SELECT get_recalculation_webhook_url();

-- Pour mettre à jour la configuration (remplacer par votre URL):
-- ALTER DATABASE postgres SET app.settings.recalculation_webhook_url = 'https://[PROJECT_REF].supabase.co/functions/v1/recalculate-on-activity-change';
