import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  Zap, 
  Truck, 
  Package, 
  Trash2, 
  Calendar,
  FileQuestion
} from 'lucide-react';

interface DataBreakdown {
  energy: number;
  transport: number;
  inputs: number;
  waste: number;
  other: number;
}

interface CollectKPICardsProps {
  totalCount: number;
  breakdown: DataBreakdown;
  periodStart: string | null;
  periodEnd: string | null;
}

export const CollectKPICards: React.FC<CollectKPICardsProps> = ({
  totalCount,
  breakdown,
  periodStart,
  periodEnd,
}) => {
  if (totalCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            Aucune donnée n'a encore été saisie pour cette période.
          </p>
          <p className="text-sm text-muted-foreground">
            Commencez par ajouter vos premières données d'activité.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    { label: 'Total données', value: totalCount, icon: Database, color: 'text-primary' },
    { label: 'Énergie', value: breakdown.energy, icon: Zap, color: 'text-amber-600' },
    { label: 'Transport', value: breakdown.transport, icon: Truck, color: 'text-blue-600' },
    { label: 'Intrants', value: breakdown.inputs, icon: Package, color: 'text-purple-600' },
    { label: 'Déchets', value: breakdown.waste, icon: Trash2, color: 'text-emerald-600' },
  ];

  const formatPeriod = () => {
    if (!periodStart || !periodEnd) return 'Non définie';
    const start = new Date(periodStart).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    const end = new Date(periodEnd).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return `${start} – ${end}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <span className="text-sm text-muted-foreground">Période couverte : </span>
            <span className="text-sm font-medium text-foreground">{formatPeriod()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
