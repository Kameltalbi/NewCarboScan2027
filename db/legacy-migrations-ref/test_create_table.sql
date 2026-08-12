-- Test : Créer une table simple pour vérifier que les permissions fonctionnent
-- Si cette requête fonctionne, alors le problème vient peut-être du script principal

CREATE TABLE IF NOT EXISTS public.test_collect_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vérifier que la table a été créée
SELECT 
  'test_collect_table' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'test_collect_table'
    ) THEN '✅ Table créée avec succès'
    ELSE '❌ Échec de création'
  END as resultat;

-- Nettoyer (optionnel - décommentez pour supprimer la table de test)
-- DROP TABLE IF EXISTS public.test_collect_table;

