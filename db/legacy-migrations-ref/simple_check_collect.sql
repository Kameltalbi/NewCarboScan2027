-- Vérification simple : Est-ce que les tables existent ?
-- Ce script ne fait que vérifier l'existence des tables, sans essayer de compter les lignes

SELECT 
  'collect_sessions' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_sessions'
    ) THEN '✅ EXISTE'
    ELSE '❌ MANQUANTE'
  END as statut

UNION ALL

SELECT 
  'collect_files' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_files'
    ) THEN '✅ EXISTE'
    ELSE '❌ MANQUANTE'
  END as statut

UNION ALL

SELECT 
  'collect_responses' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_responses'
    ) THEN '✅ EXISTE'
    ELSE '❌ MANQUANTE'
  END as statut

UNION ALL

SELECT 
  'collect_ai_suggestions' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions'
    ) THEN '✅ EXISTE'
    ELSE '❌ MANQUANTE'
  END as statut

ORDER BY 
  CASE statut
    WHEN '❌ MANQUANTE' THEN 1
    WHEN '✅ EXISTE' THEN 2
  END,
  table_name;

