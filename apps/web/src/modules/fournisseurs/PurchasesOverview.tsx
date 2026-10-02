/**
 * Vue d'ensemble Fournisseurs & Achats — KPI, graphiques, Pareto.
 */
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/integrations/api/client";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Upload } from "lucide-react";

const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

const METHOD_COLORS = ["#0d9488", "#2563eb", "#ca8a04", "#9333ea"];

export const PurchasesOverview: React.FC = () => {
  const L = useSupplierLabels();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["supplier-stats", year],
    queryFn: () => api.getSupplierStats(year),
  });
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["supplier-dashboard", year],
    queryFn: () => api.getSuppliersDashboard(year),
  });

  const stats = statsData?.stats;
  const loading = statsLoading || dashLoading;

  const byCategory = useMemo(
    () =>
      ((dash?.byCategory as Array<{ category: string; emissions_tco2e: number }>) || []).map(
        (r) => ({ name: r.category, value: Number(r.emissions_tco2e) }),
      ),
    [dash],
  );
  const byMethod = useMemo(
    () =>
      ((dash?.byMethod as Array<{ label: string; emissions_tco2e: number; tooltip?: string }>) ||
        []).map((r) => ({
        name: r.label,
        value: Number(r.emissions_tco2e),
        tip: r.tooltip,
      })),
    [dash],
  );
  const topEmit = (dash?.topByEmissions as Array<Record<string, unknown>>) || [];
  const topSpend = (dash?.topBySpend as Array<Record<string, unknown>>) || [];
  const qualityByYear =
    (dash?.qualityByYear as Array<{ year: number; primary_pct: number }>) || [];
  const pareto = dash?.pareto as
    | { count: number; message: string; suppliers: Array<Record<string, unknown>> }
    | undefined;
  const target = Number(dash?.primaryDataTargetPct ?? stats?.primary_data_target_pct ?? 30);

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const empty = !stats?.purchase_rows;

  if (empty) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          Commencez avec les données dont vous disposez
        </h2>
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas besoin de disposer de données carbone de vos fournisseurs pour
          commencer. CarboScan peut réaliser une première estimation à partir de vos données
          d&apos;achats, que vous pourrez améliorer progressivement.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2">
            <Link to="/app/fournisseurs/import">
              <Upload className="h-4 w-4" /> Importer mes achats
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/fournisseurs/achats">Ajouter un achat manuellement</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/app/fournisseurs/liste">Ajouter mes fournisseurs</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{L.pageTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Mesurez et améliorez progressivement l&apos;empreinte carbone de vos achats.
          </p>
        </div>
        <label className="text-sm text-muted-foreground">
          Exercice{" "}
          <select
            className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-foreground"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year + 1, year, year - 1, year - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Émissions liées aux achats"
          value={`${fmt(Number(stats?.total_emissions_tco2e ?? (stats?.total_emissions || 0) / 1000), 1)} tCO₂e`}
        />
        <Kpi label="Nombre de fournisseurs" value={fmt(stats?.total_suppliers || 0)} />
        <Kpi
          label="Achats couverts"
          value={`${fmt(stats?.coverage_pct || 0, 1)} %`}
          hint="Part des dépenses pour lesquelles une estimation carbone a été réalisée."
        />
        <Kpi
          label="Données fournisseurs / primaires"
          value={`${fmt(stats?.primary_data_pct || 0, 1)} %`}
          hint={`${fmt(stats?.primary_data_pct || 0, 1)} % des émissions d'achats utilisent actuellement des données spécifiques ou primaires. Objectif : améliorer progressivement cette couverture (cible ${target} %).`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Émissions par catégorie d&apos;achat</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${fmt(v, 1)} tCO₂e`, "Émissions"]} />
                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par méthode de calcul</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center gap-4">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {byMethod.map((_, i) => (
                      <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, _n, p) => [`${fmt(v, 1)} tCO₂e`, String((p?.payload as { tip?: string })?.tip || "")]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {byMethod.map((m, i) => (
                <li key={m.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: METHOD_COLORS[i % METHOD_COLORS.length] }}
                  />
                  <span className="text-foreground">{m.name}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {fmt(m.value, 1)} t
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top fournisseurs par émissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topEmit.map((s) => (
              <Link
                key={String(s.id)}
                to={`/app/fournisseurs/fiche/${s.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <span className="truncate font-medium">{String(s.name)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {fmt(Number(s.emissions_tco2e), 1)} tCO₂e
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top fournisseurs par dépenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topSpend.map((s) => (
              <Link
                key={String(s.id)}
                to={`/app/fournisseurs/fiche/${s.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <span className="truncate font-medium">{String(s.name)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {fmt(Number(s.spend))}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qualité des données — progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  ...qualityByYear.map((r) => ({
                    name: String(r.year),
                    value: r.primary_pct,
                  })),
                  { name: `Objectif`, value: target },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number) => [`${fmt(v, 1)} %`, "Données primaires"]} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted-foreground">
            Objectif configurable : {target} % de données physiques ou fournisseur.
          </p>
        </CardContent>
      </Card>

      {pareto && (
        <Card className="border-teal-200/60 bg-teal-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Analyse Pareto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-foreground">{pareto.message}</p>
            <ul className="space-y-1 text-sm">
              {(pareto.suppliers || []).slice(0, 8).map((s) => (
                <li key={String(s.id)} className="flex justify-between gap-3">
                  <Link
                    className="text-teal-800 hover:underline"
                    to={`/app/fournisseurs/fiche/${s.id}`}
                  >
                    {String(s.name)}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {fmt(Number(s.emissions_tco2e), 1)} t · {fmt(Number(s.share_pct), 1)} %
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/app/fournisseurs/qualite">
                Voir les fournisseurs prioritaires <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground" title={hint}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

export default PurchasesOverview;
