import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Database, Leaf, BarChart3, Clock, CheckCircle2, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { DataSourceSummary } from '../hooks/useScenarioBaseline';
import { useToast } from '@/hooks/use-toast';

interface Props { dataSources: DataSourceSummary; }

const RESTATEMENT_REASONS = [
  { value: 'merger_acquisition', label: 'Fusion / Acquisition' },
  { value: 'divestiture', label: 'Cession d\'activité' },
  { value: 'methodology_change', label: 'Changement méthodologique' },
  { value: 'scope_change', label: 'Modification du périmètre' },
  { value: 'data_correction', label: 'Correction de données' },
  { value: 'structural_change', label: 'Autre changement structurel' },
];

export const ScenarioBaselineSection: React.FC<Props> = ({ dataSources }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Baseline et périmètre</h2>
        <p className="text-sm text-muted-foreground">Sources de données disponibles pour construire la baseline de vos scénarios.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SourceSummary icon={Database} title="Bilan carbone" count={dataSources.bilanCount}
          items={dataSources.bilans.map(b => ({ label: `Bilan ${b.year}`, detail: `${b.totalEmissions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e`, status: b.status }))} />
        <SourceSummary icon={Leaf} title="Empreinte produit" count={dataSources.pcfCount}
          items={dataSources.pcfStudies.map(p => ({ label: p.productName, detail: `${p.totalCarbonKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kgCO₂e`, status: p.status }))} />
        <SourceSummary icon={BarChart3} title="Projets ACV" count={dataSources.acvCount}
          items={dataSources.acvProjects.map(a => ({ label: a.name, detail: `${a.totalCarbon.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e`, status: a.status }))} />
      </div>

      {dataSources.lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Dernière mise à jour : {new Date(dataSources.lastUpdate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      )}

      {/* Restatement baseline panel */}
      <BaselineRestatementPanel />
    </div>
  );
};

/** GHG Protocol compliant baseline restatement panel */
function BaselineRestatementPanel() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reason: '',
    description: '',
    original_baseline_tco2e: '',
    adjusted_baseline_tco2e: '',
    adjustment_year: new Date().getFullYear(),
    impact_description: '',
  });
  const [restatements, setRestatements] = useState<Array<{
    id: string; reason: string; description: string;
    original: number; adjusted: number; year: number; date: string;
  }>>([]);

  const handleSubmit = () => {
    if (!form.reason || !form.original_baseline_tco2e || !form.adjusted_baseline_tco2e) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    const entry = {
      id: crypto.randomUUID(),
      reason: form.reason,
      description: form.description,
      original: parseFloat(form.original_baseline_tco2e),
      adjusted: parseFloat(form.adjusted_baseline_tco2e),
      year: form.adjustment_year,
      date: new Date().toISOString(),
    };
    setRestatements(prev => [entry, ...prev]);
    toast({ title: 'Restatement enregistré', description: `Baseline recalculée : ${entry.adjusted.toLocaleString('fr-FR')} tCO₂e` });
    setForm({ reason: '', description: '', original_baseline_tco2e: '', adjusted_baseline_tco2e: '', adjustment_year: new Date().getFullYear(), impact_description: '' });
    setOpen(false);
  };

  const delta = form.original_baseline_tco2e && form.adjusted_baseline_tco2e
    ? parseFloat(form.adjusted_baseline_tco2e) - parseFloat(form.original_baseline_tco2e)
    : null;

  return (
    <Card className="border-dashed border-amber-500/40">
      <CardContent className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-sm">Restatement de baseline (GHG Protocol)</span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <RefreshCw className="h-3 w-3" /> Nouveau restatement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Recalcul de la baseline
                </DialogTitle>
                <DialogDescription>
                  Conformément au GHG Protocol, la baseline doit être recalculée en cas de changements structurels significatifs.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs">Motif du restatement *</Label>
                  <Select value={form.reason} onValueChange={v => setForm(p => ({ ...p, reason: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un motif" /></SelectTrigger>
                    <SelectContent>
                      {RESTATEMENT_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Description du changement</Label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ex: Acquisition de l'usine de Lyon en mars 2026…" rows={2} className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Baseline originale (tCO₂e) *</Label>
                    <Input type="number" value={form.original_baseline_tco2e}
                      onChange={e => setForm(p => ({ ...p, original_baseline_tco2e: e.target.value }))}
                      placeholder="12 500" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Baseline ajustée (tCO₂e) *</Label>
                    <Input type="number" value={form.adjusted_baseline_tco2e}
                      onChange={e => setForm(p => ({ ...p, adjusted_baseline_tco2e: e.target.value }))}
                      placeholder="14 200" className="mt-1" />
                  </div>
                </div>

                {delta !== null && !isNaN(delta) && (
                  <div className={`p-3 rounded-lg text-xs ${delta > 0 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                    <strong>Impact :</strong> {delta > 0 ? '+' : ''}{delta.toLocaleString('fr-FR')} tCO₂e ({((delta / parseFloat(form.original_baseline_tco2e)) * 100).toFixed(1)}%)
                    {delta > 0 ? ' — La baseline augmente suite au changement structurel.' : ' — La baseline diminue suite au changement structurel.'}
                  </div>
                )}

                <div>
                  <Label className="text-xs">Année d'application</Label>
                  <Input type="number" value={form.adjustment_year}
                    onChange={e => setForm(p => ({ ...p, adjustment_year: parseInt(e.target.value) || p.adjustment_year }))}
                    className="mt-1" />
                </div>

                <div>
                  <Label className="text-xs">Impact sur les trajectoires</Label>
                  <Textarea value={form.impact_description} onChange={e => setForm(p => ({ ...p, impact_description: e.target.value }))}
                    placeholder="Description de l'impact sur les objectifs de réduction…" rows={2} className="mt-1" />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={handleSubmit} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Appliquer le restatement</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-xs text-muted-foreground">
          Le GHG Protocol exige un recalcul de la baseline en cas de fusions, cessions, changements méthodologiques ou modifications significatives du périmètre organisationnel.
        </p>

        {restatements.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique des restatements</h4>
            {restatements.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{RESTATEMENT_REASONS.find(x => x.value === r.reason)?.label || r.reason}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono">{r.original.toLocaleString('fr-FR')} → {r.adjusted.toLocaleString('fr-FR')} tCO₂e</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.adjusted > r.original ? '+' : ''}{((r.adjusted - r.original) / r.original * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Aucun restatement enregistré.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SourceSummary({ icon: Icon, title, count, items }: {
  icon: any; title: string; count: number; items: { label: string; detail: string; status: string }[];
}) {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span className="font-medium text-sm">{title}</span></div>
          <Badge variant={count > 0 ? 'default' : 'secondary'} className="text-[10px]">{count}</Badge>
        </div>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{item.detail}</span>
                  {item.status === 'validated' && <CheckCircle2 className="h-3 w-3 text-primary" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Aucune donnée disponible</p>
        )}
      </CardContent>
    </Card>
  );
}
