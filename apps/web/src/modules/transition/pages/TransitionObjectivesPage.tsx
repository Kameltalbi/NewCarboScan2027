import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAvailableDataSources } from "@/modules/climate-roadmap/hooks/useAvailableBaselineData";
import { useOrganizationSites } from "@/hooks/useOrganizationSites";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useClimateObjectives } from "../hooks/useClimateObjectives";
import {
  OBJECTIVE_TYPE_LABEL,
  VALIDATION_STATUS_LABEL,
  type ClimateObjective,
  type ObjectiveStatus,
  type ObjectiveType,
  type ObjectiveValidationStatus,
} from "../types";
import { resolveTargetEmissions } from "../lib/trajectoryComparison";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);

type FormState = {
  name: string;
  objective_type: ObjectiveType;
  origin: "internal" | "external_framework";
  validation_status: ObjectiveValidationStatus;
  is_primary: boolean;
  baseline_year: number;
  baseline_value: string;
  target_year: number;
  reduction_percent: string;
  target_value: string;
  unit: string;
  scopes: string;
  category_key: string;
  site_id: string;
  owner_name: string;
  notes: string;
  status: ObjectiveStatus;
};

const emptyForm = (year: number): FormState => ({
  name: "",
  objective_type: "absolute_reduction",
  origin: "internal",
  validation_status: "company_objective",
  is_primary: true,
  baseline_year: year,
  baseline_value: "",
  target_year: 2030,
  reduction_percent: "30",
  target_value: "",
  unit: "tCO2e",
  scopes: "1,2",
  category_key: "",
  site_id: "",
  owner_name: "",
  notes: "",
  status: "active",
});

