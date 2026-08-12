// Graphique – Répartition par site (conditionnel)
// Afficher uniquement si plusieurs sites existent
// Type : barres empilées - Scopes 1 et 2 par défaut

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Palette dashboard – verts et teals (image utilisateur)
import { DASHBOARD_PALETTE } from './dashboardPalette';

const SCOPE_COLORS = {
  scope1: DASHBOARD_PALETTE.scope1,
  scope2: DASHBOARD_PALETTE.scope2,
  scope3: DASHBOARD_PALETTE.scope3,
};

interface SiteEmissions {
  siteName: string;
  scope1: number; // kgCO₂e
  scope2: number; // kgCO₂e
  scope3?: number; // kgCO₂e (optionnel)
}

interface SiteDistributionChartProps {
  sites: SiteEmissions[];
  showScope3?: boolean;
}

// Conversion kg → tonnes
const kgToTonnes = (kg: number) => kg / 1000;

// Formatage intelligent : 2 décimales si < 1 tonne, sinon entier arrondi
const formatTonnes = (tonnes: number): string => {
  if (tonnes > 0 && tonnes < 1) {
    return tonnes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.round(tonnes).toLocaleString('fr-FR');
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const totalTonnes = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.fill }}>
            {entry.name}: {formatTonnes(entry.value)} tCO₂e
          </p>
        ))}
        <p className="text-sm font-medium text-foreground mt-1 pt-1 border-t">
          Total: {formatTonnes(totalTonnes)} tCO₂e
        </p>
      </div>
    );
  }
  return null;
};

export const SiteDistributionChart: React.FC<SiteDistributionChartProps> = ({ 
  sites, 
  showScope3 = false 
}) => {
  // Ne pas afficher si moins de 2 sites
  if (sites.length < 2) {
    return null;
  }

  // Trier par total d'émissions (conversion kg → tonnes pour l'affichage)
  const sortedSites = [...sites]
    .map(site => {
      const scope1Tonnes = kgToTonnes(site.scope1);
      const scope2Tonnes = kgToTonnes(site.scope2);
      const scope3Tonnes = site.scope3 != null ? kgToTonnes(site.scope3) : undefined;

      return {
        ...site,
        // Remplacer par des valeurs en tonnes pour le graphe
        scope1: scope1Tonnes,
        scope2: scope2Tonnes,
        scope3: scope3Tonnes,
        total: scope1Tonnes + scope2Tonnes + (scope3Tonnes || 0),
        displayName: site.siteName.length > 15 ? site.siteName.substring(0, 12) + '...' : site.siteName,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base font-semibold">Répartition par site</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sortedSites} 
              margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis 
                dataKey="displayName" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(value) => formatTonnes(value)}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={30}
                formatter={(value: string) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
              <Bar 
                dataKey="scope1" 
                name="Scope 1" 
                stackId="a" 
                fill={SCOPE_COLORS.scope1}
                radius={showScope3 ? [0, 0, 0, 0] : [0, 0, 4, 4]}
                animationBegin={500}
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Bar 
                dataKey="scope2" 
                name="Scope 2" 
                stackId="a" 
                fill={SCOPE_COLORS.scope2}
                radius={showScope3 ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                animationBegin={600}
                animationDuration={1000}
                animationEasing="ease-out"
              />
              {showScope3 && (
                <Bar 
                  dataKey="scope3" 
                  name="Scope 3" 
                  stackId="a" 
                  fill={SCOPE_COLORS.scope3}
                  radius={[4, 4, 0, 0]}
                  animationBegin={700}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
