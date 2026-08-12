
-- Remplacer le module Energy par Gestion des Fournisseurs
UPDATE modules SET 
  slug = 'fournisseurs',
  name = 'Gestion Fournisseurs',
  description = 'Référencez et pilotez vos fournisseurs : collecte d''empreinte carbone, questionnaires climat, suivi des engagements et conformité internationale',
  icon = 'Users',
  route = '/app/fournisseurs'
WHERE id = '319ce994-5334-4589-89b2-08f879e3d67b';

-- Mettre à jour la landing page associée
UPDATE modules SET 
  slug = 'landing-fournisseurs',
  name = 'Page Gestion Fournisseurs'
WHERE id = 'c89d593d-0865-43b2-b04e-00f3a4f478c6';
