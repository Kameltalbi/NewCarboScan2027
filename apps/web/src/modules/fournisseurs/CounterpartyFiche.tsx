/**
 * Fiche contrepartie (PCAF) ou fournisseur classique (Scope 3 achats).
 * PCAF uniquement si financed_emissions_enabled est actif sur l'org.
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
import { assessCounterpartyRaw } from "@/lib/pcaf/methodology";
import type { ScopeCalculation } from "@/lib/pcaf/businessLoans";
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

const GHG_CAT_LABELS: Record<number, string> = {
  1: "Scope 3 — catégorie 1 (biens et services achetés)",
  2: "Scope 3 — catégorie 2 (biens immobilisés)",
  4: "Scope 3 — catégorie 4 (transport amont)",
  5: "Scope 3 — catégorie 5 (déchets)",
  6: "Scope 3 — catégorie 6 (déplacements professionnels)",
  7: "Scope 3 — catégorie 7 (domicile-travail)",
  9: "Scope 3 — catégorie 9 (transport aval)",
  15: "Scope 3 — catégorie 15 (investments / financed emissions)",
};

export const CounterpartyFiche: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const L = useSupplierLabels();
  const isPcaf = L.financedEmissionsEnabled;

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

  const emissionsKg = purchases.reduce(
    (sum, p) => sum + (Number(p.calculated_emissions_kgco2e) || 0),
    0,
  );
  const purchaseOutstanding =
    Number(primary?.amount) || Number(item?.annual_spend) || 0;
  const currency = String(
    primary?.currency || item?.annual_spend_currency || "TND",
  );
  const ghgCat = Number(item?.scope3_ghg_category) || (isPcaf ? 15 : 1);
  const emissionsT = emissionsKg / 1000;

  const rawLegacy =
    item?.raw_legacy && typeof item.raw_legacy === "object"
      ? (item.raw_legacy as Record<string, unknown>)
      : null;

  const assessment = useMemo(() => {
    if (!isPcaf) return null;
    return assessCounterpartyRaw(rawLegacy);
  }, [isPcaf, rawLegacy]);

  const outstanding = assessment?.outstandingAmount ?? purchaseOutstanding;

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">
          Impossible de charger cette {L.entitySingular}.
        </p>
        <Button variant="outline" onClick={() => navigate("/app/fournisseurs")}>
          Retour
        </Button>
      </div>
    );
  }

  const carbonScore = item.carbon_score ? String(item.carbon_score) : null;
  const dataMethod = String(primary?.data_method || item.data_method || "");
  const sourceType = primary?.source_type ? String(primary.source_type) : null;
  const uncertaintyPct =
    primary?.uncertainty_percent != null
      ? Number(primary.uncertainty_percent)
      : null;

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
            {isPcaf ? (
              <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-800">
                <Landmark className="h-3 w-3" />
                PCAF · Scope 3 cat. 15
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
                Fournisseur · Scope 3 cat. {ghgCat}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{L.colOutstanding}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {fmt(outstanding)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                {currency}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {isPcaf ? "Financé — scope 1+2" : L.colEmissions}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {fmt(
                isPcaf
                  ? assessment?.scope12.financedEmissionsTco2e ?? 0
                  : emissionsT,
                1,
              )}{" "}
              <span className="text-sm font-medium text-muted-foreground">tCO₂e</span>
            </p>
            {isPcaf && assessment?.scope12.status !== "calculated" && (
              <p className="mt-1 text-xs text-muted-foreground">Non calculé</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {isPcaf ? "Financé — scope 3" : "Indice de confiance"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {isPcaf ? (
                <>
                  {assessment?.scope3.status === "calculated"
                    ? fmt(assessment.scope3.financedEmissionsTco2e ?? 0, 1)
                    : "—"}{" "}
                  <span className="text-sm font-medium text-muted-foreground">tCO₂e</span>
                </>
              ) : (
                <>
                  {fmt(Number(item.confidence_index) || 0)}
                  <span className="text-sm font-medium text-muted-foreground"> %</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {isPcaf ? "Score PCAF S1+2 / S3" : "Catégorie GHG"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {isPcaf
                ? `${assessment?.scope12.score ?? "—"} / ${assessment?.scope3.score ?? "—"}`
                : `Cat. ${ghgCat}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {isPcaf ? "Contrepartie financée" : "Identité fournisseur"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Secteur" value={String(item.purchase_category || "—")} />
              <Row
                label={isPcaf ? "Type d'actif" : "Sous-catégorie"}
                value={
                  isPcaf
                    ? "Prêt / financement (business loans)"
                    : String(item.purchase_subcategory || "Achats")
                }
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
                value={GHG_CAT_LABELS[ghgCat] || `Scope 3 — catégorie ${ghgCat}`}
              />
              {item.has_sbti_target ? (
                <Row label="SBTi" value="Cible science-based déclarée" />
              ) : null}
              <Row
                label={isPcaf ? "Bilan GES emprunteur" : "Bilan carbone fournisseur"}
                value={
                  item.has_carbon_footprint
                    ? "Disponible"
                    : isPcaf
                      ? "Non fourni — proxy / estimation"
                      : "Non fourni — estimation"
                }
              />
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
              {isPcaf && assessment ? (
                <>
                  <Row
                    label="Scope 1+2"
                    value={
                      assessment.scope12.optionLabel
                        ? `${assessment.scope12.optionLabel} — score ${assessment.scope12.score}`
                        : "Non calculé"
                    }
                  />
                  <Row
                    label="Scope 3"
                    value={
                      assessment.scope3.optionLabel
                        ? `${assessment.scope3.optionLabel} — score ${assessment.scope3.score}`
                        : "Non calculé"
                    }
                  />
                </>
              ) : (
                <p className="leading-relaxed text-muted-foreground">
                  Qualité basée sur la méthode de collecte des données d&apos;achats
                  (factures, déclarations fournisseur ou estimation).
                </p>
              )}
              <Row
                label="Méthode saisie"
                value={
                  dataMethod === "supplier_specific"
                    ? isPcaf
                      ? "Données spécifiques emprunteur"
                      : "Données spécifiques fournisseur"
                    : "Estimation / proxy"
                }
              />
              {sourceType && (
                <Row
                  label="Source"
                  value={
                    sourceType === "invoice"
                      ? "Reporting / pièce justificative"
                      : "Estimation documentée"
                  }
                />
              )}
              {uncertaintyPct != null && (
                <Row label="Incertitude" value={`± ${fmt(uncertaintyPct)} %`} />
              )}
              <Row
                label="Indice de confiance"
                value={`${fmt(Number(item.confidence_index) || 0)} %`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-3">
          {isPcaf ? (
            <Card className="border-emerald-200/70 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4 text-emerald-700" />
                  Voir le calcul
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  PCAF (2025) Part A §5.2 — Business loans and unlisted equity.
                  Société {assessment?.listing === "listed" ? "cotée (EVIC)" : "non cotée (equity + dette)"}.
                  Les scopes 1+2 et le scope 3 sont calculés séparément.
                </p>
                {assessment ? (
                  <>
                    <ScopeCalc scopeLabel="Scope 1 et 2" result={assessment.scope12} />
                    <ScopeCalc scopeLabel="Scope 3" result={assessment.scope3} />
                    {assessment.complementaryTotalTco2e != null && (
                      <p className="text-sm text-muted-foreground">
                        Total complémentaire (somme des deux périmètres calculés) :{" "}
                        <span className="font-semibold text-foreground">
                          {fmt(assessment.complementaryTotalTco2e, 1)} tCO₂e
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Données insuffisantes pour calculer les émissions financées.
                    Ajoutez l&apos;encours, le type cotée / non cotée, et soit un
                    inventaire, soit une activité physique ou économique.
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    À reporter en Scope 3 catégorie 15. Ce total n&apos;entre pas dans
                    le bilan opérationnel de la banque.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Méthode de calcul — achats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="leading-relaxed text-muted-foreground">
                  Émissions liées aux achats auprès de ce fournisseur (Scope 3,
                  catégorie {ghgCat}). Pas de calcul PCAF : ce module suit la
                  chaîne d&apos;approvisionnement, pas les émissions financées.
                </p>
                <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
                  <Row
                    label="Montant d'achats"
                    value={`${fmt(outstanding)} ${currency}`}
                  />
                  <Row
                    label="Émissions estimées"
                    value={`${fmt(emissionsT, 1)} tCO₂e`}
                  />
                  <Row
                    label="Méthode"
                    value={
                      dataMethod === "supplier_specific"
                        ? "Données spécifiques fournisseur"
                        : "Estimation / facteur monétaire ou physique"
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Leaf className="h-4 w-4 text-muted-foreground" />
                {isPcaf
                  ? `Lignes d'encours ${primary?.reference_year || ""}`
                  : `Lignes d'achats ${primary?.reference_year || ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isPcaf
                    ? "Aucune ligne d'encours enregistrée."
                    : "Aucune ligne d'achat enregistrée."}
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

const ScopeCalc: React.FC<{ scopeLabel: string; result: ScopeCalculation }> = ({
  scopeLabel,
  result,
}) => (
  <div className="space-y-3 rounded-lg border border-emerald-200 bg-white px-4 py-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        {scopeLabel}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {result.optionLabel ?? "Méthode PCAF non calculable"}
      </p>
      {result.score != null && (
        <p className="text-xs text-muted-foreground">Qualité : score {result.score}</p>
      )}
    </div>
    <p className="text-sm leading-relaxed text-muted-foreground">
      <span className="font-medium text-foreground">Pourquoi cette méthode ? </span>
      {result.why}
    </p>
    {result.equation && (
      <p className="font-mono text-xs text-foreground">{result.equation}</p>
    )}
    {result.steps.length > 0 && (
      <ol className="space-y-2">
        {result.steps.map((step, i) => (
          <li key={`${step.label}-${i}`} className="text-sm">
            <span className="text-muted-foreground">{step.label} — </span>
            <span className="font-medium">{step.value}</span>
          </li>
        ))}
      </ol>
    )}
    {result.improvements.length > 0 && result.status !== "calculated" && (
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {result.improvements.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )}
    {result.traces.map((trace) => (
      <p key={trace} className="text-xs text-muted-foreground">
        {trace}
      </p>
    ))}
    {result.reference && (
      <p className="text-xs text-muted-foreground">{result.reference}</p>
    )}
  </div>
);

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
