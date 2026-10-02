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
  BarChart,
  Bar,
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
  ArrowRight,
  Loader2,
  ClipboardList,
  MapPin,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/contexts/AppDataContext';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { useOrganizationYears } from '@/hooks/useOrganizationYears';
import { api } from '@/integrations/api/client';
import { DashboardContextBar } from '@/components/dashboard/DashboardContextBar';
import { LazyDataQualityRadarChart } from '@/components/dashboard/LazyCharts';
import { PhysicalVsMonetaryCard } from '@/components/dashboard/PhysicalVsMonetaryCard';
import { categoryDisplayLabel } from '@/lib/dashboard/categoryDisplayLabel';
import { rollupSites } from '@/lib/perimeter/siteRollup';

import {
  DashboardAggregator,
  type DashboardAggregatedData,
} from '@/lib/calculators/DashboardAggregator';

interface Props {
  selectedYear?: number;
}

/** Donut scopes — keep the dashboard chart palette (green / blue / purple). */
const SCOPE_COLORS = ['#22c55e', '#3b82f6', '#a78bfa'];

const KG_TO_T = 0.001;
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
  const { defaultYear, allowedYears } = useOrganizationYears(organizationId);
  const [headerYear, setHeaderYear] = useState<number | null>(null);
  const activeYear = selectedYear ?? headerYear ?? defaultYear ?? referenceYear;
  const { sites, isLoading: sitesLoading } = useOrganizationSites(organizationId ?? undefined);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardAggregatedData | null>(null);
  const [yearlyTotals, setYearlyTotals] = useState<Array<{ year: number; value: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showDataQualityPanel, setShowDataQualityPanel] = useState(false);

  const setActiveYear = (year: number) => {
    setHeaderYear(year);
    window.dispatchEvent(new CustomEvent('dashboardYearChange', { detail: year }));
  };

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

  // Drop stale site selection if the site disappears from the org list
  useEffect(() => {
    if (!selectedSiteId) return;
    if (sites.length > 0 && !sites.some((s) => s.id === selectedSiteId)) {
      setSelectedSiteId(null);
    }
  }, [sites, selectedSiteId]);

  useEffect(() => {
    if (!showDataQualityPanel) return;
    const id = window.setTimeout(() => {
      document.getElementById('dashboard-data-quality')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
    return () => window.clearTimeout(id);
  }, [showDataQualityPanel]);

  useEffect(() => {
    const load = async () => {
      if (!user || !organizationId || organizationLoading) return;
      try {
        setLoading(true);
        const cur = await DashboardAggregator.aggregate(
          organizationId,
          `${activeYear}-01-01`,
          `${activeYear}-12-31`,
          { siteId: selectedSiteId },
        );
        setData(cur);
        // Bilans annuels = vue organisation (pas de série historique par site)
        if (selectedSiteId) {
          setYearlyTotals([]);
        } else {
          try {
            const { items } = await api.listBilans();
            const byYear = new Map<number, number>();
            for (const row of items || []) {
              const qYear = Number((row as { questionnaire_data?: { year?: unknown } }).questionnaire_data?.year);
              const rawRef = Number((row as { raw_legacy?: { reference_year?: unknown } }).raw_legacy?.reference_year);
              const colYear = Number(row.year);
              const year =
                (Number.isInteger(qYear) && qYear >= 2000 && qYear)
                || (Number.isInteger(rawRef) && rawRef >= 2000 && rawRef)
                || (Number.isInteger(colYear) && colYear >= 2000 && colYear)
                || (row.date_bilan ? new Date(String(row.date_bilan)).getFullYear() : null);
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
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, organizationId, organizationLoading, activeYear, selectedSiteId]);

  const hasReal = !!data && data.bilanCarbone.totalEmissions > 0;
  const selectedSite = selectedSiteId
    ? sites.find((s) => s.id === selectedSiteId) ?? null
    : null;

  const contextBar = (
    <DashboardContextBar
      organizationName={organization?.name || 'Organisation'}
      activeYear={activeYear}
      availableYears={allowedYears}
      onYearChange={setActiveYear}
      sites={sites.map((s) => ({ id: s.id, name: s.name }))}
      selectedSiteId={selectedSiteId}
      onSiteChange={setSelectedSiteId}
      sitesLoading={sitesLoading}
    />
  );

  // Values (real if available, else demo values matching the hero preview)
  const kpis = useMemo(() => {
    if (hasReal && data) {
      const total = toT(data.bilanCarbone.totalEmissions);
      const s1 = toT(data.bilanCarbone.scope1);
      const s2 = toT(data.bilanCarbone.scope2);
      const s3 = toT(data.bilanCarbone.scope3);
      const s12 = s1 + s2;
      // Évolution YoY uniquement en vue consolidée (bilans = org)
      const prevYearTotal = selectedSiteId
        ? 0
        : yearlyTotals.find((y) => y.year === activeYear - 1)?.value ?? 0;
      const evo =
        !selectedSiteId && prevYearTotal > 0 && total > 0
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
  }, [hasReal, data, yearlyTotals, activeYear, selectedSiteId]);

  // Agrégats sites (fallback quand l'organisation n'a pas ces champs renseignés)
  const siteTotals = useMemo(() => {
    const scoped = selectedSite
      ? [selectedSite]
      : sites;
    return scoped.reduce(
      (acc, s) => ({
        employees: acc.employees + (Number(s.employees_count) || 0),
        surface: acc.surface + (Number(s.surface_m2) || 0),
      }),
      { employees: 0, surface: 0 },
    );
  }, [sites, selectedSite]);

  // Intensité carbone adaptative : CA (vue consolidée) > effectif > surface
  const intensityKpi = useMemo(() => {
    const total = kpis.total; // tCO2e
    // CA org uniquement en vue consolidée (non attribuable à une seule agence)
    const revenue = selectedSiteId ? 0 : Number(organization?.annual_revenue) || 0;
    const employees = selectedSiteId
      ? siteTotals.employees
      : Number(organization?.employees) || siteTotals.employees;
    const surface = selectedSiteId
      ? siteTotals.surface
      : Number(organization?.total_surface) || siteTotals.surface;
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
        footer: selectedSite
          ? `Sur la base de ${employees} collaborateurs — ${selectedSite.name}`
          : `Sur la base de ${employees} collaborateurs (CA non renseigné)`,
      };
    }
    if (surface > 0) {
      return {
        value: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format((total * 1000) / surface),
        unit: 'kgCO₂e / m²',
        footer: selectedSite
          ? `Sur la base de ${new Intl.NumberFormat('fr-FR').format(surface)} m² — ${selectedSite.name}`
          : `Sur la base de ${new Intl.NumberFormat('fr-FR').format(surface)} m² (CA non renseigné)`,
      };
    }
    return null;
  }, [kpis.total, organization, hasReal, siteTotals, selectedSite, selectedSiteId]);



  const scopeData = useMemo(() => {
    if (hasReal && data) {
      return [
        { name: 'Scope 1', value: toT(data.bilanCarbone.scope1) },
        { name: 'Scope 2', value: toT(data.bilanCarbone.scope2) },
        { name: 'Scope 3', value: toT(data.bilanCarbone.scope3) },
      ];
    }
    return [
      { name: 'Scope 1', value: 0 },
      { name: 'Scope 2', value: 0 },
      { name: 'Scope 3', value: 0 },
    ];
  }, [hasReal, data]);

  /** Années avec inventaire réel uniquement — jamais de recopie artificielle. */
  const realEvolution = useMemo(() => {
    if (selectedSiteId) return [];
    const byYear = new Map(yearlyTotals.map((row) => [row.year, row.value]));
    if (hasReal && data) {
      const current = toT(data.bilanCarbone.totalEmissions);
      if (current > 0) byYear.set(activeYear, current);
    }
    return [...byYear.entries()]
      .filter(([, value]) => value > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value: Math.round(value) }));
  }, [yearlyTotals, hasReal, data, activeYear, selectedSiteId]);

  const showEvolution = !selectedSiteId && realEvolution.length >= 2;

  const siteNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sites) map.set(s.id, s.name);
    return map;
  }, [sites]);

  /** Agrégation par site depuis le detailedBreakdown déjà chargé (pas de N+1). */
  const siteEmissions = useMemo(() => {
    if (!hasReal || !data || selectedSiteId) {
      return { rows: [] as Array<{ id: string; name: string; tonnes: number; pct: number }>, unassignedKg: 0 };
    }
    const lines = (data.bilanCarbone.detailedBreakdown || [])
      .filter((l) => l.emissions > 0)
      .map((l) => ({
        siteId: l.siteId ?? null,
        scope: l.scope as 1 | 2 | 3,
        kg: l.emissions,
      }));
    const rollup = rollupSites(lines);
    const totalKg = data.bilanCarbone.totalEmissions || 1;
    return {
      rows: rollup.sites.map((row) => ({
        id: row.siteId,
        name: siteNameById.get(row.siteId) || `Site ${row.siteId.slice(0, 8)}`,
        tonnes: toT(row.kg),
        pct: (row.kg / totalKg) * 100,
      })),
      unassignedKg: rollup.unassignedKg,
    };
  }, [hasReal, data, selectedSiteId, siteNameById]);

  const topSites = useMemo(() => siteEmissions.rows.slice(0, 8), [siteEmissions]);
  const maxSiteTonnes = Math.max(...topSites.map((s) => s.tonnes), 1);

  const topCategories = useMemo(() => {
    if (!hasReal || !data) return [];
    // Prefer postes réels (exclure le breakdown Scope 1/2/3 synthétique).
    const fromBreakdown = (data.bilanCarbone.breakdown || []).filter(
      (b) => b.emissions > 0 && !/^Scope\s*[123]$/i.test(String(b.category || '').trim()),
    );
    if (fromBreakdown.length > 0) {
      return fromBreakdown.slice(0, 10).map((b) => ({
        label: categoryDisplayLabel(b.category),
        technicalKey: b.category,
        value: toT(b.emissions),
        pct: b.percentage,
      }));
    }
    // Fallback : agréger les sous-catégories du detailedBreakdown
    const map = new Map<string, number>();
    for (const line of data.bilanCarbone.detailedBreakdown || []) {
      if (line.emissions <= 0) continue;
      if (selectedSiteId && line.siteId && line.siteId !== selectedSiteId) continue;
      const key = line.subcategory || line.category || 'other';
      map.set(key, (map.get(key) || 0) + line.emissions);
    }
    const totalKg = data.bilanCarbone.totalEmissions || 1;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, kg]) => ({
        label: categoryDisplayLabel(key),
        technicalKey: key,
        value: toT(kg),
        pct: (kg / totalKg) * 100,
      }));
  }, [hasReal, data, selectedSiteId]);

  /** Sources du site sélectionné (sous-catégories du detailedBreakdown). */
  const siteSources = useMemo(() => {
    if (!selectedSiteId || !hasReal || !data) return [];
    const map = new Map<string, number>();
    for (const line of data.bilanCarbone.detailedBreakdown || []) {
      if (line.emissions <= 0) continue;
      if (line.siteId && line.siteId !== selectedSiteId) continue;
      const key = line.subcategory || line.category || 'other';
      map.set(key, (map.get(key) || 0) + line.emissions);
    }
    const totalKg =
      [...map.values()].reduce((s, n) => s + n, 0) || data.bilanCarbone.totalEmissions || 1;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, kg]) => ({
        label: categoryDisplayLabel(key),
        technicalKey: key,
        value: toT(kg),
        pct: (kg / totalKg) * 100,
      }));
  }, [selectedSiteId, hasReal, data]);

  const reductionPriorities = useMemo(() => {
    return topCategories.slice(0, 3).map((c) => ({
      title: c.label,
      metric: `${fmt(c.value)} tCO₂e · ${Math.round(c.pct)} %`,
    }));
  }, [topCategories]);

  const categoryChartData = useMemo(
    () =>
      (selectedSiteId ? siteSources : topCategories).map((c) => ({
        name: c.label.length > 28 ? `${c.label.slice(0, 26)}…` : c.label,
        fullName: c.label,
        value: Math.round(c.value * 10) / 10,
        technicalKey: c.technicalKey,
      })),
    [selectedSiteId, siteSources, topCategories],
  );

  if (loading || organizationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasReal) {
    return (
      <div className="space-y-6">
        {contextBar}
        <div className="flex min-h-[55vh] items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardList className="h-7 w-7" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Année {activeYear}
              {selectedSite ? ` · ${selectedSite.name}` : ''}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {selectedSite
                ? 'Aucune donnée pour ce site'
                : 'Votre tableau de bord est prêt'}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              {selectedSite
                ? `Aucune activité carbone n'est rattachée à « ${selectedSite.name} » pour l'exercice ${activeYear}. Sélectionnez « Tous les sites » pour la vue consolidée, ou saisissez des données pour ce site.`
                : "Aucune donnée carbone n'est encore enregistrée. Démarrez une collecte pour construire votre premier bilan avec vos propres données."}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              {selectedSite ? (
                <Button variant="outline" onClick={() => setSelectedSiteId(null)}>
                  Voir tous les sites
                </Button>
              ) : (
                <Button onClick={() => navigate('/app/collecte/nouvelle?mode=bilan-carbone')}>
                  Démarrer une collecte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/app/bilan-carbone')}>
                Ouvrir Bilan Carbone
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {contextBar}

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

      {/* CHARTS — L1: scope | postes · L2: qualité | sites */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* L1 G1 — Répartition par scope */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            {selectedSite
              ? `Répartition des émissions — ${selectedSite.name}`
              : 'Répartition des émissions par scope'}
          </h3>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-52 w-52 shrink-0">
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
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-foreground">{fmt(kpis.total)}</div>
                <div className="text-xs text-muted-foreground">tCO₂e</div>
              </div>
            </div>
            <div className="w-full flex-1 space-y-3">
              {scopeData.map((s, i) => {
                const pct = kpis.total ? (s.value / kpis.total) * 100 : 0;
                return (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: SCOPE_COLORS[i] }}
                      />
                      <span className="text-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{fmt(s.value)} tCO₂e</span>
                      <span className="w-10 text-right text-muted-foreground">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* L1 G2 — Principaux postes */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {selectedSite
                  ? `Principaux postes — ${selectedSite.name}`
                  : "Principaux postes d'émissions"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Classement réel des catégories du bilan · tCO₂e
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-700"
              onClick={() => navigate('/app/bilan-carbone')}
            >
              Détail bilan <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          {categoryChartData.length === 0 ? (
            <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Aucun poste d&apos;émission disponible pour ce périmètre.
            </p>
          ) : (
            <div className="h-[280px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  margin={{ top: 8, right: 12, left: 4, bottom: 64 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={70}
                    className="text-[11px]"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000
                        ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v / 1000)}k`
                        : String(v)
                    }
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v)} tCO₂e`, 'Émissions']}
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.fullName || '')
                    }
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#16a34a"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry: { technicalKey?: string }) => {
                      if (entry?.technicalKey) navigate('/app/bilan-carbone');
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* L2 G1 — Transparence & qualité */}
        <div id="dashboard-data-quality" className="min-h-0">
          <LazyDataQualityRadarChart
            title="Transparence & qualité des données"
            dataQuality={
              data?.dataQuality ?? { real: 0, estimated: 0, default: 100 }
            }
          />
        </div>

        {/* L2 G2 — Émissions par site Top 8 */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedSiteId
                ? `Émissions — ${selectedSite?.name || 'Site'}`
                : 'Émissions par site — Top 8'}
            </h3>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          {selectedSiteId ? (
            <div className="space-y-3 py-2">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {fmt(kpis.total)}{' '}
                <span className="text-sm font-medium text-muted-foreground">tCO₂e</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Scope 1+2 : {fmt(kpis.s12)} tCO₂e ({Math.round(kpis.s12Pct)} %) · Scope 3 :{' '}
                {fmt(kpis.s3)} tCO₂e ({Math.round(kpis.s3Pct)} %)
              </p>
              <Button variant="outline" size="sm" onClick={() => setSelectedSiteId(null)}>
                Revenir à la vue consolidée
              </Button>
            </div>
          ) : topSites.length === 0 ? (
            <p className="flex h-56 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {siteEmissions.unassignedKg > 0
                ? 'Des émissions existent pour cet exercice, mais aucune n’est rattachée à un site (site_id manquant sur les lignes d’activité). Les prochaines collectes/importations doivent sélectionner un site.'
                : 'Aucune émission rattachée à un site pour cet exercice. Vérifiez le rattachement site dans la collecte.'}
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {topSites.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedSiteId(s.id)}
                  >
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate pr-2 font-medium text-foreground">{s.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{fmt(s.tonnes)}</span> tCO₂e ·{' '}
                        {Math.round(s.pct)} %
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(s.tonnes / maxSiteTonnes) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                onClick={() => navigate('/app/bilan-carbone')}
              >
                Voir les {sites.length || topSites.length} sites →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Évolution — pleine largeur si ≥ 2 exercices */}
      {showEvolution && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Évolution des émissions</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Exercices inventoriés uniquement — aucune année extrapolée
          </p>
          <div className="h-[280px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        </div>
      )}

      {/* Détail méthodologique complémentaire */}
      {showDataQualityPanel && (
        <PhysicalVsMonetaryCard
          lines={(data?.bilanCarbone.detailedBreakdown || []).map((line) => ({
            method: line.dataMethod,
            kg: line.emissions,
            source: line.emissionFactorSource,
          }))}
        />
      )}

      {/* Priorités de réduction → Plan d'actions */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Priorités de réduction</h3>
              <p className="text-xs text-muted-foreground">
                Issus des principaux postes d&apos;émissions de l&apos;exercice
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/transition/actions')}
          >
            Voir le Plan d&apos;actions <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        {reductionPriorities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Les priorités apparaîtront dès que des postes d&apos;émissions seront disponibles.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {reductionPriorities.map((p, i) => (
              <button
                key={`${p.title}-${i}`}
                type="button"
                className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => navigate('/app/transition/actions')}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Priorité {i + 1}
                </p>
                <p className="mt-1 font-medium text-foreground line-clamp-2">{p.title}</p>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">{p.metric}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SYNTHÈSE OPÉRATIONNELLE */}
      <div className="bg-card rounded-2xl border border-border px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
          <span className="font-medium">
            {selectedSiteId
              ? selectedSite?.name || 'Site sélectionné'
              : `${sites.length} site${sites.length > 1 ? 's' : ''} consolidé${sites.length > 1 ? 's' : ''}`}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums font-semibold">{fmt(kpis.total)} tCO₂e</span>
          <span className="text-muted-foreground">·</span>
          <span>{Math.round(kpis.s12Pct)} % Scope 1 + 2</span>
          <span className="text-muted-foreground">·</span>
          <span>{Math.round(kpis.s3Pct)} % Scope 3</span>
        </div>
        <button
          type="button"
          className="text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 shrink-0"
          onClick={() => setShowDataQualityPanel((v) => !v)}
        >
          Qualité et périmètre des données <ArrowRight className="h-3.5 w-3.5" />
        </button>
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
