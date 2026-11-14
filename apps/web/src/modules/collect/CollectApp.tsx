import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2, Plus, FileSpreadsheet, List, ShieldCheck } from "lucide-react";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";

// Import direct des composants les plus utilisés pour éviter le lazy loading
import { ActivityDataCollector } from './components/ActivityDataCollector';
import { ScopeChoice } from './components/ScopeChoice';

// Lazy load des pages secondaires
const CollectSourcesPage = React.lazy(() => import('@/pages/collect/CollectSourcesPage'));
const ControleCalculs = React.lazy(() => import('./components/ControleCalculs').then(m => ({ default: m.ControleCalculs })));
const CollectPeriodicPage = React.lazy(() => import('@/pages/collect/CollectPeriodicPage'));
const ExcelImportTab = React.lazy(() => import('./components/ExcelImportTab').then(m => ({ default: m.ExcelImportTab })));
const CollectionChecklistPage = React.lazy(() => import('./pages/CollectionChecklistPage').then(m => ({ default: m.CollectionChecklistPage })));
const Scope3ConfigPage = React.lazy(() => import('@/pages/collect/Scope3ConfigPage'));
const ActivityDataListPage = React.lazy(() => import('./components/ActivityDataList').then(m => ({ default: m.ActivityDataList })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const navItems: NavItem[] = [
  { label: 'Nouvelle saisie', path: '/nouvelle', icon: Plus },
  { label: 'Importer', path: '/importer', icon: FileSpreadsheet },
  { label: 'Données collectées', path: '/donnees', icon: List },
  { label: 'Contrôle', path: '/controle', icon: ShieldCheck },
];

const CollectApp: React.FC = () => {
  const location = useLocation();

  // Masquer le menu horizontal pour les sous-pages (comme config-scope3)
  const hideHorizontalNav = location.pathname.includes('/config-scope3');

  return (
    <ModuleLayout moduleSlug="collect">
      {!hideHorizontalNav && <HorizontalNav items={navItems} basePath="/app/collecte" />}
      <Routes>
        {/* Routes principales - chargement direct */}
        <Route index element={<Navigate to="/app/collecte/nouvelle" replace />} />
        <Route path="nouvelle" element={<ScopeChoice />} />
        <Route path="nouvelle/scope/:scope" element={<ActivityDataCollector />} />

        <Route path="donnees" element={
          <Suspense fallback={<LoadingFallback />}>
            <ActivityDataListPage />
          </Suspense>
        } />
        
        {/* Routes secondaires - lazy loading avec Suspense */}
        <Route path="config-scope3" element={
          <Suspense fallback={<LoadingFallback />}>
            <Scope3ConfigPage />
          </Suspense>
        } />
        <Route path="sources" element={
          <Suspense fallback={<LoadingFallback />}>
            <CollectSourcesPage />
          </Suspense>
        } />
        <Route path="importer" element={
          <Suspense fallback={<LoadingFallback />}>
            <ExcelImportTab />
          </Suspense>
        } />
        <Route path="controle" element={
          <Suspense fallback={<LoadingFallback />}>
            <ControleCalculs />
          </Suspense>
        } />
        <Route path="historique" element={
          <Suspense fallback={<LoadingFallback />}>
            <CollectPeriodicPage />
          </Suspense>
        } />
        <Route path="validation" element={
          <Suspense fallback={<LoadingFallback />}>
            <CollectionChecklistPage />
          </Suspense>
        } />
        
        {/* Legacy routes */}
        <Route path="activity-data" element={<Navigate to="/app/collecte/nouvelle" replace />} />
        <Route path="checklist" element={<Navigate to="/app/collecte/validation" replace />} />
        <Route path="consolidation" element={<Navigate to="/app/collecte/controle" replace />} />
        <Route path="periodic" element={<Navigate to="/app/collecte/historique" replace />} />
        <Route path="templates" element={<Navigate to="/app/collecte/importer" replace />} />
        <Route path="legacy" element={<Navigate to="/app/collecte/nouvelle" replace />} />
        <Route path="session/*" element={<Navigate to="/app/collecte/nouvelle" replace />} />
        <Route path="*" element={<Navigate to="/app/collecte/nouvelle" replace />} />
      </Routes>
    </ModuleLayout>
  );
};

export default CollectApp;
