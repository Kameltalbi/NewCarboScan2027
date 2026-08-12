/**
 * SÉLECTEUR DE FACTEUR D'ÉMISSION
 * 
 * Composant permettant de sélectionner un facteur d'émission précis
 * avec recherche fuzzy et navigation par arbre hiérarchique.
 * 
 * Optionnel : si non utilisé, le système utilise les fallbacks existants.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Leaf,
  Info,
  Loader2,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from "@/integrations/api/client";
import { cn } from '@/lib/utils';
import { MonetaryFactorPresets, isMonetaryUnit } from './MonetaryFactorPresets';
import { FlightFactorPresets, isFlightContext, type FlightFactorPreset } from './FlightFactorPresets';

// Liste des sous-catégories avec fallback hardcodé (doit correspondre à BilanCarboneCalculator.ts)
const SUBCATEGORIES_WITH_FALLBACK = new Set([
  'cat1_purchased_goods', 'cat1_purchased_services', 'cat1_raw_materials', 'cat1_packaging',
  'cat1_office_supplies', 'cat1_it_equipment', 'cat1_furniture', 'cat1_consumables',
  'cat2_capital_goods', 'cat2_machinery', 'cat2_vehicles', 'cat2_buildings', 'cat2_it_infrastructure',
  'cat3_fuel_energy', 'cat3_electricity_losses', 'cat3_heat_losses',
  'cat4_upstream_transport', 'cat4_road_freight', 'cat4_rail_freight', 'cat4_sea_freight', 'cat4_air_freight',
  'cat5_waste', 'cat5_recycling', 'cat5_incineration', 'cat5_landfill', 'cat5_hazardous_waste', 'cat5_unsorted_waste',
  'cat6_business_travel', 'cat6_air_travel', 'cat6_rail_travel', 'cat6_car_rental', 'cat6_hotel_stays',
  'cat7_employee_commuting', 'cat7_car_commuting', 'cat7_public_transport', 'cat7_bicycle', 'cat7_telework',
  'cat8_leased_assets_upstream', 'cat8_leased_buildings', 'cat8_leased_vehicles', 'cat8_leased_equipment',
  'cat9_downstream_transport', 'cat9_customer_delivery', 'cat9_distribution_centers',
  'cat10_processing', 'cat10_product_assembly', 'cat10_product_finishing',
  'cat11_product_use', 'cat11_energy_consumption', 'cat11_consumables_use',
  'cat12_end_of_life', 'cat12_product_recycling', 'cat12_product_disposal',
  'cat13_leased_assets_downstream', 'cat13_franchised_buildings', 'cat13_rented_equipment',
  'cat14_franchises', 'cat14_franchise_operations', 'cat14_franchise_energy',
  'cat15_investments', 'cat15_equity_investments', 'cat15_project_finance',
]);

// Type simplifié pour les FE retournés par la RPC
interface BaseEmissionFactor {
  slug: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  subcategory: string;
}

interface EmissionFactorSelectorProps {
  value?: string; // slug du FE sélectionné
  onChange: (slug: string | null, factor?: BaseEmissionFactor) => void;
  onManualFactorChange?: (manualFactor: number | null) => void; // Pour saisie manuelle
  manualFactorValue?: number | null;
  suggestedCategory?: string; // Catégorie pour filtrer/prioriser
  subcategorySlug?: string; // Pour vérifier si un fallback existe
  unit?: string; // Unité de la donnée (pour détecter les unités monétaires)
  disabled?: boolean;
  placeholder?: string;
}

interface CategoryGroup {
  name: string;
  factors: BaseEmissionFactor[];
}

export const EmissionFactorSelector: React.FC<EmissionFactorSelectorProps> = ({
  value,
  onChange,
  onManualFactorChange,
  manualFactorValue,
  suggestedCategory,
  subcategorySlug,
  unit,
  disabled = false,
  placeholder = 'Sélectionner un facteur d\'émission (optionnel)',
}) => {
  const [monetaryPresetLabel, setMonetaryPresetLabel] = useState<string | null>(null);
  const [flightPresetId, setFlightPresetId] = useState<string | null>(null);
  const monetary = isMonetaryUnit(unit);
  const flight = isFlightContext(subcategorySlug, unit, suggestedCategory);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allFactors, setAllFactors] = useState<BaseEmissionFactor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedFactor, setSelectedFactor] = useState<BaseEmissionFactor | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualFactor, setManualFactor] = useState<string>('');

  // Charger tous les facteurs d'émission au montage via RPC (contourne RLS)
  useEffect(() => {
    const loadFactors = async () => {
      try {
        setLoading(true);
        
        // Utiliser la RPC qui contourne les RLS
        const { data, error } = await supabase.rpc('get_base_emission_factors');
        
        if (error) {
          console.error('Error loading emission factors via RPC:', error);
          setAllFactors([]);
          return;
        }
        
        const factorsList: BaseEmissionFactor[] = (data || []).map((f: any) => ({
          slug: f.slug || '',
          factor_name: f.factor_name || '',
          emission_factor: f.emission_factor || 0,
          unit: f.unit || 'kgCO₂e',
          subcategory: f.subcategory || '',
        }));
        
        setAllFactors(factorsList);
        
        // Si une valeur est déjà sélectionnée, la récupérer
        if (value) {
          const factor = factorsList.find(f => f.slug === value);
          if (factor) {
            setSelectedFactor(factor);
          }
        }
      } catch (error) {
        console.error('Error loading emission factors:', error);
        setAllFactors([]);
      } finally {
        setLoading(false);
      }
    };

    loadFactors();
  }, [value]);

  // Configurer Fuse.js pour la recherche fuzzy
  const fuse = useMemo(() => {
    return new Fuse(allFactors, {
      keys: [
        { name: 'factor_name', weight: 0.6 },
        { name: 'subcategory', weight: 0.3 },
        { name: 'slug', weight: 0.1 },
      ],
      threshold: 0.4, // Tolérance pour le fuzzy matching
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [allFactors]);

  // Résultats de recherche
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return fuse.search(searchQuery).slice(0, 20).map(result => result.item);
  }, [fuse, searchQuery]);

  // Grouper les facteurs par subcategory pour l'arbre
  const categorizedFactors = useMemo(() => {
    const groups: Record<string, CategoryGroup> = {};
    
    allFactors.forEach(factor => {
      // Extraire la catégorie depuis subcategory (ex: "cat1_purchased_goods" -> "Achats")
      const subcatParts = (factor.subcategory || '').split(':');
      const mainCategory = subcatParts[0] || 'Autres';
      
      // Mapper les préfixes cat1, cat2, etc. vers des noms lisibles
      const categoryNames: Record<string, string> = {
        'cat1': 'Cat 1 - Achats',
        'cat2': 'Cat 2 - Équipements',
        'cat3': 'Cat 3 - Énergie',
        'cat4': 'Cat 4 - Transport amont',
        'cat5': 'Cat 5 - Déchets',
        'cat6': 'Cat 6 - Voyages',
        'cat7': 'Cat 7 - Domicile-travail',
        'cat8': 'Cat 8 - Actifs loués amont',
        'cat9': 'Cat 9 - Transport aval',
        'cat10': 'Cat 10 - Transformation',
        'cat11': 'Cat 11 - Utilisation produits',
        'cat12': 'Cat 12 - Fin de vie',
        'cat13': 'Cat 13 - Actifs loués aval',
        'cat14': 'Cat 14 - Franchises',
        'cat15': 'Cat 15 - Investissements',
        'energy': 'Énergie',
        'transport': 'Transport',
        'waste': 'Déchets',
        'fuel': 'Carburants',
        'electricity': 'Électricité',
      };
      
      // Trouver le nom de catégorie
      let categoryName = 'Autres';
      for (const [prefix, name] of Object.entries(categoryNames)) {
        if (mainCategory.toLowerCase().includes(prefix.toLowerCase())) {
          categoryName = name;
          break;
        }
      }
      
      if (!groups[categoryName]) {
        groups[categoryName] = { name: categoryName, factors: [] };
      }
      groups[categoryName].factors.push(factor);
    });

    // Trier les catégories, avec la catégorie suggérée en premier
    const sortedCategories = Object.values(groups).sort((a, b) => {
      if (suggestedCategory) {
        if (a.name.toLowerCase().includes(suggestedCategory.toLowerCase())) return -1;
        if (b.name.toLowerCase().includes(suggestedCategory.toLowerCase())) return 1;
      }
      return a.name.localeCompare(b.name);
    });

    return sortedCategories;
  }, [allFactors, suggestedCategory]);

  // Basculer l'expansion d'une catégorie
  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }, []);

  // Sélectionner un facteur
  const handleSelect = useCallback((factor: BaseEmissionFactor) => {
    setSelectedFactor(factor);
    onChange(factor.slug, factor);
    setOpen(false);
    setSearchQuery('');
  }, [onChange]);

  // Effacer la sélection
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFactor(null);
    onChange(null);
  }, [onChange]);

  // Formater l'affichage du facteur
  const formatFactorDisplay = (factor: BaseEmissionFactor) => {
    const name = factor.factor_name;
    const value = factor.emission_factor;
    const unit = factor.unit || 'kgCO₂e';
    return `${name} (${value} ${unit})`;
  };

  // Formater l'unité avec subscript pour CO2
  const formatUnit = (unit: string) => {
    return unit.replace('CO2', 'CO₂');
  };

  // Vérifier si un FE existe pour cette sous-catégorie (en base ou fallback)
  const hasAvailableFE = useMemo(() => {
    if (!subcategorySlug) return true; // Si pas de sous-cat, on assume OK
    
    // Vérifier si un FE existe en base pour cette sous-cat
    const hasInDatabase = allFactors.some(f => 
      f.subcategory?.toLowerCase().includes(subcategorySlug.toLowerCase()) ||
      f.slug?.toLowerCase().includes(subcategorySlug.toLowerCase())
    );
    
    // Vérifier si un fallback existe
    const hasFallback = SUBCATEGORIES_WITH_FALLBACK.has(subcategorySlug);
    
    return hasInDatabase || hasFallback;
  }, [subcategorySlug, allFactors]);

  // Gérer la saisie manuelle
  const handleManualFactorChange = useCallback((value: string) => {
    setManualFactor(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && onManualFactorChange) {
      onManualFactorChange(numValue);
    } else if (onManualFactorChange) {
      onManualFactorChange(null);
    }
  }, [onManualFactorChange]);

  // Synchroniser la valeur manuelle externe
  useEffect(() => {
    if (manualFactorValue !== null && manualFactorValue !== undefined) {
      setManualFactor(manualFactorValue.toString());
      setShowManualInput(true);
    }
  }, [manualFactorValue]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des facteurs d'émission...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {monetary && unit && (
        <MonetaryFactorPresets
          unit={unit}
          selectedLabel={monetaryPresetLabel}
          onSelect={(factor, label) => {
            setMonetaryPresetLabel(label);
            setSelectedFactor(null);
            setShowManualInput(true);
            setManualFactor(String(factor));
            onChange(null);
            onManualFactorChange?.(factor);
          }}
        />
      )}
      {flight && !monetary && (
        <FlightFactorPresets
          selectedId={flightPresetId}
          currentUnit={unit}
          onSelect={(preset: FlightFactorPreset) => {
            setFlightPresetId(preset.id);
            setSelectedFactor(null);
            setShowManualInput(true);
            setManualFactor(String(preset.factor));
            onChange(null);
            onManualFactorChange?.(preset.factor);
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Leaf className="h-4 w-4 text-green-600" />
          Facteur d'émission
          <Badge variant="outline" className="text-[10px] font-normal">
            Optionnel
          </Badge>
        </Label>
        {selectedFactor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <X className="h-3 w-3 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedFactor && 'text-muted-foreground'
            )}
          >
            {selectedFactor ? (
              <span className="truncate">
                {formatFactorDisplay(selectedFactor)}
              </span>
            ) : (
              placeholder
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[450px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Rechercher un facteur d'émission..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />

            <CommandList>
              {/* Résultats de recherche */}
              {searchQuery.trim() && (
                <>
                  {searchResults.length === 0 ? (
                    <CommandEmpty>
                      <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          Aucun facteur trouvé pour "{searchQuery}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Essayez avec d'autres mots-clés
                        </p>
                      </div>
                    </CommandEmpty>
                  ) : (
                    <CommandGroup heading={`Résultats (${searchResults.length})`}>
                      {searchResults.map(factor => (
                        <CommandItem
                          key={factor.slug}
                          value={factor.slug}
                          onSelect={() => handleSelect(factor)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {factor.factor_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {factor.subcategory}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {factor.emission_factor} {formatUnit(factor.unit || 'kgCO₂e')}
                            </Badge>
                            {selectedFactor?.slug === factor.slug && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandSeparator />
                </>
              )}

              {/* Navigation par arbre (quand pas de recherche) */}
              {!searchQuery.trim() && (
                <ScrollArea className="h-[300px]">
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground mb-2 px-2">
                      Parcourez par catégorie ou utilisez la recherche
                    </p>
                    {categorizedFactors.map(group => (
                      <Collapsible
                        key={group.name}
                        open={expandedCategories.has(group.name)}
                        onOpenChange={() => toggleCategory(group.name)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between px-2 py-1.5 h-auto font-normal hover:bg-muted"
                          >
                            <span className="flex items-center gap-2">
                              {expandedCategories.has(group.name) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium">{group.name}</span>
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {group.factors.length}
                            </Badge>
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-6 border-l pl-2 space-y-0.5">
                            {group.factors.slice(0, 50).map(factor => (
                              <Button
                                key={factor.slug}
                                variant="ghost"
                                className={cn(
                                  'w-full justify-between px-2 py-1 h-auto font-normal text-left hover:bg-muted',
                                  selectedFactor?.slug === factor.slug && 'bg-primary/10'
                                )}
                                onClick={() => handleSelect(factor)}
                              >
                                <span className="text-sm truncate max-w-[250px]">
                                  {factor.factor_name}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                  {factor.emission_factor} {formatUnit(factor.unit || 'kgCO₂e')}
                                </span>
                              </Button>
                            ))}
                            {group.factors.length > 50 && (
                              <p className="text-xs text-muted-foreground px-2 py-1">
                                +{group.factors.length - 50} autres (utilisez la recherche)
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CommandList>
          </Command>

          {/* Footer avec info */}
          <div className="border-t p-2 bg-muted/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Si non sélectionné, le facteur par défaut sera utilisé
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Affichage du facteur sélectionné */}
      {selectedFactor && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 flex items-center justify-between">
          <span>
            Slug : {selectedFactor.slug}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {selectedFactor.emission_factor} {formatUnit(selectedFactor.unit || 'kgCO₂e')}
          </Badge>
        </div>
      )}

      {/* Warning si aucun FE disponible */}
      {!loading && subcategorySlug && !hasAvailableFE && !selectedFactor && !showManualInput && !monetary && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <p className="font-medium">Aucun facteur d'émission disponible pour cette sous-catégorie.</p>
            <p className="mt-1">Sans FE, le calcul affichera 0 tCO₂e.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => setShowManualInput(true)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Saisir un FE manuellement
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Champ de saisie manuelle du FE */}
      {(showManualInput || (!hasAvailableFE && !selectedFactor)) && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Pencil className="h-3 w-3" />
              Facteur d'émission manuel
            </Label>
            {showManualInput && hasAvailableFE && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-[10px]"
                onClick={() => {
                  setShowManualInput(false);
                  setManualFactor('');
                  onManualFactorChange?.(null);
                }}
              >
                Annuler
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.001"
              min="0"
              placeholder="Ex: 0.11"
              value={manualFactor}
              onChange={(e) => handleManualFactorChange(e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              kgCO₂e / unité
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Consultez la Base Carbone ADEME pour trouver le bon facteur.
          </p>
        </div>
      )}

      {/* Bouton pour afficher la saisie manuelle si FE disponibles */}
      {!showManualInput && hasAvailableFE && !selectedFactor && allFactors.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-6 text-xs text-muted-foreground"
          onClick={() => setShowManualInput(true)}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Ou saisir un FE manuellement
        </Button>
      )}
    </div>
  );
};
