import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";
import {
  RISK_CATEGORIES,
  RISK_LEVELS,
  riskLabel,
  toClimateRiskPayload,
  type ClimateRiskForm,
} from "@/lib/climate/climateRisk";

interface RiskRow {
  id: string;
  title: string;
  category: string;
  probability: string;
  impact: string;
  risk_level: string;
  measure: string | null;
  action_id: string | null;
}

const emptyForm = (): ClimateRiskForm => ({
  title: "",
  category: "physical",
  probability: "medium",
  impact: "medium",
  riskLevel: "medium",
  measure: "",
  actionId: "",
});

export function RisksSection({ actions }: { actions: Array<{ id: string; title: string }> }) {
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [form, setForm] = useState<ClimateRiskForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.listClimateRisks()
      .then((result) => setRisks((result.items || []) as RiskRow[]))
      .catch(() => setRisks([]));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const prepared = toClimateRiskPayload(form);
    if ("error" in prepared) {
      toast.error(prepared.error);
      return;
    }
    try {
      if (editingId) await api.patchClimateRisk(editingId, prepared);
      else await api.createClimateRisk(prepared);
      setForm(emptyForm());
      setEditingId(null);
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  };

  const remove = async (id: string) => {
    await api.deleteClimateRisk(id);
    load();
  };

  return (
    <div className="space-y-4" data-testid="climate-risks">
      <div>
        <h2 className="text-lg font-semibold">Risques climatiques</h2>
        <p className="text-sm text-muted-foreground">
          Un risque physique concerne un aléa sur les sites ou les opérations. Un risque de transition concerne le marché, la réglementation ou la technologie. Le niveau est la qualification saisie. Cette liste ne modélise pas de scénario climatique et ne change pas le total du bilan.
        </p>
      </div>
      {!open && (
        <Button type="button" size="sm" onClick={() => { setForm(emptyForm()); setEditingId(null); setOpen(true); }}>
          Ajouter un risque
        </Button>
      )}
      {open && (
        <div className="space-y-3 max-w-xl">
          <div>
            <Label htmlFor="risk-title">Risque</Label>
            <Input id="risk-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Probabilité</Label>
              <Select value={form.probability} onValueChange={(value) => setForm({ ...form, probability: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Impact</Label>
              <Select value={form.impact} onValueChange={(value) => setForm({ ...form, impact: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Niveau de risque</Label>
              <Select value={form.riskLevel} onValueChange={(value) => setForm({ ...form, riskLevel: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="risk-measure">Mesure ou adaptation</Label>
            <Textarea id="risk-measure" rows={3} value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} />
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
            <Button type="button" onClick={save}>Enregistrer le risque</Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingId(null); }}>Annuler</Button>
          </div>
        </div>
      )}
      {risks.length === 0 && !open && (
        <p className="text-sm text-muted-foreground">Aucun risque enregistré.</p>
      )}
      <ul className="space-y-2">
        {risks.map((risk) => (
          <li key={risk.id} className="rounded border border-border p-3 text-sm">
            <p className="font-medium">{risk.title}</p>
            <p className="text-muted-foreground">
              {riskLabel(RISK_CATEGORIES, risk.category)} · Probabilité {riskLabel(RISK_LEVELS, risk.probability)} · Impact {riskLabel(RISK_LEVELS, risk.impact)} · Niveau {riskLabel(RISK_LEVELS, risk.risk_level)}
            </p>
            {risk.measure && <p className="text-muted-foreground">{risk.measure}</p>}
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(risk.id);
                  setForm({
                    title: risk.title,
                    category: risk.category,
                    probability: risk.probability,
                    impact: risk.impact,
                    riskLevel: risk.risk_level,
                    measure: risk.measure || "",
                    actionId: risk.action_id || "",
                  });
                  setOpen(true);
                }}
              >
                Modifier
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => remove(risk.id)}>Supprimer</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
