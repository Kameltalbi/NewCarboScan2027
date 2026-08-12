-- Migration pour supprimer toutes les tables du module CarboScan Collect
-- ATTENTION : Cette migration supprime définitivement toutes les données Collect

-- Supprimer les triggers d'abord (seulement si les tables existent)
-- Les triggers seront automatiquement supprimés avec les tables via CASCADE
-- Mais on les supprime explicitement pour être sûr
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collect_responses') THEN
    DROP TRIGGER IF EXISTS trg_collect_responses_history ON public.collect_responses;
    DROP TRIGGER IF EXISTS update_collect_responses_updated_at ON public.collect_responses;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collect_sessions') THEN
    DROP TRIGGER IF EXISTS update_collect_sessions_updated_at ON public.collect_sessions;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collect_ai_suggestions') THEN
    DROP TRIGGER IF EXISTS update_collect_ai_suggestions_updated_at ON public.collect_ai_suggestions;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collect_files') THEN
    DROP TRIGGER IF EXISTS update_collect_files_updated_at ON public.collect_files;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collect_tasks') THEN
    DROP TRIGGER IF EXISTS update_task_overdue_status ON public.collect_tasks;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collect_documents') THEN
    DROP TRIGGER IF EXISTS update_collect_documents_updated_at ON public.collect_documents;
  END IF;
END $$;

