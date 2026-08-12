// Page : Checklist de collecte pour bilan auditable

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionProgress } from '@/components/collection/CollectionProgress';
import { CollectionChecklist } from '@/components/collection/CollectionChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, ArrowRight, RefreshCw } from 'lucide-react';
import { CollectionChecklistService } from '@/lib/services/CollectionChecklistService';
import type { CollectionProgress as CollectionProgressType, ChecklistItem } from '@/lib/types/collection-checklist';
import { useOrganizationId } from '@/hooks/useOrganizationId';

export const CollectionChecklistPage = () => {
  const navigate = useNavigate();
  const { organizationId, loading: orgLoading } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<CollectionProgressType | null>(null);
  const [missingPostes, setMissingPostes] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (organizationId && !orgLoading) {
      loadData();
    }
  }, [organizationId, orgLoading]);

  const loadData = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const [progressData, missing] = await Promise.all([
        CollectionChecklistService.getProgress(organizationId),
        CollectionChecklistService.getMissingMandatoryPostes(organizationId)
      ]);
      
      setProgress(progressData);
      setMissingPostes(missing);
    } catch (error) {
      console.error('Error loading checklist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: ChecklistItem) => {
    // Rediriger vers la page de collecte appropriée
    navigate(`/collect/activity-data?poste=${item.poste_code}`);
  };

  const handleInitializeChecklist = async () => {
    if (!organizationId) return;

    try {
      await CollectionChecklistService.initializeChecklist(organizationId);
      await loadData();
    } catch (error) {
      console.error('Error initializing checklist:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Checklist non initialisée</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              La checklist de collecte n'a pas encore été initialisée pour votre organisation.
            </p>
            <Button onClick={handleInitializeChecklist}>
              Initialiser la checklist
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          🎯 Guide de collecte pour bilan audit-ready
        </h1>
        <p className="text-muted-foreground">
          Suivez cette checklist pour collecter toutes les données nécessaires 
          à un bilan carbone certifiable par un organisme tiers.
        </p>
      </div>

      {/* Message d'information */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Comment utiliser cette checklist ?</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>Les postes marqués <strong>"Obligatoire"</strong> sont requis pour un bilan certifiable</li>
            <li>Cliquez sur "Comment collecter ces données ?" pour voir un guide détaillé</li>
            <li>Utilisez le bouton "Ajouter ces données" pour saisir vos informations</li>
            <li>La progression se met à jour automatiquement</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Colonne gauche : Progression */}
        <div className="lg:col-span-1 space-y-6">
          <CollectionProgress progress={progress} />

          {/* Postes manquants obligatoires */}
          {missingPostes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  ⚠️ Postes obligatoires manquants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {missingPostes.map((poste) => (
                    <li key={poste.id} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <div>
                        <p className="font-medium">{poste.poste_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Scope {poste.scope}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/collect/activity-data')}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Collecter des données
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={loadData}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser la progression
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : Checklist complète */}
        <div className="lg:col-span-2">
          <CollectionChecklist 
            organizationId={organizationId ?? ''}
            onItemClick={handleItemClick}
          />
        </div>
      </div>
    </div>
  );
};
