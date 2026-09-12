import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ModuleLayout } from '@/modules/shared/ModuleLayout';
import { Loader2, Plus, Settings, BarChart3, FileText, Download, Home, FolderPlus, Database, Layers, GitCompare, Target, Sliders, TrendingDown, Calculator, ShieldCheck } from 'lucide-react';
import { ModuleProtectedRoute } from '@/components/ModuleProtectedRoute';
import { HorizontalNav, NavItem } from '@/components/layout/HorizontalNav';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Dashboard route - Page unique
const DashboardOverview = lazy(() => import('@/app/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })));

// Collecte routes
const CollecteNouvelle = lazy(() => import('@/app/collecte/CollecteNouvelle').then(m => ({ default: m.CollecteNouvelle })));
const CollecteEnCours = lazy(() => import('@/app/collecte/CollecteEnCours').then(m => ({ default: m.CollecteEnCours })));
const CollecteValidees = lazy(() => import('@/app/collecte/CollecteValidees').then(m => ({ default: m.CollecteValidees })));
const CollecteImport = lazy(() => import('@/app/collecte/CollecteImport').then(m => ({ default: m.CollecteImport })));

// Bilan Carbone routes
const BilanCarboneHome = lazy(() => import('@/modules/bilan-carbone/BilanCarboneHome').then(m => ({ default: m.BilanCarboneHome })));
const BilanOverview = lazy(() => import('@/app/bilan-carbone/BilanOverview').then(m => ({ default: m.BilanOverview })));
const BilanHistorique = lazy(() => import('@/app/bilan-carbone/BilanHistorique').then(m => ({ default: m.BilanHistorique })));
const BilanScopes = lazy(() => import('@/app/bilan-carbone/BilanScopes').then(m => ({ default: m.BilanScopes })));
const BilanPostes = lazy(() => import('@/app/bilan-carbone/BilanPostes').then(m => ({ default: m.BilanPostes })));
const BilanHotspots = lazy(() => import('@/app/bilan-carbone/BilanHotspots').then(m => ({ default: m.BilanHotspots })));
const BilanRapports = lazy(() => import('@/app/bilan-carbone/BilanRapports').then(m => ({ default: m.BilanRapports })));
const BilanTracabilite = lazy(() => import('@/modules/bilan-carbone/BilanTracabilite').then(m => ({ default: m.BilanTracabilite })));
const CoreProofWorkspace = lazy(() => import('@/modules/bilan-carbone/CoreProofWorkspace').then(m => ({ default: m.CoreProofWorkspace })));

// Empreinte Produit routes
const PCFDashboard = lazy(() => import('@/modules/empreinte-produit/pages/PCFDashboard'));
const ProduitListe = lazy(() => import('@/app/empreinte-produit/ProduitListe').then(m => ({ default: m.ProduitListe })));
const ProduitDetail = lazy(() => import('@/app/empreinte-produit/ProduitDetail').then(m => ({ default: m.ProduitDetail })));
const ProduitScenarios = lazy(() => import('@/app/empreinte-produit/ProduitScenarios').then(m => ({ default: m.ProduitScenarios })));
const ProduitRapports = lazy(() => import('@/app/empreinte-produit/ProduitRapports').then(m => ({ default: m.ProduitRapports })));
const ProductWizard = lazy(() => import('@/modules/empreinte-produit/components/ProductWizard').then(m => ({ default: m.ProductWizard })));

// ACV routes - utilisation du nouveau ACVHome opérationnel
const ACVHome = lazy(() => import('@/modules/acv/ACVHome').then(m => ({ default: m.ACVHome })));
const ACVModeles = lazy(() => import('@/app/acv/ACVModeles').then(m => ({ default: m.ACVModeles })));
const ACVImpacts = lazy(() => import('@/app/acv/ACVImpacts').then(m => ({ default: m.ACVImpacts })));
const ACVPhases = lazy(() => import('@/app/acv/ACVPhases').then(m => ({ default: m.ACVPhases })));
const ACVScenarios = lazy(() => import('@/app/acv/ACVScenarios').then(m => ({ default: m.ACVScenarios })));
const ACVRapports = lazy(() => import('@/app/acv/ACVRapports').then(m => ({ default: m.ACVRapports })));
const ACVProjectForm = lazy(() => import('@/pages/ACVProjectForm'));
const ACVInventory = lazy(() => import('@/pages/ACVInventory'));
const ACVResults = lazy(() => import('@/pages/ACVResults'));
const ACVInterpretation = lazy(() => import('@/pages/ACVInterpretation'));
const ACVComparison = lazy(() => import('@/pages/ACVComparison'));
const ACVExport = lazy(() => import('@/pages/ACVExport'));

// Climate Roadmap module (replaces old Net Zero)
const ClimateRoadmapModule = lazy(() => import('@/modules/climate-roadmap/ClimateRoadmapModule').then(m => ({ default: m.ClimateRoadmapModule })));

// Scenarios module
const ScenariosModule = lazy(() => import('@/modules/scenarios/ScenariosModule').then(m => ({ default: m.ScenariosModule })));


// Paramètres routes
const ParametresApp = lazy(() => import('@/app/parametres/ParametresApp').then(m => ({ default: m.ParametresApp })));
const EmissionFactorCatalogPage = lazy(() => import('@/app/emission-factors/EmissionFactorCatalogPage'));

// Module apps
const CollectApp = lazy(() => import('@/modules/collect/CollectApp').then(m => ({ default: m.default })));
const FournisseursApp = lazy(() => import('@/modules/fournisseurs/FournisseursApp').then(m => ({ default: m.default })));
const WattBimApp = lazy(() => import('@/modules/wattbim/WattBimApp').then(m => ({ default: m.default })));

// Navigation items for Bilan Carbone module (Version professionnelle)
const bilanCarboneNavItems: NavItem[] = [
  { label: 'Vue d\'ensemble', path: '', icon: Home },
  { label: 'Preuve', path: '/preuve', icon: ShieldCheck },
  { label: 'Traçabilité', path: '/tracabilite', icon: Calculator },
  { label: 'Rapports', path: '/rapports', icon: BarChart3 },
];

// Navigation items for ACV module
const acvNavItems: NavItem[] = [
  { label: 'Accueil', path: '', icon: Home },
  { label: 'Nouvelle étude', path: '/nouveau-projet', icon: FolderPlus },
  { label: 'Mes études', path: '/projets', icon: Database },
  { label: 'Multi-impacts', path: '/impacts', icon: Layers },
  { label: 'Scénarios', path: '/scenarios', icon: GitCompare },
  { label: 'Rapports', path: '/rapports', icon: FileText },
];

// Navigation items for Empreinte Produit module
const empreinteProduitNavItems: NavItem[] = [
  { label: 'Accueil', path: '', icon: Home },
  { label: 'Mes produits', path: '/produits', icon: Database },
  { label: 'Nouveau calcul', path: '/nouveau', icon: FolderPlus },
  { label: 'Scénarios', path: '/scenarios', icon: GitCompare },
  { label: 'Rapports', path: '/rapports', icon: FileText },
];


const RedirectCollectToCollecte: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/app/collecte${location.search}`} replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="collect/*" element={<RedirectCollectToCollecte />} />
      {/* Dashboard - Page unique sans sous-pages */}
      <Route path="dashboard" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="bilan-carbone">
              <DashboardOverview />
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Collecte de données - Use CollectApp which includes HorizontalNav */}
      <Route path="collecte/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <CollectApp />
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Bilan Carbone */}
      <Route path="bilan-carbone/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="bilan-carbone">
              <HorizontalNav items={bilanCarboneNavItems} basePath="/app/bilan-carbone" />
              <Routes>
                <Route index element={<BilanCarboneHome />} />
                <Route path="nouveau" element={<BilanOverview />} />
                <Route path="overview" element={<Navigate to="" replace />} />
                <Route path="resultats" element={<BilanScopes />} />
                <Route path="bilans" element={<BilanHistorique />} />
                <Route path="tracabilite" element={<BilanTracabilite />} />
                <Route path="preuve" element={<CoreProofWorkspace />} />
                <Route path="rapports" element={<BilanRapports />} />
                <Route path="parametres" element={<BilanPostes />} />
                {/* Legacy routes - redirect to new structure */}
                <Route path="scopes" element={<Navigate to="resultats" replace />} />
                <Route path="postes" element={<Navigate to="parametres" replace />} />
                <Route path="hotspots" element={<BilanHotspots />} />
                <Route path="dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="questionnaire" element={<Navigate to="/app/collecte/nouvelle?mode=bilan-carbone" replace />} />
                <Route path="questionnaire/:sessionId" element={<Navigate to="/app/collecte/nouvelle?mode=bilan-carbone" replace />} />
                <Route path="*" element={<Navigate to="" replace />} />
              </Routes>
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Empreinte Produit - avec menu horizontal */}
      <Route path="empreinte-produit/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="empreinte-produit">
              <HorizontalNav items={empreinteProduitNavItems} basePath="/app/empreinte-produit" />
              <Routes>
                <Route index element={<PCFDashboard />} />
                <Route path="nouveau" element={<ProductWizard />} />
                <Route path="produits" element={<ProduitListe />} />
                <Route path="detail/:productId?" element={<ProduitDetail />} />
                <Route path="scenarios" element={<ProduitScenarios />} />
                <Route path="rapports" element={<ProduitRapports />} />
                {/* Legacy routes */}
                <Route path="inventaire" element={<Navigate to="produits" replace />} />
                <Route path="calcul" element={<Navigate to="produits" replace />} />
                <Route path="comparaisons" element={<Navigate to="scenarios" replace />} />
                <Route path="historique" element={<Navigate to="produits" replace />} />
                <Route path="*" element={<Navigate to="" replace />} />
              </Routes>
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* ACV - avec menu horizontal et dashboard opérationnel */}
      <Route path="acv/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="acv">
              <HorizontalNav items={acvNavItems} basePath="/app/acv" />
              <Routes>
                {/* Dashboard principal opérationnel */}
                <Route index element={<ACVHome />} />
                
                {/* Création et édition de projet */}
                <Route path="nouveau-projet" element={<ACVProjectForm />} />
                <Route path="projet/:projectId" element={<ACVProjectForm />} />
                <Route path="projet/:projectId/modifier" element={<ACVProjectForm />} />
                
                {/* Workflow d'un projet */}
                <Route path="projet/:projectId/inventaire" element={<ACVInventory />} />
                <Route path="projet/:projectId/resultats" element={<ACVResults />} />
                <Route path="projet/:projectId/interpretation" element={<ACVInterpretation />} />
                <Route path="projet/:projectId/comparaison" element={<ACVComparison />} />
                <Route path="projet/:projectId/export" element={<ACVExport />} />
                
                {/* Vues globales */}
                <Route path="impacts" element={<ACVImpacts />} />
                <Route path="phases" element={<ACVPhases />} />
                <Route path="scenarios" element={<ACVScenarios />} />
                <Route path="rapports" element={<ACVRapports />} />
                
                {/* Liste des projets */}
                <Route path="projets" element={<ACVHome />} />
                
                {/* Legacy routes */}
                <Route path="modeles" element={<ACVHome />} />
                <Route path="nouveau" element={<Navigate to="/app/acv/nouveau-projet" replace />} />
                <Route path="*" element={<Navigate to="" replace />} />
              </Routes>
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Feuille de route climat */}
      <Route path="net-zero/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="decarbotech">
              <ClimateRoadmapModule />
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Modélisation de scénarios */}
      <Route path="scenarios/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="decarbotech">
              <ScenariosModule />
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />


      <Route path="fournisseurs/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <FournisseursApp />
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* WattBim — Pilotage énergétique */}
      <Route path="wattbim/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="wattbim">
              <WattBimApp />
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Reporting — redirigé vers Bilan Carbone > Rapports pour éviter la duplication */}
      <Route path="reporting/*" element={
        <ModuleProtectedRoute>
          <Navigate to="/app/bilan-carbone/rapports" replace />
        </ModuleProtectedRoute>
      } />


      {/* Catalogue FE registry (search + facets + detail) */}
      <Route path="emission-factors" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ModuleLayout moduleSlug="bilan-carbone">
              <EmissionFactorCatalogPage />
            </ModuleLayout>
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Paramètres - utilise ParametresApp avec son propre HorizontalNav */}
      <Route path="parametres/*" element={
        <ModuleProtectedRoute>
          <Suspense fallback={<LoadingFallback />}>
            <ParametresApp />
          </Suspense>
        </ModuleProtectedRoute>
      } />

      {/* Legacy redirects */}
      <Route path="decarbotech/*" element={<Navigate to="/app/net-zero" replace />} />
    </Routes>
  );
};

