import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Zap, Gauge, Waves, Moon, TrendingUp, TrendingDown, AlertTriangle,
  Sun, Snowflake, Lightbulb, Server, Factory, Building2, Clock, Wallet, LineChart, Radio
} from 'lucide-react';

type Measure = {
  key: string;
  label: string;
  unit: string;
  icon: React.ReactNode;
  desc: string;
  savings: string; // impact économique
  status: 'live' | 'derived' | 'planned';
};

const MEASURES: Measure[] = [
  // === Mesures brutes IoT ===
  { key: 'power', label: 'Puissance instantanée', unit: 'W / kW', icon: <Activity className="h-4 w-4" />, desc: 'Puissance active en temps réel par circuit', savings: 'Détecte surdimensionnement contrat STEG', status: 'live' },
  { key: 'energy', label: 'Énergie cumulée', unit: 'kWh', icon: <Zap className="h-4 w-4" />, desc: 'Consommation par période (15 min / heure / jour)', savings: 'Base de tout calcul d\'économie', status: 'live' },
  { key: 'voltage', label: 'Tension', unit: 'V', icon: <Gauge className="h-4 w-4" />, desc: 'Tension par phase', savings: 'Alerte sous/sur-tension → protège équipements', status: 'live' },
  { key: 'current', label: 'Courant', unit: 'A', icon: <Waves className="h-4 w-4" />, desc: 'Intensité par phase / circuit', savings: 'Détecte déséquilibre triphasé', status: 'live' },
  { key: 'pf', label: 'Facteur de puissance', unit: 'cos φ', icon: <LineChart className="h-4 w-4" />, desc: 'Qualité de la consommation', savings: 'Évite pénalités réactif STEG (jusqu\'à 8% facture)', status: 'live' },

  // === Répartition ===
  { key: 'circuit', label: 'Répartition par circuit', unit: '%', icon: <Zap className="h-4 w-4" />, desc: 'Général / Clim / Éclairage / IT / Production', savings: 'Cible les postes les plus lourds', status: 'derived' },
  { key: 'clim', label: 'Climatisation', unit: 'kWh', icon: <Snowflake className="h-4 w-4" />, desc: 'Suivi dédié CVC (souvent 40-60% en agence)', savings: '−15 à −25% avec consignes optimisées', status: 'derived' },
  { key: 'light', label: 'Éclairage', unit: 'kWh', icon: <Lightbulb className="h-4 w-4" />, desc: 'Consommation éclairage général', savings: '−60% via LED + détection présence', status: 'derived' },
  { key: 'it', label: 'IT / Serveurs', unit: 'kWh', icon: <Server className="h-4 w-4" />, desc: 'Baie informatique, onduleurs', savings: 'Détecte serveurs zombies (jusqu\'à 30%)', status: 'derived' },
  { key: 'prod', label: 'Production / Atelier', unit: 'kWh', icon: <Factory className="h-4 w-4" />, desc: 'Machines, four, compresseurs', savings: 'Base MACC industrielle', status: 'derived' },

  // === Analyses temporelles ===
  { key: 'night', label: 'Gaspillage nocturne', unit: 'kWh', icon: <Moon className="h-4 w-4" />, desc: 'Consommation 22h–6h vs jour', savings: 'Économie moyenne : 8–15% facture', status: 'derived' },
  { key: 'weekend', label: 'Consommation weekend', unit: 'kWh', icon: <Clock className="h-4 w-4" />, desc: 'Charge parasite hors ouverture', savings: 'Souvent 20-30% du talon supprimable', status: 'derived' },
  { key: 'peak', label: 'Pics de puissance', unit: 'kW', icon: <TrendingUp className="h-4 w-4" />, desc: 'Appels de puissance max', savings: 'Optimise puissance souscrite STEG', status: 'derived' },
  { key: 'baseload', label: 'Talon de consommation', unit: 'kW', icon: <TrendingDown className="h-4 w-4" />, desc: 'Puissance minimale permanente', savings: 'Chaque kW retiré = ~8 000 kWh/an', status: 'derived' },

  // === Économies & solaire ===
  { key: 'pv', label: 'Autoconsommation PV', unit: '%', icon: <Sun className="h-4 w-4" />, desc: 'Part solaire vs réseau', savings: 'Valide ROI installation photovoltaïque', status: 'derived' },
  { key: 'savings', label: 'Économies générées', unit: 'TND', icon: <Wallet className="h-4 w-4" />, desc: 'Baseline vs réel (IPMVP)', savings: 'Preuve chiffrée pour direction / CFO', status: 'derived' },
  { key: 'intensity', label: 'Intensité énergétique', unit: 'kWh/m² · kWh/employé', icon: <Building2 className="h-4 w-4" />, desc: 'Benchmark inter-sites', savings: 'Classe agences worst → best performers', status: 'derived' },

  // === Alertes ===
  { key: 'drift', label: 'Dérive de consommation', unit: '%', icon: <AlertTriangle className="h-4 w-4" />, desc: 'Écart vs profil habituel', savings: 'Détecte pannes clim, fuite frigo…', status: 'derived' },
  { key: 'iot-status', label: 'Statut passerelles', unit: 'online/offline', icon: <Radio className="h-4 w-4" />, desc: 'Santé des Shelly EM', savings: 'Garantit continuité des mesures', status: 'live' },
];

export const WattBimMeasurementCatalog: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Catalogue des mesures WattBim — focus économies
          </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-green-600 hover:bg-green-600">Live</Badge>
            <Badge variant="secondary">Calculé</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tout ce que la plateforme peut mesurer avec 1 Shelly EM par site, et l'impact €/TND associé.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MEASURES.map(m => (
            <div key={m.key} className="rounded-md border p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <span className="text-primary">{m.icon}</span>
                  {m.label}
                </div>
                <Badge
                  variant={m.status === 'live' ? 'default' : 'outline'}
                  className={m.status === 'live' ? 'bg-green-600 hover:bg-green-600 text-[10px]' : 'text-[10px]'}
                >
                  {m.status === 'live' ? 'Live' : 'Calculé'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{m.desc}</p>
              <div className="text-[11px] text-muted-foreground mb-2">Unité : <span className="font-mono">{m.unit}</span></div>
              <div className="flex items-start gap-1.5 text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded p-2">
                <Wallet className="h-3.5 w-3.5 text-green-700 dark:text-green-400 mt-0.5 shrink-0" />
                <span className="text-green-800 dark:text-green-300">{m.savings}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
