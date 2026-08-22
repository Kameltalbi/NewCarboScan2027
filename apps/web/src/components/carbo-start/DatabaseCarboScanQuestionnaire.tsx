import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, HelpCircle, Building2, Factory, Truck, Zap, FileText, Calculator, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useEmissionCalculation } from '@/hooks/useEmissionCalculation';
import { QuestionnaireItem } from '@/hooks/useQuestionnaire';
import { EmpreinteProduitReportGenerator } from '@/components/empreinte-produit-report/EmpreinteProduitReportGenerator';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import html2pdf from 'html2pdf.js';
import { supabase, sessionAuth} from "@/integrations/api/client";
import { useToast } from '@/components/ui/use-toast';

interface QuestionnaireResponse {
  [questionKey: string]: string | number | boolean | string[];
}

interface NAState {
  [questionKey: string]: boolean;
}

interface LocalQuestionnaireItem {
  id: string;
  plan_type: string;
  category: string;
  scope?: number;
  question_key: string;
  question_text: string;
  input_type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  unit?: string;
  emission_factor_slug?: string;
  options?: string[];
  order_index: number;
  is_required: boolean;
  description?: string;
  help_text?: string;
  placeholder?: string;
}

// Questions fixes du questionnaire CarboScan
const QUESTIONNAIRE_DATA: LocalQuestionnaireItem[] = [
  // 🏢 Informations générales (5 questions)
  {
    id: '1',
    plan_type: 'carbo_start',
    category: 'general',
    question_key: 'company_name',
    question_text: 'Nom de votre entreprise',
    input_type: 'text',
    order_index: 1,
    is_required: true,
    placeholder: 'Entrez le nom de votre entreprise'
  },
  {
    id: '2',
    plan_type: 'carbo_start',
    category: 'general',
    question_key: 'main_sector',
    question_text: 'Secteur d\'activité',
    input_type: 'select',
    order_index: 2,
    is_required: true,
    options: ['Bâtiment', 'Industrie', 'Services', 'Commerce', 'Transport', 'Santé', 'Éducation', 'Autre']
  },
  {
    id: '3',
    plan_type: 'carbo_start',
    category: 'general',
    question_key: 'employee_count',
    question_text: 'Nombre d\'employés',
    input_type: 'number',
    order_index: 3,
    is_required: true,
    placeholder: 'Entrez le nombre d\'employés'
  },
  {
    id: '4',
    plan_type: 'carbo_start',
    category: 'general',
    question_key: 'site_count',
    question_text: 'Nombre de sites (usines, dépôts, bureaux, magasins...)',
    input_type: 'number',
    order_index: 4,
    is_required: true,
    placeholder: 'Entrez le nombre de sites'
  },
  {
    id: '5',
    plan_type: 'carbo_start',
    category: 'general',
    question_key: 'total_surface',
    question_text: 'Surface totale de vos locaux',
    input_type: 'number',
    unit: 'm²',
    order_index: 5,
    is_required: true,
    placeholder: 'Entrez la surface totale'
  },

  // 🔥 Scope 1 – A. Consommation d'énergie pour bâtiments et machines (8 questions)
  {
    id: '6',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'gaz_naturel',
    question_text: 'Utilisez-vous du gaz naturel (gaz de ville) ?',
    input_type: 'boolean',
    order_index: 6,
    is_required: true
  },
  {
    id: '7',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'gaz_naturel_quantite',
    question_text: 'Quantité annuelle de gaz naturel',
    input_type: 'number',
    unit: 'm³',
    order_index: 7,
    emission_factor_slug: 'gaz_naturel',
    is_required: false,
    placeholder: 'Entrez la quantité annuelle en m³'
  },
  {
    id: '8',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'fioul',
    question_text: 'Utilisez-vous du fioul (mazout) ?',
    input_type: 'boolean',
    order_index: 8,
    is_required: true
  },
  {
    id: '9',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'fioul_quantite',
    question_text: 'Quantité annuelle de fioul',
    input_type: 'number',
    unit: 'litres',
    order_index: 9,
    emission_factor_slug: 'fioul_domestique',
    is_required: false,
    placeholder: 'Entrez la quantité en litres'
  },
  {
    id: '10',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'gpl',
    question_text: 'Utilisez-vous du GPL (butane/propane en bouteille ou citerne) ?',
    input_type: 'boolean',
    order_index: 10,
    is_required: true
  },
  {
    id: '11',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'gpl_quantite',
    question_text: 'Quantité annuelle de GPL',
    input_type: 'number',
    unit: 'kg',
    order_index: 11,
    emission_factor_slug: 'gpl',
    is_required: false,
    placeholder: 'Entrez la quantité en kg'
  },
  {
    id: '12',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'charbon_biomasse',
    question_text: 'Utilisez-vous du charbon ou biomasse (bois, pellets...) ?',
    input_type: 'boolean',
    order_index: 12,
    is_required: true
  },
  {
    id: '13',
    plan_type: 'carbo_start',
    category: 'combustion_fixe',
    scope: 1,
    question_key: 'charbon_biomasse_quantite',
    question_text: 'Quantité annuelle de charbon ou biomasse',
    input_type: 'number',
    unit: 'kg',
    order_index: 13,
    emission_factor_slug: 'bois',
    is_required: false,
    placeholder: 'Entrez la quantité en kg'
  },

  // 🔥 Scope 1 – B. Parc de véhicules de l'entreprise (9 questions)
  {
    id: '14',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'vehicules_entreprise',
    question_text: 'Votre entreprise possède-t-elle des véhicules ?',
    input_type: 'boolean',
    order_index: 14,
    is_required: true
  },
  {
    id: '15',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'voitures_legeres',
    question_text: 'Combien de voitures légères (voitures de société) ?',
    input_type: 'number',
    order_index: 15,
    is_required: false,
    placeholder: 'Nombre de voitures'
  },
  {
    id: '16',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'camionnettes',
    question_text: 'Combien de camionnettes ou utilitaires légers ?',
    input_type: 'number',
    order_index: 16,
    is_required: false,
    placeholder: 'Nombre de camionnettes'
  },
  {
    id: '17',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'camions',
    question_text: 'Combien de camions poids lourds ?',
    input_type: 'number',
    order_index: 17,
    is_required: false,
    placeholder: 'Nombre de camions'
  },
  {
    id: '18',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'engins_chantier',
    question_text: 'Combien de machines ou engins de chantier (tractopelle, grue, tracteur...) ?',
    input_type: 'number',
    order_index: 18,
    is_required: false,
    placeholder: 'Nombre d\'engins'
  },
  {
    id: '19',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'essence_consommation',
    question_text: 'Consommation annuelle d\'essence',
    input_type: 'number',
    unit: 'litres',
    order_index: 19,
    emission_factor_slug: 'essence',
    is_required: false,
    placeholder: 'Litres d\'essence par an'
  },
  {
    id: '20',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'gasoil_consommation',
    question_text: 'Consommation annuelle de gasoil (diesel)',
    input_type: 'number',
    unit: 'litres',
    order_index: 20,
    emission_factor_slug: 'gasoil',
    is_required: false,
    placeholder: 'Litres de gasoil par an'
  },
  {
    id: '21',
    plan_type: 'carbo_start',
    category: 'combustion_mobile',
    scope: 1,
    question_key: 'gpl_vehicules_consommation',
    question_text: 'Consommation annuelle de GPL pour véhicules',
    input_type: 'number',
    unit: 'litres',
    order_index: 21,
    emission_factor_slug: 'gpl',
    is_required: false,
    placeholder: 'Litres de GPL par an'
  },
  {
    id: '22',
    plan_type: 'carbo_start',
    category: 'electricite',
    scope: 2,
    question_key: 'electricite_vehicules',
    question_text: 'Consommation annuelle d\'électricité pour véhicules électriques',
    input_type: 'number',
    unit: 'kWh',
    order_index: 22,
    emission_factor_slug: 'electricite',
    is_required: false,
    placeholder: 'kWh pour véhicules électriques'
  },

  // 🔥 Scope 1 – C. Appareils de climatisation et réfrigération (4 questions)
  {
    id: '23',
    plan_type: 'carbo_start',
    category: 'gaz_refrigerants',
    scope: 1,
    question_key: 'climatiseurs',
    question_text: 'Avez-vous des climatiseurs (split, central, etc.) ?',
    input_type: 'boolean',
    order_index: 23,
    is_required: true
  },
  {
    id: '24',
    plan_type: 'carbo_start',
    category: 'gaz_refrigerants',
    scope: 1,
    question_key: 'chambres_froides',
    question_text: 'Avez-vous des chambres froides ou équipements de réfrigération ?',
    input_type: 'boolean',
    order_index: 24,
    is_required: true
  },
  {
    id: '25',
    plan_type: 'carbo_start',
    category: 'gaz_refrigerants',
    scope: 1,
    question_key: 'type_gaz_refrigerant',
    question_text: 'Quel type de gaz réfrigérant utilisez-vous ?',
    input_type: 'select',
    order_index: 25,
    is_required: false,
    options: ['R410A', 'R134a', 'R404A', 'R407C', 'R32', 'R290', 'Autre', 'Ne sait pas']
  },
  {
    id: '26',
    plan_type: 'carbo_start',
    category: 'gaz_refrigerants',
    scope: 1,
    question_key: 'recharge_gaz',
    question_text: 'Rechargez-vous vos climatiseurs chaque année ? Si oui, combien de kg de gaz environ ?',
    input_type: 'number',
    unit: 'kg',
    order_index: 26,
    emission_factor_slug: 'r410a',
    is_required: false,
    placeholder: 'kg de gaz réfrigérant par an'
  },

  // ⚡ Scope 2 – A. Électricité (5 questions)
  {
    id: '27',
    plan_type: 'carbo_start',
    category: 'electricite',
    scope: 2,
    question_key: 'electricite_consommation',
    question_text: 'Quelle est votre consommation annuelle d\'électricité totale ?',
    input_type: 'number',
    unit: 'kWh',
    order_index: 27,
    emission_factor_slug: 'electricite',
    is_required: true,
    placeholder: 'kWh par an'
  },
  {
    id: '28',
    plan_type: 'carbo_start',
    category: 'electricite',
    scope: 2,
    question_key: 'plusieurs_sites_electricite',
    question_text: 'Avez-vous plusieurs sites avec factures séparées ?',
    input_type: 'boolean',
    order_index: 28,
    is_required: true
  },
  {
    id: '29',
    plan_type: 'carbo_start',
    category: 'electricite',
    scope: 2,
    question_key: 'electricite_verte',
    question_text: 'Votre fournisseur vous propose-t-il une option d\'électricité verte (renouvelable) ?',
    input_type: 'select',
    order_index: 29,
    is_required: false,
    options: ['Oui, 100% verte', 'Oui, partiellement', 'Non', 'Ne sait pas']
  },
  {
    id: '30',
    plan_type: 'carbo_start',
    category: 'electricite',
    scope: 2,
    question_key: 'production_electricite',
    question_text: 'Produisez-vous de l\'électricité pour vos propres besoins (panneaux solaires, éolien) ?',
    input_type: 'number',
    unit: 'kWh produits',
    order_index: 30,
    is_required: false,
    placeholder: 'kWh produits par an'
  },
  {
    id: '31',
    plan_type: 'carbo_start',
    category: 'electricite',
    scope: 2,
    question_key: 'vente_electricite',
    question_text: 'Revendez-vous une partie de cette électricité au réseau ?',
    input_type: 'number',
    unit: 'kWh vendus',
    order_index: 31,
    is_required: false,
    placeholder: 'kWh vendus par an'
  },

  // ⚡ Scope 2 – B. Autres énergies achetées (1 question)
  {
    id: '32',
    plan_type: 'carbo_start',
    category: 'autres_energies',
    scope: 2,
    question_key: 'autres_energies_achetees',
    question_text: 'Achetez-vous de la chaleur, vapeur ou froid à un fournisseur externe (réseau urbain, zone industrielle) ?',
    input_type: 'number',
    unit: 'MWh',
    order_index: 32,
    emission_factor_slug: 'chaleur_reseau',
    is_required: false,
    placeholder: 'MWh par an si connu'
  }
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'general':
      return Building2;
    case 'combustion_fixe':
    case 'combustion_mobile':
      return Factory;
    case 'gaz_refrigerants':
      return Truck;
    case 'electricite':
    case 'autres_energies':
      return Zap;
    default:
      return FileText;
  }
};

