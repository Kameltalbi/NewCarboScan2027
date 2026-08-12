import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { usePeriodicSessions } from '@/hooks/usePeriodicSessions';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function PeriodicSessionsList() {
  const { upcomingSessions, overdueSessions, loading } = usePeriodicSessions();
  const navigate = useNavigate();

  const allSessions = [
    ...overdueSessions.map((s) => ({ ...s, isOverdue: true })),
    ...upcomingSessions.map((s) => ({ ...s, isOverdue: false })),
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des sessions périodiques...
        </CardContent>
      </Card>
    );
  }

  if (allSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sessions Périodiques
          </CardTitle>
          <CardDescription>
            Aucune session périodique planifiée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Activez la collecte périodique sur une session pour voir les échéances ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Sessions Périodiques
          {overdueSessions.length > 0 && (
            <Badge variant="destructive">{overdueSessions.length} en retard</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Prochaines collectes à effectuer
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {allSessions.slice(0, 10).map((session) => (
            <div
              key={session.session_id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                session.isOverdue
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  : 'border-border bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-4">
                {session.isOverdue ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : session.days_until_due <= 7 ? (
                  <Clock className="h-5 w-5 text-amber-500" />
                ) : (
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                )}

                <div>
                  <p className="font-medium text-sm">{session.session_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {session.periodicity === 'monthly'
                        ? 'Mensuel'
                        : session.periodicity === 'quarterly'
                        ? 'Trimestriel'
                        : 'Annuel'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {session.next_due_date &&
                        format(new Date(session.next_due_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {session.isOverdue ? (
                  <Badge variant="destructive">
                    {Math.abs(session.days_until_due)} jours de retard
                  </Badge>
                ) : (
                  <Badge
                    variant={session.days_until_due <= 7 ? 'secondary' : 'outline'}
                  >
                    {session.days_until_due === 0
                      ? "Aujourd'hui"
                      : session.days_until_due === 1
                      ? 'Demain'
                      : `Dans ${session.days_until_due} jours`}
                  </Badge>
                )}

                <Button
                  size="sm"
                  variant={session.isOverdue ? 'destructive' : 'outline'}
                  onClick={() => navigate(`/app/collect/session/${session.session_id}`)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
