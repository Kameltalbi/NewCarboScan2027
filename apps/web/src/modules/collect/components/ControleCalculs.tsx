import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Search } from "lucide-react";
import { EmissionFactorSelector } from "@/components/scope3/EmissionFactorSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationData } from "@/hooks/useOrganizationData";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { useOrganizationSites } from "@/hooks/useOrganizationSites";
import { useOrganizationYears } from "@/hooks/useOrganizationYears";
import { mapDbRoleToOrgRole } from "@/hooks/useOrgMemberPermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { ActivityDataHistoryService, type ActivityDataHistory } from "@/lib/activity-data/ActivityDataHistoryService";
import { ActivityDataService } from "@/lib/activity-data/ActivityDataService";
import type { ActivityData } from "@/lib/activity-data/types";
import { emissionFactorSourceLabel, selectionToFactor, type AdemeFactorRef } from "@/lib/factors/ademeFactor";
import { isClosedBilanStatus } from "@/lib/calculators/frozenBilan";
import {
  activityGroupIdFor,
  assessLine,
  designationFromNotes,
  editorResult,
  factorMetadata,
  notesAfterEdit,
  periodLabel,
  proposeEdit,
  storedFactor,
  summarize,
  type ControlFactor,
  type ControlSourceLine,
} from "@/lib/collect/controlCalculations";
import { buildControlWorkbook } from "@/lib/collect/controlExport";
import { sourceLabel } from "@/lib/collect/linePreview";
import { getSubcategoryLabel } from "@/lib/scope3/subcategories";
import { api } from "@/integrations/api/client";
import { ACTIVITY_GROUPS, findChoice } from "@/modules/collect/activityGroups";

interface Draft {
  lineId: string;
  quantity: string;
  unit: string;
  factor: ControlFactor | null;
}

