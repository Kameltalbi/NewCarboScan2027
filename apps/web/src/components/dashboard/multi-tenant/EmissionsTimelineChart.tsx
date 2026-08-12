// Graphique – Projection des émissions sur 5 ans (Business As Usual)
// Basé sur les tendances moyennes du secteur automobile mondial

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { DASHBOARD_PALETTE } from './dashboardPalette';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface EmissionsTimelineChartProps {
  data?: Array<{
    period: string;
    scope1: number;
    scope2: number;
    scope3: number;
    total: number;
  }>;
  currentScope1?: number;
  currentScope2?: number;
  currentScope3?: number;
}

// Taux de croissance annuels moyens du secteur automobile (source: OICA, IEA)
const AUTOMOTIVE_GROWTH_RATES = {
  scope1: 0.015,  // +1.5%/an - carburants (légère hausse flotte)
  scope2: -0.02,  // -2%/an - électricité (efficacité énergétique)
  scope3: 0.025,  // +2.5%/an - chaîne d'approvisionnement (demande croissante)
};

// Conversion kg → tonnes
const kgToTonnes = (kg: number) => kg / 1000;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {Math.round(entry.value).toLocaleString('fr-FR')} tCO₂e
          </p>
        ))}
        <p className="text-xs font-semibold text-foreground border-t mt-1 pt-1">
          Total: {Math.round(total).toLocaleString('fr-FR')} tCO₂e
        </p>
      </div>
    );
  }
  return null;
};

export const EmissionsTimelineChart: React.FC<EmissionsTimelineChartProps> = ({ 
  data,
  currentScope1 = 0,
  currentScope2 = 0,
  currentScope3 = 0,
}) => {
  // Générer les projections sur 5 ans (annuelles)
  const generateProjections = () => {
    const currentYear = new Date().getFullYear();
    
    // Émissions annuelles de base (en kg)
    const baseScope1 = currentScope1;
    const baseScope2 = currentScope2;
    const baseScope3 = currentScope3;
    
    const projections = [];
    
    for (let i = 0; i <= 5; i++) {
      const year = currentYear + i;
      
      // Appliquer les taux de croissance annuels (composés)
      const growthS1 = Math.pow(1 + AUTOMOTIVE_GROWTH_RATES.scope1, i);
      const growthS2 = Math.pow(1 + AUTOMOTIVE_GROWTH_RATES.scope2, i);
      const growthS3 = Math.pow(1 + AUTOMOTIVE_GROWTH_RATES.scope3, i);
      
      projections.push({
        period: year.toString(),
        scope1: kgToTonnes(baseScope1 * growthS1),
        scope2: kgToTonnes(baseScope2 * growthS2),
        scope3: kgToTonnes(baseScope3 * growthS3),
        isProjection: i > 0,
      });
    }
    
    return projections;
  };

  const chartData = generateProjections();
  
  // Calculer l'augmentation totale projetée sur 5 ans
  const totalCurrent = kgToTonnes(currentScope1 + currentScope2 + currentScope3);
  const lastYear = chartData[chartData.length - 1];
  const totalProjected = (lastYear?.scope1 || 0) + (lastYear?.scope2 || 0) + (lastYear?.scope3 || 0);
  const fiveYearIncrease = totalCurrent > 0 ? ((totalProjected - totalCurrent) / totalCurrent * 100) : 0;

  if (totalCurrent === 0) {
    return (
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Projection des émissions (5 ans)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Aucune donnée disponible pour la projection</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Projection des émissions (5 ans)
            </CardTitle>
            {fiveYearIncrease > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                +{fiveYearIncrease.toFixed(1)}% sur 5 ans
              </span>
            ) : fiveYearIncrease < 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                {fiveYearIncrease.toFixed(1)}% sur 5 ans
              </span>
            )}
          </div>
          
          {/* Totaux comparatifs */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Aujourd'hui :</span>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(totalCurrent).toLocaleString('fr-FR')} tCO₂e
              </span>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Dans 5 ans :</span>
              <span className={`text-sm font-semibold ${fiveYearIncrease > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {Math.round(totalProjected).toLocaleString('fr-FR')} tCO₂e
              </span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Scénario "Business As Usual" basé sur les tendances moyennes du secteur automobile mondial (OICA, IEA)
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="gradientScope1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DASHBOARD_PALETTE.scope1} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={DASHBOARD_PALETTE.scope1} stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="gradientScope2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DASHBOARD_PALETTE.scope2} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={DASHBOARD_PALETTE.scope2} stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="gradientScope3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DASHBOARD_PALETTE.scope3} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={DASHBOARD_PALETTE.scope3} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="period"
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
              iconType="circle"
              iconSize={8}
            />
            <ReferenceLine 
              x={chartData[0]?.period} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              label={{ value: 'Aujourd\'hui', position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="scope1"
              name="Scope 1 (Direct)"
              stroke={DASHBOARD_PALETTE.scope1}
              fill="url(#gradientScope1)"
              strokeWidth={2}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="scope2"
              name="Scope 2 (Énergie)"
              stroke={DASHBOARD_PALETTE.scope2}
              fill="url(#gradientScope2)"
              strokeWidth={2}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="scope3"
              name="Scope 3 (Indirect)"
              stroke={DASHBOARD_PALETTE.scope3}
              fill="url(#gradientScope3)"
              strokeWidth={2}
              stackId="1"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Légende explicative */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">📊 Hypothèses du modèle (secteur automobile mondial) :</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li><span className="font-medium" style={{ color: DASHBOARD_PALETTE.scope1 }}>Scope 1</span> : +1,5%/an (croissance flotte véhicules)</li>
            <li><span className="font-medium" style={{ color: DASHBOARD_PALETTE.scope2 }}>Scope 2</span> : -2%/an (gains efficacité énergétique)</li>
            <li><span className="font-medium" style={{ color: DASHBOARD_PALETTE.scope3 }}>Scope 3</span> : +2,5%/an (demande chaîne d'approvisionnement)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
