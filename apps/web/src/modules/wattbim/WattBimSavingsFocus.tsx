import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LabelList,
  LineChart, Line, CartesianGrid, Tooltip, ReferenceDot,
} from 'recharts';
import {
  Wallet, Target, FileText, Leaf, Sun, Snowflake, Moon, Zap, Server, Flag, Sparkles, LineChart as LineIcon,
} from 'lucide-react';
import type { WattBimReading, WattBimAlert, WattBimSaving } from './types';
import { useOrgCurrency } from './useOrgCurrency';

type Props = {
  readings: WattBimReading[];
  alerts: WattBimAlert[];
  savings: WattBimSaving[];
};

const TARIF_KWH_TND = 0.33;
const FE_KG_PER_KWH = 0.43; // STEG mix ~ ADEME/IEA
const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
const fmt1 = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);

// palette semantic (dérivée des tokens verts/ambre existants)
const COLORS = ['hsl(142 71% 45%)', 'hsl(160 60% 40%)', 'hsl(38 92% 55%)', 'hsl(24 90% 55%)', 'hsl(210 60% 55%)'];

export const WattBimSavingsFocus: React.FC<Props> = ({ readings, alerts, savings }) => {
  const currency = useOrgCurrency();

  const stats = useMemo(() => {
    const totalKwh = readings.reduce((s, r) => s + Number(r.value || 0), 0);
    const totalCost = readings.reduce((s, r) => s + Number(r.cost_amount || 0), 0)
      || totalKwh * TARIF_KWH_TND;

    const dates = readings.map(r => new Date(r.period_start).getTime()).filter(t => !isNaN(t));
    let daysCovered = 30;
    if (dates.length >= 2) daysCovered = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / 86400000 + 1);
    const annualFactor = 365 / daysCovered;
    const annualKwh = totalKwh * annualFactor;

    const realizedKwh = savings.reduce((s, r) => s + Number(r.savings_kwh || 0), 0);
    const realizedAmount = savings.reduce((s, r) => s + Number(r.savings_amount || 0), 0)
      || realizedKwh * TARIF_KWH_TND;

    const nightKwh = alerts.filter(a => a.alert_type === 'night_consumption')
      .reduce((s, a) => s + Number(a.value_observed || 0), 0);

    const kwhPV = annualKwh * 0.20;
    const kwhClim = annualKwh * 0.15;
    const kwhNight = nightKwh > 0 ? nightKwh * 0.7 * annualFactor : annualKwh * 0.10;
    const kwhLight = annualKwh * 0.05;
    const kwhIT = annualKwh * 0.03;

    const items = [
      { key: 'pv',    label: 'Autoconsommation solaire', short: 'Autoconso solaire', icon: Sun,      kwh: kwhPV,    action: 'ROI 4–6 ans en toiture' },
      { key: 'clim',  label: 'Optimisation climatisation', short: 'Climatisation',   icon: Snowflake,kwh: kwhClim,  action: 'Consignes 24°C été / 20°C hiver' },
      { key: 'night', label: 'Extinction nocturne & weekend', short: 'Nocturne & WE',icon: Moon,     kwh: kwhNight, action: 'Programmer coupures 22h–6h + WE' },
      { key: 'light', label: 'Relamping LED + présence', short: 'LED + présence',    icon: Zap,      kwh: kwhLight, action: 'ROI < 2 ans' },
      { key: 'it',    label: 'Serveurs zombies / veille', short: 'Serveurs zombies', icon: Server,   kwh: kwhIT,    action: 'Coupure baies hors ouverture' },
    ]
      .map(x => ({ ...x, amount: x.kwh * TARIF_KWH_TND }))
      .sort((a, b) => b.amount - a.amount);

    const totalPotentialKwh = items.reduce((s, x) => s + x.kwh, 0);
    const totalPotentialTND = totalPotentialKwh * TARIF_KWH_TND;
    const totalCO2t = (totalPotentialKwh * FE_KG_PER_KWH) / 1000;

    // Cumulé pour la courbe (Départ + chaque poste)
    let running = 0;
    const cumulative = [
      { name: 'Départ', short: 'Départ', value: 0 },
      ...items.map((x, i) => {
        running += x.amount;
        return { name: `#${i + 1} ${x.short}`, short: x.short, value: Math.round(running) };
      }),
    ];

    return {
      totalCost, realizedAmount, realizedKwh,
      totalPotentialTND, totalPotentialKwh, totalCO2t,
      items, cumulative,
      progressPct: totalPotentialTND > 0 ? Math.min(100, (realizedAmount / totalPotentialTND) * 100) : 0,
    };
  }, [readings, alerts, savings]);

  const donutData = stats.items.map((x, i) => ({ name: x.short, value: Math.round(x.amount), color: COLORS[i] }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Focus économies — gisements identifiés</h2>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 gap-1">
          <Target className="h-3 w-3" />
          Potentiel {fmt(stats.totalPotentialTND)} {currency}/an
        </Badge>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiTile
          icon={<FileText className="h-5 w-5 text-emerald-600" />}
          label="Facture énergétique suivie"
          value={`${fmt(stats.totalCost)} ${currency}`}
          hint="Sur période mesurée"
        />
        <KpiTile
          icon={<Leaf className="h-5 w-5 text-emerald-600" />}
          label="Économies réalisées"
          value={`${fmt(stats.realizedAmount)} ${currency}`}
          hint={`${fmt(stats.realizedKwh)} kWh évités (IPMVP)`}
          accent="success"
        />
        <KpiTile
          icon={<Target className="h-5 w-5 text-amber-600" />}
          label="Potentiel restant"
          value={`${fmt(stats.totalPotentialTND)} ${currency}`}
          hint="Somme des gisements ci-dessous"
          accent="warning"
        />
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Progression sur le potentiel</span>
            <span className="text-muted-foreground">{stats.progressPct.toFixed(0)}%</span>
          </div>
          <Progress value={stats.progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Donut + Top 5 bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Répartition du potentiel par impact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${fmt(v)} ${currency}/an`, 'Potentiel']}
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-2xl font-bold">{fmt(stats.totalPotentialTND)}</div>
                  <div className="text-xs text-muted-foreground">{currency}/an</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                {donutData.map((d, i) => {
                  const pct = stats.totalPotentialTND > 0 ? (d.value / stats.totalPotentialTND) * 100 : 0;
                  return (
                    <li key={d.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums">{fmt1(pct)}%</span>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{fmt(stats.totalPotentialTND)} {currency}/an</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Top 5 des gisements d'économies</h3>
              <span className="text-[11px] text-muted-foreground">{currency}/an</span>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.items.map((x, i) => ({ name: `#${i + 1}  ${x.short}`, value: Math.round(x.amount) }))}
                  layout="vertical"
                  margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v)} ${currency}/an`, 'Économie']}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={14} fill="hsl(142 71% 45%)">
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: number) => fmt(v)}
                      style={{ fill: 'hsl(142 71% 30%)', fontWeight: 700, fontSize: 12 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative line + Impact global */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Potentiel d'économies cumulé</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.cumulative} margin={{ top: 20, right: 24, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmt(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v)} ${currency}/an`, 'Cumulé']}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(142 71% 40%)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'hsl(142 71% 40%)', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => fmt(v)}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 600 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Impact global estimé</h3>
            </div>
            <ImpactStat
              value={`${fmt(stats.totalPotentialTND)} ${currency}/an`}
              label="Potentiel total d'économies"
            />
            <ImpactStat
              value={`~ ${fmt(stats.totalPotentialKwh)} kWh/an`}
              label="Économies d'énergie estimées"
            />
            <ImpactStat
              value={<>~ {fmt1(stats.totalCO2t)} tCO<sub>2</sub>/an</>}
              label="Émissions évitées estimées"
            />
            <p className="text-[11px] text-muted-foreground pt-2 border-t">
              Calculs basés sur facteurs d'émission ADEME/IEA
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tarif de référence : {TARIF_KWH_TND} {currency}/kWh (tertiaire STEG moyen). Les gisements combinent alertes détectées et benchmarks sectoriels ADEME/IEA.
      </p>
    </div>
  );
};

const KpiTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'success' | 'warning';
}> = ({ icon, label, value, hint, accent }) => (
  <Card>
    <CardContent className="pt-5 pb-5">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
          accent === 'warning' ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40'
        }`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${
            accent === 'success' ? 'text-emerald-600' :
            accent === 'warning' ? 'text-amber-600' : ''
          }`}>
            {value}
          </p>
          {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ImpactStat: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <div>
    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);
