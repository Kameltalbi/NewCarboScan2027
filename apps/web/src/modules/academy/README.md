# CarboScan Academy Module

## Structure

Ce module fournit une plateforme de formation pour les utilisateurs de CarboScan.

## Routes

- `/app/academy` - Catalogue des formations
- `/app/academy/:courseId` - Détail d'une formation
- `/app/academy/:courseId/:lessonId` - Lecture d'un module de formation

## Composants

- `AcademyCard` - Carte de formation dans le catalogue
- `LessonStepSidebar` - Barre de progression verticale des modules
- `LessonContent` - Contenu d'un module (texte, PDF, vidéo, quiz)

## Hooks

- `useAcademyCourses` - Récupère la liste des formations
- `useAcademyCourse` - Récupère les détails d'une formation et ses modules

## Tables Supabase

- `courses` - Formations
- `lessons` - Modules de formation
- `lesson_resources` - Ressources (PDF, vidéo, Excel)
- `quizzes` - Quiz
- `quiz_questions` - Questions de quiz
- `user_progress` - Progression des utilisateurs

## Notes

- Le contenu pédagogique n'est pas encore rempli
- Les placeholders sont en place pour le contenu futur
- La structure est prête pour l'ajout de contenu




