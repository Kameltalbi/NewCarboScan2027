import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Check,
  X,
  Edit2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Estimation } from '@/hooks/useEstimations';

interface EstimationCardProps {
  estimation: Estimation;
  questionLabel?: string;
  onAccept: (id: string, value?: number, unit?: string) => Promise<boolean>;
  onReject: (id: string) => Promise<boolean>;
}

export function EstimationCard({
  estimation,
  questionLabel,
  onAccept,
  onReject,
}: EstimationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(estimation.estimated_value.toString());
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      if (isEditing) {
        const numValue = parseFloat(editValue);
        if (!isNaN(numValue)) {
          await onAccept(estimation.id, numValue, estimation.estimated_unit || undefined);
        }
      } else {
        await onAccept(estimation.id);
      }
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(estimation.id);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = () => {
    switch (estimation.confidence_level) {
      case 'high':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Haute confiance</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Confiance moyenne</Badge>;
      case 'low':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Faible confiance</Badge>;
    }
  };

  const getTrendIcon = () => {
    switch (estimation.trend_direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-amber-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMethodLabel = () => {
    switch (estimation.estimation_method) {
      case 'ai_prediction':
        return 'Prédiction IA';
      case 'trend_analysis':
        return 'Analyse tendance';
      case 'seasonal_pattern':
        return 'Saisonnalité';
      case 'historical_average':
        return 'Moyenne historique';
      case 'sector_benchmark':
        return 'Benchmark secteur';
      default:
        return estimation.estimation_method;
    }
  };

  if (estimation.status !== 'pending') {
    return null; // Ne pas afficher les estimations déjà traitées
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Info principale */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">
                {questionLabel || estimation.question_key}
              </span>
              {getConfidenceBadge()}
            </div>

            {/* Valeur estimée */}
            <div className="flex items-center gap-3">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-32 h-8"
                    step="0.01"
                  />
                  <span className="text-sm text-muted-foreground">
                    {estimation.estimated_unit}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {estimation.estimated_value.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-muted-foreground">
                    {estimation.estimated_unit}
                  </span>
                  {getTrendIcon()}
                </div>
              )}
            </div>

            {/* Badges méthode */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getMethodLabel()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Confiance: {Math.round(estimation.confidence_score * 100)}%
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(!isEditing)}
              disabled={loading}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={loading}
              className="text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Accepter
            </Button>
          </div>
        </div>

        {/* Détails collapsibles */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
              <Info className="h-3 w-3 mr-1" />
              <span className="text-xs">Détails de l'estimation</span>
              <ChevronDown
                className={`h-3 w-3 ml-auto transition-transform ${showDetails ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground italic">
              {estimation.reasoning || 'Aucune explication disponible'}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              Catégorie: {estimation.question_category}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
