-- Script de vérification : toutes les tables Collect doivent être supprimées
-- Exécutez ce script pour vérifier que la suppression a bien fonctionné

SELECT 
  'collect_sessions' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_sessions')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END as status
UNION ALL
SELECT 'collect_responses',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_responses')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_files',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_files')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_ai_suggestions',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_ai_suggestions')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_data_history',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_data_history')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_sites',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_sites')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_roles',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_roles')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_permissions',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_permissions')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_user_roles',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_user_roles')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_alert_settings',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_alert_settings')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_alerts',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_alerts')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_suggestion_patterns',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_suggestion_patterns')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_tasks',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_tasks')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_notifications',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_notifications')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_comments',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_comments')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_periodic_history',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_periodic_history')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
UNION ALL
SELECT 'collect_documents',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collect_documents')
    THEN '❌ EXISTE ENCORE'
    ELSE '✅ SUPPRIMÉE'
  END
ORDER BY table_name;



