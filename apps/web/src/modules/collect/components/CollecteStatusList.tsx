// Composant pour lister les collectes par statut (en cours, validées)
// Basé sur activity_data groupé par période

import React, { useState, useEffect } from 'react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { ActivityData } from '@/lib/activity-data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CollectePeriod {
  periodStart: string;
  periodEnd: string;
  year: number;
  totalActivities: number;
  validatedActivities: number; // data_quality = 'real'
  estimatedActivities: number; // data_quality = 'estimated'
  status: 'draft' | 'in_progress' | 'completed' | 'validated';
  lastActivityDate: string;
}

interface CollecteStatusListProps {
  status: 'in_progress' | 'validated';
}

export const CollecteStatusList: React.FC<CollecteStatusListProps> = ({ status }) => {
  const { organizationId } = useOrganizationId();
  const navigate = useNavigate();
  const [collectes, setCollectes] = useState<CollectePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollectes();
  }, [organizationId, status]);

  const loadCollectes = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      // Récupérer toutes les données de l'organisation
      const allActivities = await ActivityDataService.list({
        organization_id: organizationId,
      });

      // Grouper par période (année)
      const periodsMap = new Map<string, ActivityData[]>();

      allActivities.forEach((activity) => {
        const year = new Date(activity.period_start).getFullYear();
        const periodKey = `${year}`;
        
        if (!periodsMap.has(periodKey)) {
          periodsMap.set(periodKey, []);
        }
        periodsMap.get(periodKey)!.push(activity);
      });

      // Convertir en CollectePeriod
      const collectesList: CollectePeriod[] = Array.from(periodsMap.entries()).map(([yearStr, activities]) => {
        const year = parseInt(yearStr);
        const periodStart = `${year}-01-01`;
        const periodEnd = `${year}-12-31`;

        const validatedCount = activities.filter(a => a.data_quality === 'real').length;
        const estimatedCount = activities.filter(a => a.data_quality === 'estimated').length;
        const totalCount = activities.length;

        // Déterminer le statut
        let collecteStatus: 'draft' | 'in_progress' | 'completed' | 'validated';
        if (validatedCount === totalCount && totalCount > 0) {
          collecteStatus = 'validated';
        } else if (validatedCount > 0 || estimatedCount > 0) {
          collecteStatus = 'in_progress';
        } else {
          collecteStatus = 'draft';
        }

        // Dernière activité
        const lastActivity = activities.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          periodStart,
          periodEnd,
          year,
          totalActivities: totalCount,
          validatedActivities: validatedCount,
          estimatedActivities: estimatedCount,
          status: collecteStatus,
          lastActivityDate: lastActivity?.created_at || new Date().toISOString(),
        };
      });

      // Filtrer selon le statut demandé
      const filtered = collectesList.filter(c => {
        if (status === 'in_progress') {
          return c.status === 'in_progress' || c.status === 'draft';
        } else {
          return c.status === 'validated';
        }
      });

      // Trier par année décroissante
      filtered.sort((a, b) => b.year - a.year);

      setCollectes(filtered);
    } catch (error) {
      console.error('Erreur lors du chargement des collectes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (collecteStatus: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      draft: 'outline',
      in_progress: 'secondary',
      completed: 'default',
      validated: 'default',
    };
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      in_progress: 'En cours',
      completed: 'Complétée',
      validated: 'Validée',
    };
    return <Badge variant={variants[collecteStatus] || 'outline'}>{labels[collecteStatus] || collecteStatus}</Badge>;
  };

  const getProgressPercentage = (collecte: CollectePeriod) => {
    if (collecte.totalActivities === 0) return 0;
    // Considérer qu'une collecte est complète si au moins 80% des données sont validées
    return Math.round((collecte.validatedActivities / collecte.totalActivities) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (collectes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {status === 'in_progress' 
              ? 'Aucune collecte en cours pour le moment.'
              : 'Aucune collecte validée pour le moment.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {collectes.map((collecte) => (
        <Card key={collecte.year} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Collecte {collecte.year}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(collecte.periodStart)} - {formatDate(collecte.periodEnd)}
                  </p>
                </div>
              </div>
              {getStatusBadge(collecte.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Statistiques */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total données</p>
                  <p className="text-2xl font-bold">{collecte.totalActivities}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Validées</p>
                  <p className="text-2xl font-bold text-green-600">{collecte.validatedActivities}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimées</p>
                  <p className="text-2xl font-bold text-yellow-600">{collecte.estimatedActivities}</p>
                </div>
              </div>

              {/* Barre de progression */}
              {status === 'in_progress' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">{getProgressPercentage(collecte)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${getProgressPercentage(collecte)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dernière activité */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Dernière activité : {formatDate(collecte.lastActivityDate)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/app/collecte/nouvelle?year=${collecte.year}`);
                  }}
                >
                  Voir les données
                </Button>
                {status === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      navigate(`/app/collecte/nouvelle?year=${collecte.year}`);
                    }}
                  >
                    Continuer
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
