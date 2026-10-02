/**
 * Qualité des données A–E + fournisseurs prioritaires (Pareto).
 */
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number, d = 1) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

export const PurchasesQualityPage: React.FC = () => {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [target, setTarget] = useState<string>("30");

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-dashboard", year],
    queryFn: () => api.getSuppliersDashboard(year),
  });
  const { data: statsData } = useQuery({
    queryKey: ["supplier-stats", year],
    queryFn: () => api.getSupplierStats(year),
  });

  React.useEffect(() => {
    const t = data?.primaryDataTargetPct ?? statsData?.stats?.primary_data_target_pct;
    if (t != null) setTarget(String(t));
  }, [data, statsData]);

  const saveMut = useMutation({
    mutationFn: () =>
      api.updateSupplierPurchasesSettings({
        purchases_primary_data_target_pct: Number(target),
      }),
    onSuccess: () => {
      toast.success("Objectif enregistré");
      void qc.invalidateQueries({ queryKey: ["supplier-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const byGrade =
    (data?.byGrade as Array<{
      grade: string;
      label: string;
      tooltip: string;
      emissions_tco2e: number;
      rows: number;
    }>) || [];
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

  const priority = (pareto?.suppliers || []).filter((s) => {
    const grade = String(s.main_grade || "");
    const method = String(s.main_method || "");
    return method === "spend" || grade === "D" || grade === "E" || !grade;
  });

  const priorityShare = priority.reduce((n, s) => n + Number(s.share_pct || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Qualité des données</h2>
        <p className="text-sm text-muted-foreground">
          Indice de qualité des données CarboScan (A–E). Il permet d&apos;identifier les données à
          améliorer — il n&apos;évalue pas la performance environnementale du fournisseur.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qualité actuelle des données achats ({year})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-2">
            {byMethod.map((m) => (
              <li key={m.label} className="flex justify-between gap-3">
                <span>{m.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {totalT > 0
                    ? `${fmt((Number(m.emissions_tco2e) / totalT) * 100, 0)} %`
                    : "—"}{" "}
                  · {fmt(Number(m.emissions_tco2e), 1)} tCO₂e
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-5">
            {byGrade.map((g) => (
              <div
                key={g.grade}
                className="rounded-lg border border-border px-3 py-2"
                title={g.tooltip}
              >
                <p className="text-lg font-bold">{g.grade}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{g.label}</p>
                <p className="mt-1 text-xs tabular-nums">{g.rows} lignes</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Objectif de couverture données primaires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Cible (%)
            <Input
              className="mt-1 w-28"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <Button
            size="sm"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            Enregistrer
          </Button>
          <p className="text-sm text-muted-foreground">
            Actuel : {fmt(primaryPct, 1)} % · Cible : {target} %
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-200/70 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prochaine étape recommandée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Collectez des données auprès de vos{" "}
            <strong>{priority.length || pareto?.count || 0}</strong> principaux fournisseurs
            (méthode dépenses / qualité D–E) pour améliorer la précision d&apos;environ{" "}
            <strong>{fmt(priorityShare || 0, 0)} %</strong> des émissions liées aux achats.
          </p>
          {pareto && <p className="text-muted-foreground">{pareto.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Priorité de collecte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(pareto?.suppliers || []).map((s) => {
            const elevated =
              String(s.main_method) === "spend" ||
              ["D", "E"].includes(String(s.main_grade || ""));
            return (
              <div
                key={String(s.id)}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <Link
                    className="font-medium text-teal-800 hover:underline"
                    to={`/app/fournisseurs/fiche/${s.id}`}
                  >
                    {String(s.name)}
                  </Link>
                  {elevated && (
                    <p className="mt-1 text-xs text-amber-800">
                      Priorité élevée — part importante des émissions estimées. Obtenir des données
                      physiques ou spécifiques améliorerait significativement la précision.
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums font-medium text-foreground">
                    {fmt(Number(s.emissions_tco2e), 1)} tCO₂e · {fmt(Number(s.share_pct), 1)} %
                  </p>
                  <p>
                    Méthode : {String(s.main_method || "—")} · Qualité :{" "}
                    {String(s.main_grade || "—")}
                  </p>
                </div>
              </div>
            );
          })}
          <p className="pt-2 text-xs text-muted-foreground">
            La collecte fournisseur (lien sécurisé) arrive en P1 — préparez dès maintenant la liste
            prioritaire.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasesQualityPage;
