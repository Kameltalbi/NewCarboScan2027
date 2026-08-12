interface ReportData {
  entreprise: string;
  secteur: string;
  nb_employes: number;
  chiffre_affaires?: string;
  annee: string;
  nb_sites: number;
  surface_m2: number;
  scope1_total: number;
  scope2_total: number;
  total_global: number;
  intensite_etp: number;
  principal_poste1: string;
  principal_poste2: string;
  pourcentage_postes_principaux: number;
  prix_baril_min: number;
  prix_baril_max: number;
  cout_energie_min: number;
  cout_energie_max: number;
}

export const generateEmpreinteProduitReportSections = (data: ReportData) => {
  return {
    introduction_contexte: `
      <p>L'entreprise <strong>${data.entreprise}</strong> exerce son activité dans le secteur <strong>${data.secteur}</strong>, avec un effectif d'environ <strong>${data.nb_employes} collaborateurs</strong>${data.chiffre_affaires ? ` et un chiffre d'affaires annuel de ${data.chiffre_affaires}` : ''}. Ses activités génèrent des impacts environnementaux principalement liés à la consommation d'énergie et aux déplacements. Dans un contexte marqué par la transition énergétique et les réglementations environnementales, la mesure de l'empreinte carbone constitue un enjeu stratégique pour anticiper les évolutions réglementaires, répondre aux attentes des clients et renforcer son image responsable.</p>
    `,

    introduction_objectifs: `
      <p>Le présent Bilan Carbone® a pour objectif de quantifier les émissions de gaz à effet de serre (GES) de l'organisation sur le périmètre des Scopes 1 et 2. La démarche est réalisée à titre volontaire, afin de disposer d'un état des lieux précis des émissions, d'identifier les principaux postes émetteurs et de définir des leviers de réduction. Elle répond également aux attentes des parties prenantes, qu'il s'agisse des clients, des investisseurs ou des collaborateurs, et s'inscrit dans la politique RSE de l'entreprise.</p>
    `,

    methodologie_perimetre: `
      <p>Le périmètre retenu couvre ${data.nb_sites > 1 ? `${data.nb_sites} sites (siège, établissements)` : 'le siège social'} et concerne les activités opérationnelles principales de l'entreprise. Le Bilan Carbone® se limite aux Scopes 1 et 2, à savoir :</p>
      <ul>
        <li><strong>Scope 1 :</strong> émissions directes issues de la combustion d'énergies fossiles (gaz, fioul, carburants de la flotte de véhicules).</li>
        <li><strong>Scope 2 :</strong> émissions indirectes liées à l'achat d'électricité et de chaleur.</li>
      </ul>
      <p>L'année de référence choisie est <strong>${data.annee}</strong>, considérée représentative de l'activité normale de l'entreprise.</p>
    `,

    collecte_donnees: `
      <p>La réussite d'un Bilan Carbone® repose avant tout sur une collecte de données fiable, complète et bien organisée. Dans un premier temps, il est essentiel d'identifier toutes les sources d'information pertinentes (factures d'énergie, relevés de compteurs, données kilométriques de la flotte, contrats d'électricité, etc.) et de mettre en place un système de suivi régulier pour éviter la dispersion et la perte d'informations. Pour garantir la rigueur et la continuité du processus, la direction doit s'impliquer directement en validant la démarche et en lui donnant une légitimité interne. La nomination d'un chef de projet Bilan Carbone®, véritable référent interne, est également indispensable : il aura pour mission de coordonner la collecte des données, d'animer les échanges avec les services concernés (comptabilité, technique, logistique) et de piloter la restitution. Enfin, au-delà du bilan lui-même, l'organisation doit prévoir la mise en place de plans d'actions concrets issus des résultats (efficacité énergétique, réduction de la flotte thermique, recours aux énergies renouvelables) et assurer un suivi dans le temps, afin que la comptabilité carbone devienne un véritable outil de pilotage stratégique et non un exercice ponctuel.</p>
    `,

    collecte_traitement_donnees: `
      <p>Les données proviennent principalement des factures d'énergie, des relevés de compteurs, et des informations relatives à la flotte de véhicules. Lorsque certaines données étaient manquantes, des extrapolations ont été réalisées à partir des moyennes disponibles ou des ratios d'activité. Chaque hypothèse a été documentée et son impact potentiel sur la fiabilité des résultats a été évalué. Un système de classement et de conservation des données a été mis en place pour assurer la traçabilité et permettre une reproduction des calculs lors de futurs exercices.</p>
    `,

    resultats_scopes: `
      <p>Les émissions totales de l'entreprise s'élèvent à <strong>${data.total_global} tCO₂e</strong> pour l'année de référence, réparties entre <strong>Scope 1 : ${data.scope1_total} tCO₂e</strong> et <strong>Scope 2 : ${data.scope2_total} tCO₂e</strong>. Les principaux postes émetteurs du Scope 1 sont la consommation de gaz et carburants, tandis que pour le Scope 2, l'électricité constitue la source dominante. Ces résultats permettent d'identifier clairement les leviers prioritaires de réduction.</p>
    `,

    analyse_postes_emetteurs: `
      <p>L'analyse met en évidence que <strong>${data.principal_poste1}</strong> et <strong>${data.principal_poste2}</strong> représentent ensemble plus de <strong>${data.pourcentage_postes_principaux}%</strong> des émissions totales. Ces postes sont structurellement liés à l'activité de l'entreprise, mais offrent néanmoins des marges de manœuvre importantes, par exemple à travers l'efficacité énergétique, l'optimisation de la flotte de véhicules ou l'achat d'électricité renouvelable.</p>
    `,

    analyse_economique: `
      <p>L'analyse économique prospective constitue un élément clé du Bilan Carbone®, permettant d'évaluer l'impact financier de la consommation énergétique et de la dépendance aux énergies fossiles de l'entreprise. Cette démarche vise à quantifier l'exposition aux fluctuations des prix du pétrole et des matières premières énergétiques, dans un contexte de volatilité croissante des marchés mondiaux.</p>
      
      <p><strong>Module disponible dans le tableau de bord :</strong> Un module d'analyse économique intégré est accessible directement depuis votre tableau de bord. Cet outil permet de générer différents scénarios économiques en fonction de l'évolution des prix du pétrole, des investissements dans l'efficacité énergétique et des actions de décarbonation envisagées. Il est recommandé d'utiliser régulièrement ce module pour simuler diverses hypothèses et identifier les stratégies les plus rentables à court et moyen terme.</p>
      
      <p><strong>Aide à la décision stratégique :</strong> Les scénarios générés permettent aux dirigeants de prendre des décisions éclairées concernant les investissements dans les énergies renouvelables, l'optimisation de la flotte de véhicules ou l'amélioration de l'efficacité énergétique. Les résultats, exprimés en dinars tunisiens, facilitent la comparaison des options et l'établissement de priorités budgétaires. Cette approche transforme le bilan carbone en véritable outil de pilotage économique et environnemental, essentiel pour maintenir la compétitivité de l'entreprise dans un contexte énergétique en mutation.</p>
    `,

    plan_actions: `
      <p>Au regard des résultats obtenus, il est recommandé de concentrer les efforts sur :</p>
      <ul>
        <li><strong>La réduction des consommations énergétiques</strong> (isolation, efficacité des équipements).</li>
        <li><strong>Le verdissement de la flotte de véhicules</strong> (électrique, hybride, carburants alternatifs).</li>
        <li><strong>L'achat d'électricité verte</strong> ou la mise en place d'une production locale d'énergie renouvelable.</li>
      </ul>
      <p>La mise en œuvre de ces actions doit être planifiée dans un plan d'actions triennal, avec désignation de responsables, allocation budgétaire et indicateurs de suivi (tCO₂e évitées, kWh économisés, retour sur investissement).</p>
    `,

    analyse_economique_module: `
      <p>L'outil Bilan Carbone® intègre également un module d'Analyse Économique qui permet à l'utilisateur d'évaluer l'impact financier de la consommation énergétique liée aux énergies fossiles. Ce module projette les coûts énergétiques de l'entreprise en fonction du prix du baril de pétrole paramétrable (ex. 80, 120 ou 150 DT/baril) et calcule automatiquement les coûts associés. Les résultats sont exprimés en dinars tunisiens (DT), devise locale de référence. L'analyse économique met ainsi en évidence l'exposition potentielle de l'entreprise aux fluctuations des prix du pétrole et aux variations du marché énergétique mondial.</p>
      <p>L'utilisateur peut personnaliser ses scénarios en ajustant le prix du baril, l'horizon temporel et les volumes de consommation considérés. Les résultats sont restitués sous forme de tableaux et graphiques dynamiques, illustrant l'évolution des coûts énergétiques selon les hypothèses retenues. Ce module constitue donc un outil stratégique d'aide à la décision, permettant d'anticiper les risques financiers liés à la volatilité des prix du pétrole, de prioriser les investissements dans l'efficacité énergétique et de démontrer la rentabilité des actions de réduction de la dépendance aux énergies fossiles.</p>
    `
  };
};