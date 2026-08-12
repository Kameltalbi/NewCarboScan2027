import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { Loader2, Home, FileText, BarChart3, Calculator } from "lucide-react";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";

// Lazy load des composants
const BilanCarboneHome = React.lazy(() => import('./BilanCarboneHome').then(m => ({ default: m.BilanCarboneHome })));
const MesBilans = React.lazy(() => import('./MesBilans').then(m => ({ default: m.MesBilans })));
const CarboScanReports = React.lazy(() => import('./CarboScanReports').then(m => ({ default: m.CarboScanReports })));
const BilanTracabilite = React.lazy(() => import('./BilanTracabilite').then(m => ({ default: m.BilanTracabilite })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const navItems: NavItem[] = [
  { label: 'Vue d\'ensemble', path: '', icon: Home },
  { label: 'Traçabilité', path: '/tracabilite', icon: Calculator },
  { label: 'Rapports', path: '/rapports', icon: BarChart3 },
];

const BilanCarboneApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="bilan-carbone">
      <HorizontalNav items={navItems} basePath="/app/bilan-carbone" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<BilanCarboneHome />} />
          <Route path="bilans" element={<MesBilans />} />
          <Route path="tracabilite" element={<BilanTracabilite />} />
          <Route path="rapports" element={<CarboScanReports />} />
          {/* Redirections pour compatibilité */}
          <Route path="dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="nouveau" element={<Navigate to="/app/bilan-carbone" replace />} />
          <Route path="questionnaire" element={<Navigate to="/app/collecte" replace />} />
          <Route path="questionnaire/:sessionId" element={<Navigate to="/app/collecte" replace />} />
          <Route path="parametres" element={<Navigate to="/app/parametres" replace />} />
          <Route path="resultats" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

export default BilanCarboneApp;
