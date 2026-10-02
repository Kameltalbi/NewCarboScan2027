/**
 * Amélioration des données — vocabulaire simple, pas de scores techniques.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { qualityLabel } from "./purchaseQualityLabels";

const fmt = (n: number, d = 1) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

export const PurchasesQualityPage: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-dashboard", year],
    queryFn: () => api.getSuppliersDashboard(year),
  });
  const { data: statsData } = useQuery({
    queryKey: ["supplier-stats", year],
    queryFn: () => api.getSupplierStats(year),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const byMethod =
    (data?.byMethod as Array<{ label: string; emissions_tco2e: number }>) || [];
  const pareto = data?.pareto as
    | {
        count: number;
        message: string;
        suppliers: Array<Record<string, unknown>>;
      }
    | undefined;
  const primaryPct = Number(statsData?.stats?.primary_data_pct || 0);
  const totalT = Number(statsData?.stats?.total_emissions_tco2e || 0);

  const spendShare = byMethod
    .filter((m) => /dépenses|estimation/i.test(m.label) || m.label === "Dépenses")
    .reduce((n, m) => n + Number(m.emissions_tco2e), 0);
  const estimationPct = totalT > 0 ? Math.round((spendShare / totalT) * 100) : 0;

  const priority = (pareto?.suppliers || []).filter((s) => {
    const grade = String(s.main_grade || "");
    const method = String(s.main_method || "");
    return method === "spend" || grade === "D" || grade === "E" || !grade;
  });

  const priorityShare = priority.reduce((n, s) => n + Number(s.share_pct || 0), 0);
  const list = priority.length ? priority : pareto?.suppliers || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Améliorez votre bilan</h2>
          <p className="text-sm text-muted-foreground">
            Identifiez où affiner les estimations — sans jargon méthodologique.
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qualité des données</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong className="text-2xl tabular-nums">{fmt(primaryPct, 0)}&nbsp;%</strong>{" "}
            <span className="text-muted-foreground">données plus précises</span>
          </p>
          <p>
            <strong>{estimationPct}&nbsp;%</strong> encore en <strong>Estimation</strong> — calcul
            à partir du montant des achats.
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-200/70 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {list.length || pareto?.count || 0} fournisseurs à traiter en priorité
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Ils représentent environ <strong>{fmt(priorityShare || 0, 0)}&nbsp;%</strong> de vos
            émissions d&apos;achats et sont actuellement calculés principalement à partir des
            dépenses.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fournisseurs à traiter en priorité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.map((s) => (
            <div
              key={String(s.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{String(s.name)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(Number(s.emissions_tco2e), 1)} tCO₂e · {fmt(Number(s.share_pct), 0)}
                  &nbsp;% des émissions achats · Qualité : {qualityLabel(String(s.main_grade))}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/app/fournisseurs/fiche/${s.id}`}>Améliorer les données</Link>
              </Button>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Importez d&apos;abord vos achats pour identifier les contributeurs prioritaires.
            </p>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="ghost" size="sm">
        <Link to="/app/fournisseurs">← Retour à la vue d&apos;ensemble</Link>
      </Button>
    </div>
  );
};

export default PurchasesQualityPage;
