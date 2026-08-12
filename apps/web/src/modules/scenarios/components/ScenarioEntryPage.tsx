import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database, BarChart3, Leaf, Target, ArrowRight, Clock,
  Building2, MapPin, Briefcase, Package, TrendingDown, Flame, Factory, Truck, GitCompare
} from 'lucide-react';
import { DataSourceSummary } from '../hooks/useScenarioBaseline';
import { ClimateScenario, ScenarioType, SCENARIO_TYPE_LABELS } from '../types';

interface Props {
  dataSources: DataSourceSummary;
  onCreateScenario: (s: Partial<ClimateScenario>) => Promise<ClimateScenario | null>;
}

const PERIMETERS = [
  { value: 'company', label: 'Entreprise entière', icon: Building2 },
  { value: 'site', label: 'Site spécifique', icon: MapPin },
  { value: 'business_unit', label: 'Business Unit', icon: Briefcase },
  { value: 'product', label: 'Produit', icon: Package },
];

export const ScenarioEntryPage: React.FC<Props> = ({ dataSources, onCreateScenario }) => {
  const { organization } = useOrganizationData();
  const currency = organization?.currency || 'EUR';
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [perimeter, setPerimeter] = useState('company');
  const [form, setForm] = useState({
    name: '',
    baseline_year: dataSources.bilans[0]?.year || new Date().getFullYear() - 1,
    target_year: 2035,
    scenario_type: 'intermediate' as ScenarioType,
    annual_revenue_eur: 0,
  });

  const selectedBilan = dataSources.bilans[0];
  const baseline = useMemo(() => {
    if (sourceType === 'bilan' && selectedBilan) {
      return { total: selectedBilan.totalEmissions, scope1: selectedBilan.scope1, scope2: selectedBilan.scope2, scope3: selectedBilan.scope3 };
    }
    return { total: 0, scope1: 0, scope2: 0, scope3: 0 };
  }, [sourceType, selectedBilan]);

  const canStart = form.name.trim().length > 0 && baseline.total > 0;

  const handleCreate = async () => {
    await onCreateScenario({
      name: form.name,
      baseline_source_type: sourceType || 'bilan',
      baseline_year: form.baseline_year,
      start_year: form.baseline_year + 1,
      target_year: form.target_year,
      scenario_type: form.scenario_type,
      baseline_emissions_tco2e: baseline.total,
      annual_revenue_eur: form.annual_revenue_eur > 0 ? form.annual_revenue_eur : null,
      target_reduction_percent: form.scenario_type === 'ambitious' ? 50 : form.scenario_type === 'net_zero' ? 90 : 30,
      target_emissions_tco2e: baseline.total * (form.scenario_type === 'ambitious' ? 0.5 : form.scenario_type === 'net_zero' ? 0.1 : 0.7),
      net_zero_flag: form.scenario_type === 'net_zero',
      status: 'draft',
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GitCompare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Modélisation de scénarios</h1>
            <p className="text-sm text-muted-foreground">Simulez et comparez des trajectoires de décarbonation à partir de vos données existantes.</p>
          </div>
        </div>
      </div>

      {/* Source selection */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Quelle base souhaitez-vous utiliser pour la simulation ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SourceCard selected={sourceType === 'bilan'} onClick={() => setSourceType('bilan')}
            icon={Database} title="Bilan carbone" count={dataSources.bilanCount}
            meta={selectedBilan ? `${selectedBilan.totalEmissions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e` : undefined}
            desc="Émissions organisationnelles par scope" available={dataSources.bilanCount > 0} />
          <SourceCard selected={sourceType === 'pcf'} onClick={() => setSourceType('pcf')}
            icon={Leaf} title="Empreinte produit" count={dataSources.pcfCount}
            desc="Émissions produit ou famille" available={dataSources.pcfCount > 0} />
          <SourceCard selected={sourceType === 'acv'} onClick={() => setSourceType('acv')}
            icon={BarChart3} title="ACV" count={dataSources.acvCount}
            desc="Impacts cycle de vie complet" available={dataSources.acvCount > 0} />
        </div>
      </section>

      {/* Data summary */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Données disponibles</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <DataTile icon={Database} label="Bilans" value={dataSources.bilanCount} />
          <DataTile icon={Leaf} label="Études produit" value={dataSources.pcfCount} />
          <DataTile icon={BarChart3} label="Projets ACV" value={dataSources.acvCount} />
          <DataTile icon={Clock} label="Dernière MAJ" text={dataSources.lastUpdate ? new Date(dataSources.lastUpdate).toLocaleDateString('fr-FR') : '—'} />
        </div>
      </section>

      {sourceType && (
        <>
          <Separator />
          {/* Perimeter */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Périmètre de simulation</h2>
            <div className="flex flex-wrap gap-2">
              {PERIMETERS.map(p => {
                const Icon = p.icon;
                return (
                  <button key={p.value} onClick={() => setPerimeter(p.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${perimeter === p.value ? 'border-primary bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    <Icon className="h-3.5 w-3.5" />{p.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Form + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Configuration du premier scénario</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom du scénario *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Scénario ambitieux 2035" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Type de scénario</Label>
                  <select value={form.scenario_type} onChange={e => setForm(p => ({ ...p, scenario_type: e.target.value as ScenarioType }))}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {Object.entries(SCENARIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Année de référence</Label><Input type="number" value={form.baseline_year} onChange={e => setForm(p => ({ ...p, baseline_year: parseInt(e.target.value) || p.baseline_year }))} className="mt-1" /></div>
                <div><Label className="text-xs">Horizon cible</Label><Input type="number" value={form.target_year} onChange={e => setForm(p => ({ ...p, target_year: parseInt(e.target.value) || 2035 }))} className="mt-1" /></div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Chiffre d'affaires annuel ({currency})</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help"><Badge variant="outline" className="text-[9px] px-1.5 py-0">ESRS E1</Badge></span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      <p className="font-semibold mb-1">ESRS E1 — Changement climatique</p>
                      <p>La norme européenne ESRS E1 (European Sustainability Reporting Standards) exige la publication de l'intensité carbone économique : tCO₂e par million de chiffre d'affaires. Ce KPI permet de comparer la performance climatique indépendamment de la taille de l'entreprise.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input type="number" value={form.annual_revenue_eur || ''} onChange={e => setForm(p => ({ ...p, annual_revenue_eur: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 50000000" className="mt-1" />
              </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Aperçu baseline</h2>
              <Card className="bg-muted/30">
                <CardContent className="py-4 space-y-3">
                  {baseline.total > 0 ? (
                    <>
                      <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Émissions de référence</span><span className="font-bold text-sm">{baseline.total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e</span></div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><Flame className="h-4 w-4 mx-auto text-red-500 mb-1" /><p className="text-[10px] text-muted-foreground">Scope 1</p><p className="font-semibold text-xs">{baseline.scope1.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p></div>
                        <div><Factory className="h-4 w-4 mx-auto text-amber-500 mb-1" /><p className="text-[10px] text-muted-foreground">Scope 2</p><p className="font-semibold text-xs">{baseline.scope2.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p></div>
                        <div><Truck className="h-4 w-4 mx-auto text-indigo-500 mb-1" /><p className="text-[10px] text-muted-foreground">Scope 3</p><p className="font-semibold text-xs">{baseline.scope3.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p></div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Sélectionnez une source</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={handleCreate} disabled={!canStart} className="gap-2 px-8">
              Créer le premier scénario <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// Sub-components
function SourceCard({ selected, onClick, icon: Icon, title, count, desc, meta, available }: {
  selected: boolean; onClick: () => void; icon: any; title: string; count: number; desc: string; meta?: string; available: boolean;
}) {
  return (
    <button onClick={onClick} disabled={!available}
      className={`p-4 rounded-lg border text-left transition-all ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : available ? 'border-border hover:border-primary/30' : 'border-border opacity-50 cursor-not-allowed'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{desc}</p>
      <div className="flex items-center gap-2">
        <Badge variant={count > 0 ? 'default' : 'secondary'} className="text-[10px]">{count} disponible(s)</Badge>
        {meta && <span className="text-[10px] text-muted-foreground">{meta}</span>}
      </div>
    </button>
  );
}

function DataTile({ icon: Icon, label, value, text }: { icon: any; label: string; value?: number; text?: string }) {
  return (
    <Card><CardContent className="py-3 px-3">
      <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{label}</span></div>
      <p className="font-bold text-lg mt-1">{text ?? value ?? 0}</p>
    </CardContent></Card>
  );
}
