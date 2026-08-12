/**
 * SAISIE DES DONNÉES SCOPE 3
 * 
 * Formulaire de saisie générique pour toutes les sous-catégories Scope 3
 * Structure selon les 15 catégories GHG Protocol
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Save, Loader2, Info, Settings, ShoppingCart, Wrench, Zap, Truck, Trash2, Plane, Home as HomeIcon, Building2, Package, Factory, Power, Recycle, KeyRound, Store, TrendingUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { 
  GHG_SCOPE3_CATEGORIES, 
  getUpstreamCategories, 
  getDownstreamCategories,
  type Scope3CategoryId 
} from '@/lib/scope3/ghg-protocol-categories';
import { 
  SCOPE3_SUBCATEGORIES_BY_CATEGORY,
  getAllSubcategories,
  type Scope3Subcategory 
} from '@/lib/scope3/subcategories';
import { Scope3ActivationService } from '@/lib/scope3/activation-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganizationSubcategories } from '@/hooks/useOrganizationSubcategories';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { CustomSubcategoryDialog } from './CustomSubcategoryDialog';
import { EmissionFactorSelector } from './EmissionFactorSelector';

/** Option "Mode de transport (enquête)" – champs spécifiques domicile–travail */
const COMMUTING_SITES = [
  { value: 'la_goulette', label: 'La Goulette' },
  { value: 'charguia', label: 'Charguia' },
  { value: 'autre', label: 'Autre' },
] as const;

/** Mode de transport et facteur d'émission par défaut (kgCO₂e/km) – modifiable manuellement */
const COMMUTING_MODES = [
  { value: 'voiture_individuelle', label: 'Voiture individuelle', feKgKm: 0.19 },
  { value: 'covoiturage', label: 'Covoiturage', feKgKm: 0.19 },
  { value: 'taxi', label: 'Taxi', feKgKm: 0.2 },
  { value: 'transports_commun', label: 'Transports en commun (bus, taxi collectif)', feKgKm: 0.1 },
  { value: 'deux_roues_motorise', label: 'Deux-roues motorisé', feKgKm: 0.08 },
  { value: 'mobilite_douce', label: 'Mobilité douce (à pied / vélo)', feKgKm: 0 },
] as const;

const COMMUTING_METHODOLOGY_PLACEHOLDER =
  "Distance annuelle estimée des déplacements domicile–travail, issue d'une enquête interne et ventilée par site et par mode de transport.";

interface Scope3DataEntryProps {
  onSuccess?: () => void;
}

