import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Info, Check } from 'lucide-react';

/**
 * Facteurs monétaires ADEME Base Empreinte® (ratios kgCO₂e / €)
 * Regroupés par type de dépense (Moyens généraux, IT, Marketing, etc.)
 * Source : Base Empreinte ADEME 2024 — ratios monétaires
 */
export interface MonetaryFactorPreset {
  id: string;
  label: string;
  factorEur: number; // kgCO₂e par €
  description: string;
  source: string;
}

export const MONETARY_FACTORS_BY_FAMILY: Record<string, {
  label: string;
  presets: MonetaryFactorPreset[];
}> = {
  moyens_generaux: {
    label: 'Moyens généraux (OPEX)',
    presets: [
      { id: 'opex-generic', label: 'OPEX générique', factorEur: 0.25, description: 'Ratio moyen dépenses opérationnelles', source: 'ADEME' },
      { id: 'fournitures-admin', label: 'Fournitures administratives', factorEur: 0.31, description: 'Papeterie, consommables bureau', source: 'ADEME' },
      { id: 'nettoyage', label: 'Nettoyage & entretien', factorEur: 0.16, description: 'Services de propreté, entretien locaux', source: 'ADEME' },
      { id: 'maintenance', label: 'Maintenance bâtiment', factorEur: 0.22, description: 'Travaux d\'entretien & réparations', source: 'ADEME' },
      { id: 'assurance', label: 'Assurance', factorEur: 0.10, description: 'Primes d\'assurance professionnelle', source: 'ADEME' },
      { id: 'autres-services', label: 'Autres services', factorEur: 0.20, description: 'Services divers non catégorisés', source: 'ADEME' },
    ],
  },
  services_pro: {
    label: 'Prestations de services',
    presets: [
      { id: 'conseil', label: 'Conseil & audit', factorEur: 0.11, description: 'Cabinets de conseil, audit, expertise', source: 'ADEME' },
      { id: 'juridique', label: 'Services juridiques', factorEur: 0.09, description: 'Avocats, notaires, contentieux', source: 'ADEME' },
      { id: 'comptabilite', label: 'Comptabilité & finance', factorEur: 0.10, description: 'Experts-comptables, CAC', source: 'ADEME' },
      { id: 'formation', label: 'Formation professionnelle', factorEur: 0.13, description: 'Prestations pédagogiques', source: 'ADEME' },
      { id: 'interim', label: 'Intérim & recrutement', factorEur: 0.12, description: 'Cabinets RH, agences d\'intérim', source: 'ADEME' },
    ],
  },
  informatique: {
    label: 'Services informatiques',
    presets: [
      { id: 'saas', label: 'Logiciels SaaS / abonnements', factorEur: 0.18, description: 'Licences cloud, applications web', source: 'ADEME' },
      { id: 'hosting', label: 'Hébergement & cloud', factorEur: 0.28, description: 'Datacenter, IaaS, PaaS', source: 'ADEME' },
      { id: 'infogerance', label: 'Infogérance & TMA', factorEur: 0.15, description: 'Maintenance applicative, support', source: 'ADEME' },
      { id: 'devs', label: 'Développement logiciel', factorEur: 0.11, description: 'Prestations de développement', source: 'ADEME' },
      { id: 'telecom', label: 'Télécoms & internet', factorEur: 0.22, description: 'Abonnements téléphonie, fibre', source: 'ADEME' },
    ],
  },
  marketing: {
    label: 'Marketing & communication',
    presets: [
      { id: 'publicite', label: 'Publicité & campagnes', factorEur: 0.34, description: 'Achat d\'espace, campagnes média', source: 'ADEME' },
      { id: 'evenementiel', label: 'Événementiel', factorEur: 0.42, description: 'Salons, séminaires, congrès', source: 'ADEME' },
      { id: 'communication', label: 'Communication corporate', factorEur: 0.20, description: 'Agences de communication', source: 'ADEME' },
      { id: 'impression', label: 'Impression & édition', factorEur: 0.85, description: 'Supports imprimés, plaquettes', source: 'ADEME' },
    ],
  },
  achats_biens: {
    label: 'Achats de biens matériels',
    presets: [
      { id: 'mobilier', label: 'Mobilier de bureau', factorEur: 0.55, description: 'Sièges, bureaux, aménagement', source: 'ADEME' },
      { id: 'materiel-it', label: 'Matériel informatique', factorEur: 0.32, description: 'Ordinateurs, écrans, périphériques', source: 'ADEME' },
      { id: 'petit-outillage', label: 'Petit outillage & fournitures', factorEur: 0.40, description: 'Consommables, outillage divers', source: 'ADEME' },
    ],
  },
  benchmarks: {
    label: 'Benchmarks internationaux',
    presets: [
      { id: 'defra-services', label: 'DEFRA · Business services (UK)', factorEur: 0.10, description: 'Facteur UK — services aux entreprises', source: 'DEFRA' },
      { id: 'exiobase-services', label: 'Exiobase · Services génériques', factorEur: 0.15, description: 'Base multi-régions, ratio économique moyen', source: 'Exiobase' },
    ],
  },
};

