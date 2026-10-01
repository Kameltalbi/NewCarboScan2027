/**
 * Fiche contrepartie / fournisseur — détail + traçabilité PCAF (émissions financées).
 */
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Calculator,
  FileCheck2,
  Landmark,
  Leaf,
  Loader2,
  MapPin,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/api/client";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { buildPcafTrace } from "@/lib/pcaf/methodology";
import { cn } from "@/lib/utils";

const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);

const scoreColors: Record<string, string> = {
  "A+": "bg-emerald-500 text-white",
  A: "bg-emerald-400 text-white",
  B: "bg-yellow-400 text-white",
  C: "bg-orange-400 text-white",
  D: "bg-red-400 text-white",
  E: "bg-red-600 text-white",
};

export const CounterpartyFiche: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const L = useSupplierLabels();

  const { data, isLoading, error } = useQuery({
    queryKey: ["supplier-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("id manquant");
      return api.getSupplier(id);
    },
    enabled: !!id,
  });

  const item = data?.item;
  const purchases = data?.purchases || [];
  const primary = purchases[0];

  const outstanding =
    Number(primary?.amount) || Number(item?.annual_spend) || 0;
  const financedKg = purchases.reduce(
    (sum, p) => sum + (Number(p.calculated_emissions_kgco2e) || 0),
    0,
  );
  const currency = String(
    primary?.currency || item?.annual_spend_currency || "TND",
  );

  const rawLegacy =
    item?.raw_legacy && typeof item.raw_legacy === "object"
      ? (item.raw_legacy as Record<string, unknown>)
      : null;

  const trace = useMemo(() => {
    if (!item) return null;
    return buildPcafTrace({
      outstanding,
      financedKg,
      currency,
      dataMethod: String(primary?.data_method || item.data_method || ""),
      sourceType: primary?.source_type ? String(primary.source_type) : null,
      uncertaintyPct:
        primary?.uncertainty_percent != null
          ? Number(primary.uncertainty_percent)
          : null,
      confidenceIndex:
        item.confidence_index != null ? Number(item.confidence_index) : null,
      rawLegacy,
    });
  }, [item, outstanding, financedKg, currency, primary, rawLegacy]);

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !item || !trace) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">
          Impossible de charger cette {L.entitySingular}.
        </p>
        <Button variant="outline" onClick={() => navigate("/app/fournisseurs")}>
          Retour au portefeuille
        </Button>
      </div>
    );
  }

  const carbonScore = item.carbon_score ? String(item.carbon_score) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1 text-muted-foreground"
            onClick={() => navigate("/app/fournisseurs")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {String(item.name)}
            </h1>
            {carbonScore && (
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  scoreColors[carbonScore] || "bg-muted",
                )}
              >
                {carbonScore}
              </span>
            )}
            {L.isBank && (
              <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-800">
                <Landmark className="h-3 w-3" />
                PCAF · Scope 3 cat. 15
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {[item.purchase_category, item.city, item.country]
              .filter(Boolean)
              .map(String)
              .join(" · ")}
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{L.colOutstanding}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {fmt(trace.outstanding)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                {trace.currency}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{L.colEmissions}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {fmt(trace.financedEmissionsTco2e, 1)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                tCO₂e
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Score qualité PCAF</p>
            <p className="mt-1 text-xl font-bold">
              {trace.dataQuality}
              <span className="text-sm font-medium text-muted-foreground">
                {" "}
                / 5
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attribution</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {fmt(trace.attributionFactor * 100, 1)} %
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: identity + engagement */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {L.isBank ? "Contrepartie financée" : "Identité fournisseur"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Secteur" value={String(item.purchase_category || "—")} />
              <Row
                label="Type d'actif"
                value={L.isBank ? "Prêt / financement (business loans)" : String(item.purchase_subcategory || "Achats")}
              />
              <Row
                label="Localisation"
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                  </span>
                }
              />
              <Row
                label="Exercice"
                value={String(primary?.reference_year || item.annual_spend_year || "—")}
              />
              <Row
                label="Catégorie GHG"
                value="Scope 3 — catégorie 15 (investments / financed emissions)"
              />
              {item.has_sbti_target ? (
                <Row label="SBTi" value="Cible science-based déclarée" />
              ) : null}
              {item.has_carbon_footprint ? (
                <Row label="Bilan GES emprunteur" value="Disponible" />
              ) : (
                <Row label="Bilan GES emprunteur" value="Non fourni — proxy / estimation" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                Qualité des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium text-foreground">{trace.dataQualityLabel}</p>
              <p className="leading-relaxed text-muted-foreground">
                {trace.dataQualityDescription}
              </p>
              <Row label="Option PCAF" value={trace.optionLabel} />
              <Row
                label="Méthode saisie"
                value={
                  trace.dataMethod === "supplier_specific"
                    ? "Données spécifiques emprunteur"
                    : "Estimation / proxy"
                }
              />
              {trace.sourceType && (
                <Row
                  label="Source"
                  value={
                    trace.sourceType === "invoice"
                      ? "Reporting / pièce justificative"
                      : "Estimation documentée"
                  }
                />
              )}
              {trace.uncertaintyPct != null && (
                <Row label="Incertitude" value={`± ${fmt(trace.uncertaintyPct)} %`} />
              )}
              <Row
                label="Indice de confiance"
                value={`${fmt(Number(item.confidence_index) || 0)} %`}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: calculation */}
        <div className="space-y-5 lg:col-span-3">
          <Card className="border-emerald-200/70 bg-emerald-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-emerald-700" />
                Méthode de calcul PCAF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Calcul conforme à {trace.citation} — {trace.assetClassSection}{" "}
                <span className="font-medium text-foreground">{trace.assetClass}</span>
                {" "}(société {trace.listing === "listed" ? "cotée" : "non cotée"}).
              </p>

              <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Formule PCAF §5.2
                </p>
                <p className="font-mono text-sm text-foreground">{trace.formula}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {trace.attributionFormula}
                </p>
              </div>

              <ol className="space-y-3">
                {trace.steps.map((step, i) => (
                  <li
                    key={step.label}
                    className="flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {step.label}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {step.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Classe d&apos;actifs</p>
                  <p className="font-medium">{trace.assetClass}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Option / score</p>
                  <p className="font-medium">
                    {trace.optionLabel} · Score {trace.dataQuality}/5
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scopes emprunteur</p>
                  <p className="font-medium">{trace.scopesCovered}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Référence</p>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {trace.citation}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>{trace.reportingNote}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Leaf className="h-4 w-4 text-muted-foreground" />
                Lignes d&apos;encours {primary?.reference_year || ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune ligne d&apos;encours enregistrée.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Description</th>
                        <th className="px-2 py-2 text-right font-medium">Montant</th>
                        <th className="px-2 py-2 text-right font-medium">
                          Émissions
                        </th>
                        <th className="px-2 py-2 font-medium">Méthode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p) => (
                        <tr key={String(p.id)} className="border-b border-border/60">
                          <td className="px-2 py-2">
                            {String(p.description || "—")}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {fmt(Number(p.amount) || 0)} {String(p.currency || "")}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums font-medium">
                            {fmt((Number(p.calculated_emissions_kgco2e) || 0) / 1000, 1)}{" "}
                            tCO₂e
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">
                            {String(p.data_method || "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="max-w-[60%] text-right font-medium text-foreground">
      {value}
    </span>
  </div>
);

export default CounterpartyFiche;
