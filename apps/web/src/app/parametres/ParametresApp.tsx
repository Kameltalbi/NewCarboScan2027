// Application Paramètres avec navigation horizontale - Centre de configuration CarboScan

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ModuleLayout } from '@/modules/shared/ModuleLayout';
import { Loader2, Building2, Users, Gauge, Layers, UserCircle, KeyRound } from 'lucide-react';
import { HorizontalNav, NavItem } from '@/components/layout/HorizontalNav';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Lazy load des composants
const ParametresOrganisationPro = React.lazy(() => import('./ParametresOrganisationPro').then(m => ({ default: m.ParametresOrganisationPro })));
const ParametresUtilisateurs = React.lazy(() => import('./ParametresUtilisateurs').then(m => ({ default: m.ParametresUtilisateurs })));
const ParametresSources = React.lazy(() => import('./ParametresSources').then(m => ({ default: m.ParametresSources })));
const ParametresEntites = React.lazy(() => import('./ParametresEntites').then(m => ({ default: m.ParametresEntites })));
const ParametresMonCompte = React.lazy(() => import('./ParametresMonCompte').then(m => ({ default: m.ParametresMonCompte })));
const ParametresApiKeys = React.lazy(() => import('./ParametresApiKeys').then(m => ({ default: m.ParametresApiKeys })));

const navItems: NavItem[] = [
  { label: 'Organisation', path: '', icon: Building2 },
  { label: 'Entités', path: '/entites', icon: Layers },
  { label: 'Utilisateurs', path: '/utilisateurs', icon: Users },
  { label: 'Facteurs d\'émission', path: '/facteurs-emission', icon: Gauge },
  { label: 'Clés API', path: '/api-keys', icon: KeyRound },
  { label: 'Mon compte', path: '/mon-compte', icon: UserCircle },
];


export const ParametresApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="parametres">
      <HorizontalNav items={navItems} basePath="/app/parametres" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<ParametresOrganisationPro />} />
          <Route path="organisation" element={<ParametresOrganisationPro />} />
          <Route path="entites" element={<ParametresEntites />} />
          <Route path="utilisateurs" element={<ParametresUtilisateurs />} />
          <Route path="facteurs-emission" element={<ParametresSources />} />
          <Route path="api-keys" element={<ParametresApiKeys />} />
          <Route path="mon-compte" element={<ParametresMonCompte />} />
          <Route path="*" element={<Navigate to="" replace />} />

        </Routes>
      </Suspense>
    </ModuleLayout>
  );
};
