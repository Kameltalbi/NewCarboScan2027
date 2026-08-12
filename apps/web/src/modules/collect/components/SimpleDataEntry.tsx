// Formulaire de saisie ultra-simplifié
// Maximum 6 champs essentiels pour une saisie rapide

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Zap, Fuel, Truck, ShoppingCart, Trash2, Package, MapPin, Settings, Snowflake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Fonction utilitaire pour générer les dates basées sur l'année de référence
const getDefaultDates = (referenceYear: number) => {
  const year = referenceYear;
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const monthStr = currentMonth.toString().padStart(2, '0');
  const dayStr = now.getDate().toString().padStart(2, '0');
  
  return {
    period_start: `${year}-${monthStr}-01`,
    period_end: `${year}-${monthStr}-${dayStr}`,
  };
};

// Types d'activité principaux (audit-proof)
const ACTIVITY_TYPES = [
  { value: 'energy', label: 'Énergie', icon: Zap, defaultUnit: 'kWh', scope: 'scope1', color: 'bg-yellow-500' },
  { value: 'transport', label: 'Transport', icon: Truck, defaultUnit: 'km', scope: 'scope3_upstream', color: 'bg-blue-500' },
  { value: 'purchase', label: 'Achats', icon: ShoppingCart, defaultUnit: '€', scope: 'scope3_upstream', color: 'bg-purple-500' },
  { value: 'waste', label: 'Déchets', icon: Trash2, defaultUnit: 'kg', scope: 'scope3_downstream', color: 'bg-green-500' },
  { value: 'material', label: 'Matières', icon: Package, defaultUnit: 'kg', scope: 'scope3_upstream', color: 'bg-slate-500' },
] as const;

// Sous-catégories ÉNERGIE (structure plate, audit-proof)
const ENERGY_SUBCATEGORIES = [
  // 1. Combustibles fossiles – fixes (Scope 1)
  { value: 'fossil_gas', label: 'Gaz naturel (fixe)', defaultUnit: 'm³', scope: 'scope1', group: 'Combustibles fossiles – fixes' },
  { value: 'fossil_fuel_oil', label: 'Fioul (fixe)', defaultUnit: 'L', scope: 'scope1', group: 'Combustibles fossiles – fixes' },
  { value: 'fossil_diesel', label: 'Diesel (fixe)', defaultUnit: 'L', scope: 'scope1', group: 'Combustibles fossiles – fixes' },
  { value: 'fossil_coal', label: 'Charbon', defaultUnit: 't', scope: 'scope1', group: 'Combustibles fossiles – fixes' },
  { value: 'fossil_coke', label: 'Coke', defaultUnit: 't', scope: 'scope1', group: 'Combustibles fossiles – fixes' },
  { value: 'fossil_lpg', label: 'GPL (fixe)', defaultUnit: 'kg', scope: 'scope1', group: 'Combustibles fossiles – fixes' },
  
  // 2. Carburants – mobilité interne (Scope 1)
  { value: 'fuel_diesel', label: 'Diesel (véhicules)', defaultUnit: 'L', scope: 'scope1', group: 'Carburants – mobilité interne' },
  { value: 'fuel_gasoline', label: 'Essence (véhicules)', defaultUnit: 'L', scope: 'scope1', group: 'Carburants – mobilité interne' },
  { value: 'fuel_lpg', label: 'GPL (véhicules)', defaultUnit: 'L', scope: 'scope1', group: 'Carburants – mobilité interne' },
  { value: 'fuel_cng', label: 'GNV (véhicules)', defaultUnit: 'kg', scope: 'scope1', group: 'Carburants – mobilité interne' },
  
  // 3. Électricité achetée (Scope 2)
  { value: 'electricity_grid', label: 'Électricité réseau', defaultUnit: 'kWh', scope: 'scope2', group: 'Électricité achetée' },
  { value: 'electricity_self', label: 'Autoproduction consommée', defaultUnit: 'kWh', scope: 'scope2', group: 'Électricité achetée' },
  
  // 4. Chaleur / vapeur / froid achetés (Scope 2)
  { value: 'district_heat', label: 'Chaleur réseau', defaultUnit: 'kWh', scope: 'scope2', group: 'Chaleur / vapeur / froid' },
  { value: 'district_steam', label: 'Vapeur achetée', defaultUnit: 'kWh', scope: 'scope2', group: 'Chaleur / vapeur / froid' },
  { value: 'district_cold', label: 'Froid réseau', defaultUnit: 'kWh', scope: 'scope2', group: 'Chaleur / vapeur / froid' },
  
  // 5. Biomasse énergétique (Scope 1 - CO₂ biogénique)
  { value: 'biomass_wood', label: 'Bois', defaultUnit: 't', scope: 'scope1', group: 'Biomasse énergétique' },
  { value: 'biomass_pellets', label: 'Pellets', defaultUnit: 't', scope: 'scope1', group: 'Biomasse énergétique' },
  { value: 'biomass_residues', label: 'Résidus agricoles', defaultUnit: 't', scope: 'scope1', group: 'Biomasse énergétique' },
  
  // 6. Émissions fugitives liées à l'énergie (Scope 1)
  { value: 'fugitive_refrigerant', label: 'Fuites fluides frigorigènes', defaultUnit: 'kg', scope: 'scope1', group: 'Émissions fugitives' },
  { value: 'fugitive_gas', label: 'Fuites de gaz', defaultUnit: 'kg', scope: 'scope1', group: 'Émissions fugitives' },
] as const;

// Unités communes
const COMMON_UNITS = ['kWh', 'MWh', 'L', 'm³', 'Nm³', 'km', 'kg', 't', '€', 'unités'];

