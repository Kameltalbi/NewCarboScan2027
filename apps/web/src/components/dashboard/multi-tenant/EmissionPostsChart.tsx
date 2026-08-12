// Graphique – Répartition par poste d'émission
// Type : barres horizontales - Postes affichés dynamiquement avec i18n

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

// Palette dashboard – une couleur par barre (pas de répétition)
import { BAR_COLORS } from './dashboardPalette';

interface EmissionPost {
  name: string;
  emissions: number;
  scope: 1 | 2 | 3;
  percentage: number;
  category?: string;
}

interface EmissionPostsChartProps {
  data: EmissionPost[];
}

// Conversion kg → tonnes
const kgToTonnes = (kg: number) => kg / 1000;

// Formater le nom d'affichage avec catégorie scope
const formatDisplayName = (
  name: string,
  t: (key: string) => string
): string => {
  // Essayer de traduire le nom si c'est une clé connue
  const categoryKey = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const translationKey = `dashboard.emissionCategories.${categoryKey}`;
  const translated = t(translationKey);
  
  // Si la traduction n'existe pas, elle retourne la clé, donc on utilise le nom original
  const translatedName = translated === translationKey ? name : translated;
  
  // Formater proprement le nom s'il contient des caractères spéciaux
  let cleanName = translatedName;
  
  // Si le nom contient des patterns comme "Cat13 Downstream Leased:Cat13...", extraire la partie utile
  if (cleanName.includes(':')) {
    const parts = cleanName.split(':');
    cleanName = parts[1]?.trim() || parts[0]?.trim() || cleanName;
  }
  
  // Supprimer les préfixes comme "Cat6", "Cat13" etc. du texte affiché
  cleanName = cleanName.replace(/^Cat\d+\s*/i, '');
  
  // Capitaliser proprement les mots
  if (cleanName === cleanName.toLowerCase() || cleanName === cleanName.toUpperCase()) {
    cleanName = cleanName.replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Ne plus tronquer : afficher le nom complet (sous-catégories personnalisées)
  return cleanName;
};

// Obtenir le libellé du scope
const getScopeLabel = (scope: 1 | 2 | 3, t: (key: string) => string): string => {
  const labels: Record<number, string> = {
    1: t('scopes.scope1'),
    2: t('scopes.scope2'),
    3: t('scopes.scope3'),
  };
  return labels[scope] || `Scope ${scope}`;
};

export const EmissionPostsChart: React.FC<EmissionPostsChartProps> = ({ data }) => {
  const { t } = useTranslation();
  
  const sortedData = [...data]
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 8)
    .map(item => ({
      ...item,
      displayName: formatDisplayName(item.name, t),
      scopeLabel: getScopeLabel(item.scope, t),
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg px-3 py-2 shadow-lg">
          <p className="font-medium text-foreground">{data.displayName}</p>
          <p className="text-xs text-primary font-medium mb-1">{data.scopeLabel}</p>
          <p className="text-sm">
            <span className="font-semibold">{Math.round(kgToTonnes(data.emissions)).toLocaleString('fr-FR')}</span>
            <span className="text-muted-foreground"> tCO₂e</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round(data.percentage)}% {t('dashboard.charts.emissionPosts.tooltip.ofTotal')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (sortedData.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t('dashboard.charts.emissionPosts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('dashboard.charts.emissionPosts.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 h-[340px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
      <CardHeader className="pb-2 px-4 flex-shrink-0">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t('dashboard.charts.emissionPosts.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sortedData} 
              layout="vertical"
              margin={{ top: 5, right: 45, left: 0, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(value) => `${kgToTonnes(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`}
              />
              <YAxis 
                type="category" 
                dataKey="displayName"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#374151', fontSize: 9 }}
                width={140}
                interval={0}
                tickFormatter={(value) => value.length > 25 ? value.slice(0, 22) + '…' : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="emissions" 
                radius={[0, 4, 4, 0]}
                barSize={16}
                animationBegin={400}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {sortedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                    className="transition-opacity duration-300 hover:opacity-80"
                  />
                ))}
                <LabelList 
                  dataKey="emissions" 
                  position="right"
                  formatter={(value: number) => `${Math.round(kgToTonnes(value)).toLocaleString('fr-FR')} t`}
                  style={{ fill: '#6B7280', fontSize: 9, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Légende compacte */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 pt-2 border-t">
          {sortedData.slice(0, 6).map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-sm shrink-0" 
                style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }} 
              />
              <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                {entry.displayName}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