-- Supprimer les fonctions RPC
DROP FUNCTION IF EXISTS public.log_collect_response_change() CASCADE;
DROP FUNCTION IF EXISTS public.get_question_history(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_history(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_collect_site_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_collect_session_consolidation(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_site_for_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_collect_permission(UUID, UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_collect_roles(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_collect_users(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.find_user_by_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_suggestion_pattern(UUID, TEXT, TEXT, NUMERIC, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_pattern_based_suggestion(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_collect_tasks(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_collect_documents(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_collect_documents_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_periodic_collect_history(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_periodic_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_overdue_periodic_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.update_collect_updated_at() CASCADE;

-- Supprimer les tables dans l'ordre inverse de création (dépendances d'abord)
-- Utilisation de IF EXISTS pour éviter les erreurs si certaines tables n'existent pas
-- Tables avec foreign keys vers collect_sessions (créées dans les migrations avancées)
DROP TABLE IF EXISTS public.collect_documents CASCADE;
DROP TABLE IF EXISTS public.collect_periodic_history CASCADE;
DROP TABLE IF EXISTS public.collect_comments CASCADE;
DROP TABLE IF EXISTS public.collect_notifications CASCADE;
DROP TABLE IF EXISTS public.collect_tasks CASCADE;
DROP TABLE IF EXISTS public.collect_suggestion_patterns CASCADE;
DROP TABLE IF EXISTS public.collect_alerts CASCADE;
DROP TABLE IF EXISTS public.collect_alert_settings CASCADE;
DROP TABLE IF EXISTS public.collect_user_roles CASCADE;
DROP TABLE IF EXISTS public.collect_permissions CASCADE;
DROP TABLE IF EXISTS public.collect_roles CASCADE;
DROP TABLE IF EXISTS public.collect_sites CASCADE;
DROP TABLE IF EXISTS public.collect_data_history CASCADE;
-- Tables de base (créées dans la migration initiale)
DROP TABLE IF EXISTS public.collect_ai_suggestions CASCADE;
DROP TABLE IF EXISTS public.collect_responses CASCADE;
DROP TABLE IF EXISTS public.collect_files CASCADE;
DROP TABLE IF EXISTS public.collect_sessions CASCADE;

-- Supprimer les index (au cas où ils existeraient encore)
DROP INDEX IF EXISTS public.idx_collect_sessions_user_id;
DROP INDEX IF EXISTS public.idx_collect_sessions_status;
DROP INDEX IF EXISTS public.idx_collect_sessions_year;
DROP INDEX IF EXISTS public.idx_collect_sessions_sync_pending;
DROP INDEX IF EXISTS public.idx_collect_files_session_id;
DROP INDEX IF EXISTS public.idx_collect_files_category;
DROP INDEX IF EXISTS public.idx_collect_files_extraction_status;
DROP INDEX IF EXISTS public.idx_collect_files_user_id;
DROP INDEX IF EXISTS public.idx_collect_responses_session_id;
DROP INDEX IF EXISTS public.idx_collect_responses_question_key;
DROP INDEX IF EXISTS public.idx_collect_responses_source;
DROP INDEX IF EXISTS public.idx_collect_ai_suggestions_session_id;
DROP INDEX IF EXISTS public.idx_collect_ai_suggestions_status;

-- Supprimer le bucket de storage si nécessaire (à faire manuellement dans Supabase Dashboard)
-- Storage > Buckets > collect-files > Delete

COMMENT ON SCHEMA public IS 'Module Collect supprimé - toutes les tables ont été supprimées';

HOME PAGE CARBOSCAN — VERSION FINALE
⭐ SECTION 1 — HERO
Titre

Mesurez, suivez et réduisez vos émissions carbone en toute simplicité.

Sous-titre

Bilan Carbone™, Empreinte Produit, ACV, Collecte de données et Suivi énergétique dans une seule plateforme.

CTA principal

Demander une démo

CTA secondaire

Découvrir les solutions

🌱 SECTION 2 — Pourquoi CarboScan ?
Titre

Une plateforme simple et complète pour piloter votre stratégie climat.

Texte

CarboScan vous aide à comprendre, mesurer et réduire vos émissions.
Une solution pensée pour les entreprises tunisiennes et africaines, conforme aux meilleures méthodologies internationales.

3 blocs de valeur

Simplicité
Une interface intuitive, des modules clairs, une prise en main immédiate.

Fiabilité
Méthodologies reconnues : Bilan Carbone™, ISO 14040/44, facteurs d’émission officiels.

Adaptée à votre entreprise
Industrie, bâtiment, commerce, services : nous avons les outils qu’il vous faut.

🧩 SECTION 3 — Nos Solutions
Titre

Les solutions CarboScan

1) Bilan Carbone™ (Organisation)

Mesurez les émissions de votre entreprise sur les scopes 1, 2 et 3, avec un rapport structuré et conforme.
CTA mini : Découvrir

2) Empreinte Carbone Produit

Évaluez l’impact carbone d’un produit ou d’une gamme pour répondre aux exigences clients et appels d’offres.
CTA mini : En savoir plus

3) Analyse du Cycle de Vie (ACV)

Analyse environnementale complète selon les normes ISO 14040/44 : énergie, matières, déchets, transport.
CTA mini : Voir l’ACV

4) CarboScan Collect

Collecte simple, centralisée et intuitive de vos données carbone.
Import Excel, saisie manuelle, vérification automatique.
CTA mini : Commencer la collecte

5) CarboScan Energy

Suivez vos consommations énergétiques, comparez vos sites et identifiez les surconsommations.
CTA mini : Optimiser l’énergie

🔄 SECTION 4 — Comment ça marche ?
Titre

Commencer avec CarboScan en trois étapes

Étape 1 — Collecter

Saisissez vos données ou importez vos fichiers dans CarboScan Collect.

Étape 2 — Calculer

Calculez automatiquement vos émissions (Bilan Carbone™, Empreinte produit, ACV).

Étape 3 — Agir

Visualisez vos résultats, identifiez les priorités et mettez en place vos actions.

🏭 SECTION 5 — Ils utilisent CarboScan
Titre

Une solution conçue pour toutes les entreprises

Texte

Industrie, bâtiment, distribution, services : CarboScan accompagne déjà des organisations de toutes tailles dans leur démarche bas carbone.

Liste simple de logos ou secteurs.

🔒 SECTION 6 — Fiabilité & Conformité
Titre

Méthodes reconnues, résultats fiables

Bullet points

Basé sur la méthodologie Bilan Carbone™

ACV conforme aux normes ISO 14040/44

Facteurs d’émission Base Carbone

Intégration possible multi-sites

Export PDF et Excel

📞 SECTION 7 — CTA final
Titre

Prêt à mesurer et réduire vos émissions ?

Sous-titre

Nos experts vous accompagnent du diagnostic à l’action.

CTA principal

Demander une démo

CTA secondaire

Nous contacter