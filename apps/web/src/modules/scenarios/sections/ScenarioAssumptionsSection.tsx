import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Sliders, Save, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useScenarioLevers, useScenarioAssumptions } from '../hooks/useScenarios';
import { ScenarioLever, LEVER_CATEGORIES } from '../types';

interface Props { scenarioId: string | null; }

export const ScenarioAssumptionsSection: React.FC<Props> = ({ scenarioId }) => {
  const { levers } = useScenarioLevers(scenarioId);
  const [selectedLeverId, setSelectedLeverId] = useState<string | null>(null);

  useEffect(() => {
    if (levers.length > 0 && !selectedLeverId) setSelectedLeverId(levers[0].id);
  }, [levers, selectedLeverId]);

  if (!scenarioId) return <p className="text-sm text-muted-foreground p-6">Sélectionnez un scénario.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Hypothèses de déploiement</h2>
        <p className="text-sm text-muted-foreground">Paramétrez le calendrier et le rythme de chaque levier avec les curseurs interactifs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lever list */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leviers activés</h3>
          {levers.filter(l => l.enabled).map(l => (
            <button key={l.id} onClick={() => setSelectedLeverId(l.id)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${selectedLeverId === l.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <p className="text-sm font-medium">{l.custom_lever_name || l.category}</p>
              <p className="text-[10px] text-muted-foreground">{l.max_reduction_tco2e.toLocaleString('fr-FR')} tCO₂e max</p>
            </button>
          ))}
          {levers.filter(l => l.enabled).length === 0 && <p className="text-xs text-muted-foreground">Aucun levier activé.</p>}
        </div>

        {/* Assumption editor */}
        <div className="lg:col-span-2">
          {selectedLeverId ? <AssumptionEditor leverId={selectedLeverId} /> : <p className="text-sm text-muted-foreground">Sélectionnez un levier.</p>}
        </div>
      </div>
    </div>
  );
};

/** Labeled slider with live value display and tooltip */
function SliderField({ label, tooltip, value, onChange, min, max, step = 1, unit = '', formatValue }: {
  label: string; tooltip?: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string;
  formatValue?: (v: number) => string;
}) {
  const display = formatValue ? formatValue(value) : `${value}${unit}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs">{label}</Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs font-mono font-semibold text-primary tabular-nums">{display}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function AssumptionEditor({ leverId }: { leverId: string }) {
  const { assumption, upsertAssumption } = useScenarioAssumptions(leverId);
  const [form, setForm] = useState({
    start_year: 2026,
    ramp_up_end_year: 2030,
    max_coverage_percent: 100,
    yearly_reduction_factor: 1.0,
    confidence_level: 'medium' as string,
    application_mode: 'linear' as string,
    source_reference: '',
    methodological_note: '',
  });

  useEffect(() => {
    if (assumption) {
      setForm({
        start_year: assumption.start_year,
        ramp_up_end_year: assumption.ramp_up_end_year || 2030,
        max_coverage_percent: assumption.max_coverage_percent,
        yearly_reduction_factor: assumption.yearly_reduction_factor,
        confidence_level: assumption.confidence_level,
        application_mode: assumption.application_mode,
        source_reference: assumption.source_reference || '',
        methodological_note: assumption.methodological_note || '',
      });
    }
  }, [assumption]);

  const handleSave = () => upsertAssumption(form as any);

  const currentYear = new Date().getFullYear();

  return (
    <Card>
      <CardContent className="py-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Sliders className="h-4 w-4 text-primary" /><span className="font-medium text-sm">Paramétrage des hypothèses</span></div>
          <Badge variant="outline" className="text-[10px]">{assumption ? 'Configuré' : 'Non configuré'}</Badge>
        </div>

        {/* Timeline sliders */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📅 Calendrier</h4>
          <SliderField
            label="Année de démarrage"
            tooltip="Année à partir de laquelle le levier commence à être déployé."
            value={form.start_year}
            onChange={v => setForm(p => ({ ...p, start_year: v, ramp_up_end_year: Math.max(p.ramp_up_end_year, v + 1) }))}
            min={currentYear}
            max={2050}
          />
          <SliderField
            label="Fin de montée en charge"
            tooltip="Année à laquelle le levier atteint sa couverture maximale."
            value={form.ramp_up_end_year}
            onChange={v => setForm(p => ({ ...p, ramp_up_end_year: v }))}
            min={form.start_year + 1}
            max={2055}
          />
          {/* Visual timeline bar */}
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute h-full rounded-full bg-primary/60 transition-all"
              style={{
                left: `${((form.start_year - currentYear) / (2055 - currentYear)) * 100}%`,
                width: `${((form.ramp_up_end_year - form.start_year) / (2055 - currentYear)) * 100}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Déploiement sur {form.ramp_up_end_year - form.start_year} an{form.ramp_up_end_year - form.start_year > 1 ? 's' : ''}
          </p>
        </div>

        {/* Performance sliders */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚡ Performance</h4>
          <SliderField
            label="Couverture maximale"
            tooltip="Pourcentage maximum du périmètre couvert par ce levier à pleine maturité."
            value={form.max_coverage_percent}
            onChange={v => setForm(p => ({ ...p, max_coverage_percent: v }))}
            min={0}
            max={100}
            unit="%"
          />
          <SliderField
            label="Facteur de performance"
            tooltip="Multiplicateur d'efficacité annuel. 1.0 = potentiel nominal. > 1.0 = surperformance. < 1.0 = sous-performance."
            value={form.yearly_reduction_factor}
            onChange={v => setForm(p => ({ ...p, yearly_reduction_factor: v }))}
            min={0.1}
            max={2.0}
            step={0.05}
            formatValue={v => `×${v.toFixed(2)}`}
          />
        </div>

        {/* Mode & confidence */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Mode d'application</Label>
            <select value={form.application_mode} onChange={e => setForm(p => ({ ...p, application_mode: e.target.value }))}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="linear">Linéaire</option>
              <option value="exponential">Exponentiel</option>
              <option value="step">Par palier</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Niveau de confiance</Label>
            <select value={form.confidence_level} onChange={e => setForm(p => ({ ...p, confidence_level: e.target.value }))}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="low">Faible</option>
              <option value="medium">Moyen</option>
              <option value="high">Élevé</option>
            </select>
          </div>
        </div>

        {/* References */}
        <div><Label className="text-xs">Source / référence</Label><Input value={form.source_reference} onChange={e => setForm(p => ({ ...p, source_reference: e.target.value }))} placeholder="Ex: Étude ADEME 2024" className="mt-1" /></div>
        <div><Label className="text-xs">Note méthodologique</Label><Textarea value={form.methodological_note} onChange={e => setForm(p => ({ ...p, methodological_note: e.target.value }))} rows={2} className="mt-1" /></div>

        <Button onClick={handleSave} className="w-full gap-1.5"><Save className="h-3.5 w-3.5" />Enregistrer les hypothèses</Button>
      </CardContent>
    </Card>
  );
}
