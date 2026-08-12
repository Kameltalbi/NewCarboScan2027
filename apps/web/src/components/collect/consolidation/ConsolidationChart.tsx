// Graphiques de consolidation
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  PieChart as PieChartIcon,
  Zap,
  Fuel,
  Droplets,
  Trash2,
  TrendingUp,
  ShoppingCart,
  Truck,
  Building
} from 'lucide-react';

interface CategoryData {
  category: string;
  totalValue: number;
  count: number;
  siteCount: number;
  unit?: string;
}

interface ConsolidationChartProps {
  data: any[];
  categories: CategoryData[];
}

// Couleurs pour les catégories
const categoryColors: Record<string, string> = {
  energy: 'bg-amber-500',
  fuel: 'bg-red-500',
  water: 'bg-blue-500',
  waste: 'bg-green-500',
  transport: 'bg-purple-500',
  purchases: 'bg-orange-500',
  travel: 'bg-cyan-500',
  services: 'bg-pink-500',
  esg: 'bg-emerald-500',
};

const categoryIcons: Record<string, React.ElementType> = {
  energy: Zap,
  fuel: Fuel,
  water: Droplets,
  waste: Trash2,
  transport: Truck,
  purchases: ShoppingCart,
  travel: TrendingUp,
  services: Building,
};

export const ConsolidationChart: React.FC<ConsolidationChartProps> = ({
  data,
  categories,
}) => {
  // Calculer le total pour les pourcentages
  const totalValue = categories.reduce((sum, cat) => sum + cat.totalValue, 0);

  // Trier par valeur décroissante
  const sortedCategories = [...categories].sort((a, b) => b.totalValue - a.totalValue);

  // Formater les valeurs
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Bar Chart - Distribution par catégorie */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Distribution par catégorie</h3>
        </div>
        
        <div className="space-y-4">
          {sortedCategories.map((category) => {
            const percentage = totalValue > 0 
              ? Math.round((category.totalValue / totalValue) * 100) 
              : 0;
            const colorClass = categoryColors[category.category.toLowerCase()] || 'bg-gray-500';
            const IconComponent = categoryIcons[category.category.toLowerCase()] || BarChart3;

            return (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${colorClass} bg-opacity-20`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="font-medium capitalize">{category.category}</span>
                    <Badge variant="secondary" className="text-xs">
                      {category.count} indicateurs
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {formatValue(category.totalValue)} {category.unit}
                    </span>
                    <Badge variant="outline">{percentage}%</Badge>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pie Chart Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Répartition visuelle</h3>
            </div>
            
            {/* Simple pie visualization using conic-gradient */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div 
                  className="w-48 h-48 rounded-full"
                  style={{
                    background: sortedCategories.length > 0
                      ? `conic-gradient(${sortedCategories.map((cat, idx) => {
                          const startPercent = sortedCategories
                            .slice(0, idx)
                            .reduce((sum, c) => sum + (totalValue > 0 ? (c.totalValue / totalValue) * 100 : 0), 0);
                          const endPercent = startPercent + (totalValue > 0 ? (cat.totalValue / totalValue) * 100 : 0);
                          const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#10b981'];
                          return `${colors[idx % colors.length]} ${startPercent}% ${endPercent}%`;
                        }).join(', ')})`
                      : '#e5e7eb',
                  }}
                />
                <div className="absolute inset-8 bg-background rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatValue(totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {sortedCategories.slice(0, 6).map((cat, idx) => {
                const colors = ['bg-amber-500', 'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                return (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                    <span className="text-xs capitalize truncate">{cat.category}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Résumé consolidé</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Total catégories</span>
                <span className="font-semibold">{categories.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Total indicateurs</span>
                <span className="font-semibold">{data.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Valeur totale agrégée</span>
                <span className="font-semibold font-mono">{formatValue(totalValue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Catégorie principale</span>
                <Badge className="capitalize">
                  {sortedCategories[0]?.category || 'N/A'}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Sites contributeurs</span>
                <span className="font-semibold">
                  {Math.max(...categories.map(c => c.siteCount), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
