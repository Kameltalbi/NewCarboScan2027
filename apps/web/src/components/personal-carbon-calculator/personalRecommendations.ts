import { PersonalEmissionsResult } from "./types";

export interface PersonalRecommendation {
  title: string;
  description: string;
  impact: string; // ex: "-0.8 tCO2e/an"
  category: string;
}

const RECO_BANK: Record<string, PersonalRecommendation[]> = {
  Logement: [
    { title: "Baisser le chauffage de 1°C", description: "Réduit votre consommation d'énergie de chauffage d'environ 7 %.", impact: "-0.3 tCO2e/an", category: "Logement" },
    { title: "Isoler les combles", description: "L'isolation thermique peut diviser par 2 les pertes de chaleur.", impact: "-1.5 tCO2e/an", category: "Logement" },
    { title: "Passer à un fournisseur d'électricité verte", description: "Souscrivez à une offre 100 % renouvelable.", impact: "-0.5 tCO2e/an", category: "Logement" },
    { title: "Remplacer les ampoules par des LED", description: "Jusqu'à 80 % d'économie d'électricité d'éclairage.", impact: "-0.1 tCO2e/an", category: "Logement" },
  ],
  Transport: [
    { title: "Privilégier le train pour les trajets <800 km", description: "Le train émet 30 fois moins de CO₂ que l'avion.", impact: "-1.2 tCO2e/an", category: "Transport" },
    { title: "Pratiquer le covoiturage", description: "Diviser les émissions voiture par 2 ou 3.", impact: "-0.8 tCO2e/an", category: "Transport" },
    { title: "Vélo pour les trajets <5 km", description: "Remplacer 5 km/jour en voiture par du vélo.", impact: "-0.4 tCO2e/an", category: "Transport" },
    { title: "Limiter les vols long-courriers", description: "Un vol Paris-New York = 2 tCO₂e aller-retour.", impact: "-2.5 tCO2e/an", category: "Transport" },
  ],
  Alimentation: [
    { title: "Réduire la viande rouge à 1 fois/semaine", description: "La viande rouge représente 25 % de l'empreinte alimentaire.", impact: "-0.5 tCO2e/an", category: "Alimentation" },
    { title: "Acheter local et de saison", description: "Réduit l'empreinte transport et conservation.", impact: "-0.2 tCO2e/an", category: "Alimentation" },
    { title: "Lutter contre le gaspillage alimentaire", description: "30 % de la nourriture produite est jetée.", impact: "-0.15 tCO2e/an", category: "Alimentation" },
    { title: "Essayer un jour végétarien par semaine", description: "Une routine simple à fort impact cumulé.", impact: "-0.2 tCO2e/an", category: "Alimentation" },
  ],
  Consommation: [
    { title: "Acheter d'occasion ou reconditionné", description: "Réduit l'impact production de 50 à 80 %.", impact: "-0.6 tCO2e/an", category: "Consommation" },
    { title: "Allonger la durée de vie des appareils", description: "Faire réparer plutôt que remplacer.", impact: "-0.3 tCO2e/an", category: "Consommation" },
    { title: "Limiter la fast fashion", description: "Privilégier des vêtements durables et de qualité.", impact: "-0.4 tCO2e/an", category: "Consommation" },
    { title: "Réduire les achats impulsifs", description: "Question simple : en ai-je vraiment besoin ?", impact: "-0.2 tCO2e/an", category: "Consommation" },
  ],
  Déchets: [
    { title: "Mettre en place le tri sélectif", description: "Recycler économise matières premières et énergie.", impact: "-0.1 tCO2e/an", category: "Déchets" },
    { title: "Composter ses biodéchets", description: "30 % des poubelles sont compostables.", impact: "-0.08 tCO2e/an", category: "Déchets" },
    { title: "Refuser les emballages inutiles", description: "Vrac, sacs réutilisables, gourde.", impact: "-0.05 tCO2e/an", category: "Déchets" },
  ],
};

export const getPersonalRecommendations = (results: PersonalEmissionsResult): PersonalRecommendation[] => {
  // 3 reco du poste majoritaire + 1 de chaque autre top 2
  const sorted = [...results.breakdown];
  const top = sorted[0]?.name || "Logement";
  const second = sorted[1]?.name || "Transport";
  const third = sorted[2]?.name || "Alimentation";

  return [
    ...(RECO_BANK[top] || []).slice(0, 3),
    ...(RECO_BANK[second] || []).slice(0, 1),
    ...(RECO_BANK[third] || []).slice(0, 1),
  ];
};
