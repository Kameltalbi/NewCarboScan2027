// Section Facteurs d'Émission personnalisés par organisation
// L'utilisateur saisit ses propres FE - si non saisis, le système utilise les FE par défaut (confidentiels)

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Leaf, 
  Plus,
  Pencil, 
  Trash2, 
  Search, 
  Info,
  Loader2,
  Factory,
  Zap,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useAuth } from '@/hooks/useAuth';
import { GHG_SCOPE3_CATEGORIES } from '@/lib/scope3/ghg-protocol-categories';
import { getAllSubcategories } from '@/lib/scope3/subcategories';
import { invalidateEmissionFactorCache } from '@/lib/calculators/BilanCarboneCalculator';

interface CustomEmissionFactor {
  id: string;
  organization_id: string;
  factor_name: string;
  emission_value: number;
  unit: string;
  scope: number;
  category: string;
  source: string | null;
  notes: string | null;
  subcategory_key: string | null; // Clé de mapping avec activity_data.subcategory
  created_at: string;
  updated_at: string;
}

// Catégories prédéfinies par scope
const SCOPE_CATEGORIES: Record<number, { value: string; label: string }[]> = {
  1: [
    { value: 'gaz_naturel', label: 'Gaz naturel' },
    { value: 'fioul', label: 'Fioul domestique' },
    { value: 'diesel', label: 'Diesel / Gazole' },
    { value: 'essence', label: 'Essence' },
    { value: 'propane', label: 'Propane / GPL' },
    { value: 'charbon', label: 'Charbon' },
    { value: 'biomasse', label: 'Biomasse' },
    { value: 'refrigerants', label: 'Fluides frigorigènes' },
    { value: 'vehicules_entreprise', label: 'Véhicules de l\'entreprise' },
    { value: 'autres_scope1', label: 'Autres émissions directes' },
  ],
  2: [
    { value: 'electricite', label: 'Électricité' },
    { value: 'electricite_verte', label: 'Électricité verte / renouvelable' },
    { value: 'chaleur_reseau', label: 'Chaleur réseau' },
    { value: 'vapeur', label: 'Vapeur' },
    { value: 'froid_reseau', label: 'Froid réseau' },
  ],
  // Scope 3 - Les 15 catégories GHG Protocol officielles
  3: GHG_SCOPE3_CATEGORIES.map(cat => ({
    value: cat.id,
    label: `${cat.number}. ${cat.name}`,
  })),
};

const UNITS = [
  { value: 'kgCO2e/kWh', label: 'kgCO2e/kWh' },
  { value: 'kgCO2e/MWh', label: 'kgCO2e/MWh' },
  { value: 'kgCO2e/L', label: 'kgCO2e/L' },
  { value: 'kgCO2e/m³', label: 'kgCO2e/m³' },
  { value: 'kgCO2e/kg', label: 'kgCO2e/kg' },
  { value: 'kgCO2e/t', label: 'kgCO2e/t' },
  { value: 'kgCO2e/km', label: 'kgCO2e/km' },
  { value: 'kgCO2e/passager.km', label: 'kgCO2e/passager.km' },
  { value: 'kgCO2e/t.km', label: 'kgCO2e/t.km' },
  { value: 'kgCO2e/€', label: 'kgCO2e/€' },
  { value: 'kgCO2e/unité', label: 'kgCO2e/unité' },
  { value: 'tCO2e/unité', label: 'tCO2e/unité' },
];

