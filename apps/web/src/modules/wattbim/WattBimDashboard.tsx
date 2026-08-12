import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Gauge, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { useBuildings, useMeters, useReadings, useAlerts, useSavings } from './hooks';
import { useOrgCurrency } from './useOrgCurrency';
import { WattBimShellyPanel } from './WattBimShellyPanel';
import { WattBimSavingsFocus } from './WattBimSavingsFocus';
import { WattBimMeasurementCatalog } from './WattBimMeasurementCatalog';

export const WattBimDashboard: React.FC = () => {
  const currency = useOrgCurrency();
  const { data: buildings = [] } = useBuildings();
  const { data: meters = [] } = useMeters();
  const { data: readings = [] } = useReadings();
  const { data: alerts = [] } = useAlerts();
  const { data: savings = [] } = useSavings();

  const totals = useMemo(() => {
    const totalKwh = readings.reduce((s, r) => s + Number(r.value || 0), 0);
    const totalCost = readings.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
    const totalSavingsKwh = savings.reduce((s, r) => s + Number(r.savings_kwh || 0), 0);
    const totalSavingsAmount = savings.reduce((s, r) => s + Number(r.savings_amount || 0), 0);
    const openAlerts = alerts.filter(a => a.status === 'open').length;
    return { totalKwh, totalCost, totalSavingsKwh, totalSavingsAmount, openAlerts };
  }, [readings, savings, alerts]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">WattBim — Pilotage énergétique</h1>
          <p className="text-muted-foreground">Mesurez, détectez les gaspillages, garantissez vos économies.</p>
        </div>
        <Button asChild>
          <Link to="/app/wattbim/relevés"><Plus className="h-4 w-4 mr-2" />Nouveau relevé</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Building2 className="h-5 w-5" />} label="Bâtiments" value={buildings.length.toString()} hint={`${meters.length} compteurs`} />
        <KpiCard icon={<Gauge className="h-5 w-5" />} label="Consommation totale" value={`${fmt(totals.totalKwh)} kWh`} hint={`${fmt(totals.totalCost)} ${currency}`} />
        <KpiCard icon={<TrendingDown className="h-5 w-5" />} label="Économies cumulées" value={`${fmt(totals.totalSavingsKwh)} kWh`} hint={`${fmt(totals.totalSavingsAmount)} ${currency} évités`} accent="success" />
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Alertes ouvertes" value={totals.openAlerts.toString()} hint="Gaspillages détectés" accent={totals.openAlerts > 0 ? 'warning' : undefined} />
      </div>

      <WattBimSavingsFocus readings={readings} alerts={alerts} savings={savings} />

      <WattBimShellyPanel meters={meters} readings={readings} alerts={alerts} />

      <WattBimMeasurementCatalog />




      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bâtiments récents</CardTitle>
          </CardHeader>
          <CardContent>
            {buildings.length === 0 ? (
              <EmptyState label="Aucun bâtiment" cta="Ajouter un bâtiment" to="/app/wattbim/batiments" />
            ) : (
              <ul className="divide-y">
                {buildings.slice(0, 5).map(b => (
                  <li key={b.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.building_type} · {b.surface_m2 ?? '—'} m²</p>
                    </div>
                    <Badge variant="outline">{meters.filter(m => m.building_id === b.id).length} compteurs</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertes récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte. Ajoutez des relevés pour activer la détection.</p>
            ) : (
              <ul className="divide-y">
                {alerts.slice(0, 5).map(a => (
                  <li key={a.id} className="py-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{a.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.detected_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>{a.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string; accent?: 'success' | 'warning' }> = ({ icon, label, value, hint, accent }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
      <p className={`text-2xl font-bold mt-2 ${accent === 'success' ? 'text-green-600' : accent === 'warning' ? 'text-amber-600' : ''}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const EmptyState: React.FC<{ label: string; cta: string; to: string }> = ({ label, cta, to }) => (
  <div className="text-center py-6">
    <p className="text-sm text-muted-foreground mb-3">{label}</p>
    <Button asChild size="sm"><Link to={to}>{cta}</Link></Button>
  </div>
);
