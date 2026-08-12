import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2, LayoutDashboard, Factory, Package, ClipboardList, Ship, FileText, Calculator } from "lucide-react";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";

// Lazy load des pages CBAM
const CBAMDashboardPage = React.lazy(() => import('./pages/CBAMDashboardPage').then(m => ({ default: m.CBAMDashboardPage })));
const CBAMInstallationsPage = React.lazy(() => import('./pages/CBAMInstallationsPage').then(m => ({ default: m.CBAMInstallationsPage })));
const CBAMProductsPage = React.lazy(() => import('./pages/CBAMProductsPage').then(m => ({ default: m.CBAMProductsPage })));
const CBAMProductionPage = React.lazy(() => import('./pages/CBAMProductionPage').then(m => ({ default: m.CBAMProductionPage })));
const CBAMExportsPage = React.lazy(() => import('./pages/CBAMExportsPage').then(m => ({ default: m.CBAMExportsPage })));
const CBAMReportsPage = React.lazy(() => import('./pages/CBAMReportsPage').then(m => ({ default: m.CBAMReportsPage })));
const CBAMPage = React.lazy(() => import('./CBAMPage').then(m => ({ default: m.CBAMPage })));
const CBAMDeclarationsPage = React.lazy(() => import('./pages/CBAMDeclarationsPage').then(m => ({ default: m.CBAMDeclarationsPage })));

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'Installations', path: '/installations', icon: Factory },
  { label: 'Produits CBAM', path: '/produits', icon: Package },
  { label: 'Production', path: '/production', icon: ClipboardList },
  { label: 'Exportations', path: '/exportations', icon: Ship },
  { label: 'Calcul rapide', path: '/nouveau', icon: Calculator },
  { label: 'Déclarations', path: '/declarations', icon: FileText },
  { label: 'Rapports', path: '/rapports', icon: FileText },
];

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const CBAMApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="cbam">
      <HorizontalNav items={navItems} basePath="/app/cbam" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<CBAMDashboardPage />} />
          <Route path="installations" element={<CBAMInstallationsPage />} />
          <Route path="produits" element={<CBAMProductsPage />} />
          <Route path="production" element={<CBAMProductionPage />} />
          <Route path="exportations" element={<CBAMExportsPage />} />
          <Route path="nouveau" element={<CBAMPage />} />
          <Route path="declarations" element={<CBAMDeclarationsPage />} />
          <Route path="rapports" element={<CBAMReportsPage />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

export default CBAMApp;
