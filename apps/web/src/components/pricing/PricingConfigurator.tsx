// Configurateur de prix CarboScan avec qualification préalable
// 3 étapes: Qualification → Modules → Récapitulatif
// Le prix de base (2900 DT) est toujours inclus dans le total.

import React, { useState, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Puzzle, 
  FileCheck, 
  ChevronRight, 
  ChevronLeft,
  Database,
  Package,
  Leaf,
  Target,
  Check,
  Users,
  CreditCard,
  MessageCircle,
  MapPin,
  Zap,
  Globe2,
  Truck,
  ListChecks
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Module {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ElementType;
  enabled: boolean;
}

interface QualificationData {
  collaborators: number;
  revenue: number; // en millions DT
  sites: number;
  entities: number;
}

export interface PricingConfiguratorRef {
  scrollToConfigurator: () => void;
  preSelectModules: (type: 'bilan-carbone' | 'produit' | 'acv' | 'net-zero') => void;
}

const STEPS = [
  { id: 1, label: 'Qualification', icon: Users },
  { id: 2, label: 'Modules', icon: Puzzle },
  { id: 3, label: 'Récapitulatif', icon: FileCheck },
];

const BASE_PRICE_STANDARD = 3400;
const BASE_PRICE_EXTENDED = 3700;
const SITE_PRICE = 300;
const INCLUDED_SITES = 2;

// Vérifie si le profil nécessite le tarif étendu (>100 employés ET ≥50M DT CA)
const isExtendedPricing = (data: QualificationData): boolean => {
  return data.collaborators > 100 && data.revenue >= 50;
};

// Critères d'éligibilité au tarif standard (pour affichage warning uniquement)
const checkEligibility = (data: QualificationData): boolean => {
  return (
    data.collaborators <= 200 &&
    data.revenue < 30 &&
    data.sites <= 2
  );
};

// Inline editable number: click to type, blur/enter to confirm
const EditableValue: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
  formatDisplay?: (v: number) => string;
}> = ({ value, onChange, min, max, suffix, formatDisplay }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    const num = parseInt(draft, 10);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        min={min}
        max={max}
        className="w-24 text-lg font-bold text-[#1ABC9C] text-right bg-transparent border-b-2 border-[#1ABC9C] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  }

  const display = formatDisplay ? formatDisplay(value) : value.toLocaleString();
  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="text-lg font-bold text-[#1ABC9C] hover:underline cursor-text"
      title="Cliquez pour saisir manuellement"
    >
      {display}{suffix ? ` ${suffix}` : ''}
    </button>
  );
};

