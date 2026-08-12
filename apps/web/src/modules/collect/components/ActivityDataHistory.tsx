// Composant pour afficher l'historique des modifications d'une donnée d'activité

import React, { useState, useEffect } from 'react';
import { ActivityDataHistoryService, ActivityDataHistory } from '@/lib/activity-data/ActivityDataHistoryService';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, User, Calendar, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityDataHistoryProps {
  activityId: string;
}

export const ActivityDataHistoryComponent: React.FC<ActivityDataHistoryProps> = ({ activityId }) => {
  const { organizationId } = useOrganizationId();
  const [history, setHistory] = useState<ActivityDataHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [activityId, organizationId]);

  const loadHistory = async () => {
    if (!organizationId || !activityId) return;

    setLoading(true);
    try {
      const data = await ActivityDataHistoryService.getHistoryForActivity(activityId, organizationId);
      setHistory(data);
    } catch (error: any) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      created: 'default',
      updated: 'secondary',
      deleted: 'destructive',
    };
    const labels: Record<string, string> = {
      created: 'Créé',
      updated: 'Modifié',
      deleted: 'Supprimé',
    };
    return <Badge variant={variants[action] || 'default'}>{labels[action] || action}</Badge>;
  };

  const getChangedFieldsDisplay = (fields: string[] | null) => {
    if (!fields || fields.length === 0) return 'Aucun champ spécifique';
    if (fields.length <= 3) return fields.join(', ');
    return `${fields.slice(0, 3).join(', ')} et ${fields.length - 3} autre(s)`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des modifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des modifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Aucun historique disponible pour cette donnée.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des modifications
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {history.length} modification{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Champs modifiés</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(entry.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(entry.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{getChangedFieldsDisplay(entry.changed_fields)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {entry.changed_by ? entry.changed_by.substring(0, 8) + '...' : 'Système'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.change_reason && (
                      <span className="text-xs text-muted-foreground italic">
                        {entry.change_reason}
                      </span>
                    )}
                    {!entry.change_reason && entry.action === 'updated' && (
                      <span className="text-xs text-muted-foreground">
                        {entry.changed_fields?.length || 0} champ(s) modifié(s)
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
