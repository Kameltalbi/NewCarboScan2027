// Hero-style dashboard: reproduces the marketing hero preview layout
// while consuming real data from DashboardAggregator when available.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Cloud,
  TrendingDown,
  Factory,
  Truck,
  Sparkles,
  Globe,
  ShieldCheck,
  FileText,
  ArrowRight,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { useOrganizationYears } from '@/hooks/useOrganizationYears';
import { api } from '@/integrations/api/client';

import aiInsightAvatar from '@/assets/ai-insight-avatar.png';
import {
  DashboardAggregator,
  type DashboardAggregatedData,
} from '@/lib/calculators/DashboardAggregator';

interface Props {
  selectedYear?: number;
}

const SCOPE_COLORS = ['#22c55e', '#3b82f6', '#a78bfa'];
const CATEGORY_COLORS = ['#22c55e', '#3b82f6', '#a78bfa', '#f59e0b', '#14b8a6'];

const KG_TO_T = 0.001;
const AI_AVATAR_SRC = aiInsightAvatar;
const toT = (n: number) => n * KG_TO_T;
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

const CURRENCY_LABEL: Record<string, string> = {
  TND: 'DT',
  EUR: '€',
  USD: '$',
  MAD: 'MAD',
  XOF: 'FCFA',
};

export const HeroStyleDashboard: React.FC<Props> = ({ selectedYear }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, organizationLoading } = useAppData();
  const { referenceYear, organization } = useOrganizationData();
  const { defaultYear } = useOrganizationYears(organizationId);
  const [headerYear, setHeaderYear] = useState<number | null>(null);
  const activeYear = selectedYear ?? headerYear ?? defaultYear ?? referenceYear;
  const { sites } = useOrganizationSites(organizationId ?? undefined);

  useEffect(() => {
    const handler = (event: Event) => {
      const year = (event as CustomEvent<number>).detail;
      if (typeof year === 'number' && Number.isFinite(year)) {
        setHeaderYear(year);
      }
    };
    window.addEventListener('dashboardYearChange', handler);
    return () => window.removeEventListener('dashboardYearChange', handler);
  }, []);



  const [data, setData] = useState<DashboardAggregatedData | null>(null);
  const [yearlyTotals, setYearlyTotals] = useState<Array<{ year: number; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !organizationId || organizationLoading) return;
      try {
        setLoading(true);
        const cur = await DashboardAggregator.aggregate(
          organizationId,
          `${activeYear}-01-01`,
          `${activeYear}-12-31`,
        );
        setData(cur);
        try {
          const { items } = await api.listBilans();
          const byYear = new Map<number, number>();
          for (const row of items || []) {
            const y = Number(row.year);
            const year = Number.isInteger(y) && y >= 2000
              ? y
              : row.date_bilan
                ? new Date(String(row.date_bilan)).getFullYear()
                : null;
            if (year == null || !Number.isInteger(year)) continue;
            const tonnes = Number(row.total_emission ?? row.total_kgco2e ?? 0) || 0;
            byYear.set(year, Math.max(byYear.get(year) ?? 0, tonnes));
          }
          setYearlyTotals(
            [...byYear.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([year, value]) => ({ year, value })),
          );
        } catch {
          setYearlyTotals([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, organizationId, organizationLoading, activeYear]);

  const hasReal = !!data && data.bilanCarbone.totalEmissions > 0;

  // Values (real if available, else demo values matching the hero preview)
  const kpis = useMemo(() => {
    if (hasReal && data) {
      const total = toT(data.bilanCarbone.totalEmissions);
      const s1 = toT(data.bilanCarbone.scope1);
      const s2 = toT(data.bilanCarbone.scope2);
      const s3 = toT(data.bilanCarbone.scope3);
      const s12 = s1 + s2;
      const prevYearTotal = yearlyTotals.find((y) => y.year === activeYear - 1)?.value ?? 0;
      const evo =
        prevYearTotal > 0 && total > 0
          ? ((total - prevYearTotal) / prevYearTotal) * 100
          : null;
      return {
        total,
        intensity: null as number | null,
        s12,
        s3,
        evo,
        s12Pct: total ? (s12 / total) * 100 : 0,
        s3Pct: total ? (s3 / total) * 100 : 0,
      };
    }
    return {
      total: 0,
      intensity: null as number | null,
      s12: 0,
      s3: 0,
      evo: null as number | null,
      s12Pct: 0,
      s3Pct: 0,
    };
  }, [hasReal, data, yearlyTotals, activeYear]);

  // Agrégats sites (fallback quand l'organisation n'a pas ces champs renseignés)
  const siteTotals = useMemo(() => {
    return sites.reduce(
      (acc, s) => ({
        employees: acc.employees + (Number(s.employees_count) || 0),
        surface: acc.surface + (Number(s.surface_m2) || 0),
      }),
      { employees: 0, surface: 0 },
    );
  }, [sites]);

  // Intensité carbone adaptative : CA (meilleur KPI) > effectif > surface
  const intensityKpi = useMemo(() => {
    const total = kpis.total; // tCO2e
    const revenue = Number(organization?.annual_revenue) || 0;
    const employees = Number(organization?.employees) || siteTotals.employees;
    const surface = Number(organization?.total_surface) || siteTotals.surface;
    const sym = CURRENCY_LABEL[organization?.currency || 'TND'] || organization?.currency || '';

    if (!hasReal || total <= 0) return null;

    if (revenue > 0) {
      const value = (total * 1000) / (revenue / 1000); // kgCO2e / k(devise)
      return {
        value: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value),
        unit: `kgCO₂e / k${sym} CA`,
        footer: 'Basée sur le chiffre d’affaires renseigné',
      };
    }
    if (employees > 0) {
      return {
        value: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(total / employees),
        unit: 'tCO₂e / collaborateur',
        footer: `Sur la base de ${employees} collaborateurs (CA non renseigné)`,
      };
    }
    if (surface > 0) {
      return {
        value: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format((total * 1000) / surface),
        unit: 'kgCO₂e / m²',
        footer: `Sur la base de ${new Intl.NumberFormat('fr-FR').format(surface)} m² (CA non renseigné)`,
      };
    }
    return null;
  }, [kpis.total, organization, hasReal, siteTotals]);



  const scopeData = useMemo(() => {
    if (hasReal && data) {
      return [
        { name: 'Scope 1', value: toT(data.bilanCarbone.scope1) },
        { name: 'Scope 2', value: toT(data.bilanCarbone.scope2) },
        { name: 'Scope 3', value: toT(data.bilanCarbone.scope3) },
      ];
    }
    return [
      { name: 'Scope 1', value: 2192 },
      { name: 'Scope 2', value: 4934 },
      { name: 'Scope 3', value: 5332 },
    ];
  }, [hasReal, data]);

  const evolution = useMemo(() => {
    const byYear = new Map(yearlyTotals.map((row) => [row.year, row.value]));
    if (hasReal && data) {
      const current = toT(data.bilanCarbone.totalEmissions);
      if (current > 0 && (byYear.get(activeYear) ?? 0) <= 0) {
        byYear.set(activeYear, current);
      }
    }
    const baselineYear = byYear.has(2025)
      ? 2025
      : [...byYear.entries()].filter(([, v]) => v > 0).sort((a, b) => b[0] - a[0])[0]?.[0];
    const baseline = baselineYear != null ? byYear.get(baselineYear) ?? 0 : 0;
    if (baseline <= 0) return [];
    const start = activeYear - 4;
    return Array.from({ length: 5 }, (_, i) => {
      const year = start + i;
      const real = byYear.get(year) ?? 0;
      return { year, value: Math.round(real > 0 ? real : baseline) };
    });
  }, [yearlyTotals, hasReal, data, activeYear]);

  const topCategories = useMemo(() => {
    if (hasReal && data && data.bilanCarbone.breakdown.length > 0) {
      return data.bilanCarbone.breakdown.slice(0, 5).map((b) => ({
        label: b.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value: toT(b.emissions),
        pct: b.percentage,
      }));
    }
    return [
      { label: 'Achats de biens et services', value: 4350, pct: 35 },
      { label: 'Énergie', value: 2870, pct: 23 },
      { label: 'Transport et déplacements', value: 1980, pct: 16 },
      { label: 'Déchets', value: 1250, pct: 10 },
      { label: 'Immobilisations', value: 650, pct: 5 },
    ];
  }, [hasReal, data]);

  const maxCat = Math.max(...topCategories.map((c) => c.value), 1);

  if (loading || organizationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasReal) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Année {activeYear}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Votre tableau de bord est prêt</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Aucune donnée carbone n'est encore enregistrée. Démarrez une collecte pour construire votre premier bilan avec vos propres données.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate('/app/collecte/nouvelle?mode=bilan-carbone')}>
              Démarrer une collecte
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/bilan-carbone')}>
              Ouvrir Bilan Carbone
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Les indicateurs apparaîtront ici uniquement après l'enregistrement de données réelles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          icon={<Cloud className="h-6 w-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="ÉMISSIONS TOTALES"
          value={fmt(kpis.total)}
          unit="tCO₂e"
          delta={kpis.evo ?? undefined}
          deltaLabel={kpis.evo == null ? undefined : `vs ${activeYear - 1}`}
        />
        <KpiCard
          icon={<TrendingDown className="h-6 w-6 text-sky-600" />}
          iconBg="bg-sky-50"
          label="INTENSITÉ CARBONE"
          value={intensityKpi ? intensityKpi.value : '—'}
          unit={intensityKpi ? intensityKpi.unit : 'Donnée non renseignée'}
          footer={
            intensityKpi
              ? intensityKpi.footer
              : 'Renseignez le CA, l’effectif ou la surface dans Paramètres > Organisation'
          }
        />

        <KpiCard
          icon={<Factory className="h-6 w-6 text-violet-600" />}
          iconBg="bg-violet-50"
          label="SCOPE 1 + 2"
          value={fmt(kpis.s12)}
          unit="tCO₂e"
          footer={`${Math.round(kpis.s12Pct)}% des émissions totales`}
        />
        <KpiCard
          icon={<Truck className="h-6 w-6 text-amber-600" />}
          iconBg="bg-amber-50"
          label="SCOPE 3"
          value={fmt(kpis.s3)}
          unit="tCO₂e"
          footer={`${Math.round(kpis.s3Pct)}% des émissions totales`}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Répartition des émissions par scope
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-52 h-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scopeData}
                    dataKey="value"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {scopeData.map((_, i) => (
                      <Cell key={i} fill={SCOPE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-bold text-foreground">{fmt(kpis.total)}</div>
                <div className="text-xs text-muted-foreground">tCO₂e</div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {scopeData.map((s, i) => {
                const pct = kpis.total ? (s.value / kpis.total) * 100 : 0;
                return (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: SCOPE_COLORS[i] }}
                      />
                      <span className="text-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{fmt(s.value)} tCO₂e</span>
                      <span className="text-muted-foreground w-10 text-right">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Evolution */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Évolution des émissions</h3>
            <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
              Annuel
            </span>
          </div>
          {evolution.length === 0 ? (
            <p className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              Aucun bilan annuel à tracer.
            </p>
          ) : (
          <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hsdArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, (max: number) => (max > 0 ? max * 1.15 : 1)]}
                  tickFormatter={(v) =>
                    v >= 1000
                      ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v / 1000)}k`
                      : fmt(v)
                  }
                  className="text-xs"
                />
                <Tooltip
                  formatter={(v: number) => [`${fmt(v)} tCO₂e`, 'Émissions']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fill="url(#hsdArea)"
                  dot={{ r: 4, fill: '#16a34a' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Années sans bilan : mêmes émissions que{' '}
              {yearlyTotals.some((row) => row.year === 2025 && row.value > 0) ? '2025' : 'l’exercice disponible'}
              {' '}(pas d’évolution).
            </p>
          </>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 5 categories */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Émissions par catégorie (Top 5)
          </h3>
          <div className="space-y-4">
            {topCategories.map((c, i) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground">{c.label}</span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{fmt(c.value)}</span> tCO₂e ·{' '}
                    {Math.round(c.pct)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(c.value / maxCat) * 100}%`,
                      background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Actions en cours</h3>
          <p className="text-sm text-muted-foreground">
            Aucune action de réduction n'est affichée ici tant qu'elle n'est pas enregistrée dans le plan d'actions.
          </p>
          <button
            className="mt-4 text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
            onClick={() => navigate('/app/net-zero')}
          >
            Ouvrir le plan d'actions <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Insight IA */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-foreground">Insight IA</h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {kpis.evo == null ? (
              <>
                Pas de comparaison possible avec {activeYear - 1} : aucun bilan enregistré pour cette année.
                Les années vides du graphique réutilisent l'exercice disponible, sans inventer d'évolution.
              </>
            ) : (
              <>
                Vos émissions ont{' '}
                {kpis.evo < 0 ? 'diminué' : 'augmenté'} de{' '}
                <span className="font-semibold">{Math.abs(kpis.evo).toFixed(1)}%</span> par rapport à{' '}
                {activeYear - 1}.
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            La catégorie «&nbsp;<span className="text-foreground">{topCategories[0]?.label}</span>&nbsp;» représente{' '}
            <span className="font-semibold text-foreground">
              {Math.round(topCategories[0]?.pct || 0)}%
            </span>{' '}
            de vos émissions. Nous recommandons d'analyser vos leviers prioritaires.
          </p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <button className="text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1">
              Voir les recommandations <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <img
              src={AI_AVATAR_SRC}
              alt="Mascotte Insight IA CarboScan"
              className="w-20 h-20 md:w-24 md:h-24 object-contain shrink-0"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* COMPLIANCE FOOTER */}
      <div className="bg-card rounded-2xl border border-border px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-6">
          <ComplianceBadge icon={<Globe className="h-4 w-4" />} label="Calcul interne" />
          <ComplianceBadge icon={<ShieldCheck className="h-4 w-4" />} label="Non vérifié par un tiers" />
          <ComplianceBadge icon={<FileText className="h-4 w-4" />} label="Couverture partielle" />
        </div>
        <div className="text-xs text-muted-foreground">
          Dernière mise à jour :{' '}
          {new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
};

// ---- Sub-components ----

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  unit: string;
  delta?: number;
  deltaLabel?: string;
  footer?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  iconBg,
  label,
  value,
  unit,
  delta,
  deltaLabel,
  footer,
}) => (
  <div className="bg-card rounded-2xl border border-border p-5">
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {typeof delta === 'number' && (
          <div className="mt-1 text-xs flex items-center gap-1.5">
            <span
              className={
                delta < 0
                  ? 'inline-flex items-center gap-0.5 text-emerald-600 font-semibold'
                  : 'inline-flex items-center gap-0.5 text-rose-600 font-semibold'
              }
            >
              {delta < 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
        {footer && <div className="mt-1 text-xs text-muted-foreground">{footer}</div>}
      </div>
    </div>
  </div>
);

const ComplianceBadge: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-sm text-foreground">
    <span className="text-emerald-600">{icon}</span>
    {label}
  </div>
);
