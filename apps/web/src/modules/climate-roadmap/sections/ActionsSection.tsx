// Section 4 — Plan de réduction (inspiré Greenly)
// Actions classées par poste d'émission, chaque action en carte, popup détaillée

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronRight, X, CheckCircle2, Clock, AlertTriangle, Zap, Truck, Building2, Monitor, ShoppingCart, Trash2, Factory, Leaf } from 'lucide-react';
import { ClimateAction, ClimateLever, ACTION_STATUS_LABELS, ACTION_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, ActionStatus, ActionPriority, LEVER_CATEGORY_LABELS } from '../types';
import { api } from '@/integrations/api/client';
import { toast } from 'sonner';
import { actionTypeLabel, ESTIMATION_METHODS, PLAN_ACTION_TYPES, toClimateActionPayload, type ActionPlanForm } from '@/lib/climate/actionPlan';
import { MethodNoteLink } from '@/components/method/MethodNoteLink';

interface ActionsSectionProps {
  actions: ClimateAction[];
  levers: ClimateLever[];
  onCreateAction: (action: Partial<ClimateAction>) => Promise<any>;
  onUpdateAction: (id: string, updates: Partial<ClimateAction>) => Promise<boolean>;
}

// Mapping postes d'émission → icones
const POSTE_ICONS: Record<string, React.ElementType> = {
  energy_efficiency: Zap,
  renewable_energy: Zap,
  electrification: Zap,
  logistics: Truck,
  mobility: Truck,
  waste: Trash2,
  recycling: Trash2,
  material_substitution: Factory,
  ecodesign: Leaf,
  purchasing: ShoppingCart,
  sobriety: Leaf,
  industrial_performance: Factory,
  circularity: Leaf,
  other: Building2,
};

const POSTE_COLORS: Record<string, string> = {
  energy_efficiency: 'bg-amber-500',
  renewable_energy: 'bg-green-500',
  electrification: 'bg-blue-500',
  logistics: 'bg-purple-500',
  mobility: 'bg-indigo-500',
  waste: 'bg-orange-500',
  recycling: 'bg-teal-500',
  material_substitution: 'bg-pink-500',
  ecodesign: 'bg-emerald-500',
  purchasing: 'bg-cyan-500',
  sobriety: 'bg-lime-600',
  industrial_performance: 'bg-slate-500',
  circularity: 'bg-green-600',
  other: 'bg-gray-500',
};

type StepId = 'select' | 'prioritize' | 'in_progress' | 'completed';

const STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: 'select', label: 'Sélectionner', icon: CheckCircle2 },
  { id: 'prioritize', label: 'Prioriser', icon: AlertTriangle },
  { id: 'in_progress', label: 'En cours', icon: Clock },
  { id: 'completed', label: 'Terminé', icon: CheckCircle2 },
];

function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const STEP_STATUSES: Record<StepId, ActionStatus[]> = {
  select: ['to_launch', 'studying'],
  prioritize: ['validated'],
  in_progress: ['in_progress', 'suspended'],
  completed: ['completed'],
};

// Circular progress for efficacy
const EfficacyCircle: React.FC<{ value: number }> = ({ value }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? 'hsl(var(--primary))' : value >= 50 ? 'hsl(var(--warning, 45 93% 47%))' : 'hsl(var(--destructive))';

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <circle cx="24" cy="24" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs font-bold">{value}%</span>
    </div>
  );
};

