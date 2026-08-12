// Section 4 — Plan de réduction (inspiré Greenly)
// Actions classées par poste d'émission, chaque action en carte, popup détaillée

import React, { useState, useMemo } from 'react';
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
  const [targetDate, setTargetDate] = useState(action.target_date || '');
  const [priority, setPriority] = useState<ActionPriority>(action.priority);
  const [notes, setNotes] = useState(action.comments || '');
  const [saving, setSaving] = useState(false);

  // Calculate efficacy from expected reduction vs lever potential
  const efficacy = lever && lever.estimated_potential_reduction_tco2e > 0
    ? Math.min(100, Math.round((action.expected_reduction_tco2e / lever.estimated_potential_reduction_tco2e) * 100))
    : 75;

  // Feasibility based on complexity
  const feasibilityMap: Record<string, string> = { low: 'Facile', medium: 'Modérée', high: 'Complexe', very_high: 'Très complexe' };
  const feasibility = lever ? feasibilityMap[lever.complexity_level] || 'Modérée' : 'Modérée';

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
        <div className="text-center shrink-0">
          <p className="text-[10px] text-muted-foreground mb-1">Efficacité</p>
          <EfficacyCircle value={efficacy} />
        </div>
      </div>

      {/* Description */}
      {action.description && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {action.description}
        </div>
      )}

      {/* Feasibility & Impact */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Estimation de l'impact</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{Math.round(action.expected_reduction_tco2e)}</span>
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
    ? Math.min(100, Math.round((action.expected_reduction_tco2e / lever.estimated_potential_reduction_tco2e) * 100))
    : 75;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group">
          <CardContent className="p-4 space-y-3">
            {/* Category badge */}
            {lever && (
              <Badge variant="outline" className="text-[10px]">
                <span className={`w-2 h-2 rounded-full ${POSTE_COLORS[lever.category] || 'bg-muted'} mr-1.5 inline-block`} />
                {LEVER_CATEGORY_LABELS[lever.category] || lever.category}
              </Badge>
            )}

            {/* Title */}
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {action.title}
            </p>

            {/* Bottom row: metrics */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground">Impact</p>
                  <p className="text-xs font-semibold">{Math.round(action.expected_reduction_tco2e)} tCO₂e</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground">Pertinence</p>
                  <EfficacyCircle value={efficacy} />
                </div>
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
  const [form, setForm] = useState({
    title: '', description: '', lever_id: '', priority: 'medium' as ActionPriority,
    expected_reduction_tco2e: 0, budget_estimated: 0, owner_name: '',
    start_date: '', target_date: '',
  });

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
    if (!form.lever_id || !form.title) return;
    await onCreateAction({
      ...form,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
    });
    setShowCreate(false);
    setForm({ title: '', description: '', lever_id: '', priority: 'medium', expected_reduction_tco2e: 0, budget_estimated: 0, owner_name: '', start_date: '', target_date: '' });
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
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
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouvelle action climat</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Levier associé</Label>
                <Select value={form.lever_id} onValueChange={v => setForm({ ...form, lever_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir un levier" /></SelectTrigger>
                  <SelectContent>
                    {levers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titre de l'action</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Passage à la visioconférence" />
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Décrivez l'action et comment la mettre en place..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Réduction attendue (tCO₂e)</Label><Input type="number" value={form.expected_reduction_tco2e} onChange={e => setForm({ ...form, expected_reduction_tco2e: +e.target.value })} /></div>
                <div><Label>Budget estimé (€)</Label><Input type="number" value={form.budget_estimated} onChange={e => setForm({ ...form, budget_estimated: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date de début</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Date butoire</Label><Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} /></div>
              </div>
              <div><Label>Responsable</Label><Input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} placeholder="Nom du responsable" /></div>
              <Button onClick={handleCreate} disabled={!form.title || !form.lever_id} className="w-full">Créer l'action</Button>
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
