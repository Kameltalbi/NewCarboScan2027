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
const CATEGORY_COLORS = ['#22c55e', '#3b82f6', '#a78bfa', '#f59e0b', '#14b8a6'];

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
    if (!hasReal || !data || selectedSiteId) return [];
    const lines = (data.bilanCarbone.detailedBreakdown || [])
      .filter((l) => l.emissions > 0)
      .map((l) => ({
        siteId: l.siteId ?? null,
        scope: l.scope as 1 | 2 | 3,
        kg: l.emissions,
      }));
    const rollup = rollupSites(lines);
    const totalKg = data.bilanCarbone.totalEmissions || 1;
    return rollup.sites.map((row) => ({
      id: row.siteId,
      name: siteNameById.get(row.siteId) || `Site ${row.siteId.slice(0, 8)}`,
      tonnes: toT(row.kg),
      pct: (row.kg / totalKg) * 100,
    }));
  }, [hasReal, data, selectedSiteId, siteNameById]);

  const topSites = useMemo(() => siteEmissions.slice(0, 8), [siteEmissions]);
  const top5Sites = useMemo(() => siteEmissions.slice(0, 5), [siteEmissions]);
  const maxSiteTonnes = Math.max(...topSites.map((s) => s.tonnes), 1);

  const topCategories = useMemo(() => {
    if (!hasReal || !data || data.bilanCarbone.breakdown.length === 0) return [];
    return data.bilanCarbone.breakdown.slice(0, 5).map((b) => ({
      label: categoryDisplayLabel(b.category),
      technicalKey: b.category,
      value: toT(b.emissions),
      pct: b.percentage,
    }));
  }, [hasReal, data]);

  /** Sources du site sélectionné (sous-catégories du detailedBreakdown). */
  const siteSources = useMemo(() => {
    if (!selectedSiteId || !hasReal || !data) return [];
    const map = new Map<string, number>();
    for (const line of data.bilanCarbone.detailedBreakdown || []) {
      if (line.emissions <= 0) continue;
      const key = line.subcategory || line.category || 'other';
      map.set(key, (map.get(key) || 0) + line.emissions);
    }
    const totalKg = data.bilanCarbone.totalEmissions || 1;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, kg]) => ({
        label: categoryDisplayLabel(key),
        technicalKey: key,
        value: toT(kg),
        pct: (kg / totalKg) * 100,
      }));
  }, [selectedSiteId, hasReal, data]);

  const priorities = useMemo(() => {
    const items: Array<{
      title: string;
      metric: string;
      detail: string;
      cta: string;
      href?: string;
      selectSiteId?: string;
    }> = [];
    if (!hasReal || !data || kpis.total <= 0) return items;

    const topCat = topCategories[0];
    if (topCat && topCat.pct > 0) {
      items.push({
        title: topCat.label,
        metric: `${Math.round(topCat.pct)} % des émissions`,
        detail: 'Principal poste à traiter en premier sur cet exercice.',
        cta: 'Analyser ce poste',
        href: '/app/bilan-carbone',
      });
    }

    if (!selectedSiteId && top5Sites[0] && top5Sites[0].pct >= 10) {
      const lead = top5Sites[0];
      items.push({
        title: lead.name,
        metric: `${fmt(lead.tonnes)} tCO₂e · ${Math.round(lead.pct)} %`,
        detail: 'Site le plus contributeur — concentrer l’analyse et le plan d’actions ici.',
        cta: 'Filtrer sur ce site',
        selectSiteId: lead.id,
      });
    }

    if (kpis.s3Pct >= 25) {
      items.push({
        title: 'Scope 3',
        metric: `${Math.round(kpis.s3Pct)} % des émissions`,
        detail: 'Identifier les catégories Scope 3 à plus fort potentiel de réduction.',
        cta: 'Voir le détail',
        href: '/app/bilan-carbone',
      });
    } else if (kpis.s12Pct >= 50) {
      items.push({
        title: 'Scope 1 + 2',
        metric: `${Math.round(kpis.s12Pct)} % des émissions`,
        detail: 'Prioriser l’énergie et les combustions directes.',
        cta: 'Voir le détail',
        href: '/app/bilan-carbone',
      });
    }

    if (selectedSite && siteSources[0] && items.length < 3) {
      items.push({
        title: siteSources[0].label,
        metric: `${Math.round(siteSources[0].pct)} % du site`,
        detail: `Source dominante sur ${selectedSite.name}.`,
        cta: 'Créer une action',
        href: `/app/transition/actions?site=${encodeURIComponent(selectedSite.id)}&post=${encodeURIComponent(siteSources[0].technicalKey)}&year=${activeYear}`,
      });
    }

    return items.slice(0, 3);
  }, [
    hasReal,
    data,
    kpis.total,
    kpis.s3Pct,
    kpis.s12Pct,
    topCategories,
    selectedSiteId,
    selectedSite,
    top5Sites,
    siteSources,
    activeYear,
  ]);

  const maxCat = Math.max(
    ...topCategories.map((c) => c.value),
    ...siteSources.map((c) => c.value),
    1,
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

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {selectedSite
              ? `Répartition des émissions — ${selectedSite.name}`
              : 'Répartition des émissions par scope'}
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

        {/* Evolution OU Top sites */}
        <div className="bg-card rounded-2xl border border-border p-6">
          {showEvolution ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Évolution des émissions</h3>
                <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
                  Années inventoriées
                </span>
              </div>
              <div className="h-56">
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
              <p className="mt-2 text-xs text-muted-foreground">
                Uniquement les exercices disposant d&apos;un inventaire réel — aucune année n&apos;est extrapolée.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
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
                  <button
                    type="button"
                    className="mt-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                    onClick={() => setSelectedSiteId(null)}
                  >
                    Revenir à la vue consolidée <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : topSites.length === 0 ? (
                <p className="h-56 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                  Aucune émission rattachée à un site pour cet exercice. Vérifiez le rattachement site
                  dans la collecte.
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
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-foreground truncate pr-2">{s.name}</span>
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            <span className="font-semibold text-foreground">{fmt(s.tonnes)}</span> tCO₂e ·{' '}
                            {Math.round(s.pct)} %
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
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
                    className="mt-4 text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                    onClick={() => navigate('/app/bilan-carbone')}
                  >
                    Voir les {sites.length || siteEmissions.length} sites →
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Qualité / Transparence — derrière le lien méthodologique */}
      {showDataQualityPanel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="dashboard-data-quality">
          <LazyDataQualityRadarChart
            title="Transparence & qualité des données"
            dataQuality={
              data?.dataQuality ?? { real: 0, estimated: 0, default: 100 }
            }
          />
          <PhysicalVsMonetaryCard
            lines={(data?.bilanCarbone.detailedBreakdown || []).map((line) => ({
              method: line.dataMethod,
              kg: line.emissions,
              source: line.emissionFactorSource,
            }))}
          />
        </div>
      )}

      {/* BOTTOM ROW — décision : sites · postes · recommandations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Sites prioritaires */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {selectedSiteId
              ? 'Principales sources du site'
              : 'Sites les plus émetteurs'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {selectedSiteId
              ? 'Où concentrer l’effort sur ce site'
              : 'Où agir en priorité dans le réseau'}
          </p>
          {selectedSiteId ? (
            siteSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source détaillée pour ce site.</p>
            ) : (
              <div className="space-y-4">
                {siteSources.map((c, i) => (
                  <div key={`${c.technicalKey}-${i}`}>
                    <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                      <span className="text-foreground truncate" title={c.technicalKey}>{c.label}</span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        <span className="font-semibold text-foreground">{fmt(c.value)}</span> tCO₂e ·{' '}
                        {Math.round(c.pct)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.value / maxCat) * 100}%`,
                          background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : top5Sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun site contributeur identifiable pour cet exercice.
            </p>
          ) : (
            <>
              {top5Sites[0] && (
                <button
                  type="button"
                  className="w-full text-left rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 mb-4"
                  onClick={() => setSelectedSiteId(top5Sites[0].id)}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/80">
                    Site n°1
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground truncate">{top5Sites[0].name}</p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{fmt(top5Sites[0].tonnes)}</span> tCO₂e
                    {' · '}
                    {Math.round(top5Sites[0].pct)} % du total
                  </p>
                </button>
              )}
              <div className="space-y-3">
                {top5Sites.slice(1).map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left flex items-center justify-between text-sm gap-2"
                    onClick={() => setSelectedSiteId(s.id)}
                  >
                    <span className="text-muted-foreground w-5 shrink-0">{idx + 2}.</span>
                    <span className="font-medium text-foreground truncate flex-1">{s.name}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {fmt(s.tonnes)} · {Math.round(s.pct)}%
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                onClick={() => navigate('/app/bilan-carbone')}
              >
                Analyser tous les sites <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* 2. Postes d'émissions */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Postes d&apos;émissions prioritaires
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {selectedSite
              ? `Top 5 — ${selectedSite.name}`
              : 'Top 5 des postes sur le périmètre sélectionné'}
          </p>
          {topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun poste d&apos;émission disponible pour ce périmètre.
            </p>
          ) : (
            <div className="space-y-4">
              {topCategories.map((c, i) => (
                <div key={`${c.technicalKey}-${i}`}>
                  <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                    <span className="text-foreground truncate" title={c.technicalKey}>{c.label}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      <span className="font-semibold text-foreground">{fmt(c.value)}</span> tCO₂e ·{' '}
                      {Math.round(c.pct)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.value / maxCat) * 100}%`,
                        background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Recommandations */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-foreground">Recommandations</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Priorités calculées à partir des émissions de l&apos;exercice
          </p>
          {priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Pas assez de données pour prioriser automatiquement cet exercice.
            </p>
          ) : (
            <div className="space-y-4">
              {priorities.map((p, idx) => (
                <div key={`${p.title}-${idx}`} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <p className="text-sm font-semibold text-foreground">
                    {idx + 1}. {p.title}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-emerald-800 tabular-nums">{p.metric}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.detail}</p>
                  <button
                    type="button"
                    className="mt-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                    onClick={() => {
                      if (p.selectSiteId) {
                        setSelectedSiteId(p.selectSiteId);
                        return;
                      }
                      if (p.href) navigate(p.href);
                    }}
                  >
                    {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
