/**
 * Vues secondaires du module émissions financées / fournisseurs.
 * Alimentées par les contreparties + achats/encours réels (plus de placeholders).
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Leaf, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { api } from "@/integrations/api/client";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import {
  assessCounterpartyRaw,
  portfolioQuality,
  type BusinessLoanResult,
} from "@/lib/pcaf/methodology";
import { cn } from "@/lib/utils";

const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);

function usePurchasesBySupplier() {
  const { organizationId } = useOrganizationId();
  return useQuery({
    queryKey: ["supplier-purchases-agg", organizationId],
    queryFn: async () => {
      if (!organizationId) return {};
      const { items } = await api.listSupplierPurchases();
      const agg: Record<string, { amount: number; emissions_kg: number }> = {};
      for (const r of items || []) {
        const id = r.supplier_id ? String(r.supplier_id) : null;
        if (!id) continue;
        const cur = agg[id] || { amount: 0, emissions_kg: 0 };
        cur.amount += Number(r.amount || 0);
        cur.emissions_kg += Number(r.calculated_emissions_kgco2e || 0);
        agg[id] = cur;
      }
      return agg;
    },
    enabled: !!organizationId,
  });
}

/** CDP & SBTi — engagements climat des contreparties / fournisseurs */
export const ClimateEngagementView: React.FC = () => {
  const navigate = useNavigate();
  const L = useSupplierLabels();
  const { suppliers, isLoading } = useSuppliers();

  const rows = useMemo(
    () =>
      [...suppliers].sort((a, b) => {
        const score = (s: typeof a) =>
          (s.has_sbti_target ? 2 : 0) + (s.has_cdp_disclosure ? 1 : 0);
        return score(b) - score(a) || a.name.localeCompare(b.name);
      }),
    [suppliers],
  );

  const sbtiCount = suppliers.filter((s) => s.has_sbti_target).length;
  const cdpCount = suppliers.filter((s) => s.has_cdp_disclosure).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          {L.isBank ? "Engagements climat des contreparties" : "CDP & SBTi"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {L.isBank
            ? "Suivi SBTi et divulgation CDP des emprunteurs du portefeuille (hors calcul PCAF)."
            : "Suivi des engagements CDP et Science-Based Targets de vos fournisseurs."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{L.kpiTotal}</p>
            <p className="text-2xl font-bold">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">SBTi déclarées</p>
            <p className="text-2xl font-bold">{sbtiCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Divulgation CDP</p>
            <p className="text-2xl font-bold">{cdpCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">{L.colCategory}</th>
                <th className="px-4 py-3 text-center font-medium">SBTi</th>
                <th className="px-4 py-3 text-center font-medium">CDP</th>
                <th className="px-4 py-3 text-center font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/30"
                  onClick={() => navigate(`/app/fournisseurs/fiche/${s.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.purchase_category || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.has_sbti_target ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Oui</Badge>
                    ) : (
                      <span className="text-muted-foreground">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.has_cdp_disclosure ? (
                      <Badge variant="secondary">{s.cdp_score || "Oui"}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">
                    {s.carbon_score || "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune {L.entitySingular} référencée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/** Émissions de GES — consolidation portefeuille / chaîne d'approvisionnement */
export const PortfolioEmissionsView: React.FC = () => {
  const navigate = useNavigate();
  const L = useSupplierLabels();
  const { suppliers, isLoading } = useSuppliers();
  const { data: purchases = {}, isLoading: purchLoading } = usePurchasesBySupplier();

  const rows = useMemo(() => {
    return suppliers
      .map((s) => {
        const p = purchases[s.id];
        const assessment = L.isBank ? assessCounterpartyRaw(s.raw_legacy) : null;
        const scope12 = assessment?.scope12.financedEmissionsTco2e ?? 0;
        const scope3 = assessment?.scope3.financedEmissionsTco2e ?? 0;
        const emissionsT = assessment
          ? scope12 + (assessment.scope3.status === "calculated" ? scope3 : 0)
          : (p?.emissions_kg || 0) / 1000;
        const amount =
          assessment?.outstandingAmount ||
          p?.amount ||
          Number(s.annual_spend) ||
          0;
        return { s, amount, emissionsT, scope12, scope3, assessment };
      })
      .sort((a, b) => b.emissionsT - a.emissionsT);
  }, [suppliers, purchases, L.isBank]);

  const totalScope12 = rows.reduce((n, r) => n + r.scope12, 0);
  const totalScope3 = rows.reduce(
    (n, r) => n + (r.assessment?.scope3.status === "calculated" ? r.scope3 : 0),
    0,
  );
  const totalEmissions = rows.reduce((n, r) => n + r.emissionsT, 0);
  const totalAmount = rows.reduce((n, r) => n + r.amount, 0);
  const maxE = Math.max(...rows.map((r) => r.emissionsT), 1);

  if (isLoading || purchLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          {L.isBank ? "Émissions financées consolidées" : "Émissions de GES"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {L.isBank
            ? "Totaux Scope 3 catégorie 15 (PCAF) du portefeuille — hors bilan opérationnel."
            : "Vue consolidée des émissions de gaz à effet de serre de votre chaîne d'approvisionnement."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {L.isBank ? "Financé scope 1+2" : L.colEmissions}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {fmt(L.isBank ? totalScope12 : totalEmissions)}{" "}
              <span className="text-sm font-medium text-muted-foreground">tCO₂e</span>
            </p>
            {L.isBank && (
              <p className="mt-1 text-xs text-muted-foreground">
                Scope 3 : {fmt(totalScope3, 1)} tCO₂e
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{L.colOutstanding}</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {L.isBank ? "Intensité portefeuille" : "Intensité achats"}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {totalAmount > 0
                ? fmt((totalEmissions * 1000) / (totalAmount / 1000), 1)
                : "—"}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                {L.isBank ? "kgCO₂e / k encours" : "kgCO₂e / k TND d'achats"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="h-4 w-4 text-emerald-700" />
            Répartition par {L.entitySingular}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map(({ s, amount, emissionsT }) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`/app/fournisseurs/fiche/${s.id}`)}
            >
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {fmt(emissionsT)}
                  </span>{" "}
                  tCO₂e · {fmt(amount)} encours
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(emissionsT / maxE) * 100}%` }}
                />
              </div>
            </button>
          ))}
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune émission calculée.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/** Score / qualité PCAF (ou score CarboScan pour non-banques) */
export const ScoringQualityView: React.FC = () => {
  const navigate = useNavigate();
  const L = useSupplierLabels();
  const { suppliers, isLoading } = useSuppliers();

  const assessments = useMemo(
    () =>
      suppliers.map((s) => ({
        supplier: s,
        result: assessCounterpartyRaw(s.raw_legacy),
      })),
    [suppliers],
  );

  const distribution = useMemo(() => {
    const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of assessments) {
      const score = row.result?.scope12.score;
      if (score) buckets[score] += 1;
    }
    return buckets;
  }, [assessments]);

  const weighted = useMemo(
    () => portfolioQuality(assessments.map((row) => row.result).filter((row): row is BusinessLoanResult => !!row)),
    [assessments],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          {L.isBank ? "Qualité des données PCAF" : "Score CarboScan"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {L.isBank
            ? "Score pondéré par l'encours, séparément pour le scope 1+2 et le scope 3 (PCAF 2025, chapitre 6)."
            : "Méthodologie et détails du scoring carbone CarboScan."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Score pondéré scope 1+2</p>
            <p className="text-2xl font-bold tabular-nums">
              {weighted.scope12 == null ? "—" : fmt(weighted.scope12, 2)}{" "}
              <span className="text-sm font-medium text-muted-foreground">/ 5</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Scope 3 : {weighted.scope3 == null ? "—" : fmt(weighted.scope3, 2)} / 5
              · Σ (encours × score) / Σ encours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Options 1 (reportées)</p>
            <p className="text-2xl font-bold">
              {(distribution[1] || 0) + (distribution[2] || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Options 2–3 (estimées)</p>
            <p className="text-2xl font-bold">
              {(distribution[3] || 0) +
                (distribution[4] || 0) +
                (distribution[5] || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Répartition des scores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((score) => {
            const n = distribution[score] || 0;
            const pct = suppliers.length ? (n / suppliers.length) * 100 : 0;
            return (
              <div key={score}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    Score {score}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {score === 1
                        ? "Option 1a"
                        : score === 2
                          ? "Options 1b ou 2a"
                          : score === 3
                            ? "Option 2b"
                            : score === 4
                              ? "Option 3a"
                              : "Options 3b ou 3c"}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {n} · {fmt(pct, 0)} %
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      score <= 2
                        ? "bg-emerald-500"
                        : score === 3
                          ? "bg-amber-400"
                          : "bg-orange-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {L.isBank && (
        <Card className="border-emerald-200/70 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-emerald-700" />
              Score pondéré PCAF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-mono text-foreground">
              Σ (encours × score) / Σ encours
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              PCAF (2025) Part A, chapitre 6, encadré 6.1-6. Le score scope 3 est
              calculé à part. Ouvrez une contrepartie pour voir la méthode choisie.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 text-center font-medium">Score S1+2</th>
                <th className="px-4 py-3 text-center font-medium">Score S3</th>
                <th className="px-4 py-3 text-center font-medium">Option S1+2</th>
                <th className="px-4 py-3 text-center font-medium">
                  {L.colScore}
                </th>
                <th className="px-4 py-3 text-right font-medium">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map(({ supplier: s, result }) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b border-border/50 hover:bg-muted/30"
                    onClick={() => navigate(`/app/fournisseurs/fiche/${s.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-center">
                      {result?.scope12.score ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {result?.scope3.score ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {result?.scope12.optionCode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{s.carbon_score || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.confidence_index}%
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