const getCategoryTitle = (category: string) => {
  switch (category) {
    case 'general':
      return '🏢 Informations générales';
    case 'combustion_fixe':
      return '🔥 Combustion fixe';
    case 'combustion_mobile':
      return '🚛 Combustion mobile';
    case 'gaz_refrigerants':
      return '❄️ Gaz réfrigérants';
    case 'electricite':
      return '⚡ Électricité';
    case 'autres_energies':
      return '⚡ Autres énergies';
    case 'donnees_complementaires':
      return '🗂️ Données complémentaires';
    default:
      return category;
  }
};

const getScopeColor = (scope?: number) => {
  switch (scope) {
    case 1:
      return 'bg-red-100 text-red-800';
    case 2:
      return 'bg-blue-100 text-blue-800';
    case 3:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface QuestionInputProps {
  question: LocalQuestionnaireItem;
  value: any;
  onChange: (value: any) => void;
  isNA: boolean;
  onNAChange: (isNA: boolean) => void;
}

const QuestionInput = ({ question, value, onChange, isNA, onNAChange }: QuestionInputProps) => {
  return (
    <div className="space-y-4">
      {/* Main input field */}
      <div className={cn("transition-opacity", isNA && "opacity-50 pointer-events-none")}>
        {(() => {
          switch (question.input_type) {
            case 'text':
              return (
                <Input
                  type="text"
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={question.placeholder}
                />
              );
            
            case 'number':
              return (
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={value || ''}
                    onChange={(e) => onChange(Number(e.target.value) || 0)}
                    placeholder={question.placeholder}
                    min="0"
                    step="0.01"
                  />
                  {question.unit && (
                    <span className="text-sm text-muted-foreground">{question.unit}</span>
                  )}
                </div>
              );
            
            case 'boolean':
              return (
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.question_key}_yes`}
                      checked={value === true}
                      onCheckedChange={() => onChange(true)}
                    />
                    <Label htmlFor={`${question.question_key}_yes`} className="font-medium">Oui</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.question_key}_no`}
                      checked={value === false}
                      onCheckedChange={() => onChange(false)}
                    />
                    <Label htmlFor={`${question.question_key}_no`} className="font-medium">Non</Label>
                  </div>
                </div>
              );
            
            case 'select':
              return (
                <Select value={value || ''} onValueChange={onChange}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Sélectionnez une option" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                    {question.options?.map((option) => (
                      <SelectItem 
                        key={option} 
                        value={option}
                        className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer"
                      >
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            
            case 'multiselect':
              const selectedValues = Array.isArray(value) ? value : [];
              return (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.question_key}_${option}`}
                        checked={selectedValues.includes(option)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onChange([...selectedValues, option]);
                          } else {
                            onChange(selectedValues.filter(v => v !== option));
                          }
                        }}
                      />
                      <Label htmlFor={`${question.question_key}_${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              );
            
            default:
              return null;
          }
        })()}
      </div>

      {/* NA checkbox - Ne pas afficher pour les questions obligatoires sur l'entreprise */}
      {!['company_name', 'main_sector', 'employee_count', 'site_count', 'total_surface'].includes(question.question_key) && (
        <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
          <Checkbox
            id={`${question.question_key}_na`}
            checked={isNA}
            onCheckedChange={onNAChange}
          />
          <Label 
            htmlFor={`${question.question_key}_na`} 
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Non applicable / Pas concerné
          </Label>
        </div>
      )}
    </div>
  );
};

export const DatabaseCarboScanQuestionnaire = () => {
  const questions = QUESTIONNAIRE_DATA;
  const { calculateEmissions, loading: calculatingEmissions } = useEmissionCalculation();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionnaireResponse>({});
  const [naStates, setNaStates] = useState<NAState>({});
  const [showHelp, setShowHelp] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [emissionResults, setEmissionResults] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion.question_key] : undefined;
  const currentNAState = currentQuestion ? naStates[currentQuestion.question_key] || false : false;
  
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleResponse = (value: any) => {
    if (!currentQuestion) return;
    
    setResponses(prev => ({
      ...prev,
      [currentQuestion.question_key]: value
    }));
  };

  const handleNAChange = (isNA: boolean) => {
    if (!currentQuestion) return;
    
    setNaStates(prev => ({
      ...prev,
      [currentQuestion.question_key]: isNA
    }));

    // Clear response when setting NA
    if (isNA) {
      setResponses(prev => ({
        ...prev,
        [currentQuestion.question_key]: null
      }));
    }
  };

  const downloadPDFReport = () => {
    // Créer un élément HTML temporaire avec le contenu du rapport
    const reportElement = document.createElement('div');
    reportElement.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #059669; padding-bottom: 20px;">
          <h1 style="color: #059669; font-size: 28px; margin: 0;">BILAN CARBONE®</h1>
          <h2 style="color: #666; font-size: 18px; margin: 10px 0;">${responses.company_name || 'Mon Entreprise'}</h2>
          <p style="color: #888; margin: 5px 0;">Secteur: ${responses.main_sector || 'Non spécifié'}</p>
          <p style="color: #888; margin: 5px 0;">Date: ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Résumé Exécutif</h3>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0;">
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: bold; color: #059669; margin: 10px 0;">
                ${(emissionResults.totalEmissions / 1000).toFixed(1)} t CO₂e
              </div>
              <p style="font-size: 16px; color: #666;">Émissions totales annuelles</p>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Répartition par Scope</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Scope</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Émissions (t CO₂e)</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Pourcentage</th>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">Scope 1 - Émissions directes</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #dc2626; font-weight: bold;">${(emissionResults.scope1 / 1000).toFixed(2)}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${((emissionResults.scope1 / emissionResults.totalEmissions) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">Scope 2 - Énergie achetée</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #2563eb; font-weight: bold;">${(emissionResults.scope2 / 1000).toFixed(2)}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${((emissionResults.scope2 / emissionResults.totalEmissions) * 100).toFixed(1)}%</td>
            </tr>
            ${emissionResults.scope3 > 0 ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">Scope 3 - Autres émissions</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #059669; font-weight: bold;">${(emissionResults.scope3 / 1000).toFixed(2)}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${((emissionResults.scope3 / emissionResults.totalEmissions) * 100).toFixed(1)}%</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Détail par Catégorie</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Catégorie</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Émissions (t CO₂e)</th>
            </tr>
            ${Object.entries(emissionResults.byCategory).map(([category, emission]) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${getCategoryTitle(category)}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; font-weight: bold;">${((emission as number) / 1000).toFixed(2)}</td>
            </tr>
            `).join('')}
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Indicateurs Clés</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${((emissionResults.totalEmissions / 1000) / (parseInt(responses.employee_count as string) || 1)).toFixed(2)}</div>
              <div style="color: #666; font-size: 14px;">t CO₂e / employé</div>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #059669;">${((emissionResults.totalEmissions / 1000) / (parseInt(responses.total_surface as string) || 1)).toFixed(3)}</div>
              <div style="color: #666; font-size: 14px;">t CO₂e / m²</div>
            </div>
            <div style="background: #fefce8; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ca8a04;">${parseInt(responses.employee_count as string) || 1}</div>
              <div style="color: #666; font-size: 14px;">employés</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Recommandations</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 10px 0; border-bottom: 1px solid #eee;">• Mettre en place un système de monitoring énergétique pour optimiser les consommations</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #eee;">• Former les équipes aux enjeux climatiques et aux bonnes pratiques</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #eee;">• Intégrer les critères carbone dans la politique d'achats</li>
            <li style="padding: 10px 0; border-bottom: 1px solid #eee;">• Planifier une transition vers les énergies renouvelables</li>
            <li style="padding: 10px 0;">• Effectuer un suivi annuel pour mesurer les progrès</li>
          </ul>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #059669; text-align: center; color: #666;">
          <p style="margin: 0;">Rapport généré par CarboScan - ${new Date().toLocaleDateString('fr-FR')}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">Méthodologie conforme au Bilan Carbone® ADEME</p>
        </div>
      </div>
    `;

    // Ajouter temporairement l'élément au DOM
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    document.body.appendChild(reportElement);

    // Options pour html2pdf
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `bilan-carbone-${responses.company_name || 'entreprise'}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    // Générer et télécharger le PDF
    html2pdf().set(opt).from(reportElement).save().finally(() => {
      // Nettoyer l'élément temporaire
      document.body.removeChild(reportElement);
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowHelp(false);
    } else {
      // Dernier question - calculer les émissions
      handleFinishQuestionnaire();
    }
  };

  const handleFinishQuestionnaire = async () => {
    try {
      // Convert local questions to the format expected by calculateEmissions
      const convertedQuestions: QuestionnaireItem[] = questions.map(q => ({
        ...q,
        subcategory: undefined,
        conditional_logic: undefined
      }));
      const results = await calculateEmissions(convertedQuestions, responses);
      setEmissionResults(results);
      setShowResults(true);

      // Sauvegarder le bilan dans la base de données
      const { data: { user } } = await sessionAuth.getUser();
      if (user) {
        try {
          const { error: bilanError } = await supabase
            .from('bilans_carbone')
            .insert({
              user_id: user.id,
              total_emission: results.totalEmissions,
              scope1_emission: results.scope1,
              scope2_emission: results.scope2,
              scope3_emission: results.scope3,
              questionnaire_data: responses,
              date_bilan: new Date().toISOString(),
              analyse_commentaire: `Bilan carbone réalisé avec ${results.totalEmissions ? (results.totalEmissions / 1000).toFixed(1) : '0'} t CO₂e au total`
            });

          if (bilanError) {
            console.error('Erreur lors de la sauvegarde du bilan:', bilanError);
            toast({
              title: "Erreur de sauvegarde",
              description: "Une erreur s'est produite lors de la sauvegarde de votre bilan.",
              variant: "destructive"
            });
          } else {
            
            toast({
              title: "Bilan sauvegardé !",
              description: `Votre bilan carbone de ${(results.totalEmissions / 1000).toFixed(1)} t CO₂e a été enregistré avec succès.`,
            });
          }
        } catch (saveError) {
          console.error('Erreur lors de la sauvegarde:', saveError);
        }
      }
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowHelp(false);
    }
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    
    // If question is marked as NA, it's valid
    const isNA = naStates[currentQuestion.question_key];
    if (isNA) return true;
    
    if (!currentQuestion.is_required) return true;
    
    const value = responses[currentQuestion.question_key];
    if (currentQuestion.input_type === 'boolean') {
      return value === true || value === false;
    }
    if (currentQuestion.input_type === 'multiselect') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  };

  if (!questions.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Aucune question</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Aucune question trouvée.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion && !showResults) {
    return null;
  }

  // Affichage du générateur de rapport (AVANT les résultats)
  if (showReport) {
    
    // Préparer les données pour le générateur de rapport
    const companyInfo = {
      companyName: responses.company_name || 'Mon Entreprise',
      sector: responses.main_sector || 'Non spécifié',
      employees: responses.employee_count || 'Non spécifié',
      sites: responses.site_count || 1,
      surface: responses.total_surface || 'Non spécifié'
    };

    const emissionsData = emissionResults ? {
      totalEmissions: emissionResults.totalEmissions,
      scope1: emissionResults.scope1,
      scope2: emissionResults.scope2,
      scope3: emissionResults.scope3,
      breakdown: emissionResults.byCategory,
      details: emissionResults.details
    } : null;

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowReport(false)}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Retour aux résultats</span>
            </Button>
          </div>
          
          <EmpreinteProduitReportGenerator
            emissionsData={emissionsData}
            companyInfo={companyInfo}
            formData={responses}
            onClose={() => setShowReport(false)}
          />
        </div>
      </div>
    );
  }

  // Affichage des résultats
  if (showResults && emissionResults) {
    // Préparer les données pour les graphiques
    const scopeData = [
      { name: 'Scope 1 - Émissions directes', value: emissionResults.scope1 / 1000, color: '#dc2626' },
      { name: 'Scope 2 - Énergie achetée', value: emissionResults.scope2 / 1000, color: '#2563eb' },
      ...(emissionResults.scope3 > 0 ? [{ name: 'Scope 3 - Autres', value: emissionResults.scope3 / 1000, color: '#059669' }] : [])
    ];

    const categoryData = Object.entries(emissionResults.byCategory)
      .map(([category, emission]) => ({
        name: getCategoryTitle(category),
        value: (emission as number) / 1000,
        fullName: getCategoryTitle(category)
      }))
      .sort((a, b) => b.value - a.value);

    // Calculs des indicateurs
    const employeeCount = parseInt(responses.employee_count as string) || 1;
    const totalSurface = parseInt(responses.total_surface as string) || 1;
    const emissionsPerEmployee = (emissionResults.totalEmissions / 1000) / employeeCount;
    const emissionsPerM2 = (emissionResults.totalEmissions / 1000) / totalSurface;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Calculator className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Résultats de votre Bilan Carbone</h1>
            <p className="text-lg text-gray-600">Analyse détaillée de vos émissions de GES</p>
          </div>

          {/* Émissions totales - Card hero */}
          <Card className="mb-8 border-none shadow-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-6xl font-bold mb-4">
                  {(emissionResults.totalEmissions / 1000).toFixed(1)}
                  <span className="text-2xl ml-2 opacity-90">t CO₂e</span>
                </div>
                <p className="text-xl opacity-90">Émissions totales annuelles</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold">{emissionsPerEmployee.toFixed(2)}</div>
                    <div className="text-sm opacity-80">t CO₂e/employé</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold">{emissionsPerM2.toFixed(3)}</div>
                    <div className="text-sm opacity-80">t CO₂e/m²</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold">{employeeCount}</div>
                    <div className="text-sm opacity-80">employés</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid des graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Graphique camembert par scope - Version CSS */}
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <span>Répartition par Scope</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Graphique camembert amélioré en CSS */}
                <div className="relative w-64 h-64 mx-auto mb-6">
                  <div className="w-64 h-64 rounded-full relative overflow-hidden">
                    {/* Graphique unifié avec conic-gradient */}
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: (() => {
                          const scope1Angle = (emissionResults.scope1 / emissionResults.totalEmissions * 360);
                          const scope2Angle = (emissionResults.scope2 / emissionResults.totalEmissions * 360);
                          const scope3Angle = emissionResults.scope3 > 0 ? (emissionResults.scope3 / emissionResults.totalEmissions * 360) : 0;
                          
                          if (emissionResults.scope3 > 0) {
                            return `conic-gradient(
                              from 0deg,
                              #dc2626 0deg ${scope1Angle}deg,
                              #2563eb ${scope1Angle}deg ${scope1Angle + scope2Angle}deg,
                              #059669 ${scope1Angle + scope2Angle}deg 360deg
                            )`;
                          } else {
                            return `conic-gradient(
                              from 0deg,
                              #dc2626 0deg ${scope1Angle}deg,
                              #2563eb ${scope1Angle}deg 360deg
                            )`;
                          }
                        })()
                      }}
                    />
                    {/* Trou central */}
                    <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {(emissionResults.totalEmissions / 1000).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">t CO₂e</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Légende */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-red-600"></div>
                      <span className="text-sm font-medium">Scope 1 - Émissions directes</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-700">{(emissionResults.scope1 / 1000).toFixed(2)} t</div>
                      <div className="text-xs text-gray-500">{((emissionResults.scope1 / emissionResults.totalEmissions) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                      <span className="text-sm font-medium">Scope 2 - Énergie achetée</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">{(emissionResults.scope2 / 1000).toFixed(2)} t</div>
                      <div className="text-xs text-gray-500">{((emissionResults.scope2 / emissionResults.totalEmissions) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  
                  {emissionResults.scope3 > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-green-600"></div>
                        <span className="text-sm font-medium">Scope 3 - Autres émissions</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700">{(emissionResults.scope3 / 1000).toFixed(2)} t</div>
                        <div className="text-xs text-gray-500">{((emissionResults.scope3 / emissionResults.totalEmissions) * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Graphique en barres par catégorie - Version CSS */}
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span>Émissions par Catégorie</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.map((category, index) => {
                    const maxValue = Math.max(...categoryData.map(c => c.value));
                    const width = (category.value / maxValue) * 100;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">{category.name}</span>
                          <span className="text-green-600 font-bold">{category.value.toFixed(2)} t CO₂e</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                          <div 
                            className="h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                            style={{ width: `${width}%` }}
                          >
                            {width > 20 && (
                              <span className="text-white text-xs font-medium">
                                {((category.value / categoryData.reduce((sum, c) => sum + c.value, 0)) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Indicateurs détaillés */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg border-none bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Émissions par employé</p>
                    <p className="text-2xl font-bold text-blue-700">{emissionsPerEmployee.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">t CO₂e/personne</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Émissions par m²</p>
                    <p className="text-2xl font-bold text-green-700">{emissionsPerM2.toFixed(3)}</p>
                    <p className="text-sm text-gray-500">t CO₂e/m²</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Calculator className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Intensité carbone</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {((emissionResults.totalEmissions / 1000) / Math.max(employeeCount, 1)).toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500">kg CO₂e/€ CA</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détail par scope avec style amélioré */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-rose-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-700 mb-2">
                    {(emissionResults.scope1 / 1000).toFixed(2)} t
                  </div>
                  <div className="text-red-600 font-medium mb-2">Scope 1</div>
                  <div className="text-sm text-gray-600">Émissions directes</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {((emissionResults.scope1 / emissionResults.totalEmissions) * 100).toFixed(1)}% du total
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-sky-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-700 mb-2">
                    {(emissionResults.scope2 / 1000).toFixed(2)} t
                  </div>
                  <div className="text-blue-600 font-medium mb-2">Scope 2</div>
                  <div className="text-sm text-gray-600">Énergie achetée</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {((emissionResults.scope2 / emissionResults.totalEmissions) * 100).toFixed(1)}% du total
                  </div>
                </div>
              </CardContent>
            </Card>

            {emissionResults.scope3 > 0 && (
              <Card className="shadow-lg border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-700 mb-2">
                      {(emissionResults.scope3 / 1000).toFixed(2)} t
                    </div>
                    <div className="text-green-600 font-medium mb-2">Scope 3</div>
                    <div className="text-sm text-gray-600">Autres émissions</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {((emissionResults.scope3 / emissionResults.totalEmissions) * 100).toFixed(1)}% du total
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-center flex-wrap gap-4">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                setShowResults(false);
                setCurrentQuestionIndex(0);
                setResponses({});
                setEmissionResults(null);
                setShowReport(false);
              }}
            >
              Refaire le questionnaire
            </Button>
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowReport(true);
              }}
            >
              <FileText className="h-5 w-5 mr-2" />
              Consulter le rapport complet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = getCategoryIcon(currentQuestion.category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} sur {questions.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% complété</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main question card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Badge variant="outline" className={cn("mb-2", getScopeColor(currentQuestion.scope))}>
                    {currentQuestion.scope ? `Scope ${currentQuestion.scope}` : 'Général'}
                  </Badge>
                  <CardDescription className="text-sm">
                    {getCategoryTitle(currentQuestion.category)}
                  </CardDescription>
                </div>
              </div>
              
              {currentQuestion.help_text && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <CardTitle className="text-xl leading-tight">
              {currentQuestion.question_text}
              {currentQuestion.is_required && <span className="text-destructive ml-1">*</span>}
            </CardTitle>
            
            {currentQuestion.description && (
              <CardDescription className="text-base">
                {currentQuestion.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {showHelp && currentQuestion.help_text && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{currentQuestion.help_text}</p>
              </div>
            )}

            <div className="space-y-3">
              <QuestionInput
                question={currentQuestion}
                value={currentResponse}
                onChange={handleResponse}
                isNA={currentNAState}
                onNAChange={handleNAChange}
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Précédent</span>
              </Button>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{currentQuestionIndex + 1} / {questions.length}</span>
              </div>

              <Button
                onClick={handleNext}
                disabled={!canProceed() || calculatingEmissions}
                className="flex items-center space-x-2"
              >
                <span>{currentQuestionIndex === questions.length - 1 ? 'Calculer' : 'Suivant'}</span>
                {currentQuestionIndex === questions.length - 1 ? (
                  <Calculator className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};