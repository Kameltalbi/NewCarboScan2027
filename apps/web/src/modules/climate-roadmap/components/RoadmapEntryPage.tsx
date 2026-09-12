// Page d'entrée professionnelle — Feuille de route climat
// Écran de cadrage intelligent, data-driven, premium

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database, BarChart3, Leaf, Flame, Factory, Truck,
  Target, Calendar, ArrowRight, AlertCircle, CheckCircle2,
  Building2, MapPin, Briefcase, Package, Boxes, Clock, TrendingDown, User
} from 'lucide-react';
import { DataSourceSummary, BilanSummary } from '../hooks/useAvailableBaselineData';

interface RoadmapEntryPageProps {
  dataSources: DataSourceSummary;
  onStart: (config: RoadmapInitConfig) => void;
}

export interface RoadmapInitConfig {
  name: string;
  description: string;
  sourceType: 'bilan' | 'pcf' | 'acv' | null;
  sourceId: string | null;
  perimeter: 'company' | 'site' | 'business_unit' | 'product' | 'product_family';
  baseline_year: number;
  target_year: number;
  reduction_target_percent: number;
  baseline_emissions_tco2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  owner: string;
}

type SourceType = 'bilan' | 'pcf' | 'acv';

const PERIMETERS = [
  { value: 'company' as const, label: 'Entreprise entière', icon: Building2 },
  { value: 'site' as const, label: 'Site spécifique', icon: MapPin },
  { value: 'business_unit' as const, label: 'Business Unit', icon: Briefcase },
  { value: 'product' as const, label: 'Produit', icon: Package },
  { value: 'product_family' as const, label: 'Famille de produits', icon: Boxes },
];

const SBTi_PRESETS = [
  { label: 'SBTi 1.5°C', value: 42, year: 2030, desc: 'Near-term, aligné 1.5°C' },
  { label: 'SBTi 2°C', value: 25, year: 2030, desc: 'Near-term, bien en dessous de 2°C' },
  { label: 'Net Zero', value: 90, year: 2050, desc: 'Long-term, net zéro' },
];

