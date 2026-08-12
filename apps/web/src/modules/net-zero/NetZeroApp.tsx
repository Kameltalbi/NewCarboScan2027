// Application principale du module Feuille de route climat

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ModuleLayout } from '../shared/ModuleLayout';
import { Loader2, LayoutDashboard, Target, TrendingDown, Sliders, GitCompare, Activity, FileText } from 'lucide-react';
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";
import { NetZeroOverview } from './components/NetZeroOverview';
import { NetZeroReference } from './components/NetZeroReference';
import { NetZeroObjectives } from './components/NetZeroObjectives';
import { NetZeroTrajectoryChart } from './components/NetZeroTrajectoryChart';
import { NetZeroLevers } from './components/NetZeroLevers';
import { NetZeroMACCPage } from './components/NetZeroMACCPage';
import { NetZeroScenarios } from './components/NetZeroScenarios';
import { NetZeroTracking } from './components/NetZeroTracking';
import { NetZeroReporting } from './components/NetZeroReporting';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const NetZeroDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Feuille de route climat</h1>
        <p className="text-muted-foreground mt-1">Alignée avec les recommandations SBTi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('overview')}>
          <h3 className="text-xl font-semibold mb-2">Vue d'ensemble</h3>
          <p className="text-muted-foreground text-sm">
            Consultez votre feuille de route et suivez votre progression
          </p>
        </div>

        <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('reference')}>
          <h3 className="text-xl font-semibold mb-2">Périmètre & référence</h3>
          <p className="text-muted-foreground text-sm">
            Configurez votre année de référence et les scopes inclus
          </p>
        </div>
      </div>
    </div>
  );
};

const navItems: NavItem[] = [
  { label: 'Vue d\'ensemble', path: '/overview', icon: LayoutDashboard },
  { label: 'Périmètre', path: '/reference', icon: Target },
  { label: 'Objectifs', path: '/objectives', icon: TrendingDown },
  { label: 'Trajectoire', path: '/trajectory', icon: Activity },
  { label: 'Leviers', path: '/levers', icon: Sliders },
  { label: 'Scénarios', path: '/scenarios', icon: GitCompare },
  { label: 'Suivi', path: '/tracking', icon: Activity },
  { label: 'Reporting', path: '/reporting', icon: FileText },
];

export const NetZeroApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="decarbotech">
      <HorizontalNav items={navItems} basePath="/app/decarbotech/trajectoire" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<NetZeroDashboard />} />
          <Route path="overview" element={<NetZeroOverview />} />
          <Route path="reference" element={<NetZeroReference />} />
          <Route path="objectives" element={<NetZeroObjectives />} />
          <Route path="trajectory" element={<NetZeroTrajectoryChart />} />
          <Route path="levers" element={<NetZeroLevers />} />
          <Route path="macc" element={<NetZeroMACCPage />} />
          <Route path="scenarios" element={<NetZeroScenarios />} />
          <Route path="tracking" element={<NetZeroTracking />} />
          <Route path="reporting" element={<NetZeroReporting />} />
          <Route path="*" element={<Navigate to="/app/decarbotech/trajectoire" replace />} />
        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};

