-- 053 — Brouillons CH06. Additive : aucune table nouvelle, aucune suppression, aucun modèle activé.
-- Les textes sont ceux de CHAPTER6_DRAFT_MODELS dans packages/reporting/src/library/catalog.ts.
-- Le statut reste draft tant qu'une validation explicite n'a pas eu lieu.

INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'CH06-M01', 1, 'draft', 'CarboScan', '07', 'poste', 20,
  'Poste dominant documenté', $body$« {poste} » est le premier poste du classement. Il représente {partDuTotal} du total. La donnée est {qualite}, la méthode est {methode}, et la source du facteur est {sourceFacteur}. {ancrage} Ce constat documente le rang du poste. Il ne décrit pas un procédé, un équipement ni un profil d'usage. Une incertitude déclarée sur la ligne, lorsqu'elle existe, n'est pas un intervalle de confiance. La conséquence est de s'appuyer sur ce poste pour la lecture, sans lui prêter une cause absente de la donnée.$body$,
  '["poste","partDuTotal","methode","qualite","sourceFacteur","ancrage"]'::jsonb,
  $cond${"regle":"Premier poste au-dessus du seuil de significativité, donnée primaire, méthode facture ou mesure nulle, facteur hors démonstration."}$cond$::jsonb,
  ARRAY['standard'],
  $note$Brouillon non activé. Prévisualisation seulement. OpenAI n'est pas utilisé pour ce commentaire.$note$,
  false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'CH06-M01');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du brouillon CH06, non activé'
FROM report_paragraphs p
WHERE p.code_paragraph = 'CH06-M01'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du brouillon CH06, non activé'
  );

INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'CH06-M02', 1, 'draft', 'CarboScan', '07', 'poste', 21,
  'Poste dominant estimé ou monétaire', $body$« {poste} » arrive en tête du classement et représente {partDuTotal} du total. La classe est {qualite}, la méthode est {methode}, et la source du facteur est {sourceFacteur}. {limite} {ancrage} Ce rang ne transforme pas la donnée en mesure physique et ne lui ajoute aucune précision. La conséquence est d'en faire une priorité de collecte avant d'en faire le support d'une décision.$body$,
  '["poste","partDuTotal","methode","qualite","sourceFacteur","limite","ancrage"]'::jsonb,
  $cond${"regle":"Premier poste au-dessus du seuil de significativité, et qualité estimée ou méthode proxy monétaire. Un poste seulement modélisé, extrapolé ou issu d'une estimation de maintenance n'est pas retenu."}$cond$::jsonb,
  ARRAY['standard'],
  $note$Brouillon non activé. Prévisualisation seulement. OpenAI n'est pas utilisé pour ce commentaire.$note$,
  false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'CH06-M02');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du brouillon CH06, non activé'
FROM report_paragraphs p
WHERE p.code_paragraph = 'CH06-M02'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du brouillon CH06, non activé'
  );

INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'CH06-M05', 1, 'draft', 'CarboScan', '03', 'lacune', 22,
  'Catégorie non évaluée', $body$« {categorie} » n'est pas quantifié. {motif} Cette absence n'est pas une émission nulle et n'est pas additionnée au total. Aucun ordre de grandeur n'est estimé à sa place. Aucune part n'est calculée, donc le seuil de significativité des postes ne s'applique pas. La conséquence est de maintenir la catégorie hors somme, comme une limite de complétude, jusqu'à ce qu'une donnée permette de l'évaluer.$body$,
  '["categorie","motif"]'::jsonb,
  $cond${"regle":"Catégorie de périmètre au statut non évalué. Le modèle ne juge pas sa significativité. Une exclusion ou une non-applicabilité ne le sélectionne pas."}$cond$::jsonb,
  ARRAY['standard'],
  $note$Brouillon non activé. Prévisualisation seulement. OpenAI n'est pas utilisé pour ce commentaire.$note$,
  false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'CH06-M05');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du brouillon CH06, non activé'
FROM report_paragraphs p
WHERE p.code_paragraph = 'CH06-M05'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du brouillon CH06, non activé'
  );