export const Scope3DataEntry: React.FC<Scope3DataEntryProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { organizationId, referenceYear } = useOrganizationData();
  const { sites: orgSites = [] } = useOrganizationSites(organizationId ?? undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasMultipleSites = orgSites.length > 1;

  // Fonction pour obtenir l'icône et la couleur par catégorie
  const getCategoryStyle = (categoryId: string) => {
    const styles: Record<string, { icon: any; bgColor: string; iconColor: string }> = {
      'cat1_purchased_goods': { icon: ShoppingCart, bgColor: 'bg-blue-500', iconColor: 'text-white' },
      'cat2_capital_goods': { icon: Wrench, bgColor: 'bg-purple-500', iconColor: 'text-white' },
      'cat3_fuel_energy': { icon: Zap, bgColor: 'bg-yellow-500', iconColor: 'text-white' },
      'cat4_upstream_transport': { icon: Truck, bgColor: 'bg-orange-500', iconColor: 'text-white' },
      'cat5_waste': { icon: Trash2, bgColor: 'bg-red-500', iconColor: 'text-white' },
      'cat6_business_travel': { icon: Plane, bgColor: 'bg-sky-500', iconColor: 'text-white' },
      'cat7_commuting': { icon: HomeIcon, bgColor: 'bg-green-500', iconColor: 'text-white' },
      'cat8_upstream_leased': { icon: Building2, bgColor: 'bg-indigo-500', iconColor: 'text-white' },
      'cat9_downstream_transport': { icon: Package, bgColor: 'bg-amber-500', iconColor: 'text-white' },
      'cat10_processing': { icon: Factory, bgColor: 'bg-cyan-500', iconColor: 'text-white' },
      'cat11_use_of_products': { icon: Power, bgColor: 'bg-pink-500', iconColor: 'text-white' },
      'cat12_end_of_life': { icon: Recycle, bgColor: 'bg-emerald-500', iconColor: 'text-white' },
      'cat13_downstream_leased': { icon: KeyRound, bgColor: 'bg-violet-500', iconColor: 'text-white' },
      'cat14_franchises': { icon: Store, bgColor: 'bg-rose-500', iconColor: 'text-white' },
      'cat15_investments': { icon: TrendingUp, bgColor: 'bg-teal-500', iconColor: 'text-white' },
    };
    return styles[categoryId] || { icon: Settings, bgColor: 'bg-gray-500', iconColor: 'text-white' };
  };

  const [selectedCategory, setSelectedCategory] = useState<Scope3CategoryId | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [activeCategories, setActiveCategories] = useState<Set<Scope3CategoryId>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  // Hook pour les sous-catégories personnalisées
  const { customSubcategoriesAsScope3, isLoading: loadingCustom } = useOrganizationSubcategories(selectedCategory || undefined);

  const [formData, setFormData] = useState({
    quantity: '',
    unit: '',
    description: '',
    period_start: `${referenceYear}-01-01`,
    period_end: `${referenceYear}-12-31`,
    data_quality: 'estimated' as 'real' | 'estimated' | 'default',
  });
  
  // Facteur d'émission sélectionné (optionnel) - on stocke le slug
  const [selectedEmissionFactorSlug, setSelectedEmissionFactorSlug] = useState<string | null>(null);
  const [manualEmissionFactor, setManualEmissionFactor] = useState<number | null>(null);

  // Site (organisation) – sélecteur global Scope 3 quand l'org a plusieurs sites
  const [selectedScope3SiteId, setSelectedScope3SiteId] = useState<string>('');

  // Champs spécifiques "Mode de transport (enquête)" – domicile–travail
  const [commutingSite, setCommutingSite] = useState<string>('');
  const [commutingMode, setCommutingMode] = useState<string>('');

  const isCommutingSurvey = selectedSubcategory === 'cat7_transport_mode';

  // Charger les catégories actives
  useEffect(() => {
    if (!organizationId) return;

    const loadActivations = async () => {
      try {
        const activationMap = await Scope3ActivationService.getActivationStatus(organizationId);
        const activeSet = new Set<Scope3CategoryId>();
        
        activationMap.forEach((activation, categoryId) => {
          if (activation.is_active) {
            activeSet.add(categoryId);
          }
        });
        
        setActiveCategories(activeSet);
        
        // Sélectionner automatiquement la première catégorie active
        const firstActive = Array.from(activeSet)[0];
        if (firstActive) {
          setSelectedCategory(firstActive);
        }
      } catch (error) {
        console.error('Error loading active categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivations();
  }, [organizationId]);

  // Mettre à jour l'unité par défaut quand on change de sous-catégorie
  useEffect(() => {
    if (selectedSubcategory) {
      const allSubcats = [...getAllSubcategories(), ...customSubcategoriesAsScope3];
      const subcategory = allSubcats.find(s => s.value === selectedSubcategory);
      if (subcategory) {
        const unit = subcategory.value === 'cat7_transport_mode' ? 'km/an' : subcategory.defaultUnit;
        setFormData(prev => ({ ...prev, unit }));
      }
      if (selectedSubcategory !== 'cat7_transport_mode') {
        setCommutingSite('');
        setCommutingMode('');
      }
    }
  }, [selectedSubcategory, customSubcategoriesAsScope3]);

  // Facteur d'émission par défaut selon le mode de transport (domicile–travail)
  useEffect(() => {
    if (!isCommutingSurvey || !commutingMode) return;
    const mode = COMMUTING_MODES.find(m => m.value === commutingMode);
    if (mode) {
      setManualEmissionFactor(mode.feKgKm);
      setSelectedEmissionFactorSlug(null);
    }
  }, [isCommutingSurvey, commutingMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !organizationId || !selectedCategory || !selectedSubcategory) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une catégorie et une sous-catégorie',
        variant: 'destructive',
      });
      return;
    }

    if (selectedSubcategory === 'cat7_transport_mode') {
      if (!commutingSite || !commutingMode) {
        toast({
          title: 'Champs obligatoires',
          description: 'Veuillez sélectionner le Site et le Mode de transport',
          variant: 'destructive',
        });
        return;
      }
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une quantité valide',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const category = GHG_SCOPE3_CATEGORIES.find(c => c.id === selectedCategory);
      const scope3Type = category?.scope3Type === 'upstream' ? 'scope3_upstream' : 'scope3_downstream';

      let notes: string | undefined = formData.description || undefined;
      if (selectedSubcategory === 'cat7_transport_mode') {
        const siteLabel = COMMUTING_SITES.find(s => s.value === commutingSite)?.label ?? commutingSite;
        const modeLabel = COMMUTING_MODES.find(m => m.value === commutingMode)?.label ?? commutingMode;
        const fe = manualEmissionFactor ?? COMMUTING_MODES.find(m => m.value === commutingMode)?.feKgKm ?? 0.19;
        notes = [`Site: ${siteLabel}`, `Mode: ${modeLabel}`, `FE_kg_km: ${fe}`].join(' | ');
        if (formData.description?.trim()) {
          notes += `\n${formData.description.trim()}`;
        }
      }

      await ActivityDataService.create({
        organization_id: organizationId,
        site_id: selectedScope3SiteId || undefined,
        activity_type: 'service',
        category: scope3Type as any,
        subcategory: `${selectedCategory}:${selectedSubcategory || 'general'}`,
        quantity,
        unit: formData.unit,
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: formData.data_quality as any,
        notes,
        scope_hint: 3,
      });

      toast({
        title: 'Donnée enregistrée ✓',
        description: `Les données Scope 3 ont été ajoutées avec succès`,
      });

      // Réinitialiser le formulaire
      setFormData({
        quantity: '',
        unit: formData.unit,
        description: '',
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: 'estimated',
      });
      setSelectedSubcategory('');
      setSelectedEmissionFactorSlug(null);
      setManualEmissionFactor(null);
      setSelectedScope3SiteId('');
      setCommutingSite('');
      setCommutingMode('');

      // Rafraîchir les données et le dashboard
      queryClient.invalidateQueries({ queryKey: ['activity-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      window.dispatchEvent(new Event('activityDataUpdated'));

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving Scope 3 data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les données',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (activeCategories.size === 0) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            <div className="rounded-full bg-primary/10 p-3">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Configuration requise</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Aucune catégorie Scope 3 n'est activée.<br />
                Veuillez d'abord activer les catégories GHG Protocol applicables à votre activité.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/app/collecte/config-scope3')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurer Scope 3
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const upstreamActive = getUpstreamCategories().filter(c => activeCategories.has(c.id));
  const downstreamActive = getDownstreamCategories().filter(c => activeCategories.has(c.id));

  const selectedCategoryData = GHG_SCOPE3_CATEGORIES.find(c => c.id === selectedCategory);
  const standardSubcategories = selectedCategory 
    ? SCOPE3_SUBCATEGORIES_BY_CATEGORY[selectedCategory] || []
    : [];
  
  // Combiner les sous-catégories standard et personnalisées
  const availableSubcategories = [...standardSubcategories, ...customSubcategoriesAsScope3];

  // Chercher la sous-catégorie sélectionnée dans toutes les sources
  const selectedSubcategoryData = availableSubcategories.find(s => s.value === selectedSubcategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Saisie des données Scope 3</h3>
          <p className="text-sm text-muted-foreground">
            Saisissez vos données selon les catégories GHG Protocol activées
          </p>
        </div>
        <Button 
          size="sm"
          onClick={() => navigate('/app/collecte/config-scope3')}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Settings className="h-4 w-4" />
          Configurer Catégories Scope 3
        </Button>
      </div>

      {/* Liste des catégories activées */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">
            Catégories activées ({upstreamActive.length + downstreamActive.length})
          </h4>
          <span className="text-xs text-muted-foreground italic">
            15 catégories selon GHG Protocol
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
          {/* Tri par numéro de catégorie GHG Protocol (1-15) */}
          {[...upstreamActive, ...downstreamActive]
            .sort((a, b) => a.number - b.number)
            .map(cat => {
              const { icon: Icon, bgColor, iconColor } = getCategoryStyle(cat.id);
              const isSelected = selectedCategory === cat.id;
              
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('');
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  {/* Cercle avec icône */}
                  <div className="relative">
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center transition-all
                      ${bgColor} ${iconColor}
                      ${isSelected ? 'ring-4 ring-primary shadow-lg scale-110' : 'hover:scale-105 hover:shadow-md'}
                    `}>
                      <Icon className="w-8 h-8" />
                    </div>
                    {/* Numéro de catégorie discret */}
                    <span className={`
                      absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-medium
                      flex items-center justify-center border-2 border-background
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    `}>
                      {cat.number}
                    </span>
                  </div>
                  
                  {/* Titre en dessous */}
                  <p className={`
                    text-xs text-center line-clamp-2 max-w-[80px]
                    ${isSelected ? 'font-semibold text-primary' : 'text-muted-foreground group-hover:text-foreground'}
                  `}>
                    {cat.name}
                  </p>
                  
                  {/* Badge Auto si applicable */}
                  {cat.isAutoCalculated && (
                    <Badge variant="secondary" className="text-xs">
                      Auto
                    </Badge>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Formulaire de saisie */}
      {selectedCategory && availableSubcategories.length > 0 && (
        <Card className="border-2 shadow-md">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{selectedCategoryData?.number}</span>
              </div>
              <div>
                <CardTitle className="text-lg text-primary">
                  {selectedCategoryData?.name}
                </CardTitle>
                <CardDescription className="text-sm">{selectedCategoryData?.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 bg-slate-50/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sélecteur de site (affiché quand l'organisation a plusieurs sites) */}
              {hasMultipleSites && (
                <div className="bg-white rounded-lg border p-4 shadow-sm border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-slate-700">Site</h3>
                    <span className="text-xs text-muted-foreground">(optionnel)</span>
                  </div>
                  <Select value={selectedScope3SiteId || '_none'} onValueChange={(v) => setSelectedScope3SiteId(v === '_none' ? '' : v)}>
                    <SelectTrigger className="bg-white border-slate-300 focus:border-primary max-w-sm">
                      <SelectValue placeholder="Tous les sites / non spécifié" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Tous les sites / non spécifié</SelectItem>
                      {orgSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Section 1: Type d'activité */}
              <div className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">1</span>
                  </div>
                  <h3 className="font-semibold text-slate-700">Type d'activité</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subcategory" className="text-sm font-medium text-slate-600">
                      Sélectionnez le type d'activité *
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 border-dashed"
                      onClick={() => setShowCustomDialog(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter un produit
                    </Button>
                  </div>
                  <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                    <SelectTrigger className="bg-white border-slate-300 focus:border-primary">
                      <SelectValue placeholder="Sélectionner un type d'activité" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Sous-catégories standard */}
                      {standardSubcategories.map(sub => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                          {sub.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({sub.description})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                      
                      {/* Séparateur si des sous-catégories personnalisées existent */}
                      {customSubcategoriesAsScope3.length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                            Produits personnalisés
                          </div>
                        </>
                      )}
                      
                      {/* Sous-catégories personnalisées */}
                      {customSubcategoriesAsScope3.map(sub => (
                        <SelectItem key={sub.value} value={sub.value}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1">Perso</Badge>
                            {sub.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSubcategoryData && (
                <>
                  {/* Champs obligatoires Site + Mode (uniquement pour "Mode de transport (enquête)") */}
                  {isCommutingSurvey && (
                    <div className="bg-white rounded-lg border p-4 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-600">1b</span>
                        </div>
                        <h3 className="font-semibold text-slate-700">Site et mode de transport</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-600">Site *</Label>
                          <Select value={commutingSite} onValueChange={setCommutingSite} required>
                            <SelectTrigger className="bg-white border-slate-300 focus:border-primary">
                              <SelectValue placeholder="Sélectionner un site" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMUTING_SITES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-600">Mode de transport *</Label>
                          <Select value={commutingMode} onValueChange={setCommutingMode} required>
                            <SelectTrigger className="bg-white border-slate-300 focus:border-primary">
                              <SelectValue placeholder="Sélectionner un mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMUTING_MODES.map(m => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                  <span className="text-xs text-muted-foreground ml-2">({m.feKgKm} kgCO₂e/km)</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Quantité et Unité */}
                  <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">2</span>
                      </div>
                      <h3 className="font-semibold text-slate-700">Quantité</h3>
                      {isCommutingSurvey && (
                        <span className="text-xs text-muted-foreground ml-2">(km/an estimés)</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm font-medium text-slate-600">
                          Quantité *
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          step="any"
                          placeholder={isCommutingSurvey ? 'Ex: 15000' : 'Ex: 1000'}
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                          required
                          className="bg-white border-slate-300 focus:border-primary text-lg font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm font-medium text-slate-600">
                          Unité
                        </Label>
                        <Select
                          value={formData.unit}
                          onValueChange={(value) => !isCommutingSurvey && setFormData(prev => ({ ...prev, unit: value }))}
                          disabled={isCommutingSurvey}
                        >
                          <SelectTrigger className="bg-white border-slate-300 focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={isCommutingSurvey ? 'km/an' : selectedSubcategoryData.defaultUnit}>
                              {isCommutingSurvey ? 'km/an' : selectedSubcategoryData.defaultUnit}
                            </SelectItem>
                            {!isCommutingSurvey && selectedSubcategoryData.alternativeUnits?.map(unit => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isCommutingSurvey && (
                          <p className="text-xs text-muted-foreground">Unité fixée à km/an pour cette activité.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Facteur d'émission */}
                  <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-amber-600">3</span>
                      </div>
                      <h3 className="font-semibold text-slate-700">Facteur d'émission</h3>
                      <Badge variant="outline" className="text-[10px] ml-auto">Optionnel</Badge>
                    </div>
                    <EmissionFactorSelector
                      value={selectedEmissionFactorSlug || undefined}
                      onChange={(slug, _factor) => {
                        setSelectedEmissionFactorSlug(slug);
                        if (slug) {
                          setManualEmissionFactor(null);
                        }
                      }}
                      onManualFactorChange={(value) => {
                        setManualEmissionFactor(value);
                        if (value) {
                          setSelectedEmissionFactorSlug(null);
                        }
                      }}
                      manualFactorValue={manualEmissionFactor}
                      suggestedCategory={selectedSubcategoryData?.categoryId}
                      subcategorySlug={selectedSubcategory}
                      unit={formData.unit}
                    />
                  </div>

                  {/* Section 4: Informations complémentaires (repliable) */}
                  <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600">4</span>
                      </div>
                      <h3 className="font-semibold text-slate-700">Détails</h3>
                      <Badge variant="outline" className="text-[10px] ml-auto">Optionnel</Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Qualité des données */}
                      <div className="space-y-2">
                        <Label htmlFor="data_quality" className="text-sm font-medium text-slate-600">
                          Qualité des données
                        </Label>
                        <Select 
                          value={formData.data_quality} 
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, data_quality: value }))}
                        >
                          <SelectTrigger className="bg-white border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="real">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Mesurée (donnée réelle)
                              </span>
                            </SelectItem>
                            <SelectItem value="estimated">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Estimée
                              </span>
                            </SelectItem>
                            <SelectItem value="default">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                Par défaut / Non disponible
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Période */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="period_start" className="text-sm font-medium text-slate-600">
                            Début de période
                          </Label>
                          <Input
                            id="period_start"
                            type="date"
                            value={formData.period_start}
                            onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                            className="bg-white border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="period_end" className="text-sm font-medium text-slate-600">
                            Fin de période
                          </Label>
                          <Input
                            id="period_end"
                            type="date"
                            value={formData.period_end}
                            onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                            className="bg-white border-slate-300"
                          />
                        </div>
                      </div>

                      {/* Description / Commentaire méthodologique */}
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-slate-600">
                          {isCommutingSurvey ? 'Commentaire méthodologique' : 'Description'}
                        </Label>
                        <Textarea
                          id="description"
                          placeholder={isCommutingSurvey ? COMMUTING_METHODOLOGY_PLACEHOLDER : 'Précisions sur la donnée (source, méthode de calcul, hypothèses...)'}
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={isCommutingSurvey ? 3 : 2}
                          className="bg-white border-slate-300 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedSubcategory('');
                        setSelectedEmissionFactorSlug(null);
                        setManualEmissionFactor(null);
                        setSelectedScope3SiteId('');
                        setCommutingSite('');
                        setCommutingMode('');
                        setFormData({
                          quantity: '',
                          unit: '',
                          description: '',
                          period_start: `${referenceYear}-01-01`,
                          period_end: `${referenceYear}-12-31`,
                          data_quality: 'estimated',
                        });
                      }}
                      className="flex-1 h-12 text-base font-medium"
                    >
                      <X className="mr-2 h-5 w-5" />
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="flex-1 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {selectedCategory && availableSubcategories.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            La catégorie "{selectedCategoryData?.name}" se calcule automatiquement. 
            Aucune saisie manuelle n'est requise.
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog pour ajouter un produit personnalisé */}
      {selectedCategory && selectedCategoryData && (
        <CustomSubcategoryDialog
          open={showCustomDialog}
          onOpenChange={setShowCustomDialog}
          categoryId={selectedCategory}
          categoryName={selectedCategoryData.name}
          onCreated={(value) => {
            setSelectedSubcategory(value);
          }}
        />
      )}
    </div>
  );
};
