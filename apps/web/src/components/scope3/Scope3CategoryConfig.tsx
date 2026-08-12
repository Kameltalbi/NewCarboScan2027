/**
 * CONFIGURATION DES CATÉGORIES SCOPE 3
 * 
 * Interface permettant d'activer/désactiver les 15 catégories GHG Protocol
 * basée sur des questions métier simples
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, HelpCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  GHG_SCOPE3_CATEGORIES, 
  getUpstreamCategories, 
  getDownstreamCategories,
  type Scope3Category 
} from '@/lib/scope3/ghg-protocol-categories';
import { Scope3ActivationService } from '@/lib/scope3/activation-service';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const Scope3CategoryConfig: React.FC = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganizationData();
  const { toast } = useToast();
  
  const [activations, setActivations] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Charger l'état d'activation
  useEffect(() => {
    if (!organizationId) return;
    
    const loadActivations = async () => {
      try {
        const activationMap = await Scope3ActivationService.getActivationStatus(organizationId);
        const newMap = new Map<string, boolean>();
        
        GHG_SCOPE3_CATEGORIES.forEach(cat => {
          const activation = activationMap.get(cat.id);
          newMap.set(cat.id, activation?.is_active ?? cat.defaultActive);
        });
        
        setActivations(newMap);
        
        // Charger les stats
        const statsData = await Scope3ActivationService.getActivationStats(organizationId);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading Scope 3 activations:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les catégories Scope 3',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadActivations();
  }, [organizationId, toast]);

  const handleToggle = async (categoryId: string) => {
    if (!organizationId) return;
    
    const newValue = !activations.get(categoryId);
    
    // Mise à jour optimiste
    setActivations(prev => new Map(prev).set(categoryId, newValue));
    
    try {
      if (newValue) {
        await Scope3ActivationService.activate(
          organizationId,
          categoryId as any,
          'Activée par l\'utilisateur',
          'estimated'
        );
      } else {
        await Scope3ActivationService.deactivate(
          organizationId,
          categoryId as any,
          'Désactivée par l\'utilisateur'
        );
      }
      
      toast({
        title: newValue ? 'Catégorie activée' : 'Catégorie désactivée',
        description: `La catégorie a été ${newValue ? 'activée' : 'désactivée'} avec succès`,
      });
      
      // Recharger les stats
      const statsData = await Scope3ActivationService.getActivationStats(organizationId);
      setStats(statsData);
    } catch (error: any) {
      // Rollback en cas d'erreur
      setActivations(prev => new Map(prev).set(categoryId, !newValue));
      
      console.error('Error toggling category:', error);
      
      const errorMessage = error?.message || 'Erreur inconnue';
      const isTableMissing = errorMessage.includes('relation') || errorMessage.includes('does not exist');
      
      toast({
        title: 'Erreur',
        description: isTableMissing 
          ? 'La table Scope 3 n\'existe pas. Veuillez exécuter le script INSTALL_SCOPE3_QUICK.sql dans l\'éditeur SQL Supabase.'
          : `Impossible de modifier la catégorie : ${errorMessage}`,
        variant: 'destructive',
        duration: 10000, // 10 secondes pour avoir le temps de lire
      });
    }
  };

  const renderCategory = (category: Scope3Category) => {
    const isActive = activations.get(category.id) ?? false;
    const isAutoCalculated = category.isAutoCalculated;
    
    return (
      <div key={category.id} className="border rounded-lg p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-50 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* En-tête */}
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? 'default' : 'outline'} className="font-mono text-xs">
                Cat. {category.number}
              </Badge>
              {isAutoCalculated && (
                <Badge variant="secondary" className="text-xs">
                  Auto
                </Badge>
              )}
            </div>
            
            {/* Nom */}
            <h4 className="font-semibold text-sm">{category.name}</h4>
            
            {/* Description */}
            <p className="text-xs text-muted-foreground">{category.description}</p>
            
            {/* Question d'activation */}
            <div className="flex items-start gap-2 mt-2 p-2 bg-accent/20 rounded text-xs">
              <HelpCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{category.activationQuestion}</p>
                <p className="text-muted-foreground mt-1">{category.activationHint}</p>
              </div>
            </div>
          </div>
          
          {/* Toggle */}
          <div className="flex flex-col items-end gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={() => handleToggle(category.id)}
              disabled={loading}
            />
            <span className="text-xs text-muted-foreground">
              {isActive ? 'Activée' : 'Désactivée'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const upstreamCategories = getUpstreamCategories();
  const downstreamCategories = getDownstreamCategories();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold">Configuration Scope 3</h2>
        <p className="text-muted-foreground mt-1">
          Activez ou désactivez les 15 catégories du GHG Protocol selon votre activité
        </p>
      </div>

      {/* Statistiques */}
      {stats && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-6 text-sm">
            <span><strong>{stats.active}</strong> catégories actives</span>
            <span><strong>{stats.upstream}</strong> amont</span>
            <span><strong>{stats.downstream}</strong> aval</span>
            <span className="text-muted-foreground">|</span>
            <span><strong>{stats.measuredData}</strong> mesurées</span>
            <span><strong>{stats.estimatedData}</strong> estimées</span>
            <span><strong>{stats.missingData}</strong> sans données</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Catégories AMONT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Scope 3 Amont (Catégories 1 à 8)
          </CardTitle>
          <CardDescription>
            Émissions liées aux activités en amont de votre entreprise (fournisseurs, achats, transport, déplacements)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upstreamCategories.map(renderCategory)}
        </CardContent>
      </Card>

      {/* Catégories AVAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Scope 3 Aval (Catégories 9 à 15)
          </CardTitle>
          <CardDescription>
            Émissions liées aux activités en aval de votre entreprise (distribution, utilisation, fin de vie des produits)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {downstreamCategories.map(renderCategory)}
        </CardContent>
      </Card>
    </div>
  );
};
