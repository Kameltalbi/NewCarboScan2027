// Page de création d'une nouvelle étude PCF / ACV – Product Pro

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useCreatePCFStudy } from '../hooks/usePCFStudy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, ArrowRight, Loader2, Factory, Truck, Recycle,
  AlertTriangle, ShieldCheck, Beaker, Leaf,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { CreateStudyForm, PerimeterType, StudyMode } from '../types';

const CATEGORIES = [
  { value: 'industriel', label: 'Industriel' },
  { value: 'alimentaire', label: 'Alimentaire' },
  { value: 'textile', label: 'Textile' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'construction', label: 'Construction' },
  { value: 'chimique', label: 'Chimique' },
  { value: 'produit', label: 'Produit fini' },
  { value: 'service', label: 'Service' },
  { value: 'ciment', label: 'Ciment (CBAM)' },
  { value: 'acier-fer', label: 'Fer & Acier (CBAM)' },
  { value: 'aluminium', label: 'Aluminium (CBAM)' },
  { value: 'engrais', label: 'Engrais (CBAM)' },
  { value: 'hydrogene', label: 'Hydrogène (CBAM)' },
  { value: 'electricite', label: 'Électricité (CBAM)' },
  { value: 'autre', label: 'Autre' },
];

const CBAM_CATEGORIES = ['ciment', 'acier-fer', 'aluminium', 'engrais', 'hydrogene', 'electricite'];

interface PerimeterOption {
  value: PerimeterType;
  label: string;
  desc: string;
  phases: string[];
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const PERIMETERS: PerimeterOption[] = [
  {
    value: 'cradle-to-gate',
    label: 'Cradle-to-Gate',
    desc: 'Extraction des matières premières → Transport → Sortie usine',
    phases: ['Extraction', 'Transport matières', 'Fabrication'],
    icon: <Factory className="w-5 h-5" />,
    badge: 'Obligatoire CBAM',
    badgeVariant: 'default',
  },
  {
    value: 'cradle-to-customer',
    label: 'Cradle-to-Customer',
    desc: 'Inclut la logistique de distribution aval jusqu\'au client final',
    phases: ['Extraction', 'Transport matières', 'Fabrication', 'Distribution'],
    icon: <Truck className="w-5 h-5" />,
  },
  {
    value: 'cradle-to-grave',
    label: 'Cradle-to-Grave',
    desc: 'Cycle complet : extraction → usage → fin de vie (recyclage/déchets)',
    phases: ['Extraction', 'Transport', 'Fabrication', 'Usage', 'Fin de vie'],
    icon: <Recycle className="w-5 h-5" />,
    badge: 'ISO 14067 complet',
    badgeVariant: 'secondary',
  },
  {
    value: 'gate-to-gate',
    label: 'Gate-to-Gate',
    desc: 'Uniquement les opérations internes de l\'usine et sous-traitants',
    phases: ['Fabrication', 'Sous-traitance'],
    icon: <Factory className="w-5 h-5" />,
  },
];

interface ModeOption {
  value: StudyMode;
  label: string;
  desc: string;
  norms: string;
  indicators: string[];
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'pcf',
    label: 'Empreinte Carbone (PCF)',
    desc: 'Calcul de l\'empreinte carbone produit — opérationnel, conformité CBAM',
    norms: 'ISO 14067 · GHG Protocol Product',
    indicators: ['CO₂e'],
    icon: <Leaf className="w-6 h-6" />,
    badge: 'Recommandé',
    badgeVariant: 'default',
  },
  {
    value: 'acv',
    label: 'ACV Multi-indicateurs',
    desc: 'Analyse de cycle de vie complète — multi-critères environnementaux',
    norms: 'ISO 14040/14044 · EN 15804 · PEF',
    indicators: ['CO₂e', 'Énergie (MJ)', 'Eau (m³)', 'Acidification (SO₂e)'],
    icon: <Beaker className="w-6 h-6" />,
    badge: 'Expert',
    badgeVariant: 'secondary',
  },
];

