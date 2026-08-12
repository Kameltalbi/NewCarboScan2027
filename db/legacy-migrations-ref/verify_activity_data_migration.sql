-- Script de vérification de la migration activity_data
-- À exécuter dans Supabase SQL Editor pour vérifier que tout est bien créé

-- 1. Vérifier l'existence de la table activity_data
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'activity_data';

-- 2. Vérifier les colonnes de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_data'
ORDER BY ordinal_position;

-- 3. Vérifier les enums créés
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('activity_type_enum', 'activity_category_enum', 'data_quality_enum')
ORDER BY t.typname, e.enumsortorder;

-- 4. Vérifier les index créés
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'activity_data'
ORDER BY indexname;

-- 5. Vérifier les fonctions RPC créées
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('calculate_activity_emissions', 'get_data_quality_stats')
ORDER BY routine_name;

-- 6. Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'activity_data'
ORDER BY policyname;

-- 7. Vérifier que RLS est activé
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'activity_data';

-- 8. Test rapide : compter les lignes (devrait être 0 pour une nouvelle table)
SELECT COUNT(*) AS total_rows FROM activity_data;

