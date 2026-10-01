import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";
import {
  MOBILIZATION_AUDIENCES,
  mobilizationDateInput,
  mobilizationLabel,
  toMobilizationPayload,
  type MobilizationForm,
} from "@/lib/climate/mobilization";

interface MobilizationRow {
  id: string;
  audience: string;
  stakeholders: string;
  title: string;
  occurred_on: string | null;
  owner_name: string | null;
  support: string | null;
  action_id: string | null;
}

const emptyForm = (): MobilizationForm => ({
  audience: "employees",
  stakeholders: "",
  title: "",
  occurredOn: "",
  ownerName: "",
  support: "",
  actionId: "",
});

export function MobilizationSection({ actions }: { actions: Array<{ id: string; title: string }> }) {
  const [rows, setRows] = useState<MobilizationRow[]>([]);
  const [form, setForm] = useState<MobilizationForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.listMobilizations()
      .then((result) => setRows((result.items || []) as MobilizationRow[]))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const prepared = toMobilizationPayload(form);
    if ("error" in prepared) {
      toast.error(prepared.error);
      return;
    }
    try {
      if (editingId) await api.patchMobilization(editingId, prepared);
      else await api.createMobilization(prepared);
      setForm(emptyForm());
      setEditingId(null);
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  };

  const remove = async (id: string) => {
    await api.deleteMobilization(id);
    load();
  };

  return (
    <div className="space-y-4" data-testid="stakeholder-mobilization">
      <div>
        <h2 className="text-lg font-semibold">Mobilisation</h2>
        <p className="text-sm text-muted-foreground">
          Ce registre note les parties prenantes, l'action réalisée, la date, le responsable et, si besoin, le support. Les questionnaires et invitations fournisseurs restent dans le{" "}
          <Link to="/app/fournisseurs" className="underline">module Fournisseurs</Link>.
          Le dépôt de fichier reste à ranger avec les preuves. Cette liste ne change pas le total du bilan.
          Pour une session de formation à la plateforme, le parcours en ligne est dans l'
          <Link to="/app/academy" className="underline">Académie</Link>.
          L'émargement et le support restent hors outil si besoin.
        </p>
      </div>
      {!open && (
        <Button type="button" size="sm" onClick={() => { setForm(emptyForm()); setEditingId(null); setOpen(true); }}>
          Ajouter une mobilisation
        </Button>
      )}
      {open && (
        <div className="space-y-3 max-w-xl">
          <div>
            <Label>Public</Label>
            <Select value={form.audience} onValueChange={(value) => setForm({ ...form, audience: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOBILIZATION_AUDIENCES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="mobilization-stakeholders">Parties prenantes</Label>
            <Input id="mobilization-stakeholders" value={form.stakeholders} onChange={(e) => setForm({ ...form, stakeholders: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mobilization-title">Action réalisée</Label>
            <Input id="mobilization-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mobilization-date">Date</Label>
              <Input id="mobilization-date" type="date" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mobilization-owner">Responsable</Label>
              <Input id="mobilization-owner" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="mobilization-support">Preuve ou support</Label>
            <Input id="mobilization-support" value={form.support} onChange={(e) => setForm({ ...form, support: e.target.value })} />
          </div>
          <div>
            <Label>Action du plan</Label>
            <Select value={form.actionId || "none"} onValueChange={(value) => setForm({ ...form, actionId: value === "none" ? "" : value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action.id} value={action.id}>{action.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={save}>Enregistrer la mobilisation</Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingId(null); }}>Annuler</Button>
          </div>
        </div>
      )}
      {rows.length === 0 && !open && (
        <p className="text-sm text-muted-foreground">Aucune mobilisation enregistrée.</p>
      )}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded border border-border p-3 text-sm">
            <p className="font-medium">{row.title}</p>
            <p className="text-muted-foreground">
              {mobilizationLabel(row.audience)} · {row.stakeholders} · {mobilizationDateInput(row.occurred_on)} · {row.owner_name}
            </p>
            {row.support && <p className="text-muted-foreground">{row.support}</p>}
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(row.id);
                  setForm({
                    audience: row.audience,
                    stakeholders: row.stakeholders,
                    title: row.title,
                    occurredOn: mobilizationDateInput(row.occurred_on),
                    ownerName: row.owner_name || "",
                    support: row.support || "",
                    actionId: row.action_id || "",
                  });
                  setOpen(true);
                }}
              >
                Modifier
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => remove(row.id)}>Supprimer</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
