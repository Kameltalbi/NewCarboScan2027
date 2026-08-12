import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2, Home, FolderPlus, Database, BookOpen, Boxes, Layers, BarChart3, GitCompare, FileText } from "lucide-react";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";

// Lazy load
const ACVHome = React.lazy(() => import('./ACVHome').then(m => ({ default: m.ACVHome })));
const ACVProjectForm = React.lazy(() => import('@/pages/ACVProjectForm'));
const ACVDashboard = React.lazy(() => import('@/pages/ACVDashboard'));

// Nouvelles pages Phase 3
const ACVBibliotheque = React.lazy(() => import('./pages/ACVBibliotheque').then(m => ({ default: m.ACVBibliotheque })));
const ACVModelisation = React.lazy(() => import('./pages/ACVModelisation').then(m => ({ default: m.ACVModelisation })));
const ACVCycleVie = React.lazy(() => import('./pages/ACVCycleVie').then(m => ({ default: m.ACVCycleVie })));
const ACVResultats = React.lazy(() => import('./pages/ACVResultats').then(m => ({ default: m.ACVResultats })));
const ACVScenariosPage = React.lazy(() => import('./pages/ACVScenariosPage').then(m => ({ default: m.ACVScenariosPage })));
const ACVRapportPage = React.lazy(() => import('./pages/ACVRapportPage').then(m => ({ default: m.ACVRapportPage })));

// Legacy pages (compatibilité)
const ACVInventory = React.lazy(() => import('@/pages/ACVInventory'));
const ACVResults = React.lazy(() => import('@/pages/ACVResults'));
const ACVInterpretation = React.lazy(() => import('@/pages/ACVInterpretation'));
const ACVComparison = React.lazy(() => import('@/pages/ACVComparison'));
const ACVExport = React.lazy(() => import('@/pages/ACVExport'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const navItems: NavItem[] = [
  { label: 'Accueil', path: '', icon: Home },
  { label: 'Nouveau projet', path: '/nouveau-projet', icon: FolderPlus },
  { label: 'Mes projets', path: '/projets', icon: Database },
  { label: 'Bibliothèque', path: '/bibliotheque', icon: BookOpen },
  { label: 'Modélisation', path: '/modelisation', icon: Boxes },
  { label: 'Cycle de vie', path: '/cycle-vie', icon: Layers },
  { label: 'Résultats', path: '/resultats', icon: BarChart3 },
  { label: 'Scénarios', path: '/scenarios', icon: GitCompare },
  { label: 'Rapport', path: '/rapport', icon: FileText },
];

const ACVApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="acv">
      <HorizontalNav items={navItems} basePath="/app/acv" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<ACVHome />} />
          <Route path="projets" element={<ACVDashboard />} />
          <Route path="nouveau-projet" element={<ACVProjectForm />} />

          {/* Nouvelles pages ISO */}
          <Route path="bibliotheque" element={<ACVBibliotheque />} />
          <Route path="modelisation" element={<ACVModelisation />} />
          <Route path="cycle-vie" element={<ACVCycleVie />} />
          <Route path="resultats" element={<ACVResultats />} />
          <Route path="scenarios" element={<ACVScenariosPage />} />
          <Route path="rapport" element={<ACVRapportPage />} />

          {/* Legacy projet-spécifique (compatibilité) */}
          <Route path="projet/:projectId/inventaire" element={<ACVInventory />} />
          <Route path="projet/:projectId/resultats" element={<ACVResults />} />
          <Route path="projet/:projectId/interpretation" element={<ACVInterpretation />} />
          <Route path="projet/:projectId/comparaison" element={<ACVComparison />} />
          <Route path="projet/:projectId/export" element={<ACVExport />} />

          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

export default ACVApp;
