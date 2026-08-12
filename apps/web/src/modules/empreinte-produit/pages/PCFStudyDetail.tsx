// Vue détaillée d'une étude PCF avec navigation verticale par section

import React from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePCFStudy } from '../hooks/usePCFStudy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Settings, Layers, Truck, Factory, Trash2, Package as PackageIcon, Send, Plug, Recycle, BarChart3, FileText, Lock, Building2, Scale, Database } from 'lucide-react';
import { STUDY_SECTIONS, type StudySection } from '../types';

const PCFParametrage = React.lazy(() => import('../components/study/PCFParametrage'));
const PCFBillOfMaterials = React.lazy(() => import('../components/study/PCFBillOfMaterials'));
const PCFTransport = React.lazy(() => import('../components/study/PCFTransport'));
const PCFManufacturing = React.lazy(() => import('../components/study/PCFManufacturing'));
const PCFSubcontracting = React.lazy(() => import('../components/study/PCFSubcontracting'));
const PCFCoProducts = React.lazy(() => import('../components/study/PCFCoProducts'));
const PCFCollectData = React.lazy(() => import('../components/study/PCFCollectData'));
const PCFWastes = React.lazy(() => import('../components/study/PCFWastes'));
const PCFPackaging = React.lazy(() => import('../components/study/PCFPackaging'));
const PCFDistribution = React.lazy(() => import('../components/study/PCFDistribution'));
const PCFUsage = React.lazy(() => import('../components/study/PCFUsage'));
const PCFEndOfLife = React.lazy(() => import('../components/study/PCFEndOfLife'));
const PCFResults = React.lazy(() => import('../components/study/PCFResults'));
const PCFReportSection = React.lazy(() => import('../components/study/PCFReportSection'));

const SECTION_ICONS: Record<StudySection, React.ElementType> = {
  parametrage: Settings,
  bom: Layers,
  transport: Truck,
  fabrication: Factory,
  'sous-traitance': Building2,
  coproduits: Scale,
  'donnees-collect': Database,
  dechets: Trash2,
  emballage: PackageIcon,
  distribution: Send,
  utilisation: Plug,
  'fin-de-vie': Recycle,
  resultats: BarChart3,
  rapport: FileText,
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  in_progress: { label: 'En cours', variant: 'outline' },
  calculated: { label: 'Calculé', variant: 'default' },
  locked: { label: '🔒 Verrouillé', variant: 'default' },
};

const PCFStudyDetail: React.FC = () => {
  const { studyId } = useParams<{ studyId: string }>();
  const { data: study, isLoading } = usePCFStudy(studyId);
  const navigate = useNavigate();
  const location = useLocation();

  const currentSection = location.pathname.split('/').pop() as StudySection || 'parametrage';
  const basePath = `/app/empreinte-produit/etude/${studyId}`;
  const isLocked = study?.status === 'locked';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Étude non trouvée</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/empreinte-produit')}>
          Retour
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[study.status] || STATUS_LABELS.draft;

  return (
    <div className="flex min-h-[calc(100vh-120px)]">
      {/* Sidebar navigation */}
      <aside className="w-56 border-r border-border bg-muted/20 p-3 space-y-1 flex-shrink-0">
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start gap-2 mb-3 text-muted-foreground"
          onClick={() => navigate('/app/empreinte-produit')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Button>

        <div className="px-2 pb-3 border-b border-border mb-3">
          <p className="font-semibold text-foreground text-sm truncate">{study.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
            {isLocked && <Lock className="w-3 h-3 text-amber-500" />}
          </div>
        </div>

        {STUDY_SECTIONS.map((section, idx) => {
          const Icon = SECTION_ICONS[section.id];
          const isActive = currentSection === section.id;

          if (section.id === 'utilisation' && study.perimeter_type === 'cradle-to-gate') return null;
          if (section.id === 'fin-de-vie' && study.perimeter_type === 'cradle-to-gate') return null;
          if (section.id === 'distribution' && study.perimeter_type === 'cradle-to-gate') return null;

          return (
            <button
              key={section.id}
              onClick={() => navigate(`${basePath}/${section.id}`)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                isActive
                  ? 'bg-[hsl(var(--carbon-impact))]/10 text-[hsl(var(--carbon-impact))] font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-muted/50">
                {idx + 1}
              </span>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{section.label}</span>
              {section.optional && <span className="text-[9px] text-muted-foreground ml-auto">opt.</span>}
            </button>
          );
        })}
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        <React.Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <Routes>
            <Route index element={<Navigate to="parametrage" replace />} />
            <Route path="parametrage" element={<PCFParametrage study={study} />} />
            <Route path="bom" element={<PCFBillOfMaterials studyId={study.id} locked={isLocked} studyMode={study.study_mode} />} />
            <Route path="transport" element={<PCFTransport studyId={study.id} locked={isLocked} studyMode={study.study_mode} />} />
            <Route path="fabrication" element={<PCFManufacturing studyId={study.id} locked={isLocked} studyMode={study.study_mode} />} />
            <Route path="sous-traitance" element={<PCFSubcontracting studyId={study.id} locked={isLocked} />} />
            <Route path="coproduits" element={<PCFCoProducts studyId={study.id} locked={isLocked} />} />
            <Route path="donnees-collect" element={<PCFCollectData studyId={study.id} locked={isLocked} />} />
            <Route path="dechets" element={<PCFWastes studyId={study.id} locked={isLocked} studyMode={study.study_mode} />} />
            <Route path="emballage" element={<PCFPackaging studyId={study.id} locked={isLocked} studyMode={study.study_mode} />} />
            <Route path="distribution" element={<PCFDistribution studyId={study.id} locked={isLocked} />} />
            <Route path="utilisation" element={<PCFUsage studyId={study.id} locked={isLocked} />} />
            <Route path="fin-de-vie" element={<PCFEndOfLife studyId={study.id} locked={isLocked} studyMode={study.study_mode} />} />
            <Route path="resultats" element={<PCFResults studyId={study.id} study={study} />} />
            <Route path="rapport" element={<PCFReportSection studyId={study.id} study={study} />} />
          </Routes>
        </React.Suspense>
      </main>
    </div>
  );
};

export default PCFStudyDetail;
