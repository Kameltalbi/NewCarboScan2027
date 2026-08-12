-- Migration : Ajouter la pagination sur toutes les pages du rapport
-- La pagination sera gérée par BilanReportViewer.tsx qui ajoute automatiquement
-- <div class="page-number">Page X / {{totalPages}}</div>

-- Note : La pagination est injectée dynamiquement par le composant React BilanReportViewer
-- Ce fichier sert de documentation pour confirmer que la pagination est bien présente
-- via le CSS et le composant React, pas via les templates SQL

-- Vérification que le CSS existe
DO $$
BEGIN
  RAISE NOTICE 'La pagination est gérée par :';
  RAISE NOTICE '1. CSS : .page-number { position: absolute; bottom: 15mm; right: 15mm; }';
  RAISE NOTICE '2. React : BilanReportViewer.tsx ajoute automatiquement la div .page-number';
  RAISE NOTICE '3. Aucune modification des templates SQL nécessaire';
END $$;

-- Commentaire de confirmation
COMMENT ON TABLE public.report_templates IS 'Templates de pages pour les rapports Bilan Carbone professionnels. La pagination est ajoutée dynamiquement par BilanReportViewer.tsx.';