// Unité par défaut en fonction de la catégorie
const DEFAULT_UNIT_BY_CATEGORY: Record<string, string> = {
  // Scope 1 - Combustibles liquides (L)
  essence: 'kgCO2e/L',
  diesel: 'kgCO2e/L',
  fioul: 'kgCO2e/L',
  propane: 'kgCO2e/L',
  vehicules_entreprise: 'kgCO2e/L',
  
  // Scope 1 - Combustibles gazeux (m³)
  gaz_naturel: 'kgCO2e/m³',
  
  // Scope 1 - Solides (kg ou t)
  charbon: 'kgCO2e/kg',
  biomasse: 'kgCO2e/kg',
  refrigerants: 'kgCO2e/kg',
  autres_scope1: 'kgCO2e/kg',
  
  // Scope 2 - Électricité (kWh)
  electricite: 'kgCO2e/kWh',
  electricite_verte: 'kgCO2e/kWh',
  chaleur_reseau: 'kgCO2e/kWh',
  vapeur: 'kgCO2e/kWh',
  froid_reseau: 'kgCO2e/kWh',
  
  // Scope 3 - Les 15 catégories GHG Protocol
  cat1_purchased_goods: 'kgCO2e/t',
  cat2_capital_goods: 'kgCO2e/€',
  cat3_fuel_energy: 'kgCO2e/kWh',
  cat4_upstream_transport: 'kgCO2e/t.km',
  cat5_waste: 'kgCO2e/t',
  cat6_business_travel: 'kgCO2e/km',
  cat7_commuting: 'kgCO2e/km',
  cat8_upstream_leased: 'kgCO2e/€',
  cat9_downstream_transport: 'kgCO2e/t.km',
  cat10_processing: 'kgCO2e/t',
  cat11_use_of_products: 'kgCO2e/unité',
  cat12_end_of_life: 'kgCO2e/t',
  cat13_downstream_leased: 'kgCO2e/€',
  cat14_franchises: 'kgCO2e/€',
  cat15_investments: 'kgCO2e/€',
};

const getDefaultUnitForCategory = (category: string): string => {
  return DEFAULT_UNIT_BY_CATEGORY[category] || 'kgCO2e/kWh';
};

const getScopeIcon = (scope: number) => {
  switch (scope) {
    case 1: return <Factory className="h-4 w-4" />;
    case 2: return <Zap className="h-4 w-4" />;
    case 3: return <Truck className="h-4 w-4" />;
    default: return null;
  }
};

const getScopeColor = (scope: number) => {
  switch (scope) {
    case 1: return "bg-red-100 text-red-700 border-red-200";
    case 2: return "bg-amber-100 text-amber-700 border-amber-200";
    case 3: return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "";
  }
};

const getCategoryLabel = (scope: number, category: string): string => {
  const cat = SCOPE_CATEGORIES[scope]?.find(c => c.value === category);
  return cat?.label || category;
};

