// Graphique de Trajectoire de Décarbonation – Multi-scénarios
// Visualise l'écart entre BAU et les objectifs de réduction

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { TrendingDown, Target } from 'lucide-react';

interface TrajectoryDecarbonationChartProps {
  currentEmissions: number; // en kg CO2e
  years?: number;
}

// Palettes de couleurs pour les scénarios
const SCENARIO_COLORS = {
  bau: '#94A3B8',      // Gris - Business as Usual
  reduction5: '#F97316',  // Orange - -5%/an
  reduction10: '#EAB308', // Jaune - -10%/an
  reduction15: '#84CC16', // Vert clair - -15%/an
  reduction20: '#22C55E', // Vert foncé - -20%/an (SBTi)
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {Math.round(entry.value).toLocaleString('fr-FR')} tCO₂e
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const TrajectoryDecarbonationChart: React.FC<TrajectoryDecarbonationChartProps> = ({ 
  currentEmissions,
  years = 5,
}) => {
  // Convertir kg → tonnes
  const baseTonnes = currentEmissions / 1000;
  const currentYear = new Date().getFullYear();
  
  // Générer les données de trajectoire
  const generateTrajectoryData = () => {
    const data = [];
    
    for (let i = 0; i <= years; i++) {
      const year = currentYear + i;
      
      // BAU: légère hausse de 1.5%/an (tendance mondiale)
      const bau = baseTonnes * Math.pow(1.015, i);
      
      // Scénarios de réduction
      const reduction5 = baseTonnes * Math.pow(0.95, i);
      const reduction10 = baseTonnes * Math.pow(0.90, i);
      const reduction15 = baseTonnes * Math.pow(0.85, i);
      const reduction20 = baseTonnes * Math.pow(0.80, i);
      
      data.push({
        year: i === 0 ? `${year} (Actuel)` : year.toString(),
        bau: Math.round(bau),
        reduction5: Math.round(reduction5),
        reduction10: Math.round(reduction10),
        reduction15: Math.round(reduction15),
        reduction20: Math.round(reduction20),
      });
    }
    
    return data;
  };

  const chartData = generateTrajectoryData();
  
  // Calculs pour les indicateurs
  const lastYear = chartData[chartData.length - 1];
  const bauFinal = lastYear?.bau || 0;
  const sbtiReduction = lastYear?.reduction20 || 0;
  const emissionsEvitees = bauFinal - sbtiReduction;
  const reductionPercent = baseTonnes > 0 ? ((baseTonnes - sbtiReduction) / baseTonnes * 100) : 0;

  if (baseTonnes === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Trajectoire de décarbonation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              Trajectoire de décarbonation
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                <Target className="h-3 w-3" />
                -{reductionPercent.toFixed(0)}% visé (SBTi)
              </span>
            </div>
          </div>
          
          {/* Indicateurs clés */}
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Aujourd'hui :</span>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(baseTonnes).toLocaleString('fr-FR')} tCO₂e
              </span>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Objectif {currentYear + years} :</span>
              <span className="text-sm font-semibold text-emerald-600">
                {sbtiReduction.toLocaleString('fr-FR')} tCO₂e
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Émissions évitées :</span>
              <span className="text-sm font-semibold text-emerald-600">
                {emissionsEvitees.toLocaleString('fr-FR')} tCO₂e
              </span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Comparaison des scénarios de réduction annuelle vs "Business as Usual"
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="year"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${Math.round(value)}`}
              axisLine={false}
              tickLine={false}
              width={50}
              label={{ 
                value: 'tCO₂e', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconType="line"
              iconSize={12}
            />
            
            {/* Ligne de référence pour l'objectif Net Zéro */}
            <ReferenceLine 
              y={0} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              label={{ value: 'Net Zéro', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            
            {/* Business as Usual */}
            <Line
              type="monotone"
              dataKey="bau"
              name="Business as Usual"
              stroke={SCENARIO_COLORS.bau}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: SCENARIO_COLORS.bau, r: 3 }}
              activeDot={{ r: 5 }}
              animationBegin={600}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            
            {/* Scénario -5% */}
            <Line
              type="monotone"
              dataKey="reduction5"
              name="-5% / an"
              stroke={SCENARIO_COLORS.reduction5}
              strokeWidth={2}
              dot={{ fill: SCENARIO_COLORS.reduction5, r: 3 }}
              activeDot={{ r: 5 }}
              animationBegin={700}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            
            {/* Scénario -10% */}
            <Line
              type="monotone"
              dataKey="reduction10"
              name="-10% / an"
              stroke={SCENARIO_COLORS.reduction10}
              strokeWidth={2}
              dot={{ fill: SCENARIO_COLORS.reduction10, r: 3 }}
              activeDot={{ r: 5 }}
              animationBegin={800}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            
            {/* Scénario -15% */}
            <Line
              type="monotone"
              dataKey="reduction15"
              name="-15% / an"
              stroke={SCENARIO_COLORS.reduction15}
              strokeWidth={2}
              dot={{ fill: SCENARIO_COLORS.reduction15, r: 3 }}
              activeDot={{ r: 5 }}
              animationBegin={900}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            
            {/* Scénario -20% (SBTi) */}
            <Line
              type="monotone"
              dataKey="reduction20"
              name="-20% / an (SBTi)"
              stroke={SCENARIO_COLORS.reduction20}
              strokeWidth={3}
              dot={{ fill: SCENARIO_COLORS.reduction20, r: 4 }}
              activeDot={{ r: 6 }}
              animationBegin={1000}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Légende explicative */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">📊 Scénarios de réduction :</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li><span className="font-medium" style={{ color: SCENARIO_COLORS.bau }}>Business as Usual</span> : +1,5%/an si aucune action</li>
            <li><span className="font-medium" style={{ color: SCENARIO_COLORS.reduction5 }}>-5%/an</span> : Réduction prudente (actions simples)</li>
            <li><span className="font-medium" style={{ color: SCENARIO_COLORS.reduction10 }}>-10%/an</span> : Objectif intermédiaire (plan structuré)</li>
            <li><span className="font-medium" style={{ color: SCENARIO_COLORS.reduction15 }}>-15%/an</span> : Ambitieux (investissements significatifs)</li>
            <li><span className="font-medium" style={{ color: SCENARIO_COLORS.reduction20 }}>-20%/an</span> : Compatible SBTi / Accords de Paris</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
