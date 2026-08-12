import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useEstimations } from '@/hooks/useEstimations';
import { EstimationCard } from './EstimationCard';
import { COLLECT_QUESTIONS } from '@/types/collectQuestions';

interface EstimationsPanelProps {
  sessionId: string;
  companyId: string;
}

export function EstimationsPanel({ sessionId, companyId }: EstimationsPanelProps) {
  const {
    estimations,
    loading,
    generating,
    generateEstimations,
    acceptEstimation,
    rejectEstimation,
    acceptAllPending,
    pendingCount,
    acceptedCount,
  } = useEstimations(sessionId, companyId);

  const getQuestionLabel = (key: string) => {
    const question = COLLECT_QUESTIONS.find((q) => q.key === key);
    return question?.label || key;
  };

  const handleAcceptAll = async () => {
    const count = await acceptAllPending();
    // Le toast est déjà géré dans le hook
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Estimations Automatiques
              {pendingCount > 0 && (
                <Badge variant="secondary">{pendingCount} en attente</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Valeurs pré-remplies basées sur l'historique et l'IA
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button size="sm" variant="outline" onClick={handleAcceptAll}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Tout accepter
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => generateEstimations()}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Générer
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de progression */}
        {estimations.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimations traitées</span>
              <span className="font-medium">
                {acceptedCount} / {estimations.length}
              </span>
            </div>
            <Progress
              value={(acceptedCount / estimations.length) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Liste des estimations en attente */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Chargement des estimations...
          </div>
        ) : pendingCount === 0 ? (
          <div className="text-center py-8">
            {estimations.length === 0 ? (
              <div className="space-y-2">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Aucune estimation disponible
                </p>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Générer" pour créer des estimations basées sur l'historique
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
                <p className="text-muted-foreground">
                  Toutes les estimations ont été traitées
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {estimations
              .filter((e) => e.status === 'pending')
              .map((estimation) => (
                <EstimationCard
                  key={estimation.id}
                  estimation={estimation}
                  questionLabel={getQuestionLabel(estimation.question_key)}
                  onAccept={acceptEstimation}
                  onReject={rejectEstimation}
                />
              ))}
          </div>
        )}

        {/* Légende confiance */}
        <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Haute confiance
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Confiance moyenne
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Faible confiance
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
