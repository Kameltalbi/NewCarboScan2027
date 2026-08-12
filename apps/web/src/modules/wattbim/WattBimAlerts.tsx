import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAlerts, useResolveAlert } from './hooks';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const WattBimAlerts: React.FC = () => {
  const { data: alerts = [], isLoading } = useAlerts();
  const resolve = useResolveAlert();

  return (
    <Card>
      <CardHeader><CardTitle>Alertes — détection de gaspillages</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune alerte. Les alertes apparaissent automatiquement lors de la saisie des relevés (dérives, surconsommation).</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Message</TableHead><TableHead>Sévérité</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {alerts.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.detected_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{a.alert_type}</TableCell>
                  <TableCell className="max-w-md">{a.message}</TableCell>
                  <TableCell><Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>{a.severity}</Badge></TableCell>
                  <TableCell><Badge variant={a.status === 'open' ? 'default' : 'outline'}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {a.status === 'open' && (
                      <Button variant="ghost" size="sm" onClick={async () => { await resolve.mutateAsync(a.id); toast.success('Alerte résolue'); }}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
