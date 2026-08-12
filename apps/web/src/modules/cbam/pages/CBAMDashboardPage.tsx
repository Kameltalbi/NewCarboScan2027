import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Package, Ship, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useCBAMDashboardStats, useCBAMEmissionsSummary, useCBAMExports, useCBAMProducts } from '../hooks/useCBAMData';
import { Loader2 } from 'lucide-react';

export const CBAMDashboardPage: React.FC = () => {
  const stats = useCBAMDashboardStats();
  const { data: emissionsSummary } = useCBAMEmissionsSummary();
  const { data: exports } = useCBAMExports();
  const { data: products } = useCBAMProducts();

  if (stats.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Installations", value: stats.totalInstallations, icon: Factory, color: "text-blue-600" },
    { label: "Produits CBAM", value: stats.totalProducts, icon: Package, color: "text-emerald-600" },
    { label: "Exportations UE", value: stats.totalExports, icon: Ship, color: "text-amber-600" },
    { label: "Émissions totales", value: `${stats.totalEmissions.toFixed(2)} tCO₂e`, icon: BarChart3, color: "text-red-600" },
  ];

  // Build emissions by product
  const emissionsByProduct = products?.map(p => {
    const productExports = exports?.filter(e => e.product_id === p.id) || [];
    const totalQty = productExports.reduce((s, e) => s + e.quantity_exported, 0);
    return { name: p.name, quantity: totalQty };
  }).filter(p => p.quantity > 0) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Tableau de bord CBAM</h1>
        <p className="text-muted-foreground">Vue d'ensemble de vos déclarations CBAM et émissions carbone intégrées.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-muted ${kpi.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Émissions directes vs indirectes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Émissions directes vs indirectes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.totalEmissions > 0 ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-red-500" />
                      Émissions directes
                    </span>
                    <span className="font-semibold">{stats.directEmissions.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full transition-all"
                      style={{ width: `${(stats.directEmissions / stats.totalEmissions) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-blue-500" />
                      Émissions indirectes
                    </span>
                    <span className="font-semibold">{stats.indirectEmissions.toFixed(2)} tCO₂e</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${(stats.indirectEmissions / stats.totalEmissions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucune donnée d'émissions. Ajoutez des installations et saisissez vos consommations.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Exportations par produit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exportations par produit</CardTitle>
          </CardHeader>
          <CardContent>
            {emissionsByProduct.length > 0 ? (
              <div className="space-y-3">
                {emissionsByProduct.map((p) => (
                  <div key={p.name} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.quantity.toFixed(1)} tonnes</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucune exportation enregistrée.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent emissions */}
      {emissionsSummary && emissionsSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Derniers résumés d'émissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Période</th>
                    <th className="pb-2 font-medium text-muted-foreground">Directes</th>
                    <th className="pb-2 font-medium text-muted-foreground">Indirectes</th>
                    <th className="pb-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {emissionsSummary.slice(0, 5).map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2">{e.year} T{e.quarter}</td>
                      <td className="py-2">{e.direct_emissions.toFixed(4)} tCO₂e</td>
                      <td className="py-2">{e.indirect_emissions.toFixed(4)} tCO₂e</td>
                      <td className="py-2 font-semibold">{e.total_emissions.toFixed(4)} tCO₂e</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
