-- Test rapide : Vérification des 4 tables principales
SELECT 
  'collect_sessions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'collect_sessions'
  ) THEN '✅ OK' ELSE '❌ MANQUANT' END as statut

UNION ALL

SELECT 
  'collect_files' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'collect_files'
  ) THEN '✅ OK' ELSE '❌ MANQUANT' END as statut

UNION ALL

SELECT 
  'collect_responses' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'collect_responses'
  ) THEN '✅ OK' ELSE '❌ MANQUANT' END as statut

UNION ALL

SELECT 
  'collect_ai_suggestions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions'
  ) THEN '✅ OK' ELSE '❌ MANQUANT' END as statut;