interface SimpleDataEntryProps {
  onSuccess?: () => void;
}

export const SimpleDataEntry: React.FC<SimpleDataEntryProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId, referenceYear, loading: orgLoading } = useOrganizationData();
  const { sites } = useOrganizationSites(organizationId || undefined);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('energy');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedEnergyType, setSelectedEnergyType] = useState<string>('electricity_grid');
  
  // Initialiser les dates avec l'année de référence
  const defaultDates = getDefaultDates(referenceYear);
  const [formData, setFormData] = useState({
    quantity: '',
    unit: 'kWh',
    description: '',
    period_start: defaultDates.period_start,
    period_end: defaultDates.period_end,
  });

  // Mettre à jour les dates quand l'année de référence change
  useEffect(() => {
    const dates = getDefaultDates(referenceYear);
    setFormData(prev => ({
      ...prev,
      period_start: dates.period_start,
      period_end: dates.period_end,
    }));
  }, [referenceYear]);

  const selectedActivity = ACTIVITY_TYPES.find(t => t.value === selectedType);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const activity = ACTIVITY_TYPES.find(t => t.value === type);
    if (activity) {
      setFormData(prev => ({ ...prev, unit: activity.defaultUnit }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !organizationId) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté.',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une quantité valide.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Déterminer la sous-catégorie et le scope selon le type sélectionné
      let subcategory: string | undefined;
      let displayLabel: string;
      let scope: string;
      
      if (selectedType === 'energy') {
        subcategory = selectedEnergyType;
        const energyType = ENERGY_SUBCATEGORIES.find(e => e.value === selectedEnergyType);
        displayLabel = energyType?.label || 'énergie';
        scope = energyType?.scope || 'scope1';
      } else {
        displayLabel = selectedActivity?.label.toLowerCase() || '';
        scope = selectedActivity?.scope || 'scope3_upstream';
      }

      const dbActivityType = selectedType;

      await ActivityDataService.create({
        organization_id: organizationId,
        activity_type: dbActivityType as any,
        category: scope as any,
        subcategory: subcategory,
        quantity,
        unit: formData.unit,
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: 'estimated',
        notes: formData.description || undefined,
        site_id: selectedSite === 'all' ? null : selectedSite,
        scope_hint: scope.startsWith('scope1') ? 1 : scope.startsWith('scope2') ? 2 : scope.startsWith('scope3') ? 3 : undefined,
      });

      toast({
        title: 'Donnée enregistrée ✓',
        description: `${quantity} ${formData.unit} de ${displayLabel} ajoutés.`,
      });

      // Invalider le cache pour rafraîchir la liste des données et le dashboard
      queryClient.invalidateQueries({ queryKey: ['activity-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      // Notifier les autres composants (ex: CollectHome)
      window.dispatchEvent(new CustomEvent('activityDataUpdated'));

      // Reset form (keep site selection) - utiliser l'année de référence
      const resetDates = getDefaultDates(referenceYear);
      setFormData({
        quantity: '',
        unit: selectedActivity?.defaultUnit || 'kWh',
        description: '',
        period_start: resetDates.period_start,
        period_end: resetDates.period_end,
      });
      // Keep selectedSite for consecutive entries on the same site

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection du type - Boutons visuels */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de donnée</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isSelected ? type.color : "bg-muted-foreground/20"
                    )}>
                      <Icon className={cn("w-4 h-4", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélecteur de type d'énergie (visible uniquement si "Énergie" sélectionné) */}
          {selectedType === 'energy' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                Type d'énergie
              </Label>
              <Select value={selectedEnergyType} onValueChange={(value) => {
                setSelectedEnergyType(value);
                // Mettre à jour l'unité par défaut selon le type d'énergie
                const energyType = ENERGY_SUBCATEGORIES.find(e => e.value === value);
                if (energyType) {
                  setFormData(prev => ({ ...prev, unit: energyType.defaultUnit }));
                }
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {ENERGY_SUBCATEGORIES.map((energy) => (
                    <SelectItem key={energy.value} value={energy.value}>
                      {energy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Site selector - Recommandé pour le filtrage par site */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Site
                <span className="text-xs text-amber-600 font-normal">(recommandé)</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/parametres/sites')}
                className="h-auto py-0.5 px-2 text-xs text-primary hover:text-primary"
              >
                <Settings className="w-3 h-3 mr-1" />
                Gérer les sites
              </Button>
            </div>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className={`h-10 ${selectedSite === 'all' ? 'border-amber-300 bg-amber-50' : ''}`}>
                <SelectValue placeholder="Sélectionner un site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-muted-foreground">
                  Non spécifié (consolidé)
                </SelectItem>
                {sites.length > 0 ? (
                  sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} {site.code && `(${site.code})`}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    Aucun site configuré
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedSite === 'all' && (
              <p className="text-xs text-amber-600">
                💡 Associer un site permet le filtrage par site dans le dashboard
              </p>
            )}
          </div>

          {/* Quantité + Unité sur la même ligne */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="h-12 text-lg"
                placeholder="Ex: 1500"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit" className="text-sm font-medium">Unité</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger id="unit" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Période simplifiée */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start" className="text-sm font-medium">Du</Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period_end" className="text-sm font-medium">Au</Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                className="h-10"
                required
              />
            </div>
          </div>

          {/* Description optionnelle */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">
              Note (optionnel)
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="h-10"
              placeholder="Ex: Facture EDF janvier 2024"
            />
          </div>

          {/* Bouton de soumission */}
          <Button 
            type="submit"
            size="lg"
            disabled={isSubmitting || orgLoading || !organizationId || !formData.quantity}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? (
              'Enregistrement...'
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Ajouter cette donnée
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
