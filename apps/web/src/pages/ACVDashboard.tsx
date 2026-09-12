import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, Target, BarChart3, ChevronDown, ChevronUp, Droplets, Zap, Truck, Building2, Recycle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useACVProjects } from '@/hooks/useACVProjects';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/api/client";

export default function ACVDashboard() {
  const navigate = useNavigate();
  const { projects, loading, refetch } = useACVProjects();
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(projects.length === 0);
  const { toast } = useToast();

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

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    try {
      const { error } = await supabase
        .from('acv_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Projet supprimé",
        description: `Le projet "${projectName}" a été supprimé avec succès.`,
      });

      // Rafraîchir la liste des projets
      refetch();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Modern Header */}
      <div className="text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative py-16 px-8">
          <div className="inline-flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-[4px] mb-6">
            <span className="text-2xl">🌱</span>
            <span className="text-sm font-medium text-primary">ISO 14040/14044</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Analyse de Cycle de Vie
          </h1>
          <div className="text-xl text-muted-foreground max-w-4xl mx-auto space-y-6">
            <p className="leading-relaxed">
              Évaluez l'impact environnemental de vos produits et services selon les normes ISO 14040/14044, 
              en version simplifiée et adaptée aux PME et TPE.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-foreground mb-2">Résultats clairs</h3>
                <p className="text-sm text-muted-foreground">Analyses exploitables pour vos actions</p>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-foreground mb-2">Impact ciblé</h3>
                <p className="text-sm text-muted-foreground">Identifiez vos principaux postes</p>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-semibold text-foreground mb-2">Rapports ISO</h3>
                <p className="text-sm text-muted-foreground">Exports conformes aux standards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Methodology Section - Collapsible */}
      <Collapsible open={isMethodologyOpen} onOpenChange={setIsMethodologyOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full text-left p-0 h-auto hover:bg-transparent">
            <Card className="w-full hover:shadow-[var(--shadow-elevated)] transition-all duration-300 hover:border-primary/20 dashboard-card">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🔬</span>
                    </div>
                    <CardTitle className="text-xl">Notre approche méthodologique</CardTitle>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-full">
                    {isMethodologyOpen ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-primary" />}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-6 space-y-8">
          {/* Impact Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="dashboard-card group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🌍</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-foreground">Climat</h3>
                <div className="text-sm text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full inline-block mb-3">
                  kg CO₂e
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Empreinte carbone complète de vos activités et processus
                </p>
              </CardContent>
            </Card>
            <Card className="dashboard-card group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🌫️</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-foreground">Acidification</h3>
                <div className="text-sm text-orange-600 font-semibold bg-orange-100 px-3 py-1 rounded-full inline-block mb-3">
                  kg SO₂e
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Émissions contribuant à la pollution atmosphérique
                </p>
              </CardContent>
            </Card>
            <Card className="dashboard-card group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">💧</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-foreground">Ressource Eau</h3>
                <div className="text-sm text-blue-600 font-semibold bg-blue-100 px-3 py-1 rounded-full inline-block mb-3">
                  m³
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Consommation et pression sur les ressources hydriques
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Covered Categories */}
          <Card className="dashboard-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
                <CardTitle className="text-xl">Postes d'impact analysés</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl">
                <div className="w-10 h-10 bg-yellow-200 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800">Énergie</h4>
                  <p className="text-xs text-yellow-700">Électricité, carburants, gaz, GPL</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800">Transports</h4>
                  <p className="text-xs text-blue-700">Voiture, camion, avion, bateau</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Matériaux</h4>
                  <p className="text-xs text-gray-700">Ciment, acier, aluminium, plastique</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                <div className="w-10 h-10 bg-green-200 rounded-xl flex items-center justify-center">
                  <Recycle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">Déchets</h4>
                  <p className="text-xs text-green-700">Enfouissement, incinération, recyclage</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-xl">
                <div className="w-10 h-10 bg-cyan-200 rounded-xl flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-cyan-800">Eau</h4>
                  <p className="text-xs text-cyan-700">Eau potable et industrielle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Projects Section Header */}
      {projects.length > 0 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-card via-card to-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Mes projets ACV</h2>
            <p className="text-muted-foreground">Gérez et suivez vos analyses de cycle de vie</p>
          </div>
          <Button 
            onClick={() => navigate('/app/acv/nouveau-projet')}
            className="bg-primary hover:bg-primary/90 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] transition-all duration-300"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau projet
          </Button>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.length === 0 ? (
          <div className="col-span-full">
            <Card className="dashboard-card-elevated text-center py-20">
              <CardContent className="space-y-6">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl flex items-center justify-center mx-auto">
                  <FileText className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Commencez votre première ACV
                  </h3>
                  <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                    Créez votre premier projet d'analyse de cycle de vie et découvrez l'impact environnemental de vos activités
                  </p>
                  <Button 
                    onClick={() => navigate('/app/acv/nouveau-projet')}
                    className="bg-primary hover:bg-primary/90 shadow-[var(--shadow-elevated)] hover:scale-105 transition-all duration-300"
                    size="lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Créer mon premier projet ACV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="dashboard-card-elevated group hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                        {project.name}
                      </CardTitle>
                      <div className="mt-2">
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => navigate(`/app/acv/projet/${project.id}/modifier`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer le projet "{project.name}" ? 
                              Cette action est irréversible et toutes les données associées seront perdues.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2 mt-3 text-base">
                  {project.description || 'Aucune description'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-sm font-semibold text-foreground mb-1">Unité fonctionnelle</p>
                    <p className="text-sm text-muted-foreground">{project.functional_unit}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/app/acv/projet/${project.id}`)}
                    className="hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Ouvrir
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/app/acv/projet/${project.id}/resultats`)}
                    className="hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Résultats
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/app/acv/projet/${project.id}/modifier`)}
                    className="hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}