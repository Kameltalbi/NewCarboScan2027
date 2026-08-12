-- Script de vérification pour CarboScan Collect
-- Ce script vérifie que toutes les tables, index, policies, fonctions et buckets sont correctement créés

-- ============================================
-- 1. VÉRIFICATION DES TABLES
-- ============================================
DO $$
DECLARE
  table_count INTEGER;
  tables_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '=== VÉRIFICATION DES TABLES ===';
  
  -- Vérifier collect_sessions
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'collect_sessions';
  
  IF table_count = 0 THEN
    tables_missing := array_append(tables_missing, 'collect_sessions');
    RAISE NOTICE '❌ Table collect_sessions: MANQUANTE';
  ELSE
    RAISE NOTICE '✅ Table collect_sessions: OK';
  END IF;
  
  -- Vérifier collect_files
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'collect_files';
  
  IF table_count = 0 THEN
    tables_missing := array_append(tables_missing, 'collect_files');
    RAISE NOTICE '❌ Table collect_files: MANQUANTE';
  ELSE
    RAISE NOTICE '✅ Table collect_files: OK';
  END IF;
  
  -- Vérifier collect_responses
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'collect_responses';
  
  IF table_count = 0 THEN
    tables_missing := array_append(tables_missing, 'collect_responses');
    RAISE NOTICE '❌ Table collect_responses: MANQUANTE';
  ELSE
    RAISE NOTICE '✅ Table collect_responses: OK';
  END IF;
  
  -- Vérifier collect_ai_suggestions
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions';
  
  IF table_count = 0 THEN
    tables_missing := array_append(tables_missing, 'collect_ai_suggestions');
    RAISE NOTICE '❌ Table collect_ai_suggestions: MANQUANTE';
  ELSE
    RAISE NOTICE '✅ Table collect_ai_suggestions: OK';
  END IF;
  
  IF array_length(tables_missing, 1) > 0 THEN
    RAISE WARNING 'Tables manquantes: %', array_to_string(tables_missing, ', ');
  ELSE
    RAISE NOTICE '✅ Toutes les tables sont présentes';
  END IF;
END $$;

-- ============================================
-- 2. VÉRIFICATION DES INDEX
-- ============================================
DO $$
DECLARE
  index_count INTEGER;
  indexes_missing TEXT[] := ARRAY[]::TEXT[];
  required_indexes TEXT[] := ARRAY[
    'idx_collect_sessions_user_id',
    'idx_collect_sessions_status',
    'idx_collect_sessions_year',
    'idx_collect_sessions_sync_pending',
    'idx_collect_files_session_id',
    'idx_collect_files_category',
    'idx_collect_files_extraction_status',
    'idx_collect_files_user_id',
    'idx_collect_responses_session_id',
    'idx_collect_responses_question_key',
    'idx_collect_responses_category',
    'idx_collect_responses_source',
    'idx_collect_responses_scope',
    'idx_collect_ai_suggestions_session_id',
    'idx_collect_ai_suggestions_status'
  ];
  idx_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DES INDEX ===';
  
  FOREACH idx_name IN ARRAY required_indexes
  LOOP
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = idx_name;
    
    IF index_count = 0 THEN
      indexes_missing := array_append(indexes_missing, idx_name);
      RAISE NOTICE '❌ Index %: MANQUANT', idx_name;
    ELSE
      RAISE NOTICE '✅ Index %: OK', idx_name;
    END IF;
  END LOOP;
  
  IF array_length(indexes_missing, 1) > 0 THEN
    RAISE WARNING 'Index manquants: %', array_to_string(indexes_missing, ', ');
  ELSE
    RAISE NOTICE '✅ Tous les index sont présents';
  END IF;
END $$;

-- ============================================
-- 3. VÉRIFICATION DES POLICIES RLS
-- ============================================
DO $$
DECLARE
  policy_count INTEGER;
  policies_missing TEXT[] := ARRAY[]::TEXT[];
  required_policies TEXT[] := ARRAY[
    'Users can view their own collect sessions',
    'Users can create their own collect sessions',
    'Users can update their own collect sessions',
    'Users can delete their own collect sessions',
    'Users can view their own files',
    'Users can upload files to their sessions',
    'Users can delete their own files',
    'Users can view responses from their sessions',
    'Users can create responses for their sessions',
    'Users can update responses from their sessions',
    'Users can delete responses from their sessions',
    'Users can view AI suggestions from their sessions'
  ];
  policy_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DES POLICIES RLS ===';
  
  FOREACH policy_name IN ARRAY required_policies
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname = policy_name;
    
    IF policy_count = 0 THEN
      policies_missing := array_append(policies_missing, policy_name);
      RAISE NOTICE '❌ Policy %: MANQUANTE', policy_name;
    ELSE
      RAISE NOTICE '✅ Policy %: OK', policy_name;
    END IF;
  END LOOP;
  
  IF array_length(policies_missing, 1) > 0 THEN
    RAISE WARNING 'Policies manquantes: %', array_to_string(policies_missing, ', ');
  ELSE
    RAISE NOTICE '✅ Toutes les policies RLS sont présentes';
  END IF;
END $$;

-- ============================================
-- 4. VÉRIFICATION DES FONCTIONS
-- ============================================
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DES FONCTIONS ===';
  
  -- Vérifier update_collect_updated_at
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'update_collect_updated_at';
  
  IF func_count = 0 THEN
    RAISE NOTICE '❌ Fonction update_collect_updated_at: MANQUANTE';
  ELSE
    RAISE NOTICE '✅ Fonction update_collect_updated_at: OK';
  END IF;
  
  -- Vérifier calculate_collect_session_progress
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'calculate_collect_session_progress';
  
  IF func_count = 0 THEN
    RAISE NOTICE '❌ Fonction calculate_collect_session_progress: MANQUANTE';
  ELSE
    RAISE NOTICE '✅ Fonction calculate_collect_session_progress: OK';
  END IF;
