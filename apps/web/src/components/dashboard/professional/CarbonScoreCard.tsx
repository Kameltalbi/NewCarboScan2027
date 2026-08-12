import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ScoreGrade = 'A' | 'B' | 'C' | 'D';

interface CarbonScoreCardProps {
  score: ScoreGrade;
  maturityLevel: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
}

const scoreColors: Record<ScoreGrade, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-score-a', text: 'text-white', ring: 'ring-score-a' },
  B: { bg: 'bg-score-b', text: 'text-white', ring: 'ring-score-b' },
  C: { bg: 'bg-score-c', text: 'text-white', ring: 'ring-score-c' },
  D: { bg: 'bg-score-d', text: 'text-white', ring: 'ring-score-d' },
};

const maturityDescriptions: Record<string, string> = {
  'Débutant': 'Première évaluation carbone, axes d\'amélioration identifiés',
  'Intermédiaire': 'Stratégie carbone en cours de déploiement',
  'Avancé': 'Politique carbone mature et actions mesurées',
  'Expert': 'Leadership carbone avec objectifs Science-Based',
};

const interpretativeTexts: Record<string, string> = {
  'Débutant': 'Bon niveau – principaux efforts à faire sur l\'énergie et les transports',
  'Intermédiaire': 'Bon niveau – principaux efforts à faire sur l\'énergie',
  'Avancé': 'Excellent niveau – maintenir la trajectoire de réduction',
  'Expert': 'Niveau exemplaire – référence dans votre secteur',
};

export const CarbonScoreCard: React.FC<CarbonScoreCardProps> = ({ score, maturityLevel }) => {
  const colors = scoreColors[score];
  
  // Calculate gauge percentage based on score
  const gaugePercentage = {
    A: 95,
    B: 75,
    C: 50,
    D: 25,
  }[score];

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-dashboard-text">
          Score & Maturité Carbone
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Circular Gauge */}
        <div className="relative w-36 h-36 mb-4">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="72"
              cy="72"
              r="60"
              stroke="#E5E7EB"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="72"
              cy="72"
              r="60"
              stroke={score === 'A' ? '#22c55e' : score === 'B' ? '#4ade80' : score === 'C' ? '#f59e0b' : '#dc2626'}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 60}`}
              strokeDashoffset={`${2 * Math.PI * 60 * (1 - gaugePercentage / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Score in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-5xl font-bold ${
              score === 'A' ? 'text-score-a' : 
              score === 'B' ? 'text-score-b' : 
              score === 'C' ? 'text-score-c' : 'text-score-d'
            }`}>
              {score}
            </span>
          </div>
        </div>

        {/* Maturity Badge */}
        <Badge 
          className={`mb-3 px-4 py-1.5 text-sm font-medium ${
            maturityLevel === 'Expert' || maturityLevel === 'Avancé' 
              ? 'bg-carbon-dark text-white' 
              : maturityLevel === 'Intermédiaire'
              ? 'bg-carbon-turquoise text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {maturityLevel}
        </Badge>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center max-w-[200px] mb-3">
          {maturityDescriptions[maturityLevel]}
        </p>
        
        {/* Interpretative text for executives */}
        <div className="mt-2 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-foreground text-center max-w-[200px] leading-relaxed">
            {interpretativeTexts[maturityLevel]}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
