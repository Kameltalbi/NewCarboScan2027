-- Script de vérification pour CarboScan Collect - Version avec résultats visibles
-- Ce script retourne des tableaux pour voir clairement l'état de l'installation

-- ============================================
-- 1. VÉRIFICATION DES TABLES
-- ============================================
SELECT 
  'Tables' as categorie,
  table_name as element,
  CASE 
    WHEN table_name IN (
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('collect_sessions', 'collect_files', 'collect_responses', 'collect_ai_suggestions')
    ) THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as statut
FROM (
  SELECT unnest(ARRAY['collect_sessions', 'collect_files', 'collect_responses', 'collect_ai_suggestions']) as table_name
) t

UNION ALL

-- ============================================
-- 2. VÉRIFICATION DES INDEX PRINCIPAUX
-- ============================================
SELECT 
  'Index' as categorie,
  index_name as element,
  CASE 
    WHEN index_name IN (
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    ) THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as statut
FROM (
  SELECT unnest(ARRAY[
    'idx_collect_sessions_user_id',
    'idx_collect_files_session_id',
    'idx_collect_responses_session_id',
    'idx_collect_ai_suggestions_session_id'
  ]) as index_name
) i

UNION ALL

-- ============================================
-- 3. VÉRIFICATION DES FONCTIONS
-- ============================================
SELECT 
  'Fonctions' as categorie,
  function_name as element,
  CASE 
    WHEN function_name IN (
      SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
    ) THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as statut
FROM (
  SELECT unnest(ARRAY[
    'update_collect_updated_at',
    'calculate_collect_session_progress'
  ]) as function_name
) f

UNION ALL

-- ============================================
-- 4. VÉRIFICATION DES TRIGGERS
-- ============================================
SELECT 
  'Triggers' as categorie,
  trigger_name as element,
  CASE 
    WHEN trigger_name IN (
      SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
    ) THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as statut
FROM (
  SELECT unnest(ARRAY[
    'update_collect_sessions_updated_at',
    'update_collect_responses_updated_at',
    'update_collect_ai_suggestions_updated_at'
  ]) as trigger_name
) tr

UNION ALL

-- ============================================
-- 5. VÉRIFICATION DU BUCKET DE STOCKAGE
-- ============================================
SELECT 
  'Storage' as categorie,
  'Bucket collect-files' as element,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'collect-files'
    ) THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as statut

UNION ALL

-- ============================================
-- 6. VÉRIFICATION DES POLICIES RLS PRINCIPALES
-- ============================================
SELECT 
  'Policies RLS' as categorie,
  policy_name as element,
  CASE 
    WHEN policy_name IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
    ) THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as statut
FROM (
  SELECT unnest(ARRAY[
    'Users can view their own collect sessions',
    'Users can create their own collect sessions',
    'Users can view their own files',
    'Users can view responses from their sessions',
    'Users can view AI suggestions from their sessions'
  ]) as policy_name
) p

UNION ALL

-- ============================================
-- 7. STATISTIQUES (si des données existent)
-- ============================================
SELECT 
  'Statistiques' as categorie,
  'Sessions de collecte' as element,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_sessions'
    ) THEN (
      SELECT COUNT(*)::text FROM public.collect_sessions
    )
    ELSE 'Table inexistante'
  END as statut

UNION ALL

SELECT 
  'Statistiques' as categorie,
  'Réponses collectées' as element,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_responses'
    ) THEN (
      SELECT COUNT(*)::text FROM public.collect_responses
    )
    ELSE 'Table inexistante'
  END as statut

UNION ALL

SELECT 
  'Statistiques' as categorie,
  'Fichiers uploadés' as element,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_files'
    ) THEN (
      SELECT COUNT(*)::text FROM public.collect_files
    )
    ELSE 'Table inexistante'
  END as statut

UNION ALL

SELECT 
  'Statistiques' as categorie,
  'Suggestions IA' as element,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions'
    ) THEN (
      SELECT COUNT(*)::text FROM public.collect_ai_suggestions
    )
    ELSE 'Table inexistante'
  END as statut

ORDER BY 
  CASE categorie
    WHEN 'Tables' THEN 1
    WHEN 'Index' THEN 2
    WHEN 'Fonctions' THEN 3
    WHEN 'Triggers' THEN 4
    WHEN 'Storage' THEN 5
    WHEN 'Policies RLS' THEN 6
    WHEN 'Statistiques' THEN 7
  END,
  element;

-- ============================================
-- RÉSUMÉ DÉTAILLÉ DES TABLES
-- ============================================
SELECT 
  'DÉTAIL DES TABLES' as info,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = t.table_name) as nombre_colonnes,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as statut
FROM (
  SELECT unnest(ARRAY['collect_sessions', 'collect_files', 'collect_responses', 'collect_ai_suggestions']) as table_name
) t
ORDER BY table_name;

