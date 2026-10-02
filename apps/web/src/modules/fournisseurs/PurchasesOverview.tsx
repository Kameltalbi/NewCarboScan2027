/**
 * Vue d'ensemble simplifiée — onboarding si vide, sinon 3 graphiques max.
 */
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Plus, ArrowRight } from "lucide-react";
import { qualityLabel } from "./purchaseQualityLabels";

const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

export const PurchasesOverview: React.FC = () => {
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
  const empty = !stats?.purchase_rows;

  const byCategory = useMemo(
    () =>
      ((dash?.byCategory as Array<{ category: string; emissions_tco2e: number }>) || []).map(
        (r) => ({ name: r.category, value: Number(r.emissions_tco2e) }),
      ),
    [dash],
  );
  const topEmit = (dash?.topByEmissions as Array<Record<string, unknown>>) || [];
  const byMethod = (dash?.byMethod as Array<{ label: string; emissions_tco2e: number }>) || [];
  const pareto = dash?.pareto as
    | { count: number; message: string; suppliers: Array<Record<string, unknown>> }
    | undefined;

  const totalT = Number(stats?.total_emissions_tco2e ?? (stats?.total_emissions || 0) / 1000);
  const spendShare = byMethod
    .filter((m) => /dépenses|estimation/i.test(m.label) || m.label === "Dépenses")
    .reduce((n, m) => n + Number(m.emissions_tco2e), 0);
  const estimationPct = totalT > 0 ? Math.round((spendShare / totalT) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Analysez les émissions de vos achats
        </h2>
        <p className="text-sm text-muted-foreground">
          Commencez avec les données dont vous disposez déjà. Vous pouvez importer votre fichier
          comptable ou ajouter quelques achats manuellement.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link to="/app/fournisseurs/import">
              <Upload className="h-4 w-4" /> Importer mes achats
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/app/fournisseurs/achats?new=1">
              <Plus className="h-4 w-4" /> Ajouter un achat
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Vous n&apos;avez pas besoin de disposer de données carbone de vos fournisseurs pour
          commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Empreinte de vos achats</h2>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {fmt(totalT, 1)}{" "}
            <span className="text-base font-medium text-muted-foreground">tCO₂e</span>
          </p>
        </div>
        <label className="text-sm text-muted-foreground">
          Exercice{" "}
          <select
            className="ml-2 rounded-md border border-border bg-background px-2 py-1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year, year - 1, year - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{fmt(stats?.total_suppliers || 0)}</strong>{" "}
          fournisseurs
        </span>
        {pareto && pareto.count > 0 && (
          <span>
            <strong className="text-foreground">{pareto.count}</strong> fournisseurs représentent
            80&nbsp;% des émissions
          </span>
        )}
        <span>
          <strong className="text-foreground">{estimationPct}&nbsp;%</strong> des émissions encore
          basées sur des estimations
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${fmt(v, 1)} tCO₂e`, "Émissions"]} />
                <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Principaux fournisseurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topEmit.slice(0, 6).map((s) => (
              <Link
                key={String(s.id)}
                to={`/app/fournisseurs/fiche/${s.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
              >
                <span className="truncate font-medium">{String(s.name)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmt(Number(s.emissions_tco2e), 1)} t
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Qualité des données</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-2xl font-bold tabular-nums">
                {fmt(stats?.primary_data_pct || 0, 0)}&nbsp;%
              </span>{" "}
              <span className="text-muted-foreground">données plus précises</span>
            </p>
            <p className="text-muted-foreground">
              {fmt(estimationPct)}&nbsp;% encore en{" "}
              <strong className="text-foreground">Estimation</strong> (à partir des montants).
            </p>
            <p className="text-xs text-muted-foreground">
              Objectif : améliorer progressivement — une estimation est un bon point de départ.
            </p>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/app/fournisseurs/qualite">
                Améliorer mon bilan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {pareto && pareto.count > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Améliorez votre bilan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <strong>{pareto.count} fournisseurs à traiter en priorité</strong> — ils représentent
              l&apos;essentiel de vos émissions d&apos;achats, souvent encore calculées à partir des
              dépenses.
            </p>
            <ul className="space-y-2">
              {pareto.suppliers.slice(0, 5).map((s) => (
                <li
                  key={String(s.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <Link
                      className="font-medium text-teal-800 hover:underline"
                      to={`/app/fournisseurs/fiche/${s.id}`}
                    >
                      {String(s.name)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Qualité : {qualityLabel(String(s.main_grade))}
                    </p>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {fmt(Number(s.emissions_tco2e), 1)} tCO₂e · {fmt(Number(s.share_pct), 0)}&nbsp;%
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild className="gap-1">
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

export default PurchasesOverview;
