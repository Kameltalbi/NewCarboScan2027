import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2, Home, Plus, Package, GitCompare, FileText } from "lucide-react";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Lazy load pages
const PCFDashboard = React.lazy(() => import('./pages/PCFDashboard'));
const PCFNewStudy = React.lazy(() => import('./pages/PCFNewStudy'));
const PCFStudyDetail = React.lazy(() => import('./pages/PCFStudyDetail'));
const PCFScenarios = React.lazy(() => import('./pages/PCFScenarios'));
const PCFReports = React.lazy(() => import('./pages/PCFReports'));

const navItems: NavItem[] = [
  { label: 'Accueil', path: '', icon: Home },
  { label: 'Nouvelle étude', path: '/nouveau', icon: Plus },
  { label: 'Mes études', path: '/etudes', icon: Package },
  { label: 'Scénarios', path: '/scenarios', icon: GitCompare },
  { label: 'Rapports', path: '/rapports', icon: FileText },
];

const EmpreinteProduitApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="empreinte-produit">
      <HorizontalNav items={navItems} basePath="/app/empreinte-produit" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<PCFDashboard />} />
          <Route path="nouveau" element={<PCFNewStudy />} />
          <Route path="etudes" element={<PCFDashboard />} />
          <Route path="etude/:studyId/*" element={<PCFStudyDetail />} />
          <Route path="scenarios" element={<PCFScenarios />} />
          <Route path="rapports" element={<PCFReports />} />
          {/* Legacy redirects */}
          <Route path="produits" element={<Navigate to="/app/empreinte-produit/etudes" replace />} />
          <Route path="historique" element={<Navigate to="/app/empreinte-produit" replace />} />
          <Route path="benchmarks" element={<Navigate to="/app/empreinte-produit" replace />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

export default EmpreinteProduitApp;
