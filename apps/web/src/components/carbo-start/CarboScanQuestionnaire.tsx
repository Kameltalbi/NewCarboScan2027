
import React, { useState, useEffect } from "react";
import { logger } from '@/utils/logger';
import { useNavigate } from "react-router-dom";
import { EmpreinteProduitReportGenerator } from "@/components/empreinte-produit-report/EmpreinteProduitReportGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  // Section 5: Scope 1 - Fluides (28-30)
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
    id: 29,
    section: t("questionnaire.questions.sections.refrigerants"),
    question: t("questionnaire.questions.refrigerants.leaks"),
    type: "number",
    field: "fluides_fuites_kg",
    placeholder: t("questionnaire.questions.placeholders.leaks"),
    icon: Factory,
    allowNA: true
  },
  {
    id: 30,
    section: t("questionnaire.questions.sections.industrialProcesses"),
    question: t("questionnaire.questions.industrialProcesses.processes"),
    type: "textarea",
    field: "procedes_industriels",
    placeholder: t("questionnaire.questions.placeholders.industrialProcesses"),
    icon: Factory
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

  // Section 7: Scope 3 - Déplacements professionnels (33-36)
  {
    id: 33,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.carTrips"),
    type: "number",
    field: "deplacements_voiture",
    placeholder: t("questionnaire.questions.placeholders.carTrips"),
    icon: Car,
    allowNA: true
  },
  {
    id: 34,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.trainTrips"),
    type: "number",
    field: "deplacements_train",
    placeholder: t("questionnaire.questions.placeholders.trainTrips"),
    icon: Plane,
    allowNA: true
  },
  {
    id: 35,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.flightTrips"),
    type: "number",
    field: "deplacements_avion",
    placeholder: t("questionnaire.questions.placeholders.flightTrips"),
    icon: Plane,
    allowNA: true
  },
  {
    id: 36,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.averageDistance"),
    type: "number",
    field: "distance_moyenne_deplacement",
    placeholder: t("questionnaire.questions.placeholders.averageDistance"),
    icon: Plane,
    allowNA: true
  },

  // Section 8: Scope 3 - Domicile-travail (37-39)
  {
    id: 37,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.commuteMode"),
    type: "select",
    field: "transport_domicile_travail",
    placeholder: t("questionnaire.questions.placeholders.commuteMode"),
    icon: Car,
    options: [
      { value: "voiture", label: t("questionnaire.questions.commuteTransport.car") },
      { value: "transport_public", label: t("questionnaire.questions.commuteTransport.publicTransport") },
      { value: "mixte", label: t("questionnaire.questions.commuteTransport.mixed") },
      { value: "autre", label: t("questionnaire.questions.fuelTypes.other") }
    ]
  },
  {
    id: 38,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.commuteDistance"),
    type: "number",
    field: "distance_domicile_travail",
    placeholder: t("questionnaire.questions.placeholders.commuteDistance"),
    icon: Car,
    required: true
  },
  {
    id: 39,
    section: t("questionnaire.questions.sections.travel"),
    question: t("questionnaire.questions.businessTravel.commuteFrequency"),
    type: "number",
    field: "frequence_trajet_semaine",
    placeholder: t("questionnaire.questions.placeholders.commuteFrequency"),
    icon: Car,
    required: true,
    allowNA: true,
    validation: (value: string) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 1 || num > 7 || !Number.isInteger(num)) {
        return t("questionnaire.questions.validation.commuteFrequency");
      }
      return null;
    }
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
      { value: "camion", label: t("questionnaire.questions.transportModes.truck") },
      { value: "maritime", label: t("questionnaire.questions.transportModes.maritime") },
      { value: "mixte", label: t("questionnaire.questions.transportModes.mixed") },
      { value: "aucun", label: t("questionnaire.questions.transportModes.none") },
      { value: "autre", label: t("questionnaire.questions.fuelTypes.other") }
    ]
  },
  {
    id: 42,
    section: t("questionnaire.questions.sections.freight"),
    question: t("questionnaire.questions.logistics.freightDistance"),
    type: "number",
    field: "distance_marchandises",
    placeholder: t("questionnaire.questions.placeholders.freightDistance"),
    icon: Car,
    allowNA: true
  },

  // Section 10: Scope 3 - Déchets (43-45)
  {
    id: 43,
    section: t("questionnaire.questions.sections.waste"),
    question: t("questionnaire.questions.waste.wasteProduction"),
    type: "number",
    field: "dechets_tonnes",
    placeholder: t("questionnaire.questions.placeholders.wasteProduction"),
    icon: Recycle,
    required: true
  },
  {
    id: 44,
    section: t("questionnaire.questions.sections.waste"),
    question: t("questionnaire.questions.waste.wasteTypes"),
    type: "textarea",
    field: "types_dechets",
    placeholder: t("questionnaire.questions.waste.wasteTypesDescription"),
    icon: Recycle
  },
  {
    id: 45,
    section: t("questionnaire.questions.sections.waste"),
    question: t("questionnaire.questions.waste.wasteTreatment"),
    type: "select",
    field: "traitement_dechets",
    placeholder: t("questionnaire.questions.placeholders.wasteTreatment"),
    icon: Recycle,
    options: [
      { value: "recyclage", label: t("questionnaire.questions.wasteTreatment.recycling") },
      { value: "incineration", label: t("questionnaire.questions.wasteTreatment.incineration") },
      { value: "decharge", label: t("questionnaire.questions.wasteTreatment.landfill") },
      { value: "mixte", label: t("questionnaire.questions.wasteTreatment.mixed") }
    ]
  },

  // Section 11: Scope 3 - Utilisation et fin de vie (46-48)
  {
    id: 46,
    section: t("questionnaire.questions.sections.productUse"),
    question: t("questionnaire.questions.waste.productUse"),
    type: "select",
    field: "emissions_utilisation",
    placeholder: t("questionnaire.questions.placeholders.productUse"),
    icon: Building2,
    options: [
      { value: "oui", label: t("questionnaire.questions.yesNoOptions.yes") },
      { value: "non", label: t("questionnaire.questions.yesNoOptions.no") },
      { value: "ne_sais_pas", label: t("questionnaire.questions.yesNoOptions.dontKnow") }
    ]
  },
  {
    id: 47,
    section: t("questionnaire.questions.sections.endOfLife"),
    question: t("questionnaire.questions.waste.endOfLife"),
    type: "textarea",
    field: "fin_de_vie_produits",
    placeholder: t("questionnaire.questions.waste.endOfLifeDescription"),
    icon: Recycle
  },
  {
    id: 48,
    section: t("questionnaire.questions.sections.endOfLife"),
    question: t("questionnaire.questions.waste.recyclingRate"),
    type: "number",
    field: "recyclage_fin_vie_pourcent",
    placeholder: t("questionnaire.questions.placeholders.recyclingRate"),
    icon: Recycle,
    allowNA: true
  }
];
};

