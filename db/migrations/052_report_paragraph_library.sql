-- 052 — Bibliothèque rédactionnelle pilote.
-- Additive et réapplicable : aucune table nouvelle, aucune suppression.
-- Les textes sont ceux de packages/reporting/src/library/catalog.ts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_paragraphs_status_check') THEN
    ALTER TABLE report_paragraphs
      ADD CONSTRAINT report_paragraphs_status_check
      CHECK (status IS NULL OR status IN ('draft', 'active', 'deprecated')) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM report_paragraphs
    WHERE status IS NOT NULL AND status NOT IN ('draft', 'active', 'deprecated')
  ) THEN
    ALTER TABLE report_paragraphs VALIDATE CONSTRAINT report_paragraphs_status_check;
  END IF;
EXCEPTION
  WHEN undefined_object OR check_violation THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'report_paragraphs_code_uidx')
     AND NOT EXISTS (
       SELECT code_paragraph FROM report_paragraphs
       GROUP BY code_paragraph HAVING count(*) > 1
     )
  THEN
    CREATE UNIQUE INDEX report_paragraphs_code_uidx ON report_paragraphs (code_paragraph);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION create_paragraph_version(
  p_paragraph_id uuid,
  p_body_text text,
  p_change_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  row report_paragraphs%ROWTYPE;
BEGIN
  SELECT * INTO row FROM report_paragraphs
  WHERE id = p_paragraph_id OR paragraph_id = p_paragraph_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'paragraphe introuvable';
  END IF;
  INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
  VALUES (row.id, row.version, to_jsonb(row), p_change_reason);
  UPDATE report_paragraphs
  SET body_text = p_body_text,
      version = COALESCE(row.version, 1) + 1,
      updated_at = now()
  WHERE id = row.id;
END;
$$;


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'EXEC_SCOPE1_DOMINANT', 1, 'active', 'CarboScan', '01', 'synthese', 1,
  'Synthèse exécutive — scope 1 prédominant', $body$Le bilan de {entreprise} pour {exercice} est dominé par les émissions directes. Le scope {scopeDominant} représente {partScopeDominant} du total, devant les autres scopes évalués. Cette structure se lit d'abord à travers les sources exploitées par l'organisation. Le poste le plus élevé parmi les résultats documentés est « {postePrincipal} », de classe {qualitePoste}, collecté par {methodePoste}. Seuls les éléments déjà renseignés sur ce poste expliquent son rang : aucune cause d'exploitation supplémentaire n'est établie. La limite de cette donnée borne l'interprétation du scope dominant. La décision utile est de confirmer la mesure des sources directes les plus contributives avant de lire le reste du bilan comme un profil stable.$body$, '["entreprise","exercice","scopeDominant","partScopeDominant","postePrincipal","qualitePoste","methodePoste"]'::jsonb,
  '{"regle":"Le scope 1 est le plus élevé des scopes évalués, et l''écart avec le suivant atteint ou dépasse la bande d''équilibre."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'EXEC_SCOPE1_DOMINANT');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'EXEC_SCOPE1_DOMINANT'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'EXEC_SCOPE2_DOMINANT', 1, 'active', 'CarboScan', '01', 'synthese', 2,
  'Synthèse exécutive — scope 2 prédominant', $body$Le bilan de {entreprise} pour {exercice} est dominé par l'énergie achetée. Le scope {scopeDominant} représente {partScopeDominant} du total. Le comptage documenté est {comptageElectricite}. Le résultat couvre la production de l'énergie achetée et consommée selon cette méthode. Aucun usage, aucun équipement et aucun profil de charge ne sont déduits du seul rang de ce scope. Le poste le plus élevé est « {postePrincipal} », de classe {qualitePoste}, collecté par {methodePoste}. La lecture dépend de la qualité de cette donnée et de l'absence, le cas échéant, d'un résultat market-based. La décision utile est de documenter ce qui est réellement mesuré avant d'envisager un autre mode de comptage.$body$, '["entreprise","exercice","scopeDominant","partScopeDominant","postePrincipal","qualitePoste","methodePoste","comptageElectricite"]'::jsonb,
  '{"regle":"Le scope 2 est le plus élevé des scopes évalués, et l''écart avec le suivant atteint ou dépasse la bande d''équilibre."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'EXEC_SCOPE2_DOMINANT');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'EXEC_SCOPE2_DOMINANT'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'EXEC_SCOPE3_DOMINANT', 1, 'active', 'CarboScan', '01', 'synthese', 3,
  'Synthèse exécutive — scope 3 prédominant', $body$Le bilan de {entreprise} pour {exercice} est dominé par les émissions indirectes de la chaîne de valeur. Le scope {scopeDominant} représente {partScopeDominant} du total. Cette prédominance ne signifie pas que le périmètre est complet : les catégories non évaluées restent hors somme et ne valent pas zéro. Le poste le plus élevé parmi les résultats documentés est « {postePrincipal} », de classe {qualitePoste}, collecté par {methodePoste}. Son rang décrit la donnée disponible, pas une cause physique qui n'aurait pas été mesurée. La conséquence est de traiter ce poste comme la priorité de lecture, puis de distinguer ce qui est quantifié de ce qui est seulement déclaré absent.$body$, '["entreprise","exercice","scopeDominant","partScopeDominant","postePrincipal","qualitePoste","methodePoste"]'::jsonb,
  '{"regle":"Le scope 3 est le plus élevé des scopes évalués, et l''écart avec le suivant atteint ou dépasse la bande d''équilibre."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'EXEC_SCOPE3_DOMINANT');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'EXEC_SCOPE3_DOMINANT'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'EXEC_BALANCED', 1, 'active', 'CarboScan', '01', 'synthese', 4,
  'Synthèse exécutive — répartition équilibrée', $body$Le bilan de {entreprise} pour {exercice} ne se laisse pas résumer par un seul scope. Le scope {scopeDominant} représente {partScopeDominant} et le scope {scopeSecond} représente {partScopeSecond} : l'écart reste trop étroit pour parler de prédominance. Aucun poste n'est donc désigné comme l'explication unique du résultat. La lecture doit rester sur les deux scopes les plus élevés et sur la qualité de leurs données, sans inventer un levier commun. La décision utile est de ne pas concentrer l'analyse sur une seule famille d'émissions tant que cet équilibre demeure.$body$, '["entreprise","exercice","scopeDominant","partScopeDominant","scopeSecond","partScopeSecond"]'::jsonb,
  '{"regle":"Au moins deux scopes sont évalués et l''écart entre le premier et le deuxième reste sous la bande d''équilibre de dix points de part affichée."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'EXEC_BALANCED');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'EXEC_BALANCED'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'POST_DOMINANT_RELIABLE', 1, 'active', 'CarboScan', '07', 'poste', 5,
  'Poste dominant documenté', $body$« {poste} » est le premier poste du classement. Il représente {partDuTotal} du total. La donnée est {qualite} et la méthode est {methode}. La source du facteur est {sourceFacteur}. Ces éléments sont suffisants pour lire le rang, pas pour en déduire un procédé ou un équipement. Une incertitude, lorsqu'elle est déclarée, reste une incertitude de ligne et non un intervalle de confiance. La conséquence est de considérer ce poste comme le point d'appui le mieux documenté du bilan, tout en vérifiant que le facteur s'applique bien à l'exercice.$body$, '["poste","partDuTotal","methode","qualite","sourceFacteur"]'::jsonb,
  '{"regle":"Premier poste à résultat positif, donnée primaire, méthode de facture ou mesure nulle, facteur hors démonstration."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'POST_DOMINANT_RELIABLE');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'POST_DOMINANT_RELIABLE'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'POST_DOMINANT_UNCERTAIN', 1, 'active', 'CarboScan', '07', 'poste', 6,
  'Poste dominant incertain', $body$« {poste} » arrive en tête du classement et représente {partDuTotal} du total. Ce rang ne s'appuie pas sur une mesure suffisamment documentée : la classe est {qualite}, la méthode est {methode}, et la source du facteur est {sourceFacteur}. {limite} Le résultat reste celui du calcul déclaré. Il ne devient ni une quantité physique manquante, ni une précision acquise. La conséquence est de traiter ce poste comme une priorité de collecte avant d'en faire le support d'une décision de réduction.$body$, '["poste","partDuTotal","methode","qualite","sourceFacteur","limite"]'::jsonb,
  '{"regle":"Premier poste à résultat positif, mais donnée non primaire, méthode indirecte ou facteur de démonstration."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'POST_DOMINANT_UNCERTAIN');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'POST_DOMINANT_UNCERTAIN'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'POST_SECONDARY', 1, 'active', 'CarboScan', '07', 'poste', 7,
  'Poste secondaire', $body$« {poste} » n'est pas le premier poste : « {postePrincipal} » le précède. Il représente {partDuTotal} du total, avec une donnée {qualite} collectée par {methode}. Son intérêt est de compléter la lecture, pas de déplacer le diagnostic vers une cause qui n'est pas documentée. S'il dépasse le seuil interne de significativité, il entre dans la couverture cumulative ; sinon il reste un poste de second rang. Aucune recommandation propre à un secteur n'est ajoutée.$body$, '["poste","partDuTotal","postePrincipal","methode","qualite"]'::jsonb,
  '{"regle":"Poste à résultat positif qui n''est pas le premier du classement."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'POST_SECONDARY');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'POST_SECONDARY'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'POST_UNQUANTIFIED', 1, 'active', 'CarboScan', '03', 'lacune', 8,
  'Poste non quantifié', $body$« {categorie} » n'est pas quantifié. {motif} Cette absence n'est pas une émission nulle et n'est pas additionnée au total. Aucun ordre de grandeur n'est estimé à sa place. La conséquence est de maintenir la catégorie hors somme et de la citer comme une limite de complétude, jusqu'à ce qu'une donnée permette de l'évaluer.$body$, '["categorie","motif"]'::jsonb,
  '{"regle":"Catégorie de périmètre au statut non évalué. Une exclusion ou une non-applicabilité ne sélectionne pas ce modèle."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'POST_UNQUANTIFIED');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'POST_UNQUANTIFIED'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'DATA_ESTIMATED', 1, 'active', 'CarboScan', '08', 'qualite', 9,
  'Part importante d''estimations', $body$Les données estimées portent {partEstimee} des émissions incluses, et les données primaires {partPrimaire}. La classe estimée est donc au moins aussi lourde que les autres classes déclarées. Cette répartition décrit la classe unique de chaque ligne. Ce n'est pas un intervalle de confiance et ce n'est pas un indice de fiabilité. Les postes estimés ne se lisent pas comme des mesures physiques. La conséquence est de considérer leur rang comme une priorité de collecte, sans leur prêter une précision qui n'est pas dans le jeu.$body$, '["partEstimee","partPrimaire"]'::jsonb,
  '{"regle":"La classe estimée est déclarée et sa masse d''émissions est au moins égale à celle de chaque autre classe déclarée."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'DATA_ESTIMATED');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'DATA_ESTIMATED'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_paragraphs (
  code_paragraph, version, status, author, report_section, subsection, display_order,
  title, body_text, variables_list, activation_conditions, report_type,
  methodological_notes, is_mandatory
)
SELECT
  'TREND_NOT_COMPARABLE', 1, 'active', 'CarboScan', '09', 'evolution', 10,
  'Comparaison annuelle non fiable', $body$La comparaison annuelle n'est pas fiable. {base} Un écart entre deux totaux, lorsqu'il est calculé, décrit seulement ces totaux. Il n'est pas une réduction attribuable à des actions, et il ne se répartit pas entre les postes. Aucune cause n'est inventée pour expliquer l'écart. La décision utile est de reconstituer un inventaire antérieur de même périmètre et de même méthode avant toute lecture de trajectoire.$body$, '["base"]'::jsonb,
  '{"regle":"La comparaison est indisponible, non comparable, ou le détail de l''exercice précédent n''est pas disponible."}'::jsonb, ARRAY['standard'],
  'Modèle pilote lot 3A. La publication du rapport reste soumise à validation humaine.', false