const PCFNewStudy: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreatePCFStudy();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateStudyForm>({
    defaultValues: {
      name: '',
      product_category: 'industriel',
      functional_unit: '1 unité',
      perimeter_type: 'cradle-to-gate',
      study_mode: 'pcf',
      country: 'Tunisie',
    },
  });

  const selectedPerimeter = watch('perimeter_type');
  const selectedCategory = watch('product_category');
  const selectedMode = watch('study_mode') || 'pcf';
  const isCBAMCategory = CBAM_CATEGORIES.includes(selectedCategory);
  const isACVMode = selectedMode === 'acv';

  // Auto-lock to cradle-to-gate when CBAM category is selected
  useEffect(() => {
    if (isCBAMCategory && selectedPerimeter !== 'cradle-to-gate') {
      setValue('perimeter_type', 'cradle-to-gate');
    }
  }, [isCBAMCategory, selectedPerimeter, setValue]);

  // Force PCF mode when CBAM category is selected
  useEffect(() => {
    if (isCBAMCategory && selectedMode !== 'pcf') {
      setValue('study_mode', 'pcf');
    }
  }, [isCBAMCategory, selectedMode, setValue]);

  const onSubmit = async (form: CreateStudyForm) => {
    const study = await createMutation.mutateAsync({
      ...form,
      cbam_mode: isCBAMCategory,
      study_mode: form.study_mode || 'pcf',
    } as any);
    navigate(`/app/empreinte-produit/etude/${study.id}/parametrage`);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/empreinte-produit')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouvelle étude produit</h1>
          <p className="text-sm text-muted-foreground">Paramétrage initial — conforme ISO 14067/14040 & GHG Protocol</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Mode Selector ── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Profil de mission</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez le type d'analyse selon vos objectifs : conformité réglementaire ou étude environnementale complète.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODE_OPTIONS.map(mode => {
              const isSelected = selectedMode === mode.value;
              const isDisabled = isCBAMCategory && mode.value === 'acv';

              return (
                <div
                  key={mode.value}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed border-border'
                      : isSelected
                      ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                  }`}
                  onClick={() => !isDisabled && setValue('study_mode', mode.value)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 rounded-lg ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {mode.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{mode.label}</p>
                        {mode.badge && (
                          <Badge variant={mode.badgeVariant || 'outline'} className="text-[10px] px-1.5 py-0">
                            {mode.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-medium">{mode.norms}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {mode.indicators.map(ind => (
                          <span key={ind} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Radio indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isCBAMCategory && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Catégorie CBAM détectée — seul le mode PCF est autorisé pour la conformité réglementaire.</span>
            </div>
          )}
        </Card>

        {/* ACV Mode Info */}
        {isACVMode && (
           <Alert className="border-accent/30 bg-accent/5">
            <Beaker className="h-4 w-4 text-accent-foreground" />
            <AlertDescription className="text-sm">
              <strong>Mode ACV Expert activé</strong> — En plus du CO₂e, les impacts <strong>Énergie primaire</strong> (MJ), 
              <strong> Consommation d'eau</strong> (m³) et <strong>Acidification</strong> (kgSO₂e) seront calculés pour chaque phase 
              du cycle de vie, conformément à l'ISO 14040/14044.
            </AlertDescription>
          </Alert>
        )}

        {/* Informations produit */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Informations produit</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input id="name" {...register('name', { required: true })} placeholder="ex: Structure métallique type A" />
              {errors.name && <p className="text-xs text-destructive">Requis</p>}
            </div>

            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select defaultValue="industriel" onValueChange={(v) => setValue('product_category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description technique</Label>
            <Textarea id="description" {...register('description')} placeholder="Description du produit, fonction principale..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Secteur industriel</Label>
              <Input id="sector" {...register('sector')} placeholder="ex: Métallurgie" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="production_site">Site de production</Label>
              <Input id="production_site" {...register('production_site')} placeholder="ex: Usine Sfax" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input id="country" {...register('country')} placeholder="Tunisie" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="electricity_mix">Mix électrique</Label>
              <Input id="electricity_mix" {...register('electricity_mix')} placeholder="ex: tunisie, france" />
            </div>
          </div>
        </Card>

        {/* CBAM Alert */}
        {isCBAMCategory && (
          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Mode CBAM activé</strong> — Le périmètre est automatiquement verrouillé sur <strong>Cradle-to-Gate</strong> conformément 
              au règlement MACF européen. Les données seront compatibles avec le fichier XML de déclaration CBAM.
            </AlertDescription>
          </Alert>
        )}

        {/* Unité fonctionnelle */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Unité fonctionnelle</h2>
          <p className="text-sm text-muted-foreground">
            L'unité fonctionnelle est la grandeur de référence à laquelle sont rapportés tous les résultats (ISO 14067 §6.3.2).
          </p>
          <div className="space-y-2">
            <Label htmlFor="functional_unit">Unité fonctionnelle *</Label>
            <Input id="functional_unit" {...register('functional_unit', { required: true })} placeholder="ex: 1 tonne de structure métallique" />
            {errors.functional_unit && <p className="text-xs text-destructive">Requis</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {['1 kg de produit', '1 tonne de produit', '1 m² de produit', '1 unité produite'].map(uf => (
              <Button
                key={uf} type="button" variant="outline" size="sm"
                onClick={() => setValue('functional_unit', uf)}
                className="text-xs"
              >
                {uf}
              </Button>
            ))}
          </div>
        </Card>

        {/* Périmètre du cycle de vie */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Périmètre du cycle de vie (System Boundaries)</h2>
          <p className="text-sm text-muted-foreground">
            Définissez les frontières du système selon la norme {isACVMode ? 'ISO 14044 §4.2.3.3' : 'ISO 14067 §6.4'}.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERIMETERS.map(p => {
              const isSelected = selectedPerimeter === p.value;
              const isDisabled = isCBAMCategory && p.value !== 'cradle-to-gate';

              return (
                <div
                  key={p.value}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed border-border'
                      : isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                  }`}
                  onClick={() => !isDisabled && setValue('perimeter_type', p.value)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{p.label}</p>
                        {p.badge && (
                          <Badge variant={p.badgeVariant || 'outline'} className="text-[10px] px-1.5 py-0">
                            {p.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {p.phases.map((phase, idx) => (
                          <React.Fragment key={phase}>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {phase}
                            </span>
                            {idx < p.phases.length - 1 && (
                              <span className="text-muted-foreground text-[10px]">→</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      </div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isCBAMCategory && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Catégorie CBAM détectée — seul le périmètre Cradle-to-Gate est autorisé par le règlement MACF.</span>
            </div>
          )}
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" className="gap-2" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Créer l'étude et continuer
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PCFNewStudy;