/** Modèles pilotes. Le texte ne contient aucun chiffre : les valeurs viennent des variables. */
export interface ParagraphModel {
  code: string;
  title: string;
  chapter: string;
  analysisType: string;
  /** Règle lisible. Le sélecteur l'applique ; elle est aussi stockée en base. */
  rule: string;
  requiredVariables: string[];
  body: string;
  version: number;
  status: "draft" | "active" | "deprecated";
}

export const PILOT_MODELS: ParagraphModel[] = [
  {
    code: "EXEC_SCOPE1_DOMINANT",
    title: "Synthèse exécutive — scope 1 prédominant",
    chapter: "01",
    analysisType: "synthese",
    rule: "Le scope 1 est le plus élevé des scopes évalués, et l'écart avec le suivant atteint ou dépasse la bande d'équilibre.",
    requiredVariables: ["entreprise", "exercice", "scopeDominant", "partScopeDominant", "postePrincipal", "qualitePoste", "methodePoste"],
    body: "Le bilan de {entreprise} pour {exercice} est dominé par les émissions directes. Le scope {scopeDominant} représente {partScopeDominant} du total, devant les autres scopes évalués. Cette structure se lit d'abord à travers les sources exploitées par l'organisation. Le poste le plus élevé parmi les résultats documentés est « {postePrincipal} », de classe {qualitePoste}, collecté par {methodePoste}. Seuls les éléments déjà renseignés sur ce poste expliquent son rang : aucune cause d'exploitation supplémentaire n'est établie. La limite de cette donnée borne l'interprétation du scope dominant. La décision utile est de confirmer la mesure des sources directes les plus contributives avant de lire le reste du bilan comme un profil stable.",
    version: 1,
    status: "active",
  },
  {
    code: "EXEC_SCOPE2_DOMINANT",
    title: "Synthèse exécutive — scope 2 prédominant",
    chapter: "01",
    analysisType: "synthese",
    rule: "Le scope 2 est le plus élevé des scopes évalués, et l'écart avec le suivant atteint ou dépasse la bande d'équilibre.",
    requiredVariables: ["entreprise", "exercice", "scopeDominant", "partScopeDominant", "postePrincipal", "qualitePoste", "methodePoste", "comptageElectricite"],
    body: "Le bilan de {entreprise} pour {exercice} est dominé par l'énergie achetée. Le scope {scopeDominant} représente {partScopeDominant} du total. Le comptage documenté est {comptageElectricite}. Le résultat couvre la production de l'énergie achetée et consommée selon cette méthode. Aucun usage, aucun équipement et aucun profil de charge ne sont déduits du seul rang de ce scope. Le poste le plus élevé est « {postePrincipal} », de classe {qualitePoste}, collecté par {methodePoste}. La lecture dépend de la qualité de cette donnée et de l'absence, le cas échéant, d'un résultat market-based. La décision utile est de documenter ce qui est réellement mesuré avant d'envisager un autre mode de comptage.",
    version: 1,
    status: "active",
  },
  {
    code: "EXEC_SCOPE3_DOMINANT",
    title: "Synthèse exécutive — scope 3 prédominant",
    chapter: "01",
    analysisType: "synthese",
    rule: "Le scope 3 est le plus élevé des scopes évalués, et l'écart avec le suivant atteint ou dépasse la bande d'équilibre.",
    requiredVariables: ["entreprise", "exercice", "scopeDominant", "partScopeDominant", "postePrincipal", "qualitePoste", "methodePoste"],
    body: "Le bilan de {entreprise} pour {exercice} est dominé par les émissions indirectes de la chaîne de valeur. Le scope {scopeDominant} représente {partScopeDominant} du total. Cette prédominance ne signifie pas que le périmètre est complet : les catégories non évaluées restent hors somme et ne valent pas zéro. Le poste le plus élevé parmi les résultats documentés est « {postePrincipal} », de classe {qualitePoste}, collecté par {methodePoste}. Son rang décrit la donnée disponible, pas une cause physique qui n'aurait pas été mesurée. La conséquence est de traiter ce poste comme la priorité de lecture, puis de distinguer ce qui est quantifié de ce qui est seulement déclaré absent.",
    version: 1,
    status: "active",
  },
  {
    code: "EXEC_BALANCED",
    title: "Synthèse exécutive — répartition équilibrée",
    chapter: "01",
    analysisType: "synthese",
    rule: "Au moins deux scopes sont évalués et l'écart entre le premier et le deuxième reste sous la bande d'équilibre de dix points de part affichée.",
    requiredVariables: ["entreprise", "exercice", "scopeDominant", "partScopeDominant", "scopeSecond", "partScopeSecond"],
    body: "Le bilan de {entreprise} pour {exercice} ne se laisse pas résumer par un seul scope. Le scope {scopeDominant} représente {partScopeDominant} et le scope {scopeSecond} représente {partScopeSecond} : l'écart reste trop étroit pour parler de prédominance. Aucun poste n'est donc désigné comme l'explication unique du résultat. La lecture doit rester sur les deux scopes les plus élevés et sur la qualité de leurs données, sans inventer un levier commun. La décision utile est de ne pas concentrer l'analyse sur une seule famille d'émissions tant que cet équilibre demeure.",
    version: 1,
    status: "active",
  },
  {
    code: "POST_DOMINANT_RELIABLE",
    title: "Poste dominant documenté",
    chapter: "07",
    analysisType: "poste",
    rule: "Premier poste à résultat positif, donnée primaire, méthode de facture ou mesure nulle, facteur hors démonstration.",
    requiredVariables: ["poste", "partDuTotal", "methode", "qualite", "sourceFacteur"],
    body: "« {poste} » est le premier poste du classement. Il représente {partDuTotal} du total. La donnée est {qualite} et la méthode est {methode}. La source du facteur est {sourceFacteur}. Ces éléments sont suffisants pour lire le rang, pas pour en déduire un procédé ou un équipement. Une incertitude, lorsqu'elle est déclarée, reste une incertitude de ligne et non un intervalle de confiance. La conséquence est de considérer ce poste comme le point d'appui le mieux documenté du bilan, tout en vérifiant que le facteur s'applique bien à l'exercice.",
    version: 1,
    status: "active",
  },
  {
    code: "POST_DOMINANT_UNCERTAIN",
    title: "Poste dominant incertain",
    chapter: "07",
    analysisType: "poste",
    rule: "Premier poste à résultat positif, mais donnée non primaire, méthode indirecte ou facteur de démonstration.",
    requiredVariables: ["poste", "partDuTotal", "methode", "qualite", "sourceFacteur", "limite"],
    body: "« {poste} » arrive en tête du classement et représente {partDuTotal} du total. Ce rang ne s'appuie pas sur une mesure suffisamment documentée : la classe est {qualite}, la méthode est {methode}, et la source du facteur est {sourceFacteur}. {limite} Le résultat reste celui du calcul déclaré. Il ne devient ni une quantité physique manquante, ni une précision acquise. La conséquence est de traiter ce poste comme une priorité de collecte avant d'en faire le support d'une décision de réduction.",
    version: 1,
    status: "active",
  },
  {
    code: "POST_SECONDARY",
    title: "Poste secondaire",
    chapter: "07",
    analysisType: "poste",
    rule: "Poste à résultat positif qui n'est pas le premier du classement.",
    requiredVariables: ["poste", "partDuTotal", "postePrincipal", "methode", "qualite"],
    body: "« {poste} » n'est pas le premier poste : « {postePrincipal} » le précède. Il représente {partDuTotal} du total, avec une donnée {qualite} collectée par {methode}. Son intérêt est de compléter la lecture, pas de déplacer le diagnostic vers une cause qui n'est pas documentée. S'il dépasse le seuil interne de significativité, il entre dans la couverture cumulative ; sinon il reste un poste de second rang. Aucune recommandation propre à un secteur n'est ajoutée.",
    version: 1,
    status: "active",
  },
  {
    code: "POST_UNQUANTIFIED",
    title: "Poste non quantifié",
    chapter: "03",
    analysisType: "lacune",
    rule: "Catégorie de périmètre au statut non évalué. Une exclusion ou une non-applicabilité ne sélectionne pas ce modèle.",
    requiredVariables: ["categorie", "motif"],
    body: "« {categorie} » n'est pas quantifié. {motif} Cette absence n'est pas une émission nulle et n'est pas additionnée au total. Aucun ordre de grandeur n'est estimé à sa place. La conséquence est de maintenir la catégorie hors somme et de la citer comme une limite de complétude, jusqu'à ce qu'une donnée permette de l'évaluer.",
    version: 1,
    status: "active",
  },
  {
    code: "DATA_ESTIMATED",
    title: "Part importante d'estimations",
    chapter: "08",
    analysisType: "qualite",
    rule: "La classe estimée est déclarée et sa masse d'émissions est au moins égale à celle de chaque autre classe déclarée.",
    requiredVariables: ["partEstimee", "partPrimaire"],
    body: "Les données estimées portent {partEstimee} des émissions incluses, et les données primaires {partPrimaire}. La classe estimée est donc au moins aussi lourde que les autres classes déclarées. Cette répartition décrit la classe unique de chaque ligne. Ce n'est pas un intervalle de confiance et ce n'est pas un indice de fiabilité. Les postes estimés ne se lisent pas comme des mesures physiques. La conséquence est de considérer leur rang comme une priorité de collecte, sans leur prêter une précision qui n'est pas dans le jeu.",
    version: 1,
    status: "active",
  },
  {
    code: "TREND_NOT_COMPARABLE",
    title: "Comparaison annuelle non fiable",
    chapter: "09",
    analysisType: "evolution",
    rule: "La comparaison est indisponible, non comparable, ou le détail de l'exercice précédent n'est pas disponible.",
    requiredVariables: ["base"],
    body: "La comparaison annuelle n'est pas fiable. {base} Un écart entre deux totaux, lorsqu'il est calculé, décrit seulement ces totaux. Il n'est pas une réduction attribuable à des actions, et il ne se répartit pas entre les postes. Aucune cause n'est inventée pour expliquer l'écart. La décision utile est de reconstituer un inventaire antérieur de même périmètre et de même méthode avant toute lecture de trajectoire.",
    version: 1,
    status: "active",
  },
];

