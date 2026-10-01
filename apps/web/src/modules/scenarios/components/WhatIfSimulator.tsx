/**
 * Simulateur What-If — projection carbone & financière.
 * Ne modifie jamais activity_data ni le bilan validé.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  ArrowRight,
  FlaskConical,
  Loader2,
  Plus,
  Save,
  Trash2,
  Target,
  AlertCircle,
} from "lucide-react";
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
import { useAppData } from "@/contexts/AppDataContext";
import { useOrganizationData } from "@/hooks/useOrganizationData";
import { useOrganizationYears } from "@/hooks/useOrganizationYears";
import { DashboardAggregator } from "@/lib/calculators/DashboardAggregator";
import { categoryDisplayLabel } from "@/lib/dashboard/categoryDisplayLabel";
import { api } from "@/integrations/api/client";
import { useClimateObjectives } from "@/modules/transition/hooks/useClimateObjectives";
import { useClimateReferenceTrajectories } from "@/modules/transition/hooks/useClimateReferenceTrajectories";
import {
  buildCompanyTargetSeries,
  buildReferenceSeries,
  resolveTargetEmissions,
} from "@/modules/transition/lib/trajectoryComparison";
import { useScenarios, useScenarioLevers } from "../hooks/useScenarios";
import {
  computeWhatIfImpact,
  hypothesisToRawLegacy,
  hypothesesFromRawLegacy,
  isHypothesisComplete,
  WHATIF_CALC_VERSION,
  type WhatIfHypothesis,
  type WhatIfLeverKind,
} from "../lib/whatIfCompute";
import type { ClimateScenario } from "../types";

const KG_TO_T = 0.001;
const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);

const CURRENCY: Record<string, string> = {
  TND: "TND",
  EUR: "€",
  USD: "$",
  MAD: "MAD",
  XOF: "FCFA",
};

interface CategoryOption {
  key: string;
  label: string;
  tonnes: number;
}

function newLocalId() {
  return `local-${crypto.randomUUID()}`;
}

function emptyHypothesis(cat?: CategoryOption): WhatIfHypothesis {
  return {
    id: newLocalId(),
    kind: "consumption_reduction",
    categoryKey: cat?.key ?? "",
    categoryLabel: cat?.label ?? "",
    baselineCategoryTco2e: cat?.tonnes ?? 0,
    enabled: true,
    reductionPercent: 20,
    simulatedCategoryTco2e: null,
    reductionTco2eHypothesis: null,
    hypothesisNote: null,
    unitPriceCurrent: null,
    unitPriceSimulated: null,
    quantity: null,
    investment: null,
    recurringCostDelta: null,
  };
}

export const WhatIfSimulator: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, organizationLoading } = useAppData();
  const { organization } = useOrganizationData();
  const { defaultYear, allowedYears } = useOrganizationYears(organizationId);
  const { scenarios, loading: scenariosLoading, createScenario, updateScenario, fetchScenarios } =
    useScenarios();
  const { primary: primaryObjective } = useClimateObjectives();
  const { active: referenceTrajectory } = useClimateReferenceTrajectories();

  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? defaultYear ?? new Date().getFullYear();
  const [baselineTotal, setBaselineTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingBaseline, setLoadingBaseline] = useState(true);
  const [hypotheses, setHypotheses] = useState<WhatIfHypothesis[]>([]);
  const [scenarioName, setScenarioName] = useState("Scénario What-If");
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedForActions, setSelectedForActions] = useState<Set<string>>(new Set());
  const [pushingActions, setPushingActions] = useState(false);

  const { levers, fetchLevers } = useScenarioLevers(activeScenarioId);
  const currency = CURRENCY[organization?.currency || "TND"] || organization?.currency || "";

  // Charger baseline réelle (tenant + exercice) — jamais de catégories inventées.
  useEffect(() => {
    if (!organizationId || organizationLoading) return;
    let cancelled = false;
    (async () => {
      setLoadingBaseline(true);
      try {
        const data = await DashboardAggregator.aggregate(
          organizationId,
          `${activeYear}-01-01`,
          `${activeYear}-12-31`,
        );
        if (cancelled) return;
        const totalT = (data.bilanCarbone.totalEmissions || 0) * KG_TO_T;
        setBaselineTotal(totalT);
        const fromBreakdown = (data.bilanCarbone.breakdown || [])
          .filter(
            (b) =>
              b.emissions > 0 && !/^Scope\s*[123]$/i.test(String(b.category || "").trim()),
          )
          .map((b) => ({
            key: b.category,
            label: categoryDisplayLabel(b.category),
            tonnes: b.emissions * KG_TO_T,
          }));
        if (fromBreakdown.length > 0) {
          setCategories(fromBreakdown.sort((a, b) => b.tonnes - a.tonnes));
        } else {
          const map = new Map<string, number>();
          for (const line of data.bilanCarbone.detailedBreakdown || []) {
            if (line.emissions <= 0) continue;
            const key = line.subcategory || line.category || "other";
            map.set(key, (map.get(key) || 0) + line.emissions);
          }
          setCategories(
            [...map.entries()]
              .map(([key, kg]) => ({
                key,
                label: categoryDisplayLabel(key),
                tonnes: kg * KG_TO_T,
              }))
              .sort((a, b) => b.tonnes - a.tonnes),
          );
        }
      } catch {
        if (!cancelled) {
          setBaselineTotal(0);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoadingBaseline(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, organizationLoading, activeYear]);

  // Recharger hypothèses depuis leviers persistés
  useEffect(() => {
    if (!activeScenarioId || levers.length === 0) return;
    const restored: WhatIfHypothesis[] = [];
    for (const lever of levers) {
      const raw = (lever as unknown as { raw_legacy?: unknown }).raw_legacy;
      const h = hypothesesFromRawLegacy(raw);
      if (h) {
        restored.push({ ...h, id: lever.id, enabled: lever.enabled !== false });
      } else if (lever.source_emission_targeted || lever.custom_lever_name) {
        restored.push({
          id: lever.id,
          kind: "custom",
          categoryKey: lever.source_emission_targeted || "custom",
          categoryLabel: lever.custom_lever_name || lever.source_emission_targeted || "Levier",
          baselineCategoryTco2e: Number(lever.max_reduction_tco2e) || 0,
          enabled: lever.enabled !== false,
          reductionTco2eHypothesis: Number(lever.max_reduction_tco2e) || 0,
        });
      }
    }
    if (restored.length > 0) setHypotheses(restored);
  }, [activeScenarioId, levers]);

  const impact = useMemo(
    () => computeWhatIfImpact(baselineTotal, hypotheses),
    [baselineTotal, hypotheses],
  );

  const barData = useMemo(
    () => [
      { name: "Situation actuelle", value: Math.round(impact.referenceTco2e * 10) / 10 },
      { name: "Scénario simulé", value: Math.round(impact.simulatedTco2e * 10) / 10 },
    ],
    [impact],
  );

  const companySeries = useMemo(
    () => buildCompanyTargetSeries(primaryObjective),
    [primaryObjective],
  );
  const refSeries = useMemo(
    () => buildReferenceSeries(referenceTrajectory),
    [referenceTrajectory],
  );

  const trajectoryChart = useMemo(() => {
    const years = new Set<number>();
    years.add(activeYear);
    for (const p of companySeries) years.add(p.year);
    for (const p of refSeries) years.add(p.year);
    const sorted = [...years].sort((a, b) => a - b);
    if (sorted.length < 2) return null;
    return sorted.map((y) => ({
      year: y,
      actuel: y === activeYear ? impact.referenceTco2e : null,
      scenario: y >= activeYear ? impact.simulatedTco2e : null,
      objectif: companySeries.find((p) => p.year === y)?.value ?? null,
      ref15: refSeries.find((p) => p.year === y)?.emissionsT ?? null,
    }));
  }, [activeYear, companySeries, refSeries, impact]);

  const objectiveTarget = primaryObjective ? resolveTargetEmissions(primaryObjective) : null;

  const updateHypothesis = (id: string, patch: Partial<WhatIfHypothesis>) => {
    setHypotheses((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const addHypothesis = (kind: WhatIfLeverKind = "consumption_reduction") => {
    const cat = categories[0];
    if (!cat && kind === "consumption_reduction") return;
    const h = emptyHypothesis(cat);
    h.kind = kind;
    if (kind !== "consumption_reduction") {
      h.reductionPercent = null;
      h.simulatedCategoryTco2e = cat ? cat.tonnes * 0.9 : null;
      h.hypothesisNote = "Hypothèse de simulation — à valider avec facteurs / distances réels";
    }
    setHypotheses((prev) => [...prev, h]);
  };

  const removeHypothesis = (id: string) => {
    setHypotheses((prev) => prev.filter((h) => h.id !== id));
    setSelectedForActions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const loadScenario = (s: ClimateScenario) => {
    setActiveScenarioId(s.id);
    setScenarioName(s.name);
    if (s.baseline_year) setYear(s.baseline_year);
    setSaveMessage(null);
  };

  const persistScenario = useCallback(async () => {
    if (!organizationId || baselineTotal <= 0) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      let scenarioId = activeScenarioId;
      if (!scenarioId) {
        const created = await createScenario({
          name: scenarioName.trim() || "Scénario What-If",
          scenario_type: "custom",
          status: "draft",
          baseline_year: activeYear,
          start_year: activeYear,
          target_year: primaryObjective?.target_year ?? activeYear,
          baseline_emissions_tco2e: baselineTotal,
          target_emissions_tco2e: impact.simulatedTco2e,
          target_reduction_percent: impact.reductionPercent,
          baseline_source_type: "bilan",
          notes: "What-If — projection, ne remplace pas le bilan réel",
        });
        if (!created) throw new Error("create failed");
        scenarioId = created.id;
        setActiveScenarioId(scenarioId);
      } else {
        await updateScenario(scenarioId, {
          name: scenarioName.trim() || "Scénario What-If",
        });
        await api.patchClimateScenario(scenarioId, {
          baseline_year: activeYear,
          start_year: activeYear,
          target_year: primaryObjective?.target_year ?? activeYear,
          baseline_emissions_tco2e: baselineTotal,
          target_emissions_tco2e: impact.simulatedTco2e,
          target_reduction_percent: impact.reductionPercent,
          baseline_source_type: "bilan",
          raw_legacy: {
            whatif: {
              hypotheses,
              impact,
              calculation_version: WHATIF_CALC_VERSION,
              calculated_at: new Date().toISOString(),
            },
          },
        });
      }

      // Remplacer les leviers par les hypothèses courantes
      const existing = await api.listClimateScenarioLevers(scenarioId);
      for (const row of existing.items || []) {
        await api.deleteClimateScenarioLever(String(row.id));
      }

      const idMap = new Map<string, string>();
      for (const h of hypotheses) {
        if (!h.enabled || !isHypothesisComplete(h)) continue;
        const { item } = await api.createClimateScenarioLever({
          scenario_id: scenarioId,
          custom_lever_name: `${h.categoryLabel} (${h.kind})`,
          category: h.kind,
          description: h.hypothesisNote,
          enabled: true,
          source_emission_targeted: h.categoryKey,
          max_reduction_tco2e: impact.levers.find((l) => l.id === h.id)?.reductionTco2e ?? 0,
          estimated_cost: h.investment ?? null,
          confidence_level: h.kind === "consumption_reduction" ? "medium" : "low",
          raw_legacy: hypothesisToRawLegacy(h),
        });
        if (item?.id) idMap.set(h.id, String(item.id));
      }

      if (idMap.size > 0) {
        setHypotheses((prev) =>
          prev.map((h) => (idMap.has(h.id) ? { ...h, id: idMap.get(h.id)! } : h)),
        );
      }

      await api.computeClimateScenario(scenarioId, {
        baseline_emissions_tco2e: baselineTotal,
        baseline_year: activeYear,
        target_year: primaryObjective?.target_year ?? activeYear,
        reduction_tco2e: impact.reductionTco2e,
        calculation_version: WHATIF_CALC_VERSION,
        impact_meta: {
          hypotheses,
          impact,
          financial: impact.financial,
        },
      });

      await fetchScenarios();
      await fetchLevers();
      setSaveMessage("Scénario enregistré (projection — bilan réel inchangé).");
    } catch {
      setSaveMessage("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }, [
    organizationId,
    baselineTotal,
    activeScenarioId,
    createScenario,
    scenarioName,
    activeYear,
    primaryObjective,
    impact,
    updateScenario,
    hypotheses,
    fetchScenarios,
    fetchLevers,
  ]);

  const pushToActionPlan = async () => {
    if (selectedForActions.size === 0) return;
    setPushingActions(true);
    try {
      let roadmaps = (await api.listClimateRoadmaps()).items || [];
      if (roadmaps.length === 0) {
        const { item } = await api.createClimateRoadmap({
          name: "Plan d'actions Transition",
          status: "draft",
          baseline_year: activeYear,
        });
        if (item) roadmaps = [item];
      }
      const roadmapId = String(roadmaps[0].id);
      for (const h of hypotheses) {
        if (!selectedForActions.has(h.id)) continue;
        const leverImpact = impact.levers.find((l) => l.id === h.id);
        if (!leverImpact || leverImpact.reductionTco2e <= 0) continue;
        await api.createClimateAction({
          roadmap_id: roadmapId,
          title: `What-If · ${h.categoryLabel}`,
          description: [
            `Issu du scénario « ${scenarioName} » (exercice ${activeYear}).`,
            h.hypothesisNote ? `Hypothèse : ${h.hypothesisNote}` : null,
            `Type : ${h.kind}. Projection — pas une émission réelle.`,
          ]
            .filter(Boolean)
            .join(" "),
          source_emission_targeted: h.categoryKey,
          expected_reduction_tco2e: leverImpact.reductionTco2e,
          expected_savings:
            leverImpact.financialDelta != null ? -leverImpact.financialDelta : null,
          estimation_method: "scenario_whatif",
          status: "to_launch",
          comments: `Traçabilité : Bilan ${activeYear} → Scénario ${activeScenarioId || "brouillon"} → Levier ${h.id}`,
        });
      }
      navigate("/app/transition/actions");
    } catch {
      setSaveMessage("Impossible d'ajouter au Plan d'actions.");
    } finally {
      setPushingActions(false);
    }
  };

  if (organizationLoading || scenariosLoading || loadingBaseline) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (baselineTotal <= 0 || categories.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">Simuler un scénario</h1>
        <p className="text-muted-foreground">
          Aucune donnée carbone pour l&apos;exercice {activeYear}. Collectez ou validez un bilan
          avant de simuler.
        </p>
        <div className="flex gap-2">
          <Select value={String(activeYear)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(allowedYears.length ? allowedYears : [activeYear]).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/app/collecte/nouvelle?mode=bilan-carbone")}>
            Démarrer une collecte
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            <FlaskConical className="h-3.5 w-3.5" />
            Projection — ne modifie pas le bilan réel
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Simuler un scénario</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Testez vos décisions avant de les mettre en œuvre et mesurez instantanément leur impact
            carbone et financier.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(activeYear)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]" aria-label="Exercice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(allowedYears.length ? allowedYears : [activeYear]).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {scenarios.length > 0 && (
            <Select
              value={activeScenarioId ?? "__new"}
              onValueChange={(v) => {
                if (v === "__new") {
                  setActiveScenarioId(null);
                  setHypotheses([]);
                  setScenarioName("Scénario What-If");
                  return;
                }
                const s = scenarios.find((x) => x.id === v);
                if (s) loadScenario(s);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Scénarios sauvegardés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new">Nouveau scénario</SelectItem>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* GAUCHE — hypothèses */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Hypothèses du scénario</h2>
              <p className="text-xs text-muted-foreground">
                Données réelles {activeYear} · {fmt(baselineTotal)} tCO₂e · {categories.length}{" "}
                postes
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => addHypothesis("consumption_reduction")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Réduction %
              </Button>
              <Button size="sm" variant="outline" onClick={() => addHypothesis("supplier_change")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Fournisseur
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nom du scénario</Label>
            <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
          </div>

          {hypotheses.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Ajoutez un levier (ex. Carburant −20 %, Électricité −15 %, ou un changement de
              fournisseur avec hypothèses explicites).
            </p>
          )}

          <div className="space-y-4">
            {hypotheses.map((h) => {
              const cat = categories.find((c) => c.key === h.categoryKey);
              const incomplete = h.enabled && !isHypothesisComplete(h);
              return (
                <div
                  key={h.id}
                  className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Poste / activité</Label>
                      <Select
                        value={h.categoryKey}
                        onValueChange={(key) => {
                          const c = categories.find((x) => x.key === key);
                          updateHypothesis(h.id, {
                            categoryKey: key,
                            categoryLabel: c?.label ?? key,
                            baselineCategoryTco2e: c?.tonnes ?? 0,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un poste réel" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                              {c.label} · {fmt(c.tonnes, 1)} tCO₂e
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Référence poste : {fmt(h.baselineCategoryTco2e, 1)} tCO₂e
                        {cat ? "" : " (poste hors exercice — vérifier)"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeHypothesis(h.id)}
                      aria-label="Supprimer le levier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={h.kind}
                        onValueChange={(v) =>
                          updateHypothesis(h.id, { kind: v as WhatIfLeverKind })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consumption_reduction">Réduire consommation</SelectItem>
                          <SelectItem value="supplier_change">Changer fournisseur</SelectItem>
                          <SelectItem value="modal_shift">Report modal (ex. fret)</SelectItem>
                          <SelectItem value="custom">Hypothèse libre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {h.kind === "consumption_reduction" ? (
                      <div>
                        <Label>Réduction %</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={h.reductionPercent ?? ""}
                          onChange={(e) =>
                            updateHypothesis(h.id, {
                              reductionPercent: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div>
                        <Label>Émissions simulées du poste (tCO₂e)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={h.simulatedCategoryTco2e ?? ""}
                          onChange={(e) =>
                            updateHypothesis(h.id, {
                              simulatedCategoryTco2e:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {h.kind !== "consumption_reduction" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                      <span className="font-semibold">Hypothèse de simulation</span> — le changement
                      de pays / fournisseur ne réduit pas automatiquement les émissions. Saisissez
                      les émissions simulées (ou une réduction explicite) à partir des facteurs,
                      distances et quantités disponibles.
                      <Input
                        className="mt-2 bg-white"
                        placeholder="Note d'hypothèse (obligatoire recommandée)"
                        value={h.hypothesisNote ?? ""}
                        onChange={(e) =>
                          updateHypothesis(h.id, { hypothesisNote: e.target.value || null })
                        }
                      />
                      {incomplete && (
                        <p className="mt-1 flex items-center gap-1 text-amber-800">
                          <AlertCircle className="h-3.5 w-3.5" /> Renseignez les émissions simulées
                          pour activer ce levier.
                        </p>
                      )}
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Impact financier (optionnel — jamais inventé)
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label>Prix unitaire actuel ({currency})</Label>
                        <Input
                          type="number"
                          value={h.unitPriceCurrent ?? ""}
                          onChange={(e) =>
                            updateHypothesis(h.id, {
                              unitPriceCurrent:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Prix simulé ({currency})</Label>
                        <Input
                          type="number"
                          value={h.unitPriceSimulated ?? ""}
                          onChange={(e) =>
                            updateHypothesis(h.id, {
                              unitPriceSimulated:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          value={h.quantity ?? ""}
                          onChange={(e) =>
                            updateHypothesis(h.id, {
                              quantity: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Investissement ({currency})</Label>
                        <Input
                          type="number"
                          value={h.investment ?? ""}
                          onChange={(e) =>
                            updateHypothesis(h.id, {
                              investment: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </details>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedForActions.has(h.id)}
                      onChange={(e) => {
                        setSelectedForActions((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(h.id);
                          else next.delete(h.id);
                          return next;
                        });
                      }}
                    />
                    Retenir pour le Plan d&apos;actions
                  </label>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => void persistScenario()} disabled={saving || impact.reductionTco2e < 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer le scénario
            </Button>
            <Button
              variant="outline"
              disabled={selectedForActions.size === 0 || pushingActions}
              onClick={() => void pushToActionPlan()}
            >
              {pushingActions ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Target className="mr-2 h-4 w-4" />
              )}
              Ajouter au Plan d&apos;actions
            </Button>
          </div>
          {saveMessage && <p className="text-sm text-muted-foreground">{saveMessage}</p>}
        </div>

        {/* DROITE — résultats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultKpi label="Émissions de référence" value={`${fmt(impact.referenceTco2e)} tCO₂e`} real />
            <ResultKpi label="Émissions simulées" value={`${fmt(impact.simulatedTco2e)} tCO₂e`} sim />
            <ResultKpi
              label="Réduction estimée"
              value={`−${fmt(impact.reductionTco2e)} tCO₂e`}
              sim
            />
            <ResultKpi
              label="Variation"
              value={`${impact.reductionPercent >= 0 ? "−" : "+"}${fmt(Math.abs(impact.reductionPercent), 1)} %`}
              sim
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Impact du scénario</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Situation actuelle vs scénario simulé · tCO₂e
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v)} tCO₂e`, ""]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-emerald-700">
              −{fmt(impact.reductionTco2e)} tCO₂e · −{fmt(impact.reductionPercent, 1)} %
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 text-base font-semibold">Impact financier</h3>
            {impact.financial ? (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Coût actuel</p>
                  <p className="font-semibold tabular-nums">
                    {fmt(impact.financial.costCurrent, 0)} {currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Coût simulé</p>
                  <p className="font-semibold tabular-nums">
                    {fmt(impact.financial.costSimulated, 0)} {currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Économie / surcoût</p>
                  <p className="font-semibold tabular-nums">
                    {impact.financial.totalDelta <= 0 ? "" : "+"}
                    {fmt(impact.financial.totalDelta, 0)} {currency}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Impact financier : à renseigner — ajoutez prix unitaire actuel / simulé, quantité et
                investissement éventuel dans chaque levier. Aucun prix n&apos;est inventé.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-emerald-600" />
              Impact sur votre objectif
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Comparaison projection vs objectif entreprise et trajectoire 1,5 °C (si disponible).
              Un scénario n&apos;est jamais une émission réelle.
            </p>
            {trajectoryChart ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trajectoryChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actuel"
                      name="Situation actuelle"
                      stroke="#64748b"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="scenario"
                      name="Scénario (projection)"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="objectif"
                      name="Objectif entreprise"
                      stroke="#2563eb"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="ref15"
                      name="Trajectoire 1,5 °C"
                      stroke="#dc2626"
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Situation actuelle : <strong>{fmt(impact.referenceTco2e)} tCO₂e</strong>
                </p>
                <p>
                  Scénario : <strong>{fmt(impact.simulatedTco2e)} tCO₂e</strong>
                </p>
                <p>
                  Objectif entreprise :{" "}
                  <strong>
                    {objectiveTarget != null ? `${fmt(objectiveTarget)} tCO₂e` : "non défini"}
                  </strong>
                </p>
                <p>
                  Trajectoire 1,5 °C :{" "}
                  <strong>
                    {refSeries.find((p) => p.year === activeYear)
                      ? `${fmt(refSeries.find((p) => p.year === activeYear)!.emissionsT)} tCO₂e`
                      : "non disponible — créez-la dans Trajectoires"}
                  </strong>
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => navigate("/app/transition/trajectoires")}
                >
                  Voir Trajectoires <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {objectiveTarget != null && (
              <p className="mt-3 text-sm">
                {impact.simulatedTco2e <= objectiveTarget ? (
                  <span className="font-medium text-emerald-700">
                    Avec ces décisions, vous atteindriez (ou dépasseriez) l&apos;objectif entreprise
                    en projection.
                  </span>
                ) : (
                  <span className="font-medium text-amber-800">
                    Écart restant à l&apos;objectif :{" "}
                    {fmt(impact.simulatedTco2e - objectiveTarget)} tCO₂e (projection).
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultKpi: React.FC<{
  label: string;
  value: string;
  real?: boolean;
  sim?: boolean;
}> = ({ label, value, real, sim }) => (
  <div className="rounded-xl border border-border bg-card px-3 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      {real ? " · réel" : ""}
      {sim ? " · simulé" : ""}
    </p>
    <p className="mt-1 text-sm font-bold tabular-nums text-foreground sm:text-base">{value}</p>
  </div>
);

export default WhatIfSimulator;
