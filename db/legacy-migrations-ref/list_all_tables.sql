-- Lister toutes les tables dans le schéma public
-- Pour voir ce qui existe réellement

SELECT 
  table_name,
  'Table existe' as info
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