interface FormData {
  [key: string]: string | number;
}

export const CarboScanQuestionnaire: React.FC = () => {
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
  const showScope3 = shouldShowScope3(userPlan?.planType || 'essential');
  logger.debug('[CarboScanQuestionnaire] planType=', userPlan?.planType, ' showScope3=', showScope3);
  
  // Questions filtrées selon le plan (exclure les questions Scope 3 pour plan Essential)
  const baseFilteredQuestions = showScope3 
    ? allQuestions 
    : allQuestions.filter(q => q.id <= 27); // Questions 1-27 pour Scopes 1 & 2 seulement
  logger.debug('[CarboScanQuestionnaire] baseFilteredQuestions=', baseFilteredQuestions.length);
  
  // Fonction pour vérifier si une question doit être affichée
  const shouldShowQuestion = (question: any) => {
    if (!question.conditionalOn) return true;
    
    const conditionalField = question.conditionalOn.field;
    const conditionalValue = question.conditionalOn.value;
    
    return formData[conditionalField] === conditionalValue;
  };
  
  // Questions visibles après application de la logique conditionnelle
  const questions = baseFilteredQuestions.filter(shouldShowQuestion);

  // Vérifier l'authentification
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t("questionnaire.auth.required"),
        description: t("questionnaire.auth.description"),
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

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

    const fluides = ((Number(formData.fluides_recharge_kg) || 0) + (Number(formData.fluides_fuites_kg) || 0)) * emissionFactors.fluides_frigorigenes.r134a;

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

      // Déplacements professionnels
      const distanceMoyenne = Number(formData.distance_moyenne_deplacement) || 200;
      const deplacementsVoiture = (Number(formData.deplacements_voiture) || 0) * distanceMoyenne * emissionFactors.transports.voiture_moyenne;
      const deplacementsTrain = (Number(formData.deplacements_train) || 0) * distanceMoyenne * emissionFactors.transports.train;
      const deplacementsAvion = (Number(formData.deplacements_avion) || 0) * distanceMoyenne * emissionFactors.transports.avion_court;

      // Domicile-travail
      const nbEmployes = Number(formData.nb_employes) || 0;
      const distanceDomicile = Number(formData.distance_domicile_travail) || 0;
      const frequenceTrajet = Number(formData.frequence_trajet_semaine) || 5;
      const transportFactor = formData.transport_domicile_travail === 'voiture' ? emissionFactors.transports.voiture_moyenne : emissionFactors.transports.transport_public;
      const domicileTravail = nbEmployes * distanceDomicile * 2 * frequenceTrajet * 50 * transportFactor; // 50 semaines par an

      // Logistique
      const marchandises = Number(formData.marchandises_tonnes) || 0;
      const distanceMarchandises = Number(formData.distance_marchandises) || 0;
      const logistiqueFactor = formData.transport_logistique === 'maritime' ? emissionFactors.logistique.maritime : emissionFactors.logistique.camion;
      const logistique = marchandises * distanceMarchandises * logistiqueFactor;

      // Déchets
      const dechets = Number(formData.dechets_tonnes) || 0;
      const dechetsFactor = formData.traitement_dechets === 'recyclage' ? emissionFactors.dechets.recyclage : 
                           formData.traitement_dechets === 'incineration' ? emissionFactors.dechets.incineration : 
                           emissionFactors.dechets.decharge;
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

          {/* Rapport PDF */}
          <Card className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-bold mb-4">Obtenez votre rapport détaillé</h3>
              <p className="mb-4 opacity-90">
                Téléchargez un rapport professionnel avec votre bilan complet et nos recommandations
              </p>
              <EmpreinteProduitReportGenerator
                emissionsData={{
                  totalEmissions: emissions.total,
                  scope1: emissions.scope1,
                  scope2: emissions.scope2,
                  scope3: emissions.scope3,
                  categoryBreakdown: emissions.categories
                }}
                companyInfo={{
                  name: user?.user_metadata?.company || 'Votre Entreprise',
                  sector: formData.secteur_activite as string || 'Services',
                  employees: formData.nb_employes,
                  studiedYear: formData.annee_etude,
                  revenue: formData.ca_annuel,
                  size: 'PME'
                }}
                onGenerate={() => {
                  logger.debug('Génération du rapport PDF...');
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loader d'authentification
  if (authLoading) {
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
  if (!isAuthenticated) {
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
              {t("questionnaire.progress.question", { current: currentQuestion + 1, total: questions.length })}
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
          <Progress value={progress} className="h-2" />
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
                        Non applicable (N/A)
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
                {currentQuestion === questions.length - 1 ? t("questionnaire.actions.finish") : t("questionnaire.actions.next")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
