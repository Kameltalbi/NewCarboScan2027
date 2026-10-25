
import React, { useState, useEffect } from "react";
import { logger } from '@/utils/logger';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { downloadTesterBilanPdf } from "@/lib/generateTesterBilanPdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { shouldShowScope3 } from "@/lib/planQuestionnaireConfig";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  BarChart3,
  Building2,
  Zap,
  Car,
  Plane,
  Factory,
  Users,
  MapPin,
  Fuel,
  Recycle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { emissionFactors } from "@/lib/emissionFactors";

// Fonction pour générer les questions traduites
const getTranslatedQuestions = (t: any) => {
  logger.debug("Testing translation for fleetSize:", t("questionnaire.adaptive.questions.transport.fleetSize"));
  logger.debug("Testing translation for sections:", t("questionnaire.adaptive.sections.transport"));
  
  return [
  // Section 1: Informations générales (1-11)
  {
    id: 1,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Nom de l'entreprise",
    type: "text",
    field: "nom_entreprise",
    placeholder: "Ex: CarboScan SARL",
    icon: Building2,
    required: true
  },
  {
    id: 2,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Adresse du siège / des sites étudiés",
    type: "textarea",
    field: "adresse_siege",
    placeholder: "Ex: 123 Avenue de la République, 1001 Tunis, Tunisie",
    icon: MapPin,
    required: true
  },
  {
    id: 3,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Année de référence du questionnaire",
    type: "number",
    field: "annee_etude",
    placeholder: "Ex: 2024",
    icon: Building2,
    required: true,
    validation: (value: string) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 2020 || num > new Date().getFullYear()) {
        return "L'année d'étude doit être entre 2020 et " + new Date().getFullYear();
      }
      return null;
    }
  },
  {
    id: 4,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Secteur d'activité principal",
    type: "select",
    field: "secteur_activite",
    placeholder: "Sélectionnez votre secteur d'activité",
    icon: Building2,
    required: true,
    options: [
      { value: "btp", label: "BTP / Construction" },
      { value: "agroalimentaire", label: "Agroalimentaire" },
      { value: "industrie_textile", label: "Industrie textile" },
      { value: "services", label: "Services" },
      { value: "commerce", label: "Commerce" },
      { value: "transport", label: "Transport / Logistique" },
      { value: "industrie", label: "Industrie (autre)" },
      { value: "sante", label: "Santé" },
      { value: "education", label: "Éducation" },
      { value: "hotellerie", label: "Hôtellerie / Tourisme" },
      { value: "autre", label: "Autre" }
    ]
  },
  {
    id: 5,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Nombre de sites étudiés",
    type: "number",
    field: "nb_sites",
    placeholder: "Ex: 1",
    icon: MapPin,
    required: true
  },
  {
    id: 6,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Surface totale occupée (m²)",
    type: "number",
    field: "surface_totale",
    placeholder: "Ex: 5000",
    icon: Building2,
    required: true
  },
  {
    id: 7,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Nombre d'employés permanents",
    type: "number",
    field: "nb_employes_permanents",
    placeholder: "Ex: 50",
    icon: Users,
    required: true
  },
  {
    id: 8,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Nombre d'employés temporaires/saisonniers",
    type: "number",
    field: "nb_employes_temporaires",
    placeholder: "Ex: 10 (laisser vide si non pertinent)",
    icon: Users,
    allowNA: true
  },
  {
    id: 9,
    section: t("questionnaire.questions.sections.generalInfo"),
    question: "Chiffre d'affaires annuel (DT)",
    type: "number",
    field: "ca_annuel",
    placeholder: "Ex: 1500000",
    icon: Building2,
    required: true
  },

  // Section 2: Scope 1 - Combustion (10-18)
  {
    id: 10,
    section: t("questionnaire.questions.sections.combustion"),
    question: t("questionnaire.questions.combustion.naturalGas"),
    type: "number",
    field: "gaz_naturel_m3",
    placeholder: "Ex: 10000",
    icon: Fuel,
    allowNA: true
  },
  {
    id: 11,
    section: t("questionnaire.questions.sections.combustion"),
    question: "Utilisez-vous du fioul dans votre entreprise ?",
    type: "select",
    field: "utilise_fioul",
    placeholder: "Sélectionner une option",
    icon: Fuel,
    required: true,
    options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" }
    ]
  },
  {
    id: 12,
    section: t("questionnaire.questions.sections.combustion"),
    question: t("questionnaire.questions.combustion.fuelOil"),
    type: "number",
    field: "fioul_tonnes",
    placeholder: "Ex: 5",
    icon: Fuel,
    allowNA: true,
    conditionalOn: { field: "utilise_fioul", value: "oui" }
  },
  {
    id: 13,
    section: t("questionnaire.questions.sections.combustion"),
    question: "Utilisez-vous du charbon dans votre entreprise ?",
    type: "select",
    field: "utilise_charbon",
    placeholder: "Sélectionner une option",
    icon: Fuel,
    required: true,
    options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" }
    ]
  },
  {
    id: 14,
    section: t("questionnaire.questions.sections.combustion"),
    question: "Quelle quantité de charbon consommez-vous annuellement ?",
    type: "number",
    field: "charbon_quantite_tonnes",
    placeholder: "Ex: 2",
    icon: Fuel,
    allowNA: true,
    conditionalOn: { field: "utilise_charbon", value: "oui" }
  },
  {
    id: 15,
    section: t("questionnaire.questions.sections.combustion"),
    question: t("questionnaire.questions.combustion.biomass"),
    type: "number",
    field: "biomasse_tonnes",
    placeholder: "Ex: 1",
    icon: Fuel,
    allowNA: true
  },
  {
    id: 16,
    section: t("questionnaire.questions.sections.combustion"),
    question: t("questionnaire.questions.combustion.boilers"),
    type: "number",
    field: "nb_chaudieres",
    placeholder: "Ex: 2",
    icon: Factory,
    allowNA: true
  },

  // Section 3: Scope 2 - Énergie (17-24)
  {
    id: 17,
    section: t("questionnaire.questions.sections.energy"),
    question: t("questionnaire.questions.energy.electricity"),
    type: "number",
    field: "electricite_kwh",
    placeholder: "Ex: 100000",
    icon: Zap,
    required: true
  },
  {
    id: 18,
    section: t("questionnaire.questions.sections.energy"),
    question: "Utilisez-vous de la vapeur dans votre entreprise ?",
    type: "select",
    field: "utilise_vapeur",
    placeholder: "Sélectionner une option",
    icon: Zap,
    required: true,
    options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" }
    ]
  },
  {
    id: 19,
    section: t("questionnaire.questions.sections.energy"),
    question: t("questionnaire.questions.energy.steam"),
    type: "number",
    field: "vapeur_tonnes",
    placeholder: "Ex: 50",
    icon: Zap,
    allowNA: true,
    conditionalOn: { field: "utilise_vapeur", value: "oui" }
  },
  {
    id: 20,
    section: t("questionnaire.questions.sections.energy"),
    question: "Utilisez-vous du froid industriel dans votre entreprise ?",
    type: "select",
    field: "utilise_froid",
    placeholder: "Sélectionner une option",
    icon: Zap,
    required: true,
    options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" }
    ]
  },
  {
    id: 21,
    section: t("questionnaire.questions.sections.energy"),
    question: t("questionnaire.questions.energy.cooling"),
    type: "number",
    field: "froid_kwh",
    placeholder: "Ex: 10000",
    icon: Zap,
    allowNA: true,
    conditionalOn: { field: "utilise_froid", value: "oui" }
  },
  {
    id: 22,
    section: t("questionnaire.questions.sections.energy"),
    question: t("questionnaire.questions.energy.heating"),
    type: "number",
    field: "chaleur_kwh",
    placeholder: "Ex: 5000",
    icon: Zap,
    allowNA: true
  },
  {
    id: 23,
    section: t("questionnaire.questions.sections.energy"),
    question: t("questionnaire.questions.energy.renewable"),
    type: "number",
    field: "energie_renouvelable_pourcent",
    placeholder: "Ex: 20 (en %)",
    icon: Zap,
    allowNA: true
  },

  // Section 4: Scope 1 - Transport (24-27)
  {
    id: 24,
    section: t("questionnaire.adaptive.sections.transport"),
    question: t("questionnaire.adaptive.questions.transport.fleetSize"),
    type: "number",
    field: "nb_vehicules_flotte",
    placeholder: t("questionnaire.questions.placeholders.fleetSize"),
    icon: Car,
    allowNA: true
  },
  {
    id: 25,
    section: t("questionnaire.adaptive.sections.transport"),
    question: t("questionnaire.adaptive.questions.transport.fuelType"),
    type: "select",
    field: "carburant_flotte",
    placeholder: t("questionnaire.questions.placeholders.fuelType"),
    icon: Car,
    options: [
      { value: "essence", label: t("questionnaire.adaptive.fuelTypes.gasoline") },
      { value: "diesel", label: t("questionnaire.adaptive.fuelTypes.diesel") },
      { value: "mixte", label: t("questionnaire.adaptive.fuelTypes.mixed") },
      { value: "aucun", label: t("questionnaire.adaptive.fuelTypes.none") },
      { value: "autre", label: t("questionnaire.adaptive.fuelTypes.other") }
    ]
  },
  {
    id: 26,
    section: t("questionnaire.adaptive.sections.transport"),
    question: t("questionnaire.adaptive.questions.transport.fuelConsumption"),
    type: "number",
    field: "carburant_litres",
    placeholder: t("questionnaire.questions.placeholders.fuelConsumption"),
    icon: Car,
    allowNA: true
  },
  {
    id: 27,
    section: t("questionnaire.adaptive.sections.transport"),
    question: t("questionnaire.adaptive.questions.transport.distance"),
    type: "number",
    field: "km_flotte_annuel",
    placeholder: t("questionnaire.questions.placeholders.distance"),
    icon: Car,
    allowNA: true
  },

  // Section 5: Scope 1 - Fluides. Une seule question : la recharge annuelle
  // est la mesure des fuites (on recharge ce qui a fui).
  {
    id: 28,
    section: t("questionnaire.questions.sections.refrigerants"),
    question: t("questionnaire.questions.refrigerants.refill"),
    type: "number",
    field: "fluides_recharge_kg",
    placeholder: t("questionnaire.questions.placeholders.refill"),
    icon: Factory,
    allowNA: true
  },
  {
    id: 30,
    section: t("questionnaire.questions.sections.industrialProcesses"),
    question: "Avez-vous des procédés industriels qui émettent des gaz à effet de serre, en dehors des chaudières, des véhicules et des fluides déjà indiqués ?",
    help: "Par exemple une cimenterie, un procédé chimique ou un four métallurgique. Si ce n'est pas votre cas, répondez Non.",
    type: "select",
    field: "a_procedes_industriels",
    placeholder: "Choisissez une réponse",
    icon: Factory,
    required: true,
    options: [
      { value: "non", label: "Non, aucun" },
      { value: "oui", label: "Oui" }
    ]
  },
  {
    id: 301,
    section: t("questionnaire.questions.sections.industrialProcesses"),
    question: "Lesquels ? Décrivez-les en une phrase.",
    type: "textarea",
    field: "procedes_industriels",
    placeholder: "Ex. : four de ciment, réaction chimique",
    icon: Factory,
    required: true,
    conditionalOn: { field: "a_procedes_industriels", value: "oui" }
  },

  // Section 6: Scope 3 - Achats (31-32)
  {
    id: 31,
    section: t("questionnaire.questions.sections.purchases"),
    question: t("questionnaire.questions.purchases.rawMaterials"),
    type: "number",
    field: "matieres_premieres_tonnes",
    placeholder: t("questionnaire.questions.placeholders.rawMaterials"),
    icon: Building2,
    allowNA: true
  },
  {
    id: 32,
    section: t("questionnaire.questions.sections.purchases"),
    question: t("questionnaire.questions.purchases.goodsServices"),
    type: "number",
    field: "achats_biens_services_tnd",
    placeholder: t("questionnaire.questions.placeholders.goodsServices"),
    icon: Building2,
    required: true
  },

  // Déplacements professionnels : une distance par mode, et trois familles de vols.
  {
    id: 33,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance totale des déplacements professionnels en voiture (km), aller et retour compris.",
    help: "Additionnez les kilomètres de tous les salariés. S'il n'y en a pas, cochez « Aucun ».",
    type: "number",
    field: "deplacements_voiture_km",
    placeholder: "Ex. : 12000",
    icon: Car,
    allowNA: true,
    naLabel: "Aucun déplacement en voiture"
  },
  {
    id: 34,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance totale des déplacements professionnels en train (km).",
    type: "number",
    field: "deplacements_train_km",
    placeholder: "Ex. : 8000",
    icon: Plane,
    allowNA: true,
    naLabel: "Aucun déplacement en train"
  },
  {
    id: 35,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance totale des vols court-courrier (km). Un court-courrier fait moins de 1 000 km.",
    help: "Exemple : Tunis–Djerba. Comptez chaque passager et l'aller-retour.",
    type: "number",
    field: "avion_court_km",
    placeholder: "Ex. : 2000",
    icon: Plane,
    allowNA: true,
    naLabel: "Aucun vol court-courrier"
  },
  {
    id: 351,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance totale des vols moyen-courrier (km). Un moyen-courrier fait de 1 000 à 3 000 km.",
    help: "Exemple : Tunis–Paris.",
    type: "number",
    field: "avion_moyen_km",
    placeholder: "Ex. : 15000",
    icon: Plane,
    allowNA: true,
    naLabel: "Aucun vol moyen-courrier"
  },
  {
    id: 352,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance totale des vols long-courrier (km). Un long-courrier fait plus de 3 000 km.",
    help: "Exemple : Tunis–Montréal.",
    type: "number",
    field: "avion_long_km",
    placeholder: "Ex. : 14000",
    icon: Plane,
    allowNA: true,
    naLabel: "Aucun vol long-courrier"
  },

  // Domicile-travail. En mixte, une distance par mode.
  {
    id: 37,
    section: t("questionnaire.questions.sections.travel"),
    question: "Comment vos employés viennent-ils travailler, dans l'ensemble ?",
    type: "select",
    field: "transport_domicile_travail",
    placeholder: "Choisissez un mode",
    icon: Car,
    required: true,
    options: [
      { value: "voiture", label: "En voiture" },
      { value: "transport_public", label: "En transport en commun" },
      { value: "velo", label: "À vélo ou à pied" },
      { value: "mixte", label: "Mixte : voiture et transport en commun" }
    ]
  },
  {
    id: 38,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance moyenne domicile-travail, en km (aller simple).",
    help: "Un seul trajet, pas l'aller-retour. L'aller-retour est pris en compte dans le calcul.",
    type: "number",
    field: "distance_domicile_travail",
    placeholder: "Ex. : 12",
    icon: Car,
    required: true,
    conditionalOn: { field: "transport_domicile_travail", value: ["voiture", "transport_public"] }
  },
  {
    id: 381,
    section: t("questionnaire.questions.sections.travel"),
    question: "Sur 100 employés, combien viennent en voiture ?",
    help: "Le reste est compté en transport en commun.",
    type: "number",
    field: "part_voiture_pourcent",
    placeholder: "Ex. : 40",
    icon: Car,
    required: true,
    conditionalOn: { field: "transport_domicile_travail", value: "mixte" }
  },
  {
    id: 382,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance aller simple de ceux qui viennent en voiture (km).",
    type: "number",
    field: "distance_domicile_voiture",
    placeholder: "Ex. : 15",
    icon: Car,
    required: true,
    conditionalOn: { field: "transport_domicile_travail", value: "mixte" }
  },
  {
    id: 383,
    section: t("questionnaire.questions.sections.travel"),
    question: "Distance aller simple de ceux qui viennent en transport en commun (km).",
    type: "number",
    field: "distance_domicile_transport",
    placeholder: "Ex. : 8",
    icon: Car,
    required: true,
    conditionalOn: { field: "transport_domicile_travail", value: "mixte" }
  },
  {
    id: 39,
    section: t("questionnaire.questions.sections.travel"),
    question: "Combien de jours par semaine vos employés font-ils ce trajet ?",
    type: "number",
    field: "frequence_trajet_semaine",
    placeholder: "De 1 à 7",
    icon: Car,
    required: true,
    conditionalOn: { field: "transport_domicile_travail", value: ["voiture", "transport_public", "mixte"] }
  },

  // Section 9: Scope 3 - Logistique (40-42)
  {
    id: 40,
    section: t("questionnaire.questions.sections.freight"),
    question: t("questionnaire.questions.logistics.freightVolume"),
    type: "number",
    field: "marchandises_tonnes",
    placeholder: t("questionnaire.questions.placeholders.freightVolume"),
    icon: Car,
    allowNA: true
  },
  {
    id: 41,
    section: t("questionnaire.questions.sections.freight"),
    question: t("questionnaire.questions.logistics.transportMode"),
    type: "select",
    field: "transport_logistique",
    placeholder: t("questionnaire.questions.placeholders.transportMode"),
    icon: Car,
    options: [
      { value: "camion", label: "Camion" },
      { value: "maritime", label: "Bateau" },
      { value: "train", label: "Train" },
      { value: "avion", label: "Avion" },
      { value: "mixte", label: "Plusieurs modes" },
      { value: "aucun", label: "Pas de transport de marchandises" }
    ]
  },
  {
    id: 42,
    section: t("questionnaire.questions.sections.freight"),
    question: "Quelle distance moyenne parcourent ces marchandises (km) ?",
    help: "Une distance par envoi, du départ à l'arrivée.",
    type: "number",
    field: "distance_marchandises",
    placeholder: "Ex. : 250",
    icon: Car,
    allowNA: true,
    naLabel: "Distance inconnue",
    conditionalOn: { field: "transport_logistique", value: ["camion", "maritime", "train", "avion", "mixte"] }
  },

  // Section 10: Scope 3 - Déchets (43-45)
  {
    id: 43,
    section: t("questionnaire.questions.sections.waste"),
    question: "Combien de tonnes de déchets votre entreprise a-t-elle produites dans l'année ?",
    help: "Indiquez 0 s'il n'y en a pas. Les deux questions suivantes n'apparaissent que si ce tonnage est supérieur à zéro.",
    type: "number",
    field: "dechets_tonnes",
    placeholder: "Ex. : 12",
    icon: Recycle,
    required: true
  },
  {
    id: 44,
    section: t("questionnaire.questions.sections.waste"),
    question: "Quel type de déchets représente la plus grande part de ce tonnage ?",
    type: "select",
    field: "types_dechets",
    placeholder: "Choisissez un type",
    icon: Recycle,
    required: true,
    conditionalOn: { field: "dechets_tonnes", min: 0 },
    options: [
      { value: "ordures", label: "Ordures ménagères" },
      { value: "papier", label: "Papier et carton" },
      { value: "plastique", label: "Plastiques" },
      { value: "organique", label: "Déchets organiques" },
      { value: "dangereux", label: "Déchets dangereux" },
      { value: "melange", label: "Un mélange de plusieurs types" }
    ]
  },
  {
    id: 45,
    section: t("questionnaire.questions.sections.waste"),
    question: "Que deviennent ces déchets ?",
    type: "select",
    field: "traitement_dechets",
    placeholder: "Choisissez une filière",
    icon: Recycle,
    required: true,
    conditionalOn: { field: "dechets_tonnes", min: 0 },
    options: [
      { value: "recyclage", label: "Ils sont recyclés" },
      { value: "incineration", label: "Ils sont incinérés" },
      { value: "decharge", label: "Ils vont en décharge" },
      { value: "mixte", label: "Plusieurs filières à la fois" }
    ]
  },

  {
    id: 46,
    section: t("questionnaire.questions.sections.productUse"),
    question: "Vos clients émettent-ils des gaz à effet de serre en utilisant ce que vous leur vendez ?",
    help: "Par exemple l'électricité consommée par un appareil, ou le carburant d'un véhicule vendu. Une activité de services répond en général Non.",
    type: "select",
    field: "emissions_utilisation",
    placeholder: "Choisissez une réponse",
    icon: Building2,
    required: true,
    options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" },
      { value: "ne_sais_pas", label: "Je ne sais pas" }
    ]
  },
  {
    id: 47,
    section: t("questionnaire.questions.sections.endOfLife"),
    question: "Que deviennent vos produits quand vos clients n'en ont plus l'usage ?",
    help: "Cela concerne uniquement les objets que vous vendez. Si vous ne vendez pas de produit physique, prenez la première réponse.",
    type: "select",
    field: "fin_de_vie_produits",
    placeholder: "Choisissez une réponse",
    icon: Recycle,
    required: true,
    options: [
      { value: "pas_de_produit", label: "Nous ne vendons pas de produit physique" },
      { value: "ordures", label: "Ils partent avec les ordures" },
      { value: "recyclage", label: "Ils sont recyclés" },
      { value: "reemploi", label: "Ils sont repris ou réemployés" },
      { value: "ne_sais_pas", label: "Je ne sais pas" }
    ]
  },
  {
    id: 48,
    section: t("questionnaire.questions.sections.endOfLife"),
    question: "Quel pourcentage de ces produits est recyclé ?",
    type: "number",
    field: "recyclage_fin_vie_pourcent",
    placeholder: "Ex. : 60",
    icon: Recycle,
    required: true,
    conditionalOn: { field: "fin_de_vie_produits", value: "recyclage" }
  }
];
};