export const PricingConfigurator = forwardRef<PricingConfiguratorRef>((_, ref) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [qualification, setQualification] = useState<QualificationData>({
    collaborators: 50,
    revenue: 10,
    sites: 2,
    entities: 1,
  });
  const [modules, setModules] = useState<Module[]>([
    {
      id: 'collecte',
      name: 'Collecte de données avancée',
      description: 'Traçabilité, historisation, audit',
      price: 500,
      icon: Database,
      enabled: false,
    },
    {
      id: 'empreinte-produit',
      name: 'Empreinte produit',
      description: 'Calcul carbone des produits – cradle-to-gate',
      price: 1400,
      icon: Package,
      enabled: false,
    },
    {
      id: 'acv',
      name: 'ACV – Analyse du Cycle de Vie',
      description: 'Cradle-to-grave, multi-étapes',
      price: 3000,
      icon: Leaf,
      enabled: false,
    },
    {
      id: 'net-zero',
      name: 'Trajectoire Net Zero',
      description: 'Scénarios de réduction et pilotage pluriannuel',
      price: 2000,
      icon: Target,
      enabled: false,
    },
    {
      id: 'wattbim',
      name: 'WattBim – Suivi énergie IoT',
      description: 'Monitoring temps réel Shelly EM, détection gaspillages',
      price: 1800,
      icon: Zap,
      enabled: false,
    },
    {
      id: 'cbam',
      name: 'CBAM – Reporting export UE',
      description: 'Déclarations trimestrielles, produits éligibles',
      price: 2500,
      icon: Globe2,
      enabled: false,
    },
    {
      id: 'fournisseurs',
      name: 'Fournisseurs / Portefeuille',
      description: 'Scope 3 amont, questionnaires, scoring PCAF',
      price: 1500,
      icon: Truck,
      enabled: false,
    },
    {
      id: 'plan-actions',
      name: "Plan d'actions & Roadmap",
      description: 'Leviers, KPI, suivi des réductions',
      price: 1200,
      icon: ListChecks,
      enabled: false,
    },
  ]);

  const eligible = checkEligibility(qualification);
  const qualificationComplete = qualification.collaborators > 0 && qualification.revenue > 0;
  
  const containerRef = React.useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToConfigurator: () => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    preSelectModules: (type: 'bilan-carbone' | 'produit' | 'acv' | 'net-zero') => {
      setModules(prev => prev.map(m => {
        switch (type) {
          case 'bilan-carbone':
            return { ...m, enabled: false };
          case 'produit':
            return { ...m, enabled: m.id === 'empreinte-produit' };
          case 'acv':
            return { ...m, enabled: m.id === 'acv' };
          case 'net-zero':
            return { ...m, enabled: m.id === 'net-zero' };
          default:
            return m;
        }
      }));
      setCurrentStep(2);
    },
  }));

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));
  };
  // Calcul du prix de base selon le profil
  const basePrice = isExtendedPricing(qualification) ? BASE_PRICE_EXTENDED : BASE_PRICE_STANDARD;
  
  // Plafonnement à 40 sites maximum pour le calcul
  const cappedSites = Math.min(qualification.sites, 40);
  const extraSites = Math.max(0, cappedSites - INCLUDED_SITES);
  const sitesPrice = extraSites * SITE_PRICE;
  const modulesPrice = modules.filter(m => m.enabled).reduce((sum, m) => sum + m.price, 0);
  
  // Entity pricing - progressive tiers
  const entityOptions = [1, 3, 6, 10];
  const calcEntityPrice = (count: number): number => {
    if (count <= 1) return 0;
    const extra = count - 1;
    const tier1 = Math.min(extra, 2) * 1200;      // entities 2-3
    const tier2 = Math.min(Math.max(extra - 2, 0), 3) * 1000;  // entities 4-6
    const tier3 = Math.min(Math.max(extra - 5, 0), 4) * 800;   // entities 7-10
    return tier1 + tier2 + tier3;
  };
  const entitiesPrice = calcEntityPrice(qualification.entities);
  
  // Total toujours calculé (base + sites supplémentaires + modules + entités)
  const totalPrice = basePrice + sitesPrice + modulesPrice + entitiesPrice;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCheckout = () => {
    const enabledModules = modules.filter(m => m.enabled);
    const config = {
      qualification,
      eligible,
      pricing: {
        base: basePrice,
        includedSites: INCLUDED_SITES,
        siteUnitPrice: SITE_PRICE,
        extraSites,
        sitesPrice,
        entities: qualification.entities,
        entitiesPrice,
        modules: enabledModules.map(m => ({
          id: m.id,
          name: m.name,
          price: m.price,
        })),
        modulesPrice,
        total: totalPrice,
      },
    };
    
    navigate('/checkout', { state: { pricingConfig: config } });
  };

  const handleContact = () => {
    navigate('/contact');
  };

  const canProceedFromStep1 = qualificationComplete;

  return (
    <section ref={containerRef} className="py-8 md:py-16 bg-[#F5F7FA] min-h-screen md:min-h-0" id="configurator">
      <div className="container mx-auto max-w-4xl px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-2xl md:text-4xl font-bold text-[#1F2937] mb-2 md:mb-3">
            Configurez votre solution CarboScan
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
            <span className="hidden md:inline">Sélectionnez votre périmètre et vos modules pour obtenir votre tarif annuel HT.</span>
            <span className="md:hidden">Votre tarif annuel HT, en quelques étapes.</span>
          </p>
        </div>

        {/* Progress Bar - Sticky on mobile */}
        <div className="sticky top-0 z-20 bg-[#F5F7FA] py-3 md:py-0 md:static mb-6 md:mb-10 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`flex flex-col items-center gap-1 md:gap-2 transition-all min-w-0 ${
                      isActive 
                        ? 'text-[#1ABC9C]' 
                        : isCompleted 
                          ? 'text-[#1ABC9C]/70 cursor-pointer' 
                          : 'text-[#9CA3AF] cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-[#1ABC9C] text-white shadow-lg' 
                        : isCompleted 
                          ? 'bg-[#1ABC9C]/20 text-[#1ABC9C]' 
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : <Icon className="h-4 w-4 md:h-5 md:w-5" />}
                    </div>
                    <span className={`text-[10px] md:text-sm font-medium text-center leading-tight ${
                      isActive ? 'text-[#1F2937]' : 'text-[#6B7280]'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-1 md:mx-2 bg-gray-200 relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-[#1ABC9C] transition-all duration-300"
                        style={{ width: currentStep > step.id ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-lg bg-white mb-20 md:mb-0">
          <CardContent className="p-4 md:p-8">
            {/* Step 1: Qualification */}
            {currentStep === 1 && (
              <div className="py-4 md:py-6">
                <div className="text-center mb-6 md:mb-8">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-[#1ABC9C]/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <Users className="h-7 w-7 md:h-8 md:w-8 text-[#1ABC9C]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-[#1F2937] mb-2 md:mb-3">
                    Parlez-nous de votre organisation
                  </h3>
                  <p className="text-[#6B7280] text-sm md:text-base">
                    Ces informations permettent d'adapter le périmètre de la plateforme.
                  </p>
                </div>
                
                <div className="space-y-6 max-w-md mx-auto">
                  {/* Nombre d'entités */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-semibold text-[#1F2937]">
                        Nombre d'entités
                      </Label>
                      <EditableValue
                        value={qualification.entities}
                        onChange={(v) => setQualification(prev => ({ ...prev, entities: v }))}
                        min={1}
                        max={10}
                      />
                    </div>
                    <Slider
                      value={[qualification.entities]}
                      onValueChange={(value) => setQualification(prev => ({ ...prev, entities: value[0] }))}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#6B7280] mt-2">
                      <span>1</span>
                      <span>3</span>
                      <span>6</span>
                      <span>10</span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Chaque entité correspond à une organisation ou filiale indépendante. 1 incluse.
                    </p>
                  </div>

                  {/* Nombre de collaborateurs */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-semibold text-[#1F2937]">
                        Nombre de collaborateurs
                      </Label>
                      <EditableValue
                        value={qualification.collaborators}
                        onChange={(v) => setQualification(prev => ({ ...prev, collaborators: v }))}
                        min={1}
                        max={1000}
                      />
                    </div>
                    <Slider
                      value={[qualification.collaborators]}
                      onValueChange={(value) => setQualification(prev => ({ ...prev, collaborators: value[0] }))}
                      min={1}
                      max={1000}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#6B7280] mt-2">
                      <span>1</span>
                      <span>250</span>
                      <span>500</span>
                      <span>750</span>
                      <span>1000+</span>
                    </div>
                  </div>

                  {/* Chiffre d'affaires */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-semibold text-[#1F2937]">
                        Chiffre d'affaires annuel
                      </Label>
                      <EditableValue
                        value={qualification.revenue}
                        onChange={(v) => setQualification(prev => ({ ...prev, revenue: v }))}
                        min={0}
                        max={200}
                        formatDisplay={(v) => v < 1 ? '< 1' : String(v)}
                        suffix="M DT"
                      />
                    </div>
                    <Slider
                      value={[qualification.revenue]}
                      onValueChange={(value) => setQualification(prev => ({ ...prev, revenue: value[0] }))}
                      min={0}
                      max={200}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#6B7280] mt-2">
                      <span>&lt; 1M</span>
                      <span>50M</span>
                      <span>100M</span>
                      <span>150M</span>
                      <span>200M+</span>
                    </div>
                  </div>

                  {/* Nombre de sites */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-semibold text-[#1F2937]">
                        Nombre de sites
                      </Label>
                      <EditableValue
                        value={qualification.sites}
                        onChange={(v) => setQualification(prev => ({ ...prev, sites: v }))}
                        min={1}
                        max={50}
                      />
                    </div>
                    <Slider
                      value={[qualification.sites]}
                      onValueChange={(value) => setQualification(prev => ({ ...prev, sites: value[0] }))}
                      min={1}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#6B7280] mt-2">
                      <span>1</span>
                      <span>10</span>
                      <span>25</span>
                      <span>40</span>
                      <span>50+</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Modules */}
            {currentStep === 2 && (
              <div className="py-2 md:py-4">
                <div className="text-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-[#1F2937] mb-2 md:mb-3">
                    Modules complémentaires
                  </h3>
                  <p className="text-[#6B7280] text-sm md:text-base">
                    Activez les modules selon vos besoins
                  </p>
                </div>
                
                <div className="grid gap-3 md:gap-4">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.id}
                        className={`flex items-center justify-between p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          module.enabled 
                            ? 'border-[#1ABC9C] bg-[#1ABC9C]/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            module.enabled ? 'bg-[#1ABC9C]/20' : 'bg-gray-100'
                          }`}>
                            <Icon className={`h-5 w-5 md:h-6 md:w-6 ${module.enabled ? 'text-[#1ABC9C]' : 'text-gray-400'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-[#1F2937] text-sm md:text-base leading-tight">{module.name}</h4>
                            <p className="text-xs md:text-sm text-[#6B7280] truncate">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-2">
                          <span className={`font-bold text-sm md:text-base whitespace-nowrap ${module.enabled ? 'text-[#1ABC9C]' : 'text-[#6B7280]'}`}>
                            +{module.price.toLocaleString()} DT
                          </span>
                          <Switch
                            checked={module.enabled}
                            onCheckedChange={() => toggleModule(module.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Récapitulatif */}
            {currentStep === 3 && (
              <div className="py-2 md:py-4">
                <div className="text-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-[#1F2937] mb-2">
                    Votre configuration
                  </h3>
                </div>
                
                <div className="bg-[#F5F7FA] rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                  <div className="space-y-3 md:space-y-4">
                    {/* Bilan carbone - toujours inclus */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Building2 className="h-4 w-4 md:h-5 md:w-5 text-[#1ABC9C]" />
                        <span className="text-[#1F2937] text-sm md:text-base">Bilan carbone organisationnel</span>
                      </div>
                      <span className="font-bold text-[#1F2937] text-sm md:text-base">{basePrice.toLocaleString()} DT</span>
                    </div>
                    
                    {/* Sites supplémentaires - si > 2 sites */}
                    {extraSites > 0 && (
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-2 md:gap-3">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-[#1ABC9C]" />
                          <span className="text-[#1F2937] text-sm md:text-base">{extraSites} site{extraSites > 1 ? 's' : ''} supp.</span>
                        </div>
                        <span className="font-bold text-[#1F2937] text-sm md:text-base">+{sitesPrice.toLocaleString()} DT</span>
                      </div>
                    )}

                    {/* Entités supplémentaires */}
                    {entitiesPrice > 0 && (
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-[#1ABC9C]" />
                          <span className="text-[#1F2937] text-sm md:text-base">{qualification.entities - 1} entité{qualification.entities > 2 ? 's' : ''} supp.</span>
                        </div>
                        <span className="font-bold text-[#1F2937] text-sm md:text-base">+{entitiesPrice.toLocaleString()} DT</span>
                      </div>
                    )}
                    
                    {/* Modules sélectionnés */}
                    {modules.filter(m => m.enabled).map((module) => {
                      const Icon = module.icon;
                      return (
                        <div key={module.id} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <Icon className="h-4 w-4 md:h-5 md:w-5 text-[#1ABC9C] flex-shrink-0" />
                            <span className="text-[#1F2937] text-sm md:text-base truncate">{module.name}</span>
                          </div>
                          <span className="font-bold text-[#1F2937] text-sm md:text-base flex-shrink-0 ml-2">+{module.price.toLocaleString()} DT</span>
                        </div>
                      );
                    })}

                    {/* Message si aucun module sélectionné */}
                    {modules.filter(m => m.enabled).length === 0 && (
                      <div className="text-center text-sm text-[#6B7280] py-2">
                        Aucun module complémentaire sélectionné
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-[#0F172A] rounded-xl p-4 md:p-6 text-center mb-4">
                  <p className="text-[#94A3B8] text-xs md:text-sm mb-1 md:mb-2">Total annuel HT</p>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1 md:mb-2">
                    {totalPrice.toLocaleString()} DT
                    <span className="text-sm md:text-lg font-normal text-[#94A3B8]"> HT / an</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-[#64748B]">
                    Accès plateforme 12 mois – Méthodologie conforme ISO / GHG Protocol
                  </p>
                  {!eligible && (
                    <p className="mt-2 text-[10px] md:text-xs text-[#FBBF24]">
                      Votre organisation dépasse les critères standards : si vous avez plus de besoins, contactez-nous.
                    </p>
                  )}
                </div>

                {/* Message besoins spécifiques */}
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MessageCircle className="h-4 w-4 text-[#3B82F6]" />
                    <span className="text-sm font-medium text-[#1E40AF]">
                      {eligible ? 'Besoin d\'une configuration personnalisée ?' : 'Des questions ?'}
                    </span>
                  </div>
                  <p className="text-xs text-[#3B82F6] mb-3">
                    Multi-sites, accompagnement dédié, intégration SI...
                  </p>
                  <Button
                    variant="ghost"
                    onClick={handleContact}
                    className="text-[#3B82F6] hover:text-[#1E40AF] hover:bg-[#DBEAFE] text-sm h-8"
                  >
                    Contactez-nous
                  </Button>
                </div>
              </div>
            )}

            {/* Desktop Navigation */}
            <div className="hidden md:flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="text-[#6B7280] hover:text-[#1F2937]"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              {/* Prix estimé */}
              {currentStep > 1 && (
                <div className="text-center">
                  <p className="text-xs text-[#6B7280]">Total estimé</p>
                  <p className="text-lg font-bold text-[#1ABC9C]">{totalPrice.toLocaleString()} DT HT / an</p>
                </div>
              )}

              {currentStep < STEPS.length ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 && !canProceedFromStep1}
                  className="bg-[#1ABC9C] hover:bg-[#159A80] text-white disabled:opacity-50"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCheckout}
                  className="bg-[#1ABC9C] hover:bg-[#159A80] text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Passer au paiement
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Sticky Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 md:hidden z-30 safe-area-bottom">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="flex-1 h-12 text-[#6B7280] border-gray-300"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          )}
          
          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={currentStep === 1 && !canProceedFromStep1}
              className={`h-12 bg-[#1ABC9C] hover:bg-[#159A80] text-white font-semibold disabled:opacity-50 ${currentStep === 1 ? 'w-full' : 'flex-1'}`}
            >
              Continuer
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCheckout}
              className="w-full h-12 bg-[#1ABC9C] hover:bg-[#159A80] text-white font-semibold"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Passer au paiement
            </Button>
          )}
        </div>
      </div>
    </section>
  );
});

PricingConfigurator.displayName = 'PricingConfigurator';
