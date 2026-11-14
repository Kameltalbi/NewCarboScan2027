/**
 * Sélecteur de facteur d'émission.
 * La liste courte dépend de l'activité, du pays du site et de l'unité.
 * Rien n'est enregistré tant que l'utilisateur n'a pas confirmé.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
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
import { api, type FactorCatalogSearchItem } from "@/integrations/api/client";
import { FACTOR_SOURCES } from '@/lib/factors/ademeFactor';
import {
  classifyFactor,
  isTunisiaCountry,
  searchRequests,
  UNCONFIRMED_ELECTRICITY_KEYS,
  type CatalogFactor,
  type ClassifiedFactor,
} from '@/lib/factors/factorSelection';
import { getSubcategoryLabel } from '@/lib/scope3/subcategories';
import { cn } from '@/lib/utils';
import { MonetaryFactorPresets, isMonetaryUnit } from './MonetaryFactorPresets';
import { FlightFactorPresets, isFlightContext, type FlightFactorPreset } from './FlightFactorPresets';

// Liste des sous-catégories avec fallback hardcodé (doit correspondre à BilanCarboneCalculator.ts)
function roleRank(role: ClassifiedFactor['role']): number {
  if (role === 'match') return 0;
  if (role === 'replacement') return 1;
  if (role === 'upstream') return 2;
  return 3;
}

function toCatalog(item: FactorCatalogSearchItem): CatalogFactor {
  return {
    id: item.id,
    name: item.name,
    value: Number(item.value),
    unitNumerator: item.unitNumerator || '',
    unitDenominator: item.unitDenominator || '',
    sourceKey: item.source?.key || '',
    sourceName: item.source?.name || '',
    datasetVersion: item.datasetVersion,
    countryCode: item.countryCode,
    region: item.region,
    factorYear: item.factorYear,
    category: item.sourceCategory || item.internalCategory,
    stableFactorId: item.stableFactorId,
  };
}

function toView(item: ClassifiedFactor): BaseEmissionFactor {
  const factor = item.factor;
  return {
    id: factor.id,
    slug: factor.id,
    factor_name: factor.name,
    emission_factor: factor.value,
    unit: [factor.unitNumerator, factor.unitDenominator].filter(Boolean).join('/') || 'kgCO₂e',
    subcategory: factor.category || '',
    sourceLabel: factor.sourceName || factor.sourceKey,
    sourceKey: factor.sourceKey,
    sourceName: factor.sourceName,
    datasetVersion: factor.datasetVersion,
    countryCode: factor.countryCode,
    region: factor.region,
    factorYear: factor.factorYear,
    stableFactorId: factor.stableFactorId,
    unitDenominator: factor.unitDenominator,
    role: item.role,
    reason: item.reason,
  };
}

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
  sourceKey: string | null;
  sourceName: string | null;
  datasetVersion: string | null;
  countryCode: string | null;
  region: string | null;
  factorYear: number | null;
  stableFactorId: string | null;
  unitDenominator: string;
  role: ClassifiedFactor['role'];
  reason: string | null;
}

interface EmissionFactorSelectorProps {
  value?: string; // slug du FE sélectionné
  onChange: (slug: string | null, factor?: BaseEmissionFactor) => void;
  onManualFactorChange?: (manualFactor: number | null) => void; // Pour saisie manuelle
  manualFactorValue?: number | null;
  suggestedCategory?: string; // Catégorie pour filtrer/prioriser
  subcategorySlug?: string; // Pour vérifier si un fallback existe
  unit?: string; // Unité de la donnée (pour détecter les unités monétaires)
  siteCountry?: string | null;
  reportingYear?: number | null;
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
  siteCountry,
  reportingYear,
  disabled = false,
  placeholder = 'Confirmer un facteur d\'émission',
}) => {
  const [monetaryPresetLabel, setMonetaryPresetLabel] = useState<string | null>(null);
  const [flightPresetId, setFlightPresetId] = useState<string | null>(null);
  const monetary = isMonetaryUnit(unit);
  const flight = isFlightContext(subcategorySlug, unit, suggestedCategory);
  const [loading, setLoading] = useState(false);
  const [allFactors, setAllFactors] = useState<BaseEmissionFactor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFactor, setSelectedFactor] = useState<BaseEmissionFactor | null>(null);
  const [pendingFactor, setPendingFactor] = useState<BaseEmissionFactor | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualFactor, setManualFactor] = useState<string>('');
  const [manualSource, setManualSource] = useState('');
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [widen, setWiden] = useState(false);
  const [countryInput, setCountryInput] = useState(siteCountry || '');
  const [yearInput, setYearInput] = useState(reportingYear ? String(reportingYear) : '');

  useEffect(() => { setCountryInput(siteCountry || ''); }, [siteCountry]);
  useEffect(() => { setYearInput(reportingYear ? String(reportingYear) : ''); }, [reportingYear]);
  useEffect(() => { setWiden(false); setPendingFactor(null); }, [subcategorySlug, unit]);

  const activityLabel = getSubcategoryLabel(subcategorySlug?.split(':').pop() || '') || '';
  const reportingYearNumber = /^\d{4}$/.test(yearInput.trim()) ? Number(yearInput) : null;
  const visibleFactors = widen || searchQuery.trim()
    ? allFactors.filter((factor) => factor.role !== 'incompatible')
    : allFactors.filter((factor) => factor.role === 'match' || factor.role === 'replacement');

  useEffect(() => {
    const plan = searchRequests({
      subcategory: subcategorySlug,
      label: searchQuery.trim() || activityLabel,
      siteCountry: countryInput,
      widen: widen || Boolean(searchQuery.trim()),
    });
    setSourceNotice(plan.gap);
    const requests = plan.requests.filter((request) => request.q.trim());
    if (requests.length === 0) {
      setAllFactors([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const found = new Map<string, BaseEmissionFactor>();
      try {
        const jobs = (widen || searchQuery.trim() ? FACTOR_SOURCES.map((source) => ({
          q: requests[0].q,
          source: source.key,
          role: 'match' as const,
        })) : requests);
        for (const request of jobs) {
          const { items } = await api.searchEmissionFactors({
            q: request.q,
            source: request.source,
            status: 'approved',
            limit: 12,
          });
          if (cancelled) return;
          for (const item of items || []) {
            const factor = toCatalog(item);
            const classified = classifyFactor(factor, {
              subcategory: subcategorySlug,
              siteCountry: countryInput,
              reportingYear: Number.isInteger(reportingYearNumber) ? reportingYearNumber : null,
              activityUnit: unit,
              requestedRole: request.role,
            });
            const view = toView(classified);
            const previous = found.get(view.id);
            if (!previous || roleRank(view.role) < roleRank(previous.role)) found.set(view.id, view);
          }
        }
        if (!cancelled) setAllFactors(Array.from(found.values()));
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
  }, [searchQuery, subcategorySlug, activityLabel, countryInput, reportingYearNumber, unit, widen]);

  const handleSelect = useCallback((factor: BaseEmissionFactor) => {
    if (factor.role === 'incompatible' || factor.role === 'upstream') return;
    setPendingFactor(factor);
  }, []);

  const electricityKey = (subcategorySlug || '').split(':').pop() || '';
  const tunisiaElectricity = UNCONFIRMED_ELECTRICITY_KEYS.has(electricityKey) && isTunisiaCountry(siteCountry);
  const otherCountryElectricity = UNCONFIRMED_ELECTRICITY_KEYS.has(electricityKey) && Boolean((siteCountry || '').trim()) && !tunisiaElectricity;
  const siteCountryMissing = UNCONFIRMED_ELECTRICITY_KEYS.has(electricityKey) && !(siteCountry || '').trim();

  const confirmFactor = useCallback(() => {
    if (siteCountryMissing) return;
    if (!pendingFactor || pendingFactor.role === 'incompatible' || pendingFactor.role === 'upstream') return;
    setSelectedFactor(pendingFactor);
    onChange(pendingFactor.slug, pendingFactor);
  }, [onChange, pendingFactor, siteCountryMissing]);

  // Effacer la sélection
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFactor(null);
    onChange(null);
  }, [onChange]);

  // Formater l'unité avec subscript pour CO2
  const formatUnit = (unit: string) => {
    return unit.replace('CO2', 'CO₂');
  };

  // Vérifier si un FE existe pour cette sous-catégorie (en base ou fallback)
  const hasAvailableFE = useMemo(() => {
    if (!subcategorySlug) return true;
    return loading || visibleFactors.length > 0 || SUBCATEGORIES_WITH_FALLBACK.has(subcategorySlug);
  }, [subcategorySlug, visibleFactors.length, loading]);

  // Gérer la saisie manuelle
  const handleManualFactorChange = useCallback((value: string, source = manualSource) => {
    setManualFactor(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onManualFactorChange?.(numValue);
      onChange(`manual-${numValue}`, {
        id: `manual-${numValue}`,
        slug: `manual-${numValue}`,
        factor_name: 'Facteur saisi',
        emission_factor: numValue,
        unit: unit ? `kgCO2e/${unit}` : 'kgCO2e/unité',
        subcategory: subcategorySlug || '',
        sourceLabel: source.trim() || 'Facteur saisi',
        sourceKey: 'manual',
        sourceName: source.trim() || null,
        datasetVersion: null,
        countryCode: null,
        region: null,
        factorYear: null,
        stableFactorId: null,
        unitDenominator: unit || '',
        role: 'match',
        reason: null,
      });
      return;
    }
    onManualFactorChange?.(null);
  }, [manualSource, onChange, onManualFactorChange, subcategorySlug, unit]);

  // Synchroniser la valeur manuelle externe
  useEffect(() => {
    if (manualFactorValue !== null && manualFactorValue !== undefined) {
      setManualFactor(manualFactorValue.toString());
      setShowManualInput(true);
    }
  }, [manualFactorValue]);

  if (tunisiaElectricity && !showManualInput) {
    return (
      <div className="space-y-2">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Électricité Tunisie : 0,53 kg CO₂e/kWh, proposé comme facteur provisoire. La source officielle, l’année et le périmètre ne sont pas documentés.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowManualInput(true)}>
          <Pencil className="mr-1 h-3 w-3" />
          Saisir un autre facteur
        </Button>
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
          Facteur
          <Badge variant="outline" className="text-[10px] font-normal">
            À confirmer
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

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Pays du site</Label>
          <Input
            value={countryInput}
            disabled={disabled}
            placeholder="Pays du site consommateur"
            onChange={(event) => setCountryInput(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Année du dossier</Label>
          <Input
            value={yearInput}
            disabled={disabled}
            inputMode="numeric"
            placeholder="Année"
            onChange={(event) => setYearInput(event.target.value)}
          />
        </div>
      </div>

      <Input
        value={searchQuery}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Recherche des facteurs pertinents…
        </div>
      ) : visibleFactors.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucun facteur pertinent pour cette activité et cette unité.
        </p>
      ) : (
        <div className="space-y-1">
          {visibleFactors.slice(0, widen || searchQuery.trim() ? 20 : 8).map((factor) => {
            const geography = [factor.countryCode, factor.region].filter(Boolean).join(' · ');
            const selected = pendingFactor?.id === factor.id;
            return (
              <button
                key={factor.id}
                type="button"
                disabled={disabled || factor.role === 'upstream'}
                onClick={() => handleSelect(factor)}
                className={cn(
                  'w-full rounded-md border px-2 py-1.5 text-left text-xs',
                  selected ? 'border-primary bg-primary/5' : 'border-border',
                  factor.role === 'upstream' && 'opacity-70',
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">{factor.factor_name}</span>
                  <span>{factor.emission_factor} {formatUnit(factor.unit)}</span>
                </span>
                <span className="mt-1 block text-muted-foreground">
                  {[factor.sourceLabel, geography, factor.factorYear, factor.subcategory].filter(Boolean).join(' · ')}
                </span>
                {factor.role === 'replacement' && (
                  <span className="mt-1 block text-amber-700">Facteur de remplacement. {factor.reason}</span>
                )}
                {factor.role === 'upstream' && (
                  <span className="mt-1 block text-amber-700">{factor.reason} Cette ligne de combustion ne peut pas l’enregistrer.</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!widen && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setWiden(true)}>
          Voir les autres facteurs
        </Button>
      )}

      {siteCountryMissing && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Le pays du site est obligatoire. Sans pays, la ligne d'électricité reste incomplète. Le pays de l'organisation n'est pas utilisé.
          </AlertDescription>
        </Alert>
      )}

      {pendingFactor && pendingFactor.role !== 'upstream' && (
        <Button type="button" size="sm" disabled={disabled || siteCountryMissing} onClick={confirmFactor}>
          <Check className="mr-1 h-3 w-3" />
          {otherCountryElectricity ? 'Utiliser ce facteur ADEME' : 'Confirmer ce facteur'}
        </Button>
      )}

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
            {selectedFactor.sourceLabel || 'Facteur confirmé'} : {selectedFactor.factor_name}
            {selectedFactor.role === 'replacement' ? ' — Facteur de remplacement' : ''}
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
            <p className="font-medium">Aucun facteur pertinent.</p>
            <p className="mt-1">La ligne reste incomplète. Elle n’est pas comptée comme zéro émission.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => setShowManualInput(true)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Saisir un facteur
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Champ de saisie manuelle du FE */}
      {showManualInput && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Pencil className="h-3 w-3" />
              Facteur saisi
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
              kgCO₂e / {unit || "unité"}
            </span>
          </div>
          <Input
            placeholder="Source du facteur"
            value={manualSource}
            onChange={(event) => {
              setManualSource(event.target.value);
              if (manualFactor) handleManualFactorChange(manualFactor, event.target.value);
            }}
            className="h-8 text-sm"
          />
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
          Ou saisir un facteur
        </Button>
      )}
    </div>
  );
};