// Action detail popup
const ActionDetailPopup: React.FC<{
  action: ClimateAction;
  lever: ClimateLever | undefined;
  onUpdate: (id: string, updates: Partial<ClimateAction>) => Promise<boolean>;
  onClose: () => void;
}> = ({ action, lever, onUpdate, onClose }) => {
  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [ownerName, setOwnerName] = useState(action.owner_name || '');
  const [targetDate, setTargetDate] = useState(dateInputValue(action.target_date));
  const [priority, setPriority] = useState<ActionPriority>(action.priority);
  const [notes, setNotes] = useState(action.comments || '');
  const [saving, setSaving] = useState(false);

  const efficacy = lever && lever.estimated_potential_reduction_tco2e > 0
    ? Math.min(100, Math.round(((Number(action.expected_reduction_tco2e) || 0) / lever.estimated_potential_reduction_tco2e) * 100))
    : null;

  const feasibilityMap: Record<string, string> = { low: 'Facile', medium: 'Modérée', high: 'Complexe', very_high: 'Très complexe' };
  const feasibility = lever?.complexity_level ? feasibilityMap[lever.complexity_level] ?? null : null;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(action.id, {
      status,
      owner_name: ownerName || null,
      target_date: targetDate || null,
      priority,
      comments: notes || null,
      progress_percent: status === 'completed' ? 100 : action.progress_percent,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          {lever && (
            <Badge variant="outline" className="mb-2 text-[10px]">
              <span className={`w-2 h-2 rounded-full ${POSTE_COLORS[lever.category] || 'bg-muted'} mr-1.5 inline-block`} />
              {LEVER_CATEGORY_LABELS[lever.category] || lever.category}
            </Badge>
          )}
          <h3 className="font-semibold text-foreground leading-tight">{action.title}</h3>
        </div>
        {efficacy != null && (
          <div className="text-center shrink-0">
            <p className="text-[10px] text-muted-foreground mb-1">Efficacité</p>
            <EfficacyCircle value={efficacy} />
          </div>
        )}
      </div>

      {/* Description */}
      {action.description && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {action.description}
        </div>
      )}

      {/* Feasibility & Impact */}
      <div className="grid grid-cols-2 gap-4">
        {feasibility && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Estimation de la faisabilité</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                feasibility === 'Facile' ? 'bg-emerald-500' :
                feasibility === 'Modérée' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium">{feasibility}</span>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Potentiel estimé</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {action.expected_reduction_tco2e == null ? "—" : Math.round(Number(action.expected_reduction_tco2e))}
            </span>
            <span className="text-xs text-muted-foreground">tCO₂e</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Status, Responsable, Date */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onValueChange={(v: ActionStatus) => setStatus(v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Responsable</Label>
          <Input
            className="h-9 text-xs"
            placeholder="Non assigné"
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date butoire</Label>
          <Input
            type="date"
            className="h-9 text-xs"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <Label className="text-xs">Priorité</Label>
        <div className="flex gap-2">
          {(Object.entries(PRIORITY_LABELS) as [ActionPriority, string][]).map(([k, v]) => (
            <Button
              key={k}
              variant={priority === k ? 'default' : 'outline'}
              size="sm"
              className={`text-xs h-8 ${priority === k ? '' : 'text-muted-foreground'}`}
              onClick={() => setPriority(k)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea
          placeholder="Ajouter des notes..."
          className="text-xs min-h-[60px]"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Budget info */}
      {action.budget_estimated > 0 && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 text-xs">
          <div>
            <span className="text-muted-foreground">Budget estimé : </span>
            <span className="font-medium">{(action.budget_estimated / 1000).toFixed(0)}k€</span>
          </div>
          {action.expected_savings && action.expected_savings > 0 && (
            <div>
              <span className="text-muted-foreground">Économies : </span>
              <span className="font-medium text-emerald-600">{(action.expected_savings / 1000).toFixed(0)}k€/an</span>
            </div>
          )}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
};

// Action Card
const ActionCard: React.FC<{
  action: ClimateAction;
  lever: ClimateLever | undefined;
  onUpdate: (id: string, updates: Partial<ClimateAction>) => Promise<boolean>;
}> = ({ action, lever, onUpdate }) => {
  const [open, setOpen] = useState(false);

  const efficacy = lever && lever.estimated_potential_reduction_tco2e > 0
    ? Math.min(100, Math.round((Number(action.expected_reduction_tco2e) || 0) / lever.estimated_potential_reduction_tco2e * 100))
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group">
          <CardContent className="p-4 space-y-3">
            {/* Category badge */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px]">{actionTypeLabel(action.action_type)}</Badge>
              {lever && (
                <Badge variant="outline" className="text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${POSTE_COLORS[lever.category] || 'bg-muted'} mr-1.5 inline-block`} />
                  {LEVER_CATEGORY_LABELS[lever.category] || lever.category}
                </Badge>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {action.title}
            </p>

            {/* Bottom row: metrics */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground">Potentiel estimé</p>
                  <p className="text-xs font-semibold">
                    {action.expected_reduction_tco2e == null ? "—" : `${Math.round(Number(action.expected_reduction_tco2e))} tCO₂e`}
                  </p>
                </div>
                {efficacy != null && (
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Pertinence</p>
                    <EfficacyCircle value={efficacy} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`${ACTION_STATUS_COLORS[action.status]} text-[10px]`}>
                  {ACTION_STATUS_LABELS[action.status]}
                </Badge>
                {action.owner_name && (
                  <span className="text-[10px] text-muted-foreground">{action.owner_name}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Détail de l'action</DialogTitle>
        </DialogHeader>
        <ActionDetailPopup action={action} lever={lever} onUpdate={onUpdate} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

// Main component
export const ActionsSection: React.FC<ActionsSectionProps> = ({ actions, levers, onCreateAction, onUpdateAction }) => {
  const [currentStep, setCurrentStep] = useState<StepId>('select');
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const emptyForm: ActionPlanForm = {
    title: '', description: '', actionType: 'reduction', leverId: '', poste: '',
    siteId: '', ownerName: '', startDate: '', targetDate: '', priority: 'medium',
    status: 'to_launch', budget: '', indicatorName: '', indicatorTarget: '',
    potentialT: '', estimationMethod: '',
  };
  const [form, setForm] = useState<ActionPlanForm>(emptyForm);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    api.listSites()
      .then((result) => {
        setSites((result.items || []).map((site) => ({
          id: String(site.id),
          name: String(site.name ?? "Site"),
        })));
      })
      .catch(() => setSites([]));
  }, []);

  // Filter actions by current step
  const stepActions = useMemo(() => {
    const statuses = STEP_STATUSES[currentStep];
    return actions.filter(a => statuses.includes(a.status));
  }, [actions, currentStep]);

  // Group by lever category (poste)
  const categories = useMemo(() => {
    const cats: { category: string; label: string; actions: ClimateAction[]; totalEmissions: number }[] = [];
    const catMap = new Map<string, ClimateAction[]>();

    stepActions.forEach(action => {
      const lever = levers.find(l => l.id === action.lever_id);
      const cat = lever?.category || 'other';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(action);
    });

    catMap.forEach((acts, cat) => {
      cats.push({
        category: cat,
        label: LEVER_CATEGORY_LABELS[cat] || cat,
        actions: acts,
        totalEmissions: acts.reduce((sum, a) => sum + a.expected_reduction_tco2e, 0),
      });
    });

    return cats.sort((a, b) => b.totalEmissions - a.totalEmissions);
  }, [stepActions, levers]);

  const activeCategory = categories[activeCategoryIdx] || null;

  const handleCreate = async () => {
    const prepared = toClimateActionPayload(form);
    if ("error" in prepared) {
      toast.error(prepared.error);
      return;
    }
    await onCreateAction(prepared);
    setShowCreate(false);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id;
          const stepCount = actions.filter(a => STEP_STATUSES[step.id].includes(a.status)).length;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => { setCurrentStep(step.id); setActiveCategoryIdx(0); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[4px] text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {step.label}
                {stepCount > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {stepCount}
                  </span>
                )}
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Title + Create */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {currentStep === 'select' && '📌 Sélectionner vos actions'}
            {currentStep === 'prioritize' && '⚡ Prioriser vos actions'}
            {currentStep === 'in_progress' && '🔄 Actions en cours'}
            {currentStep === 'completed' && '✅ Actions terminées'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentStep === 'select' && 'Postes principaux d\'émission. Sélectionnez les actions à mettre en place.'}
            {currentStep === 'prioritize' && 'Définissez vos priorités, responsables et échéances.'}
            {currentStep === 'in_progress' && 'Suivez l\'avancement de vos actions de décarbonation.'}
            {currentStep === 'completed' && 'Actions finalisées et leur impact réalisé.'}
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Créer une action</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle action climat</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Le potentiel en tCO₂e est une estimation. Il reste dans le plan et ne change pas le total du bilan.{" "}
                <MethodNoteLink noteId="plan-de-transition" label="Note de méthode" />
              </p>
              <div>
                <Label htmlFor="action-title">Titre</Label>
                <Input id="action-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="action-description">Description</Label>
                <Textarea id="action-description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type d&apos;action</Label>
                  <Select value={form.actionType} onValueChange={v => setForm({ ...form, actionType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAN_ACTION_TYPES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABELS) as ActionPriority[]).map((key) => (
                        <SelectItem key={key} value={key}>{PRIORITY_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((key) => (
                        <SelectItem key={key} value={key}>{ACTION_STATUS_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="action-poste">Poste</Label>
                  <Input id="action-poste" value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} />
                </div>
              </div>
              {form.actionType === "suppliers" && (
                <p className="text-xs text-muted-foreground">
                  Les plans fournisseurs détaillés restent dans le module fournisseurs.
                </p>
              )}
              <div>
                <Label>Levier</Label>
                <Select value={form.leverId || "none"} onValueChange={v => setForm({ ...form, leverId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun levier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun levier</SelectItem>
                    {levers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Site</Label>
                  <Select value={form.siteId || "none"} onValueChange={v => setForm({ ...form, siteId: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Non renseigné" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non renseigné</SelectItem>
                      {sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="action-owner">Responsable</Label>
                  <Input id="action-owner" value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="action-start">Date de début</Label>
                  <Input id="action-start" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="action-end">Date cible</Label>
                  <Input id="action-end" type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="action-cost">Coût estimé</Label>
                  <Input id="action-cost" inputMode="decimal" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="action-potential">Potentiel estimé (tCO₂e)</Label>
                  <Input id="action-potential" inputMode="decimal" value={form.potentialT} onChange={e => setForm({ ...form, potentialT: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Méthode d&apos;estimation</Label>
                <Select value={form.estimationMethod || "unspecified"} onValueChange={v => setForm({ ...form, estimationMethod: v === "unspecified" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Non renseignée</SelectItem>
                    {ESTIMATION_METHODS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="action-kpi">Indicateur</Label>
                  <Input id="action-kpi" value={form.indicatorName} onChange={e => setForm({ ...form, indicatorName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="action-kpi-target">Cible de l&apos;indicateur</Label>
                  <Input id="action-kpi-target" value={form.indicatorTarget} onChange={e => setForm({ ...form, indicatorTarget: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!form.title.trim()} className="w-full">Créer l&apos;action</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category tabs (postes d'émission) */}
      {categories.length > 0 ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat, idx) => {
              const Icon = POSTE_ICONS[cat.category] || Building2;
              const isActive = idx === activeCategoryIdx;
              return (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategoryIdx(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${POSTE_COLORS[cat.category] || 'bg-muted'}`}>
                    {idx + 1}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className="text-[10px] opacity-60">({cat.actions.length})</span>
                </button>
              );
            })}
            {categories.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs shrink-0"
                onClick={() => setActiveCategoryIdx((activeCategoryIdx + 1) % categories.length)}
              >
                Poste suivant →
              </Button>
            )}
          </div>

          {/* Action cards grid */}
          {activeCategory && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs text-muted-foreground">
                  {activeCategory.label} : {Math.round(activeCategory.totalEmissions)} tCO₂e de potentiel de réduction
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCategory.actions.map(action => {
                  const lever = levers.find(l => l.id === action.lever_id);
                  return (
                    <ActionCard
                      key={action.id}
                      action={action}
                      lever={lever}
                      onUpdate={onUpdateAction}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {currentStep === 'select' && 'Aucune action à sélectionner. Créez votre première action.'}
            {currentStep === 'prioritize' && 'Aucune action à prioriser.'}
            {currentStep === 'in_progress' && 'Aucune action en cours.'}
            {currentStep === 'completed' && 'Aucune action terminée.'}
          </p>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />Créer une action
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-center gap-4 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {actions.length} actions au total — {actions.filter(a => a.status === 'completed').length} terminées
        </p>
      </div>
    </div>
  );
};
