import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { usePlanAccess } from '@/shared/hooks/usePlanAccess';
import { useQuestionnaireProgress } from '@/hooks/useQuestionnaireProgress';
import { getPlanConfig, shouldShowScope3 } from '@/lib/planQuestionnaireConfig';
import { CompanyInfoStep } from './steps/CompanyInfoStep';
import { SimpleQuestionStep } from './SimpleQuestionStep';
import { ResultsStep } from './steps/ResultsStep';
import { AlertCircle, CheckCircle, Zap, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Fonction pour générer les questions traduites par section
const getTranslatedQuestionsBySection = (t: any) => ({
  company_info: [
    {
      id: 'company_name',
      text: t("questionnaire.adaptive.companyName"),
      type: 'text',
      required: true
    },
    {
      id: 'sector',
      text: t("questionnaire.adaptive.sector"),
      type: 'select',
      options: [
        t("questionnaire.questions.sectors.services"),
        t("questionnaire.questions.sectors.industry"),
        t("questionnaire.questions.sectors.commerce"),
        t("questionnaire.questions.sectors.construction"),
        t("questionnaire.questions.sectors.transport"),
        t("questionnaire.questions.sectors.agriculture"),
        'Finance',
        'IT',
        t("questionnaire.questions.sectors.other")
      ],
      required: true
    },
    {
      id: 'annual_revenue',
      text: t("questionnaire.adaptive.annualRevenue"),
      type: 'number',
      required: true
    },
    {
      id: 'employees',
      text: t("questionnaire.adaptive.employees"),
      type: 'select',
      options: ['1-10', '11-50', '51-200', '201-500', '500+'],
      required: true
    }
  ],
  
  fleet_general: [
    {
      id: 'has_fleet',
      text: 'Votre entreprise possède-t-elle une flotte de véhicules ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: true
    },
    {
      id: 'total_vehicles',
      text: 'Nombre total de véhicules en circulation dans votre entreprise',
      type: 'number',
      scope: 1,
      required: true
    },
    {
      id: 'vehicle_ownership',
      text: 'Ces véhicules sont-ils possédés ou loués ?',
      type: 'select',
      options: ['Possédés', 'Loués', 'Mixte'],
      scope: 1,
      required: true
    },
    {
      id: 'has_renewal_policy',
      text: 'Avez-vous une politique de renouvellement de flotte ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false
    },
    {
      id: 'renewal_frequency',
      text: 'Fréquence de renouvellement (années)',
      type: 'number',
      scope: 1,
      required: false
    }
  ],

  fleet_fuel_types: [
    {
      id: 'vehicles_gasoline',
      text: 'Nombre de véhicules essence',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'vehicles_diesel',
      text: 'Nombre de véhicules diesel',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'vehicles_hybrid_gasoline',
      text: 'Nombre de véhicules hybrides (essence/électrique)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'vehicles_hybrid_diesel',
      text: 'Nombre de véhicules hybrides (diesel/électrique)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'vehicles_electric',
      text: 'Nombre de véhicules 100% électriques',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'vehicles_alternative',
      text: 'Nombre de véhicules GNV/GPL/Autres carburants',
      type: 'number',
      scope: 1,
      required: false
    }
  ],

  fleet_vehicle_types: [
    {
      id: 'light_vehicles',
      text: 'Nombre de voitures légères',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'light_commercial',
      text: 'Nombre de véhicules utilitaires légers',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'trucks',
      text: 'Nombre de camions ou poids lourds',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'motorcycles',
      text: 'Nombre de deux-roues motorisés',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'has_specialized_vehicles',
      text: 'Avez-vous des engins de chantier ou véhicules spécialisés ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false
    },
    {
      id: 'specialized_vehicles_count',
      text: 'Nombre d\'engins spécialisés',
      type: 'number',
      scope: 1,
      required: false
    }
  ],

  fleet_usage: [
    {
      id: 'annual_km_total',
      text: 'Kilométrage annuel total parcouru par la flotte (km)',
      type: 'number',
      scope: 1,
      required: true
    },
    {
      id: 'usage_zone',
      text: 'Les véhicules sont utilisés majoritairement',
      type: 'select',
      options: ['En zone urbaine', 'En zone rurale', 'Sur autoroute', 'Mixte'],
      scope: 1,
      required: false
    },
    {
      id: 'has_mileage_tracking',
      text: 'Le suivi du kilométrage est-il informatisé ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false
    },
    {
      id: 'has_fleet_management',
      text: 'Possédez-vous un logiciel de gestion de flotte ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false
    }
  ],

  fuel_consumption: [
    {
      id: 'fleet_gasoline_consumption',
      text: 'Consommation annuelle d\'essence de la flotte (litres)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'fleet_diesel_consumption',
      text: 'Consommation annuelle de diesel de la flotte (litres)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'fleet_other_fuel_consumption',
      text: 'Consommation annuelle autres carburants flotte - GNV/GPL (litres)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'uses_biofuels',
      text: 'Votre flotte utilise-t-elle du biocarburant (E85, B30, HVO, etc.) ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: true
    },
    {
      id: 'biofuel_type',
      text: 'Type de biocarburant utilisé',
      type: 'select',
      options: ['E85 (éthanol)', 'B30/B100 (biodiesel)', 'HVO (diesel renouvelable)', 'Autres'],
      scope: 1,
      required: false,
      conditional: { dependsOn: 'uses_biofuels', showWhen: ['Oui'] }
    },
    {
      id: 'biofuel_consumption_litres',
      text: 'Consommation annuelle de biocarburant (litres)',
      type: 'number',
      scope: 1,
      required: false,
      conditional: { dependsOn: 'uses_biofuels', showWhen: ['Oui'] }
    },
    {
      id: 'has_fuel_card',
      text: 'Avez-vous une carte carburant ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false
    },
    {
      id: 'maintenance_frequency',
      text: 'Fréquence d\'entretien des véhicules',
      type: 'select',
      options: ['Tous les 3 mois', 'Tous les 6 mois', 'Annuelle', 'Selon kilométrage'],
      scope: 1,
      required: false
    },
    {
      id: 'has_consumption_history',
      text: 'Disposez-vous d\'un historique de consommation par véhicule ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false
    }
  ],

  energy: [
    {
      id: 'electricity_consumption',
      text: 'Consommation électrique annuelle (kWh)',
      type: 'number',
      scope: 2,
      required: true
    },
    {
      id: 'has_green_electricity',
      text: 'Votre contrat inclut-il une part d\'électricité verte/renouvelable garantie ?',
      type: 'select',
      options: ['Oui', 'Non', 'Ne sais pas'],
      scope: 2,
      required: true
    },
    {
      id: 'green_electricity_percentage',
      text: 'Précisez la part d\'électricité renouvelable (%)',
      type: 'number',
      scope: 2,
      required: false,
      conditional: { dependsOn: 'has_green_electricity', showWhen: ['Oui'] }
    },
    {
      id: 'gas_consumption',
      text: 'Consommation de gaz naturel (kWh)',
      type: 'number',
      scope: 1,
      required: true
    },
    {
      id: 'heating_oil_consumption',
      text: 'Consommation de fioul domestique pour chauffage (litres)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'propane_consumption',
      text: 'Consommation de propane (kg)',
      type: 'number',
      scope: 1,
      required: false
    },
    {
      id: 'uses_coal_biomass',
      text: 'Votre entreprise utilise-t-elle du charbon ou de la biomasse comme source d\'énergie ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: true
    },
    {
      id: 'coal_consumption_kg',
      text: 'Consommation annuelle de charbon (kg)',
      type: 'number',
      scope: 1,
      required: false,
      conditional: { dependsOn: 'uses_coal_biomass', showWhen: ['Oui'] }
    },
    {
      id: 'biomass_consumption_kg',
      text: 'Consommation annuelle de biomasse (kg ou tonnes)',
      type: 'number',
      scope: 1,
      required: false,
      conditional: { dependsOn: 'uses_coal_biomass', showWhen: ['Oui'] }
    },
    {
      id: 'has_cooling_systems',
      text: 'Votre entreprise possède-t-elle des systèmes de climatisation, réfrigération ou pompes à chaleur ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: true
    },
    {
      id: 'cooling_units_count',
      text: 'Nombre total d\'unités de climatisation ou de réfrigération',
      type: 'number',
      scope: 1,
      required: false,
      conditional: { dependsOn: 'has_cooling_systems', showWhen: ['Oui'] }
    },
    {
      id: 'refrigerant_type',
      text: 'Type(s) de fluides frigorigènes utilisés',
      type: 'select',
      options: ['R134a', 'R410a', 'R32', 'R404a', 'R22 (ancien)', 'Autres'],
      scope: 1,
      required: false,
      conditional: { dependsOn: 'has_cooling_systems', showWhen: ['Oui'] }
    },
    {
      id: 'refrigerant_recharge_kg',
      text: 'Quantité de fluide frigorigène rechargée au cours de l\'année (kg)',
      type: 'number',
      scope: 1,
      required: false,
      conditional: { dependsOn: 'has_cooling_systems', showWhen: ['Oui'] }
    },
    {
      id: 'has_maintenance_contract',
      text: 'Avez-vous un contrat d\'entretien avec suivi des fuites ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 1,
      required: false,
      conditional: { dependsOn: 'has_cooling_systems', showWhen: ['Oui'] }
    }
  ],

  transport_basic: [
    {
      id: 'business_trips',
      text: 'Voyages d\'affaires annuels (nombre)',
      type: 'number',
      scope: 3,
      required: false
    }
  ],
  
  basic_scope3: [
    {
      id: 'paper_consumption',
      text: 'Consommation de papier (kg/an)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'waste_production',
      text: 'Production de déchets (tonnes/an)',
      type: 'number',
      scope: 3,
      required: false
    }
  ],

  // === SCOPE 3 COMPLET ===
  
  scope3_purchases: [
    {
      id: 'main_purchase_types',
      text: 'Principaux types de biens et services achetés',
      type: 'text',
      scope: 3,
      required: true
    },
    {
      id: 'total_purchase_amount',
      text: 'Montant total des achats annuels (€)',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'supplier_location',
      text: 'Vos fournisseurs sont-ils',
      type: 'select',
      options: ['Principalement locaux', 'Principalement nationaux', 'Principalement internationaux', 'Mixte'],
      scope: 3,
      required: true
    },
    {
      id: 'has_top_suppliers_list',
      text: 'Disposez-vous de la liste de vos 10 principaux fournisseurs ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 3,
      required: false
    },
    {
      id: 'high_carbon_products',
      text: 'Produits/services à plus fort impact carbone selon vous',
      type: 'text',
      scope: 3,
      required: false
    },
    {
      id: 'has_responsible_purchasing',
      text: 'Utilisez-vous une politique d\'achat responsable ?',
      type: 'select',
      options: ['Oui (ISO 20400 ou équivalent)', 'Oui (politique interne)', 'En cours de développement', 'Non'],
      scope: 3,
      required: false
    }
  ],

  scope3_equipment: [
    {
      id: 'equipment_purchased_12m',
      text: 'Avez-vous acquis des équipements ces 12 derniers mois ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 3,
      required: true
    },
    {
      id: 'equipment_lifetime',
      text: 'Durée de vie moyenne de vos équipements (années)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'keep_equipment_docs',
      text: 'Conservez-vous les factures et fiches techniques ?',
      type: 'select',
      options: ['Oui, systématiquement', 'Partiellement', 'Non'],
      scope: 3,
      required: false
    },
    {
      id: 'outsource_equipment',
      text: 'Sous-traitez-vous vos achats d\'équipement ?',
      type: 'select',
      options: ['Oui', 'Partiellement', 'Non'],
      scope: 3,
      required: false
    }
  ],

  scope3_energy_related: [
    {
      id: 'energy_contracts_services',
      text: 'Vos contrats énergie incluent-ils maintenance/livraison ?',
      type: 'select',
      options: ['Oui', 'Non', 'Ne sais pas'],
      scope: 3,
      required: false
    },
    {
      id: 'energy_losses',
      text: 'Y a-t-il des pertes/fuites notables dans vos installations ?',
      type: 'select',
      options: ['Oui', 'Non', 'Ne sais pas'],
      scope: 3,
      required: false
    }
  ],

  scope3_upstream_transport: [
    {
      id: 'use_delivery_providers',
      text: 'Recours à des prestataires pour livraisons ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 3,
      required: true
    },
    {
      id: 'transport_modes',
      text: 'Modes de transport principaux pour livraisons',
      type: 'select',
      options: ['Camion principalement', 'Train principalement', 'Avion/Maritime', 'Mixte'],
      scope: 3,
      required: false
    },
    {
      id: 'delivery_distances',
      text: 'Distance moyenne des livraisons (km)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'delivery_frequency',
      text: 'Fréquence des livraisons',
      type: 'select',
      options: ['Quotidienne', 'Hebdomadaire', 'Mensuelle', 'Ponctuelle'],
      scope: 3,
      required: false
    }
  ],

  scope3_business_travel: [
    {
      id: 'business_trips_2024',
      text: 'Nombre de déplacements professionnels en 2024',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'air_travel_short',
      text: 'Vols court-courrier (<1000km) - nombre',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'air_travel_medium',
      text: 'Vols moyen-courrier (1000-3000km) - nombre',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'air_travel_long',
      text: 'Vols long-courrier (>3000km) - nombre',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'train_travel',
      text: 'Déplacements en train - nombre',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'car_travel_personal',
      text: 'Déplacements véhicule personnel - pourcentage',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'has_booking_platform',
      text: 'Utilisez-vous une plateforme de réservation centralisée ?',
      type: 'select',
      options: ['Oui', 'Non'],
      scope: 3,
      required: false
    },
    {
      id: 'has_travel_policy',
      text: 'Avez-vous une politique de limitation des déplacements ?',
      type: 'select',
      options: ['Oui, stricte', 'Oui, souple', 'En cours', 'Non'],
      scope: 3,
      required: false
    }
  ],

  scope3_commuting: [
    {
      id: 'onsite_employees',
      text: 'Nombre de salariés sur site (hors télétravail)',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'average_commute_distance',
      text: 'Distance domicile-travail moyenne (km)',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'commute_modes',
      text: 'Principal moyen de transport domicile-travail',
      type: 'select',
      options: ['Véhicule personnel', 'Transports en commun', 'Vélo/Marche', 'Covoiturage', 'Mixte'],
      scope: 3,
      required: true
    },
    {
      id: 'remote_work_percentage',
      text: 'Pourcentage de collaborateurs en télétravail (%)',
      type: 'number',
      scope: 3,
      required: false
    }
  ],

  scope3_waste: [
    {
      id: 'waste_types',
      text: 'Types de déchets produits',
      type: 'select',
      options: ['Papier/Carton', 'Plastique', 'Électronique', 'DIB', 'Dangereux', 'Mixte'],
      scope: 3,
      required: true
    },
    {
      id: 'waste_volume_paper',
      text: 'Volume annuel déchets papier (tonnes)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'waste_volume_plastic',
      text: 'Volume annuel déchets plastique (tonnes)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'waste_volume_electronic',
      text: 'Volume annuel déchets électroniques (tonnes)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'waste_treatment_method',
      text: 'Méthode de traitement principale',
      type: 'select',
      options: ['Recyclage', 'Incinération', 'Mise en décharge', 'Mixte'],
      scope: 3,
      required: true
    },
    {
      id: 'has_waste_traceability',
      text: 'Avez-vous des données de traçabilité des déchets ?',
      type: 'select',
      options: ['Oui, complètes', 'Partielles', 'Non'],
      scope: 3,
      required: false
    }
  ],

  scope3_product_use: [
    {
      id: 'products_consume_energy',
      text: 'Vos produits consomment-ils de l\'énergie en usage ?',
      type: 'select',
      options: ['Oui', 'Non', 'N/A (services)'],
      scope: 3,
      required: true
    },
    {
      id: 'product_lifetime',
      text: 'Durée de vie moyenne de vos produits (années)',
      type: 'number',
      scope: 3,
      required: false
    },
    {
      id: 'provide_usage_guides',
      text: 'Fournissez-vous des guides pour réduire l\'impact en usage ?',
      type: 'select',
      options: ['Oui, systématiquement', 'Parfois', 'Non'],
      scope: 3,
      required: false
    }
  ],

  scope3_end_of_life: [
    {
      id: 'products_recyclable',
      text: 'Vos produits sont-ils recyclables ?',
      type: 'select',
      options: ['Oui, >80%', 'Oui, 50-80%', 'Oui, <50%', 'Non', 'N/A'],
      scope: 3,
      required: true
    },
    {
      id: 'has_takeback_program',
      text: 'Disposez-vous d\'une filière de reprise ?',
      type: 'select',
      options: ['Oui', 'En cours', 'Non'],
      scope: 3,
      required: false
    },
    {
      id: 'estimate_eol_waste',
      text: 'Estimez-vous le volume de déchets en fin de vie ?',
      type: 'select',
      options: ['Oui, précisément', 'Estimation approximative', 'Non'],
      scope: 3,
      required: false
    }
  ],

  scope3_other: [
    {
      id: 'services_generate_travel',
      text: 'Vos services génèrent-ils des déplacements clients ?',
      type: 'select',
      options: ['Oui, fréquemment', 'Occasionnellement', 'Non'],
      scope: 3,
      required: false
    },
    {
      id: 'building_ownership',
      text: 'Vos bâtiments sont-ils',
      type: 'select',
      options: ['Détenus', 'Loués', 'Mixte'],
      scope: 3,
      required: false
    },
    {
      id: 'subcontractor_emissions',
      text: 'Avez-vous des données sur les émissions de vos sous-traitants ?',
      type: 'select',
      options: ['Oui, détaillées', 'Partielles', 'Non'],
      scope: 3,
      required: false
    }
  ],
  
  waste: [
    {
      id: 'waste_production',
      text: 'Production de déchets (tonnes/an)',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'recycling_rate',
      text: 'Taux de recyclage (%)',
      type: 'number',
      scope: 3,
      required: true
    }
  ],
  
  full_scope3: [
    {
      id: 'paper_consumption',
      text: 'Consommation de papier (kg/an)',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'business_trips',
      text: 'Voyages d\'affaires annuels (nombre)',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'employee_commuting',
      text: 'Distance moyenne domicile-travail (km)',
      type: 'number',
      scope: 3,
      required: true
    }
  ],
  
  supply_chain: [
    {
      id: 'main_suppliers',
      text: 'Nombre de fournisseurs principaux',
      type: 'number',
      scope: 3,
      required: true
    },
    {
      id: 'supplier_distance',
      text: 'Distance moyenne des fournisseurs (km)',
      type: 'number',
      scope: 3,
      required: true
    }
  ]
});

interface QuestionType {
  id: string;
  text: string;
  type: string;
  scope?: number;
  required: boolean;
  options?: string[];
}

export const AdaptiveCarbonQuestionnaire: React.FC = () => {
  const navigate = useNavigate();
  const { userPlan } = usePlanAccess();
  const { progress, loading: progressLoading, saveProgress, completeQuestionnaire, clearProgress } = useQuestionnaireProgress('adaptive_carbon', userPlan?.planType || 'essential');
  const { t } = useTranslation();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const planConfig = getPlanConfig(userPlan?.planType || 'essential');
  const showScope3 = shouldShowScope3(userPlan?.planType || 'essential');

  // Charger la progression sauvegardée
  useEffect(() => {
    if (progress && !progressLoading) {
      setCurrentStep(progress.current_step);
      setResponses(progress.responses);
      setLastSaved(progress.updated_at ? new Date(progress.updated_at) : null);
    }
  }, [progress, progressLoading]);

  // Construire la liste des questions selon le plan
  const buildQuestions = (): QuestionType[] => {
    let allQuestions: QuestionType[] = [];
    const QUESTIONS_BY_SECTION = getTranslatedQuestionsBySection(t);
    
    planConfig.sections.forEach(section => {
      const sectionQuestions = QUESTIONS_BY_SECTION[section as keyof typeof QUESTIONS_BY_SECTION] || [];
      
      // Filtrer les questions Scope 3 si le plan ne les supporte pas
      const filteredQuestions = sectionQuestions.filter(q => {
        if ('scope' in q && q.scope === 3 && !showScope3) {
          return false;
        }
        return true;
      });
      
      allQuestions = [...allQuestions, ...filteredQuestions];
    });

    // Limiter le nombre de questions selon le plan
    if (planConfig.maxQuestions > 0) {
      allQuestions = allQuestions.slice(0, planConfig.maxQuestions);
    }

    return allQuestions;
  };

  const questions = buildQuestions();
  const totalSteps = questions.length + 1; // +1 pour les résultats
  const progress_pct = ((currentStep + 1) / totalSteps) * 100;

  // Sauvegarde automatique
  const handleAutoSave = async () => {
    if (Object.keys(responses).length === 0) return;
    
    setIsSaving(true);
    const success = await saveProgress(currentStep, responses);
    if (success) {
      setLastSaved(new Date());
    }
    setIsSaving(false);
  };

  // Sauvegarde automatique toutes les 30 secondes si des réponses existent
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(responses).length > 0 && !isCompleted) {
        handleAutoSave();
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [responses, isCompleted]);

  const handleNext = async () => {
    // Sauvegarder avant de passer à l'étape suivante
    await handleAutoSave();
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Dernière question, finaliser et afficher les résultats
      const success = await completeQuestionnaire(responses);
      if (success) {
        setIsCompleted(true);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleRestartQuestionnaire = async () => {
    const success = await clearProgress();
    if (success) {
      setCurrentStep(0);
      setResponses({});
      setIsCompleted(false);
      setLastSaved(null);
    }
  };

  // Vérifier si le plan a accès au questionnaire
  const planTypeNormalized = userPlan?.planType?.toLowerCase();
  const isExpert = planTypeNormalized === 'carbo_expert';
  
  if (!userPlan?.planType || isExpert || !planConfig.hasQuestionnaire) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
            <h2 className="text-xl font-bold mb-2">Plan non compatible</h2>
            <p className="text-muted-foreground mb-4">
              {isExpert 
                ? "Le plan Expert bénéficie d'un accompagnement personnalisé. Veuillez contacter notre équipe."
                : "Ce questionnaire n'est pas disponible pour votre plan actuel."}
            </p>
            <div className="flex gap-4 justify-center">
              {isExpert ? (
                <Button onClick={() => navigate('/contact')}>
                  Contacter l'équipe
                </Button>
              ) : (
                <Button onClick={() => navigate('/pricing')}>
                  Voir les plans disponibles
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header avec progression et sauvegarde */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("questionnaire.adaptive.title")}</h1>
            <Badge variant="outline">
              Plan {userPlan.planType}
            </Badge>
            {progress && (
              <Badge variant="secondary">
                Reprise en cours
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {currentStep + 1} / {totalSteps}
            </div>
            
            {/* Statut de sauvegarde */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <Save className="h-3 w-3 animate-spin" />
                  Sauvegarde...
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Sauvé {lastSaved.toLocaleTimeString()}
                </>
              ) : (
                <span>Non sauvegardé</span>
              )}
            </div>
          </div>
        </div>
        
        <Progress value={progress_pct} className="h-2" />
        
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{t("questionnaire.adaptive.subtitle")}</span>
          <span>{Math.round(progress_pct)}% {t("questionnaire.adaptive.completed")}</span>
        </div>

        {/* Actions de gestion */}
        {(progress || Object.keys(responses).length > 0) && !isCompleted && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoSave}
              disabled={isSaving}
            >
              <Save className="h-3 w-3 mr-1" />
              Sauvegarder maintenant
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartQuestionnaire}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Recommencer
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isCompleted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                {t("questionnaire.adaptive.results")}
              </>
            ) : (
              <>
                {t("questionnaire.adaptive.question", { number: currentStep + 1 })}
                {('scope' in questions[currentStep] && questions[currentStep].scope === 3) && !showScope3 && (
                  <Badge variant="secondary" className="ml-2">
                    {t("questionnaire.adaptive.notAvailable")}
                  </Badge>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {isCompleted ? (
            <ResultsStep
              responses={responses}
              questions={questions}
              planType={userPlan.planType}
              onGenerateReport={() => navigate('/empreinte-produit-report')}
            />
          ) : (
            <SimpleQuestionStep
              question={questions[currentStep]}
              responses={responses}
              onResponseChange={(questionId, value) => handleResponseChange(questionId, value)}
              onNext={handleNext}
              onPrevious={handlePrevious}
              canGoNext={true}
              canGoPrevious={currentStep > 0}
            />
          )}
        </CardContent>
      </Card>

      {/* Info plan */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="font-medium">Plan {userPlan.planType}</span>
                <span className="text-muted-foreground ml-2">
                  • Scopes {planConfig.scopes.join(', ')} 
                  • {planConfig.maxQuestions} questions max
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/pricing')}
            >
              Upgrader mon plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};