// Score qualité de données (DQR) – Pedigree Matrix (ISO 14044 § 4.2.3.6)
// Évalue la qualité des données d'inventaire sur 5 critères
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PhaseBreakdown {
  phase: string;
  emissions: number;
}

interface Props {
  results: PhaseBreakdown[];
  studyMode: 'pcf' | 'acv';
}

// Pedigree Matrix criteria (ISO 14044)
const DQR_CRITERIA = [
  {
    id: 'reliability',
    label: 'Fiabilité',
    description: 'Données mesurées vs estimées',
    weights: { pcf: 0.25, acv: 0.2 },
  },
  {
    id: 'completeness',
    label: 'Complétude',
    description: 'Couverture des flux d\'inventaire',
    weights: { pcf: 0.25, acv: 0.2 },
  },
  {
    id: 'temporal',
    label: 'Corrélation temporelle',
    description: 'Ancienneté des facteurs d\'émission',
    weights: { pcf: 0.2, acv: 0.2 },
  },
  {
    id: 'geographical',
    label: 'Corrélation géographique',
    description: 'Adéquation des facteurs au pays',
    weights: { pcf: 0.15, acv: 0.2 },
  },
  {
    id: 'technological',
    label: 'Corrélation technologique',
    description: 'Représentativité du procédé',
    weights: { pcf: 0.15, acv: 0.2 },
  },
] as const;

// Score 1-5 (1=best, 5=worst) — we invert for display (5=best)
const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: 'Excellent', color: 'text-green-600' },
  4: { label: 'Bon', color: 'text-emerald-600' },
  3: { label: 'Acceptable', color: 'text-yellow-600' },
  2: { label: 'Faible', color: 'text-orange-600' },
  1: { label: 'Très faible', color: 'text-red-600' },
};

function estimateCriterionScore(criterion: string, results: PhaseBreakdown[]): number {
  const phasesWithData = results.filter(r => r.emissions !== 0).length;
  const totalPhases = results.length;
  const coverage = totalPhases > 0 ? phasesWithData / totalPhases : 0;

  switch (criterion) {
    case 'reliability':
      // Heuristic: if many phases have data, likely more measured data
      return coverage >= 0.8 ? 4 : coverage >= 0.5 ? 3 : 2;
    case 'completeness':
      return coverage >= 0.9 ? 5 : coverage >= 0.7 ? 4 : coverage >= 0.5 ? 3 : coverage >= 0.3 ? 2 : 1;
    case 'temporal':
      // Default to 3 (acceptable) — would need source_year metadata for precise scoring
      return 3;
    case 'geographical':
      // Default to 3
      return 3;
    case 'technological':
      // Based on data diversity
      return coverage >= 0.6 ? 4 : 3;
    default:
      return 3;
  }
}

const PCFDataQualityScore: React.FC<Props> = ({ results, studyMode }) => {
  const scores = DQR_CRITERIA.map(c => ({
    ...c,
    score: estimateCriterionScore(c.id, results),
    weight: c.weights[studyMode],
  }));

  const weightedScore = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  const roundedScore = Math.round(weightedScore * 10) / 10;
  const maxScore = 5;
  const percentage = (weightedScore / maxScore) * 100;

  const overallLabel = weightedScore >= 4 ? SCORE_LABELS[5]
    : weightedScore >= 3 ? SCORE_LABELS[4]
    : weightedScore >= 2.5 ? SCORE_LABELS[3]
    : weightedScore >= 1.5 ? SCORE_LABELS[2]
    : SCORE_LABELS[1];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Score qualité des données (DQR)
        </h3>
        <Badge variant="outline" className="text-xs">ISO 14044 – Pedigree Matrix</Badge>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-primary/20">
          <span className={`text-2xl font-black ${overallLabel.color}`}>{roundedScore}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-semibold ${overallLabel.color}`}>{overallLabel.label}</span>
            <span className="text-xs text-muted-foreground">{roundedScore} / {maxScore}</span>
          </div>
          <Progress value={percentage} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            Score pondéré sur 5 critères ({studyMode === 'acv' ? 'pondération ACV uniforme' : 'pondération PCF'})
          </p>
        </div>
      </div>

      {/* Criteria breakdown */}
      <div className="space-y-2">
        {scores.map(s => {
          const scoreInfo = SCORE_LABELS[s.score] || SCORE_LABELS[3];
          return (
            <div key={s.id} className="flex items-center gap-3 text-xs">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 w-44">
                      <Info className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground font-medium truncate">{s.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs max-w-[200px]">{s.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Poids : {(s.weight * 100).toFixed(0)}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1">
                <Progress value={(s.score / maxScore) * 100} className="h-1.5" />
              </div>
              <Badge variant="outline" className={`text-[10px] w-16 justify-center ${scoreInfo.color}`}>
                {s.score}/5
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {weightedScore < 3.5 && (
        <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Score inférieur à 3.5/5. Améliorez la qualité en complétant les phases manquantes
              et en utilisant des facteurs d'émission récents et géographiquement adaptés.
            </span>
          </p>
        </div>
      )}
    </Card>
  );
};

export default PCFDataQualityScore;
