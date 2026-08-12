// Dashboard PCF – Professional operational cockpit

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePCFStudies, useDeletePCFStudy } from '../hooks/usePCFStudy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Plus, Trash2, Eye, Edit, Package,
  AlertCircle, TrendingDown, Activity, Lock, FileText,
  ArrowRight, Layers, BarChart3
} from 'lucide-react';
import type { PCFStudy, StudyStatus } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<StudyStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', variant: 'secondary', icon: Edit },
  in_progress: { label: 'En cours', variant: 'outline', icon: Activity },
  calculated: { label: 'Calculée', variant: 'default', icon: BarChart3 },
  locked: { label: 'Verrouillée', variant: 'destructive', icon: Lock },
};

const PERIMETER_LABELS: Record<string, string> = {
  'cradle-to-gate': 'Cradle-to-gate',
  'cradle-to-customer': 'Cradle-to-customer',
  'cradle-to-grave': 'Cradle-to-grave',
  'gate-to-gate': 'Gate-to-gate',
};

const PCFDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: studies, isLoading, error } = usePCFStudies();
  const deleteMutation = useDeletePCFStudy();

  const calculated = studies?.filter(s => s.status === 'calculated' || s.status === 'locked') || [];
  const inProgress = studies?.filter(s => s.status === 'draft' || s.status === 'in_progress') || [];
  const avgEmissions = calculated.length > 0
    ? calculated.reduce((s, c) => s + (c.total_emissions || 0), 0) / calculated.length
    : null;
  const lastUpdated = studies?.[0]?.updated_at || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Études totales"
          value={studies?.length || 0}
          icon={<Layers className="h-5 w-5 text-primary" />}
        />
        <KPICard
          label="Calculées"
          value={calculated.length}
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          accent
        />
        <KPICard
          label="En cours"
          value={inProgress.length}
          icon={<Activity className="h-5 w-5 text-muted-foreground" />}
        />
        <KPICard
          label="Empreinte moyenne"
          value={avgEmissions !== null ? `${avgEmissions.toFixed(1)}` : '–'}
          suffix="kg CO₂e"
          icon={<TrendingDown className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => navigate('/app/empreinte-produit/nouveau')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle étude
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/empreinte-produit/scenarios')} className="gap-2">
          <TrendingDown className="h-4 w-4" />
          Scénarios
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/empreinte-produit/rapports')} className="gap-2">
          <FileText className="h-4 w-4" />
          Rapports
        </Button>
        {lastUpdated && (
          <span className="ml-auto text-xs text-muted-foreground">
            Dernière mise à jour : {format(new Date(lastUpdated), 'dd MMM yyyy', { locale: fr })}
          </span>
        )}
      </div>

      {/* ── Empty State ── */}
      {(!studies || studies.length === 0) && <EmptyState onCreateClick={() => navigate('/app/empreinte-produit/nouveau')} />}

      {/* ── Studies Table ── */}
      {studies && studies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Mes études</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                     <th className="text-left p-3 font-medium text-muted-foreground">Produit</th>
                     <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Mode</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Site</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Périmètre</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Empreinte</th>
                    <th className="text-right p-3 font-medium text-muted-foreground w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((study) => (
                    <StudyRow
                      key={study.id}
                      study={study}
                      onOpen={() => navigate(`/app/empreinte-produit/etude/${study.id}`)}
                      onEdit={() => navigate(`/app/empreinte-produit/etude/${study.id}/bom`)}
                      onDelete={() => {
                        if (confirm('Supprimer cette étude ?')) deleteMutation.mutate(study.id);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex gap-2 items-center p-4 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">Erreur lors du chargement : {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ── Sub-components ── */

interface KPICardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, suffix, icon, accent }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${accent ? 'text-primary' : 'text-foreground'}`}>
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
      </div>
      <div className="rounded-lg bg-muted p-2">{icon}</div>
    </CardContent>
  </Card>
);

interface StudyRowProps {
  study: PCFStudy;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const StudyRow: React.FC<StudyRowProps> = ({ study, onOpen, onEdit, onDelete }) => {
  const cfg = STATUS_CONFIG[study.status];
  const StatusIcon = cfg.icon;

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={onOpen}>
      <td className="p-3">
        <p className="font-medium text-foreground">{study.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{study.product_category}</p>
      </td>
      <td className="p-3 hidden sm:table-cell">
        <Badge variant={study.study_mode === 'acv' ? 'secondary' : 'outline'} className="text-[10px]">
          {study.study_mode === 'acv' ? 'ACV' : 'PCF'}
        </Badge>
      </td>
      <td className="p-3 text-muted-foreground hidden md:table-cell">{study.production_site || '–'}</td>
      <td className="p-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{PERIMETER_LABELS[study.perimeter_type] || study.perimeter_type}</span>
      </td>
      <td className="p-3">
        <Badge variant={cfg.variant} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </Badge>
      </td>
      <td className="p-3 text-right">
        {study.total_emissions !== null ? (
          <span className="font-semibold text-primary">
            {study.total_emissions.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">kg CO₂e</span>
          </span>
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </td>
      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={onOpen} title="Ouvrir">
            <Eye className="h-4 w-4" />
          </Button>
          {study.status !== 'locked' && (
            <>
              <Button variant="ghost" size="icon" onClick={onEdit} title="Modifier">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} title="Supprimer">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const EmptyState: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => (
  <Card className="border-dashed">
    <CardContent className="py-16 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Aucune étude</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
        Quantifiez l'empreinte environnementale de vos produits : mode PCF (CO₂e seul) ou ACV Expert (multi-indicateurs).
      </p>

      {/* Guided Steps */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 text-xs text-muted-foreground">
        <Step number={1} label="Créer une étude" />
        <ArrowRight className="h-3 w-3 hidden sm:block" />
        <Step number={2} label="Saisir la nomenclature" />
        <ArrowRight className="h-3 w-3 hidden sm:block" />
        <Step number={3} label="Lier les données Collect" />
        <ArrowRight className="h-3 w-3 hidden sm:block" />
        <Step number={4} label="Calculer l'empreinte" />
      </div>

      <Button className="mt-8 gap-2" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Créer ma première étude
      </Button>
    </CardContent>
  </Card>
);

const Step: React.FC<{ number: number; label: string }> = ({ number, label }) => (
  <div className="flex items-center gap-2">
    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
      {number}
    </span>
    <span className="font-medium text-foreground">{label}</span>
  </div>
);

export default PCFDashboard;
