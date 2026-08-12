// Graphique Radar – Maturité & Qualité des Données RSE
// Visualise la qualité des données basée sur les vraies métriques : réel, estimé, par défaut

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck } from 'lucide-react';

interface DataQualityRadarChartProps {
  dataQuality: {
    real: number;      // % données réelles (0-100)
    estimated: number; // % données estimées (0-100)
    default: number;   // % données par défaut (0-100)
  };
}

// Couleur principale du radar (turquoise CarboScan)
const RADAR_COLOR = '#4FD1C5';
const RADAR_FILL = 'rgba(79, 209, 197, 0.3)';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground text-sm">{data.dimension}</p>
        <p className="text-sm text-muted-foreground">
          Score: <span className="font-semibold text-foreground">{data.score}/5</span>
        </p>
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
        )}
      </div>
    );
  }
  return null;
};

export const DataQualityRadarChart: React.FC<DataQualityRadarChartProps> = ({ dataQuality }) => {
  // Calcul des scores basé sur les VRAIES données de qualité
  const radarData = useMemo(() => {
    const { real, estimated, default: defaultData } = dataQuality;
    
    // Normaliser les pourcentages (au cas où ils dépassent 100)
    const total = real + estimated + defaultData;
    const normalizedReal = total > 0 ? (real / total) * 100 : 0;
    const normalizedEstimated = total > 0 ? (estimated / total) * 100 : 0;
    const normalizedDefault = total > 0 ? (defaultData / total) * 100 : 0;
    
    // Score de Fiabilité : basé sur % données réelles
    // 100% réel = 5/5, 0% réel = 1/5
    const fiabiliteScore = 1 + (normalizedReal / 100) * 4;
    
    // Score de Précision : données réelles + estimées sont plus précises que défaut
    // 100% (réel + estimé) = 5/5, 100% défaut = 1/5
    const precisionScore = 1 + ((normalizedReal + normalizedEstimated) / 100) * 4;
    
    // Score de Vérifiabilité : seules les données réelles sont vérifiables
    const verifiabiliteScore = 1 + (normalizedReal / 100) * 4;
    
    // Score de Maturité : pondération globale
    // Réel = coefficient 1, Estimé = coefficient 0.6, Défaut = coefficient 0.2
    const maturiteScore = 1 + ((normalizedReal * 1 + normalizedEstimated * 0.6 + normalizedDefault * 0.2) / 100) * 4;
    
    // Score de Complétude : si on a des données (peu importe le type)
    const hasData = total > 0;
    const completudeScore = hasData ? Math.min(5, 2 + (normalizedReal + normalizedEstimated * 0.8) / 100 * 3) : 1;
    
    // Score de Traçabilité : données réelles et estimées documentées
    const tracabiliteScore = 1 + ((normalizedReal * 1 + normalizedEstimated * 0.5) / 100) * 4;
    
    return [
      { 
        dimension: 'Fiabilité', 
        score: Math.round(fiabiliteScore * 10) / 10,
        fullMark: 5,
        description: `${Math.round(normalizedReal)}% données réelles`,
      },
      { 
        dimension: 'Précision', 
        score: Math.round(precisionScore * 10) / 10,
        fullMark: 5,
        description: `${Math.round(normalizedReal + normalizedEstimated)}% données confirmées/estimées`,
      },
      { 
        dimension: 'Vérifiabilité', 
        score: Math.round(verifiabiliteScore * 10) / 10,
        fullMark: 5,
        description: `${Math.round(normalizedReal)}% vérifiable`,
      },
      { 
        dimension: 'Maturité', 
        score: Math.round(maturiteScore * 10) / 10,
        fullMark: 5,
        description: 'Score pondéré global',
      },
      { 
        dimension: 'Complétude', 
        score: Math.round(completudeScore * 10) / 10,
        fullMark: 5,
        description: hasData ? 'Données disponibles' : 'Aucune donnée',
      },
      { 
        dimension: 'Traçabilité', 
        score: Math.round(tracabiliteScore * 10) / 10,
        fullMark: 5,
        description: `${Math.round(normalizedDefault)}% données par défaut`,
      },
    ];
  }, [dataQuality]);

  // Score moyen calculé à partir des vraies données
  const avgScore = useMemo(() => {
    return radarData.reduce((sum, d) => sum + d.score, 0) / radarData.length;
  }, [radarData]);
  
  const avgScoreFormatted = avgScore.toFixed(1);

  // Niveau de maturité textuel
  const getMaturityLevel = (score: number): { label: string; color: string } => {
    if (score >= 4.5) return { label: 'Excellent', color: 'text-emerald-600' };
    if (score >= 3.5) return { label: 'Bon', color: 'text-green-600' };
    if (score >= 2.5) return { label: 'Moyen', color: 'text-amber-600' };
    if (score >= 1.5) return { label: 'À améliorer', color: 'text-orange-600' };
    return { label: 'Insuffisant', color: 'text-red-600' };
  };

  const maturity = getMaturityLevel(avgScore);

  // Répartition pour la légende
  const { real, estimated, default: defaultData } = dataQuality;
  const total = real + estimated + defaultData;

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
      <CardHeader className="pb-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Qualité des Données
          </CardTitle>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold tabular-nums text-foreground">{avgScoreFormatted}</span>
            <span className="text-xs text-muted-foreground">/5</span>
          </div>
        </div>
        {/* Légende des types de données */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground">
              Réel {total > 0 ? Math.round((real / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-muted-foreground">
              Estimé {total > 0 ? Math.round((estimated / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[10px] text-muted-foreground">
              Défaut {total > 0 ? Math.round((defaultData / total) * 100) : 0}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-1 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.5}
              />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 9,
                  fontWeight: 500,
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 5]} 
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 8 
                }}
                tickCount={6}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={RADAR_COLOR}
                fill={RADAR_FILL}
                strokeWidth={2}
                dot={{ 
                  fill: RADAR_COLOR, 
                  r: 3,
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
                animationBegin={500}
                animationDuration={1200}
                animationEasing="ease-out"
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
