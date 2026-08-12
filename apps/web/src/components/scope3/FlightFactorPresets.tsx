import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Info, Check } from 'lucide-react';

/**
 * Facteurs d'émission par avion — Base Empreinte ADEME 2024
 * Deux modes disponibles :
 *  - Par trajet moyen passager (kgCO₂e / trajet, aller simple)
 *  - Par passager.km (kgCO₂e / p.km)
 */
export interface FlightFactorPreset {
  id: string;
  label: string;
  factor: number;
  unit: 'trajet' | 'passager.km';
  description: string;
}

export const FLIGHT_PRESETS_BY_TRIP: FlightFactorPreset[] = [
  { id: 'dom', label: 'Vol domestique (< 1 000 km)', factor: 145, unit: 'trajet', description: 'Aller simple, 1 passager, classe éco' },
  { id: 'short', label: 'Court-courrier (intra-Europe)', factor: 230, unit: 'trajet', description: 'Aller simple, 1 passager, classe éco' },
  { id: 'medium', label: 'Moyen-courrier', factor: 660, unit: 'trajet', description: 'Aller simple, 1 passager, classe éco' },
  { id: 'long', label: 'Long-courrier (intercontinental)', factor: 1800, unit: 'trajet', description: 'Aller simple, 1 passager, classe éco' },
];

export const FLIGHT_PRESETS_BY_PKM: FlightFactorPreset[] = [
  { id: 'dom-pkm', label: 'Vol domestique', factor: 0.259, unit: 'passager.km', description: 'ADEME - vol domestique moyen' },
  { id: 'short-pkm', label: 'Court-courrier', factor: 0.158, unit: 'passager.km', description: 'ADEME - court-courrier moyen' },
  { id: 'medium-pkm', label: 'Moyen-courrier', factor: 0.131, unit: 'passager.km', description: 'ADEME - moyen-courrier moyen' },
  { id: 'long-pkm', label: 'Long-courrier éco', factor: 0.152, unit: 'passager.km', description: 'ADEME - long-courrier classe éco' },
  { id: 'long-business-pkm', label: 'Long-courrier affaires', factor: 0.442, unit: 'passager.km', description: 'ADEME - long-courrier classe affaires' },
];

/**
 * Détection heuristique : est-ce une saisie "vol avion" ?
 */
export function isFlightContext(subcategorySlug?: string, unit?: string, category?: string): boolean {
  const s = (subcategorySlug || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const u = (unit || '').toLowerCase();
  if (s.includes('air_travel') || s.includes('air_freight') || s.includes('flight') || s.includes('avion') || s.includes('vol')) return true;
  if (c.includes('avion') || c.includes('vol') || c.includes('flight')) return true;
  if (u.includes('passager.km') || u.includes('pkm')) return true;
  return false;
}

interface FlightFactorPresetsProps {
  selectedId?: string | null;
  currentUnit?: string;
  onSelect: (preset: FlightFactorPreset) => void;
}

export const FlightFactorPresets: React.FC<FlightFactorPresetsProps> = ({ selectedId, currentUnit, onSelect }) => {
  const u = (currentUnit || '').toLowerCase();
  // Si unité déjà en pkm, on ne montre que les FE pkm ; si "trajet", on montre les FE par trajet ; sinon les deux.
  const showTrip = !u.includes('pkm') && !u.includes('passager.km');
  const showPkm = !u.includes('trajet') || u.includes('pkm') || u.includes('passager.km');

  return (
    <Alert className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
      <Plane className="h-4 w-4 text-sky-600" />
      <AlertDescription className="space-y-3">
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 text-sky-600 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Facteurs ADEME pour <strong>vols passagers</strong>. Choisissez selon la donnée dont vous disposez :
            nombre de trajets ou passager.km.
          </p>
        </div>

        {showTrip && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">Par trajet</Badge>
              <span className="text-[11px] text-muted-foreground">kgCO₂e / trajet (aller simple, 1 passager)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {FLIGHT_PRESETS_BY_TRIP.map(p => (
                <Button
                  key={p.id}
                  type="button"
                  variant={selectedId === p.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-between h-auto py-2 px-2.5 text-left"
                  onClick={() => onSelect(p)}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium">{p.label}</span>
                    <span className="text-[10px] text-muted-foreground">{p.description}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">{p.factor} kg</Badge>
                    {selectedId === p.id && <Check className="h-3 w-3" />}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {showPkm && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">Par passager.km</Badge>
              <span className="text-[11px] text-muted-foreground">kgCO₂e / p.km (plus précis, distance connue)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {FLIGHT_PRESETS_BY_PKM.map(p => (
                <Button
                  key={p.id}
                  type="button"
                  variant={selectedId === p.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-between h-auto py-2 px-2.5 text-left"
                  onClick={() => onSelect(p)}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium">{p.label}</span>
                    <span className="text-[10px] text-muted-foreground">{p.description}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">{p.factor} kg</Badge>
                    {selectedId === p.id && <Check className="h-3 w-3" />}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic">
          Source : Base Empreinte ADEME 2024. Aller-retour = 2 × valeur "trajet".
        </p>
      </AlertDescription>
    </Alert>
  );
};
