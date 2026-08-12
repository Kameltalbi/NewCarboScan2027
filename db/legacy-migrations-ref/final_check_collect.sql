-- Vérification finale : CarboScan Collect
-- Cette requête retourne toujours un résultat

WITH table_check AS (
  SELECT 
    'collect_sessions' as table_name,
    EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_sessions'
    ) as exists_flag
  UNION ALL
  SELECT 
    'collect_files' as table_name,
    EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_files'
    ) as exists_flag
  UNION ALL
  SELECT 
    'collect_responses' as table_name,
    EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_responses'
    ) as exists_flag
  UNION ALL
  SELECT 
    'collect_ai_suggestions' as table_name,
    EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions'
    ) as exists_flag
)
SELECT 
  table_name,
  CASE 
    WHEN exists_flag THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as statut,
  CASE 
    WHEN exists_flag THEN 'OK'
    ELSE 'À créer'
  END as action
FROM table_check
ORDER BY 
  CASE WHEN exists_flag THEN 1 ELSE 0 END,
  table_name;