export const TransitionObjectivesPage: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { sites } = useOrganizationSites(organizationId ?? undefined);
  const dataSources = useAvailableDataSources();
  const {
    objectives,
    loading,
    createObjective,
    updateObjective,
    archiveObjective,
  } = useClimateObjectives();

  const latestBilanYear = useMemo(() => {
    const years = dataSources.bilans
      .map((b) => b.year)
      .filter((y): y is number => y != null && Number.isFinite(y));
    return years.length ? Math.max(...years) : new Date().getFullYear();
  }, [dataSources.bilans]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(latestBilanYear));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm((prev) => {
      if (prev.baseline_value !== "") return prev;
      const scopes = prev.scopes
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => n === 1 || n === 2 || n === 3);
      const bilan = dataSources.bilans.find((b) => b.year === prev.baseline_year);
      if (!bilan) return { ...prev, baseline_year: latestBilanYear };
      const value =
        scopes.includes(1) && scopes.includes(2) && !scopes.includes(3)
          ? bilan.scope1 + bilan.scope2
          : scopes.length === 1 && scopes[0] === 1
            ? bilan.scope1
            : scopes.length === 1 && scopes[0] === 2
              ? bilan.scope2
              : scopes.length === 1 && scopes[0] === 3
                ? bilan.scope3
                : bilan.totalEmissions;
      return {
        ...prev,
        baseline_year: prev.baseline_year || latestBilanYear,
        baseline_value: value > 0 ? String(Math.round(value * 10) / 10) : prev.baseline_value,
      };
    });
  }, [open, dataSources.bilans, latestBilanYear]);

  const active = useMemo(
    () => objectives.filter((o) => o.status === "active" || o.status === "draft"),
    [objectives],
  );

  const refillBaseline = () => {
    const scopes = form.scopes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n === 1 || n === 2 || n === 3);
    const bilan = dataSources.bilans.find((b) => b.year === form.baseline_year);
    if (!bilan) {
      toast.error(`Aucun bilan pour ${form.baseline_year}`);
      return;
    }
    const value =
      scopes.includes(1) && scopes.includes(2) && !scopes.includes(3)
        ? bilan.scope1 + bilan.scope2
        : bilan.totalEmissions;
    setForm({ ...form, baseline_value: String(Math.round(value * 10) / 10) });
    toast.success("Valeur reprise depuis le bilan CarboScan");
  };

  const onSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nom obligatoire");
      return;
    }
    if (form.target_year <= form.baseline_year) {
      toast.error("L'année cible doit être postérieure à l'année de référence");
      return;
    }
    setSaving(true);
    try {
      const scopes = form.scopes
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => n === 1 || n === 2 || n === 3);
      await createObjective({
        name: form.name.trim(),
        objective_type: form.objective_type,
        origin: form.origin,
        validation_status: form.validation_status,
        is_primary: form.is_primary,
        baseline_year: form.baseline_year,
        baseline_value: form.baseline_value === "" ? null : Number(form.baseline_value),
        target_year: form.target_year,
        reduction_percent:
          form.reduction_percent === "" ? null : Number(form.reduction_percent),
        target_value: form.target_value === "" ? null : Number(form.target_value),
        unit: form.unit || "tCO2e",
        baseline_unit: form.unit || "tCO2e",
        scopes: scopes.length ? scopes : [1, 2],
        category_key: form.category_key || null,
        site_id: form.site_id || null,
        owner_name: form.owner_name || null,
        notes: form.notes || null,
        status: form.status,
      });
      toast.success("Objectif entreprise créé");
      setOpen(false);
      setForm(emptyForm(latestBilanYear));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  };

  if (loading || dataSources.loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes objectifs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Objectifs entreprise personnalisés. Plusieurs trajectoires possibles ; une seule
            est principale.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm(latestBilanYear));
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un objectif
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Exemple : réduire les émissions Scope 1 + 2 de 30 % d&apos;ici 2030, avec la
            référence reprise depuis le bilan {latestBilanYear}.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setForm({
                ...emptyForm(latestBilanYear),
                name: "Réduire les émissions Scope 1 + 2 de 30 % d'ici 2030",
                scopes: "1,2",
                reduction_percent: "30",
                target_year: 2030,
                is_primary: true,
              });
              setOpen(true);
            }}
          >
            + Créer cet objectif type
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Réf. → Cible</th>
                <th className="px-4 py-3 font-medium">Réduction</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {active.map((o) => (
                <ObjectiveRow
                  key={o.id}
                  objective={o}
                  onMakePrimary={async () => {
                    await updateObjective(o.id, { is_primary: true });
                    toast.success("Objectif principal mis à jour");
                  }}
                  onArchive={async () => {
                    await archiveObjective(o.id);
                    toast.success("Objectif archivé");
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un objectif</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Nom">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Réduire les émissions Scope 1 + 2 de 30 % d'ici 2030"
              />
            </Field>
            <Field label="Type">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.objective_type}
                onChange={(e) =>
                  setForm({ ...form, objective_type: e.target.value as ObjectiveType })
                }
              >
                {(Object.keys(OBJECTIVE_TYPE_LABEL) as ObjectiveType[]).map((k) => (
                  <option key={k} value={k}>
                    {OBJECTIVE_TYPE_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Année de référence">
                <Input
                  type="number"
                  value={form.baseline_year}
                  onChange={(e) =>
                    setForm({ ...form, baseline_year: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Année cible">
                <Input
                  type="number"
                  value={form.target_year}
                  onChange={(e) =>
                    setForm({ ...form, target_year: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="Valeur de référence">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.baseline_value}
                  onChange={(e) => setForm({ ...form, baseline_value: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={refillBaseline}>
                  Depuis bilan
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Réduction cible (%)">
                <Input
                  type="number"
                  value={form.reduction_percent}
                  onChange={(e) => setForm({ ...form, reduction_percent: e.target.value })}
                />
              </Field>
              <Field label="Valeur cible (optionnel)">
                <Input
                  type="number"
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unité">
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </Field>
              <Field label="Scopes (ex. 1,2)">
                <Input
                  value={form.scopes}
                  onChange={(e) => setForm({ ...form, scopes: e.target.value })}
                />
              </Field>
            </div>
            {(form.objective_type === "by_category" || form.objective_type === "energy") && (
              <Field label="Catégorie / poste">
                <Input
                  value={form.category_key}
                  onChange={(e) => setForm({ ...form, category_key: e.target.value })}
                  placeholder="ex. electricity_grid"
                />
              </Field>
            )}
            {(form.objective_type === "by_site" || sites.length > 1) && (
              <Field label="Site (optionnel)">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.site_id}
                  onChange={(e) => setForm({ ...form, site_id: e.target.value })}
                >
                  <option value="">Organisation entière</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Responsable">
              <Input
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </Field>
            <Field label="Statut">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ObjectiveStatus })
                }
              >
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              />
              Objectif principal
            </label>
            <p className="text-xs text-muted-foreground">
              Statut d&apos;affichage : {VALIDATION_STATUS_LABEL[form.validation_status]} —
              jamais présenté comme SBTi validé.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void onSubmit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ObjectiveRow({
  objective,
  onMakePrimary,
  onArchive,
}: {
  objective: ClimateObjective;
  onMakePrimary: () => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const target = resolveTargetEmissions(objective);
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 font-medium">
          {objective.is_primary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          {objective.name}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {OBJECTIVE_TYPE_LABEL[objective.objective_type]}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {objective.baseline_year} → {objective.target_year}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {objective.reduction_percent != null
          ? `−${fmt(Number(objective.reduction_percent))} %`
          : target != null
            ? `${fmt(target)} ${objective.unit || "tCO₂e"}`
            : "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {VALIDATION_STATUS_LABEL[objective.validation_status]}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          {!objective.is_primary && (
            <button
              type="button"
              className="text-xs font-medium text-emerald-700 hover:underline"
              onClick={() => void onMakePrimary()}
            >
              Principal
            </button>
          )}
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => void onArchive()}
          >
            Archiver
          </button>
        </div>
      </td>
    </tr>
  );
}