const FX_TO_EUR: Record<string, number> = {
  EUR: 1, '€': 1,
  USD: 0.92, $: 0.92,
  TND: 0.30, DT: 0.30,
  MAD: 0.093, DZD: 0.007, XOF: 0.00152,
};

const MONETARY_UNITS = new Set([
  '€', 'EUR', 'euro', 'euros',
  '$', 'USD', 'dollar', 'dollars',
  'TND', 'DT', 'dinar', 'dinars',
  'MAD', 'DZD', 'XOF',
  'k€', 'kEUR', 'kTND', 'kDT',
]);

export function isMonetaryUnit(unit?: string | null): boolean {
  if (!unit) return false;
  return MONETARY_UNITS.has(unit.trim());
}

interface Props {
  unit: string;
  onSelect: (factor: number, label: string) => void;
  selectedLabel?: string | null;
}

export const MonetaryFactorPresets: React.FC<Props> = ({ unit, onSelect, selectedLabel }) => {
  const fx = FX_TO_EUR[unit.trim()] ?? 1;
  const families = Object.entries(MONETARY_FACTORS_BY_FAMILY);
  const [activeFamily, setActiveFamily] = useState<string>(families[0][0]);
  const active = MONETARY_FACTORS_BY_FAMILY[activeFamily];

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-900">
          Facteurs monétaires Base Empreinte® ({unit})
        </span>
      </div>

      <Alert className="border-amber-200 bg-white/70 py-2">
        <Info className="h-3.5 w-3.5" />
        <AlertDescription className="text-xs text-amber-900">
          Dépense exprimée en <strong>{unit}</strong>. Choisissez le <strong>type de dépense</strong> :
          CarboScan applique le facteur monétaire ADEME correspondant.
        </AlertDescription>
      </Alert>

      {/* Sélecteur de famille */}
      <div className="flex flex-wrap gap-1">
        {families.map(([key, family]) => (
          <Button
            key={key}
            type="button"
            variant={activeFamily === key ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setActiveFamily(key)}
          >
            {family.label}
          </Button>
        ))}
      </div>

      {/* Presets de la famille active */}
      <div className="grid gap-1.5">
        {active.presets.map(p => {
          const converted = Math.round(p.factorEur * fx * 1000) / 1000;
          const isSelected = selectedLabel === `${active.label} · ${p.label}`;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(converted, `${active.label} · ${p.label}`)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition ${
                isSelected
                  ? 'border-amber-500 bg-amber-100'
                  : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  {isSelected && <Check className="h-3 w-3 text-amber-600" />}
                  {p.label}
                </span>
                <span className="text-[10px] text-slate-500 truncate">{p.description}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                  {converted} kgCO₂e / {unit}
                </Badge>
                <Badge variant="outline" className="text-[9px] whitespace-nowrap">
                  {p.source}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-amber-800 leading-snug">
        Ratios monétaires ADEME Base Empreinte® 2024, convertis depuis kgCO₂e/€ vers {unit}
        (taux moyen annuel). Conforme aux bonnes pratiques Bilan Carbone®.
      </p>
    </div>
  );
};
