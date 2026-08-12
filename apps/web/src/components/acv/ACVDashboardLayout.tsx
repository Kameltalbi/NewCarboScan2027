import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Plus, FileText, Calendar, Target, BarChart3, Settings, Zap, Package, Truck, Droplets, ChartBar, FileCheck, GitCompare, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useACVProjects } from '@/hooks/useACVProjects';
import { Skeleton } from '@/components/ui/skeleton';
import { ACVLayout } from '@/components/acv/ACVLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ACVDashboardLayout() {
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
      case 'dashboard':
        navigate('/acv');
        break;
    }
  };

  if (loading) {
    return (
      <ACVLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-80" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </ACVLayout>
    );
  }

  return (
    <ACVLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentProject ? currentProject.name : 'Analyse de Cycle de Vie (ACV)'}
            </h1>
            <p className="text-gray-600">
              {currentProject 
                ? `Unité fonctionnelle: ${currentProject.functional_unit}` 
                : 'Évaluez l\'impact environnemental de vos produits selon la norme ISO 14040/14044'
              }
            </p>
          </div>
          <Button 
            onClick={() => navigate('/acv/nouveau-projet')}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau projet ACV
          </Button>
        </div>
      </div>

      {/* Stats Cards - only show on main dashboard */}
      {getCurrentTab() === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total projets</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Terminés</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En cours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ce mois</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => {
                      const projectDate = new Date(p.created_at);
                      const now = new Date();
                      return projectDate.getMonth() === now.getMonth() && 
                             projectDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Navigation Tabs - show when in a project */}
      {projectId && currentProject && (
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/acv')}
              className="text-gray-600"
            >
              ← Retour au dashboard
            </Button>
            <div className="flex items-center gap-2">
              {getStatusBadge(currentProject.status)}
              <span className="text-sm text-gray-500">
                Créé le {new Date(currentProject.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
          
          <Tabs value={getCurrentTab()} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="projet" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Projet
              </TabsTrigger>
              <TabsTrigger value="inventaire" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Inventaire des flux
              </TabsTrigger>
              <TabsTrigger value="resultats" className="flex items-center gap-2">
                <ChartBar className="w-4 h-4" />
                Résultats
              </TabsTrigger>
              <TabsTrigger value="interpretation" className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Interprétation
              </TabsTrigger>
              <TabsTrigger value="comparaison" className="flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                Comparaison
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </ACVLayout>
  );
}