-- Vérification complète de l'installation CarboScan Collect
-- Retourne un tableau avec tous les éléments à vérifier

-- 1. TABLES
SELECT 'Tables' as categorie, 'collect_sessions' as element,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_sessions')
    THEN '✅ OK' ELSE '❌ MANQUANT' END as statut
UNION ALL
SELECT 'Tables', 'collect_files',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_files')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Tables', 'collect_responses',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_responses')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Tables', 'collect_ai_suggestions',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions')
    THEN '✅ OK' ELSE '❌ MANQUANT' END

-- 2. INDEX PRINCIPAUX
UNION ALL
SELECT 'Index', 'idx_collect_sessions_user_id',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collect_sessions_user_id')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Index', 'idx_collect_files_session_id',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collect_files_session_id')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Index', 'idx_collect_responses_session_id',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collect_responses_session_id')
    THEN '✅ OK' ELSE '❌ MANQUANT' END

-- 3. FONCTIONS
UNION ALL
SELECT 'Fonctions', 'update_collect_updated_at',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_collect_updated_at')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Fonctions', 'calculate_collect_session_progress',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'calculate_collect_session_progress')
    THEN '✅ OK' ELSE '❌ MANQUANT' END

-- 4. TRIGGERS
UNION ALL
SELECT 'Triggers', 'update_collect_sessions_updated_at',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND t.tgname = 'update_collect_sessions_updated_at')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Triggers', 'update_collect_responses_updated_at',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND t.tgname = 'update_collect_responses_updated_at')
    THEN '✅ OK' ELSE '❌ MANQUANT' END

-- 5. BUCKET STORAGE
UNION ALL
SELECT 'Storage', 'Bucket collect-files',
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'collect-files')
    THEN '✅ OK' ELSE '❌ MANQUANT' END

-- 6. POLICIES RLS PRINCIPALES
UNION ALL
SELECT 'Policies RLS', 'Users can view their own collect sessions',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'Users can view their own collect sessions')
    THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL
SELECT 'Policies RLS', 'Users can create their own collect sessions',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'Users can create their own collect sessions')
    THEN '✅ OK' ELSE '❌ MANQUANT' END

ORDER BY categorie, element;