export const ControleCalculs: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { organization } = useOrganizationData();
  const { sites } = useOrganizationSites(organizationId || undefined);
  const { defaultYear } = useOrganizationYears(organizationId);
  const { user, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(defaultYear || new Date().getFullYear());
  const [siteFilter, setSiteFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [factorOpen, setFactorOpen] = useState(false);
  const [pendingFactor, setPendingFactor] = useState<ControlFactor | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const onYear = (event: Event) => {
      const next = Number((event as CustomEvent).detail);
      if (Number.isInteger(next)) setYear(next);
    };
    window.addEventListener("collectYearChange", onYear);
    window.addEventListener("dashboardYearChange", onYear);
    return () => {
      window.removeEventListener("collectYearChange", onYear);
      window.removeEventListener("dashboardYearChange", onYear);
    };
  }, []);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-data", organizationId, year, "controle"],
    queryFn: () => ActivityDataService.list({
      organization_id: organizationId!,
      period_start: `${year}-01-01`,
      period_end: `${year}-12-31`,
    }),
    enabled: !!organizationId,
  });
  const { data: bilans } = useQuery({
    queryKey: ["bilans", organizationId],
    queryFn: () => api.listBilans(),
    enabled: !!organizationId,
  });

  const closed = (bilans?.items || []).find((item) => Number(item.year) === year && isClosedBilanStatus(item.status));
  const orgRole = user?.role ? mapDbRoleToOrgRole(user.role) : null;
  const canEdit = !roleLoading && !closed && (user?.platformRole === "superadmin" || user?.role === "superadmin" || (orgRole != null && orgRole !== "viewer"));
  const lines = useMemo(() => activities.map((row) => toLine(row, sites)), [activities, sites]);
  const filtered = lines.filter((line) => {
    if (siteFilter !== "all" && line.siteId !== siteFilter) return false;
    if (activityFilter !== "all" && line.activityGroupId !== activityFilter) return false;
    if (search.trim() && !fold(line.designation).includes(fold(search))) return false;
    return true;
  });
  const summary = summarize(filtered.map((line) => assessLine(line)));
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const edited = filtered.find((line) => line.id === draft?.lineId) || null;
  const proposal = edited && draft ? proposeEdit(edited, {
    quantity: Number(draft.quantity),
    unit: draft.unit,
    factor: draft.factor,
  }) : null;
  const context = [organization?.name, organization?.country].filter(Boolean).join(" · ");

  useEffect(() => {
    if (defaultYear) setYear(defaultYear);
  }, [defaultYear]);
  useEffect(() => { setPage(1); }, [siteFilter, activityFilter, search, year]);
  useEffect(() => {
    if (draft && !lines.some((line) => line.id === draft.lineId)) setDraft(null);
  }, [draft, lines]);

  const openEditor = (line: ControlSourceLine) => {
    if (draft && draft.lineId !== line.id) {
      toast({ title: "Modification non enregistrée", description: "La ligne précédente n’a pas été modifiée." });
    }
    setDraft({
      lineId: line.id,
      quantity: line.quantity == null ? "" : String(line.quantity),
      unit: line.unit,
      factor: line.factor,
    });
  };

  const save = async () => {
    if (!canEdit || !edited || !draft || !proposal || proposal.blocked) return;
    setSaving(true);
    try {
      const factor = draft.factor ? toAdeme(draft.factor) : null;
      await ActivityDataService.update(edited.id, {
        quantity: Number(draft.quantity),
        unit: draft.unit,
        notes: notesAfterEdit(edited.notes, factor),
        emission_factor_source: factor ? emissionFactorSourceLabel(factor) : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["activity-data"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      window.dispatchEvent(new Event("activityDataUpdated"));
      setDraft(null);
      toast({ title: "Modification enregistrée", description: "La ligne et les totaux utilisent le facteur enregistré." });
    } catch (error) {
      toast({ title: "Enregistrement impossible", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (draft) {
      toast({ title: "Export des données enregistrées", description: "La modification en cours n’est pas incluse." });
    }
    const now = new Date();
    const exportedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const siteName = siteFilter === "all" ? "Tous les sites" : sites.find((site) => site.id === siteFilter)?.name || "Site";
    const activityName = activityFilter === "all" ? "Toutes les activités" : ACTIVITY_GROUPS.find((group) => group.id === activityFilter)?.label || "Activité";
    const built = await buildControlWorkbook({
      organization: organization?.name || "Organisation",
      year,
      exportedAt,
      filters: `${siteName} · ${activityName}${search.trim() ? ` · ${search.trim()}` : ""}`,
      lines: filtered,
    });
    const blob = new Blob([built.buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = built.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Contrôle des calculs</h1>
        <p className="text-sm text-muted-foreground">Vérifiez les quantités, les facteurs utilisés et les émissions obtenues.</p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <div className="font-medium">{context || "Compte"}</div>
          <div className="text-xs text-muted-foreground">{organization?.country ? "Pays repris du compte" : "Pays du compte non renseigné"}</div>
        </div>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sites</SelectItem>
            {sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="lg:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les activités</SelectItem>
            {ACTIVITY_GROUPS.map((group) => <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une désignation" />
        </div>
        <Button type="button" variant="outline" onClick={() => void exportExcel()} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          Exporter en Excel
        </Button>
      </div>
      {closed && (
        <Alert>
          <AlertDescription>Bilan validé pour {year} : les saisies restent en lecture seule jusqu’à une réouverture explicite.</AlertDescription>
        </Alert>
      )}
      {!closed && !roleLoading && !canEdit && (
        <Alert><AlertDescription>Votre accès permet de consulter et d’exporter, pas de modifier les saisies.</AlertDescription></Alert>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span>{summary.count} ligne{summary.count > 1 ? "s" : ""} affichée{summary.count > 1 ? "s" : ""}</span>
        <span className="font-semibold">{summary.totalLabel}</span>
        {summary.uncalculated > 0 && <Badge variant="outline">{summary.uncalculated} ligne{summary.uncalculated > 1 ? "s" : ""} non calculée{summary.uncalculated > 1 ? "s" : ""}</Badge>}
        <span className="text-xs text-muted-foreground">Total des lignes filtrées, toutes pages comprises</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Mêmes saisies que la liste des données, pour l’année {year}. Ce total n’additionne que les facteurs enregistrés sur chaque ligne. Une ligne sans facteur n’est pas comptée comme zéro. Le bilan peut encore appliquer un facteur historique à d’anciennes lignes qui n’en ont pas : ce contrôle ne le fait pas.
      </p>
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation / Site</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Facteur d’émission</TableHead>
              <TableHead>Émissions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Chargement des saisies…</TableCell></TableRow>}
            {!isLoading && visible.length === 0 && <TableRow><TableCell colSpan={5}>Aucune saisie pour ces filtres.</TableCell></TableRow>}
            {visible.map((line) => {
              const view = assessLine(line);
              return (
                <TableRow key={line.id} className={draft?.lineId === line.id ? "bg-primary/10" : ""}>
                  <TableCell>
                    <div className="font-medium">{line.designation}</div>
                    <div className="text-xs text-muted-foreground">{line.siteName} · {periodLabel(line.periodStart, line.periodEnd)}</div>
                  </TableCell>
                  <TableCell>
                    <button type="button" className="inline-flex items-center gap-2" disabled={!canEdit} onClick={() => openEditor(line)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {line.quantity == null ? "—" : line.quantity.toLocaleString("fr-FR")} {line.unit}
                    </button>
                  </TableCell>
                  <TableCell>
                    {line.factor ? (
                      <div>
                        <div>{line.factor.value.toLocaleString("fr-FR")} {line.factor.unit.replace("CO2", "CO₂")}</div>
                        <div className="text-xs text-muted-foreground">{line.factor.name} · {sourceLabel(line.factor.sourceName)}</div>
                        {view.status === "provisional" && <Badge variant="outline">Provisoire · source à documenter</Badge>}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{view.display}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant={line.factor ? "outline" : "default"} disabled={!canEdit} onClick={() => openEditor(line)}>
                      {draft?.lineId === line.id ? "En cours" : line.factor ? "Modifier" : "Compléter"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Précédent</Button>
          <span>{page} / {pageCount}</span>
          <Button type="button" variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      )}
      {edited && draft && proposal && (
        <Card>
          <CardContent className="grid gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
            <div className="space-y-3">
              <h2 className="font-semibold">Modifier — {edited.designation}</h2>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div className="space-y-1">
                  <Label>Quantité</Label>
                  <Input type="number" step="any" min="0" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Unité</Label>
                  <Select value={draft.unit} onValueChange={(unit) => setDraft({ ...draft, unit })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {unitOptions(edited, draft.unit).map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Facteur utilisé</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{draft.factor ? `${draft.factor.value.toLocaleString("fr-FR")} ${draft.factor.unit.replace("CO2", "CO₂")}` : "Aucun facteur"}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setPendingFactor(draft.factor); setFactorOpen(true); }}>Changer le facteur</Button>
                </div>
                <p className="text-xs text-muted-foreground">{draft.factor ? sourceLabel(draft.factor.sourceName) : "Choisissez un facteur pour calculer."}</p>
                <p className="text-xs text-muted-foreground">Les unités doivent être compatibles. Le facteur est copié sur cette saisie, sans modifier la référence partagée.</p>
              </div>
            </div>
            <div className="rounded-md border bg-primary/5 p-4">
              <p className="text-sm font-medium">Aperçu avant enregistrement</p>
              {proposal.after.formula && proposal.after.kg != null ? (
                <>
                  <p className="text-sm text-muted-foreground">{proposal.after.formula}</p>
                  <p className="text-2xl font-semibold">{editorResult(proposal.after.kg).kg}</p>
                  <p className="text-sm">soit {editorResult(proposal.after.kg).tonnes}</p>
                </>
              ) : <p className="text-lg font-semibold">Non calculé</p>}
              {proposal.after.conversion && <p className="mt-2 text-xs text-muted-foreground">{proposal.after.conversion}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Avant : {proposal.before.kg != null ? editorResult(proposal.before.kg).kg : proposal.before.display} · Après : {proposal.after.kg != null ? editorResult(proposal.after.kg).kg : proposal.after.display}
              </p>
              {proposal.blocked && <p className="mt-2 text-sm text-destructive">{proposal.blocked}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Le total sera actualisé après enregistrement.</p>
            </div>
            <div className="flex justify-end gap-2 lg:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>Annuler</Button>
              <Button type="button" disabled={saving || Boolean(proposal.blocked)} onClick={() => void save()}>Enregistrer la modification</Button>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <HistoryBlock activityId={edited.id} organizationId={organizationId} />
              <FactorDetail factor={draft.factor} scope={edited.scope} />
            </div>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Les émissions sont calculées automatiquement à partir de la quantité et du facteur.</p>
      <Dialog open={factorOpen} onOpenChange={setFactorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Changer le facteur</DialogTitle></DialogHeader>
          {edited && draft && (
            <EmissionFactorSelector
              subcategorySlug={findChoice((edited.subcategory || "").split(":").pop() || "")?.subcategory || edited.subcategory || ""}
              unit={draft.unit}
              siteCountry={organization?.country}
              reportingYear={year}
              onChange={(_slug, next) => {
                const selected = selectionToFactor(next);
                if (selected) setPendingFactor(toControlFactor(selected));
              }}
            />
          )}
          <Button type="button" disabled={!pendingFactor} onClick={() => {
            if (!draft || !pendingFactor) return;
            setDraft({ ...draft, factor: pendingFactor });
            setFactorOpen(false);
          }}>Utiliser ce facteur</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function HistoryBlock({ activityId, organizationId }: { activityId: string; organizationId: string | null }) {
  const [rows, setRows] = useState<ActivityDataHistory[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    void ActivityDataHistoryService.getHistoryForActivity(activityId, organizationId)
      .then((history) => { if (!cancelled) setRows(history); })
      .catch(() => { if (!cancelled) { setRows([]); setUnavailable(true); } });
    void api.listOrgMembers()
      .then((result) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const member of result.items || []) map[member.user_id] = member.full_name || member.email;
        setNames(map);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activityId, organizationId]);
  return (
    <Collapsible>
      <CollapsibleTrigger className="text-sm font-medium">Historique des modifications</CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-sm">
        {rows == null && "Chargement…"}
        {unavailable && "Historique indisponible."}
        {!unavailable && rows?.length === 0 && "Aucune modification enregistrée."}
        {rows?.map((row) => (
          <p key={row.id} className="border-t py-2">
            {new Date(row.created_at).toLocaleString("fr-FR")} · {row.changed_by ? names[row.changed_by] || "Auteur enregistré" : "Auteur non renseigné"}
            <span className="block text-xs text-muted-foreground">{historyDiff(row)}</span>
          </p>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FactorDetail({ factor, scope }: { factor: ControlFactor | null; scope: 1 | 2 | 3 | null }) {
  const meta = factorMetadata(factor);
  return (
    <Collapsible>
      <CollapsibleTrigger className="text-sm font-medium">Détail du facteur et du périmètre</CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
        <p>Source : {meta.source}</p>
        <p>Version : {meta.version}</p>
        <p>Année : {meta.year}</p>
        <p>Géographie : {meta.geography}</p>
        <p>Périmètre : {meta.boundary}</p>
        <p>Classement : {scope ? `Scope ${scope}` : "Scope non renseigné"}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function historyDiff(row: ActivityDataHistory): string {
  const before = row.old_data || {};
  const after = row.new_data || {};
  const parts: string[] = [];
  if (before.quantity !== after.quantity || before.unit !== after.unit) {
    parts.push(`Quantité : ${before.quantity ?? "—"} ${before.unit || ""} → ${after.quantity ?? "—"} ${after.unit || ""}`);
  }
  const oldFactor = storedFactor(typeof before.notes === "string" ? before.notes : null);
  const newFactor = storedFactor(typeof after.notes === "string" ? after.notes : null);
  if (oldFactor?.value !== newFactor?.value || oldFactor?.unit !== newFactor?.unit) {
    parts.push(`Facteur : ${oldFactor ? `${oldFactor.value} ${oldFactor.unit}` : "aucun"} → ${newFactor ? `${newFactor.value} ${newFactor.unit}` : "aucun"}`);
  }
  return parts.join(" · ") || "Modification enregistrée";
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").toLowerCase();
}

function unitOptions(line: ControlSourceLine, current: string): string[] {
  const choice = findChoice((line.subcategory || "").split(":").pop() || "");
  return Array.from(new Set([current, choice?.defaultUnit, ...(choice?.alternativeUnits || [])].filter((unit): unit is string => Boolean(unit))));
}

function toLine(row: ActivityData, sites: Array<{ id: string; name: string }>): ControlSourceLine & { siteId: string | null; activityGroupId: string } {
  const key = (row.subcategory || "").split(":").pop() || "";
  const fallback = getSubcategoryLabel(key) || row.subcategory || row.activity_type;
  return {
    id: row.id,
    designation: designationFromNotes(row.notes, fallback),
    siteId: row.site_id || null,
    siteName: sites.find((site) => site.id === row.site_id)?.name || "Site non renseigné",
    periodStart: row.period_start,
    periodEnd: row.period_end,
    quantity: Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : null,
    unit: row.unit || "",
    subcategory: row.subcategory || null,
    activityType: row.activity_type,
    activityGroupId: activityGroupIdFor(row.subcategory, row.activity_type),
    scope: row.scope_hint || null,
    notes: row.notes || null,
    factor: storedFactor(row.notes),
  };
}

function toControlFactor(factor: AdemeFactorRef): ControlFactor {
  return {
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceName: factor.sourceName ?? null,
    factorYear: factor.factorYear ?? null,
    countryCode: factor.countryCode ?? null,
    stableFactorId: factor.stableFactorId ?? null,
    datasetVersion: factor.datasetVersion ?? null,
    region: factor.region ?? null,
    sourceKey: factor.sourceKey ?? null,
  };
}

function toAdeme(factor: ControlFactor): AdemeFactorRef {
  return {
    id: factor.id,
    name: factor.name,
    value: factor.value,
    unit: factor.unit,
    sourceKey: factor.sourceKey,
    sourceName: factor.sourceName,
    datasetVersion: factor.datasetVersion,
    countryCode: factor.countryCode,
    region: factor.region,
    factorYear: factor.factorYear,
    stableFactorId: factor.stableFactorId,
    replacementReason: null,
  };
}
