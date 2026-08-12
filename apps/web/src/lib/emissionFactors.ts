
// Facteurs d'émission pour le calcul du bilan carbone - Tunisie
// Valeurs en kg CO2e par unité

export const emissionFactors = Object.freeze({
  // Scope 1 - Émissions directes
  combustibles: Object.freeze({
    gaz_naturel: 2.056, // kg CO2e/m³
    fioul_lourd: 3.114, // kg CO2e/t
    charbon: 2.440, // kg CO2e/t
    biomasse: 0.040, // kg CO2e/kg (bois)
    essence: 2.31, // kg CO2e/L
    diesel: 2.68, // kg CO2e/L
  }),
  
  fluides_frigorigenes: Object.freeze({
    r134a: 1345, // kg CO2e/kg
    fuites_moyenne: 1345, // kg CO2e/kg
  }),

  // Scope 2 - Émissions indirectes énergie
  electricite: Object.freeze({
    tunisie: 0.523, // kg CO2e/kWh
    vapeur: 0.250, // kg CO2e/kg
    froid: 0.200, // kg CO2e/kWh
    chaleur: 0.200, // kg CO2e/kWh
  }),

  // Scope 3 - Autres émissions indirectes
  transports: Object.freeze({
    train: 0.041, // kg CO2e/km-passager
    avion_court: 0.255, // kg CO2e/km-passager
    avion_long: 0.195, // kg CO2e/km-passager
    voiture_moyenne: 0.2, // kg CO2e/km-passager
    transport_public: 0.05, // kg CO2e/km-passager
  }),

  logistique: Object.freeze({
    camion: 0.1, // kg CO2e/t-km
    maritime: 0.015, // kg CO2e/t-km
    autre: 0.08, // kg CO2e/t-km
  }),

  dechets: Object.freeze({
    decharge: 0.400, // kg CO2e/t
    incineration: 0.700, // kg CO2e/t
    recyclage: 0.050, // kg CO2e/t
  }),

  achats: Object.freeze({
    biens_services: 0.5, // kg CO2e/TND (estimation)
    matieres_premieres: 1.2, // kg CO2e/t (estimation)
  }),
});

// Facteurs de conversion
export const conversionFactors = Object.freeze({
  joursParAn: 220, // jours ouvrés par an
  semainesParAn: 52,
  aller_retour: 2, // pour les trajets domicile-travail
});
