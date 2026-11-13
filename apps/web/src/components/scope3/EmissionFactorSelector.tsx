/**
 * SÉLECTEUR DE FACTEUR D'ÉMISSION
 * 
 * Composant permettant de sélectionner un facteur d'émission précis
 * avec recherche fuzzy et navigation par arbre hiérarchique.
 * 
 * Optionnel : si non utilisé, le système utilise les fallbacks existants.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/command';
import { 
  ChevronDown, 
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
import { api } from "@/integrations/api/client";
import { ademeSearchQuery, factorSourceOrder } from '@/lib/factors/ademeFactor';
import { useOrganizationData } from '@/hooks/useOrganizationData';
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
  id: string;
  slug: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  subcategory: string;
  sourceLabel: string;
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

export const EmissionFactorSelector: React.FC<EmissionFactorSelectorProps> = ({
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
  const { organization } = useOrganizationData();
  const country = organization?.country ?? null;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allFactors, setAllFactors] = useState<BaseEmissionFactor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const suggestedQuery = ademeSearchQuery(subcategorySlug);
  const [selectedFactor, setSelectedFactor] = useState<BaseEmissionFactor | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualFactor, setManualFactor] = useState<string>('');
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);

  useEffect(() => {
    const q = (searchQuery.trim() || suggestedQuery).trim();
    if (!q) {
      setAllFactors([]);
      setSourceNotice(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const skipped: string[] = [];
      const sources = factorSourceOrder(country);
      try {
        for (const source of sources) {
          const { items } = await api.searchEmissionFactors({
            q,
            source: source.key,
            status: 'approved',
            limit: 20,
          });
          if (cancelled) return;
          if (items?.length) {
            setAllFactors(items.map((f) => ({
              id: f.id,
              slug: f.id,
              factor_name: f.name,
              emission_factor: Number(f.value ?? 0),
              unit: [f.unitNumerator, f.unitDenominator].filter(Boolean).join('/') || 'kgCO₂e',
              subcategory: f.sourceCategory || source.label,
              sourceLabel: source.label,
            })));
            setSourceNotice(
              skipped.length
                ? `Aucun facteur dans ${skipped.join(', ')}. Résultats proposés depuis ${source.label}.`
                : `Facteurs trouvés dans ${source.label}.`,
            );
            return;
          }
          skipped.push(source.label);
        }
        if (!cancelled) {
          setAllFactors([]);
          setSourceNotice(`Aucun facteur dans ${skipped.join(', ')}.`);
        }
      } catch (error) {
        console.error('Error searching emission factor bases:', error);
        if (!cancelled) {
          setAllFactors([]);
          setSourceNotice('La recherche dans les bases de facteurs a échoué.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, suggestedQuery, country]);

  const searchResults = allFactors;

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
    if (!subcategorySlug) return true;
    return loading || allFactors.length > 0 || Boolean(suggestedQuery) || SUBCATEGORIES_WITH_FALLBACK.has(subcategorySlug);
  }, [subcategorySlug, allFactors.length, loading, suggestedQuery]);

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
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche dans les bases de facteurs…
                </div>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {sourceNotice || `Aucun facteur pour « ${searchQuery.trim() || suggestedQuery || '…'} »`}
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup heading={`${searchResults[0]?.sourceLabel || 'Facteurs'} (${searchResults.length})`}>
                  {searchResults.map(factor => (
                    <CommandItem
                      key={factor.id}
                      value={factor.id}
                      onSelect={() => handleSelect(factor)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {factor.factor_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {factor.sourceLabel} · {factor.subcategory}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {factor.emission_factor} {formatUnit(factor.unit || 'kgCO₂e')}
                        </Badge>
                        {selectedFactor?.id === factor.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {/* Footer avec info */}
          <div className="border-t p-2 bg-muted/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Les bases sont consultées l'une après l'autre. Sans choix, un ordre de grandeur est utilisé.
            </p>
          </div>
        </PopoverContent>
        </Popover>

      {sourceNotice && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">{sourceNotice}</AlertDescription>
        </Alert>
      )}

      {/* Affichage du facteur sélectionné */}
      {selectedFactor && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 flex items-center justify-between">
          <span>
            ADEME : {selectedFactor.factor_name}
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