export const ParametresSources: React.FC = () => {
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganizationData();
  const queryClient = useQueryClient();

  const [customFactors, setCustomFactors] = useState<CustomEmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeScope, setActiveScope] = useState('1');
  
  // State pour les subcategories existantes (depuis activity_data)
  const [existingSubcategories, setExistingSubcategories] = useState<{value: string; label: string; scope: number}[]>([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<CustomEmissionFactor | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    scope: '1', // Scope sélectionné dans le modal
    factor_name: '',
    emission_value: '',
    unit: 'kgCO2e/kWh',
    category: '',
    source: '',
    notes: '',
    subcategory_key: '', // Clé de mapping avec activity_data
  });

  // Charger les subcategories existantes depuis activity_data ET organization_scope3_subcategories
  useEffect(() => {
    const loadExistingSubcategories = async () => {
      if (!organizationId) return;
      
      try {
        // Charger les sous-catégories personnalisées avec leurs vrais noms
        const { data: customSubcats, error: customError } = await supabase
          .from('organization_scope3_subcategories')
          .select('value, label, scope3_category_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);
        
        if (customError) console.error('Erreur chargement custom subcats:', customError);
        
        // Créer un mapping value -> label depuis les sous-catégories personnalisées
        const customLabelsMap = new Map<string, string>();
        (customSubcats || []).forEach((item: any) => {
          if (item.value && item.label) {
            customLabelsMap.set(item.value, item.label);
          }
        });
        
        // Charger les subcategories depuis activity_data
        const { data, error } = await supabase
          .from('activity_data')
          .select('subcategory, scope_hint')
          .eq('organization_id', organizationId)
          .not('subcategory', 'is', null);
        
        if (error) throw error;
        
        // Extraire les subcategories uniques depuis activity_data
        const uniqueSubcats = new Map<string, {value: string; label: string; scope: number}>();
        (data || []).forEach((item: any) => {
          if (!item.subcategory) return;
          
          const rawSubcat = item.subcategory;
          const parts = rawSubcat.split(':');
          const key = parts.length > 1 ? parts[1] : parts[0];
          
          let displayLabel = customLabelsMap.get(key);
          if (!displayLabel) {
            displayLabel = key
              .replace(/custom_cat\d+_[a-z_]+_\d+/i, 'Personnalisé')
              .replace(/cat\d+_/gi, '')
              .replace(/_/g, ' ')
              .replace(/^\w/, (c: string) => c.toUpperCase());
          }
          
          if (!uniqueSubcats.has(key)) {
            uniqueSubcats.set(key, {
              value: key,
              label: displayLabel,
              scope: item.scope_hint || 3,
            });
          }
        });
        
        // Ajouter les sous-catégories personnalisées (même sans donnée encore) pour Scope 3
        (customSubcats || []).forEach((item: any) => {
          if (item.value && item.label && !uniqueSubcats.has(item.value)) {
            uniqueSubcats.set(item.value, {
              value: item.value,
              label: `${item.label} (${item.value})`,
              scope: 3,
            });
          }
        });
        
        setExistingSubcategories(Array.from(uniqueSubcats.values()));
      } catch (error) {
        console.error('Erreur chargement subcategories:', error);
      }
    };
    
    loadExistingSubcategories();
  }, [organizationId]);

  // Charger les facteurs personnalisés de l'organisation
  useEffect(() => {
    const loadCustomFactors = async () => {
      // Si pas d'organization après le chargement, arrêter le loading
      if (!organizationId) {
        if (!orgLoading) {
          setLoading(false);
        }
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('organization_emission_factors')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Mapper les données vers notre interface
        const mappedFactors: CustomEmissionFactor[] = (data || []).map((item: any) => ({
          id: item.id,
          organization_id: item.organization_id,
          factor_name: item.custom_source || 'Facteur personnalisé',
          emission_value: item.custom_value,
          unit: item.custom_unit || 'kgCO2e/kWh',
          scope: extractScopeFromNotes(item.notes) || 1,
          category: extractCategoryFromNotes(item.notes) || 'autres',
          source: item.custom_source,
          notes: item.notes,
          subcategory_key: item.subcategory_key || null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        
        setCustomFactors(mappedFactors);
      } catch (error) {
        console.error('Erreur chargement FE personnalisés:', error);
        toast.error('Erreur lors du chargement des facteurs personnalisés');
      } finally {
        setLoading(false);
      }
    };
    
    loadCustomFactors();
  }, [organizationId, orgLoading]);

  // Extraire le scope depuis les notes (format: "scope:X|category:Y|...")
  const extractScopeFromNotes = (notes: string | null): number => {
    if (!notes) return 1;
    const match = notes.match(/scope:(\d)/);
    return match ? parseInt(match[1]) : 1;
  };

  // Extraire la catégorie depuis les notes
  const extractCategoryFromNotes = (notes: string | null): string => {
    if (!notes) return 'autres';
    const match = notes.match(/category:([^|]+)/);
    return match ? match[1] : 'autres';
  };

  // Construire les notes avec métadonnées
  const buildNotesWithMetadata = (scope: number, category: string, userNotes: string): string => {
    return `scope:${scope}|category:${category}|${userNotes}`;
  };

  // Extraire les notes utilisateur (sans métadonnées)
  const extractUserNotes = (notes: string | null): string => {
    if (!notes) return '';
    const parts = notes.split('|');
    return parts.length > 2 ? parts.slice(2).join('|') : notes;
  };

  // Filtrer par scope et recherche
  const filteredFactors = customFactors.filter(factor => {
    if (factor.scope.toString() !== activeScope) return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        factor.factor_name.toLowerCase().includes(search) ||
        factor.category.toLowerCase().includes(search) ||
        (factor.source?.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Stats par scope
  const scopeStats = {
    1: customFactors.filter(f => f.scope === 1).length,
    2: customFactors.filter(f => f.scope === 2).length,
    3: customFactors.filter(f => f.scope === 3).length,
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      scope: activeScope, // Par défaut : onglet actif
      factor_name: '',
      emission_value: '',
      unit: 'kgCO2e/kWh',
      category: '',
      source: '',
      notes: '',
      subcategory_key: '',
    });
    setEditingFactor(null);
  };

  // Convertir un nom en clé (lowercase, underscores)
  const toSubcategoryKey = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer accents
      .replace(/[^a-z0-9]+/g, '_') // Remplacer caractères spéciaux par _
      .replace(/^_|_$/g, ''); // Retirer _ au début/fin
  };

  // Ouvrir le dialog pour nouveau facteur
  const openNewDialog = () => {
    resetForm();
    // Pré-sélectionner la première catégorie du scope actif avec l'unité appropriée
    const firstCategory = SCOPE_CATEGORIES[parseInt(activeScope)]?.[0]?.value || '';
    const defaultUnit = getDefaultUnitForCategory(firstCategory);
    setFormData(prev => ({ ...prev, scope: activeScope, category: firstCategory, unit: defaultUnit, subcategory_key: '' }));
    setDialogOpen(true);
  };

  // Ouvrir le dialog pour éditer
  const openEditDialog = (factor: CustomEmissionFactor) => {
    setEditingFactor(factor);
    setFormData({
      scope: factor.scope.toString(),
      factor_name: factor.factor_name,
      emission_value: factor.emission_value.toString(),
      unit: factor.unit,
      category: factor.category,
      source: factor.source || '',
      notes: extractUserNotes(factor.notes),
      subcategory_key: factor.subcategory_key || '',
    });
    setDialogOpen(true);
  };

  // Sauvegarder le facteur
  const handleSave = async () => {
    if (!organizationId || !user?.id) return;
    
    const value = parseFloat(formData.emission_value);
    if (isNaN(value) || value < 0) {
      toast.error('Veuillez saisir une valeur valide');
      return;
    }
    
    if (!formData.factor_name.trim()) {
      toast.error('Veuillez saisir un nom pour le facteur');
      return;
    }

    if (!formData.category) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    
    setSaving(true);
    const scope = parseInt(formData.scope); // Utiliser le scope du formulaire
    const notesWithMeta = buildNotesWithMetadata(scope, formData.category, formData.notes);
    
    try {
      if (editingFactor) {
        // Mise à jour
        const { error } = await supabase
          .from('organization_emission_factors')
          .update({
            custom_value: value,
            custom_unit: formData.unit,
            custom_source: formData.factor_name,
            notes: notesWithMeta,
            subcategory_key: formData.subcategory_key.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingFactor.id);
        
        if (error) throw error;
        
        // Mettre à jour localement
        setCustomFactors(prev => prev.map(cf => 
          cf.id === editingFactor.id 
            ? {
                ...cf,
                factor_name: formData.factor_name,
                emission_value: value,
                unit: formData.unit,
                category: formData.category,
                source: formData.factor_name,
                notes: notesWithMeta,
                subcategory_key: formData.subcategory_key.trim() || null,
                scope,
              }
            : cf
        ));
        
        toast.success('Facteur d\'émission mis à jour');
        // Invalider les caches pour que le dashboard recalcule au prochain affichage
        invalidateEmissionFactorCache();
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        window.dispatchEvent(new CustomEvent('emissionFactorsUpdated'));
      } else {
        // Création - on utilise base_factor_id = null car c'est un facteur créé par l'utilisateur
        const { data, error } = await supabase
          .from('organization_emission_factors')
          .insert({
            organization_id: organizationId,
            base_factor_id: null as any, // Custom factor without base
            custom_value: value,
            custom_unit: formData.unit,
            custom_source: formData.factor_name,
            notes: notesWithMeta,
            subcategory_key: formData.subcategory_key.trim() || null,
            created_by: user.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        const newFactor: CustomEmissionFactor = {
          id: data.id,
          organization_id: data.organization_id,
          factor_name: formData.factor_name,
          emission_value: value,
          unit: formData.unit,
          scope,
          category: formData.category,
          source: formData.factor_name,
          notes: notesWithMeta,
          subcategory_key: data.subcategory_key || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        
        setCustomFactors(prev => [newFactor, ...prev]);
        toast.success('Facteur d\'émission créé');
        // Invalider les caches pour que le dashboard recalcule au prochain affichage
        invalidateEmissionFactorCache();
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        window.dispatchEvent(new CustomEvent('emissionFactorsUpdated'));
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un facteur
  const handleDelete = async (factor: CustomEmissionFactor) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce facteur d\'émission ?')) return;
    
    try {
      const { error } = await supabase
        .from('organization_emission_factors')
        .delete()
        .eq('id', factor.id);
      
      if (error) throw error;
      
      setCustomFactors(prev => prev.filter(cf => cf.id !== factor.id));
      toast.success('Facteur d\'émission supprimé');
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Aucune organisation trouvée. Veuillez d'abord créer ou rejoindre une organisation.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Leaf className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Facteurs d'Émission</h1>
            <p className="text-muted-foreground">
              Définissez vos propres facteurs d'émission personnalisés
            </p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un facteur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingFactor ? 'Modifier le facteur' : 'Nouveau facteur d\'émission'}
              </DialogTitle>
              <DialogDescription>
                Sélectionnez le scope et la catégorie pour ce facteur d'émission
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Sélection du Scope */}
              <div className="grid gap-2">
                <Label>Scope *</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(value) => {
                    // Réinitialiser la catégorie et l'unité pour le nouveau scope
                    const firstCategory = SCOPE_CATEGORIES[parseInt(value)]?.[0]?.value || '';
                    const defaultUnit = getDefaultUnitForCategory(firstCategory);
                    setFormData({ ...formData, scope: value, category: firstCategory, unit: defaultUnit });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <span className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        Scope 1 - Émissions directes
                      </span>
                    </SelectItem>
                    <SelectItem value="2">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Scope 2 - Énergie
                      </span>
                    </SelectItem>
                    <SelectItem value="3">
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Scope 3 - Émissions indirectes (15 catégories GHG)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="factor_name">Nom du facteur *</Label>
                <Input
                  id="factor_name"
                  value={formData.factor_name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Auto-générer subcategory_key depuis le nom si pas encore personnalisé
                    const autoKey = toSubcategoryKey(newName);
                    const shouldAutoUpdate = !formData.subcategory_key || formData.subcategory_key === toSubcategoryKey(formData.factor_name);
                    setFormData({ 
                      ...formData, 
                      factor_name: newName,
                      subcategory_key: shouldAutoUpdate ? autoKey : formData.subcategory_key
                    });
                  }}
                  placeholder="Ex: Essence sans plomb, R410A, Gaz naturel..."
                />
                <p className="text-xs text-muted-foreground">
                  Ce nom sera utilisé comme clé de liaison pour les calculs automatiques.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emission_value">Valeur d'émission *</Label>
                  <Input
                    id="emission_value"
                    type="number"
                    step="0.000001"
                    min="0"
                    value={formData.emission_value}
                    onChange={(e) => setFormData({ ...formData, emission_value: e.target.value })}
                    placeholder="0.000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unité *</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => {
                    const newUnit = editingFactor ? formData.unit : getDefaultUnitForCategory(value);
                    setFormData({ ...formData, category: value, unit: newUnit });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {SCOPE_CATEGORIES[parseInt(formData.scope)]?.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.scope === '3' && (
                  <p className="text-xs text-muted-foreground">
                    15 catégories selon le GHG Protocol
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="source">Source (optionnel)</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Ex: ADEME 2024, Base Carbone, Mesures internes..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subcategory_key">Clé de liaison avec les données</Label>
                {(() => {
                  // Scope 3 : proposer les sous-catégories officielles + celles déjà en base (même sans données encore)
                  const standardScope3Subs = formData.scope === '3' ? getAllSubcategories().map(s => ({ value: s.value, label: `${s.label} (${s.value})`, scope: 3 })) : [];
                  const existing = existingSubcategories.filter(sc => formData.scope === '3' || sc.scope === parseInt(formData.scope));
                  const existingValues = new Set(existing.map(sc => sc.value));
                  const standardDeduped = standardScope3Subs.filter(s => !existingValues.has(s.value));
                  const options = [...existing, ...standardDeduped];
                  const hasOptions = options.length > 0;
                  const valueInOptions = options.some(o => o.value === formData.subcategory_key);
                  const selectValue = valueInOptions ? formData.subcategory_key : (formData.subcategory_key === '__manual__' ? '__manual__' : undefined);

                  return hasOptions ? (
                    <>
                      <Select
                        value={selectValue}
                        onValueChange={(value) => setFormData({ ...formData, subcategory_key: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.scope === '3' ? 'Ex: Pneus achetés (cat2_tires_new)' : 'Sélectionner une sous-catégorie'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="__manual__">
                            <span className="text-muted-foreground">✏️ Saisie manuelle...</span>
                          </SelectItem>
                          {existing.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Déjà dans vos données</div>
                              {existing.map(sc => (
                                <SelectItem key={sc.value} value={sc.value}>
                                  <span className="font-mono text-sm">{sc.label}</span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {formData.scope === '3' && standardDeduped.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground mt-1">Scope 3 – Sous-catégories standard</div>
                              {standardDeduped.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                  <span className="text-sm">{s.label}</span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {formData.subcategory_key === '__manual__' && (
                        <Input
                          value={formData.subcategory_key === '__manual__' ? '' : formData.subcategory_key}
                          onChange={(e) => setFormData({ ...formData, subcategory_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          placeholder="Ex: cat2_tires_new"
                          className="font-mono text-sm mt-1"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formData.scope === '3' 
                          ? 'Choisissez la même clé que dans Collecte (ex: Pneus achetés → cat2_tires_new) pour que le calcul apparaisse au dashboard.'
                          : 'Sélectionnez une sous-catégorie pour lier ce facteur aux données d\'activité.'
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <Input
                        id="subcategory_key"
                        value={formData.subcategory_key}
                        onChange={(e) => setFormData({ ...formData, subcategory_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder={formData.scope === '3' ? 'Ex: cat2_tires_new' : 'Générée depuis le nom'}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Clé utilisée pour lier ce facteur aux données. Scope 3 : utiliser la clé exacte (ex: cat2_tires_new pour Pneus achetés).
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations complémentaires sur ce facteur..."
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || !formData.factor_name || !formData.emission_value || !formData.category}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingFactor ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Comment ça fonctionne ?</p>
            <p>
              Les facteurs d'émission que vous créez ici seront utilisés en priorité dans vos calculs de bilan carbone.
              Si vous n'avez pas défini de facteur pour une source d'émission spécifique, le système utilisera 
              automatiquement les valeurs de référence standards.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un facteur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs par scope */}
      <Tabs value={activeScope} onValueChange={setActiveScope}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="1" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Scope 1
            <Badge variant="secondary" className="ml-1">{scopeStats[1]}</Badge>
          </TabsTrigger>
          <TabsTrigger value="2" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Scope 2
            <Badge variant="secondary" className="ml-1">{scopeStats[2]}</Badge>
          </TabsTrigger>
          <TabsTrigger value="3" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Scope 3
            <Badge variant="secondary" className="ml-1">{scopeStats[3]}</Badge>
          </TabsTrigger>
        </TabsList>

        {[1, 2, 3].map(scope => (
          <TabsContent key={scope} value={scope.toString()} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {getScopeIcon(scope)}
                  Facteurs d'émission - Scope {scope}
                </CardTitle>
                <CardDescription>
                  {scope === 1 && 'Émissions directes : combustion sur site, véhicules de l\'entreprise, procédés'}
                  {scope === 2 && 'Émissions indirectes liées à l\'énergie : électricité, chaleur, vapeur'}
                  {scope === 3 && 'Autres émissions indirectes : transport, achats, déchets, déplacements'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFactors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Aucun facteur personnalisé</p>
                    <p className="text-sm mt-1 mb-4">
                      {searchTerm 
                        ? 'Aucun facteur ne correspond à votre recherche'
                        : `Ajoutez vos propres facteurs d'émission pour le Scope ${scope}`
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={openNewDialog} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un facteur
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%]">Nom</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Clé de liaison</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
                        <TableHead>Unité</TableHead>
                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFactors.map(factor => (
                        <TableRow key={factor.id}>
                          <TableCell className="font-medium">
                            {factor.factor_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getScopeColor(factor.scope)}>
                              {getCategoryLabel(factor.scope, factor.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {factor.subcategory_key ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {factor.subcategory_key}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {factor.emission_value.toFixed(6)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {factor.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(factor)}
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(factor)}
                                title="Supprimer"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ParametresSources;