interface FormData {
  [key: string]: string | number;
}

export const CarboScanQuestionnaire: React.FC<{ publicAccess?: boolean }> = ({ publicAccess = false }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [naFields, setNaFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { userPlan } = usePlanAccess();
  const { t } = useTranslation();

  // Filtrer les questions selon le plan de l'utilisateur
  const allQuestions = getTranslatedQuestions(t);
  const showScope3 = publicAccess || shouldShowScope3(userPlan?.planType || 'essential');
  logger.debug('[CarboScanQuestionnaire] planType=', userPlan?.planType, ' showScope3=', showScope3);
  
  // Questions filtrées selon le plan (exclure les questions Scope 3 pour plan Essential)
  const baseFilteredQuestions = showScope3 
    ? allQuestions 
    : allQuestions.filter(q => q.id <= 27); // Questions 1-27 pour Scopes 1 & 2 seulement
  logger.debug('[CarboScanQuestionnaire] baseFilteredQuestions=', baseFilteredQuestions.length);
  
  // Fonction pour vérifier si une question doit être affichée
  const shouldShowQuestion = (question: any) => {
    if (!question.conditionalOn) return true;

    const { field, value, min } = question.conditionalOn;
    if (min !== undefined) return Number(formData[field]) > min;

    const actual = formData[field];
    return Array.isArray(value) ? value.includes(actual) : actual === value;
  };
  
  // Questions visibles après application de la logique conditionnelle
  const questions = baseFilteredQuestions.filter(shouldShowQuestion);

  // Vérifier l'authentification
  useEffect(() => {
    if (publicAccess) return;
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t("questionnaire.auth.required"),
        description: t("questionnaire.auth.description"),
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
  }, [publicAccess, authLoading, isAuthenticated, navigate, toast]);

  // Récupérer l'ID utilisateur et charger les données sauvegardées
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserId(user.id);
      loadSavedProgress(user.id);
    }
  }, [isAuthenticated, user]);

  // Fonction pour charger les données sauvegardées (localStorage en attendant)
  const loadSavedProgress = async (userId: string) => {
    try {
      const savedData = localStorage.getItem(`questionnaire_progress_${userId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData(parsed.questionnaire_data || {});
        setCurrentQuestion(parsed.current_question || 0);
        
        toast({
          title: t("questionnaire.progress.restored"),
          description: t("questionnaire.progress.restoredDesc"),
        });
      }
    } catch (error) {
      console.error('Erreur chargement sauvegarde:', error);
    }
  };

  // Fonction de sauvegarde automatique (localStorage en attendant)
  const saveProgress = async (data: FormData, currentQ: number) => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      const progressData = {
        user_id: userId,
        questionnaire_data: data,
        current_question: currentQ,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem(`questionnaire_progress_${userId}`, JSON.stringify(progressData));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erreur sauvegarde automatique:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Sauvegarde automatique à chaque changement de question
  useEffect(() => {
    if (userId && Object.keys(formData).length > 0) {
      saveProgress(formData, currentQuestion);
    }
  }, [currentQuestion, formData, userId]);

  // Notification de bienvenue avec sauvegarde automatique
  useEffect(() => {
    if (userId && !isCompleted) {
      toast({
        title: t("questionnaire.progress.autoSave"),
        description: t("questionnaire.progress.autoSaveDesc"),
        duration: 5000,
      });
    }
  }, [userId, isCompleted, toast, t]);

  const currentQuestionData = baseFilteredQuestions[currentQuestion];
  const visibleQuestionsCount = questions.length;
  const currentVisibleQuestionIndex = questions.findIndex(q => q.id === currentQuestionData?.id) + 1;
  const progress = (currentVisibleQuestionIndex / visibleQuestionsCount) * 100;

  // Calcul des émissions avec les nouveaux facteurs
  const calculateEmissions = () => {
    let scope1Total = 0;
    let scope2Total = 0;
    let scope3Total = 0;
    const categories: Array<{name: string, value: number, scope: number}> = [];

    // SCOPE 1 - Combustion
    const gazNaturel = (Number(formData.gaz_naturel_m3) || 0) * emissionFactors.combustibles.gaz_naturel;
    const fioul = (Number(formData.fioul_tonnes) || 0) * emissionFactors.combustibles.fioul_lourd;
    const charbon = (Number(formData.charbon_tonnes) || 0) * emissionFactors.combustibles.charbon;
    const carburantLitres = Number(formData.carburant_litres) || 0;
    
    let carburantEmissions = 0;
    if (formData.carburant_flotte === 'essence') {
      carburantEmissions = carburantLitres * emissionFactors.combustibles.essence;
    } else if (formData.carburant_flotte === 'diesel') {
      carburantEmissions = carburantLitres * emissionFactors.combustibles.diesel;
    } else if (formData.carburant_flotte === 'mixte') {
      carburantEmissions = carburantLitres * (emissionFactors.combustibles.essence + emissionFactors.combustibles.diesel) / 2;
    }

    const fluides = (Number(formData.fluides_recharge_kg) || 0) * emissionFactors.fluides_frigorigenes.r134a;

    scope1Total = gazNaturel + fioul + charbon + carburantEmissions + fluides;
    
    if (gazNaturel > 0) categories.push({name: 'Gaz naturel', value: gazNaturel, scope: 1});
    if (fioul > 0) categories.push({name: 'Fioul', value: fioul, scope: 1});
    if (charbon > 0) categories.push({name: 'Charbon', value: charbon, scope: 1});
    if (carburantEmissions > 0) categories.push({name: 'Carburant véhicules', value: carburantEmissions, scope: 1});
    if (fluides > 0) categories.push({name: 'Fluides frigorigènes', value: fluides, scope: 1});

    // SCOPE 2 - Énergie
    const electricite = (Number(formData.electricite_kwh) || 0) * emissionFactors.electricite.tunisie;
    const vapeur = (Number(formData.vapeur_tonnes) || 0) * 1000 * emissionFactors.electricite.vapeur; // conversion t -> kg
    const froid = (Number(formData.froid_kwh) || 0) * emissionFactors.electricite.froid;
    const chaleur = (Number(formData.chaleur_kwh) || 0) * emissionFactors.electricite.chaleur;

    scope2Total = electricite + vapeur + froid + chaleur;
    
    if (electricite > 0) categories.push({name: 'Électricité', value: electricite, scope: 2});
    if (vapeur > 0) categories.push({name: 'Vapeur', value: vapeur, scope: 2});
    if (froid > 0) categories.push({name: 'Froid industriel', value: froid, scope: 2});
    if (chaleur > 0) categories.push({name: 'Chaleur', value: chaleur, scope: 2});

    // SCOPE 3 - Seulement si autorisé par le plan
    if (showScope3) {
      const achats = (Number(formData.achats_biens_services_tnd) || 0) * emissionFactors.achats.biens_services;
      const matieres = (Number(formData.matieres_premieres_tonnes) || 0) * emissionFactors.achats.matieres_premieres;
      const biomasse = (Number(formData.biomasse_tonnes) || 0) * 100; // Reporté en Scope 3 avec facteur estimé

      // Déplacements professionnels : kilomètres saisis par mode.
      // Le fichier de facteurs n'a pas de moyen-courrier : on prend la moyenne
      // du court-courrier et du long-courrier déjà présents.
      const deplacementsVoiture = (Number(formData.deplacements_voiture_km) || 0) * emissionFactors.transports.voiture_moyenne;
      const deplacementsTrain = (Number(formData.deplacements_train_km) || 0) * emissionFactors.transports.train;
      const avionMoyen = (emissionFactors.transports.avion_court + emissionFactors.transports.avion_long) / 2;
      const deplacementsAvion =
        (Number(formData.avion_court_km) || 0) * emissionFactors.transports.avion_court +
        (Number(formData.avion_moyen_km) || 0) * avionMoyen +
        (Number(formData.avion_long_km) || 0) * emissionFactors.transports.avion_long;

      // Domicile-travail
      const nbEmployes = (Number(formData.nb_employes_permanents) || 0) + (Number(formData.nb_employes_temporaires) || 0);
      const frequenceTrajet = Math.min(7, Math.max(0, Number(formData.frequence_trajet_semaine) || 0));
      const trajetsAnnuels = 2 * frequenceTrajet * 50;
      let domicileTravail = 0;
      if (formData.transport_domicile_travail === 'voiture') {
        domicileTravail = nbEmployes * (Number(formData.distance_domicile_travail) || 0) * trajetsAnnuels * emissionFactors.transports.voiture_moyenne;
      } else if (formData.transport_domicile_travail === 'transport_public') {
        domicileTravail = nbEmployes * (Number(formData.distance_domicile_travail) || 0) * trajetsAnnuels * emissionFactors.transports.transport_public;
      } else if (formData.transport_domicile_travail === 'mixte') {
        const partVoiture = Math.min(100, Math.max(0, Number(formData.part_voiture_pourcent) || 0)) / 100;
        domicileTravail =
          nbEmployes * partVoiture * (Number(formData.distance_domicile_voiture) || 0) * trajetsAnnuels * emissionFactors.transports.voiture_moyenne +
          nbEmployes * (1 - partVoiture) * (Number(formData.distance_domicile_transport) || 0) * trajetsAnnuels * emissionFactors.transports.transport_public;
      }

      // Logistique
      const marchandises = Number(formData.marchandises_tonnes) || 0;
      const distanceMarchandises = Number(formData.distance_marchandises) || 0;
      const logistiqueFactor = formData.transport_logistique === 'maritime'
        ? emissionFactors.logistique.maritime
        : formData.transport_logistique === 'camion'
          ? emissionFactors.logistique.camion
          : formData.transport_logistique === 'aucun'
            ? 0
            : emissionFactors.logistique.autre;
      const logistique = marchandises * distanceMarchandises * logistiqueFactor;

      // Déchets
      const dechets = Number(formData.dechets_tonnes) || 0;
      const dechetsFactor = formData.traitement_dechets === 'recyclage' ? emissionFactors.dechets.recyclage :
                           formData.traitement_dechets === 'incineration' ? emissionFactors.dechets.incineration :
                           formData.traitement_dechets === 'mixte'
                             ? (emissionFactors.dechets.recyclage + emissionFactors.dechets.incineration + emissionFactors.dechets.decharge) / 3
                             : emissionFactors.dechets.decharge;
      const dechetsEmissions = dechets * dechetsFactor;

      scope3Total = achats + matieres + biomasse + deplacementsVoiture + deplacementsTrain + deplacementsAvion + domicileTravail + logistique + dechetsEmissions;

      if (achats > 0) categories.push({name: 'Achats biens et services', value: achats, scope: 3});
      if (matieres > 0) categories.push({name: 'Matières premières', value: matieres, scope: 3});
      if (biomasse > 0) categories.push({name: 'Biomasse', value: biomasse, scope: 3});
      if (deplacementsVoiture > 0) categories.push({name: 'Déplacements voiture', value: deplacementsVoiture, scope: 3});
      if (deplacementsTrain > 0) categories.push({name: 'Déplacements train', value: deplacementsTrain, scope: 3});
      if (deplacementsAvion > 0) categories.push({name: 'Déplacements avion', value: deplacementsAvion, scope: 3});
      if (domicileTravail > 0) categories.push({name: 'Domicile-travail', value: domicileTravail, scope: 3});
      if (logistique > 0) categories.push({name: 'Logistique', value: logistique, scope: 3});
      if (dechetsEmissions > 0) categories.push({name: 'Déchets', value: dechetsEmissions, scope: 3});
    }

    return {
      scope1: scope1Total,
      scope2: scope2Total,
      scope3: scope3Total,
      total: scope1Total + scope2Total + scope3Total,
      categories
    };
  };

  const handleNext = async () => {
    // Trouver la prochaine question visible
    let nextQuestionIndex = currentQuestion + 1;
    while (nextQuestionIndex < baseFilteredQuestions.length && 
           !shouldShowQuestion(baseFilteredQuestions[nextQuestionIndex])) {
      nextQuestionIndex++;
    }
    
    if (nextQuestionIndex < baseFilteredQuestions.length) {
      setCurrentQuestion(nextQuestionIndex);
    } else {
      // Sauvegarder le bilan
      if (userId) {
        const emissions = calculateEmissions();
        try {
          await supabase.from('bilans_carbone').insert({
            user_id: userId,
            scope1_emission: emissions.scope1,
            scope2_emission: emissions.scope2,
            scope3_emission: emissions.scope3,
            total_emission: emissions.total,
            questionnaire_data: formData,
            date_bilan: new Date().toISOString()
          });

          // Incrémenter le compteur d'assessments utilisés
          const { error: incrementError } = await (supabase.rpc as any)('increment_assessment_usage', {
            _user_id: userId
          });

          if (incrementError) {
            console.error('Erreur incrémentation usage:', incrementError);
          }
          
          toast({
            title: t("questionnaire.completed.saved"),
            description: t("questionnaire.completed.description"),
          });
        } catch (error) {
          console.error('Erreur sauvegarde:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "Impossible de sauvegarder votre bilan. Vos données sont conservées localement.",
            variant: "destructive",
          });
        }
      }
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    // Trouver la question précédente visible
    let prevQuestionIndex = currentQuestion - 1;
    while (prevQuestionIndex >= 0 && 
           !shouldShowQuestion(baseFilteredQuestions[prevQuestionIndex])) {
      prevQuestionIndex--;
    }
    
    if (prevQuestionIndex >= 0) {
      setCurrentQuestion(prevQuestionIndex);
    }
  };

  const handleInputChange = (value: string | number) => {
    const fieldName = currentQuestionData.field;
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Si on saisit une valeur, retirer de la liste N/A
    if (value !== "" && value !== undefined && value !== null) {
      setNaFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
    }
  };

  const handleNAToggle = () => {
    const fieldName = currentQuestionData.field;
    const isCurrentlyNA = naFields.has(fieldName);
    
    if (isCurrentlyNA) {
      // Retirer de N/A
      setNaFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
    } else {
      // Ajouter à N/A et effacer la valeur
      setNaFields(prev => new Set(prev).add(fieldName));
      setFormData(prev => ({
        ...prev,
        [fieldName]: ""
      }));
    }
  };

  const isAnswered = () => {
    const value = formData[currentQuestionData.field];
    const isNA = naFields.has(currentQuestionData.field);
    
    // Pour les champs requis, ils doivent avoir une valeur
    if (currentQuestionData.required) {
      return value !== undefined && value !== "" && value !== null;
    }
    
    // Pour les autres, soit une valeur soit N/A
    return isNA || (value !== undefined && value !== "" && value !== null);
  };

  // Écran de résultats
  if (isCompleted) {
    const emissions = calculateEmissions();
    
    const scopeData = [
      { name: 'Scope 1', value: emissions.scope1, color: '#dc2626' },
      { name: 'Scope 2', value: emissions.scope2, color: '#2563eb' },
      { name: 'Scope 3', value: emissions.scope3, color: '#16a34a' }
    ];

    const categoryData = emissions.categories.map(cat => ({
      name: cat.name,
      value: cat.value / 1000, // Conversion en tonnes
      scope: cat.scope
    }));

    return (
      <div className="flex-1 p-8 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("questionnaire.completed.title")}
            </h1>
            <p className="text-lg text-gray-600">
              {t("questionnaire.completed.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Graphique camembert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Répartition par Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {(emissions.total / 1000).toFixed(1)}
                  </div>
                  <div className="text-lg text-gray-600">tonnes CO₂eq/an</div>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scopeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {scopeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${(Number(value) / 1000).toFixed(1)} t CO₂eq`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Détail par scope */}
            <Card>
              <CardHeader>
                <CardTitle>Détail par Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scopeData.map((scope, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: scope.color }}
                      />
                      <span className="font-medium">{scope.name}</span>
                    </div>
                    <span className="font-bold">{(scope.value / 1000).toFixed(1)} tCO₂eq</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Histogramme par catégorie */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Émissions par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Émissions (t CO₂eq)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} t CO₂eq`, 'Émissions']} />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => {
                const sectorLabel = [
                  ["btp", "BTP / Construction"],
                  ["agroalimentaire", "Agroalimentaire"],
                  ["industrie_textile", "Industrie textile"],
                  ["services", "Services"],
                  ["commerce", "Commerce"],
                  ["transport", "Transport / Logistique"],
                  ["industrie", "Industrie"],
                  ["sante", "Santé"],
                  ["education", "Éducation"],
                  ["hotellerie", "Hôtellerie / Tourisme"],
                  ["autre", "Autre"],
                ].find(([value]) => value === formData.secteur_activite)?.[1];
                downloadTesterBilanPdf({
                  companyName: (formData.nom_entreprise as string) || "Votre organisation",
                  sector: sectorLabel,
                  year: formData.annee_etude,
                  totalKg: emissions.total,
                  scope1Kg: emissions.scope1,
                  scope2Kg: emissions.scope2,
                  scope3Kg: emissions.scope3,
                  categories: emissions.categories,
                });
              }}
            >
              Télécharger le rapport PDF
            </Button>
            <p className="mt-3 text-sm text-gray-600">
              Deux pages : total, répartition par scope, postes principaux et recommandations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loader d'authentification
  if (!publicAccess && authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Vérification de votre connexion...</p>
        </div>
      </div>
    );
  }

  // Redirection si non authentifié
  if (!publicAccess && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Vous devez être connecté pour accéder au questionnaire.</p>
          <Button onClick={() => navigate('/auth')}>Se connecter</Button>
        </div>
      </div>
    );
  }

  const IconComponent = currentQuestionData.icon;
  const currentSection = currentQuestionData.section;

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Header avec progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="bg-white">
              {t("questionnaire.progress.question", { current: currentVisibleQuestionIndex, total: visibleQuestionsCount })}
            </Badge>
            <Badge variant="secondary">
              {currentSection}
            </Badge>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              {Math.round(progress)}% complété
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#E4EBE8]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#00BF72]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm font-medium text-primary">
                {currentSection}
              </div>
            </div>
            <CardTitle className="text-xl">
              {currentQuestionData.question}
            </CardTitle>
            {currentQuestionData.help && (
              <p className="text-sm text-gray-600 pt-2">{currentQuestionData.help}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input */}
            <div>
              <Label htmlFor="input" className="text-sm font-medium mb-2 block">
                Votre réponse
              </Label>
              {currentQuestionData.type === "number" ? (
                <div className="space-y-3">
                  <Input
                    id="input"
                    type="number"
                    placeholder={currentQuestionData.placeholder}
                    value={naFields.has(currentQuestionData.field) ? "" : (formData[currentQuestionData.field] || "")}
                    onChange={(e) => handleInputChange(Number(e.target.value))}
                    className="text-lg py-3"
                    min="0"
                    disabled={naFields.has(currentQuestionData.field)}
                  />
                  {currentQuestionData.allowNA && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="na-checkbox"
                        checked={naFields.has(currentQuestionData.field)}
                        onChange={handleNAToggle}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="na-checkbox" className="text-sm text-gray-600">
                        {currentQuestionData.naLabel || "Non concerné"}
                      </label>
                    </div>
                  )}
                </div>
              ) : currentQuestionData.type === "select" ? (
                <Select
                  value={formData[currentQuestionData.field] as string}
                  onValueChange={handleInputChange}
                >
                  <SelectTrigger className="text-lg py-3">
                    <SelectValue placeholder={currentQuestionData.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentQuestionData.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : currentQuestionData.type === "textarea" ? (
                <Textarea
                  id="input"
                  placeholder={currentQuestionData.placeholder}
                  value={formData[currentQuestionData.field] || ""}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="text-lg py-3"
                  rows={4}
                />
              ) : (
                <Input
                  id="input"
                  placeholder={currentQuestionData.placeholder}
                  value={formData[currentQuestionData.field] || ""}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="text-lg py-3"
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t("questionnaire.actions.previous")}
              </Button>
              
              {/* Indicateur de sauvegarde */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {isSaving ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Sauvegarde...</span>
                  </div>
                ) : lastSaved ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Dernière sauvegarde: {lastSaved.toLocaleTimeString()}</span>
                  </div>
                ) : null}
              </div>
              
              <Button
                onClick={handleNext}
                disabled={!isAnswered()}
              >
                {questions.findIndex(q => q.id === currentQuestionData?.id) === questions.length - 1 ? t("questionnaire.actions.finish") : t("questionnaire.actions.next")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
