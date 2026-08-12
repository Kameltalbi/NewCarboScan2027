import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MainHeader } from '@/components/MainHeader';
import { NewFooter } from '@/components/NewFooter';
import { Plus, FileText, Calendar, Target, BarChart3, Settings, Zap, Package, Truck, Droplets, ChartBar, FileCheck, GitCompare, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useACVProjects } from '@/hooks/useACVProjects';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ACVPublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, loading } = useACVProjects();

  // Extract project ID from URL if present
  const projectId = location.pathname.match(/\/acv\/projet\/([^/]+)/)?.[1];
  const currentProject = projects.find(p => p.id === projectId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'archived':
        return <Badge variant="outline">Archivé</Badge>;
      default:
        return <Badge variant="secondary">Brouillon</Badge>;
    }
  };

  const getCurrentTab = () => {
    if (location.pathname.includes('/inventaire')) return 'inventaire';
    if (location.pathname.includes('/resultats')) return 'resultats';
    if (location.pathname.includes('/interpretation')) return 'interpretation';
    if (location.pathname.includes('/comparaison')) return 'comparaison';
    if (location.pathname.includes('/export')) return 'export';
    if (location.pathname.includes('/nouveau-projet') || location.pathname.match(/\/projet\/[^/]+$/)) return 'projet';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    if (!projectId) return;
    
    switch (value) {
      case 'projet':
        navigate(`/acv/projet/${projectId}`);
        break;
      case 'inventaire':
        navigate(`/acv/projet/${projectId}/inventaire`);
        break;
      case 'resultats':
        navigate(`/acv/projet/${projectId}/resultats`);
        break;
      case 'interpretation':
        navigate(`/acv/projet/${projectId}/interpretation`);
        break;
      case 'comparaison':
        navigate(`/acv/projet/${projectId}/comparaison`);
        break;
      case 'export':
        navigate(`/acv/projet/${projectId}/export`);
        break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <MainHeader />
      
      <main className="flex-1">
        {/* ACV Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Analyse de Cycle de Vie (ACV)
                </h1>
                <p className="text-sm sm:text-lg text-gray-600">
                  Évaluez l'impact environnemental de vos produits selon la norme ISO 14040/14044
                </p>
              </div>
              <Button 
                onClick={() => navigate('/acv/nouveau-projet')}
                className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau projet ACV
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Only show when in a project */}
        {projectId && (
          <div className="bg-white border-b">
            <div className="container mx-auto px-6">
              <Tabs value={getCurrentTab()} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
                  <TabsTrigger value="projet" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Projet
                  </TabsTrigger>
                  <TabsTrigger value="inventaire" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventaire
                  </TabsTrigger>
                  <TabsTrigger value="resultats" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Résultats
                  </TabsTrigger>
                  <TabsTrigger value="interpretation" className="flex items-center gap-2">
                    <ChartBar className="h-4 w-4" />
                    Interprétation
                  </TabsTrigger>
                  <TabsTrigger value="comparaison" className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4" />
                    Comparaison
                  </TabsTrigger>
                  <TabsTrigger value="export" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>

      <NewFooter />
    </div>
  );
}