/**
 * Brouillons du chapitre postes / périmètre. Ils ne font pas partie du catalogue actif :
 * la sélection de production et OpenAI ne les reçoivent pas.
 */
export const CHAPTER6_DRAFT_MODELS: ParagraphModel[] = [
  {
    code: "CH06-M01",
    title: "Poste dominant documenté",
    chapter: "07",
    analysisType: "poste",
    rule: "Premier poste au-dessus du seuil de significativité, donnée primaire, méthode facture ou mesure nulle, facteur hors démonstration.",
    requiredVariables: ["poste", "partDuTotal", "methode", "qualite", "sourceFacteur", "ancrage"],
    body: "« {poste} » est le premier poste du classement. Il représente {partDuTotal} du total. La donnée est {qualite}, la méthode est {methode}, et la source du facteur est {sourceFacteur}. {ancrage} Ce constat documente le rang du poste. Il ne décrit pas un procédé, un équipement ni un profil d'usage. Une incertitude déclarée sur la ligne, lorsqu'elle existe, n'est pas un intervalle de confiance. La conséquence est de s'appuyer sur ce poste pour la lecture, sans lui prêter une cause absente de la donnée.",
    version: 1,
    status: "draft",
  },
  {
    code: "CH06-M02",
    title: "Poste dominant estimé ou monétaire",
    chapter: "07",
    analysisType: "poste",
    rule: "Premier poste au-dessus du seuil de significativité, et qualité estimée ou méthode proxy monétaire. Un poste seulement modélisé, extrapolé ou issu d'une estimation de maintenance n'est pas retenu.",
    requiredVariables: ["poste", "partDuTotal", "methode", "qualite", "sourceFacteur", "limite", "ancrage"],
    body: "« {poste} » arrive en tête du classement et représente {partDuTotal} du total. La classe est {qualite}, la méthode est {methode}, et la source du facteur est {sourceFacteur}. {limite} {ancrage} Ce rang ne transforme pas la donnée en mesure physique et ne lui ajoute aucune précision. La conséquence est d'en faire une priorité de collecte avant d'en faire le support d'une décision.",
    version: 1,
    status: "draft",
  },
  {
    code: "CH06-M05",
    title: "Catégorie non évaluée",
    chapter: "03",
    analysisType: "lacune",
    rule: "Catégorie de périmètre au statut non évalué. Le modèle ne juge pas sa significativité. Une exclusion ou une non-applicabilité ne le sélectionne pas.",
    requiredVariables: ["categorie", "motif"],
    body: "« {categorie} » n'est pas quantifié. {motif} Cette absence n'est pas une émission nulle et n'est pas additionnée au total. Aucun ordre de grandeur n'est estimé à sa place. Aucune part n'est calculée, donc le seuil de significativité des postes ne s'applique pas. La conséquence est de maintenir la catégorie hors somme, comme une limite de complétude, jusqu'à ce qu'une donnée permette de l'évaluer.",
    version: 1,
    status: "draft",
  },
];

export function modelByCode(catalog: ParagraphModel[], code: string): ParagraphModel | undefined {
  return catalog.find((model) => model.code === code);
}
