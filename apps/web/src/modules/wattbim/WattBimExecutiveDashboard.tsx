import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Gauge, TrendingDown, AlertTriangle, Zap, ArrowUpRight, Leaf } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useBuildings, useMeters, useReadings, useAlerts, useSavings } from './hooks';
import { useOrgCurrency } from './useOrgCurrency';

const METER_COLORS: Record<string, string> = {
  elec: 'hsl(45 95% 55%)',
  gas: 'hsl(24 90% 55%)',
  heat: 'hsl(0 75% 55%)',
  water: 'hsl(200 85% 55%)',
};
const METER_LABELS: Record<string, string> = {
  elec: 'Électricité', gas: 'Gaz', heat: 'Chaleur', water: 'Eau',
};

export const WattBimExecutiveDashboard: React.FC = () => {
  const currency = useOrgCurrency();
  const { data: buildings = [], isLoading: lb } = useBuildings();
  const { data: meters = [], isLoading: lm } = useMeters();
  const { data: readings = [], isLoading: lr } = useReadings();
  const { data: alerts = [] } = useAlerts();
  const { data: savings = [] } = useSavings();

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
  const loading = lb || lm || lr;

  const kpis = useMemo(() => {
    const totalKwh = readings.reduce((s, r) => s + Number(r.value || 0), 0);
    const totalCost = readings.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
    const totalSurface = buildings.reduce((s, b) => s + Number(b.surface_m2 || 0), 0);
    const intensity = totalSurface > 0 ? totalKwh / totalSurface : 0;
    const openAlerts = alerts.filter(a => a.status === 'open').length;
    const savedKwh = savings.reduce((s, r) => s + Number(r.savings_kwh || 0), 0);
    const savedAmount = savings.reduce((s, r) => s + Number(r.savings_amount || 0), 0);
    return { totalKwh, totalCost, intensity, openAlerts, savedKwh, savedAmount };
  }, [readings, buildings, alerts, savings]);

  // 12-month consumption series
  const monthlySeries = useMemo(() => {
    const map = new Map<string, { month: string; kwh: number; cost: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      map.set(key, { month: label, kwh: 0, cost: 0 });
    }
    readings.forEach(r => {
      const d = new Date(r.period_start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.kwh += Number(r.value || 0);
        bucket.cost += Number(r.cost_amount || 0);
      }
    });
    return Array.from(map.values());
  }, [readings]);

  // Energy mix by meter type
  const energyMix = useMemo(() => {
    const totals: Record<string, number> = {};
    readings.forEach(r => {
      const m = meters.find(m => m.id === r.meter_id);
      const type = m?.meter_type || 'elec';
      totals[type] = (totals[type] || 0) + Number(r.value || 0);
    });
    return Object.entries(totals).map(([type, value]) => ({
      name: METER_LABELS[type] || type,
      value,
      color: METER_COLORS[type] || 'hsl(var(--muted-foreground))',
    }));
  }, [readings, meters]);

  // Top buildings by intensity
  const topBuildings = useMemo(() => {
    return buildings.map(b => {
      const bMeters = meters.filter(m => m.building_id === b.id).map(m => m.id);
      const bKwh = readings.filter(r => bMeters.includes(r.meter_id)).reduce((s, r) => s + Number(r.value || 0), 0);
      const surface = Number(b.surface_m2 || 0);
      return {
        name: b.name.length > 20 ? b.name.slice(0, 18) + '…' : b.name,
        intensity: surface > 0 ? Math.round(bKwh / surface) : 0,
        kwh: bKwh,
      };
    }).sort((a, b) => b.intensity - a.intensity).slice(0, 5);
  }, [buildings, meters, readings]);

  const isEmpty = !loading && readings.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            WattBim — Pilotage énergétique
          </h1>
          <p className="text-muted-foreground text-sm">
            Vue exécutive de votre performance énergie & bâtiments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/wattbim/relevés">Nouveau relevé</Link>
          </Button>
          <Button asChild>
            <Link to="/app/wattbim">Ouvrir WattBim <ArrowUpRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </div>

      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">Commencez votre pilotage énergétique</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoutez vos bâtiments et importez vos relevés pour activer les KPI et la détection automatique.
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild><Link to="/app/wattbim/batiments">Ajouter un bâtiment</Link></Button>
              <Button variant="outline" asChild><Link to="/app/wattbim/relevés">Importer des relevés</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Gauge className="h-5 w-5" />}
          label="Consommation annuelle"
          value={`${fmt(kpis.totalKwh)} kWh`}
          hint={`${fmt(kpis.totalCost)} ${currency}`}
        />
        <KpiCard
          icon={<Building2 className="h-5 w-5" />}
          label="Intensité énergétique"
          value={`${fmt(kpis.intensity)} kWh/m²`}
          hint={`${buildings.length} bâtiment${buildings.length > 1 ? 's' : ''} · ${meters.length} compteurs`}
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Économies cumulées"
          value={`${fmt(kpis.savedKwh)} kWh`}
          hint={`${fmt(kpis.savedAmount)} ${currency} évités`}
          accent="success"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Alertes ouvertes"
          value={kpis.openAlerts.toString()}
          hint={kpis.openAlerts > 0 ? 'À traiter' : 'Aucune dérive détectée'}
          accent={kpis.openAlerts > 0 ? 'warning' : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Consommation — 12 derniers mois</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySeries}>
                <defs>
                  <linearGradient id="wbEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 95% 55%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(45 95% 55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => `${fmt(v)} kWh`}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="kwh" stroke="hsl(45 95% 45%)" fill="url(#wbEnergy)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mix énergétique</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {energyMix.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={energyMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {energyMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${fmt(v)} kWh`} />
                  <Legend verticalAlign="bottom" height={30} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top bâtiments — intensité kWh/m²</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {topBuildings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">Ajoutez des bâtiments et surfaces pour voir le classement</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBuildings} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
                  <Tooltip
                    formatter={(v: number) => `${fmt(v)} kWh/m²`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Bar dataKey="intensity" fill="hsl(45 95% 55%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte. Les dérives seront détectées automatiquement dès que vous aurez plusieurs mois de relevés.</p>
            ) : (
              <ul className="divide-y max-h-64 overflow-auto">
                {alerts.slice(0, 6).map(a => (
                  <li key={a.id} className="py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.detected_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant={a.severity === 'high' ? 'destructive' : 'outline'} className="shrink-0 capitalize">
                      {a.severity}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
              <Link to="/app/wattbim/alertes">Voir toutes les alertes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upsell carbon */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <Leaf className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Convertissez vos kWh en tCO2e</p>
              <p className="text-sm text-muted-foreground">
                Activez le module Bilan Carbone pour transformer automatiquement vos relevés WattBim en Scope 2 conforme GHG Protocol.
              </p>
            </div>
          </div>
          <Button asChild><Link to="/contact">Ajouter Bilan Carbone</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'success' | 'warning';
}
const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, hint, accent }) => {
  const accentClass =
    accent === 'success' ? 'text-emerald-600' :
    accent === 'warning' ? 'text-amber-600' :
    'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
};

export default WattBimExecutiveDashboard;
