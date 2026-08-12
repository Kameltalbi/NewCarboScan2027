import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePeriodicSessions, Periodicity } from '@/hooks/usePeriodicSessions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PeriodicCollectionSetupProps {
  sessionId: string;
  sessionName: string;
  isPeriodic?: boolean;
  currentPeriodicity?: Periodicity | null;
  nextDueDate?: string | null;
}

export function PeriodicCollectionSetup({
  sessionId,
  sessionName,
  isPeriodic = false,
  currentPeriodicity,
  nextDueDate,
}: PeriodicCollectionSetupProps) {
  const [enabled, setEnabled] = useState(isPeriodic);
  const [periodicity, setPeriodicity] = useState<Periodicity>(currentPeriodicity || 'monthly');
  const { loading, enablePeriodicCollection, disablePeriodicCollection } = usePeriodicSessions();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const success = await enablePeriodicCollection(sessionId, periodicity);
      if (success) setEnabled(true);
    } else {
      const success = await disablePeriodicCollection(sessionId);
      if (success) setEnabled(false);
    }
  };

  const handlePeriodicityChange = async (value: Periodicity) => {
    setPeriodicity(value);
    if (enabled) {
      // Mettre à jour la périodicité
      await enablePeriodicCollection(sessionId, value);
    }
  };

  const periodicityOptions = [
    {
      value: 'monthly' as Periodicity,
      label: 'Mensuelle',
      description: '12 collectes par an, idéal pour le suivi précis',
      icon: '📅',
    },
    {
      value: 'quarterly' as Periodicity,
      label: 'Trimestrielle',
      description: '4 collectes par an, équilibre entre précision et charge de travail',
      icon: '📊',
    },
    {
      value: 'yearly' as Periodicity,
      label: 'Annuelle',
      description: '1 collecte par an, pour les bilans annuels',
      icon: '📆',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Collecte Périodique
            </CardTitle>
            <CardDescription>
              Automatisez la création de sessions de collecte récurrentes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="periodic-toggle" className="text-sm">
              {enabled ? 'Activée' : 'Désactivée'}
            </Label>
            <Switch
              id="periodic-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sélection de la périodicité */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Fréquence de collecte</Label>
          <RadioGroup
            value={periodicity}
            onValueChange={(v) => handlePeriodicityChange(v as Periodicity)}
            disabled={loading}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {periodicityOptions.map((option) => (
              <div key={option.value}>
                <RadioGroupItem
                  value={option.value}
                  id={`periodicity-${option.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`periodicity-${option.value}`}
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <span className="text-2xl mb-2">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    {option.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Statut actuel */}
        {enabled && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">Collecte périodique active</span>
              <Badge variant="outline">
                {periodicityOptions.find((o) => o.value === periodicity)?.label}
              </Badge>
            </div>

            {nextDueDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Prochaine échéance :{' '}
                  <strong>
                    {format(new Date(nextDueDate), 'dd MMMM yyyy', { locale: fr })}
                  </strong>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Session de base : {sessionName}</span>
            </div>
          </div>
        )}

        {/* Avertissement */}
        {!enabled && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Collecte ponctuelle
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Activez la collecte périodique pour automatiser la création de sessions
                récurrentes et ne jamais manquer une échéance.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