END $$;

-- ============================================
-- 5. VÉRIFICATION DES TRIGGERS
-- ============================================
DO $$
DECLARE
  trigger_count INTEGER;
  triggers_missing TEXT[] := ARRAY[]::TEXT[];
  required_triggers TEXT[] := ARRAY[
    'update_collect_sessions_updated_at',
    'update_collect_responses_updated_at',
    'update_collect_ai_suggestions_updated_at'
  ];
  trigger_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DES TRIGGERS ===';
  
  FOREACH trigger_name IN ARRAY required_triggers
  LOOP
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.tgname = trigger_name;
    
    IF trigger_count = 0 THEN
      triggers_missing := array_append(triggers_missing, trigger_name);
      RAISE NOTICE '❌ Trigger %: MANQUANT', trigger_name;
    ELSE
      RAISE NOTICE '✅ Trigger %: OK', trigger_name;
    END IF;
  END LOOP;
  
  IF array_length(triggers_missing, 1) > 0 THEN
    RAISE WARNING 'Triggers manquants: %', array_to_string(triggers_missing, ', ');
  ELSE
    RAISE NOTICE '✅ Tous les triggers sont présents';
  END IF;
END $$;

-- ============================================
-- 6. VÉRIFICATION DU BUCKET DE STOCKAGE
-- ============================================
DO $$
DECLARE
  bucket_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DU BUCKET DE STOCKAGE ===';
  
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id = 'collect-files';
  
  IF bucket_count = 0 THEN
    RAISE NOTICE '❌ Bucket collect-files: MANQUANT';
  ELSE
    RAISE NOTICE '✅ Bucket collect-files: OK';
    
    -- Afficher les détails du bucket
    RAISE NOTICE '   - Taille max: 10 MB';
    RAISE NOTICE '   - Types autorisés: PDF, Excel, CSV, Images';
  END IF;
END $$;

-- ============================================
-- 7. VÉRIFICATION DES POLICIES DE STORAGE
-- ============================================
DO $$
DECLARE
  policy_count INTEGER;
  storage_policies_missing TEXT[] := ARRAY[]::TEXT[];
  required_storage_policies TEXT[] := ARRAY[
    'Users can upload collect files',
    'Users can view their collect files',
    'Users can delete their collect files'
  ];
  policy_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DES POLICIES DE STORAGE ===';
  
  FOREACH policy_name IN ARRAY required_storage_policies
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage' AND policyname = policy_name;
    
    IF policy_count = 0 THEN
      storage_policies_missing := array_append(storage_policies_missing, policy_name);
      RAISE NOTICE '❌ Policy storage %: MANQUANTE', policy_name;
    ELSE
      RAISE NOTICE '✅ Policy storage %: OK', policy_name;
    END IF;
  END LOOP;
  
  IF array_length(storage_policies_missing, 1) > 0 THEN
    RAISE WARNING 'Policies storage manquantes: %', array_to_string(storage_policies_missing, ', ');
  ELSE
    RAISE NOTICE '✅ Toutes les policies de storage sont présentes';
  END IF;
END $$;

-- ============================================
-- 8. RÉSUMÉ STATISTIQUE
-- ============================================
DO $$
DECLARE
  sessions_count INTEGER;
  responses_count INTEGER;
  files_count INTEGER;
  suggestions_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STATISTIQUES (si des données existent) ===';
  
  BEGIN
    SELECT COUNT(*) INTO sessions_count FROM public.collect_sessions;
    RAISE NOTICE '📊 Sessions de collecte: %', sessions_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Impossible de compter les sessions (table peut-être manquante)';
  END;
  
  BEGIN
    SELECT COUNT(*) INTO responses_count FROM public.collect_responses;
    RAISE NOTICE '📊 Réponses collectées: %', responses_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Impossible de compter les réponses (table peut-être manquante)';
  END;
  
  BEGIN
    SELECT COUNT(*) INTO files_count FROM public.collect_files;
    RAISE NOTICE '📊 Fichiers uploadés: %', files_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Impossible de compter les fichiers (table peut-être manquante)';
  END;
  
  BEGIN
    SELECT COUNT(*) INTO suggestions_count FROM public.collect_ai_suggestions;
    RAISE NOTICE '📊 Suggestions IA: %', suggestions_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Impossible de compter les suggestions (table peut-être manquante)';
  END;
END $$;

-- ============================================
-- 9. VÉRIFICATION DES CONTRAINTES
-- ============================================
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION DES CONTRAINTES ===';
  
  -- Vérifier la contrainte unique sur collect_responses
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'collect_responses'
    AND c.contype = 'u'
    AND c.conname LIKE '%session_id%question_key%';
  
  IF constraint_count = 0 THEN
    RAISE NOTICE '⚠️  Contrainte unique (session_id, question_key) sur collect_responses: À vérifier';
  ELSE
    RAISE NOTICE '✅ Contrainte unique (session_id, question_key) sur collect_responses: OK';
  END IF;
  
  -- Vérifier les contraintes CHECK
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname IN ('collect_sessions', 'collect_responses', 'collect_files', 'collect_ai_suggestions')
    AND c.contype = 'c';
  
  RAISE NOTICE '✅ Contraintes CHECK: % trouvées', constraint_count;
END $$;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VÉRIFICATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Si tous les éléments affichent ✅, l''installation est complète !';
  RAISE NOTICE 'Si des éléments affichent ❌, réexécutez le script de migration.';
  RAISE NOTICE '';
END $$;

