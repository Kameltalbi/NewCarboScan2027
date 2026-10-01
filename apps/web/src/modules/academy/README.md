# CarboScan Academy — ABC-15

Formation **à l'utilisation de la plateforme** (e-learning). Ce n'est pas le registre d'une session présentielle de mission.

## Routes

- `/app/academy` — catalogue
- `/app/academy/:courseId` — détail d'un parcours
- `/app/academy/:courseId/:lessonId` — leçon

## Registre de session (hors Académie)

Une formation en présentiel ou un atelier animé se note dans le plan d'actions, onglet **Mobilisation** (`/app/net-zero?tab=mobilization`) :

- public → collaborateurs, direction, etc.
- parties prenantes → participants
- action réalisée → programme / intitulé de la session
- date, responsable → intervenant
- support → nom du support (PDF, slides) ; le fichier reste chez le consultant ou le client (ABC-16)

L'Académie sert l'autoformation en ligne (`user_progress`). Elle ne remplace pas cette fiche.

## Audit (29 sept. 2026)

- Schéma SQL : `courses`, `lessons`, `lesson_resources`, `quizzes`, `user_progress` (migration 008).
- Aucun cours seedé dans les migrations : le catalogue est souvent vide en local.
- Chargement actuel : requêtes Supabase depuis `AcademyCatalogPage` (pas de route API dédiée).
- Contenu pédagogique : à compléter (parcours collecte, bilan, export, plan d'actions).
- Ne pas libeller un parcours « formation officielle » ou certifiante ABC sans validation écrite.

## Compléter le catalogue

1. Importer ou insérer des cours « Utilisation CarboScan » (titres/descriptions générales).
2. Ajouter leçons et ressources (PDF, vidéo) via tables existantes ou pipeline d'import `courses` / `lessons`.
3. Garder la progression dans `user_progress`.

## Composants

- `AcademyCard`, `LessonStepSidebar`, `LessonContent`
- Hooks : `useAcademyCourses`, `useAcademyCourse`