WHERE NOT EXISTS (SELECT 1 FROM report_paragraphs WHERE code_paragraph = 'TREND_NOT_COMPARABLE');

INSERT INTO report_paragraph_history (paragraph_id, version, snapshot, change_reason)
SELECT p.id, p.version, to_jsonb(p), 'création du modèle pilote lot 3A'
FROM report_paragraphs p
WHERE p.code_paragraph = 'TREND_NOT_COMPARABLE'
  AND NOT EXISTS (
    SELECT 1 FROM report_paragraph_history h
    WHERE h.paragraph_id = p.id AND h.change_reason = 'création du modèle pilote lot 3A'
  );


INSERT INTO report_templates (
  template_code, template_name, template_type, description, section_key, title,
  paragraph_codes, is_active, version, sectors
)
SELECT
  'GES_LIBRARY_PILOT',
  'Bibliothèque pilote GES',
  'narrative',
  'Dix modèles de lecture. Aucun secteur n est privilégié : sectors reste nul.',
  'library',
  'Modèles pilotes',
  ARRAY['EXEC_SCOPE1_DOMINANT', 'EXEC_SCOPE2_DOMINANT', 'EXEC_SCOPE3_DOMINANT', 'EXEC_BALANCED', 'POST_DOMINANT_RELIABLE', 'POST_DOMINANT_UNCERTAIN', 'POST_SECONDARY', 'POST_UNQUANTIFIED', 'DATA_ESTIMATED', 'TREND_NOT_COMPARABLE'],
  true,
  1,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE template_code = 'GES_LIBRARY_PILOT');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ncs_app') THEN
    GRANT SELECT ON report_paragraphs, report_paragraph_history, report_templates TO ncs_app;
  END IF;
END $$;
