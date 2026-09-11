/**
 * Espace noyau certifiable — chaîne Collecte → Validation → Calcul → Preuve → Rapport
 * Ne dépend pas des écrans Supabase legacy.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import { ProofPanel, type SixQuestions } from "@/components/proof/ProofPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Factor = {
  id: string;
  name: string;
  stable_factor_id: string;
  value: string;
  unit_numerator: string;
  unit_denominator: string;
  category: string;
};

type Evidence = {
  id: string;
  original_quantity: string | number;
  original_unit: string;
  validation_status: string;
  origin: string;
  period_start?: string;
  period_end?: string;
};

type LedgerLine = {
  id: string;
  line_key: string;
  result_kgco2e: string;
  formula: string;
  scope: number;
};

export const CoreProofWorkspace: React.FC = () => {
  const { toast } = useToast();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("12500");
  const [unit, setUnit] = useState("kWh");
  const [sourceFilename, setSourceFilename] = useState("facture-steg.pdf");
  const [factorId, setFactorId] = useState("");
  const [scope, setScope] = useState<"1" | "2" | "3">("2");
  const [activity, setActivity] = useState("electricity");
  const [country, setCountry] = useState("TN");
  const [calcMode, setCalcMode] = useState<"resolver" | "pin">("resolver");
  const [lastResolution, setLastResolution] = useState<Record<string, unknown> | null>(null);

  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runTotals, setRunTotals] = useState<Record<string, string> | null>(null);
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<{
    proofId: string;
    lineKey: string;
    sixQuestions: SixQuestions;
    resultKg?: string;
  } | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, e] = await Promise.all([api.listFactors(), api.listEvidence()]);
      const items = (f.items ?? []) as Factor[];
      setFactors(items);
      setEvidenceList((e.items ?? []) as Evidence[]);
      if (!factorId && items.length) {
        const elec = items.find((x) => x.stable_factor_id === "electricity_kwh");
        setFactorId(elec?.id ?? items[0].id);
        if (elec) {
          setUnit(elec.unit_denominator);
          setScope("2");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [factorId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedFactor = useMemo(
    () => factors.find((f) => f.id === factorId),
    [factors, factorId],
  );

  const createEvidence = async () => {
    setBusy(true);
    try {
      const year = new Date().getFullYear();
      const res = await api.createEvidence({
        origin: "manual",
        extractionMethod: "human",
        originalQuantity: quantity,
        originalUnit: unit,
        periodStart: `${year}-01-01`,
        periodEnd: `${year}-01-31`,
        sourceFilename,
        sourceType: "invoice",
        sourcePage: 2,
        dataClass: "measured",
        validationStatus: "submitted",
        uncertaintyPct: "8",
      });
      const id = String(res.evidence.id);
      setActiveEvidenceId(id);
      toast({ title: "Preuve créée", description: `Statut: submitted (${id.slice(0, 8)}…)` });
      await refresh();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Création preuve",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const validateEvidence = async () => {
    if (!activeEvidenceId) return;
    setBusy(true);
    try {
      await api.validateEvidence(activeEvidenceId, "validated", "Revue humaine noyau");
      toast({ title: "Preuve validée" });
      await refresh();
    } catch (err) {
      toast({
        title: "Erreur validation",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const applyFactorTemplate = (id: string) => {
    setFactorId(id);
    const f = factors.find((x) => x.id === id);
    if (!f) return;
    setUnit(f.unit_denominator);
    const map: Record<string, { activity: string; country: string; scope: "1" | "2" | "3" }> = {
      electricity_kwh: { activity: "electricity", country: "TN", scope: "2" },
      heat_kwh: { activity: "heat", country: "TN", scope: "2" },
      gas_m3: { activity: "natural gas", country: "TN", scope: "1" },
      fuel_liters: { activity: "fuel oil", country: "TN", scope: "1" },
      fleet_diesel: { activity: "diesel", country: "TN", scope: "1" },
      fleet_essence: { activity: "essence", country: "TN", scope: "1" },
      refrigerant_kg: { activity: "refrigerant", country: "TN", scope: "1" },
      purchases_dt: { activity: "purchases", country: "TN", scope: "3" },
    };
    const t = map[f.stable_factor_id];
    if (t) {
      setActivity(t.activity);
      setCountry(t.country);
      setScope(t.scope);
    }
  };

  const runCalculate = async () => {
    setBusy(true);
    setProvenance(null);
    setReportId(null);
    setLastResolution(null);
    try {
      const year = new Date().getFullYear();
      let calc: {
        runId: string;
        totals: Record<string, string>;
        resolution?: Record<string, unknown>;
      };

      if (calcMode === "resolver") {
        calc = await api.resolveAndCalculate({
          method: "bilan_carbone",
          periodStart: `${year}-01-01`,
          periodEnd: `${year}-12-31`,
          lineKey: activity.replace(/\s+/g, "_") || "line-1",
          scope: Number(scope) as 1 | 2 | 3,
          evidenceId: activeEvidenceId ?? undefined,
          activity,
          quantity,
          unit,
          country: country || undefined,
        });
        setLastResolution(calc.resolution ?? null);
      } else {
        if (!factorId) {
          toast({
            title: "Facteur requis",
            description: "Mode pin Core TN : choisissez un facteur registre.",
            variant: "destructive",
          });
          return;
        }
        calc = (await api.calculate({
          method: "bilan_carbone",
          periodStart: `${year}-01-01`,
          periodEnd: `${year}-12-31`,
          lines: [
            {
              lineKey: selectedFactor?.stable_factor_id ?? "line-1",
              scope: Number(scope) as 1 | 2 | 3,
              evidenceId: activeEvidenceId ?? undefined,
              factorId,
              activityQuantity: quantity,
              activityUnit: unit,
            },
          ],
        })) as { runId: string; totals: Record<string, string> };
      }

      setRunId(calc.runId);
      setRunTotals(calc.totals);
      const detail = await api.getRun(calc.runId);
      const lines = (detail.lines ?? []) as LedgerLine[];
      setLedgerLines(lines);
      if (lines[0]) {
        setSelectedLineId(lines[0].id);
        await loadProvenance(lines[0].id);
      }
      toast({ title: "Calcul enregistré", description: `Run ${calc.runId.slice(0, 8)}…` });
    } catch (err) {
      toast({
        title: "Erreur calcul",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const loadProvenance = async (lineId: string) => {
    const p = await api.getLedgerProvenance(lineId);
    setProvenance({
      proofId: p.proofId,
      lineKey: p.lineKey,
      sixQuestions: p.sixQuestions,
      resultKg: String(p.sixQuestions.quelleFormule.resultKgCO2e ?? ""),
    });
  };

  const publish = async () => {
    if (!runId) return;
    setBusy(true);
    try {
      await api.publishRun(runId);
      toast({ title: "Bilan publié (snapshot immuable)" });
    } catch (err) {
      toast({
        title: "Erreur publication",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const createReport = async () => {
    if (!runId) return;
    setBusy(true);
    try {
      const res = (await api.reportFromRun(
        runId,
        `Rapport vérifiable ${new Date().toISOString().slice(0, 10)}`,
      )) as { report?: { id?: string }; id?: string };
      const id = res.report?.id ?? res.id ?? null;
      setReportId(id ? String(id) : "ok");
      toast({ title: "Rapport généré depuis le ledger" });
    } catch (err) {
      toast({
        title: "Erreur rapport",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Noyau de preuve carbone
        </h1>
        <p className="text-muted-foreground mt-1">
          Collecte → Validation → Calcul certifiable → Publication → Rapport. Modules ACV/CBAM hors noyau.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 flex gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            {error} — vérifiez la session et que les migrations 011–012 sont appliquées.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Collecte (preuve)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Quantité</Label>
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Unité</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Document source</Label>
              <Input
                value={sourceFilename}
                onChange={(e) => setSourceFilename(e.target.value)}
              />
            </div>
            <Button onClick={createEvidence} disabled={busy}>
              Créer preuve (submitted)
            </Button>
            {activeEvidenceId && (
              <p className="text-xs text-muted-foreground font-mono">{activeEvidenceId}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Une facture OCR/Excel n’est jamais « réelle » tant qu’elle n’est pas validée.
            </p>
            <Button
              variant="secondary"
              onClick={validateEvidence}
              disabled={busy || !activeEvidenceId}
            >
              Valider la preuve active
            </Button>
            <div className="space-y-1 max-h-40 overflow-auto text-xs">
              {evidenceList.slice(0, 8).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="w-full text-left flex items-center justify-between gap-2 rounded border px-2 py-1 hover:bg-muted/50"
                  onClick={() => setActiveEvidenceId(e.id)}
                >
                  <span className="font-mono truncate">{e.id.slice(0, 8)}…</span>
                  <Badge variant={e.validation_status === "validated" ? "default" : "outline"}>
                    {e.validation_status}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Calcul certifiable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Mode de calcul</Label>
              <Select
                value={calcMode}
                onValueChange={(v) => setCalcMode(v as "resolver" | "pin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolver">Factor Resolver (recommandé)</SelectItem>
                  <SelectItem value="pin">Pin Core TN (/v1/calculate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {calcMode === "resolver" ? (
              <>
                <div className="space-y-1">
                  <Label>Activité</Label>
                  <Input value={activity} onChange={(e) => setActivity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Pays (ISO)</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label>Modèle Core TN (optionnel)</Label>
                  <Select value={factorId} onValueChange={applyFactorTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Préremplir depuis Core TN" />
                    </SelectTrigger>
                    <SelectContent>
                      {factors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label>Facteur (registre Core TN)</Label>
                <Select value={factorId} onValueChange={setFactorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un facteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {factors.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} — {f.value} {f.unit_numerator}/{f.unit_denominator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "1" | "2" | "3")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Scope 1</SelectItem>
                  <SelectItem value="2">Scope 2</SelectItem>
                  <SelectItem value="3">Scope 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runCalculate}
              disabled={busy || (calcMode === "pin" && !factorId) || (calcMode === "resolver" && !activity)}
            >
              {calcMode === "resolver" ? "Calculer via Resolver" : "Calculer via carbon-engine"}
            </Button>
            {lastResolution && (
              <p className="text-xs text-muted-foreground">
                Resolver: {String(lastResolution.status)}
                {lastResolution.selectedFactor
                  ? ` → ${(lastResolution.selectedFactor as { stableFactorId?: string; source?: { key?: string } }).stableFactorId} (${(lastResolution.selectedFactor as { source?: { key?: string } }).source?.key})`
                  : ""}
              </p>
            )}
            {runTotals && (
              <p className="text-sm">
                Total run : <strong>{runTotals.total} kgCO₂e</strong>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Publication & rapport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="secondary" onClick={publish} disabled={busy || !runId}>
              Publier le run (snapshot)
            </Button>
            <Button variant="outline" onClick={createReport} disabled={busy || !runId}>
              Générer rapport from-run
            </Button>
            {runId && (
              <p className="text-xs font-mono text-muted-foreground">run {runId}</p>
            )}
            {reportId && (
              <p className="text-sm flex items-center gap-1 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Rapport OK
              </p>
            )}
            {ledgerLines.length > 0 && (
              <div className="space-y-1">
                <Label>Lignes ledger</Label>
                {ledgerLines.map((l) => (
                  <Button
                    key={l.id}
                    size="sm"
                    variant={selectedLineId === l.id ? "default" : "ghost"}
                    className="w-full justify-start font-mono text-xs"
                    onClick={() => {
                      setSelectedLineId(l.id);
                      void loadProvenance(l.id);
                    }}
                  >
                    {l.line_key} → {l.result_kgco2e} kgCO₂e
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {provenance && (
        <ProofPanel
          proofId={provenance.proofId}
          lineKey={provenance.lineKey}
          resultLabel={`${provenance.resultKg ?? "—"} kgCO₂e`}
          sixQuestions={provenance.sixQuestions}
        />
      )}
    </div>
  );
};

export default CoreProofWorkspace;