export const RoadmapEntryPage: React.FC<RoadmapEntryPageProps> = ({ dataSources, onStart }) => {
  const [selectedSource, setSelectedSource] = useState<SourceType | null>(null);
  const [selectedBilan, setSelectedBilan] = useState<BilanSummary | null>(
    dataSources.bilans[0] || null
  );
  const [perimeter, setPerimeter] = useState<RoadmapInitConfig['perimeter']>('company');
  const [form, setForm] = useState({
    name: '',
    description: '',
    baseline_year: dataSources.bilans[0]?.year || new Date().getFullYear() - 1,
    target_year: 2030,
    reduction_target_percent: 42,
    owner: '',
  });

  const hasAnyData = dataSources.bilanCount + dataSources.pcfCount + dataSources.acvCount > 0;

  // Compute baseline from selected source
  const baseline = useMemo(() => {
    if (selectedSource === 'bilan' && selectedBilan) {
      return {
        total: selectedBilan.totalEmissions,
        scope1: selectedBilan.scope1,
        scope2: selectedBilan.scope2,
        scope3: selectedBilan.scope3,
        dominantScope: selectedBilan.scope3 >= selectedBilan.scope1 && selectedBilan.scope3 >= selectedBilan.scope2 ? 'Scope 3'
          : selectedBilan.scope1 >= selectedBilan.scope2 ? 'Scope 1' : 'Scope 2',
      };
    }
    return { total: 0, scope1: 0, scope2: 0, scope3: 0, dominantScope: '—' };
  }, [selectedSource, selectedBilan]);

  const targetEmissions = baseline.total * (1 - form.reduction_target_percent / 100);

  const canStart = form.name.trim().length > 0 && baseline.total > 0 && form.target_year > form.baseline_year;

  const handleStart = () => {
    onStart({
      name: form.name,
      description: form.description,
      sourceType: selectedSource,
      sourceId: selectedBilan?.id || null,
      perimeter,
      baseline_year: form.baseline_year,
      target_year: form.target_year,
      reduction_target_percent: form.reduction_target_percent,
      baseline_emissions_tco2e: baseline.total,
      scope1: baseline.scope1,
      scope2: baseline.scope2,
      scope3: baseline.scope3,
      owner: form.owner,
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Plan d'actions</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Construisez un plan d'action climatique structuré à partir de vos données existantes : bilan carbone, empreinte produit ou ACV.
          </p>
        </div>
        {hasAnyData && (
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            {dataSources.lastUpdate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Maj : {new Date(dataSources.lastUpdate).toLocaleDateString('fr-FR')}
              </span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {dataSources.bilanCount + dataSources.pcfCount + dataSources.acvCount} source(s)
            </Badge>
          </div>
        )}
      </div>

      {/* Section 1: Source selection */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Quelle base souhaitez-vous utiliser pour démarrer votre feuille de route ?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Bilan Carbone */}
          <SourceCard
            selected={selectedSource === 'bilan'}
            onClick={() => { setSelectedSource('bilan'); setSelectedBilan(dataSources.bilans[0] || null); }}
            icon={Database}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            title="Bilan carbone"
            description="Émissions organisationnelles par scope, site et poste."
            available={dataSources.bilanCount > 0}
            count={dataSources.bilanCount}
            countLabel="bilan(s) disponible(s)"
            meta={dataSources.bilans[0] ? `Réf. ${dataSources.bilans[0].year} • ${dataSources.bilans[0].totalEmissions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e` : undefined}
          />

          {/* Empreinte Produit */}
          <SourceCard
            selected={selectedSource === 'pcf'}
            onClick={() => setSelectedSource('pcf')}
            icon={Leaf}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            title="Empreinte produit"
            description="Émissions d'un produit ou d'une famille de produits."
            available={dataSources.pcfCount > 0}
            count={dataSources.pcfCount}
            countLabel="étude(s) disponible(s)"
            meta={dataSources.pcfStudies[0] ? `${dataSources.pcfStudies[0].productName}` : undefined}
          />

          {/* ACV */}
          <SourceCard
            selected={selectedSource === 'acv'}
            onClick={() => setSelectedSource('acv')}
            icon={BarChart3}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            title="Analyse de Cycle de Vie"
            description="Impacts détaillés sur le cycle de vie complet."
            available={dataSources.acvCount > 0}
            count={dataSources.acvCount}
            countLabel="projet(s) disponible(s)"
            meta={dataSources.acvProjects[0] ? `${dataSources.acvProjects[0].name}` : undefined}
          />
        </div>
      </section>

      {/* Section 2: Data summary */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Données actuellement disponibles</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <DataTile icon={Database} label="Bilans carbone" value={dataSources.bilanCount} />
          <DataTile icon={Leaf} label="Études produit" value={dataSources.pcfCount} />
          <DataTile icon={BarChart3} label="Projets ACV" value={dataSources.acvCount} />
          <DataTile
            icon={Clock}
            label="Dernière mise à jour"
            text={dataSources.lastUpdate
              ? new Date(dataSources.lastUpdate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          />
          <DataTile
            icon={Target}
            label="Périmètre principal"
            text={hasAnyData ? 'Organisationnel' : '—'}
          />
        </div>
      </section>

      {/* Conditional: if source selected, show more */}
      {selectedSource && (
        <>
          <Separator />

          {/* Section 3: Bilan selector if multiple */}
          {selectedSource === 'bilan' && dataSources.bilans.length > 1 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Sélectionnez le bilan de référence</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {dataSources.bilans.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBilan(b)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedBilan?.id === b.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bilan {b.year}</span>
                      <Badge variant="outline" className="text-[10px]">{b.status === 'validated' ? 'Validé' : 'Brouillon'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.totalEmissions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Perimeter */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Périmètre de la feuille de route</h2>
            <div className="flex flex-wrap gap-2">
              {PERIMETERS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.value}
                    onClick={() => setPerimeter(p.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      perimeter === p.value ? 'border-primary bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 5: Form + Preview side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: form (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Paramètres de la feuille de route</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom de la feuille de route *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Plan climat 2025–2030"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Responsable principal</Label>
                  <Input
                    value={form.owner}
                    onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                    placeholder="Nom du responsable climat"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Contexte, périmètre, ambitions…"
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Years + target */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Année de référence</Label>
                  <Input
                    type="number"
                    value={form.baseline_year}
                    onChange={e => setForm(p => ({ ...p, baseline_year: parseInt(e.target.value) || p.baseline_year }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Année cible</Label>
                  <Input
                    type="number"
                    value={form.target_year}
                    onChange={e => setForm(p => ({ ...p, target_year: parseInt(e.target.value) || 2030 }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Objectif de réduction (%)</Label>
                  <Input
                    type="number"
                    value={form.reduction_target_percent}
                    onChange={e => setForm(p => ({ ...p, reduction_target_percent: parseFloat(e.target.value) || 0 }))}
                    min={1} max={100}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* SBTi presets */}
              <div className="flex gap-2">
                {SBTi_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setForm(prev => ({ ...prev, reduction_target_percent: p.value, target_year: p.year }))}
                    className={`flex-1 p-2 rounded-md border text-left transition-all ${
                      form.reduction_target_percent === p.value && form.target_year === p.year
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <p className="text-xs font-semibold">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: preview (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Aperçu du point de départ</h2>

              <Card className="bg-muted/30">
                <CardContent className="py-4 space-y-4">
                  {baseline.total > 0 ? (
                    <>
                      <PreviewRow label="Émissions de référence" value={`${baseline.total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e`} bold />
                      <Separator />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <ScopeChip icon={Flame} label="Scope 1" value={baseline.scope1} color="text-red-600" />
                        <ScopeChip icon={Factory} label="Scope 2" value={baseline.scope2} color="text-amber-600" />
                        <ScopeChip icon={Truck} label="Scope 3" value={baseline.scope3} color="text-indigo-600" />
                      </div>
                      <Separator />
                      <PreviewRow label="Scope dominant" value={baseline.dominantScope} />
                      <PreviewRow label="Objectif" value={`−${form.reduction_target_percent}% d'ici ${form.target_year}`} />
                      <PreviewRow label="Cible" value={`${targetEmissions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e`} />
                      <PreviewRow label="Réduction à atteindre" value={`${(baseline.total - targetEmissions).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} tCO₂e`} bold />
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Sélectionnez une source pour visualiser le point de départ</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {!hasAnyData && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800">
                        Aucune donnée carbone détectée. Réalisez un bilan carbone ou une empreinte produit pour alimenter automatiquement votre feuille de route.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!canStart}
              className="gap-2 px-8"
            >
              Démarrer la feuille de route
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// --- Sub-components ---

function SourceCard({
  selected, onClick, icon: Icon, iconColor, iconBg, title, description, available, count, countLabel, meta,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  available: boolean;
  count: number;
  countLabel: string;
  meta?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-[4px] border-2 text-left transition-all h-full flex flex-col ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : available
            ? 'border-border hover:border-primary/40 hover:shadow-sm'
            : 'border-dashed border-muted-foreground/20 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
        </div>
        {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground mb-3 flex-1">{description}</p>
      <div className="flex items-center justify-between mt-auto">
        <Badge variant={available ? 'secondary' : 'outline'} className="text-[10px]">
          {count} {countLabel}
        </Badge>
      </div>
      {meta && <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{meta}</p>}
    </button>
  );
}

function DataTile({ icon: Icon, label, value, text }: { icon: React.ElementType; label: string; value?: number; text?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-lg font-bold text-foreground leading-none">
          {value !== undefined ? value : text || '—'}
        </p>
      </CardContent>
    </Card>
  );
}

function PreviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs ${bold ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>{value}</span>
    </div>
  );
}

function ScopeChip({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div>
      <Icon className={`h-3.5 w-3.5 ${color} mx-auto mb-0.5`} />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold">{value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</p>
    </div>
  );
}
