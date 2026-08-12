import React from 'react';
import { Database, Calendar, Clock, BarChart3 } from 'lucide-react';

interface DataBreakdown {
  energy: number;
  transport: number;
  inputs: number;
  waste: number;
  other: number;
}

interface CollectCompactKPIsProps {
  totalCount: number;
  breakdown: DataBreakdown;
  periodStart: string | null;
  periodEnd: string | null;
  lastUpdate?: string | null;
  legacyEmissionsTons?: number | null;
}

export const CollectCompactKPIs: React.FC<CollectCompactKPIsProps> = ({
  totalCount,
  breakdown,
  periodStart,
  periodEnd,
  lastUpdate,
  legacyEmissionsTons,
}) => {
  const formatPeriod = () => {
    if (!periodStart || !periodEnd) return 'Non définie';
    const start = new Date(periodStart).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    const end = new Date(periodEnd).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return start === end ? start : `${start} – ${end}`;
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Jamais';
    return new Date(lastUpdate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const coveredTypes: string[] = [];
  if (breakdown.energy > 0) coveredTypes.push('Énergie');
  if (breakdown.transport > 0) coveredTypes.push('Transport');
  if (breakdown.inputs > 0) coveredTypes.push('Achats');
  if (breakdown.waste > 0) coveredTypes.push('Déchets');
  if (breakdown.other > 0) coveredTypes.push('Autre');

  const totalCategories = 5;
  const completeness = Math.round((coveredTypes.length / totalCategories) * 100);
  const typesLabel =
    coveredTypes.length > 0
      ? coveredTypes.length <= 2
        ? coveredTypes.join(', ')
        : `${coveredTypes.slice(0, 2).join(', ')} +${coveredTypes.length - 2}`
      : 'Aucun';

  const cards = [
    {
      icon: Database,
      value: totalCount === 0 && legacyEmissionsTons && legacyEmissionsTons > 0 ? `${legacyEmissionsTons.toLocaleString('fr-FR')} t (bilan)` : totalCount,
      label: 'Données collectées',
      sub: null,
      accent: 'emerald',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: BarChart3,
      value: null,
      label: 'Types couverts',
      sub: typesLabel,
      accent: 'cyan',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      icon: Clock,
      value: null,
      label: 'Dernière mise à jour',
      sub: formatLastUpdate(),
      accent: 'slate',
      iconBg: 'bg-slate-500/10',
      iconColor: 'text-slate-600 dark:text-slate-400',
    },
    {
      icon: Calendar,
      value: `${completeness}%`,
      label: 'Complétude estimée',
      sub: null,
      accent: completeness >= 80 ? 'emerald' : completeness >= 40 ? 'amber' : 'slate',
      iconBg:
        completeness >= 80
          ? 'bg-emerald-500/10'
          : completeness >= 40
            ? 'bg-amber-500/10'
            : 'bg-slate-500/10',
      iconColor:
        completeness >= 80
          ? 'text-emerald-600 dark:text-emerald-400'
          : completeness >= 40
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-slate-600 dark:text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-slate-700/80 bg-white dark:bg-slate-900/50 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              {card.value !== null && (
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {typeof card.value === 'number' ? card.value.toLocaleString('fr-FR') : card.value}
                </span>
              )}
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            {card.sub && (
              <p className="mt-1 text-sm font-medium text-foreground truncate" title={card.sub}>
                {card.sub}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
