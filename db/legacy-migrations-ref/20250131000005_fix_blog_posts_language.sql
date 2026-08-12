-- Migration pour s'assurer que tous les articles de blog ont une langue définie
-- Mettre à jour les articles qui n'ont pas de langue ou qui ont une langue NULL

UPDATE public.blog_posts 
SET language = 'fr' 
WHERE language IS NULL OR language = '';

-- Vérifier qu'il n'y a plus d'articles sans langue
-- SELECT COUNT(*) FROM public.blog_posts WHERE language IS NULL OR language = '';


